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

export function calcularPresupuestoMO(tarea, presupuesto) {
  if (!tarea || !presupuesto || !tarea.insumo_mo_nombre) {
    return 0;
  }

  let detalle = presupuesto.items_detalle || presupuesto.itemsDetalle;
  if (typeof detalle === 'string') {
    try { detalle = JSON.parse(detalle); } catch { return 0; }
  }
  const rubros = Array.isArray(detalle?.rubros) ? detalle.rubros : [];
  if (rubros.length === 0) return 0;

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

  let tareaIdx = -1;
  let fuenteTareaIdx = 'ninguna';

  if (Array.isArray(tarea.subtareas) && tarea.subtareas[0]?.tarea_idx !== undefined) {
    tareaIdx = Number(tarea.subtareas[0].tarea_idx);
    fuenteTareaIdx = 'tarea.subtareas[0]';
  }
  else if (tarea.recursos && !Array.isArray(tarea.recursos) && Array.isArray(tarea.recursos.subtareas)) {
    tareaIdx = Number(tarea.recursos.subtareas[0]?.tarea_idx ?? -1);
    fuenteTareaIdx = 'tarea.recursos.subtareas[0]';
  }
  else if (Array.isArray(tarea.recursos)) {
    const elemConSubtareas = tarea.recursos.find(r => r && Array.isArray(r.subtareas) && r.subtareas.length > 0);
    if (elemConSubtareas) {
      tareaIdx = Number(elemConSubtareas.subtareas[0]?.tarea_idx ?? -1);
      fuenteTareaIdx = 'recursos[array].find(subtareas)[0]';
    }
  }
  if (tareaIdx < 0 && tarea.tarea_id !== undefined) {
    tareaIdx = Number(tarea.tarea_id);
    fuenteTareaIdx = 'tarea.tarea_id';
  }
  if (tareaIdx < 0 && tarea.tarea_idx !== undefined) {
    tareaIdx = Number(tarea.tarea_idx);
    fuenteTareaIdx = 'tarea.tarea_idx';
  }

  if (tareaIdx < 0) return 0;

  const tareas = Array.isArray(rubro.tareas) ? rubro.tareas : [];
  if (!tareas[tareaIdx]) return 0;
  const tareaPresupuesto = tareas[tareaIdx];

  const insumosTarea = Array.isArray(tareaPresupuesto.insumos) ? tareaPresupuesto.insumos : [];
  const buscado = normalizarTexto(tarea.insumo_mo_nombre);
  const insumoMO = insumosTarea.find(i =>
    normalizarTexto(i?.nombre || '') === buscado &&
    normalizarTexto(i?.tipo || '').includes('mano de obra')
  );

  if (!insumoMO) return 0;

  const costoUnitarioMO = Number(insumoMO.costo_unitario) || 0;
  const cantidadInsumoMO = Number(insumoMO.cantidad) || 0;
  const cantidadTarea = Number(tarea.cantidad) || 0;

  return costoUnitarioMO * cantidadInsumoMO * cantidadTarea;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-ACOMODO: RECÁLCULO DE FECHAS POR DEPENDENCIAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Suma N días hábiles a una fecha ISO.
 * Soporta n = 0 → devuelve la misma fecha.
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

/**
 * 🔑 NUEVO: Calcula la duración REAL en días hábiles entre dos fechas ISO (inclusive ambos).
 * Se usa para el CPM, en vez de confiar en `duracion_real_dias` que puede estar desactualizado.
 */
function calcularDuracionRealEnDiasHabiles(fechaInicioISO, fechaFinISO, feriadosSet) {
  if (!fechaInicioISO || !fechaFinISO) return 1;

  const inicio = new Date(fechaInicioISO + 'T00:00:00');
  const fin = new Date(fechaFinISO + 'T00:00:00');
  if (fin < inicio) return 1;

  let contador = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (esDiaHabil(cursor, feriadosSet)) contador++;
    cursor.setDate(cursor.getDate() + 1);
  }

  return Math.max(1, contador);
}

/**
 * Recalcula las fechas de todas las tareas respetando las dependencias.
 */
