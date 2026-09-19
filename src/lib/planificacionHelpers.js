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
    if (!tipo.includes('mano de obra')) return false;

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
 * 
 * 🔑 FIX: ahora multiplica por la CANTIDAD DE LA TAREA.
 * 
 * Interpretación correcta del insumo MO:
 *   - `insumoMO.cantidad` = días de cuadrilla POR UNIDAD de la tarea
 *   - `tarea.cantidad`    = cuántas unidades hay que ejecutar
 *   - `cuadrilla.totalPersonas` = cuántas personas componen la cuadrilla
 * 
 * Fórmula:
 *   diasCuadrillaTotales = tarea.cantidad × insumoMO.cantidad
 *   diasHombre           = diasCuadrillaTotales × operariosTeoricos
 * 
 * Ejemplo:
 *   Tarea: pintar 10 m² (tarea.cantidad = 10)
 *   Insumo MO: 0.5 día/m² (insumoMO.cantidad = 0.5)
 *   Cuadrilla: 4 personas
 *   → diasCuadrillaTotales = 10 × 0.5 = 5 días
 *   → diasHombre = 5 × 4 = 20 días-hombre
 * 
 * Devuelve {
 *   cantidadUnidadesTarea,  // cuántas unidades hay que ejecutar
 *   diasPorUnidad,          // días de cuadrilla por unidad
 *   cantidadDias,           // días TOTALES de cuadrilla (tarea.cantidad × insumoMO.cantidad)
 *   operariosTeoricos,      // personas en la cuadrilla
 *   diasHombre,             // cantidadDias × operariosTeoricos
 *   cuadrilla
 * }
 */
