// src/components/planificacion/proyectos/detalle/gantt/GanttBarra.jsx
import React from 'react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO, COLOR_RUBRO } from './useGanttCalculos';

/**
 * Barra individual del Gantt.
 * Maneja 2 tipos: 'rubro' (barra agregada larga) y 'tarea' (barra normal).
 */
export default function GanttBarra({
  fila,
  alturaFila = 36,
  esHover,
  onHover,
  onLeave,
  onTooltipMove,
}) {
  if (fila._tipo === 'rubro') {
    return (
      <BarraRubro
        rubro={fila}
        alturaFila={alturaFila}
        onHover={onHover}
        onLeave={onLeave}
        onTooltipMove={onTooltipMove}
      />
    );
  }

  return (
    <BarraTarea
      tarea={fila}
      alturaFila={alturaFila}
      esHover={esHover}
      onHover={onHover}
      onLeave={onLeave}
      onTooltipMove={onTooltipMove}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE RUBRO (agregada, con subdivisiones internas)
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave, onTooltipMove }) {
  const mostrarLabel = rubro._anchoPx > 80;

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(`rubro-${rubro.nombre}`)}
      onMouseLeave={() => onLeave?.()}
    >
      {/* Barra principal del rubro */}
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-md border shadow-sm',
          'bg-gradient-to-r'
        )}
        style={{
          left: `${rubro._offsetPx}px`,
          width: `${rubro._anchoPx}px`,
          height: `${alturaFila * 0.55}px`,
          backgroundColor: COLOR_RUBRO.bg,
          borderColor: COLOR_RUBRO.border,
        }}
      >
        {/* Subdivisiones (cada tarea hija como línea vertical tenue) */}
        {rubro._subBarras.map((sub, idx) => (
          <div
            key={idx}
            className="absolute top-1 bottom-1 w-0.5 opacity-50"
            style={{
              left: `${sub._offsetInternoPx}px`,
              backgroundColor: 'rgba(30,58,138,0.5)',
            }}
            title={sub.nombre}
          />
        ))}

        {/* Label dentro */}
        {mostrarLabel && (
          <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
            <span className="text-[10px] font-black text-blue-950 truncate drop-shadow-sm">
              {rubro.nombre}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE TAREA (normal)
// ═══════════════════════════════════════════════════════════════════════════

function BarraTarea({ tarea, alturaFila, esHover, onHover, onLeave, onTooltipMove }) {
  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;
  const mostrarLabel = tarea._anchoPx > 60;

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(tarea.id)}
      onMouseLeave={() => onLeave?.()}
      onMouseMove={(e) => onTooltipMove?.(e, tarea)}
    >
      <div
        className={cn(
          'absolute top-1/2 -translate-y-1/2 rounded-md border transition-all',
          esHover ? 'shadow-lg ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          width: `${tarea._anchoPx}px`,
          height: `${alturaFila * 0.55}px`,
          backgroundColor: color.bg,
          borderColor: color.border,
        }}
      >
        {/* Progreso interno */}
        {porcentajeAvance > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-l-md opacity-50"
            style={{
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: color.border,
            }}
          />
        )}

        {/* Label dentro */}
        {mostrarLabel && (
          <div className="absolute inset-0 flex items-center px-2 pointer-events-none">
            <span className="text-[10px] font-black text-slate-800 truncate drop-shadow-sm">
              {tarea.tarea_nombre}
            </span>
          </div>
        )}

        {/* Burbuja % a la derecha */}
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