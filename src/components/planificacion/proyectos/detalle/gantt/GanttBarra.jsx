// src/components/planificacion/proyectos/detalle/gantt/GanttBarra.jsx
import React from 'react';
import { cn } from '@/lib/utils';
import { COLOR_TAREA } from './useGanttCalculos';

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
// BARRA DE RUBRO: línea horizontal + 2 topes en L apuntando hacia abajo
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave }) {
  const GROSOR = 4;          // grosor de todas las líneas
  const ALTO_TOPE = 14;      // alto de los topes verticales (bajan desde la línea)
  const COLOR = '#1e293b';   // slate-800

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(`rubro-${rubro.nombre}`)}
      onMouseLeave={() => onLeave?.()}
    >
      <div
        className="absolute"
        style={{
          left: `${rubro._offsetPx}px`,
          top: '50%',
          width: `${rubro._anchoPx}px`,
          height: `${GROSOR}px`,
          backgroundColor: COLOR,
          transform: 'translateY(-50%)',
        }}
      >
        {/* Tope izquierdo: baja desde la línea */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: 0,
            width: `${GROSOR}px`,
            height: `${ALTO_TOPE}px`,
            backgroundColor: COLOR,
          }}
        />
        {/* Tope derecho: baja desde la línea */}
        <div
          className="absolute"
          style={{
            right: 0,
            top: 0,
            width: `${GROSOR}px`,
            height: `${ALTO_TOPE}px`,
            backgroundColor: COLOR,
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE TAREA: relleno celeste + borde celeste más oscuro (sin texto)
// ═══════════════════════════════════════════════════════════════════════════

function BarraTarea({ tarea, alturaFila, esHover, onHover, onLeave, onTooltipMove }) {
  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;

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
          'absolute top-1/2 -translate-y-1/2 rounded-md border-2 transition-all',
          esHover ? 'shadow-lg ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          width: `${tarea._anchoPx}px`,
          height: `${alturaFila * 0.55}px`,
          backgroundColor: COLOR_TAREA.bg,
          borderColor: COLOR_TAREA.border,
        }}
      >
        {/* Progreso interno */}
        {porcentajeAvance > 0 && (
          <div
            className="absolute inset-y-0 left-0 rounded-l"
            style={{
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: COLOR_TAREA.border,
              opacity: 0.5,
            }}
          />
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