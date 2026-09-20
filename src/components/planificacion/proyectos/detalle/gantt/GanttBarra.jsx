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
// BARRA DE RUBRO: línea negra + topes en L, centrada verticalmente
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave }) {
  const GROSOR = 4;
  const ALTO_TOPE = 12;
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
          top: '50%',                              // 🔑 CENTRADO
          width: `${rubro._anchoPx}px`,
          height: `${GROSOR}px`,
          backgroundColor: COLOR,
          transform: 'translateY(-50%)',
        }}
      >
        {/* Tope izquierdo (baja desde la línea) */}
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
        {/* Tope derecho (baja desde la línea) */}
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
// BARRA DE TAREA: celeste con borde, centrada verticalmente
// ═══════════════════════════════════════════════════════════════════════════

function BarraTarea({ tarea, alturaFila, esHover, onHover, onLeave, onTooltipMove }) {
  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;

  // 🔑 Ancho mínimo para que se vea bien el fondo
  const anchoBarra = Math.max(tarea._anchoPx, 14);
  const grosorBorde = anchoBarra < 20 ? 1 : 2;

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
          'absolute rounded-md transition-all',
          esHover ? 'shadow-lg ring-2 ring-amber-400 z-10' : 'shadow-sm'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          top: '50%',                              // 🔑 CENTRADO
          width: `${anchoBarra}px`,
          height: `${alturaFila * 0.5}px`,
          transform: 'translateY(-50%)',
          border: `${grosorBorde}px solid #3b82f6`,
          overflow: 'hidden',
        }}
      >
        {/* Fondo celeste (capa absoluta para asegurar el color) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#dbeafe',
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
              backgroundColor: '#3b82f6',
              opacity: 0.5,
              zIndex: 1,
            }}
          />
        )}

        {/* Burbuja % a la derecha */}
        {porcentajeAvance > 0 && tarea._anchoPx > 40 && (
          <div
            className="absolute -translate-y-1/2 text-[9px] font-black text-slate-700 bg-white border border-slate-300 rounded-full px-1.5 py-0.5 shadow-sm"
            style={{
              right: '-4px',
              top: '50%',
              transform: 'translate(100%, -50%)',
              minWidth: '28px',
              textAlign: 'center',
              zIndex: 2,
            }}
          >
            {Math.round(porcentajeAvance)}%
          </div>
        )}
      </div>
    </div>
  );
}