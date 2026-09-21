// src/components/planificacion/proyectos/detalle/gantt/GanttTab.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, AlertCircle, CheckCircle2, Undo2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { cn } from '@/lib/utils';
import { NIVELES_ZOOM, useGanttCalculos } from './useGanttCalculos';
import { useGanttDrag } from './useGanttDrag';
import GanttHeader from './GanttHeader';
import { FilaRubro, FilaTarea } from './GanttSidebar';
import GanttBarra from './GanttBarra';
import GanttTooltip from './GanttTooltip';

const ALTURA_FILA = 36;
const ALTURA_HEADER_GANTT = 44 + ALTURA_FILA * 1.5;
const DURACION_TOAST_DESHACER = 10000;

export default function GanttTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [nivelZoomId, setNivelZoomId] = useState('semanas');
  const [tareaHoverId, setTareaHoverId] = useState(null);
  const [tooltip, setTooltip] = useState({ tarea: null, posicion: null });
  const [rubrosColapsados, setRubrosColapsados] = useState(new Set());
  const [tareasOptimistas, setTareasOptimistas] = useState({});

  const nivelZoom = NIVELES_ZOOM[nivelZoomId] || NIVELES_ZOOM.semanas;

  // Mezclar tareas originales con cambios optimistas
  const tareasConCambios = useMemo(() => {
    return tareas.map(t => {
      const cambio = tareasOptimistas[t.id];
      if (!cambio) return t;
      return { ...t, ...cambio };
    });
  }, [tareas, tareasOptimistas]);

  const { rango, filas, ticks, anchoTotal } = useGanttCalculos(
    tareasConCambios,
    nivelZoom,
    rubrosColapsados
  );

  // ─── Toast persistente con botón Deshacer ─────────────────────────────
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
      {
        duration: DURACION_TOAST_DESHACER,
        position: 'bottom-right',
      }
    );
  }, []);

  // ─── Deshacer cambios ─────────────────────────────────────────────────
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

      // Revertir el estado optimista
      setTareasOptimistas(prev => {
        const nuevo = { ...prev };
        snapshot.forEach(s => {
          delete nuevo[s.tareaId];
        });
        return nuevo;
      });

      toast.success('Cambios revertidos', { duration: 2000 });
    } catch (err) {
      console.error('[GanttTab] Error al deshacer:', err);
      toast.error('No se pudo deshacer: ' + (err.message || ''), { duration: 5000 });
    }
  }, []);

  // ─── Guardar cambios con writeBatch ──────────────────────────────────
  const guardarCambios = useCallback(async (cambios) => {
    // 1. Snapshot del estado anterior (para Undo)
    const snapshotAnterior = cambios.map(c => {
      const tarea = tareas.find(t => t.id === c.tareaId);
      return {
        tareaId: c.tareaId,
        fecha_inicio: tarea?.fecha_inicio,
        fecha_fin: tarea?.fecha_fin,
        duracion_real_dias: tarea?.duracion_real_dias,
      };
    });

    // 2. Actualización optimista de la UI
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

    // 3. writeBatch atómico
    try {
      const batch = writeBatch(db);
      cambios.forEach(c => {
        const ref = doc(db, 'planificacion_tareas', c.tareaId);
        const data = {};
        if (c.fecha_inicio !== undefined) data.fecha_inicio = c.fecha_inicio;
        if (c.fecha_fin !== undefined) data.fecha_fin = c.fecha_fin;
        if (c.duracion_real_dias !== undefined) data.duracion_real_dias = c.duracion_real_dias;
        if (c.fecha_manual !== undefined) data.fecha_manual = c.fecha_manual;
        batch.update(ref, data);
      });

      await batch.commit();

      // 4. Toast con Undo
      mostrarToastUndo(cambios.length, snapshotAnterior);
    } catch (err) {
      console.error('[GanttTab] Error en writeBatch:', err);
      // Revertir UI
      setTareasOptimistas(prev => {
        const nuevos = { ...prev };
        cambios.forEach(c => {
          delete nuevos[c.tareaId];
        });
        return nuevos;
      });
      toast.error('Error al guardar cambios: ' + (err.message || ''), { duration: 6000 });
    }
  }, [tareas, mostrarToastUndo]);

  // ─── Hook de drag ─────────────────────────────────────────────────────
  const {
    dragActivo,
    preview,
    conflicto,
    dependenciasAfectadas,
    iniciarDrag,
    actualizarDrag,
    terminarDrag,
    cancelarDrag,
  } = useGanttDrag({
    filas,
    nivelZoom,
    guardarCambios,
  });

  // ─── Listeners globales ───────────────────────────────────────────────
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

  const handleTooltipMove = (e, tarea) => {
    setTooltip({ tarea, posicion: { x: e.clientX, y: e.clientY } });
  };

  const handleLeave = () => {
    setTareaHoverId(null);
    setTooltip({ tarea: null, posicion: null });
  };

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
        </div>
        {tareasSinFecha.length > 0 && (
          <div className="flex items-center gap-1 text-amber-700">
            <AlertCircle className="w-3 h-3" />
            <span>{tareasSinFecha.length} sin fechas</span>
          </div>
        )}
      </div>

      {/* Banner de conflicto */}
      {conflicto && (
        <div className="px-4 py-2 bg-rose-100 border-b-2 border-rose-400 text-rose-900 text-[11px] font-bold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>⚠️ {conflicto.mensaje} — Soltá para cancelar</span>
        </div>
      )}

      {/* Banner de dependencias afectadas */}
      {!conflicto && dependenciasAfectadas.length > 0 && (
        <div className="px-4 py-2 bg-amber-100 border-b-2 border-amber-400 text-amber-900 text-[11px] font-bold flex items-center gap-2">
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

          {/* Sidebar */}
          <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-300 sticky left-0 z-30">
            <div
              className="border-b-2 border-slate-300 px-3 flex items-center bg-slate-200 sticky top-0 z-10"
              style={{ height: `${ALTURA_HEADER_GANTT}px` }}
            >
              <p className="text-[10px] font-black text-slate-700 uppercase">Rubro / Tarea</p>
            </div>

            {filas.map((fila) => {
              const isRubro = fila._tipo === 'rubro';
              const hoverKey = isRubro ? `rubro-${fila.nombre}` : fila.id;
              const isHover = tareaHoverId === hoverKey;

              return (
                <div
                  key={fila._key}
                  style={{ height: `${ALTURA_FILA}px` }}
                  className={cn(
                    'border-b overflow-hidden transition-colors',
                    isRubro ? 'bg-slate-100 border-slate-300' : 'border-slate-200',
                    isHover && !isRubro && 'bg-amber-100',
                    isHover && isRubro && 'bg-blue-100'
                  )}
                >
                  {isRubro ? (
                    <FilaRubro
                      rubro={fila}
                      alturaFila={ALTURA_FILA}
                      onClick={() => toggleRubro(fila.nombre)}
                    />
                  ) : (
                    <FilaTarea
                      tarea={fila}
                      alturaFila={ALTURA_FILA}
                      esHover={isHover}
                      onHover={setTareaHoverId}
                    />
                  )}
                </div>
              );
            })}
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
                  style={{ width: `${anchoTotal}px`, height: `${filas.length * ALTURA_FILA}px` }}
                >
                  {ticks.map((tick, idx) => (
                    <div
                      key={`grid-${tick.iso}-${idx}`}
                      className={cn(
                        'border-r shrink-0 h-full',
                        tick.esFinde
                          ? 'bg-slate-100 border-slate-200'
                          : 'border-slate-200',
                        tick.esInicioMes && 'border-l-2 border-l-slate-400'
                      )}
                      style={{ width: `${tick.anchoPx}px` }}
                    />
                  ))}
                </div>

                {/* Filas */}
                <div className="relative">
                  {filas.map((fila) => {
                    const isRubro = fila._tipo === 'rubro';
                    const hoverKey = isRubro ? `rubro-${fila.nombre}` : fila.id;
                    const isHover = tareaHoverId === hoverKey;

                    return (
                      <div
                        key={fila._key}
                        style={{ height: `${ALTURA_FILA}px` }}
                        className={cn(
                          'border-b overflow-hidden transition-colors',
                          isRubro ? 'bg-slate-100 border-slate-300' : 'border-slate-200',
                          isHover && !isRubro && 'bg-amber-100',
                          isHover && isRubro && 'bg-blue-100'
                        )}
                      >
                        <GanttBarra
                          fila={fila}
                          alturaFila={ALTURA_FILA}
                          esHover={isHover}
                          onHover={setTareaHoverId}
                          onLeave={handleLeave}
                          onTooltipMove={isRubro ? undefined : handleTooltipMove}
                          onIniciarDrag={isRubro ? undefined : iniciarDrag}
                          dragActivo={dragActivo}
                          preview={preview}
                          conflicto={conflicto}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 🔑 Tooltip solo cuando NO hay drag activo */}
      {!dragActivo && (
        <GanttTooltip tarea={tooltip.tarea} posicion={tooltip.posicion} />
      )}
    </div>
  );
}