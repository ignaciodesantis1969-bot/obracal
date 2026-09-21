// src/components/planificacion/proyectos/detalle/gantt/GanttBarra.jsx
import React, { useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import GanttDragGhost from './GanttDragGhost';
import { sumarDias } from './useGanttCalculos';

const ZONA_RESIZE_PX = 8;

export default function GanttBarra({
  fila,
  alturaFila = 36,
  esHover,
  onHover,
  onLeave,
  onTooltipMove,
  onIniciarDrag,
  dragActivo,
  preview,
  conflicto,
}) {
  if (fila._tipo === 'rubro') {
    return (
      <BarraRubro
        rubro={fila}
        alturaFila={alturaFila}
        onHover={onHover}
        onLeave={onLeave}
      />
    );
  }

  return (
    <BarraTarea
      tarea={fila}
      alturaFila={alturaFila}
      esHover={esHover}
      onHover={onHover}
      onLeave={onLeave}
      onTooltipMove={onTooltipMove}
      onIniciarDrag={onIniciarDrag}
      dragActivo={dragActivo}
      preview={preview}
      conflicto={conflicto}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE RUBRO
// ═══════════════════════════════════════════════════════════════════════════

function BarraRubro({ rubro, alturaFila, onHover, onLeave }) {
  const GROSOR = 4;
  const ALTO_TOPE = 8;
  const COLOR = '#0f172a';

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(`rubro-${rubro.nombre}`)}
      onMouseLeave={() => onLeave?.()}
    >
      <div
        className="absolute"
        style={{
          left: `${rubro._offsetPx}px`,
          top: '50%',
          width: `${rubro._anchoPx}px`,
          height: `${GROSOR}px`,
          backgroundColor: COLOR,
          transform: 'translateY(-50%)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: `-${Math.round(ALTO_TOPE / 4)}px`,
            width: `${GROSOR}px`,
            height: `${ALTO_TOPE}px`,
            backgroundColor: COLOR,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: `-${Math.round(ALTO_TOPE / 4)}px`,
            width: `${GROSOR}px`,
            height: `${ALTO_TOPE}px`,
            backgroundColor: COLOR,
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE TAREA
// ═══════════════════════════════════════════════════════════════════════════

function BarraTarea({
  tarea,
  alturaFila,
  esHover,
  onHover,
  onLeave,
  onTooltipMove,
  onIniciarDrag,
  dragActivo,
  preview,
  conflicto,
}) {
  const porcentajeAvance = Number(tarea.porcentaje_avance) || 0;
  const anchoBarra = Math.max(tarea._anchoPx, 12);

  const esLaQueSeArrastra = dragActivo?.tareaId === tarea.id;
  const previewActual = preview?.tareaId === tarea.id ? preview : null;

  const barraRef = useRef(null);
  const [cursorZona, setCursorZona] = useState(null);

  // 🔑 Fechas nuevas durante el drag (para mostrar en el badge)
  const fechasPreview = useMemo(() => {
    if (!esLaQueSeArrastra || !previewActual || !dragActivo) return null;

    const offsetDias = previewActual.offsetDiasDelta || 0;
    const durDelta = previewActual.duracionDelta || 0;

    if (dragActivo.tipo === 'mover') {
      return {
        inicio: sumarDias(tarea.fecha_inicio, offsetDias),
        fin: sumarDias(tarea.fecha_fin, offsetDias),
        duracion: tarea._duracionDias,
      };
    }

    if (dragActivo.tipo === 'resize-izq') {
      const duracionNueva = Math.max(tarea._duracionDias + durDelta, 1);
      return {
        inicio: sumarDias(tarea.fecha_inicio, offsetDias),
        fin: tarea.fecha_fin,
        duracion: duracionNueva,
      };
    }

    if (dragActivo.tipo === 'resize-der') {
      const duracionNueva = Math.max(tarea._duracionDias + durDelta, 1);
      return {
        inicio: tarea.fecha_inicio,
        fin: sumarDias(tarea.fecha_fin, durDelta),
        duracion: duracionNueva,
      };
    }

    return null;
  }, [esLaQueSeArrastra, previewActual, dragActivo, tarea]);

  // Detectar zona de resize
  const detectarZona = (clientX) => {
    const rect = barraRef.current?.getBoundingClientRect();
    if (!rect) return 'mover';
    const x = clientX - rect.left;
    const ancho = rect.width;

    if (x < ZONA_RESIZE_PX) return 'resize-izq';
    if (x > ancho - ZONA_RESIZE_PX) return 'resize-der';
    return 'mover';
  };

  const handleMouseMoveInterno = (e) => {
    if (esLaQueSeArrastra) return;
    const zona = detectarZona(e.clientX);
    setCursorZona(zona);
    onTooltipMove?.(e, tarea);
  };

  const handleMouseDown = (e) => {
    if (!onIniciarDrag) return;
    const zona = detectarZona(e.clientX);
    onIniciarDrag(e, tarea, zona);
  };

  const cursorClass = esLaQueSeArrastra
    ? 'cursor-grabbing'
    : cursorZona === 'resize-izq' || cursorZona === 'resize-der'
      ? 'cursor-ew-resize'
      : cursorZona === 'mover'
        ? 'cursor-grab'
        : '';

  return (
    <div
      className="relative"
      style={{ height: alturaFila }}
      onMouseEnter={() => onHover?.(tarea.id)}
      onMouseLeave={() => {
        setCursorZona(null);
        onLeave?.();
      }}
      onMouseMove={handleMouseMoveInterno}
    >
      {/* Halo rojo si hay conflicto */}
      {esLaQueSeArrastra && conflicto && (
        <div
          className="absolute rounded ring-4 ring-rose-400 pointer-events-none"
          style={{
            left: `${previewActual?.offsetPx ?? tarea._offsetPx}px`,
            top: '50%',
            width: `${previewActual?.anchoPx ?? anchoBarra}px`,
            height: `${alturaFila * 0.38 + 8}px`,
            transform: 'translateY(-50%)',
            zIndex: 25,
          }}
        />
      )}

      {/* Barra fantasma con badge de fechas */}
      {esLaQueSeArrastra && previewActual && (
        <GanttDragGhost
          preview={previewActual}
          alturaFila={alturaFila}
          tieneConflicto={!!conflicto}
          fechaInicioNueva={fechasPreview?.inicio}
          fechaFinNueva={fechasPreview?.fin}
          duracionNueva={fechasPreview?.duracion}
          tipoDrag={dragActivo?.tipo}
        />
      )}

      {/* Barra real */}
      <div
        ref={barraRef}
        onMouseDown={handleMouseDown}
        className={cn(
          'absolute rounded transition-all',
          cursorClass,
          esHover ? 'shadow-md ring-2 ring-amber-400 z-10' : 'shadow-sm',
          esLaQueSeArrastra && 'opacity-40'
        )}
        style={{
          left: `${tarea._offsetPx}px`,
          top: '50%',
          width: `${anchoBarra}px`,
          height: `${alturaFila * 0.38}px`,
          transform: 'translateY(-50%)',
          border: '2px solid #2563eb',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#bfdbfe',
            zIndex: 0,
          }}
        />

        {porcentajeAvance > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: `${Math.min(porcentajeAvance, 100)}%`,
              backgroundColor: '#2563eb',
              opacity: 0.6,
              zIndex: 1,
            }}
          />
        )}
      </div>

      {/* Burbuja % */}
      {porcentajeAvance > 0 && tarea._anchoPx > 40 && !esLaQueSeArrastra && (
        <div
          className="absolute text-[9px] font-black text-slate-800 bg-white border-2 border-slate-400 rounded-full px-1.5 py-0.5 shadow-sm pointer-events-none"
          style={{
            left: `${tarea._offsetPx + anchoBarra + 6}px`,
            top: '50%',
            transform: 'translateY(-50%)',
            minWidth: '28px',
            textAlign: 'center',
            zIndex: 2,
          }}
        >
          {Math.round(porcentajeAvance)}%
        </div>
      )}
    </div>
  );
}