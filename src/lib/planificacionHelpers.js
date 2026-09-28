// src/lib/planificacionHelpers.js
// Utilidades para el módulo de Planificación

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE TEXTO
// ═══════════════════════════════════════════════════════════════════════════

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

export function getFeriadosDelAnio(anio, feriadosCustom = []) {
  const base = FERIADOS_FIJOS[anio] || [];
  const custom = feriadosCustom
    .filter(f => String(f.fecha || '').startsWith(String(anio)))
    .map(f => String(f.fecha).slice(0, 10));
  return new Set([...base, ...custom]);
}

export function esDiaHabil(fecha, feriadosSet) {
  const dia = fecha.getDay();
  if (dia === 0 || dia === 6) return false;
  const iso = fecha.toISOString().slice(0, 10);
  if (feriadosSet && feriadosSet.has(iso)) return false;
  return true;
}

export function calcularFechaFin(fechaInicio, diasHabiles, feriadosSet) {
  if (!fechaInicio || diasHabiles <= 0) return fechaInicio;

  const cursor = new Date(fechaInicio + 'T00:00:00');
  let contados = 0;
  let iteraciones = 0;
  const MAX_ITERACIONES = 3650;

  while (contados < diasHabiles && iteraciones < MAX_ITERACIONES) {
    cursor.setDate(cursor.getDate() + 1);
    if (esDiaHabil(cursor, feriadosSet)) {
      contados++;
    }
    iteraciones++;
  }

  return cursor.toISOString().slice(0, 10);
}

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
    totalPersonas: totalPersonas || 1,
    viaticos: composicion.viaticos || { cantidad: 0, costo: 0 },
    porcentajeCargas: Number(composicion.porcentajeCargas || 0)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CÁLCULO DE TAREAS
// ═══════════════════════════════════════════════════════════════════════════

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

  const cantidadUnidadesTarea = Number(tarea?.cantidad) || 1;
  const diasPorUnidad = Number(insumoMO.cantidad) || 0;
  const cantidadDias = cantidadUnidadesTarea * diasPorUnidad;

  const cuadrilla = buscarCuadrillaPorNombre(insumoMO.nombre, insumos);
  const operariosTeoricos = cuadrilla?.totalPersonas || 1;
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
        cantidad_unidades_tarea: calculo.cantidadUnidadesTarea,
        dias_por_unidad: calculo.diasPorUnidad,
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
// COLORES Y ESTADOS
// ═══════════════════════════════════════════════════════════════════════════

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

export const ESTADOS_PLAN = [
  { id: 'borrador',   label: 'Borrador',   color: 'bg-slate-100 text-slate-700' },
  { id: 'activo',     label: 'Activo',     color: 'bg-emerald-100 text-emerald-800' },
  { id: 'pausado',    label: 'Pausado',    color: 'bg-amber-100 text-amber-800' },
  { id: 'completado', label: 'Completado', color: 'bg-blue-100 text-blue-800' },
  { id: 'archivado',  label: 'Archivado',  color: 'bg-slate-200 text-slate-700' }
];

export const ESTADOS_TAREA = [
  { id: 'no_iniciado', label: 'No iniciado', color: 'bg-slate-100 text-slate-700' },
  { id: 'en_curso',    label: 'En curso',    color: 'bg-blue-100 text-blue-800' },
  { id: 'completada',  label: 'Completada',  color: 'bg-emerald-100 text-emerald-800' },
  { id: 'bloqueada',   label: 'Bloqueada',   color: 'bg-rose-100 text-rose-800' }
];

// ═══════════════════════════════════════════════════════════════════════════
// ELIMINACIÓN DE PLANES
// ═══════════════════════════════════════════════════════════════════════════

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
// HELPERS DE RECURSOS Y VALIDACIÓN
// ═══════════════════════════════════════════════════════════════════════════

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

