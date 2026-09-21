// src/components/planificacion/proyectos/detalle/gantt/GanttFlechas.jsx
import React, { useMemo } from 'react';

const COLOR_FLECHA = '#64748b';
const COLOR_FLECHA_ACTIVA = '#f59e0b';
const GROSOR = 1.5;
const GROSOR_ACTIVA = 2.5;

const TRAMO_SALIDA = 10;
const TRAMO_ENTRADA = 6;

export default function GanttFlechas({
  flechas = [],
  anchoTotal = 0,
  altoTotal = 0,
  hoverKey = null,
}) {
  const gruposPorOrigen = useMemo(() => {
    const mapa = new Map();
    flechas.forEach(f => {
      const key = String(f.origenId);
      if (!mapa.has(key)) {
        mapa.set(key, {
          origenId: f.origenId,
          xSalida: f.x1,
          ySalida: f.y1,
          flechas: [],
        });
      }
      mapa.get(key).flechas.push(f);
    });
    return Array.from(mapa.values());
  }, [flechas]);

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

      {gruposPorOrigen.map((grupo) => {
        const xRiel = grupo.xSalida + TRAMO_SALIDA;

        const ysSalida = grupo.flechas.map(f => f.y1);
        const ysLlegada = grupo.flechas.map(f => f.y2);
        const yMax = Math.max(...ysSalida, ...ysLlegada);

        const grupoActivo = hoverKey === String(grupo.origenId)
          || grupo.flechas.some(f => hoverKey === String(f.destinoId));

        const colorRiel = grupoActivo ? COLOR_FLECHA_ACTIVA : COLOR_FLECHA;
        const grosorRiel = grupoActivo ? GROSOR_ACTIVA : GROSOR;

        return (
          <g key={`grupo-${grupo.origenId}`}>
            <path
              d={`M ${grupo.xSalida} ${grupo.ySalida} L ${xRiel} ${grupo.ySalida} L ${xRiel} ${yMax}`}
              fill="none"
              stroke={colorRiel}
              strokeWidth={grosorRiel}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {grupo.flechas.map((flecha) => {
              const flechaActiva = hoverKey === String(flecha.destinoId) || grupoActivo;
              const color = flechaActiva ? COLOR_FLECHA_ACTIVA : COLOR_FLECHA;
              const grosor = flechaActiva ? GROSOR_ACTIVA : GROSOR;

              const xEntrada = flecha.x2 - TRAMO_ENTRADA;
              const yEntrada = flecha.y2;

              const pathCodo = [
                `M ${xRiel} ${yEntrada}`,
                `L ${xEntrada} ${yEntrada}`,
                `L ${flecha.x2} ${yEntrada}`,
              ].join(' ');

              return (
                <path
                  key={flecha.id}
                  d={pathCodo}
                  fill="none"
                  stroke={color}
                  strokeWidth={grosor}
                  markerEnd={flechaActiva ? 'url(#arrowhead-activa)' : 'url(#arrowhead)'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}