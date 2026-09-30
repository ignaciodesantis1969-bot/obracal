// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES VISUALES
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_FLECHA = '#64748b';
const COLOR_FLECHA_ACTIVA = '#f59e0b';

const GROSOR = 1.2;
const GROSOR_ACTIVA = 1.8;

const GAP_CODO = 10;        // distancia horizontal del codo al borde de la barra
const RADIO_CODO = 6;       // radio de las 2 curvas 90°
const ALTO_BARRA = 14;      // alto visual de la barra (alturaFila * 0.38 ≈ 14)

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE PATHS
// ═══════════════════════════════════════════════════════════════════════════

function construirPath(flecha) {
  const { x1, y1, tipo, xDestinoBordeIzq, xDestinoBordeDer, y2 } = flecha;

  const esFS = (tipo === 'FS' || !tipo);
  const esSS = (tipo === 'SS');
  const esFF = (tipo === 'FF');
  const esSF = (tipo === 'SF');

  // ¿Sale hacia la derecha del origen?
  const haciaDerecha = esFS || esFF;

  // ─── Punto de llegada (xLlegada, yLlegada) según tipo ────────────────
  let xLlegada, yLlegada;

  if (esFS) {
    // FS: aterriza sobre el borde SUPERIOR del destino
    xLlegada = (xDestinoBordeIzq ?? 0) + GAP_CODO;
    yLlegada = y2 - (ALTO_BARRA / 2);
  } else if (esSS) {
    // SS: entra por el borde izquierdo del destino
    xLlegada = (xDestinoBordeIzq ?? 0);
    yLlegada = y2;
  } else {
    // FF y SF: entran por el borde derecho del destino
    xLlegada = (xDestinoBordeDer ?? 0);
    yLlegada = y2;
  }

  // ─── Posición del codo ────────────────────────────────────────────────
  const xCodo = haciaDerecha ? x1 + GAP_CODO : x1 - GAP_CODO;

  // ─── Caso especial: misma fila (y1 ≈ y2) → línea horizontal recta ─────
  if (Math.abs(y1 - y2) < 0.5) {
    return `M ${x1} ${y1} L ${xLlegada} ${yLlegada}`;
  }

  // ─── Geometría del codo ───────────────────────────────────────────────
  const tramoHorizontal1 = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(yLlegada - y1);
  const tramoHorizontal2 = Math.abs(xLlegada - xCodo);

  const r = Math.max(2, Math.min(RADIO_CODO, tramoHorizontal1, tramoVertical / 2, tramoHorizontal2));

  const dirY = yLlegada > y1 ? 1 : -1;              // baja (+1) o sube (-1)
  const dirXCodoSalida = haciaDerecha ? 1 : -1;     // el codo se aleja del origen
  const dirXLlegada = xLlegada > xCodo ? 1 : -1;    // el tramo final va hacia el destino

  // ─── Path final con 2 curvas 90° redondeadas ──────────────────────────
  //  M  x1 y1                                    → sale del borde de la pred
  //  L  (xCodo - r*dir1) y1                      → tramo horizontal corto
  //  Q  xCodo y1, xCodo (y1 + r*dirY)            → PRIMERA curva 90°
  //  L  xCodo (yLlegada - r*dirY)                → tramo vertical
  //  Q  xCodo yLlegada, (xCodo + r*dir2) yLlegada → SEGUNDA curva 90°
  //  L  xLlegada yLlegada                        → tramo horizontal final
  const path = [
    `M ${x1} ${y1}`,
    `L ${xCodo - r * dirXCodoSalida} ${y1}`,
    `Q ${xCodo} ${y1} ${xCodo} ${y1 + r * dirY}`,
    `L ${xCodo} ${yLlegada - r * dirY}`,
    `Q ${xCodo} ${yLlegada} ${xCodo + r * dirXLlegada} ${yLlegada}`,
    `L ${xLlegada} ${yLlegada}`,
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