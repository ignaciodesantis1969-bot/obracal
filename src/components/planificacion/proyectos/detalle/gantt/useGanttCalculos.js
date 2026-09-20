// src/components/planificacion/proyectos/detalle/gantt/useGanttCalculos.js
import { useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const NIVELES_ZOOM = {
  dias:   { id: 'dias',   label: 'Días',   pxPorDia: 40,  unidadTicks: 'dia' },
  semanas:{ id: 'semanas',label: 'Semanas',pxPorDia: 10,  unidadTicks: 'semana' },
  meses:  { id: 'meses',  label: 'Meses',  pxPorDia: 3,   unidadTicks: 'mes' },
};

// Colores por estado de tarea
export const COLORES_ESTADO = {
  no_iniciado: { bg: '#94a3b8', border: '#64748b', label: 'No iniciado' },
  en_curso:    { bg: '#3b82f6', border: '#2563eb', label: 'En curso' },
  completada:  { bg: '#10b981', border: '#059669', label: 'Completada' },
  bloqueada:   { bg: '#ef4444', border: '#dc2626', label: 'Bloqueada' },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE FECHA
// ═══════════════════════════════════════════════════════════════════════════

export function isoADate(iso) {
  if (!iso) return null;
  return new Date(iso + 'T00:00:00');
}

export function dateAIso(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diasEntre(isoA, isoB) {
  const a = isoADate(isoA);
  const b = isoADate(isoB);
  if (!a || !b) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function sumarDias(iso, dias) {
  const d = isoADate(iso);
  if (!d) return '';
  d.setDate(d.getDate() + dias);
  return dateAIso(d);
}

export function formatearFechaCorta(iso) {
  if (!iso) return '';
  const d = isoADate(iso);
  if (!d) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

export function formatearFechaLarga(iso) {
  if (!iso) return '';
  const d = isoADate(iso);
  if (!d) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const anio = d.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

const NOMBRES_MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const NOMBRES_DIA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export function nombreMes(mesIdx) {
  return NOMBRES_MES[mesIdx] || '';
}

export function nombreDia(diaIdx) {
  return NOMBRES_DIA[diaIdx] || '';
}

export function esFindeSemana(date) {
  const dia = date.getDay();
  return dia === 0 || dia === 6;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula todas las posiciones y datos del Gantt.
 * 
 * @param {Array} tareas - Array de tareas del plan
 * @param {Object} nivelZoom - { pxPorDia, unidadTicks }
 * @returns {Object} { rango, tareasConPos, ticks, anchoTotal, offsetInicio }
 */
export function useGanttCalculos(tareas = [], nivelZoom) {
  return useMemo(() => {
    // ─── Sin tareas: rango default de 30 días desde hoy ─────────────────
    if (!Array.isArray(tareas) || tareas.length === 0) {
      const hoy = new Date();
      const fin = new Date(hoy);
      fin.setDate(fin.getDate() + 30);
      
      return {
        rango: {
          inicio: dateAIso(hoy),
          fin: dateAIso(fin),
          totalDias: 30,
        },
        tareasConPos: [],
        ticks: generarTicks(dateAIso(hoy), dateAIso(fin), nivelZoom),
        anchoTotal: 30 * nivelZoom.pxPorDia,
        offsetInicio: 0,
      };
    }

    // ─── Rango: min fecha_inicio → max fecha_fin ────────────────────────
    const fechasInicio = tareas
      .map(t => t.fecha_inicio)
      .filter(Boolean);

    const fechasFin = tareas
      .map(t => t.fecha_fin || t.fecha_inicio)
      .filter(Boolean);

    const minIso = fechasInicio.sort()[0];
    const maxIso = fechasFin.sort().reverse()[0];

    // Padding: 3 días antes y 3 después
    const inicioIso = sumarDias(minIso, -3);
    const finIso = sumarDias(maxIso, 3);
    const totalDias = Math.max(diasEntre(inicioIso, finIso), 1);

    // ─── Posición de cada tarea ─────────────────────────────────────────
    const tareasConPos = tareas
      .filter(t => t.fecha_inicio)
      .map((t, idx) => {
        const fechaInicio = t.fecha_inicio;
        const fechaFin = t.fecha_fin || t.fecha_inicio;
        const offsetDias = diasEntre(inicioIso, fechaInicio);
        const duracionDias = Math.max(diasEntre(fechaInicio, fechaFin), 1);

        return {
          ...t,
          _idx: idx,
          _offsetPx: offsetDias * nivelZoom.pxPorDia,
          _anchoPx: Math.max(duracionDias * nivelZoom.pxPorDia, 8), // mínimo 8px para visibilidad
          _offsetDias: offsetDias,
          _duracionDias: duracionDias,
        };
      });

    // Ordenar por fecha de inicio, después por rubro, después por idx
    tareasConPos.sort((a, b) => {
      const fA = a.fecha_inicio || '';
      const fB = b.fecha_inicio || '';
      if (fA !== fB) return fA.localeCompare(fB);
      const rA = Number(a.rubro_idx) || 0;
      const rB = Number(b.rubro_idx) || 0;
      if (rA !== rB) return rA - rB;
      return (Number(a.tarea_idx) || 0) - (Number(b.tarea_idx) || 0);
    });

    // ─── Ticks (marcas del eje temporal) ────────────────────────────────
    const ticks = generarTicks(inicioIso, finIso, nivelZoom);

    return {
      rango: {
        inicio: inicioIso,
        fin: finIso,
        totalDias,
      },
      tareasConPos,
      ticks,
      anchoTotal: totalDias * nivelZoom.pxPorDia,
      offsetInicio: 0,
    };
  }, [tareas, nivelZoom]);
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERADOR DE TICKS
// ═══════════════════════════════════════════════════════════════════════════

function generarTicks(inicioIso, finIso, nivelZoom) {
  const ticks = [];
  const cursor = isoADate(inicioIso);
  const fin = isoADate(finIso);
  if (!cursor || !fin) return ticks;

  const pxPorDia = nivelZoom.pxPorDia;
  let offsetPx = 0;

  // Modo DÍAS: un tick por día
  if (nivelZoom.unidadTicks === 'dia') {
    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const diaSem = nombreDia(cursor.getDay());
      const diaMes = cursor.getDate();
      const mes = cursor.getMonth();

      ticks.push({
        tipo: 'dia',
        iso,
        offsetPx,
        anchoPx: pxPorDia,
        esFinde: esFindeSemana(cursor),
        esInicioMes: diaMes === 1,
        label1: diaSem,
        label2: String(diaMes),
        mesNombre: nombreMes(mes),
        anio: cursor.getFullYear(),
      });

      cursor.setDate(cursor.getDate() + 1);
      offsetPx += pxPorDia;
    }
    return ticks;
  }

  // Modo SEMANAS: un tick por semana (arranca lunes)
  if (nivelZoom.unidadTicks === 'semana') {
    // Ajustar al lunes de la semana
    const diaSem = cursor.getDay();
    const offsetAlLunes = diaSem === 0 ? -6 : (1 - diaSem);
    cursor.setDate(cursor.getDate() + offsetAlLunes);

    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const diaMes = cursor.getDate();
      const mes = cursor.getMonth();

      ticks.push({
        tipo: 'semana',
        iso,
        offsetPx,
        anchoPx: pxPorDia * 7,
        esInicioMes: diaMes <= 7,
        label1: `Sem ${getSemanaDelAnio(cursor)}`,
        label2: `${String(diaMes).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}`,
        mesNombre: nombreMes(mes),
        anio: cursor.getFullYear(),
      });

      cursor.setDate(cursor.getDate() + 7);
      offsetPx += pxPorDia * 7;
    }
    return ticks;
  }

  // Modo MESES: un tick por mes
  if (nivelZoom.unidadTicks === 'mes') {
    // Ajustar al día 1 del mes
    cursor.setDate(1);

    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const mes = cursor.getMonth();
      const anio = cursor.getFullYear();

      // Cuántos días tiene este mes
      const diasDelMes = new Date(anio, mes + 1, 0).getDate();

      ticks.push({
        tipo: 'mes',
        iso,
        offsetPx,
        anchoPx: pxPorDia * diasDelMes,
        label1: nombreMes(mes),
        label2: String(anio),
        mesNombre: nombreMes(mes),
        anio,
      });

      cursor.setMonth(cursor.getMonth() + 1);
      offsetPx += pxPorDia * diasDelMes;
    }
    return ticks;
  }

  return ticks;
}

function getSemanaDelAnio(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}