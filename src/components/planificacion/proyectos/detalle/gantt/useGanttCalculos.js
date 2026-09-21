// src/components/planificacion/proyectos/detalle/gantt/useGanttCalculos.js
import { useMemo } from 'react';
import { normalizarPredecesoras } from '@/lib/planificacionHelpers';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const NIVELES_ZOOM = {
  dias:    { id: 'dias',    label: 'Días',    pxPorDia: 40, unidadTicks: 'dia' },
  semanas: { id: 'semanas', label: 'Semanas', pxPorDia: 10, unidadTicks: 'semana' },
  meses:   { id: 'meses',   label: 'Meses',   pxPorDia: 3,  unidadTicks: 'mes' },
};

// 🎨 Colores (celeste pálido con bordes más oscuros)
export const COLORES_ESTADO = {
  no_iniciado: { bg: '#dbeafe', border: '#93c5fd', label: 'No iniciado' },
  en_curso:    { bg: '#bae6fd', border: '#0ea5e9', label: 'En curso' },
  completada:  { bg: '#bbf7d0', border: '#22c55e', label: 'Completada' },
  bloqueada:   { bg: '#fecaca', border: '#ef4444', label: 'Bloqueada' },
};

export const COLOR_RUBRO = {
  bg: '#93c5fd',
  border: '#3b82f6',
};

