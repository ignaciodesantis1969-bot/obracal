// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React from 'react';

const COLOR_FLECHA = '#64748b';       // slate-500
const COLOR_FLECHA_ACTIVA = '#f59e0b'; // amber-500
const GROSOR = 1.5;
const MARGEN_CODO = 12;

/**
 * Dibuja las flechas de dependencia entre tareas del Gantt.
 * Estilo MS Project (líneas ortogonales con codos).
 * 
 * Props:
 *   - flechas: array de { id, tipo, x1, y1, x2, y2 }
 *   - anchoTotal: ancho del contenedor SVG
 *   - altoTotal: alto del contenedor SVG
 *   - hoverKey: id de la tarea en hover (para resaltar sus flechas)
 */
export default function GanttFlechas({
  flechas = [],
  anchoTotal = 0,
  altoTotal = 0,
  hoverKey = null,
}) {
  if (!flechas.length || anchoTotal <= 0 || altoTotal <= 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${anchoTotal}px`,
        height: `${altoTotal}px`,
        pointerEvents: 'none',
        zIndex: 15,   // 🔑 por encima de las filas de fondo (rubros), debajo del sidebar sticky
        overflow: 'visible',
      }}
    >
      {/* Definición del marcador de punta de flecha */}
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR_FLECHA} />
        </marker>
        <marker
          id="arrowhead-activa"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR_FLECHA_ACTIVA} />
        </marker>
      </defs>

      {flechas.map((flecha) => {
        const esActiva = hoverKey === flecha.origenId || hoverKey === flecha.destinoId;
        const color = esActiva ? COLOR_FLECHA_ACTIVA : COLOR_FLECHA;
        const grosor = esActiva ? 2 : GROSOR;

        const pathD = construirPath(flecha);
        if (!pathD) return null;

        return (
          <path
            key={flecha.id}
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={grosor}
            markerEnd={esActiva ? 'url(#arrowhead-activa)' : 'url(#arrowhead)'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL PATH SEGÚN TIPO DE DEPENDENCIA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el atributo `d` del path SVG para una flecha.
 * Estilo MS Project: líneas ortogonales con codos.
 */
function construirPath(flecha) {
  const { x1, y1, x2, y2, tipo } = flecha;

  // Si están en la misma fila → línea recta
  if (Math.abs(y1 - y2) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // Y mid: punto medio entre las dos filas
  const yMid = (y1 + y2) / 2;

  // FS (Finish-to-Start): sale del fin de A, entra al inicio de B
  if (tipo === 'FS' || !tipo) {
    // Si B empieza después de que A termina → codo normal
    // Si B empieza antes → codo hacia atrás
    if (x2 >= x1) {
      // Codo normal: A fin → medio → x2 → B inicio
      return [
        `M ${x1} ${y1}`,
        `L ${x1 + MARGEN_CODO} ${y1}`,
        `L ${x1 + MARGEN_CODO} ${yMid}`,
        `L ${x2 - MARGEN_CODO} ${yMid}`,
        `L ${x2 - MARGEN_CODO} ${y2}`,
        `L ${x2} ${y2}`,
      ].join(' ');
    } else {
      // Codo hacia atrás (backwards): B empieza antes del fin de A
      return [
        `M ${x1} ${y1}`,
        `L ${x1 + MARGEN_CODO} ${y1}`,
        `L ${x1 + MARGEN_CODO} ${yMid}`,
        `L ${x2 - MARGEN_CODO} ${yMid}`,
        `L ${x2 - MARGEN_CODO} ${y2}`,
        `L ${x2} ${y2}`,
      ].join(' ');
    }
  }

  // SS (Start-to-Start): sale del inicio de A, entra al inicio de B
  if (tipo === 'SS') {
    return [
      `M ${x1} ${y1}`,
      `L ${x1 - MARGEN_CODO} ${y1}`,
      `L ${x1 - MARGEN_CODO} ${yMid}`,
      `L ${x2 - MARGEN_CODO} ${yMid}`,
      `L ${x2 - MARGEN_CODO} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  }

  // FF (Finish-to-Finish): sale del fin de A, entra al fin de B
  if (tipo === 'FF') {
    return [
      `M ${x1} ${y1}`,
      `L ${x1 + MARGEN_CODO} ${y1}`,
      `L ${x1 + MARGEN_CODO} ${yMid}`,
      `L ${x2 + MARGEN_CODO} ${yMid}`,
      `L ${x2 + MARGEN_CODO} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  }

  // SF (Start-to-Finish): sale del inicio de A, entra al fin de B
  if (tipo === 'SF') {
    return [
      `M ${x1} ${y1}`,
      `L ${x1 - MARGEN_CODO} ${y1}`,
      `L ${x1 - MARGEN_CODO} ${yMid}`,
      `L ${x2 + MARGEN_CODO} ${yMid}`,
      `L ${x2 + MARGEN_CODO} ${y2}`,
      `L ${x2} ${y2}`,
    ].join(' ');
  }

  // Fallback: línea simple
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}