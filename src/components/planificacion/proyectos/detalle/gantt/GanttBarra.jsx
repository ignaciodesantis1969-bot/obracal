// src/components/planificacion/proyectos/detalle/gantt/GanttBarra.jsx
import React from 'react';
import { cn } from '@/lib/utils';

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
// BARRA DE RUBRO: línea horizontal fina + topes cortos en L
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave }) {
  const GROSOR = 3;         // 🔑 más fina (antes 4)
  const ALTO_TOPE = 8;      // 🔑 más corta (antes 14)
  const COLOR = '#1e293b';

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
        {/* Tope izquierdo */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${GROSOR}px`,
            height: `${ALTO_TOPE}px`,
            backgroundColor: COLOR,
          }}
        />
        {/* Tope derecho */}
        <div
          style={{
            position: 'absolute',
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
// BARRA DE TAREA: fondo celeste + borde celeste más oscuro (hardcodeado)
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
          'absolute top-1/2 -translate-y-1/2 rounded-md transition-all',
          esHover ? 'shadow-lg ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          width: `${tarea._anchoPx}px`,
          height: `${alturaFila * 0.55}px`,
          transform: 'translateY(-50%)',
          backgroundColor: '#dbeafe',        // 🔑 celeste claro (blue-100)
          border: '2px solid #3b82f6',       // 🔑 borde celeste oscuro (blue-500)
        }}
      >
        {/* Progreso interno */}
        {porcentajeAvance > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: '#3b82f6',
              opacity: 0.5,
              borderRadius: '6px 0 0 6px',
            }}
          />
        )}

        {/* Burbuja % */}
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