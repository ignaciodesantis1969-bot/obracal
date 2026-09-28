// src/components/planificacion/proyectos/detalle/gantt/GanttDragGhost.jsx
import React from 'react';
import { formatearFechaLarga } from './useGanttCalculos';

/**
 * Barra fantasma que muestra el preview durante el drag.
 * Fase 2.3: incluye aviso si la fecha cae en finde/feriado.
 * 
 * 🔑 Estados visuales:
 *  - Normal: borde azul punteado
 *  - Warning (predecesoras): borde ámbar punteado
 *  - Bloqueo (duración < 1): borde rojo punteado
 */
export default function GanttDragGhost({
  preview,
  alturaFila = 36,
  tieneConflicto = false,      // 🔑 bloqueo real
  tieneWarning = false,        // 🔑 NUEVO: warning (no bloquea)
  fechaInicioNueva,
  fechaFinNueva,
  duracionNueva,
  tipoDrag = 'mover',
  aviso = null,
}) {
  if (!preview) return null;

  // 🔑 Colores según el estado
  let colorFondo = '#bfdbfe';   // azul default
  let colorBorde = '#2563eb';

  if (tieneConflicto) {
    colorFondo = '#fecaca';     // rojo
    colorBorde = '#dc2626';
  } else if (tieneWarning) {
    colorFondo = '#fef3c7';     // ámbar
    colorBorde = '#f59e0b';
  }

  const mostrarBadge = fechaInicioNueva && fechaFinNueva;

  // 🔑 Colores del badge
  let colorBadge = '#0f172a';
  let colorBordeBadge = colorBorde;

  if (tieneConflicto) {
    colorBadge = '#7f1d1d';
    colorBordeBadge = '#dc2626';
  } else if (tieneWarning) {
    colorBadge = '#78350f';
    colorBordeBadge = '#f59e0b';
  } else if (aviso) {
    colorBadge = '#78350f';
    colorBordeBadge = '#f59e0b';
  }

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
      {/* Badge con fechas */}
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
            backgroundColor: colorBadge,
            border: `2px solid ${colorBordeBadge}`,
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

          {/* 🔑 Aviso de conflicto bloqueante */}
          {tieneConflicto && (
            <>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#fecaca', fontSize: '10px' }}>
                ⚠️ Bloqueado
              </span>
            </>
          )}

          {/* 🔑 Aviso de warning (predecesoras) */}
          {tieneWarning && !tieneConflicto && (
            <>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#fbbf24', fontSize: '10px' }}>
                ⚠️ Antes de predecesora
              </span>
            </>
          )}

          {/* Aviso de fin de semana / feriado */}
          {aviso && !tieneConflicto && !tieneWarning && (
            <>
              <span style={{ color: '#64748b' }}>|</span>
              <span style={{ color: '#fbbf24', fontSize: '10px' }}>
                {aviso.tipo === 'finde' && '📅 Fin de semana'}
                {aviso.tipo === 'feriado' && '🎉 Feriado'}
              </span>
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