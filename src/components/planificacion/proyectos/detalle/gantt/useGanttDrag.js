// src/components/planificacion/proyectos/detalle/gantt/useGanttDrag.js
import { useState, useCallback, useMemo } from 'react';
import {
  diasEntre,
  sumarDias,
  isoADate,
  dateAIso,
} from './useGanttCalculos';
import {
  calcularFechaFin,
  getFeriadosDelAnio,
  ajustarADiaHabil,
  esFinDeSemana,
  esFeriado,
  obtenerIdsPredecesoras,
} from '@/lib/planificacionHelpers';

/**
 * Hook que maneja la lógica del drag de barras del Gantt.
 * Fase 2.3: snap a días hábiles + validación de feriados.
 * Fase 3.1: compatible con estructura nueva de predecesoras.
 * 
 * 🔑 FIX (esta versión): 
 *  - Se eliminó la cascada manual de dependencias (ahora lo hace
 *    `recalcularFechasDelPlan` en `guardarCambios` desde GanttTab).
 *  - El conflicto de predecesoras ahora es WARNING (permite el drag)
 *    en vez de bloquear.
 */
export function useGanttDrag({
  filas = [],
  nivelZoom,
  guardarCambios,
  plan,
  feriadosCustom = [],
}) {
  const [dragActivo, setDragActivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Feriados del año del plan
  const feriadosSet = useMemo(() => {
    const anio = Number((plan?.fecha_inicio || '').slice(0, 4)) || new Date().getFullYear();
    return getFeriadosDelAnio(anio, feriadosCustom);
  }, [plan?.fecha_inicio, feriadosCustom]);

  // ─── Dependencias afectadas ────────────────────────────────────────────
  const dependenciasAfectadas = useMemo(() => {
    if (!preview || !filas.length) return [];
    const tareaMoviendoseId = preview.tareaId;
    return filas.filter((f) => {
      if (f._tipo !== 'tarea') return false;
      const predsIds = obtenerIdsPredecesoras(f.predecesoras);
      return predsIds.some(p => String(p) === String(tareaMoviendoseId));
    });
  }, [preview, filas]);

  // ─── Conflicto actual ──────────────────────────────────────────────────
  // 🔑 FIX: Ahora es solo un AVISO (warning). Permite guardar igual.
  const conflicto = useMemo(() => {
    if (!preview || !filas.length) return null;
    const tarea = filas.find(f => f.id === preview.tareaId);
    if (!tarea || tarea._tipo !== 'tarea') return null;

    // Duración mínima 1 día — este SÍ bloquea (no tiene sentido duración 0)
    if (preview.duracionDelta < 0 && (tarea._duracionDias + preview.duracionDelta) < 1) {
      return {
        tipo: 'duracion',
        blocking: true,
        mensaje: 'La duración mínima es 1 día',
      };
    }

    // Predecesoras — ahora es WARNING, no bloquea
    const predsIds = obtenerIdsPredecesoras(tarea.predecesoras);
    if (predsIds.length > 0) {
      const nuevaFechaInicio = sumarDias(tarea.fecha_inicio, preview.offsetDiasDelta);
      let fechaFinMaxPreds = null;
      let predNombreMax = '';
      for (const predId of predsIds) {
        const pred = filas.find(f => String(f.id) === String(predId));
        if (pred && pred.fecha_fin) {
          if (!fechaFinMaxPreds || pred.fecha_fin > fechaFinMaxPreds) {
            fechaFinMaxPreds = pred.fecha_fin;
            predNombreMax = pred.tarea_nombre || 'predecesora';
          }
        }
      }
      if (fechaFinMaxPreds && nuevaFechaInicio <= fechaFinMaxPreds) {
        return {
          tipo: 'predecesora',
          blocking: false, // 🔑 ya no bloquea
          mensaje: `Advertencia: empieza antes del fin de "${predNombreMax}" (${fechaFinMaxPreds})`,
        };
      }
    }

    return null;
  }, [preview, filas]);

  // 🔑 Separar el conflicto bloqueante (duración < 1 día) del warning
  const conflictoBloqueante = useMemo(() => {
    if (!conflicto) return null;
    return conflicto.blocking ? conflicto : null;
  }, [conflicto]);

  // 🔑 El warning es lo que se muestra en el banner amarillo
  const conflictoWarning = useMemo(() => {
    if (!conflicto) return null;
    return !conflicto.blocking ? conflicto : null;
  }, [conflicto]);

  // ─── Iniciar drag ──────────────────────────────────────────────────────
  const iniciarDrag = useCallback((e, tarea, tipoDrag = 'mover') => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    setDragActivo({
      tareaId: tarea.id,
      tipo: tipoDrag,
      mouseX0: e.clientX,
      offsetPx0: tarea._offsetPx,
      anchoPx0: tarea._anchoPx,
      duracionDias0: tarea._duracionDias,
      fechaInicio0: tarea.fecha_inicio,
      fechaFin0: tarea.fecha_fin,
    });

    setPreview({
      tareaId: tarea.id,
      offsetPx: tarea._offsetPx,
      anchoPx: tarea._anchoPx,
      offsetDiasDelta: 0,
      duracionDelta: 0,
    });

    setAviso(null);
  }, []);

  // ─── Actualizar drag ───────────────────────────────────────────────────
  const actualizarDrag = useCallback((e) => {
    if (!dragActivo) return;

    const deltaX = e.clientX - dragActivo.mouseX0;
    const deltaDias = Math.round(deltaX / nivelZoom.pxPorDia);

    let nuevoOffsetPx = dragActivo.offsetPx0;
    let nuevoAnchoPx = dragActivo.anchoPx0;
    let offsetDiasDelta = 0;
    let duracionDelta = 0;

    if (dragActivo.tipo === 'mover') {
      offsetDiasDelta = deltaDias;
      nuevoOffsetPx = dragActivo.offsetPx0 + deltaDias * nivelZoom.pxPorDia;
    } else if (dragActivo.tipo === 'resize-izq') {
      offsetDiasDelta = deltaDias;
      duracionDelta = -deltaDias;
      nuevoOffsetPx = dragActivo.offsetPx0 + deltaDias * nivelZoom.pxPorDia;
      nuevoAnchoPx = Math.max(
        dragActivo.anchoPx0 - deltaDias * nivelZoom.pxPorDia,
        nivelZoom.pxPorDia
      );
    } else if (dragActivo.tipo === 'resize-der') {
      duracionDelta = deltaDias;
      nuevoAnchoPx = Math.max(
        dragActivo.anchoPx0 + deltaDias * nivelZoom.pxPorDia,
        nivelZoom.pxPorDia
      );
    }

    const fechaInicioPropuesta = sumarDias(dragActivo.fechaInicio0, offsetDiasDelta);

    const caeEnFinde = esFinDeSemana(fechaInicioPropuesta);
    const caeEnFeriado = esFeriado(fechaInicioPropuesta, feriadosSet);

    let avisoTexto = null;
    if (caeEnFinde) {
      avisoTexto = {
        tipo: 'finde',
        mensaje: 'La fecha cae en fin de semana. Se moverá al próximo día hábil.',
      };
    } else if (caeEnFeriado) {
      avisoTexto = {
        tipo: 'feriado',
        mensaje: 'La fecha cae en un feriado. Se moverá al próximo día hábil.',
      };
    }

    setAviso(avisoTexto);

    setPreview({
      tareaId: dragActivo.tareaId,
      offsetPx: nuevoOffsetPx,
      anchoPx: nuevoAnchoPx,
      offsetDiasDelta,
      duracionDelta,
    });
  }, [dragActivo, nivelZoom, feriadosSet]);

  // ─── Terminar drag → GUARDAR con snap ─────────────────────────────────
  const terminarDrag = useCallback(async (e) => {
    const drag = dragActivo;
    const prev = preview;

    setDragActivo(null);
    setPreview(null);
    setAviso(null);

    if (!drag || !prev) return;

    if (prev.offsetDiasDelta === 0 && prev.duracionDelta === 0) return;

    // 🔑 Solo bloquea si hay conflicto BLOQUEANTE (duración < 1 día).
    // Los warnings de predecesoras permiten guardar.
    if (conflictoBloqueante) {
      console.warn('[useGanttDrag] Drag bloqueado por conflicto:', conflictoBloqueante.mensaje);
      return;
    }

    const tarea = filas.find(f => f.id === drag.tareaId);
    if (!tarea) return;

    const cambios = [];

    if (drag.tipo === 'mover') {
      const fechaInicioPropuesta = sumarDias(drag.fechaInicio0, prev.offsetDiasDelta);
      const fechaInicioFinal = ajustarADiaHabil(fechaInicioPropuesta, feriadosSet);
      const fechaFinFinal = calcularFechaFin(
        fechaInicioFinal,
        tarea._duracionDias,
        feriadosSet
      );

      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-izq') {
      const fechaInicioPropuesta = sumarDias(drag.fechaInicio0, prev.offsetDiasDelta);
      const fechaInicioFinal = ajustarADiaHabil(fechaInicioPropuesta, feriadosSet);
      const nuevaDuracion = Math.max(tarea._duracionDias + prev.duracionDelta, 1);

      const fechaFinFinal = calcularFechaFin(fechaInicioFinal, nuevaDuracion, feriadosSet);

      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-der') {
      const nuevaDuracion = Math.max(tarea._duracionDias + prev.duracionDelta, 1);
      const fechaFinFinal = calcularFechaFin(tarea.fecha_inicio, nuevaDuracion, feriadosSet);

      cambios.push({
        tareaId: tarea.id,
        fecha_fin: fechaFinFinal,
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    }

    // 🔑 FIX: se eliminó la cascada manual de dependencias.
    // Ahora `guardarCambios` (en GanttTab) recalcula todas las sucesoras
    // con `recalcularFechasDelPlan`, respetando tipos de dependencia (FS/SS/FF/SF),
    // feriados, y propagando multi-nivel. Evita duplicación y desincronización.

    if (typeof guardarCambios === 'function' && cambios.length > 0) {
      try {
        await guardarCambios(cambios);
      } catch (err) {
        console.error('[useGanttDrag] Error al guardar:', err);
      }
    }
  }, [dragActivo, preview, conflictoBloqueante, filas, guardarCambios, feriadosSet]);

  // ─── Cancelar drag ─────────────────────────────────────────────────────
  const cancelarDrag = useCallback(() => {
    setDragActivo(null);
    setPreview(null);
    setAviso(null);
  }, []);

  return {
    dragActivo,
    preview,
    // 🔑 `conflicto` ahora expone solo el bloqueante (para el banner rojo).
    // Los warnings de predecesoras van por `aviso` (banner amarillo).
    conflicto: conflictoBloqueante,
    conflictoWarning,
    aviso,
    dependenciasAfectadas,
    iniciarDrag,
    actualizarDrag,
    terminarDrag,
    cancelarDrag,
    feriadosSet,
  };
}