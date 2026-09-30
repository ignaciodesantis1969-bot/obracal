// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES VISUALES
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_FLECHA = '#64748b';
const COLOR_FLECHA_ACTIVA = '#f59e0b';

const GROSOR = 1.2;
const GROSOR_ACTIVA = 1.8;

const GAP_CODO = 8;        // distancia horizontal del codo al borde de salida
const RADIO_CODO = 5;      // radio de las esquinas redondeadas
const OFFSET_LLEGADA = 10; // offset horizontal de la llegada respecto al borde de la barra destino

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE PATHS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el path SVG para una flecha según su tipo de dependencia.
 *
 * En los 4 tipos la flecha SIEMPRE baja y aterriza sobre el borde SUPERIOR
 * de la barra destino (la punta apunta hacia abajo).
 *
 * - FS: sale del borde der. de pred, llega cerca del borde izq. de suc
 * - SS: sale del borde izq. de pred, llega cerca del borde izq. de suc
 * - FF: sale del borde der. de pred, llega cerca del borde der. de suc
 * - SF: sale del borde izq. de pred, llega cerca del borde der. de suc
 */
function construirPath(flecha) {
  const { x1, y1, x2, y2, tipo, xDestinoBordeIzq, xDestinoBordeDer } = flecha;

  // ─── Punto de llegada: borde superior de la barra destino ─────────────
  // yTopDestino = y2 - alturaBarra/2. Como no tenemos la altura exacta acá,
  // usamos y2 - 7 (aprox la mitad de la altura visual de la barra).
  const yTopDestino = y2 - 7;

  // Posición horizontal de la punta de flecha:
  //   FS / SS → cerca del borde IZQUIERDO de la barra destino
  //   FF / SF → cerca del borde DERECHO de la barra destino
  const esEntradaPorIzquierda = (tipo === 'FS' || tipo === 'SS' || !tipo);
  const xLlegada = esEntradaPorIzquierda
    ? (xDestinoBordeIzq ?? x2) + OFFSET_LLEGADA
    : (xDestinoBordeDer ?? x2) - OFFSET_LLEGADA;

  // ─── Dirección del codo ────────────────────────────────────────────────
  // FS / FF → codo a la DERECHA del origen
  // SS / SF → codo a la IZQUIERDA del origen
  const haciaDerecha = (tipo === 'FS' || tipo === 'FF' || !tipo);
  const xCodo = haciaDerecha ? x1 + GAP_CODO : x1 - GAP_CODO;

  // ─── Caso especial: misma fila (y1 ≈ y2) ──────────────────────────────
  // Línea horizontal recta (raro, pero puede pasar).
  if (Math.abs(y1 - y2) < 0.5) {
    return `M ${x1} ${y1} L ${xLlegada} ${y1}`;
  }

  // ─── Geometría del codo ───────────────────────────────────────────────
  const tramoHorizontal = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(yTopDestino - y1);
  const r = Math.min(RADIO_CODO, tramoHorizontal, tramoVertical / 2);

  const dirY = yTopDestino > y1 ? 1 : -1;   // baja (+1) o sube (-1)
  const dirXCodoSalida = haciaDerecha ? 1 : -1;

  // ─── Path ─────────────────────────────────────────────────────────────
  // M x1 y1                          → sale del borde de la pred
  // L (xCodo - r*dir) y1             → tramo horizontal corto
  // Q xCodo y1, xCodo (y1 + r*dirY)  → curva superior
  // L xCodo yTopDestino              → baja vertical hasta el borde sup. del destino
  // L xLlegada yTopDestino           → tramo horizontal final (hacia el offset de llegada)
  // L xLlegada y2                    → BAJA un poquito más para "clavar" la flecha
  const path = [
    `M ${x1} ${y1}`,
    `L ${xCodo - r * dirXCodoSalida} ${y1}`,
    `Q ${xCodo} ${y1} ${xCodo} ${y1 + r * dirY}`,
    `L ${xCodo} ${yTopDestino}`,
    `L ${xLlegada} ${yTopDestino}`,
    `L ${xLlegada} ${y2}`,
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