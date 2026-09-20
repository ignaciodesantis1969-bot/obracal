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
// BARRA DE RUBRO — línea negra + topes en L, centrada verticalmente
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave }) {
  const GROSOR = 4;
  const ALTO_TOPE = 8;
  const COLOR = '#0f172a';   // slate-900 (más oscuro, más contraste)

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
        {/* Tope izquierdo — ligeramente arriba */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: `-${Math.round(ALTO_TOPE / 4)}px`,
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
            top: `-${Math.round(ALTO_TOPE / 4)}px`,
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
// BARRA DE TAREA — celeste con borde más oscuro
// ═══════════════════════════════════════════════════════════════════════════

function BarraTarea({ tarea, alturaFila, esHover, onHover, onLeave, onTooltipMove }) {
  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;

  const anchoBarra = Math.max(tarea._anchoPx, 12);

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
          'absolute rounded transition-all',
          esHover ? 'shadow-md ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          top: '50%',
          width: `${anchoBarra}px`,
          height: `${alturaFila * 0.38}px`,
          transform: 'translateY(-50%)',
          border: '2px solid #2563eb',       // 🔑 azul-600, más oscuro
          overflow: 'hidden',
        }}
      >
        {/* Fondo celeste — azul-200 (más saturado que azul-100) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#bfdbfe',       // 🔑 más visible
            zIndex: 0,
          }}
        />

        {/* Progreso interno */}
        {porcentajeAvance > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: '#2563eb',
              opacity: 0.6,
              zIndex: 1,
            }}
          />
        )}
      </div>

      {/* Burbuja % — fuera de la barra */}
      {porcentajeAvance > 0 && tarea._anchoPx > 40 && (
        <div
          className="absolute text-[9px] font-black text-slate-800 bg-white border-2 border-slate-400 rounded-full px-1.5 py-0.5 shadow-sm"
          style={{
            left: `${tarea._offsetPx + anchoBarra + 6}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            minWidth: '28px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          {Math.round(porcentajeAvance)}%
        </div>
      )}
    </div>
  );
}