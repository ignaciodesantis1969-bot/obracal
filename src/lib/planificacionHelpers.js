// src/lib/planificacionHelpers.js
// Utilidades para el módulo de Planificación

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE TEXTO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza texto para comparaciones (minúsculas, sin acentos, sin espacios extra)
 */
export function normalizarTexto(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDARIO Y DÍAS HÁBILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Feriados nacionales de Argentina (2025-2027 hardcoded por simplicidad)
 * Se pueden agregar más en la colección `feriados`
 */
const FERIADOS_FIJOS = {
  2025: [
    '2025-01-01', '2025-02-24', '2025-02-25', '2025-03-24',
    '2025-04-02', '2025-04-18', '2025-05-01', '2025-05-25',
    '2025-06-16', '2025-06-20', '2025-07-09', '2025-08-17',
    '2025-10-12', '2025-11-24', '2025-12-08', '2025-12-25'
  ],
  2026: [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-03-23',
    '2026-03-24', '2026-04-02', '2026-04-03', '2026-05-01',
    '2026-05-25', '2026-06-15', '2026-06-20', '2026-07-09',
    '2026-08-17', '2026-10-12', '2026-11-23', '2026-12-08',
    '2026-12-25'
  ],
  2027: [
    '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-22',
    '2027-03-24', '2027-04-02', '2027-05-01', '2027-05-25',
    '2027-06-20', '2027-06-21', '2027-07-09', '2027-08-16',
    '2027-10-11', '2027-11-22', '2027-12-08', '2027-12-25'
  ]
};

/**
 * Devuelve un Set con todas las fechas de feriados del año dado
 * Combina los hardcoded + los custom que pases
 */
export function getFeriadosDelAnio(anio, feriadosCustom = []) {
  const base = FERIADOS_FIJOS[anio] || [];
  const custom = feriadosCustom
    .filter(f => String(f.fecha || '').startsWith(String(anio)))
    .map(f => String(f.fecha).slice(0, 10));
  return new Set([...base, ...custom]);
}

/**
 * Verifica si una fecha es día hábil (lunes a viernes, no feriado)
 */
export function esDiaHabil(fecha, feriadosSet) {
  const dia = fecha.getDay(); // 0 = domingo, 6 = sábado
  if (dia === 0 || dia === 6) return false;

  const iso = fecha.toISOString().slice(0, 10);
  if (feriadosSet && feriadosSet.has(iso)) return false;

  return true;
}

/**
 * Suma N días hábiles a una fecha de inicio.
 * El día de inicio NO cuenta. Arranca desde el día siguiente.
 */
export function calcularFechaFin(fechaInicio, diasHabiles, feriadosSet) {
  if (!fechaInicio || diasHabiles <= 0) return fechaInicio;

  const cursor = new Date(fechaInicio + 'T00:00:00');
  let contados = 0;
  let iteraciones = 0;
  const MAX_ITERACIONES = 3650; // 10 años

  while (contados < diasHabiles && iteraciones < MAX_ITERACIONES) {
    cursor.setDate(cursor.getDate() + 1);
    if (esDiaHabil(cursor, feriadosSet)) {
      contados++;
    }
    iteraciones++;
  }

  return cursor.toISOString().slice(0, 10);
}

/**
 * Cuenta días hábiles entre 2 fechas (inclusive el fin, exclusivo el inicio)
 */
export function contarDiasHabiles(fechaInicio, fechaFin, feriadosSet) {
  if (!fechaInicio || !fechaFin) return 0;
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');

  if (fin < inicio) return 0;

  let contador = 0;
  const cursor = new Date(inicio);
  while (cursor < fin) {
    cursor.setDate(cursor.getDate() + 1);
    if (esDiaHabil(cursor, feriadosSet)) contador++;
  }
  return contador;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACCIÓN DE CUADRILLA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Busca una cuadrilla en la lista de insumos por nombre.
 * Devuelve { composicion, personas, totalPersonas, costoDiario } o null
 */
export function buscarCuadrillaPorNombre(nombreCuadrilla, insumos) {
  if (!nombreCuadrilla || !Array.isArray(insumos)) return null;

  const buscado = normalizarTexto(nombreCuadrilla);

  const match = insumos.find(i => {
    const tipo = normalizarTexto(i?.tipo || '');
    if (!tipo.includes('mano de obra') && !tipo.includes('mano de obra')) return false;

    const nom = normalizarTexto(i?.nombre || i?.nombre_del_articulo || '');
    return nom === buscado;
  });

  if (!match) return null;

  let composicion = {};
  try {
    const raw = match.descripcion;
    composicion = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch (e) {
    console.warn('[planificacionHelpers] No se pudo parsear la descripcion del insumo:', match.nombre);
    composicion = {};
  }

  const items = Array.isArray(composicion.items) ? composicion.items : [];
  const totalPersonas = items.reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0);

  return {
    id: match.id || match.ID,
    nombre: match.nombre || match.nombre_del_articulo,
    costoDiario: Number(match.costo_unitario || match.costo || 0),
    composicion,
    personas: items,
    totalPersonas: totalPersonas || 1, // fallback mínimo 1
    viaticos: composicion.viaticos || { cantidad: 0, costo: 0 },
    porcentajeCargas: Number(composicion.porcentajeCargas || 0)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE TAREAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula los días-hombre de una tarea a partir de su insumo de Mano de Obra.
 * Devuelve { cantidadDias, operariosTeoricos, diasHombre, cuadrilla }
 */
export function calcularDiasHombreTarea(tarea, insumos) {
  const insumosTarea = Array.isArray(tarea?.insumos) ? tarea.insumos : [];

  const insumoMO = insumosTarea.find(i =>
    normalizarTexto(i?.tipo || '').includes('mano de obra')
  );

  if (!insumoMO) {
    return {
      cantidadDias: 0,
      operariosTeoricos: 0,
      diasHombre: 0,
      cuadrilla: null,
      sinManoDeObra: true
    };
  }

  const cantidadDias = Number(insumoMO.cantidad) || 0;
  const cuadrilla = buscarCuadrillaPorNombre(insumoMO.nombre, insumos);

  const operariosTeoricos = cuadrilla?.totalPersonas || 1;
  const diasHombre = cantidadDias * operariosTeoricos;

  return {
    cantidadDias,
    operariosTeoricos,
    diasHombre,
    cuadrilla,
    sinManoDeObra: false
  };
}

/**
 * Extrae todas las tareas del presupuesto aplanadas, con info de rubro.
 * Devuelve array de objetos:
 * { rubro_nombre, rubro_idx, tarea_nombre, tarea_idx, unidad, cantidad,
 *   insumo_mo_nombre, cantidad_dias, operarios_teoricos, dias_hombre, cuadrilla_id }
 */
export function extraerTareasDelPresupuesto(presupuesto, insumos) {
  if (!presupuesto) return [];

  let parsed = presupuesto.items_detalle || presupuesto.itemsDetalle || presupuesto.rubros;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
  }

  const rubrosList = Array.isArray(parsed) ? parsed : (parsed?.rubros || []);

  const tareasAplanadas = [];

  rubrosList.forEach((rubro, rIdx) => {
    const rubroNombre = rubro?.rubro || rubro?.nombre || `Rubro ${rIdx + 1}`;
    const tareas = Array.isArray(rubro?.tareas) ? rubro.tareas : [];

    tareas.forEach((t, tIdx) => {
      const calculo = calcularDiasHombreTarea(t, insumos);
      tareasAplanadas.push({
        rubro_nombre: rubroNombre,
        rubro_idx: rIdx,
        tarea_nombre: t?.tarea || t?.descripcion || `Tarea ${tIdx + 1}`,
        tarea_idx: tIdx,
        unidad: t?.unidad || 'gl',
        cantidad: Number(t?.cantidad) || 1,
        insumo_mo_nombre: calculo.cuadrilla?.nombre || '',
        cuadrilla_id: calculo.cuadrilla?.id || null,
        cantidad_dias: calculo.cantidadDias,
        operarios_teoricos: calculo.operariosTeoricos,
        dias_hombre: calculo.diasHombre,
        sin_mano_de_obra: calculo.sinManoDeObra
      });
    });
  });

  return tareasAplanadas;
}

// ═══════════════════════════════════════════════════════════════════════════
// CREACIÓN DEL PLAN + COPIAR TAREAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Paleta de colores predefinidos para los planes
 */
export const COLORES_PLAN = [
  { id: 'amber',    hex: '#f59e0b' },
  { id: 'blue',     hex: '#3b82f6' },
  { id: 'emerald',  hex: '#10b981' },
  { id: 'rose',     hex: '#f43f5e' },
  { id: 'purple',   hex: '#a855f7' },
  { id: 'slate',    hex: '#64748b' },
  { id: 'cyan',     hex: '#06b6d4' },
  { id: 'orange',   hex: '#f97316' }
];

/**
 * Estados disponibles para un plan
 */
export const ESTADOS_PLAN = [
  { id: 'borrador',   label: 'Borrador',   color: 'bg-slate-100 text-slate-700' },
  { id: 'activo',     label: 'Activo',     color: 'bg-emerald-100 text-emerald-800' },
  { id: 'pausado',    label: 'Pausado',    color: 'bg-amber-100 text-amber-800' },
  { id: 'completado', label: 'Completado', color: 'bg-blue-100 text-blue-800' },
  { id: 'archivado',  label: 'Archivado',  color: 'bg-slate-200 text-slate-700' }
];

/**
 * Estados disponibles para una tarea
 */
export const ESTADOS_TAREA = [
  { id: 'no_iniciado', label: 'No iniciado', color: 'bg-slate-100 text-slate-700' },
  { id: 'en_curso',    label: 'En curso',    color: 'bg-blue-100 text-blue-800' },
  { id: 'completada',  label: 'Completada',  color: 'bg-emerald-100 text-emerald-800' },
  { id: 'bloqueada',   label: 'Bloqueada',   color: 'bg-rose-100 text-rose-800' }
];