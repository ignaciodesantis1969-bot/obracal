// src/components/planificacion/proyectos/detalle/gantt/useGanttDrag.js
import { useState, useCallback, useMemo } from 'react';
import { diasEntre, sumarDias } from './useGanttCalculos';

/**
 * Hook que maneja la lógica del drag de barras del Gantt.
 * Fase 2.2: detección + preview + guardado en Firestore.
 */
export function useGanttDrag({
  filas = [],
  nivelZoom,
  guardarCambios,   // 🔑 callback async que hace el writeBatch
}) {
  const [dragActivo, setDragActivo] = useState(null);
  const [preview, setPreview] = useState(null);

  // ─── Dependencias afectadas por la tarea que se está moviendo ──────────
  const dependenciasAfectadas = useMemo(() => {
    if (!preview || !filas.length) return [];
    const tareaMoviendoseId = preview.tareaId;
    return filas.filter((f) => {
      if (f._tipo !== 'tarea') return false;
      const preds = Array.isArray(f.predecesoras) ? f.predecesoras : [];
      return preds.some(p => String(p) === String(tareaMoviendoseId));
    });
  }, [preview, filas]);

  // ─── Conflicto actual ──────────────────────────────────────────────────
  const conflicto = useMemo(() => {
    if (!preview || !filas.length) return null;
    const tarea = filas.find(f => f.id === preview.tareaId);
    if (!tarea || tarea._tipo !== 'tarea') return null;

    // Duración mínima 1 día
    if (preview.duracionDelta < 0 && (tarea._duracionDias + preview.duracionDelta) < 1) {
      return {
        tipo: 'duracion',
        mensaje: 'La duración mínima es 1 día',
      };
    }

    // No se puede terminar antes de empezar
    if (preview.duracionDelta < 0 && (tarea._duracionDias + preview.duracionDelta) < 0.5) {
      return {
        tipo: 'duracion',
        mensaje: 'La fecha de fin no puede ser anterior a la de inicio',
      };
    }

    // Predecesoras: la tarea no puede empezar antes del fin de su predecesora
    const preds = Array.isArray(tarea.predecesoras) ? tarea.predecesoras : [];
    if (preds.length > 0) {
      const nuevaFechaInicio = sumarDias(tarea.fecha_inicio, preview.offsetDiasDelta);
      let fechaFinMaxPreds = null;
      for (const predId of preds) {
        const pred = filas.find(f => String(f.id) === String(predId));
        if (pred && pred.fecha_fin) {
          if (!fechaFinMaxPreds || pred.fecha_fin > fechaFinMaxPreds) {
            fechaFinMaxPreds = pred.fecha_fin;
          }
        }
      }
      if (fechaFinMaxPreds && nuevaFechaInicio <= fechaFinMaxPreds) {
        return {
          tipo: 'predecesora',
          mensaje: `No puede empezar antes del ${fechaFinMaxPreds} (fin de su predecesora)`,
        };
      }
    }

    return null;
  }, [preview, filas]);

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
    });

    setPreview({
      tareaId: tarea.id,
      offsetPx: tarea._offsetPx,
      anchoPx: tarea._anchoPx,
      offsetDiasDelta: 0,
      duracionDelta: 0,
    });
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

    setPreview({
      tareaId: dragActivo.tareaId,
      offsetPx: nuevoOffsetPx,
      anchoPx: nuevoAnchoPx,
      offsetDiasDelta,
      duracionDelta,
    });
  }, [dragActivo, nivelZoom]);

  // ─── Terminar drag → GUARDAR ───────────────────────────────────────────
  const terminarDrag = useCallback(async (e) => {
    const drag = dragActivo;
    const prev = preview;

    // Reset estado
    setDragActivo(null);
    setPreview(null);

    if (!drag || !prev) return;

    // Sin cambios → no hacer nada
    if (prev.offsetDiasDelta === 0 && prev.duracionDelta === 0) return;

    // Con conflicto → no guardar
    if (conflicto) return;

    // Calcular datos a guardar
    const tarea = filas.find(f => f.id === drag.tareaId);
    if (!tarea) return;

    // 🔑 Armar lista de cambios para writeBatch
    const cambios = [];

    // 1. La tarea que se movió
    if (drag.tipo === 'mover') {
      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: sumarDias(tarea.fecha_inicio, prev.offsetDiasDelta),
        fecha_fin: sumarDias(tarea.fecha_fin, prev.offsetDiasDelta),
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-izq') {
      const nuevaDuracion = Math.max(tarea._duracionDias + prev.duracionDelta, 1);
      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: sumarDias(tarea.fecha_inicio, prev.offsetDiasDelta),
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-der') {
      const nuevaDuracion = Math.max(tarea._duracionDias + prev.duracionDelta, 1);
      cambios.push({
        tareaId: tarea.id,
        fecha_fin: sumarDias(tarea.fecha_fin, prev.duracionDelta),
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    }

    // 2. Cascada: mover también las dependencias afectadas
    // (solo en modo 'mover', no en resize)
    if (drag.tipo === 'mover' && dependenciasAfectadas.length > 0) {
      dependenciasAfectadas.forEach((dep) => {
        cambios.push({
          tareaId: dep.id,
          fecha_inicio: sumarDias(dep.fecha_inicio, prev.offsetDiasDelta),
          fecha_fin: sumarDias(dep.fecha_fin, prev.offsetDiasDelta),
        });
      });
    }

    // 3. Ejecutar el guardado (writeBatch atómico)
    if (typeof guardarCambios === 'function' && cambios.length > 0) {
      try {
        await guardarCambios(cambios);
      } catch (err) {
        console.error('[useGanttDrag] Error al guardar:', err);
        // El error lo maneja el componente padre con toast
      }
    }
  }, [dragActivo, preview, conflicto, filas, dependenciasAfectadas, guardarCambios]);

  // ─── Cancelar drag ─────────────────────────────────────────────────────
  const cancelarDrag = useCallback(() => {
    setDragActivo(null);
    setPreview(null);
  }, []);

  return {
    dragActivo,
    preview,
    conflicto,
    dependenciasAfectadas,
    iniciarDrag,
    actualizarDrag,
    terminarDrag,
    cancelarDrag,
  };
}