export function calcularDiasHombreTarea(tarea, insumos) {
  const insumosTarea = Array.isArray(tarea?.insumos) ? tarea.insumos : [];

  const insumoMO = insumosTarea.find(i =>
    normalizarTexto(i?.tipo || '').includes('mano de obra')
  );

  if (!insumoMO) {
    return {
      cantidadUnidadesTarea: 0,
      diasPorUnidad: 0,
      cantidadDias: 0,
      operariosTeoricos: 0,
      diasHombre: 0,
      cuadrilla: null,
      sinManoDeObra: true
    };
  }

  // 🔑 FIX: cantidad de unidades de la tarea (ej: 10 m², 5 gl, 3 un)
  const cantidadUnidadesTarea = Number(tarea?.cantidad) || 1;

  // 🔑 FIX: días de cuadrilla por unidad (ej: 0.5 día/m²)
  const diasPorUnidad = Number(insumoMO.cantidad) || 0;

  // 🔑 FIX: días TOTALES de cuadrilla = unidades × días por unidad
  const cantidadDias = cantidadUnidadesTarea * diasPorUnidad;

  const cuadrilla = buscarCuadrillaPorNombre(insumoMO.nombre, insumos);
  const operariosTeoricos = cuadrilla?.totalPersonas || 1;

  // 🔑 FIX: días-hombre = días totales de cuadrilla × operarios
  const diasHombre = cantidadDias * operariosTeoricos;

  return {
    cantidadUnidadesTarea,
    diasPorUnidad,
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

        // 🔑 Datos de la MO (con la fórmula corregida)
        insumo_mo_nombre: calculo.cuadrilla?.nombre || '',
        cuadrilla_id: calculo.cuadrilla?.id || null,
        cantidad_unidades_tarea: calculo.cantidadUnidadesTarea,
        dias_por_unidad: calculo.diasPorUnidad,
        cantidad_dias: calculo.cantidadDias,              // ← días TOTALES de cuadrilla
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

// ═══════════════════════════════════════════════════════════════════════════
// ELIMINACIÓN DE PLANES (con cascada a tareas)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Elimina un plan + todas sus tareas asociadas.
 * Devuelve { ok, tareasEliminadas } o lanza error.
 */
export async function eliminarPlanConTareas(planId, colecciones) {
  const { tareas, eliminarDoc, eliminarDocsFiltrados } = colecciones;

  if (!planId) throw new Error('planId requerido');

  let tareasEliminadas = 0;

  if (typeof eliminarDocsFiltrados === 'function') {
    try {
      const resultado = await eliminarDocsFiltrados('planificacion_tareas', (docData) => {
        return String(docData.plan_id || '').trim() === String(planId).trim();
      });
      tareasEliminadas = typeof resultado === 'number' ? resultado : 0;
    } catch (err) {
      console.warn('[planificacionHelpers] eliminarDocsFiltrados falló, usando fallback:', err);
    }
  }

  if (tareasEliminadas === 0 && Array.isArray(tareas)) {
    const tareasDelPlan = tareas.filter(t => String(t.plan_id || '') === String(planId));
    for (const t of tareasDelPlan) {
      await eliminarDoc('planificacion_tareas', t.id);
      tareasEliminadas++;
    }
  }

  await eliminarDoc('planificacion_planes', planId);

  return { ok: true, tareasEliminadas };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE RECURSOS Y VALIDACIÓN (Paso 5B)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el porcentaje de cargas sociales de una tarea,
 * leyendo la composición de su cuadrilla.
 */
export function obtenerPorcentajeCargasDeTarea(tarea, insumos) {
  if (!tarea?.insumo_mo_nombre || !Array.isArray(insumos)) return 76;

  const cuadrilla = insumos.find(i =>
    normalizarTexto(i?.nombre || i?.nombre_del_articulo || '') === normalizarTexto(tarea.insumo_mo_nombre)
  );

  if (!cuadrilla) return 76;

  try {
    const desc = typeof cuadrilla.descripcion === 'string'
      ? JSON.parse(cuadrilla.descripcion || '{}')
      : (cuadrilla.descripcion || {});
    return Number(desc.porcentajeCargas) || 76;
  } catch {
    return 76;
  }
}

/**
 * Calcula el costo diario real de un operario (sueldo + cargas).
 * 🔑 FIX: sanitiza todos los números (evita NaN)
 */
export function calcularCostoDiarioOperario(operario, porcentajeCargas = 76) {
  // 🔑 FIX: usar nullish coalescing en vez de || (para no pisar el 0 legítimo)
  const sueldoRaw = operario?.costo_en_mano ?? operario?.Costo_en_mano ?? operario?.salario ?? 0;
  const sueldoBaseNum = Number(sueldoRaw);
  const sueldoBase = isNaN(sueldoBaseNum) ? 0 : sueldoBaseNum;

  const cargasNum = Number(porcentajeCargas);
  const cargasSafe = isNaN(cargasNum) ? 76 : cargasNum;

  const factor = 1 + (cargasSafe / 100);
  const total = sueldoBase * factor;

  return isNaN(total) ? 0 : Math.round(total * 100) / 100;
}

/**
 * Obtiene los subcontratos disponibles en una tarea específica.
 * Busca en los insumos del presupuesto dentro de la tarea.
 * Devuelve array de: { id, nombre, montoTotal, unidad, cantidad }
 */
export function obtenerSubcontratosDeTarea(tarea, presupuesto) {
  if (!tarea || !presupuesto) return [];

  let itemsDetalle = presupuesto.items_detalle || presupuesto.itemsDetalle || {};
  if (typeof itemsDetalle === 'string') {
    try { itemsDetalle = JSON.parse(itemsDetalle); } catch { return []; }
  }

  const rubros = itemsDetalle?.rubros || [];
  const rubroIdx = Number(tarea.rubro_idx);
  const tareaIdx = Number(tarea.tarea_idx);

  if (!rubros[rubroIdx]) return [];
  const rubro = rubros[rubroIdx];
  const tareasRubro = rubro?.tareas || [];
  if (!tareasRubro[tareaIdx]) return [];

  const tareaOriginal = tareasRubro[tareaIdx];
  const insumosTarea = tareaOriginal?.insumos || [];

  return insumosTarea
    .filter(ins => normalizarTexto(ins?.tipo || '').includes('subcontrato'))
    .map((ins, idx) => ({
      id: `sub-${rubroIdx}-${tareaIdx}-${idx}`,
      nombre: ins.nombre || ins.descripcion || 'Subcontrato',
      montoTotal: Number(ins.total || (Number(ins.cantidad || 0) * Number(ins.costo_unitario || 0))) || 0,
      unidad: ins.unidad || 'gl',
      cantidad: Number(ins.cantidad) || 1,
    }));
}

/**
 * Valida que un operario no esté asignado a otra tarea
 * con rango de fechas solapado en el mismo plan.
 */
export function validarSolapamientoOperario(operarioId, fechaInicio, fechaFin, tareasDelPlan, tareaActualId) {
  if (!operarioId || !fechaInicio || !fechaFin) {
    return { ok: true, conflicto: null };
  }

  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');

  for (const t of tareasDelPlan) {
    if (String(t.id) === String(tareaActualId)) continue;

    const recursos = Array.isArray(t.recursos) ? t.recursos : [];
    const estaAsignado = recursos.some(r =>
      r.tipo === 'operario' && String(r.id) === String(operarioId)
    );
    if (!estaAsignado) continue;

    if (!t.fecha_inicio || !t.fecha_fin) continue;

    const tInicio = new Date(t.fecha_inicio + 'T00:00:00');
    const tFin = new Date(t.fecha_fin + 'T00:00:00');

    // Detectar solapamiento (rangos inclusivos)
    const solapa = !(fin < tInicio || inicio > tFin);
    if (solapa) {
      return {
        ok: false,
        conflicto: {
          tarea_id: t.id,
          tarea_nombre: t.tarea_nombre,
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
        },
      };
    }
  }

  return { ok: true, conflicto: null };
}

/**
 * Valida múltiples operarios contra las tareas del plan.
 * Devuelve { ok, conflictos: [...] } con todos los que fallan.
 */
export function validarSolapamientoMultiple(operariosIds, fechaInicio, fechaFin, tareasDelPlan, tareaActualId) {
  const conflictos = [];
  for (const opId of operariosIds) {
    const res = validarSolapamientoOperario(opId, fechaInicio, fechaFin, tareasDelPlan, tareaActualId);
    if (!res.ok) {
      conflictos.push({ operarioId: opId, ...res.conflicto });
    }
  }
  return { ok: conflictos.length === 0, conflictos };
}