export function recalcularFechasDelPlan(tareas, feriadosSet, tareaOrigenId) {
  if (!Array.isArray(tareas) || tareas.length === 0) {
    return { cambios: {}, movidas: [] };
  }

  const tareasMap = new Map();
  tareas.forEach(t => tareasMap.set(String(t.id), t));

  // Topological sort (Kahn)
  const grafoSalida = new Map();
  const gradosEntrada = new Map();

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
      if (!tareasMap.has(predId)) return;
      grafoSalida.get(predId).push(id);
      gradosEntrada.set(id, (gradosEntrada.get(id) || 0) + 1);
    });
  });

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

  tareas.forEach(t => {
    const id = String(t.id);
    if (!ordenTopologico.includes(id)) {
      ordenTopologico.push(id);
    }
  });

  const cambios = {};
  const movidas = [];
  const origenStr = String(tareaOrigenId || '');

  ordenTopologico.forEach(tareaId => {
    const tarea = tareasMap.get(tareaId);
    if (!tarea) return;

    const preds = normalizarPredecesoras(tarea.predecesoras).filter(p => tareasMap.has(String(p.tarea_id)));
    const duracion = Number(tarea.duracion_real_dias) || Number(tarea.cantidad_dias_teoricos) || 1;
    const fechaInicioActual = tarea.fecha_inicio || null;

    if (tareaId === origenStr || preds.length === 0) {
      return;
    }

    const duracionParaFechas = Math.max(1, Math.ceil(duracion));

    let fechaInicioMinima = null;

    preds.forEach(pred => {
      const predTarea = tareasMap.get(String(pred.tarea_id));
      if (!predTarea) return;

      const predCambio = cambios[String(pred.tarea_id)];
      const predInicio = predCambio?.fecha_inicio || predTarea.fecha_inicio;
      const predFin = predCambio?.fecha_fin || predTarea.fecha_fin;
      if (!predInicio || !predFin) return;

      const lag = Number(pred.lag) || 0;
      const tipo = pred.tipo || 'FS';

      let inicioCalculado = null;

      switch (tipo) {
        case 'FS':
          inicioCalculado = sumarDiasHabiles(predFin, 1 + lag, feriadosSet);
          break;
        case 'SS':
          inicioCalculado = sumarDiasHabiles(predInicio, lag, feriadosSet);
          break;
        case 'FF':
          {
            const finCalculado = sumarDiasHabiles(predFin, lag, feriadosSet);
            inicioCalculado = restarDiasHabiles(finCalculado, duracionParaFechas - 1, feriadosSet);
          }
          break;
        case 'SF':
          {
            const finCalculado = sumarDiasHabiles(predInicio, lag, feriadosSet);
            inicioCalculado = restarDiasHabiles(finCalculado, duracionParaFechas - 1, feriadosSet);
          }
          break;
        default:
          inicioCalculado = sumarDiasHabiles(predFin, 1 + lag, feriadosSet);
      }

      if (!inicioCalculado) return;

      if (!fechaInicioMinima || inicioCalculado > fechaInicioMinima) {
        fechaInicioMinima = inicioCalculado;
      }
    });

    if (!fechaInicioMinima) return;

    const fechaFinCalculada = sumarDiasHabiles(fechaInicioMinima, duracionParaFechas - 1, feriadosSet);

    if (fechaInicioMinima !== fechaInicioActual) {
      cambios[tareaId] = {
        fecha_inicio: fechaInicioMinima,
        fecha_fin: fechaFinCalculada,
      };

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
// CAMINO CRÍTICO (CPM)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula el camino crítico del plan usando CPM.
 * 
 * 🔑 FIX CRÍTICO: la duración se calcula desde las fechas reales (`fecha_inicio` → `fecha_fin`),
 * no desde `duracion_real_dias` (que puede estar desactualizado cuando se mueven fechas).
 */
export function calcularCaminoCritico(tareas, feriadosSet) {
  if (!Array.isArray(tareas) || tareas.length === 0) {
    return { criticas: new Set(), holguras: {}, fechaFinProyecto: null };
  }

  const tareasMap = new Map();
  tareas.forEach(t => tareasMap.set(String(t.id), t));

  // ─── 1) Topological sort (Kahn) ─────────────────────────────────────
  const grafoSalida = new Map();
  const gradosEntrada = new Map();

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
      if (!tareasMap.has(predId)) return;
      grafoSalida.get(predId).push(id);
      gradosEntrada.set(id, (gradosEntrada.get(id) || 0) + 1);
    });
  });

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
      if (gradosEntrada.get(sucId) === 0) cola.push(sucId);
    });
  }

  tareas.forEach(t => {
    const id = String(t.id);
    if (!ordenTopologico.includes(id)) ordenTopologico.push(id);
  });

  // ─── 2) Fecha fin del proyecto = MAX(fecha_fin) ──────────────────────
  let fechaFinProyecto = null;
  tareas.forEach(t => {
    if (!t.fecha_fin) return;
    if (!fechaFinProyecto || t.fecha_fin > fechaFinProyecto) {
      fechaFinProyecto = t.fecha_fin;
    }
  });

  if (!fechaFinProyecto) {
    return { criticas: new Set(), holguras: {}, fechaFinProyecto: null };
  }

  // ─── 3) Backward pass ─────────────────────────────────────────────────
  const lateFinishMap = new Map();
  const lateStartMap = new Map();

  const ordenInverso = [...ordenTopologico].reverse();

  ordenInverso.forEach(tareaId => {
    const tarea = tareasMap.get(tareaId);
    if (!tarea) return;

    // 🔑 FIX: duración en días hábiles reales entre fecha_inicio y fecha_fin
    const duracionParaFechas = calcularDuracionRealEnDiasHabiles(
      tarea.fecha_inicio,
      tarea.fecha_fin,
      feriadosSet
    );

    const sucesoras = (grafoSalida.get(tareaId) || []).filter(sucId => tareasMap.has(sucId));

    let lateFinish = null;

    if (sucesoras.length === 0) {
      lateFinish = fechaFinProyecto;
    } else {
      let minLimite = null;

      sucesoras.forEach(sucId => {
        const sucTarea = tareasMap.get(sucId);
        if (!sucTarea) return;

        const predRef = normalizarPredecesoras(sucTarea.predecesoras)
          .find(p => String(p.tarea_id) === String(tareaId));
        if (!predRef) return;

        const lag = Number(predRef.lag) || 0;
        const tipo = predRef.tipo || 'FS';

        const sucLateStart = lateStartMap.get(sucId);
        const sucLateFinish = lateFinishMap.get(sucId);

        if (!sucLateStart || !sucLateFinish) return;

        let limite = null;

        switch (tipo) {
          case 'FS':
            limite = sumarDiasHabiles(sucLateStart, -(1 + lag), feriadosSet);
            break;
          case 'SS':
            {
              const lateStartLimite = sumarDiasHabiles(sucLateStart, -lag, feriadosSet);
              limite = sumarDiasHabiles(lateStartLimite, duracionParaFechas - 1, feriadosSet);
            }
            break;
          case 'FF':
            limite = sumarDiasHabiles(sucLateFinish, -lag, feriadosSet);
            break;
          case 'SF':
            {
              const lateStartLimite = sumarDiasHabiles(sucLateFinish, -lag, feriadosSet);
              limite = sumarDiasHabiles(lateStartLimite, duracionParaFechas - 1, feriadosSet);
            }
            break;
          default:
            limite = sumarDiasHabiles(sucLateStart, -(1 + lag), feriadosSet);
        }

        if (!limite) return;
        if (!minLimite || limite < minLimite) minLimite = limite;
      });

      lateFinish = minLimite || fechaFinProyecto;
    }

    const lateStart = sumarDiasHabiles(lateFinish, -(duracionParaFechas - 1), feriadosSet);

    lateFinishMap.set(tareaId, lateFinish);
    lateStartMap.set(tareaId, lateStart);
  });

  // ─── 4) Calcular holguras y marcar críticas ──────────────────────────
  const holguras = {};
  const criticas = new Set();

  tareas.forEach(t => {
    const tareaId = String(t.id);
    const earlyStart = t.fecha_inicio;
    const lateStart = lateStartMap.get(tareaId);

    if (!earlyStart || !lateStart) {
      holguras[tareaId] = 0;
      return;
    }

    // Holgura = días hábiles entre earlyStart y lateStart, menos 1 (porque el mismo día cuenta como 0)
    const holguraDias = contarDiasCalendarioHabiles(earlyStart, lateStart, feriadosSet) - 1;
    const holgura = Math.max(0, holguraDias);

    holguras[tareaId] = holgura;

    if (holgura === 0) {
      criticas.add(tareaId);
    }
  });

  return { criticas, holguras, fechaFinProyecto };
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔑 NUEVO: DURACIÓN INCLUSIVA (días corridos, contando ambos extremos)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula la duración en días CORRIDOS entre dos fechas ISO, contando AMBOS extremos.
 * Ej: 13/10 → 15/10 = 3 días (13, 14, 15).
 * Si la fecha fin es anterior a la inicio, devuelve 1 (mínimo).
 * 
 * Se usa para renderizar el ancho de barras en el Gantt y para calcular
 * la duración mostrada en el listado de tareas cuando no hay valor fraccional guardado.
 */
export function calcularDuracionInclusiva(fechaInicioISO, fechaFinISO) {
  if (!fechaInicioISO || !fechaFinISO) return 1;
  const inicio = new Date(fechaInicioISO + 'T00:00:00');
  const fin = new Date(fechaFinISO + 'T00:00:00');
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 1;
  if (fin < inicio) return 1;
  const dias = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, dias);
}