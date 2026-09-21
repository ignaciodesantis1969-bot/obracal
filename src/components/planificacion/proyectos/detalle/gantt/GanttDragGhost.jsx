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
      style={{
        position: 'absolute',
        left: `${preview.offsetPx}px`,
        top: '50%',
        width: `${preview.anchoPx}px`,
        transform: 'translateY(-50%)',
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      {/* Badge con fechas (arriba de la barra fantasma) */}
      {mostrarBadge && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: '100%',
            marginBottom: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: tieneConflicto ? '#7f1d1d' : '#0f172a',
            border: `2px solid ${colorBorde}`,
            borderRadius: '8px',
            padding: '6px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 700,
            color: 'white',
            minHeight: '28px',
            lineHeight: 1.2,
          }}
        >
          {/* Tipo de drag */}
          <span
            style={{
              color: '#fbbf24',
              textTransform: 'uppercase',
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '0.3px',
            }}
          >
            {tipoDrag === 'mover' && '↔ Mover'}
            {tipoDrag === 'resize-izq' && '← Inicio'}
            {tipoDrag === 'resize-der' && 'Fin →'}
          </span>

          <span style={{ color: '#64748b' }}>|</span>

          {/* Fechas */}
          <span>{formatearFechaLarga(fechaInicioNueva)}</span>
          <span style={{ color: '#64748b' }}>→</span>
          <span>{formatearFechaLarga(fechaFinNueva)}</span>

          {/* Duración */}
          {duracionNueva > 0 && (
            <>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#34d399' }}>{duracionNueva} d</span>
            </>
          )}
        </div>
      )}

      {/* Barra fantasma */}
      <div
        style={{
          width: '100%',
          height: `${alturaFila * 0.38}px`,
          backgroundColor: colorFondo,
          border: `2px dashed ${colorBorde}`,
          borderRadius: '4px',
          opacity: 0.85,
        }}
      />
    </div>
  );
}