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

  // 🔑 CPM: toggle "Ver críticas" persistido en localStorage
  const [mostrarCriticas, setMostrarCriticas] = useState(() => {
    try {
      const guardado = localStorage.getItem('gantt_mostrar_criticas');
      return guardado === null ? true : guardado === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gantt_mostrar_criticas', String(mostrarCriticas));
    } catch {}
  }, [mostrarCriticas]);

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

  // 🔑 CPM: recibir tareasCriticas del hook
  const { rango, filas, ticks, anchoTotal, flechas, tareasCriticas } = useGanttCalculos(
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
    const snapshotAnterior = cambios.map(c => {
      const tarea = tareas.find(t => t.id === c.tareaId);
      return {
        tareaId: c.tareaId,
        fecha_inicio: tarea?.fecha_inicio,
        fecha_fin: tarea?.fecha_fin,
        duracion_real_dias: tarea?.duracion_real_dias,
      };
    });

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

    const tareaOrigenId = cambios[0]?.tareaId;

    let cambiosExtra = [];
    let movidas = [];

    if (tareaOrigenId) {
      const anioPlan = Number((plan?.fecha_inicio || '').slice(0, 4)) || new Date().getFullYear();
      const feriadosLocal = getFeriadosDelAnio(anioPlan, feriadosCustom);

      const resultado = recalcularFechasDelPlan(
        tareasPostCambio,
        feriadosLocal,
        tareaOrigenId
      );

      cambiosExtra = Object.entries(resultado.cambios || {}).map(([tareaId, data]) => ({
        tareaId,
        ...data,
        fecha_manual: false,
      }));

      movidas = resultado.movidas || [];
    }

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

    const snapshotExtra = cambiosExtra.map(c => {
      const tarea = tareas.find(t => t.id === c.tareaId);
      return {
        tareaId: c.tareaId,
        fecha_inicio: tarea?.fecha_inicio,
        fecha_fin: tarea?.fecha_fin,
        duracion_real_dias: tarea?.duracion_real_dias,
      };
    });

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

      const snapshotCompleto = [...snapshotAnterior, ...snapshotExtra];

      if (movidas.length > 0) {
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
      setTareasOptimistas(prev => {
        const nuevos = { ...prev };
        cambiosFinales.forEach(c => { delete nuevos[c.tareaId]; });
        return nuevos;
      });
      toast.error('Error al guardar cambios: ' + (err.message || ''), { duration: 6000 });
    }
  }, [tareas, mostrarToastUndo, handleUndo, plan, feriadosCustom]);

  const {
    dragActivo,
    preview,
    conflicto,
    conflictoWarning,
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

  // 🔑 FIX 3: manejar cambio de fecha desde el sidebar con off-by-one corregido.
  // - Al cambiar fecha_inicio: la nueva fecha_fin se calcula con (duracion_real_dias - 1)
  //   porque el día de inicio YA cuenta como día 1.
  // - Al cambiar fecha_fin: la nueva duracion_real_dias se calcula con (+1) para
  //   contar ambos extremos (13/10 → 14/10 = 2 días).
  const handleCambiarFecha = useCallback(async (tareaId, campo, fechaIso) => {
    const tarea = tareasConCambios.find(t => t.id === tareaId);
    if (!tarea) return;

    const anio = Number(String(fechaIso).slice(0, 4)) || new Date().getFullYear();
    const feriadosReales = getFeriadosDelAnio(anio, feriadosCustom);

    const cambios = [{ tareaId, [campo]: fechaIso, fecha_manual: true }];

    if (campo === 'fecha_inicio' && tarea.duracion_real_dias) {
      // 🔑 FIX: -1 porque el día de inicio YA cuenta como día 1.
      const nuevaFechaFin = calcularFechaFin(
        fechaIso,
        Math.max(0, tarea.duracion_real_dias - 1),
        feriadosReales
      );
      cambios[0].fecha_fin = nuevaFechaFin;
    }

    if (campo === 'fecha_fin' && tarea.fecha_inicio) {
      // 🔑 FIX: +1 para contar ambos extremos (13/10 → 14/10 = 2 días).
      const inicioMs = new Date(tarea.fecha_inicio + 'T00:00:00').getTime();
      const finMs = new Date(fechaIso + 'T00:00:00').getTime();
      const duracionDias = Math.max(1, Math.round((finMs - inicioMs) / (1000 * 60 * 60 * 24)) + 1);
      cambios[0].duracion_real_dias = duracionDias;
    }

    await guardarCambios(cambios);
  }, [tareasConCambios, guardarCambios, feriadosCustom]);

  const handleGuardarDependencias = useCallback(async (tareaId, predecesoras) => {
    const tareaOriginal = tareas.find(t => t.id === tareaId);
    if (!tareaOriginal) throw new Error('Tarea no encontrada');

    // 🔑 FIX: guardamos las predecesoras + disparamos la cascada de recálculo de fechas.
    try {
      // 1. Persistir las predecesoras
      await actualizarDoc('planificacion_tareas', tareaId, { predecesoras });

      // 2. Reflejar en el estado local (optimistic) para que la cascada vea los cambios
      const tareasConPreds = tareas.map(t =>
        String(t.id) === String(tareaId) ? { ...t, predecesoras } : t
      );

      // 3. Recalcular la cascada de fechas
      const anioPlan = Number((plan?.fecha_inicio || '').slice(0, 4)) || new Date().getFullYear();
      const feriadosLocal = getFeriadosDelAnio(anioPlan, feriadosCustom);

      const resultado = recalcularFechasDelPlan(
        tareasConPreds,
        feriadosLocal,
        tareaId
      );

      const cambiosExtra = Object.entries(resultado.cambios || {}).map(([id, data]) => ({
        tareaId: id,
        ...data,
        fecha_manual: false,
      }));

      // 4. Si hay sucesoras a mover, persistirlas + optimismo + toast de undo
      if (cambiosExtra.length > 0) {
        const snapshotExtra = cambiosExtra.map(c => {
          const tarea = tareas.find(t => t.id === c.tareaId);
          return {
            tareaId: c.tareaId,
            fecha_inicio: tarea?.fecha_inicio,
            fecha_fin: tarea?.fecha_fin,
            duracion_real_dias: tarea?.duracion_real_dias,
          };
        });

        setTareasOptimistas(prev => {
          const nuevos = { ...prev, [tareaId]: { ...(prev[tareaId] || {}), predecesoras } };
          cambiosExtra.forEach(c => {
            nuevos[c.tareaId] = {
              ...(nuevos[c.tareaId] || {}),
              fecha_inicio: c.fecha_inicio,
              fecha_fin: c.fecha_fin,
            };
          });
          return nuevos;
        });

        const batch = writeBatch(db);
        cambiosExtra.forEach(c => {
          const ref = doc(db, 'planificacion_tareas', c.tareaId);
          const data = {};
          if (c.fecha_inicio !== undefined) data.fecha_inicio = c.fecha_inicio;
          if (c.fecha_fin !== undefined) data.fecha_fin = c.fecha_fin;
          if (c.fecha_manual !== undefined) data.fecha_manual = c.fecha_manual;
          batch.update(ref, data);
        });
        await batch.commit();

        // Toast con undo
        const movidas = resultado.movidas || [];
        if (movidas.length > 0) {
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
                    Dependencias guardadas
                    {movidas.length > 0 && ` · ${movidas.length} movida${movidas.length === 1 ? '' : 's'} por dependencias`}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {movidas.slice(0, 3).map(m => m.nombre).join(', ')}
                    {movidas.length > 3 && ` +${movidas.length - 3} más`}
                  </p>
                </div>
                <button
                  onClick={() => handleUndo(toastId, snapshotExtra)}
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
        }
      } else {
        setTareasOptimistas(prev => ({
          ...prev,
          [tareaId]: { ...(prev[tareaId] || {}), predecesoras },
        }));
        toast.success(`Dependencias guardadas (${predecesoras.length})`, { duration: 3000 });
      }
    } catch (err) {
      setTareasOptimistas(prev => {
        const nuevo = { ...prev };
        delete nuevo[tareaId];
        return nuevo;
      });
      console.error('[GanttTab] Error guardando dependencias:', err);
      throw err;
    }
  }, [tareas, plan, feriadosCustom, handleUndo]);

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
          {/* 🔑 CPM: contador de críticas en el header */}
          {mostrarCriticas && tareasCriticas && tareasCriticas.size > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700 font-bold">
                <b>{tareasCriticas.size}</b> críticas
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {tareasSinFecha.length > 0 && (
            <div className="flex items-center gap-1 text-amber-700">
              <AlertCircle className="w-3 h-3" />
              <span>{tareasSinFecha.length} sin fechas</span>
            </div>
          )}

          {/* 🔑 CPM: toggle Ver críticas */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mostrarCriticas}
              onChange={(e) => setMostrarCriticas(e.target.checked)}
              className="w-3 h-3 cursor-pointer accent-rose-600"
            />
            <span className={cn(
              'text-[10px] font-bold uppercase transition-colors',
              mostrarCriticas ? 'text-rose-700' : 'text-slate-500'
            )}>
              Ver críticas
            </span>
          </label>
        </div>
      </div>

      {/* Banner rojo: conflicto bloqueante */}
      {conflicto && (
        <div className="px-4 py-2 bg-rose-100 border-b-2 border-rose-400 text-rose-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>🚫 {conflicto.mensaje} — Soltá para cancelar</span>
        </div>
      )}

      {/* Banner ámbar: warning de predecesoras */}
      {!conflicto && conflictoWarning && (
        <div className="px-4 py-2 bg-amber-100 border-b-2 border-amber-400 text-amber-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>⚠️ {conflictoWarning.mensaje} — Se guardará igual</span>
        </div>
      )}

      {/* Banner ámbar: aviso de finde/feriado */}
      {!conflicto && !conflictoWarning && aviso && (
        <div className="px-4 py-2 bg-amber-100 border-b-2 border-amber-400 text-amber-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>📅 {aviso.mensaje}</span>
        </div>
      )}

      {/* Banner azul: dependencias afectadas */}
      {!conflicto && !conflictoWarning && !aviso && dependenciasAfectadas.length > 0 && (
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
              mostrarCriticas={mostrarCriticas}
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
                            conflictoWarning={conflictoWarning}
                            aviso={aviso}
                            feriadosSet={feriadosSet}
                            mostrarCriticas={mostrarCriticas}
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