// src/components/planificacion/proyectos/detalle/gantt/useGanttDrag.js
import { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  diasEntre,
  sumarDias,
  isoADate,
  dateAIso,
} from './useGanttCalculos';
import {
  calcularFechaFin,
  calcularDuracionInclusiva,
  getFeriadosDelAnio,
  ajustarADiaHabil,
  esFinDeSemana,
  esFeriado,
  obtenerIdsPredecesoras,
  normalizarPredecesoras,
} from '@/lib/planificacionHelpers';

/**
 * Hook que maneja la lógica del drag de barras del Gantt.
 *
 * 🔑 FIX (esta versión):
 *  - Se eliminó la cascada manual de dependencias (ahora lo hace
 *    `recalcularFechasDelPlan` en `guardarCambios` desde GanttTab).
 *  - El conflicto de predecesoras ahora es WARNING (permite el drag).
 *  - 🔑 OFF-BY-ONE corregido en los 3 `calcularFechaFin`.
 *  - 🔑 NUEVO: si al soltar la tarea viola una dependencia (fecha_inicio < mínimo
 *    válido según preds FS/SS), el movimiento NO se aplica y se muestra un toast.
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
  const conflicto = useMemo(() => {
    if (!preview || !filas.length) return null;
    const tarea = filas.find(f => f.id === preview.tareaId);
    if (!tarea || tarea._tipo !== 'tarea') return null;

    if (preview.duracionDelta < 0 && (tarea._duracionDias + preview.duracionDelta) < 1) {
      return {
        tipo: 'duracion',
        blocking: true,
        mensaje: 'La duración mínima es 1 día',
      };
    }

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
          blocking: false,
          mensaje: `Advertencia: empieza antes del fin de "${predNombreMax}" (${fechaFinMaxPreds})`,
        };
      }
    }

    return null;
  }, [preview, filas]);

  const conflictoBloqueante = useMemo(() => {
    if (!conflicto) return null;
    return conflicto.blocking ? conflicto : null;
  }, [conflicto]);

  const conflictoWarning = useMemo(() => {
    if (!conflicto) return null;
    return !conflicto.blocking ? conflicto : null;
  }, [conflicto]);

  // ─── Validación de movimiento contra preds (al soltar) ────────────────
  // 🔑 Devuelve { ok: true } si la nueva fecha de inicio respeta todas las preds,
  // o { ok: false, mensaje } con el detalle de la violación.
  const validarMovimientoContraPreds = useCallback((tarea, nuevaFechaInicio) => {
    const preds = normalizarPredecesoras(tarea.predecesoras)
      .filter(p => filas.some(f => String(f.id) === String(p.tarea_id)));

    if (preds.length === 0) return { ok: true };

    let minimo = null;
    let predBloqueante = null;
    let fechaPredBloqueante = null;

    preds.forEach(pred => {
      const predTarea = filas.find(f => String(f.id) === String(pred.tarea_id));
      if (!predTarea || !predTarea.fecha_inicio || !predTarea.fecha_fin) return;

      const lag = Number(pred.lag) || 0;
      const tipo = pred.tipo || 'FS';

      let candidato = null;
      if (tipo === 'FS') {
        candidato = sumarDiasHabilesLocal(predTarea.fecha_fin, 1 + lag, feriadosSet);
      } else if (tipo === 'SS') {
        candidato = sumarDiasHabilesLocal(predTarea.fecha_inicio, lag, feriadosSet);
      }
      // FF y SF no restringen la fecha de INICIO directamente, se omiten acá.

      if (candidato && (!minimo || candidato > minimo)) {
        minimo = candidato;
        predBloqueante = predTarea.tarea_nombre;
        fechaPredBloqueante = predTarea.fecha_fin;
      }
    });

    if (minimo && nuevaFechaInicio < minimo) {
      return {
        ok: false,
        mensaje: `No se puede mover antes del ${minimo} — depende de "${predBloqueante}" (fin ${fechaPredBloqueante})`,
      };
    }
    return { ok: true };
  }, [filas, feriadosSet]);

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

    if (conflictoBloqueante) {
      console.warn('[useGanttDrag] Drag bloqueado por conflicto:', conflictoBloqueante.mensaje);
      toast.error(conflictoBloqueante.mensaje, { duration: 4000 });
      return;
    }

    const tarea = filas.find(f => f.id === drag.tareaId);
    if (!tarea) return;

    const duracionHabiles = Number(tarea.duracion_real_dias) || 0;
    const duracionBase = duracionHabiles > 0
      ? duracionHabiles
      : Math.max(calcularDuracionInclusiva(tarea.fecha_inicio, tarea.fecha_fin), 1);

    // 🔑 Calcular la fecha de inicio propuesta (con snap a día hábil)
    let fechaInicioFinal = null;
    if (drag.tipo === 'mover' || drag.tipo === 'resize-izq') {
      const fechaInicioPropuesta = sumarDias(drag.fechaInicio0, prev.offsetDiasDelta);
      fechaInicioFinal = ajustarADiaHabil(fechaInicioPropuesta, feriadosSet);

      // 🔑 VALIDACIÓN: si mueve hacia atrás y viola una pred, no aplicar.
      if (drag.tipo === 'mover') {
        const validacion = validarMovimientoContraPreds(tarea, fechaInicioFinal);
        if (!validacion.ok) {
          toast.error(validacion.mensaje, { duration: 4000 });
          return; // ❌ no se aplica el movimiento
        }
      } else if (drag.tipo === 'resize-izq') {
        // En resize-izq también validamos: si el inicio se mueve antes del mínimo, bloquear.
        const validacion = validarMovimientoContraPreds(tarea, fechaInicioFinal);
        if (!validacion.ok) {
          toast.error(validacion.mensaje, { duration: 4000 });
          return;
        }
      }
    }

    const cambios = [];

    if (drag.tipo === 'mover') {
      const fechaFinFinal = calcularFechaFin(
        fechaInicioFinal,
        Math.max(0, duracionBase - 1),
        feriadosSet
      );

      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-izq') {
      const nuevaDuracion = Math.max(duracionBase + prev.duracionDelta, 1);
      const fechaFinFinal = calcularFechaFin(
        fechaInicioFinal,
        Math.max(0, nuevaDuracion - 1),
        feriadosSet
      );

      cambios.push({
        tareaId: tarea.id,
        fecha_inicio: fechaInicioFinal,
        fecha_fin: fechaFinFinal,
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    } else if (drag.tipo === 'resize-der') {
      const nuevaDuracion = Math.max(duracionBase + prev.duracionDelta, 1);
      const fechaFinFinal = calcularFechaFin(
        tarea.fecha_inicio,
        Math.max(0, nuevaDuracion - 1),
        feriadosSet
      );

      cambios.push({
        tareaId: tarea.id,
        fecha_fin: fechaFinFinal,
        duracion_real_dias: nuevaDuracion,
        fecha_manual: true,
      });
    }

    if (typeof guardarCambios === 'function' && cambios.length > 0) {
      try {
        await guardarCambios(cambios);
      } catch (err) {
        console.error('[useGanttDrag] Error al guardar:', err);
      }
    }
  }, [dragActivo, preview, conflictoBloqueante, filas, guardarCambios, feriadosSet, validarMovimientoContraPreds]);

  const cancelarDrag = useCallback(() => {
    setDragActivo(null);
    setPreview(null);
    setAviso(null);
  }, []);

  return {
    dragActivo,
    preview,
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

// ─── Helper local: suma N días hábiles ────────────────────────────────
function sumarDiasHabilesLocal(fechaIso, n, feriadosSet) {
  if (!fechaIso) return fechaIso;
  if (n === 0) return fechaIso;

  const fecha = new Date(fechaIso + 'T00:00:00');
  const step = n > 0 ? 1 : -1;
  let contados = 0;
  let iteraciones = 0;
  const objetivo = Math.abs(n);
  const MAX = 3650;

  const esHabil = (d) => {
    const dia = d.getDay();
    if (dia === 0 || dia === 6) return false;
    const iso = d.toISOString().slice(0, 10);
    if (feriadosSet && feriadosSet.has(iso)) return false;
    return true;
  };

  while (contados < objetivo && iteraciones < MAX) {
    fecha.setDate(fecha.getDate() + step);
    if (esHabil(fecha)) contados++;
    iteraciones++;
  }

  return fecha.toISOString().slice(0, 10);
}