export function calcularCostoDiarioOperario(operario, porcentajeCargas = 76) {
  const sueldoRaw = operario?.costo_en_mano ?? operario?.Costo_en_mano ?? operario?.salario ?? 0;
  const sueldoBaseNum = Number(sueldoRaw);
  const sueldoBase = isNaN(sueldoBaseNum) ? 0 : sueldoBaseNum;

  const cargasNum = Number(porcentajeCargas);
  const cargasSafe = isNaN(cargasNum) ? 76 : cargasNum;

  const factor = 1 + (cargasSafe / 100);
  const total = sueldoBase * factor;

  return isNaN(total) ? 0 : Math.round(total * 100) / 100;
}

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

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE DÍAS HÁBILES
// ═══════════════════════════════════════════════════════════════════════════

export function ajustarADiaHabil(fechaIso, feriadosSet) {
  if (!fechaIso) return fechaIso;

  const d = new Date(fechaIso + 'T00:00:00');
  let iteraciones = 0;
  const MAX_ITERACIONES = 30;

  while (!esDiaHabil(d, feriadosSet) && iteraciones < MAX_ITERACIONES) {
    d.setDate(d.getDate() + 1);
    iteraciones++;
  }

  return d.toISOString().slice(0, 10);
}

export function ajustarADiaHabilAnterior(fechaIso, feriadosSet) {
  if (!fechaIso) return fechaIso;

  const d = new Date(fechaIso + 'T00:00:00');
  let iteraciones = 0;
  const MAX_ITERACIONES = 30;

  while (!esDiaHabil(d, feriadosSet) && iteraciones < MAX_ITERACIONES) {
    d.setDate(d.getDate() - 1);
    iteraciones++;
  }

  return d.toISOString().slice(0, 10);
}

export function contarDiasCalendarioHabiles(fechaIsoInicio, fechaIsoFin, feriadosSet) {
  if (!fechaIsoInicio || !fechaIsoFin) return 0;

  const inicio = new Date(fechaIsoInicio + 'T00:00:00');
  const fin = new Date(fechaIsoFin + 'T00:00:00');

  if (fin < inicio) return 0;

  let contador = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (esDiaHabil(cursor, feriadosSet)) contador++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return contador;
}

