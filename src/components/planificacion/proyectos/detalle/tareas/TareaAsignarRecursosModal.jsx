import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Users, DollarSign, AlertTriangle, Loader2, Save } from 'lucide-react';
import Modal from '../../../shared/Modal';
import TareaOperarioItem from './TareaOperarioItem';
import TareaSubcontratoItem from './TareaSubcontratoItem';
import { actualizarDoc } from '@/lib/firestoreHelpers';
import {
  calcularCostoDiarioOperario,
  obtenerSubcontratosDeTarea,
  validarSolapamientoOperario,
  calcularFechaFin,
  getFeriadosDelAnio,
} from '@/lib/planificacionHelpers';

export default function TareaAsignarRecursosModal({
  isOpen,
  onClose,
  tarea,
  plan,
  personal = [],
  insumos = [],
  presupuesto,
  tareasDelPlan = [],
  onGuardado,
}) {
  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);
  const [subcontratosSeleccionados, setSubcontratosSeleccionados] = useState([]);
  const [diasManuales, setDiasManuales] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 🔑 % de cargas de la cuadrilla de esta tarea
  const porcentajeCargas = useMemo(() => {
    if (!tarea?.insumo_mo_nombre || !Array.isArray(insumos)) return 76;
    const cuadrilla = insumos.find(i =>
      String(i?.nombre || i?.nombre_del_articulo || '').trim().toLowerCase() ===
      String(tarea.insumo_mo_nombre).trim().toLowerCase()
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
  }, [tarea, insumos]);

  // 🔑 Composición de la cuadrilla (cuántos y quiénes)
  const composicionCuadrilla = useMemo(() => {
    if (!tarea?.insumo_mo_nombre || !Array.isArray(insumos)) return { personas: [], total: 0 };
    const cuadrilla = insumos.find(i =>
      String(i?.nombre || i?.nombre_del_articulo || '').trim().toLowerCase() ===
      String(tarea.insumo_mo_nombre).trim().toLowerCase()
    );
    if (!cuadrilla) return { personas: [], total: 0 };
    try {
      const desc = typeof cuadrilla.descripcion === 'string'
        ? JSON.parse(cuadrilla.descripcion || '{}')
        : (cuadrilla.descripcion || {});
      const items = Array.isArray(desc.items) ? desc.items : [];
      const total = items.reduce((acc, it) => acc + (Number(it.cantidad) || 1), 0);
      return { personas: items, total: total || 1 };
    } catch {
      return { personas: [], total: 0 };
    }
  }, [tarea, insumos]);

  // 🔑 Subcontratos de esta tarea
  const subcontratosDisponibles = useMemo(() => {
    if (!tarea || !presupuesto) return [];
    return obtenerSubcontratosDeTarea(tarea, presupuesto);
  }, [tarea, presupuesto]);

  // 🔑 Inicializar estado desde la tarea
  useEffect(() => {
    if (!isOpen || !tarea) return;

    const recursos = Array.isArray(tarea.recursos) ? tarea.recursos : [];
    const operariosIds = recursos.filter(r => r.tipo === 'operario').map(r => String(r.id));
    const subs = recursos.filter(r => r.tipo === 'subcontrato').map(r => ({
      id: r.subcontrato_id || r.id,
      diasAsignados: Number(r.dias_asignados) || 1,
    }));

    setOperariosSeleccionados(operariosIds);
    setSubcontratosSeleccionados(subs);
    setDiasManuales(Number(tarea.duracion_manual_dias) || 0);
    setIsSaving(false);
  }, [isOpen, tarea]);

  // 🔑 Toggle operario
  const toggleOperario = (operarioId) => {
    const idStr = String(operarioId);
    setOperariosSeleccionados(prev =>
      prev.includes(idStr)
        ? prev.filter(x => x !== idStr)
        : [...prev, idStr]
    );
  };

  // 🔑 Toggle subcontrato
  const toggleSubcontrato = (subcontratoId) => {
    setSubcontratosSeleccionados(prev => {
      const existe = prev.find(s => s.id === subcontratoId);
      if (existe) return prev.filter(s => s.id !== subcontratoId);
      return [...prev, { id: subcontratoId, diasAsignados: 1 }];
    });
  };

  // 🔑 Cambiar días de un subcontrato
  const cambiarDiasSubcontrato = (subcontratoId, dias) => {
    setSubcontratosSeleccionados(prev =>
      prev.map(s => s.id === subcontratoId ? { ...s, diasAsignados: dias } : s)
    );
  };

  // 🔑 Validar solapamiento de operarios
  const conflictos = useMemo(() => {
    const lista = [];
    for (const opId of operariosSeleccionados) {
      const op = personal.find(p => String(p.id || p.ID) === String(opId));
      const res = validarSolapamientoOperario(
        opId,
        tarea.fecha_inicio,
        tarea.fecha_fin,
        tareasDelPlan,
        tarea.id
      );
      if (!res.ok) {
        lista.push({
          operarioId: opId,
          nombre: op?.nombre || op?.Nombre || 'Operario',
          ...res.conflicto,
        });
      }
    }
    return lista;
  }, [operariosSeleccionados, tarea, tareasDelPlan, personal]);

  // 🔑 Cálculo de duración real
  const calculos = useMemo(() => {
    const totalDiasHombre = Number(tarea?.total_dias_hombre) || 0;
    const operariosCount = operariosSeleccionados.length;

    // Si tiene operarios asignados → recalcula duración
    let duracionOperarios = 0;
    if (operariosCount > 0 && totalDiasHombre > 0) {
      duracionOperarios = Math.ceil(totalDiasHombre / operariosCount);
    }

    // Si tiene subcontratos → toma el máximo de los días asignados
    let duracionSubcontratos = 0;
    if (subcontratosSeleccionados.length > 0) {
      duracionSubcontratos = Math.max(...subcontratosSeleccionados.map(s => Number(s.diasAsignados) || 0));
    }

    // 🔑 Duración final: la máxima entre operarios y subcontratos
    let duracionFinal = Math.max(duracionOperarios, duracionSubcontratos);

    // 🔑 Si no hay ni operarios ni subcontratos → usa días manuales
    if (duracionFinal === 0 && diasManuales > 0) {
      duracionFinal = diasManuales;
    }

    // Fallback: la duración teórica
    if (duracionFinal === 0) {
      duracionFinal = Number(tarea?.duracion_real_dias) || Number(tarea?.cantidad_dias_teoricos) || 1;
    }

    // Costo total
    let costoOperarios = 0;
    operariosSeleccionados.forEach(opId => {
      const op = personal.find(p => String(p.id || p.ID) === String(opId));
      if (op) {
        costoOperarios += calcularCostoDiarioOperario(op, porcentajeCargas) * duracionFinal;
      }
    });

    let costoSubcontratos = 0;
    subcontratosSeleccionados.forEach(s => {
      const sub = subcontratosDisponibles.find(x => x.id === s.id);
      if (sub) costoSubcontratos += Number(sub.montoTotal) || 0;
    });

    return {
      totalDiasHombre,
      operariosCount,
      duracionOperarios,
      duracionSubcontratos,
      duracionFinal,
      costoOperarios,
      costoSubcontratos,
      costoTotal: costoOperarios + costoSubcontratos,
    };
  }, [tarea, operariosSeleccionados, subcontratosSeleccionados, diasManuales, personal, porcentajeCargas, subcontratosDisponibles]);

  // 🔑 Guardar
  const handleGuardar = async () => {
    if (conflictos.length > 0) {
      toast.error('Hay operarios con solapamiento de fechas. Corregí antes de guardar.');
      return;
    }

    if (operariosSeleccionados.length > composicionCuadrilla.total) {
      toast.error(`No podés asignar más de ${composicionCuadrilla.total} operarios (composición de la cuadrilla)`);
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando asignación...');

    try {
      // Construir recursos
      const recursos = [];

      operariosSeleccionados.forEach(opId => {
        const op = personal.find(p => String(p.id || p.ID) === String(opId));
        if (op) {
          recursos.push({
            tipo: 'operario',
            id: String(op.id || op.ID),
            nombre: op.nombre || op.Nombre || 'Operario',
            especialidad: op.especialidad || op.Especialidad || 'Operario',
            costo_diario_base: Number(op.costo_en_mano || 0),
            costo_diario_con_cargas: calcularCostoDiarioOperario(op, porcentajeCargas),
          });
        }
      });

      subcontratosSeleccionados.forEach(s => {
        const sub = subcontratosDisponibles.find(x => x.id === s.id);
        if (sub) {
          recursos.push({
            tipo: 'subcontrato',
            subcontrato_id: s.id,
            nombre: sub.nombre,
            monto_total: sub.montoTotal,
            dias_asignados: Number(s.diasAsignados) || 1,
          });
        }
      });

      // 🔑 Recalcular fecha_fin según duración final
      const feriadosSet = getFeriadosDelAnio(
        Number((tarea.fecha_inicio || '').slice(0, 4)) || new Date().getFullYear(),
        []
      );
      const nuevaFechaFin = calcularFechaFin(tarea.fecha_inicio, calculos.duracionFinal, feriadosSet);

      await actualizarDoc('planificacion_tareas', tarea.id, {
        recursos,
        duracion_real_dias: calculos.duracionFinal,
        fecha_fin: nuevaFechaFin,
        costo_total: calculos.costoTotal,
        duracion_manual_dias: (operariosSeleccionados.length === 0 && subcontratosSeleccionados.length === 0)
          ? diasManuales
          : 0,
      });

      toast.success('¡Asignación guardada!', { id: toastId });
      if (typeof onGuardado === 'function') onGuardado();
      onClose();
    } catch (err) {
      console.error('[TareaAsignarRecursos] Error:', err);
      toast.error('Error al guardar: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tarea) return null;

  const sinOperariosNiSubcontratos = operariosSeleccionados.length === 0 && subcontratosSeleccionados.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar Recursos"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Info de la tarea */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase">Tarea</p>
          <p className="text-sm font-bold text-slate-900">{tarea.tarea_nombre}</p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Rubro: {tarea.rubro_nombre}</p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs">
            <span className="text-slate-600">
              <strong className="text-slate-900">{tarea.cantidad_dias_teoricos || 0} días</strong> teóricos
            </span>
            <span className="text-slate-600">
              <strong className="text-slate-900">{tarea.total_dias_hombre || 0} dh</strong> totales
            </span>
            {composicionCuadrilla.total > 0 && (
              <span className="text-slate-600">
                Cuadrilla: <strong className="text-slate-900">{composicionCuadrilla.total}</strong> personas
              </span>
            )}
          </div>
        </div>

        {/* Operarios */}
        {composicionCuadrilla.total > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-black text-slate-900 uppercase">
                Operarios ({operariosSeleccionados.length} / {composicionCuadrilla.total} máx.)
              </h4>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
              {personal.filter(p => String(p.estado || '').toLowerCase() === 'activo').map(op => (
                <TareaOperarioItem
                  key={op.id || op.ID}
                  operario={op}
                  seleccionado={operariosSeleccionados.includes(String(op.id || op.ID))}
                  onToggle={toggleOperario}
                  porcentajeCargas={porcentajeCargas}
                />
              ))}
              {personal.filter(p => String(p.estado || '').toLowerCase() === 'activo').length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 italic">
                  No hay operarios activos
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subcontratos */}
        {subcontratosDisponibles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <h4 className="text-xs font-black text-slate-900 uppercase">
                Subcontratos ({subcontratosDisponibles.length} disponibles)
              </h4>
            </div>
            <div className="space-y-2">
              {subcontratosDisponibles.map(sub => {
                const sel = subcontratosSeleccionados.find(s => s.id === sub.id);
                return (
                  <TareaSubcontratoItem
                    key={sub.id}
                    subcontrato={sub}
                    seleccionado={!!sel}
                    diasAsignados={sel?.diasAsignados || 1}
                    onToggle={() => toggleSubcontrato(sub.id)}
                    onDiasChange={(d) => cambiarDiasSubcontrato(sub.id, d)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Duración manual (solo si no hay MO ni subcontrato) */}
        {composicionCuadrilla.total === 0 && subcontratosDisponibles.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-900">
              Esta tarea no tiene mano de obra ni subcontrato. Ingresá la duración manualmente.
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Días:</label>
              <input
                type="number"
                min="1"
                value={diasManuales}
                onChange={(e) => setDiasManuales(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* Conflictos */}
        {conflictos.length > 0 && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <p className="text-xs font-black text-rose-900 uppercase">
                Conflictos de solapamiento ({conflictos.length})
              </p>
            </div>
            <ul className="space-y-1 text-xs text-rose-800">
              {conflictos.map((c, idx) => (
                <li key={idx}>
                  <strong>{c.nombre}</strong> ya está en <strong>"{c.tarea_nombre}"</strong> del {c.fecha_inicio} al {c.fecha_fin}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resumen */}
        <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase">Resumen</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Operarios:</span>
              <strong className="ml-2">{calculos.operariosCount}</strong>
            </div>
            <div>
              <span className="text-slate-400">Duración real:</span>
              <strong className="ml-2 text-amber-400">{calculos.duracionFinal} días</strong>
            </div>
            <div>
              <span className="text-slate-400">Costo operarios:</span>
              <strong className="ml-2">${calculos.costoOperarios.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
            </div>
            <div>
              <span className="text-slate-400">Costo subcontratos:</span>
              <strong className="ml-2">${calculos.costoSubcontratos.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300">COSTO TOTAL:</span>
            <span className="text-lg font-black text-amber-400">
              ${calculos.costoTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving || conflictos.length > 0}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Asignación
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}