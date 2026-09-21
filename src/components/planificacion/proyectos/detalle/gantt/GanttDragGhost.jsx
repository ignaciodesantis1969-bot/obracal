// src/components/planificacion/proyectos/detalle/gantt/GanttDragGhost.jsx
import React from 'react';

/**
 * Barra fantasma que muestra el preview durante el drag.
 * Se posiciona sobre la fila de la tarea que se está moviendo.
 */
export default function GanttDragGhost({
  preview,
  alturaFila = 36,
  tieneConflicto = false,
}) {
  if (!preview) return null;

  const colorFondo = tieneConflicto ? '#fecaca' : '#bfdbfe'; // rojo si conflicto, celeste si no
  const colorBorde = tieneConflicto ? '#dc2626' : '#2563eb';

  return (
    <div
      className="absolute pointer-events-none rounded transition-none"
      style={{
        left: `${preview.offsetPx}px`,
        top: '50%',
        width: `${preview.anchoPx}px`,
        height: `${alturaFila * 0.38}px`,
        transform: 'translateY(-50%)',
        backgroundColor: colorFondo,
        border: `2px dashed ${colorBorde}`,
        opacity: 0.85,
        zIndex: 30,
      }}
    />
  );
}