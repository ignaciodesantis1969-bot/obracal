// src/components/planificacion/proyectos/detalle/gantt/GanttTab.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVELES_ZOOM, useGanttCalculos } from './useGanttCalculos';
import GanttHeader from './GanttHeader';
import GanttSidebar from './GanttSidebar';
import GanttBarra from './GanttBarra';
import GanttTooltip from './GanttTooltip';

const ALTURA_FILA = 36;

export default function GanttTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [nivelZoomId, setNivelZoomId] = useState('semanas'); // default según opción 2A
  const [tareaHoverId, setTareaHoverId] = useState(null);
  const [tooltip, setTooltip] = useState({ tarea: null, posicion: null });

  const nivelZoom = NIVELES_ZOOM[nivelZoomId] || NIVELES_ZOOM.semanas;

  const { rango, tareasConPos, ticks, anchoTotal } = useGanttCalculos(tareas, nivelZoom);

  const scrollRef = useRef(null);

  // Sincronizar scroll horizontal entre header y área de barras
  const [scrollX, setScrollX] = useState(0);

  const handleScroll = (e) => {
    setScrollX(e.target.scrollLeft);
  };

  // Tooltip: tracking de posición del mouse
  const handleTooltipMove = (e, tarea) => {
    setTooltip({
      tarea,
      posicion: { x: e.clientX, y: e.clientY },
    });
  };

  const handleLeave = () => {
    setTareaHoverId(null);
    setTooltip({ tarea: null, posicion: null });
  };

  // ─── Estado vacío ─────────────────────────────────────────────────────
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

  // ─── Alertas de tareas sin fecha ──────────────────────────────────────
  const tareasSinFecha = tareas.filter(t => !t.fecha_inicio || !t.fecha_fin);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">

      {/* Barra superior con info del rango */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            <b className="text-slate-700">{tareasConPos.length}</b> tareas en el Gantt
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Rango: <b className="text-slate-700">{rango.totalDias} días</b>
          </span>
        </div>
        {tareasSinFecha.length > 0 && (
          <div className="flex items-center gap-1 text-amber-700">
            <AlertCircle className="w-3 h-3" />
            <span>{tareasSinFecha.length} tarea{tareasSinFecha.length === 1 ? '' : 's'} sin fechas</span>
          </div>
        )}
      </div>

      {/* Contenedor principal */}
      <div className="flex">

        {/* Sidebar con tareas */}
        <GanttSidebar
          tareas={tareasConPos}
          alturaFila={ALTURA_FILA}
          onHoverTarea={setTareaHoverId}
          tareaHoverId={tareaHoverId}
        />

        {/* Área scrolleable con header + barras */}
        <div className="flex-1 min-w-0">
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden relative"
            onScroll={handleScroll}
          >
            <div style={{ width: `${anchoTotal}px`, minWidth: '100%' }}>

              {/* Header temporal */}
              <GanttHeader
                ticks={ticks}
                anchoTotal={anchoTotal}
                nivelZoom={nivelZoom}
                onCambiarZoom={setNivelZoomId}
                alturaFila={ALTURA_FILA}
              />

              {/* Filas de barras */}
              <div className="relative">
                {/* Líneas verticales de la grilla (por tick) */}
                <div
                  className="absolute top-0 left-0 pointer-events-none flex"
                  style={{ width: `${anchoTotal}px`, height: `${tareasConPos.length * ALTURA_FILA}px` }}
                >
                  {ticks.map((tick, idx) => (
                    <div
                      key={`grid-${tick.iso}-${idx}`}
                      className={cn(
                        'border-r shrink-0 h-full',
                        tick.esFinde ? 'bg-slate-50/40 border-slate-100' : 'border-slate-100',
                        tick.esInicioMes && 'border-l-2 border-l-slate-300'
                      )}
                      style={{ width: `${tick.anchoPx}px` }}
                    />
                  ))}
                </div>

                {/* Filas */}
                <div className="relative">
                  {tareasConPos.map((t) => (
                    <div
                      key={t.id || t._idx}
                      className={cn(
                        'border-b border-slate-100 transition-colors',
                        tareaHoverId === t.id ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'
                      )}
                    >
                      <GanttBarra
                        tarea={t}
                        alturaFila={ALTURA_FILA}
                        esHover={tareaHoverId === t.id}
                        onHover={setTareaHoverId}
                        onLeave={handleLeave}
                        onTooltipMove={handleTooltipMove}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Tooltip flotante */}
      <GanttTooltip
        tarea={tooltip.tarea}
        posicion={tooltip.posicion}
      />
    </div>
  );
}