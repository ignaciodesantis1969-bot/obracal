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
const RADIO_CODO = 6;       // radio de las curvas 90°
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

  // ─── Caso especial: misma fila (y1 ≈ y2) → línea horizontal recta ─────
  if (Math.abs(y1 - y2) < 0.5) {
    const xLlegadaSimple = haciaDerecha
      ? (xDestinoBordeDer ?? 0)
      : (xDestinoBordeIzq ?? 0);
    return `M ${x1} ${y1} L ${xLlegadaSimple} ${y1}`;
  }

  // ═════════════════════════════════════════════════════════════════════
  // PATRÓN A: FS (Fin → Inicio) — 1 sola curva, punta ↓ sobre el borde sup.
  // ═════════════════════════════════════════════════════════════════════
  if (esFS) {
    // Sale del borde derecho de la pred
    // Codo a la derecha
    const xCodo = x1 + GAP_CODO;

    // La punta aterriza sobre el borde SUPERIOR de la barra destino,
    // ligeramente a la derecha del borde izquierdo del destino.
    const xLlegada = (xDestinoBordeIzq ?? 0) + GAP_CODO;
    const yBordeSuperior = y2 - (ALTO_BARRA / 2);

    // Geometría
    const tramoHorizontal = Math.abs(xCodo - x1);
    const tramoVertical = Math.abs(yBordeSuperior - y1);
    const r = Math.max(2, Math.min(RADIO_CODO, tramoHorizontal, tramoVertical / 2));

    const dirY = yBordeSuperior > y1 ? 1 : -1;

    // Path:
    //  M x1 y1
    //  L (xCodo - r) y1                 → tramo horizontal corto
    //  Q xCodo y1, xCodo (y1 + r*dirY)  → ÚNICA curva 90° arriba
    //  L xCodo yBordeSuperior           → baja vertical hasta el borde superior
    //  L xLlegada yBordeSuperior        → tramo horizontal final (hacia el destino)
    //  → la punta apunta a la derecha (último tramo horizontal).
    //    Para que apunte HACIA ABAJO, hacemos que el último tramo sea
    //    un mini-bajón vertical en xLlegada:
    //  ↓ (reemplazamos el último L por un tramo horizontal + mini-bajón)

    // Mejor: bajamos recto desde xCodo hasta yBordeSuperior, y ahí hacemos
    // un tramo horizontal corto hasta xLlegada. Pero como queremos punta ↓,
    // el último tramo debe ser vertical. Entonces:
    //  - bajamos hasta yBordeSuperior con codo en xLlegada directamente.
    // Es decir: el codo va en x = xLlegada (no en x1+GAP_CODO).
    // Ajustamos: usamos xLlegada como xCodo real.

    // Simplificamos: el codo vertical va en xLlegada.
    const xCodoReal = xLlegada;
    const tramoH1 = Math.abs(xCodoReal - x1);
    const rReal = Math.max(2, Math.min(RADIO_CODO, tramoH1, tramoVertical / 2));
    const dirXCodo = xCodoReal > x1 ? 1 : -1;

    const path = [
      `M ${x1} ${y1}`,
      `L ${xCodoReal - rReal * dirXCodo} ${y1}`,
      `Q ${xCodoReal} ${y1} ${xCodoReal} ${y1 + rReal * dirY}`,
      `L ${xCodoReal} ${yBordeSuperior}`,
    ].join(' ');

    return path;
  }

  // ═════════════════════════════════════════════════════════════════════
  // PATRÓN B: SS / FF / SF — 2 curvas 90° (arriba y abajo), punta lateral.
  // ═════════════════════════════════════════════════════════════════════

  // Punto de llegada horizontal:
  //   SS → borde izquierdo de la suc
  //   FF → borde derecho de la suc
  //   SF → borde derecho de la suc
  let xLlegada;
  if (esSS) {
    xLlegada = (xDestinoBordeIzq ?? 0);
  } else {
    // FF y SF → borde derecho
    xLlegada = (xDestinoBordeDer ?? 0);
  }
  const yLlegada = y2;

  // Posición del codo
  const xCodo = haciaDerecha ? x1 + GAP_CODO : x1 - GAP_CODO;

  // Geometría
  const tramoHorizontal1 = Math.abs(xCodo - x1);
  const tramoVertical = Math.abs(yLlegada - y1);
  const tramoHorizontal2 = Math.abs(xLlegada - xCodo);
  const r = Math.max(2, Math.min(RADIO_CODO, tramoHorizontal1, tramoVertical / 2, tramoHorizontal2));

  const dirY = yLlegada > y1 ? 1 : -1;
  const dirXCodoSalida = haciaDerecha ? 1 : -1;
  const dirXLlegada = xLlegada > xCodo ? 1 : -1;

  // Path con 2 curvas
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