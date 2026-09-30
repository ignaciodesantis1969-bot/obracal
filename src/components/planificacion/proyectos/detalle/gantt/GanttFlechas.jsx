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
const RADIO_CODO = 6;       // radio de las 2 curvas 90° (idénticas)
const ALTO_BARRA = 14;      // alto visual de la barra (alturaFila * 0.38 ≈ 14)
const BAJON_FINAL = 4;      // mini tramo vertical final para que la punta apunte ↓

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE PATHS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el path SVG para una flecha según su tipo de dependencia.
 *
 * Reglas:
 *  - Todas las flechas tienen 2 curvas 90° redondeadas (idénticas).
 *  - Todas terminan con un mini tramo vertical hacia abajo (4px)
 *    para que la punta apunte SIEMPRE hacia ABAJO.
 *  - Todas aterrizan sobre el BORDE SUPERIOR de la barra destino.
 *  - Solo cambia el eje horizontal de llegada:
 *      FS → borde izq. de suc + GAP
 *      SS → borde izq. de suc + GAP
 *      FF → borde der. de suc - GAP
 *      SF → borde der. de suc - GAP
 */
function construirPath(flecha) {
  const { x1, y1, tipo, xDestinoBordeIzq, xDestinoBordeDer, y2 } = flecha;

  const esFS = (tipo === 'FS' || !tipo);
  const esSS = (tipo === 'SS');
  const esFF = (tipo === 'FF');
  const esSF = (tipo === 'SF');

  // ¿Sale hacia la derecha del origen?
  const haciaDerecha = esFS || esFF;

  // ─── Punto de llegada horizontal (xLlegada) ──────────────────────────
  // FS/SS → cerca del borde izquierdo del destino
  // FF/SF → cerca del borde derecho del destino
  const entraPorIzquierda = esFS || esSS;
  const xLlegada = entraPorIzquierda
    ? (xDestinoBordeIzq ?? 0) + GAP_CODO
    : (xDestinoBordeDer ?? 0) - GAP_CODO;

  // ─── Punto de llegada vertical (yLlegada) ────────────────────────────
  // El codo tiene que terminar arriba del borde superior de la barra,
  // y después el mini-bajón final toca el borde.
  // borde superior de la barra = y2 - ALTO_BARRA/2
  const yBordeSuperior = y2 - (ALTO_BARRA / 2);
  const yLlegadaCodo = yBordeSuperior - BAJON_FINAL;   // donde termina el codo
  const yLlegadaFinal = yBordeSuperior;                // donde termina la punta

  // ─── Posición del codo ────────────────────────────────────────────────
  const xCodo = haciaDerecha ? x1 + GAP_CODO : x1 - GAP_CODO;

  // ─── Caso especial: misma fila (y1 ≈ y2) → línea horizontal recta ─────
  if (Math.abs(y1 - y2) < 0.5) {
    return `M ${x1} ${y1} L ${xLlegada} ${yLlegadaFinal}`;
  }

  // ─── Geometría del codo ───────────────────────────────────────────────
  const tramoHorizontal1 = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(yLlegadaCodo - y1);
  const tramoHorizontal2 = Math.abs(xLlegada - xCodo);

  const r = Math.max(
    2,
    Math.min(RADIO_CODO, tramoHorizontal1, tramoVertical / 2, tramoHorizontal2)
  );

  const dirY = yLlegadaCodo > y1 ? 1 : -1;
  const dirXCodoSalida = haciaDerecha ? 1 : -1;
  const dirXLlegada = xLlegada > xCodo ? 1 : -1;

  // ─── Path final ────────────────────────────────────────────────────────
  //  M  x1 y1                                      → sale del borde de la pred
  //  L  (xCodo - r*dir1) y1                        → tramo horizontal corto
  //  Q  xCodo y1, xCodo (y1 + r*dirY)              → PRIMERA curva 90°
  //  L  xCodo (yLlegadaCodo - r*dirY)              → tramo vertical
  //  Q  xCodo yLlegadaCodo, (xCodo + r*dir2) yLlegadaCodo → SEGUNDA curva 90°
  //  L  xLlegada yLlegadaCodo                      → tramo horizontal final
  //  L  xLlegada yLlegadaFinal                     → mini-bajón (punta ↓)
  const path = [
    `M ${x1} ${y1}`,
    `L ${xCodo - r * dirXCodoSalida} ${y1}`,
    `Q ${xCodo} ${y1} ${xCodo} ${y1 + r * dirY}`,
    `L ${xCodo} ${yLlegadaCodo - r * dirY}`,
    `Q ${xCodo} ${yLlegadaCodo} ${xCodo + r * dirXLlegada} ${yLlegadaCodo}`,
    `L ${xLlegada} ${yLlegadaCodo}`,
    `L ${xLlegada} ${yLlegadaFinal}`,
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