export const COLOR_TAREA = {
  bg: '#dbeafe',
  border: '#3b82f6',
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

export function nombreMes(mesIdx) { return NOMBRES_MES[mesIdx] || ''; }
export function nombreDia(diaIdx) { return NOMBRES_DIA[diaIdx] || ''; }
export function esFindeSemana(date) {
  const dia = date.getDay();
  return dia === 0 || dia === 6;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function useGanttCalculos(tareas = [], nivelZoom, rubrosColapsados = new Set()) {
  return useMemo(() => {
    // ─── Sin tareas ─────────────────────────────────────────────────────
    if (!Array.isArray(tareas) || tareas.length === 0) {
      const hoy = new Date();
      const fin = new Date(hoy);
      fin.setDate(fin.getDate() + 30);

      return {
        rango: { inicio: dateAIso(hoy), fin: dateAIso(fin), totalDias: 30 },
        filas: [],
        ticks: generarTicks(dateAIso(hoy), dateAIso(fin), nivelZoom),
        anchoTotal: 30 * nivelZoom.pxPorDia,
        flechas: [],
        alturaFila: 36,
      };
    }

    // ─── Rango global ───────────────────────────────────────────────────
    const fechasInicio = tareas.map(t => t.fecha_inicio).filter(Boolean);
    const fechasFin = tareas.map(t => t.fecha_fin || t.fecha_inicio).filter(Boolean);

    const minIso = [...fechasInicio].sort()[0];
    const maxIso = [...fechasFin].sort().reverse()[0];

    const inicioIso = sumarDias(minIso, -3);
    const finIso = sumarDias(maxIso, 3);
    const totalDias = Math.max(diasEntre(inicioIso, finIso), 1);

    // ─── Agrupar por rubro ──────────────────────────────────────────────
    const rubrosMap = new Map();

    tareas.forEach((t) => {
      const rubroKey = t.rubro_nombre || 'Sin rubro';
      if (!rubrosMap.has(rubroKey)) {
        rubrosMap.set(rubroKey, {
          nombre: rubroKey,
          rubro_idx: Number(t.rubro_idx) || 0,
          tareas: [],
        });
      }
      rubrosMap.get(rubroKey).tareas.push(t);
    });

    // ─── Calcular posición de cada tarea + barra agregada del rubro ─────
    const rubrosArray = Array.from(rubrosMap.values()).sort((a, b) => a.rubro_idx - b.rubro_idx);

    const filas = [];

    rubrosArray.forEach((rubro) => {
      const tareasOrdenadas = [...rubro.tareas].sort((a, b) => {
        const fA = a.fecha_inicio || '';
        const fB = b.fecha_inicio || '';
        if (fA !== fB) return fA.localeCompare(fB);
        return (Number(a.tarea_idx) || 0) - (Number(b.tarea_idx) || 0);
      });

      let rubroFechaMin = null;
      let rubroFechaMax = null;
      let rubroCostoTotal = 0;
      let rubroDiasHombreTotal = 0;
      let rubroTareasCompletadas = 0;

      tareasOrdenadas.forEach((t) => {
        const inicio = t.fecha_inicio;
        const fin = t.fecha_fin || t.fecha_inicio;

        if (inicio && (!rubroFechaMin || inicio < rubroFechaMin)) rubroFechaMin = inicio;
        if (fin && (!rubroFechaMax || fin > rubroFechaMax)) rubroFechaMax = fin;

        rubroCostoTotal += Number(t.costo_total) || 0;
        rubroDiasHombreTotal += Number(t.total_dias_hombre) || 0;
        if (String(t.estado || '').toLowerCase() === 'completada') rubroTareasCompletadas++;
      });

      if (!rubroFechaMin) rubroFechaMin = inicioIso;
      if (!rubroFechaMax) rubroFechaMax = rubroFechaMin;

      const rubroOffsetDias = diasEntre(inicioIso, rubroFechaMin);
      const rubroDuracionDias = Math.max(diasEntre(rubroFechaMin, rubroFechaMax), 1);
      const rubroColapsado = rubrosColapsados.has(rubro.nombre);

      filas.push({
        _tipo: 'rubro',
        _key: `rubro-${rubro.nombre}`,
        nombre: rubro.nombre,
        rubro_idx: rubro.rubro_idx,
        totalTareas: tareasOrdenadas.length,
        tareasCompletadas: rubroTareasCompletadas,
        costoTotal: rubroCostoTotal,
        diasHombreTotal: rubroDiasHombreTotal,
        fechaInicio: rubroFechaMin,
        fechaFin: rubroFechaMax,
        duracionDias: rubroDuracionDias,
        _offsetPx: rubroOffsetDias * nivelZoom.pxPorDia,
        _anchoPx: Math.max(rubroDuracionDias * nivelZoom.pxPorDia, 8),
        _offsetDias: rubroOffsetDias,
        _duracionDias: rubroDuracionDias,
        _colapsado: rubroColapsado,
        _subBarras: tareasOrdenadas.map((t) => {
          const inicio = t.fecha_inicio || rubroFechaMin;
          const fin = t.fecha_fin || t.fecha_inicio || inicio;
          const offsetDias = diasEntre(rubroFechaMin, inicio);
          const duracionDias = Math.max(diasEntre(inicio, fin), 1);
          return {
            id: t.id,
            nombre: t.tarea_nombre,
            estado: String(t.estado || 'no_iniciado').toLowerCase(),
            _offsetInternoPx: offsetDias * nivelZoom.pxPorDia,
            _anchoInternoPx: Math.max(duracionDias * nivelZoom.pxPorDia, 4),
          };
        }),
      });

      if (!rubroColapsado) {
        tareasOrdenadas.forEach((t) => {
          const inicio = t.fecha_inicio;
          const fin = t.fecha_fin || t.fecha_inicio;
          const offsetDias = inicio ? diasEntre(inicioIso, inicio) : 0;
          const duracionDias = inicio ? Math.max(diasEntre(inicio, fin), 1) : 1;

          filas.push({
            _tipo: 'tarea',
            ...t,
            _key: `tarea-${t.id}`,
            _offsetPx: offsetDias * nivelZoom.pxPorDia,
            _anchoPx: Math.max(duracionDias * nivelZoom.pxPorDia, 8),
            _offsetDias: offsetDias,
            _duracionDias: duracionDias,
            _rubroPadre: rubro.nombre,
          });
        });
      }
    });

    const ticks = generarTicks(inicioIso, finIso, nivelZoom);

    // ═══════════════════════════════════════════════════════════════════
    // 🔑 Fase 3.1: Calcular datos para las flechas de dependencia
    // ═══════════════════════════════════════════════════════════════════
    const ALTURA_FILA = 36;
    const flechas = [];

    // Mapa de tareaId → índice de fila (para calcular Y)
    const filaIdxPorTarea = new Map();
    filas.forEach((f, idx) => {
      if (f._tipo === 'tarea') {
        filaIdxPorTarea.set(String(f.id), idx);
      }
    });

    filas.forEach((filaDestino, idxDestino) => {
      if (filaDestino._tipo !== 'tarea') return;

      const predecesoras = normalizarPredecesoras(filaDestino.predecesoras);
      if (predecesoras.length === 0) return;

      predecesoras.forEach((pred) => {
        const filaOrigen = filas.find(f =>
          f._tipo === 'tarea' && String(f.id) === String(pred.tarea_id)
        );
        if (!filaOrigen) return;

        const idxOrigen = filaIdxPorTarea.get(String(filaOrigen.id));
        if (idxOrigen === undefined) return;

        const yOrigen = idxOrigen * ALTURA_FILA + ALTURA_FILA / 2;
        const yDestino = idxDestino * ALTURA_FILA + ALTURA_FILA / 2;

        let xOrigen, xDestino;

        switch (pred.tipo) {
          case 'SS':
            xOrigen = filaOrigen._offsetPx;
            xDestino = filaDestino._offsetPx;
            break;
          case 'FF':
            xOrigen = filaOrigen._offsetPx + filaOrigen._anchoPx;
            xDestino = filaDestino._offsetPx + filaDestino._anchoPx;
            break;
          case 'SF':
            xOrigen = filaOrigen._offsetPx;
            xDestino = filaDestino._offsetPx + filaDestino._anchoPx;
            break;
          case 'FS':
          default:
            xOrigen = filaOrigen._offsetPx + filaOrigen._anchoPx;
            xDestino = filaDestino._offsetPx;
            break;
        }

        flechas.push({
          id: `${pred.tarea_id}->${filaDestino.id}`,
          tipo: pred.tipo,
          lag: pred.lag,
          x1: xOrigen,
          y1: yOrigen,
          x2: xDestino,
          y2: yDestino,
          origenId: filaOrigen.id,
          destinoId: filaDestino.id,
        });
      });
    });

    return {
      rango: { inicio: inicioIso, fin: finIso, totalDias },
      filas,
      ticks,
      anchoTotal: totalDias * nivelZoom.pxPorDia,
      flechas,
      alturaFila: ALTURA_FILA,
    };
  }, [tareas, nivelZoom, rubrosColapsados]);
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

  if (nivelZoom.unidadTicks === 'dia') {
    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const diaSem = nombreDia(cursor.getDay());
      const diaMes = cursor.getDate();
      const mes = cursor.getMonth();

      ticks.push({
        tipo: 'dia', iso, offsetPx,
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

  if (nivelZoom.unidadTicks === 'semana') {
    const diaSem = cursor.getDay();
    const offsetAlLunes = diaSem === 0 ? -6 : (1 - diaSem);
    cursor.setDate(cursor.getDate() + offsetAlLunes);

    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const diaMes = cursor.getDate();
      const mes = cursor.getMonth();

      ticks.push({
        tipo: 'semana', iso, offsetPx,
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

  if (nivelZoom.unidadTicks === 'mes') {
    cursor.setDate(1);
    while (cursor <= fin) {
      const iso = dateAIso(cursor);
      const mes = cursor.getMonth();
      const anio = cursor.getFullYear();
      const diasDelMes = new Date(anio, mes + 1, 0).getDate();

      ticks.push({
        tipo: 'mes', iso, offsetPx,
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