export function esFinDeSemana(fechaIso) {
  if (!fechaIso) return false;
  const d = new Date(fechaIso + 'T00:00:00');
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

export function esFeriado(fechaIso, feriadosSet) {
  if (!fechaIso || !feriadosSet) return false;
  return feriadosSet.has(fechaIso);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE DEPENDENCIAS
// ═══════════════════════════════════════════════════════════════════════════

export const TIPOS_DEPENDENCIA = [
  { id: 'FS', label: 'Fin → Inicio', descripcion: 'La sucesora empieza cuando termina la predecesora', icono: '→' },
  { id: 'SS', label: 'Inicio → Inicio', descripcion: 'Ambas empiezan al mismo tiempo', icono: '⇉' },
  { id: 'FF', label: 'Fin → Fin', descripcion: 'Ambas terminan al mismo tiempo', icono: '⇉' },
  { id: 'SF', label: 'Inicio → Fin', descripcion: 'La sucesora termina cuando empieza la predecesora (raro)', icono: '→' },
];

export function normalizarPredecesoras(predecesorasRaw) {
  if (!Array.isArray(predecesorasRaw)) return [];

  return predecesorasRaw
    .map((p) => {
      if (typeof p === 'string') {
        return { tarea_id: p, tipo: 'FS', lag: 0 };
      }

      if (p && typeof p === 'object') {
        const tareaId = p.tarea_id || p.id || p.tareaId;
        if (!tareaId) return null;

        const tipo = String(p.tipo || 'FS').toUpperCase();
        const tipoValido = ['FS', 'SS', 'FF', 'SF'].includes(tipo) ? tipo : 'FS';

        return {
          tarea_id: String(tareaId),
          tipo: tipoValido,
          lag: Number(p.lag) || 0,
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function obtenerIdsPredecesoras(predecesorasRaw) {
  return normalizarPredecesoras(predecesorasRaw).map(p => p.tarea_id);
}

export function tienePredecesora(predecesorasRaw, tareaId) {
  const ids = obtenerIdsPredecesoras(predecesorasRaw);
  return ids.some(id => String(id) === String(tareaId));
}

export function detectarCiclo(tareaId, nuevaPredecesoraId, todasLasTareas) {
  if (!tareaId || !nuevaPredecesoraId) return { tieneCiclo: false, camino: [] };
  if (String(tareaId) === String(nuevaPredecesoraId)) {
    return { tieneCiclo: true, camino: [tareaId, tareaId] };
  }

  const visitados = new Set();
  const cola = [{ id: String(nuevaPredecesoraId), camino: [String(nuevaPredecesoraId)] }];

  while (cola.length > 0) {
    const actual = cola.shift();
    if (visitados.has(actual.id)) continue;
    visitados.add(actual.id);

    if (actual.id === String(tareaId)) {
      return { tieneCiclo: true, camino: [String(tareaId), ...actual.camino] };
    }

    const tareaActual = todasLasTareas.find(t => String(t.id) === actual.id);
    if (!tareaActual) continue;

    const preds = obtenerIdsPredecesoras(tareaActual.predecesoras);
    preds.forEach(predId => {
      if (!visitados.has(predId)) {
        cola.push({
          id: String(predId),
          camino: [...actual.camino, String(predId)],
        });
      }
    });
  }

  return { tieneCiclo: false, camino: [] };
}

export function labelTipoDependencia(tipo) {
  const t = TIPOS_DEPENDENCIA.find(x => x.id === tipo);
  return t ? t.label : 'Fin → Inicio';
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE RESPONSABLES
// ═══════════════════════════════════════════════════════════════════════════

export const ROLES_RESPONSABLES = [
  { id: 'jefe_obra',     label: 'Jefe de Obra',   color: 'bg-blue-100 text-blue-800' },
  { id: 'admin',         label: 'Admin',          color: 'bg-rose-100 text-rose-800' },
  { id: 'administrador', label: 'Administrador',  color: 'bg-rose-100 text-rose-800' },
];

export function labelRolResponsable(rolId) {
  const r = ROLES_RESPONSABLES.find(x => x.id === String(rolId || '').toLowerCase());
  return r ? r.label : rolId || 'Sin rol';
}

export function usuariosResponsables(usuarios) {
  if (!Array.isArray(usuarios)) return [];
  return usuarios.filter(u => {
    const rol = String(u.role || u.rol || '').toLowerCase();
    return ROLES_RESPONSABLES.some(r => r.id === rol);
  });
}

export function buscarUsuarioPorId(usuarios, userId) {
  if (!Array.isArray(usuarios) || !userId) return null;
  return usuarios.find(u => String(u.id) === String(userId)) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESUPUESTO DE MANO DE OBRA POR TAREA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula el presupuesto de MANO DE OBRA de una tarea según el presupuesto aprobado.
 *
 * Fórmula:
 *   = costo_unitario_MO × cantidad_insumo_MO × cantidad_tarea
 *
 * Ejemplo ("Cordones de hormigón armado 15x15"):
 *   = 578245.976 × 0.077 × 13.5 = $601.086,69
 *
 * Match:
 *   - rubro: tarea.rubro_idx (fallback: tarea.recursos.rubro_idx o recursos[].rubro_idx)
 *   - tarea: busca en múltiples ubicaciones (subtareas, tarea_id, tarea_idx)
 *   - insumo MO: por nombre (normalizado) + tipo "mano de obra"
 */
export function calcularPresupuestoMO(tarea, presupuesto) {
  if (!tarea || !presupuesto || !tarea.insumo_mo_nombre) {
    return 0;
  }

  // 1) Parsear items_detalle
  let detalle = presupuesto.items_detalle || presupuesto.itemsDetalle;
  if (typeof detalle === 'string') {
    try { detalle = JSON.parse(detalle); } catch { return 0; }
  }
  const rubros = Array.isArray(detalle?.rubros) ? detalle.rubros : [];
  if (rubros.length === 0) return 0;

  // 2) Buscar rubro_idx en varios lugares
  let rubroIdx = Number(tarea.rubro_idx);
  if (isNaN(rubroIdx) || rubroIdx < 0) {
    if (Array.isArray(tarea.recursos)) {
      const elemConRubro = tarea.recursos.find(r => r && r.rubro_idx !== undefined);
      if (elemConRubro) rubroIdx = Number(elemConRubro.rubro_idx);
    }
    if ((isNaN(rubroIdx) || rubroIdx < 0) && tarea.recursos && !Array.isArray(tarea.recursos)) {
      if (tarea.recursos.rubro_idx !== undefined) {
        rubroIdx = Number(tarea.recursos.rubro_idx);
      }
    }
  }

  if (isNaN(rubroIdx) || rubroIdx < 0 || !rubros[rubroIdx]) return 0;
  const rubro = rubros[rubroIdx];

  // 3) 🔑 Buscar tarea_idx en TODOS los lugares posibles (FIX)
  let tareaIdx = -1;
  let fuenteTareaIdx = 'ninguna';

  // Fuente 1: tarea.subtareas (raíz del doc)
  if (Array.isArray(tarea.subtareas) && tarea.subtareas[0]?.tarea_idx !== undefined) {
    tareaIdx = Number(tarea.subtareas[0].tarea_idx);
    fuenteTareaIdx = 'tarea.subtareas[0]';
  }
  // Fuente 2: tarea.recursos.subtareas (si recursos es un objeto/map)
  else if (tarea.recursos && !Array.isArray(tarea.recursos) && Array.isArray(tarea.recursos.subtareas)) {
    tareaIdx = Number(tarea.recursos.subtareas[0]?.tarea_idx ?? -1);
    fuenteTareaIdx = 'tarea.recursos.subtareas[0]';
  }
  // Fuente 3: dentro de recursos (si es array y algún elemento tiene subtareas)
  else if (Array.isArray(tarea.recursos)) {
    const elemConSubtareas = tarea.recursos.find(r => r && Array.isArray(r.subtareas) && r.subtareas.length > 0);
    if (elemConSubtareas) {
      tareaIdx = Number(elemConSubtareas.subtareas[0]?.tarea_idx ?? -1);
      fuenteTareaIdx = 'recursos[array].find(subtareas)[0]';
    }
  }
  // Fuente 4: tarea.tarea_id (fallback antiguo)
  if (tareaIdx < 0 && tarea.tarea_id !== undefined) {
    tareaIdx = Number(tarea.tarea_id);
    fuenteTareaIdx = 'tarea.tarea_id';
  }
  // Fuente 5: tarea.tarea_idx (fallback más antiguo)
  if (tareaIdx < 0 && tarea.tarea_idx !== undefined) {
    tareaIdx = Number(tarea.tarea_idx);
    fuenteTareaIdx = 'tarea.tarea_idx';
  }

  console.log('[calcularPresupuestoMO] tareaIdx:', tareaIdx, '| fuente:', fuenteTareaIdx);

  if (tareaIdx < 0) return 0;

  const tareas = Array.isArray(rubro.tareas) ? rubro.tareas : [];
  if (!tareas[tareaIdx]) {
    console.log('[calcularPresupuestoMO] → tarea no existe en presupuesto. tareaIdx:', tareaIdx, '| tareasLength:', tareas.length);
    return 0;
  }
  const tareaPresupuesto = tareas[tareaIdx];

  // 4) Buscar insumo MO
  const insumosTarea = Array.isArray(tareaPresupuesto.insumos) ? tareaPresupuesto.insumos : [];
  const buscado = normalizarTexto(tarea.insumo_mo_nombre);
  const insumoMO = insumosTarea.find(i =>
    normalizarTexto(i?.nombre || '') === buscado &&
    normalizarTexto(i?.tipo || '').includes('mano de obra')
  );

  if (!insumoMO) {
    console.log('[calcularPresupuestoMO] → insumo MO no encontrado en la tarea del presupuesto');
    return 0;
  }

  const costoUnitarioMO = Number(insumoMO.costo_unitario) || 0;
  const cantidadInsumoMO = Number(insumoMO.cantidad) || 0;
  const cantidadTarea = Number(tarea.cantidad) || 0;

  const resultado = costoUnitarioMO * cantidadInsumoMO * cantidadTarea;
  console.log('[calcularPresupuestoMO] ✓ RESULTADO:', resultado);
  return resultado;
}
// ═══════════════════════════════════════════════════════════════════════════
// AUTO-ACOMODO: RECÁLCULO DE FECHAS POR DEPENDENCIAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recalcula las fechas de todas las tareas respetando las dependencias.
 * 
 * - La tarea origen (la que movió el usuario) mantiene sus fechas.
 * - Las sucesoras se recalculan en cascada, respetando el tipo de dependencia.
 * - Soporta FS, SS, FF, SF.
 * - Con múltiples predecesoras, toma el MAX de las fechas calculadas.
 * - Usa días hábiles (respeta feriados).
 * 
 * @param {Array} tareas - Array de tareas del plan
 * @param {Set} feriadosSet - Set de feriados (YYYY-MM-DD)
 * @param {string} tareaOrigenId - ID de la tarea que movió el usuario
 * @returns {Object} { cambios: { [tareaId]: { fecha_inicio, fecha_fin } }, movidas: [...] }
 */
export function recalcularFechasDelPlan(tareas, feriadosSet, tareaOrigenId) {
  if (!Array.isArray(tareas) || tareas.length === 0) {
    return { cambios: {}, movidas: [] };
  }

  // ─── Indexar tareas ──────────────────────────────────────────────────
  const tareasMap = new Map();
  tareas.forEach(t => tareasMap.set(String(t.id), t));

  // ─── Topological sort (Kahn) ─────────────────────────────────────────
  // Necesitamos procesar tareas en orden de dependencia: primero las que
  // no tienen predecesoras, después las que dependen de ellas, etc.
  
  const grafoSalida = new Map(); // tareaId → [ids de sucesoras]
  const gradosEntrada = new Map(); // tareaId → cantidad de predecesoras

  tareas.forEach(t => {
    const id = String(t.id);
    grafoSalida.set(id, []);
    gradosEntrada.set(id, 0);
  });

  tareas.forEach(t => {
    const id = String(t.id);
    const preds = normalizarPredecesoras(t.predecesoras);
    preds.forEach(p => {
      const predId = String(p.tarea_id);
      if (!tareasMap.has(predId)) return; // predecesora eliminada
      grafoSalida.get(predId).push(id);
      gradosEntrada.set(id, (gradosEntrada.get(id) || 0) + 1);
    });
  });

  // Cola de tareas sin predecesoras pendientes
  const cola = [];
  gradosEntrada.forEach((grado, id) => {
    if (grado === 0) cola.push(id);
  });

  const ordenTopologico = [];
  while (cola.length > 0) {
    const id = cola.shift();
    ordenTopologico.push(id);

    const sucesoras = grafoSalida.get(id) || [];
    sucesoras.forEach(sucId => {
      gradosEntrada.set(sucId, gradosEntrada.get(sucId) - 1);
      if (gradosEntrada.get(sucId) === 0) {
        cola.push(sucId);
      }
    });
  }

  // Si hay ciclos, algunas tareas no se procesan. Agregamos las faltantes al final.
  tareas.forEach(t => {
    const id = String(t.id);
    if (!ordenTopologico.includes(id)) {
      ordenTopologico.push(id);
    }
  });

  // ─── Calcular fechas en orden topológico ─────────────────────────────
  const cambios = {};
  const movidas = [];
  const origenStr = String(tareaOrigenId || '');

  ordenTopologico.forEach(tareaId => {
    const tarea = tareasMap.get(tareaId);
    if (!tarea) return;

    const preds = normalizarPredecesoras(tarea.predecesoras).filter(p => tareasMap.has(String(p.tarea_id)));
    const duracion = Number(tarea.duracion_real_dias) || Number(tarea.cantidad_dias_teoricos) || 1;
    const fechaInicioActual = tarea.fecha_inicio || null;

    // 🔑 Si es la tarea origen O no tiene predecesoras → respetar su fecha actual
    if (tareaId === origenStr || preds.length === 0) {
      // Si no tiene fecha, dejarla como está (o asignar una default)
      return;
    }

    // 🔑 Calcular la fecha mínima permitida según cada predecesora
    let fechaInicioMinima = null; // ISO YYYY-MM-DD
    let fechaFinMinima = null;

    preds.forEach(pred => {
      const predTarea = tareasMap.get(String(pred.tarea_id));
      if (!predTarea) return;

      // Las fechas de la predecesora pueden haber sido recalculadas
      const predCambio = cambios[String(pred.tarea_id)];
      const predInicio = predCambio?.fecha_inicio || predTarea.fecha_inicio;
      const predFin = predCambio?.fecha_fin || predTarea.fecha_fin;
      if (!predInicio || !predFin) return;

      const lag = Number(pred.lag) || 0;
      const tipo = pred.tipo || 'FS';

      let inicioCalculado = null;

      switch (tipo) {
        case 'FS':
          // Sucesora empieza cuando termina predecesora + lag + 1 día
          inicioCalculado = sumarDiasHabiles(predFin, 1 + lag, feriadosSet);
          break;
        case 'SS':
          // Sucesora empieza cuando empieza predecesora + lag
          inicioCalculado = sumarDiasHabiles(predInicio, lag, feriadosSet);
          break;
        case 'FF':
          // Sucesora termina cuando termina predecesora + lag → inicio = fin - duracion
          {
            const finCalculado = sumarDiasHabiles(predFin, lag, feriadosSet);
            inicioCalculado = restarDiasHabiles(finCalculado, duracion - 1, feriadosSet);
          }
          break;
        case 'SF':
          // Sucesora termina cuando empieza predecesora + lag → inicio = fin - duracion
          {
            const finCalculado = sumarDiasHabiles(predInicio, lag, feriadosSet);
            inicioCalculado = restarDiasHabiles(finCalculado, duracion - 1, feriadosSet);
          }
          break;
        default:
          inicioCalculado = sumarDiasHabiles(predFin, 1 + lag, feriadosSet);
      }

      if (!inicioCalculado) return;

      // Con múltiples predecesoras → MAX
      if (!fechaInicioMinima || inicioCalculado > fechaInicioMinima) {
        fechaInicioMinima = inicioCalculado;
      }
    });

    if (!fechaInicioMinima) return; // no se pudo calcular

    // 🔑 Recalcular fecha fin con la duración
    const fechaFinCalculada = sumarDiasHabiles(fechaInicioMinima, duracion - 1, feriadosSet);

    // 🔑 Solo agregar al cambio si efectivamente cambió
    if (fechaInicioMinima !== fechaInicioActual) {
      cambios[tareaId] = {
        fecha_inicio: fechaInicioMinima,
        fecha_fin: fechaFinCalculada,
      };

      // Solo agregar a "movidas" si NO es la origen
      if (tareaId !== origenStr) {
        movidas.push({
          id: tareaId,
          nombre: tarea.tarea_nombre,
          fecha_inicio_anterior: fechaInicioActual,
          fecha_inicio_nueva: fechaInicioMinima,
        });
      }
    }
  });

  return { cambios, movidas };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE DÍAS HÁBILES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Suma N días hábiles a una fecha ISO.
 * Si N = 0, devuelve la misma fecha.
 */
function sumarDiasHabiles(fechaIso, n, feriadosSet) {
  if (!fechaIso) return fechaIso;
  if (n === 0) return fechaIso;

  const fecha = new Date(fechaIso + 'T00:00:00');
  const step = n > 0 ? 1 : -1;
  let contados = 0;
  let iteraciones = 0;
  const objetivo = Math.abs(n);
  const MAX = 3650;

  while (contados < objetivo && iteraciones < MAX) {
    fecha.setDate(fecha.getDate() + step);
    if (esDiaHabil(fecha, feriadosSet)) {
      contados++;
    }
    iteraciones++;
  }

  return fecha.toISOString().slice(0, 10);
}

/**
 * Resta N días hábiles a una fecha ISO.
 */
function restarDiasHabiles(fechaIso, n, feriadosSet) {
  return sumarDiasHabiles(fechaIso, -n, feriadosSet);
}