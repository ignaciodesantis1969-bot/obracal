// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES VISUALES (estilo MS Project — captura 2)
// ═══════════════════════════════════════════════════════════════════════════

const COLOR_FLECHA = '#64748b';
const COLOR_FLECHA_ACTIVA = '#f59e0b';

const GROSOR = 1.2;              // trazo fino, estilo captura 2
const GROSOR_ACTIVA = 1.8;       // cuando está en hover

const GAP_CODO = 8;              // distancia horizontal del codo al borde de la barra
const RADIO_CODO = 5;            // radio de las esquinas redondeadas
const TRAMO_ENTRADA = 5;         // largo del tramo final antes de la punta

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DE PATHS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el path SVG para una flecha según su tipo de dependencia.
 *
 * Tipos:
 *  - FS: Fin → Inicio  (sale del der. de la pred, entra al izq. de la suc)
 *  - SS: Inicio → Inicio (sale del izq. de la pred, entra al izq. de la suc)
 *  - FF: Fin → Fin      (sale del der. de la pred, entra al der. de la suc)
 *  - SF: Inicio → Fin   (sale del izq. de la pred, entra al der. de la suc)
 */
function construirPath(flecha) {
  const { x1, y1, x2, y2, tipo } = flecha;

  // ─── Caso 1: misma fila (y1 == y2) → línea recta horizontal ───────────
  if (Math.abs(y1 - y2) < 2) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  // ─── Caso 2: codo en L invertida con esquinas redondeadas ─────────────
  // Dirección del codo según tipo:
  //   FS / FF → codo a la DERECHA del origen (x codo = x1 + GAP_CODO)
  //   SS / SF → codo a la IZQUIERDA del origen (x codo = x1 - GAP_CODO)
  const haciaDerecha = (tipo === 'FS' || tipo === 'FF' || !tipo);
  const xCodo = haciaDerecha ? x1 + GAP_CODO : x1 - GAP_CODO;

  // Dirección de entrada según tipo:
  //   FS / SS → entra desde la IZQUIERDA del destino (x2 - TRAMO_ENTRADA)
  //   FF / SF → entra desde la DERECHA del destino (x2 + TRAMO_ENTRADA)
  const entraPorIzquierda = (tipo === 'FS' || tipo === 'SS' || !tipo);
  const xEntrada = entraPorIzquierda ? x2 - TRAMO_ENTRADA : x2 + TRAMO_ENTRADA;

  // Radio efectivo (no más grande que los tramos disponibles)
  const tramoHorizontal1 = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(y2 - y1);
  const tramoHorizontal2 = Math.abs(xEntrada - xCodo);
  const r = Math.min(RADIO_CODO, tramoHorizontal1, tramoVertical / 2, tramoHorizontal2);

  // Direcciones
  const dirY = y2 > y1 ? 1 : -1;                    // baja o sube
  const dirXEntrada = entraPorIzquierda ? 1 : -1;   // el tramo final va hacia el destino
  const dirXCodoSalida = haciaDerecha ? 1 : -1;     // el tramo inicial se aleja del origen

  // Construcción del path:
  //  M x1 y1
  //  → L (xCodo - r*signo) y1        (tramo horizontal inicial)
  //  → Q xCodo y1,  xCodo (y1 + r*dirY)   (curva esquina superior)
  //  → L xCodo (y2 - r*dirY)         (tramo vertical)
  //  → Q xCodo y2,  (xCodo + r*signoEntrada) y2   (curva esquina inferior)
  //  → L x2 y2                       (tramo horizontal final, hacia el destino)
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

  // Necesitamos padding para que las flechas que se salen un poco del área
  // se vean igual (overflow visible).
  const PADDING = 20;

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
      viewBox={`${-PADDING} ${-PADDING} ${anchoTotal + PADDING * 2} ${altoTotal + PADDING * 2}`}
    >
      <defs>
        {/* Punta de flecha normal */}
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

        {/* Punta de flecha activa (hover) */}
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