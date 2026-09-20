// src/components/planificacion/proyectos/detalle/gantt/GanttTab.jsx
import React, { useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVELES_ZOOM, useGanttCalculos } from './useGanttCalculos';
import GanttHeader from './GanttHeader';
import { FilaRubro, FilaTarea } from './GanttSidebar';
import GanttBarra from './GanttBarra';
import GanttTooltip from './GanttTooltip';

const ALTURA_FILA = 36;
const ALTURA_HEADER_GANTT = 44 + ALTURA_FILA * 1.5; // = 98px

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

      {/* 🔑 Contenedor único con scroll VERTICAL en ambas columnas */}
      <div
        className="overflow-auto"
        style={{ height: '70vh', minHeight: '400px' }}
      >
        <div className="flex min-w-fit">

          {/* ═══ Columna izquierda: sidebar (sticky horizontal para no perder de vista) ═══ */}
          <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-300 sticky left-0 z-30">
            {/* Header del sidebar sticky top */}
            <div
              className="border-b-2 border-slate-300 px-3 flex items-center bg-slate-200 sticky top-0 z-10"
              style={{ height: `${ALTURA_HEADER_GANTT}px` }}
            >
              <p className="text-[10px] font-black text-slate-700 uppercase">Rubro / Tarea</p>
            </div>

            {/* Filas del sidebar */}
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

          {/* ═══ Columna derecha: Gantt ═══ */}
          <div className="flex-1 min-w-0">
            <div style={{ width: `${anchoTotal}px`, minWidth: '100%' }}>

              {/* Header del Gantt sticky top */}
              <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <GanttHeader
                  ticks={ticks}
                  anchoTotal={anchoTotal}
                  nivelZoom={nivelZoom}
                  onCambiarZoom={setNivelZoomId}
                  alturaFila={ALTURA_FILA}
                />
              </div>

              {/* Filas de barras */}
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