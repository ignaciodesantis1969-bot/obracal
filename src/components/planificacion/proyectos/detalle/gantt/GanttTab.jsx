// src/components/planificacion/proyectos/detalle/gantt/GanttTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, AlertCircle, CheckCircle2, Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { cn } from '@/lib/utils';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { actualizarDoc } from '@/lib/firestoreHelpers';
import { NIVELES_ZOOM, useGanttCalculos } from './useGanttCalculos';
import { useGanttDrag } from './useGanttDrag';
import GanttHeader from './GanttHeader';
import GanttBarra from './GanttBarra';
import GanttFlechas from './GanttFlechas';
import TareaDependenciasModal from './TareaDependenciasModal';
import GanttSidebar from './GanttSidebar';
// 🔑 FIX: helpers de fechas + recálculo por dependencias
import {
  calcularFechaFin,
  getFeriadosDelAnio,
  recalcularFechasDelPlan,
} from '@/lib/planificacionHelpers';

const ALTURA_FILA = 36;
const DURACION_TOAST_DESHACER = 10000;

export default function GanttTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [nivelZoomId, setNivelZoomId] = useState('semanas');
  const [tareaHoverId, setTareaHoverId] = useState(null);
  const [rubrosColapsados, setRubrosColapsados] = useState(new Set());
  const [tareasOptimistas, setTareasOptimistas] = useState({});
  const [tareaDependencias, setTareaDependencias] = useState(null);

  const { data: feriadosFs } = useFirestoreCollection('feriados');
  const feriadosCustom = useMemo(
    () => (Array.isArray(feriadosFs) ? feriadosFs : []),
    [feriadosFs]
  );

  const nivelZoom = NIVELES_ZOOM[nivelZoomId] || NIVELES_ZOOM.semanas;

  const tareasConCambios = useMemo(() => {
    return tareas.map(t => {
      const cambio = tareasOptimistas[t.id];
      if (!cambio) return t;
      return { ...t, ...cambio };
    });
  }, [tareas, tareasOptimistas]);

  const { rango, filas, ticks, anchoTotal, flechas } = useGanttCalculos(
    tareasConCambios,
    nivelZoom,
    rubrosColapsados
  );

  // ─── Toast con Deshacer ────────────────────────────────────────────────
  const mostrarToastUndo = useCallback((cantidad, snapshot) => {
    const toastId = toast.custom(
      (t) => (
        <div
          className={cn(
            'bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3',
            'border border-slate-700',
            t.visible ? 'animate-enter' : 'animate-leave'
          )}
          style={{ minWidth: '340px', maxWidth: '460px' }}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold">
              {cantidad === 1 ? 'Cambio guardado' : `${cantidad} cambios guardados`}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Se actualizaron las fechas en Firestore
            </p>
          </div>
          <button
            onClick={() => handleUndo(toastId, snapshot)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Deshacer
          </button>
          <button
            onClick={() => toast.dismiss(toastId)}
            className="text-slate-500 hover:text-slate-300 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ),
      { duration: DURACION_TOAST_DESHACER, position: 'bottom-right' }
    );
  }, []);

  const handleUndo = useCallback(async (toastId, snapshot) => {
    toast.dismiss(toastId);
    try {
      const batch = writeBatch(db);
      snapshot.forEach(s => {
        const ref = doc(db, 'planificacion_tareas', s.tareaId);
        const data = {};
        if (s.fecha_inicio !== undefined) data.fecha_inicio = s.fecha_inicio;
        if (s.fecha_fin !== undefined) data.fecha_fin = s.fecha_fin;
        if (s.duracion_real_dias !== undefined) data.duracion_real_dias = s.duracion_real_dias;
        batch.update(ref, data);
      });
      await batch.commit();

      setTareasOptimistas(prev => {
        const nuevo = { ...prev };
        snapshot.forEach(s => { delete nuevo[s.tareaId]; });
        return nuevo;
      });

      toast.success('Cambios revertidos', { duration: 2000 });
    } catch (err) {
      console.error('[GanttTab] Error al deshacer:', err);
      toast.error('No se pudo deshacer: ' + (err.message || ''), { duration: 5000 });
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // GUARDAR CAMBIOS + AUTO-ACOMODO POR DEPENDENCIAS
  // ═══════════════════════════════════════════════════════════════════════
  const guardarCambios = useCallback(async (cambios) => {
    // 1) Snapshot para deshacer (solo de los cambios explícitos)
    const snapshotAnterior = cambios.map(c => {
      const tarea = tareas.find(t => t.id === c.tareaId);
      return {
        tareaId: c.tareaId,
        fecha_inicio: tarea?.fecha_inicio,
        fecha_fin: tarea?.fecha_fin,
        duracion_real_dias: tarea?.duracion_real_dias,
      };
    });

    // 2) Aplicar cambios optimistas locales (los explícitos)
    setTareasOptimistas(prev => {
      const nuevos = { ...prev };
      cambios.forEach(c => {
        nuevos[c.tareaId] = {
          ...(nuevos[c.tareaId] || {}),
          ...(c.fecha_inicio !== undefined && { fecha_inicio: c.fecha_inicio }),
          ...(c.fecha_fin !== undefined && { fecha_fin: c.fecha_fin }),
          ...(c.duracion_real_dias !== undefined && { duracion_real_dias: c.duracion_real_dias }),
        };
      });
      return nuevos;
    });

    // 3) 🔑 AUTO-ACOMODO: recalcular sucesoras
    // Construir el estado "post cambio" para que el recálculo vea los nuevos valores
    const tareasPostCambio = tareas.map(t => {
      const cambio = cambios.find(c => c.tareaId === t.id);
      if (!cambio) return t;
      return {
        ...t,
        ...(cambio.fecha_inicio !== undefined && { fecha_inicio: cambio.fecha_inicio }),
        ...(cambio.fecha_fin !== undefined && { fecha_fin: cambio.fecha_fin }),
        ...(cambio.duracion_real_dias !== undefined && { duracion_real_dias: cambio.duracion_real_dias }),
      };
    });

    // La tarea "origen" es la primera que se movió explícitamente
    const tareaOrigenId = cambios[0]?.tareaId;

    let cambiosExtra = [];
    let movidas = [];

    if (tareaOrigenId && feriadosSet) {
      const resultado = recalcularFechasDelPlan(
        tareasPostCambio,
        feriadosSet,
        tareaOrigenId
      );

      // Convertir mapa de cambios a array
      cambiosExtra = Object.entries(resultado.cambios || {}).map(([tareaId, data]) => ({
        tareaId,
        ...data,
        fecha_manual: false,
      }));

      movidas = resultado.movidas || [];
    }

    // 4) Aplicar cambios optimistas de las sucesoras
    if (cambiosExtra.length > 0) {
      setTareasOptimistas(prev => {
        const nuevos = { ...prev };
        cambiosExtra.forEach(c => {
          nuevos[c.tareaId] = {
            ...(nuevos[c.tareaId] || {}),
            fecha_inicio: c.fecha_inicio,
            fecha_fin: c.fecha_fin,
          };
        });
        return nuevos;
      });
    }

    // 5) Snapshot extra para deshacer (las sucesoras también)
    const snapshotExtra = cambiosExtra.map(c => {
      const tarea = tareas.find(t => t.id === c.tareaId);
      return {
        tareaId: c.tareaId,
        fecha_inicio: tarea?.fecha_inicio,
        fecha_fin: tarea?.fecha_fin,
        duracion_real_dias: tarea?.duracion_real_dias,
      };
    });

    // 6) Combinar cambios y guardar en Firestore en un solo batch
    const cambiosFinales = [...cambios, ...cambiosExtra];

    try {
      const batch = writeBatch(db);
      cambiosFinales.forEach(c => {
        const ref = doc(db, 'planificacion_tareas', c.tareaId);
        const data = {};
        if (c.fecha_inicio !== undefined) data.fecha_inicio = c.fecha_inicio;
        if (c.fecha_fin !== undefined) data.fecha_fin = c.fecha_fin;
        if (c.duracion_real_dias !== undefined) data.duracion_real_dias = c.duracion_real_dias;
        if (c.fecha_manual !== undefined) data.fecha_manual = c.fecha_manual;
        batch.update(ref, data);
      });
      await batch.commit();

      // 7) Toast informativo
      const snapshotCompleto = [...snapshotAnterior, ...snapshotExtra];

      if (movidas.length > 0) {
        // Toast especial: hay auto-acomodo
        const toastId = toast.custom(
          (t) => (
            <div
              className={cn(
                'bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3',
                'border border-slate-700',
                t.visible ? 'animate-enter' : 'animate-leave'
              )}
              style={{ minWidth: '380px', maxWidth: '520px' }}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold">
                  {cambios.length} cambio{cambios.length === 1 ? '' : 's'}
                  {movidas.length > 0 && ` · ${movidas.length} movida${movidas.length === 1 ? '' : 's'} por dependencias`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {movidas.slice(0, 3).map(m => m.nombre).join(', ')}
                  {movidas.length > 3 && ` +${movidas.length - 3} más`}
                </p>
              </div>
              <button
                onClick={() => handleUndo(toastId, snapshotCompleto)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Deshacer
              </button>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="text-slate-500 hover:text-slate-300 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ),
          { duration: DURACION_TOAST_DESHACER, position: 'bottom-right' }
        );
      } else {
        mostrarToastUndo(cambios.length, snapshotCompleto);
      }
    } catch (err) {
      console.error('[GanttTab] Error en writeBatch:', err);
      // Rollback de optimistas
      setTareasOptimistas(prev => {
        const nuevos = { ...prev };
        cambiosFinales.forEach(c => { delete nuevos[c.tareaId]; });
        return nuevos;
      });
      toast.error('Error al guardar cambios: ' + (err.message || ''), { duration: 6000 });
    }
  }, [tareas, mostrarToastUndo, feriadosSet, handleUndo]);

  const {
    dragActivo,
    preview,
    conflicto,
    aviso,
    dependenciasAfectadas,
    iniciarDrag,
    actualizarDrag,
    terminarDrag,
    cancelarDrag,
    feriadosSet,
  } = useGanttDrag({
    filas,
    nivelZoom,
    guardarCambios,
    plan,
    feriadosCustom,
  });

  useEffect(() => {
    if (!dragActivo) return;
    const handleMouseMove = (e) => actualizarDrag(e);
    const handleMouseUp = (e) => terminarDrag(e);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') cancelarDrag();
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dragActivo, actualizarDrag, terminarDrag, cancelarDrag]);

  const toggleRubro = (nombreRubro) => {
    setRubrosColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(nombreRubro)) next.delete(nombreRubro);
      else next.add(nombreRubro);
      return next;
    });
  };

  const handleAbrirDependencias = useCallback((tarea) => {
    setTareaDependencias(tarea);
  }, []);

  // 🔑 Callback cuando se edita fecha en el sidebar
  const handleCambiarFecha = useCallback(async (tareaId, campo, fechaIso) => {
    const tarea = tareasConCambios.find(t => t.id === tareaId);
    if (!tarea) return;

    const anio = Number(String(fechaIso).slice(0, 4)) || new Date().getFullYear();
    const feriadosReales = getFeriadosDelAnio(anio, feriadosCustom);

    const cambios = [{ tareaId, [campo]: fechaIso, fecha_manual: true }];

    if (campo === 'fecha_inicio' && tarea.duracion_real_dias) {
      const nuevaFechaFin = calcularFechaFin(fechaIso, tarea.duracion_real_dias, feriadosReales);
      cambios[0].fecha_fin = nuevaFechaFin;
    }

    if (campo === 'fecha_fin' && tarea.fecha_inicio) {
      const inicioMs = new Date(tarea.fecha_inicio + 'T00:00:00').getTime();
      const finMs = new Date(fechaIso + 'T00:00:00').getTime();
      const duracionDias = Math.max(1, Math.round((finMs - inicioMs) / (1000 * 60 * 60 * 24)));
      cambios[0].duracion_real_dias = duracionDias;
    }

    await guardarCambios(cambios);
  }, [tareasConCambios, guardarCambios, feriadosCustom]);

  const handleGuardarDependencias = useCallback(async (tareaId, predecesoras) => {
    const tareaOriginal = tareas.find(t => t.id === tareaId);
    if (!tareaOriginal) throw new Error('Tarea no encontrada');

    setTareasOptimistas(prev => ({
      ...prev,
      [tareaId]: { ...(prev[tareaId] || {}), predecesoras },
    }));

    try {
      await actualizarDoc('planificacion_tareas', tareaId, { predecesoras });
      toast.success(`Dependencias guardadas (${predecesoras.length})`, { duration: 3000 });
    } catch (err) {
      setTareasOptimistas(prev => {
        const nuevo = { ...prev };
        delete nuevo[tareaId];
        return nuevo;
      });
      throw err;
    }
  }, [tareas]);

  if (!Array.isArray(tareas) || tareas.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">Este plan no tiene tareas todavía</p>
        <p className="text-xs text-slate-400">
          Cuando se carguen tareas del presupuesto, aparecerán acá.
        </p>
      </div>
    );
  }

  const tareasSinFecha = tareas.filter(t => !t.fecha_inicio || !t.fecha_fin);
  const totalRubros = filas.filter(f => f._tipo === 'rubro').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">

      {/* Barra superior informativa */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3 text-slate-500">
          <span><b className="text-slate-700">{totalRubros}</b> rubros</span>
          <span className="text-slate-300">|</span>
          <span><b className="text-slate-700">{tareas.length}</b> tareas</span>
          <span className="text-slate-300">|</span>
          <span>Rango: <b className="text-slate-700">{rango.totalDias} días</b></span>
          {flechas.length > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span><b className="text-slate-700">{flechas.length}</b> dependencias</span>
            </>
          )}
        </div>
        {tareasSinFecha.length > 0 && (
          <div className="flex items-center gap-1 text-amber-700">
            <AlertCircle className="w-3 h-3" />
            <span>{tareasSinFecha.length} sin fechas</span>
          </div>
        )}
      </div>

      {/* Banners */}
      {conflicto && (
        <div className="px-4 py-2 bg-rose-100 border-b-2 border-rose-400 text-rose-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>⚠️ {conflicto.mensaje} — Soltá para cancelar</span>
        </div>
      )}
      {!conflicto && aviso && (
        <div className="px-4 py-2 bg-amber-100 border-b-2 border-amber-400 text-amber-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>📅 {aviso.mensaje}</span>
        </div>
      )}
      {!conflicto && !aviso && dependenciasAfectadas.length > 0 && (
        <div className="px-4 py-2 bg-blue-100 border-b-2 border-blue-400 text-blue-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>
            Al mover esta tarea también se moverán {dependenciasAfectadas.length} tarea{dependenciasAfectadas.length === 1 ? '' : 's'}:
            {' '}
            {dependenciasAfectadas.slice(0, 3).map(d => d.tarea_nombre).join(', ')}
            {dependenciasAfectadas.length > 3 && ` +${dependenciasAfectadas.length - 3} más`}
          </span>
        </div>
      )}

      {/* Contenedor con scroll */}
      <div className="overflow-auto" style={{ height: '70vh', minHeight: '400px' }}>
        <div className="flex min-w-fit">

          {/* Sidebar con columnas de fecha */}
          <div className="sticky left-0 z-30">
            <GanttSidebar
              filas={filas}
              alturaFila={ALTURA_FILA}
              onHoverTarea={setTareaHoverId}
              tareaHoverId={tareaHoverId}
              onToggleRubro={toggleRubro}
              onAbrirDependencias={handleAbrirDependencias}
              onCambiarFecha={handleCambiarFecha}
            />
          </div>

          {/* Gantt */}
          <div className="flex-1 min-w-0">
            <div style={{ width: `${anchoTotal}px`, minWidth: '100%' }}>

              <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <GanttHeader
                  ticks={ticks}
                  anchoTotal={anchoTotal}
                  nivelZoom={nivelZoom}
                  onCambiarZoom={setNivelZoomId}
                  alturaFila={ALTURA_FILA}
                />
              </div>

              <div className="relative">
                {/* Grilla */}
                <div
                  className="absolute top-0 left-0 pointer-events-none flex"
                  style={{
                    width: `${anchoTotal}px`,
                    height: `${filas.length * ALTURA_FILA}px`,
                    zIndex: 0,
                  }}
                >
                  {ticks.map((tick, idx) => (
                    <div
                      key={`grid-${tick.iso}-${idx}`}
                      className={cn(
                        'border-r shrink-0 h-full',
                        tick.esFinde ? 'bg-slate-100 border-slate-200' : 'border-slate-200',
                        tick.esInicioMes && 'border-l-2 border-l-slate-400'
                      )}
                      style={{ width: `${tick.anchoPx}px` }}
                    />
                  ))}
                </div>

                {/* Flechas */}
                <GanttFlechas
                  flechas={flechas}
                  anchoTotal={anchoTotal}
                  altoTotal={filas.length * ALTURA_FILA}
                  hoverKey={tareaHoverId}
                />

                {/* Filas */}
                <div className="relative" style={{ zIndex: 10 }}>
                  {filas.map((fila) => {
                    const isRubro = fila._tipo === 'rubro';
                    const hoverKey = isRubro ? `rubro-${fila.nombre}` : fila.id;
                    const isHover = tareaHoverId === hoverKey;

                    return (
                      <div
                        key={fila._key}
                        style={{ height: `${ALTURA_FILA}px` }}
                        className={cn(
                          'border-b relative',
                          isRubro ? 'border-slate-300' : 'border-slate-200'
                        )}
                      >
                        <div
                          className={cn(
                            'absolute inset-0',
                            isRubro ? 'bg-slate-100' : 'bg-transparent',
                            isHover && !isRubro && 'bg-amber-100',
                            isHover && isRubro && 'bg-blue-100'
                          )}
                          style={{ zIndex: 1 }}
                        />

                        <div className="relative" style={{ zIndex: 10 }}>
                          <GanttBarra
                            fila={fila}
                            alturaFila={ALTURA_FILA}
                            esHover={isHover}
                            onHover={setTareaHoverId}
                            onLeave={() => setTareaHoverId(null)}
                            onIniciarDrag={isRubro ? undefined : iniciarDrag}
                            dragActivo={dragActivo}
                            preview={preview}
                            conflicto={conflicto}
                            aviso={aviso}
                            feriadosSet={feriadosSet}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal de dependencias */}
      {tareaDependencias && (
        <TareaDependenciasModal
          isOpen={!!tareaDependencias}
          onClose={() => setTareaDependencias(null)}
          tarea={tareasConCambios.find(t => t.id === tareaDependencias.id) || tareaDependencias}
          tareas={tareasConCambios}
          onGuardar={handleGuardarDependencias}
        />
      )}

    </div>
  );
}