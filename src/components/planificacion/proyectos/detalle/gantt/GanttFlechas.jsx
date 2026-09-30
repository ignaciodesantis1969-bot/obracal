// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES VISUALES (estilo MS Project)
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_FLECHA = '#64748b';
const COLOR_FLECHA_ACTIVA = '#f59e0b';

const GROSOR = 1.2;
const GROSOR_ACTIVA = 1.8;

const GAP_CODO = 8;
const RADIO_CODO = 5;
const TRAMO_ENTRADA = 5;

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE PATHS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el path SVG para una flecha según su tipo de dependencia.
 *
 * Tipos:
 *  - FS: Fin → Inicio   (sale del der. de la pred, entra al izq. de la suc)
 *  - SS: Inicio → Inicio (sale del izq. de la pred, entra al izq. de la suc)
 *  - FF: Fin → Fin       (sale del der. de la pred, entra al der. de la suc)
 *  - SF: Inicio → Fin    (sale del izq. de la pred, entra al der. de la suc)
 */
function construirPath(flecha) {
  const { x1, y1, x2, y2, tipo } = flecha;

  // ─── Caso 1: misma fila (y1 == y2) → línea recta horizontal ───────────
  if (Math.abs(y1 - y2) < 0.5) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // ─── Caso 2: codo en L invertida con esquinas redondeadas ─────────────
  const haciaDerecha = (tipo === 'FS' || tipo === 'FF' || !tipo);
  const entraPorIzquierda = (tipo === 'FS' || tipo === 'SS' || !tipo);

  const xEntrada = entraPorIzquierda ? x2 - TRAMO_ENTRADA : x2 + TRAMO_ENTRADA;

  // 🔑 FIX: calcular xCodo limitando para que no se pase del borde de entrada
  // del destino. Sin esto, en FS el codo puede quedar a la derecha del borde
  // izquierdo de la sucesora y la flecha "retrocede" mal.
  let xCodo;
  if (haciaDerecha) {
    // Codo a la derecha del origen, pero siempre a la izquierda del punto de entrada
    xCodo = Math.min(x1 + GAP_CODO, xEntrada - GAP_CODO);
    // Si el origen está muy pegado al destino, dejar al menos un mínimo
    if (xCodo < x1) xCodo = x1 + 1;
  } else {
    // Codo a la izquierda del origen, pero siempre a la derecha del punto de entrada
    xCodo = Math.max(x1 - GAP_CODO, xEntrada + GAP_CODO);
    if (xCodo > x1) xCodo = x1 - 1;
  }

  // Radio efectivo (no más grande que los tramos disponibles)
  const tramoHorizontal1 = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(y2 - y1);
  const tramoHorizontal2 = Math.abs(xEntrada - xCodo);
  const r = Math.min(RADIO_CODO, tramoHorizontal1, tramoVertical / 2, tramoHorizontal2);

  // Direcciones
  const dirY = y2 > y1 ? 1 : -1;
  const dirXEntrada = entraPorIzquierda ? 1 : -1;
  const dirXCodoSalida = haciaDerecha ? 1 : -1;

  const path = [
    `M ${x1} ${y1}`,
    `L ${xCodo - r * dirXCodoSalida} ${y1}`,
    `Q ${xCodo} ${y1} ${xCodo} ${y1 + r * dirY}`,
    `L ${xCodo} ${y2 - r * dirY}`,
    `Q ${xCodo} ${y2} ${xCodo + r * dirXEntrada} ${y2}`,
    `L ${x2} ${y2}`,
  ].join(' ');

  return path;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

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
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR_FLECHA} />
        </marker>

        <marker
          id="arrowhead-activa"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={COLOR_FLECHA_ACTIVA} />
        </marker>
      </defs>

      {flechas.map((flecha) => {
        const flechaActiva =
          hoverKey === String(flecha.destinoId) ||
          hoverKey === String(flecha.origenId);

        const color = flechaActiva ? COLOR_FLECHA_ACTIVA : COLOR_FLECHA;
        const grosor = flechaActiva ? GROSOR_ACTIVA : GROSOR;

        const path = construirPath(flecha);

        return (
          <path
            key={flecha.id}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={grosor}
            markerEnd={flechaActiva ? 'url(#arrowhead-activa)' : 'url(#arrowhead)'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}