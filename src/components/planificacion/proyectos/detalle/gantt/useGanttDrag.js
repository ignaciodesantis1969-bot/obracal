// src/components/planificacion/proyectos/detalle/gantt/useGanttDrag.js
import { useState, useCallback, useMemo } from 'react';
import { diasEntre, sumarDias } from './useGanttCalculos';

/**
 * Hook que maneja la lógica del drag de barras del Gantt.
 * Fase 2.1: solo detección + preview. Fase 2.2 agregará guardado.
 */
export function useGanttDrag({
  filas = [],
  nivelZoom,
  onGuardar,     // callback para Fase 2.2 (opcional por ahora)
}) {
  // Estado del drag activo
  const [dragActivo, setDragActivo] = useState(null);
  // { tareaId, tipo: 'mover' | 'resize-izq' | 'resize-der', mouseX0, offsetPx0 }

  // Estado del preview
  const [preview, setPreview] = useState(null);
  // { tareaId, offsetPx, anchoPx, offsetDiasDelta, duracionDelta }

  // Detectar dependencias afectadas por mover una tarea
  const dependenciasAfectadas = useMemo(() => {
    if (!preview || !filas.length) return [];
    const tareaMoviendoseId = preview.tareaId;
    // Buscar todas las tareas cuya predecesora incluya la tarea movida
    return filas.filter((f) => {
      if (f._tipo !== 'tarea') return false;
      const preds = Array.isArray(f.predecesoras) ? f.predecesoras : [];
      return preds.some(p => String(p) === String(tareaMoviendoseId));
    });
  }, [preview, filas]);

  // Detectar si hay conflicto con predecesoras de la tarea movida
  const conflicto = useMemo(() => {
    if (!preview || !filas.length) return null;
    const tarea = filas.find(f => f.id === preview.tareaId);
    if (!tarea || tarea._tipo !== 'tarea') return null;

    const preds = Array.isArray(tarea.predecesoras) ? tarea.predecesoras : [];
    if (preds.length === 0) return null;

    // Nueva fecha inicio propuesta
    const nuevaFechaInicio = sumarDias(tarea.fecha_inicio, preview.offsetDiasDelta);

    // Buscar la fecha fin más tardía de las predecesoras
    let fechaFinMaxPreds = null;
    for (const predId of preds) {
      const pred = filas.find(f => String(f.id) === String(predId));
      if (pred && pred.fecha_fin) {
        if (!fechaFinMaxPreds || pred.fecha_fin > fechaFinMaxPreds) {
          fechaFinMaxPreds = pred.fecha_fin;
        }
      }
    }

    if (fechaFinMaxPreds && nuevaFechaInicio < fechaFinMaxPreds) {
      return {
        tipo: 'predecesora',
        mensaje: `La tarea no puede empezar antes del ${fechaFinMaxPreds} (fin de su predecesora)`,
      };
    }

    // Duración mínima 1 día
    if (preview.duracionDelta < 0 && (tarea._duracionDias + preview.duracionDelta) < 1) {
      return {
        tipo: 'duracion',
        mensaje: 'La duración mínima es 1 día',
      };
    }

    return null;
  }, [preview, filas]);

  // Iniciar drag
  const iniciarDrag = useCallback((e, tarea, tipoDrag = 'mover') => {
    // Solo botón izquierdo del mouse
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

  // Actualizar drag (mousemove)
  const actualizarDrag = useCallback((e) => {
    if (!dragActivo) return;

    const deltaX = e.clientX - dragActivo.mouseX0;
    // Convertir píxeles a días según zoom
    const deltaDias = Math.round(deltaX / nivelZoom.pxPorDia);

    let nuevoOffsetPx = dragActivo.offsetPx0;
    let nuevoAnchoPx = dragActivo.anchoPx0;
    let offsetDiasDelta = 0;
    let duracionDelta = 0;

    if (dragActivo.tipo === 'mover') {
      // Mover toda la barra
      offsetDiasDelta = deltaDias;
      nuevoOffsetPx = dragActivo.offsetPx0 + deltaDias * nivelZoom.pxPorDia;
    } else if (dragActivo.tipo === 'resize-izq') {
      // Mover el borde izquierdo (cambia inicio y duración)
      offsetDiasDelta = deltaDias;
      duracionDelta = -deltaDias;
      nuevoOffsetPx = dragActivo.offsetPx0 + deltaDias * nivelZoom.pxPorDia;
      nuevoAnchoPx = Math.max(
        dragActivo.anchoPx0 - deltaDias * nivelZoom.pxPorDia,
        nivelZoom.pxPorDia // mínimo 1 día de ancho
      );
    } else if (dragActivo.tipo === 'resize-der') {
      // Mover el borde derecho (solo cambia duración)
      duracionDelta = deltaDias;
      nuevoAnchoPx = Math.max(
        dragActivo.anchoPx0 + deltaDias * nivelZoom.pxPorDia,
        nivelZoom.pxPorDia // mínimo 1 día
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

  // Terminar drag (mouseup)
  const terminarDrag = useCallback((e) => {
    if (!dragActivo || !preview) {
      setDragActivo(null);
      setPreview(null);
      return;
    }

    // Si no cambió nada → cancelar
    if (preview.offsetDiasDelta === 0 && preview.duracionDelta === 0) {
      setDragActivo(null);
      setPreview(null);
      return;
    }

    // Si hay conflicto → cancelar (no guardar)
    if (conflicto) {
      setDragActivo(null);
      setPreview(null);
      return;
    }

    // Fase 2.2: acá va el guardado en Firestore
    // Por ahora solo cancelamos
    if (typeof onGuardar === 'function') {
      onGuardar({
        tareaId: dragActivo.tareaId,
        offsetDiasDelta: preview.offsetDiasDelta,
        duracionDelta: preview.duracionDelta,
        dependenciasAfectadas,
      });
    }

    setDragActivo(null);
    setPreview(null);
  }, [dragActivo, preview, conflicto, dependenciasAfectadas, onGuardar]);

  // Cancelar drag (tecla Escape)
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