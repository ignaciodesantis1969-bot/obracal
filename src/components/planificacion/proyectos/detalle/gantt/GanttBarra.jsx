// src/components/planificacion/proyectos/detalle/gantt/GanttBarra.jsx
import React from 'react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO } from './useGanttCalculos';

/**
 * Una barra individual del Gantt.
 * Vista no-interactiva (Fase 1). En Fase 2 agregamos drag/resize.
 */
export default function GanttBarra({
  tarea,
  alturaFila = 36,
  esHover,
  onHover,
  onLeave,
  onTooltipMove,
}) {
  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;

  // Mostrar label dentro de la barra si tiene espacio suficiente
  const mostrarLabel = tarea._anchoPx > 60;

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(tarea.id)}
      onMouseLeave={() => onLeave?.()}
      onMouseMove={(e) => onTooltipMove?.(e, tarea)}
    >
      {/* Barra */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-md border transition-all',
          esHover ? 'shadow-lg ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          width: `${tarea._anchoPx}px`,
          height: `${alturaFila * 0.6}px`,
          backgroundColor: color.bg,
          borderColor: color.border,
        }}
      >
        {/* Progreso interno (overlay más oscuro) */}
        {porcentajeAvance > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-md opacity-40"
            style={{
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />
        )}

        {/* Label dentro de la barra */}
        {mostrarLabel && (
          <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
            <span className="text-[10px] font-black text-white truncate drop-shadow-sm">
              {tarea.tarea_nombre}
            </span>
          </div>
        )}

        {/* Indicador de avance a la derecha (burbuja %) */}
        {porcentajeAvance > 0 && tarea._anchoPx > 40 && (
          <div
            className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full text-[9px] font-black text-slate-700 bg-white border border-slate-300 rounded-full px-1.5 py-0.5 shadow-sm"
            style={{ minWidth: '28px', textAlign: 'center' }}
          >
            {Math.round(porcentajeAvance)}%
          </div>
        )}
      </div>
    </div>
  );
}