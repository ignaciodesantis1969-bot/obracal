// src/components/planificacion/proyectos/detalle/gantt/GanttTab.jsx
import React, { useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVELES_ZOOM, useGanttCalculos } from './useGanttCalculos';
import GanttHeader from './GanttHeader';
import GanttSidebar from './GanttSidebar';
import GanttBarra from './GanttBarra';
import GanttTooltip from './GanttTooltip';

const ALTURA_FILA = 36;

export default function GanttTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [nivelZoomId, setNivelZoomId] = useState('semanas');
  const [tareaHoverId, setTareaHoverId] = useState(null);
  const [tooltip, setTooltip] = useState({ tarea: null, posicion: null });
  const [rubrosColapsados, setRubrosColapsados] = useState(new Set());

  const nivelZoom = NIVELES_ZOOM[nivelZoomId] || NIVELES_ZOOM.semanas;

  const { rango, filas, ticks, anchoTotal } = useGanttCalculos(
    tareas,
    nivelZoom,
    rubrosColapsados
  );

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

      {/* Barra superior */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3 text-slate-500">
          <span>
            <b className="text-slate-700">{totalRubros}</b> rubros
          </span>
          <span className="text-slate-300">|</span>
          <span>
            <b className="text-slate-700">{tareas.length}</b> tareas
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Rango: <b className="text-slate-700">{rango.totalDias} días</b>
          </span>
        </div>
        {tareasSinFecha.length > 0 && (
          <div className="flex items-center gap-1 text-amber-700">
            <AlertCircle className="w-3 h-3" />
            <span>{tareasSinFecha.length} sin fechas</span>
          </div>
        )}
      </div>

      {/* Contenedor principal */}
      <div className="flex">

        <GanttSidebar
          filas={filas}
          alturaFila={ALTURA_FILA}
          onHoverTarea={setTareaHoverId}
          tareaHoverId={tareaHoverId}
          onToggleRubro={toggleRubro}
        />

        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto overflow-y-hidden">
            <div style={{ width: `${anchoTotal}px`, minWidth: '100%' }}>

              <GanttHeader
                ticks={ticks}
                anchoTotal={anchoTotal}
                nivelZoom={nivelZoom}
                onCambiarZoom={setNivelZoomId}
                alturaFila={ALTURA_FILA}
              />

              <div className="relative">
                {/* Grilla de fondo */}
                <div
                  className="absolute top-0 left-0 pointer-events-none flex"
                  style={{ width: `${anchoTotal}px`, height: `${filas.length * ALTURA_FILA}px` }}
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
                  {filas.map((fila) => {
                    const isRubro = fila._tipo === 'rubro';
                    const hoverKey = isRubro ? `rubro-${fila.nombre}` : fila.id;
                    const isHover = tareaHoverId === hoverKey;

                    return (
                      <div
                        key={fila._key}
                        className={cn(
                          'border-b transition-colors',
                          isRubro
                            ? 'bg-slate-100/40 border-slate-200'
                            : 'border-slate-100',
                          isHover && !isRubro && 'bg-amber-50/40',
                          isHover && isRubro && 'bg-blue-50/60'
                        )}
                      >
                        <GanttBarra
                          fila={fila}
                          alturaFila={ALTURA_FILA}
                          esHover={isHover}
                          onHover={setTareaHoverId}
                          onLeave={handleLeave}
                          onTooltipMove={isRubro ? undefined : handleTooltipMove}
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

      <GanttTooltip tarea={tooltip.tarea} posicion={tooltip.posicion} />
    </div>
  );
}