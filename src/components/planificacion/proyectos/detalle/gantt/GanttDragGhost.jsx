// src/components/planificacion/proyectos/detalle/gantt/GanttDragGhost.jsx
import React from 'react';
import { formatearFechaLarga } from './useGanttCalculos';

/**
 * Barra fantasma que muestra el preview durante el drag.
 * Incluye un badge con las fechas destino y el tipo de acción.
 */
export default function GanttDragGhost({
  preview,
  alturaFila = 36,
  tieneConflicto = false,
  fechaInicioNueva,
  fechaFinNueva,
  duracionNueva,
  tipoDrag = 'mover',
}) {
  if (!preview) return null;

  const colorFondo = tieneConflicto ? '#fecaca' : '#bfdbfe';
  const colorBorde = tieneConflicto ? '#dc2626' : '#2563eb';

  const mostrarBadge = fechaInicioNueva && fechaFinNueva;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${preview.offsetPx}px`,
        top: '50%',
        width: `${preview.anchoPx}px`,
        transform: 'translateY(-50%)',
        zIndex: 30,
      }}
    >
      {/* Badge con fechas (arriba de la barra fantasma) */}
      {mostrarBadge && (
        <div
          className="absolute left-0 bottom-full mb-2 whitespace-nowrap rounded-lg shadow-lg border-2 px-2.5 py-1 flex items-center gap-2"
          style={{
            backgroundColor: tieneConflicto ? '#7f1d1d' : '#0f172a',
            borderColor: colorBorde,
            color: 'white',
          }}
        >
          {/* Tipo de drag */}
          <span className="text-[10px] font-black uppercase text-amber-400">
            {tipoDrag === 'mover' && '↔ Mover'}
            {tipoDrag === 'resize-izq' && '← Inicio'}
            {tipoDrag === 'resize-der' && 'Fin →'}
          </span>

          <span className="text-[10px] text-slate-400">|</span>

          {/* Fecha inicio → fin */}
          <span className="text-[10px] font-bold">
            {formatearFechaLarga(fechaInicioNueva)}
          </span>
          <span className="text-[10px] text-slate-400">→</span>
          <span className="text-[10px] font-bold">
            {formatearFechaLarga(fechaFinNueva)}
          </span>

          {/* Duración */}
          {duracionNueva > 0 && (
            <>
              <span className="text-[10px] text-slate-400">|</span>
              <span className="text-[10px] font-bold text-emerald-400">
                {duracionNueva} d
              </span>
            </>
          )}
        </div>
      )}

      {/* Barra fantasma */}
      <div
        className="rounded"
        style={{
          width: '100%',
          height: `${alturaFila * 0.38}px`,
          backgroundColor: colorFondo,
          border: `2px dashed ${colorBorde}`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}