// src/components/planificacion/equipo/SubTabResponsables.jsx
import React, { useState, useMemo } from 'react';
import {
  User,
  UserCog,
  Search,
  Shield,
  FolderKanban,
  Edit2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { actualizarDoc } from '@/lib/firestoreHelpers';
import { cn } from '@/lib/utils';
import { ROLES_RESPONSABLES, usuariosResponsables } from '@/lib/planificacionHelpers';
import Modal from '@/components/planificacion/shared/Modal';

export default function SubTabResponsables() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [reasignarPlan, setReasignarPlan] = useState(null);

  const { data: planesFs, loading: loadingPlanes } = useFirestoreCollection('planificacion_planes');
  const { data: usuariosFs } = useFirestoreCollection('usuarios');

  const planes = useMemo(() => (Array.isArray(planesFs) ? planesFs : []), [planesFs]);
  const usuarios = useMemo(() => (Array.isArray(usuariosFs) ? usuariosFs : []), [usuariosFs]);

  const responsablesDisponibles = useMemo(
    () => usuariosResponsables(usuarios),
    [usuarios]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // AGRUPAR PLANES POR RESPONSABLE
  // ═══════════════════════════════════════════════════════════════════════

  const agrupado = useMemo(() => {
    const porResponsable = new Map();
    const sinAsignar = [];

    planes.forEach(plan => {
      const respId = String(plan.responsable_id || '');

      if (!respId) {
        sinAsignar.push(plan);
        return;
      }

      if (!porResponsable.has(respId)) {
        const user = usuarios.find(u => String(u.id) === respId);
        porResponsable.set(respId, {
          id: respId,
          nombre: plan.responsable_nombre || user?.nombre || 'Usuario',
          email: plan.responsable_email || user?.email || '',
          role: plan.responsable_role || user?.role || user?.rol || '',
          planes: [],
        });
      }
      porResponsable.get(respId).planes.push(plan);
    });

    // Ordenar planes dentro de cada responsable por fecha de inicio
    const lista = Array.from(porResponsable.values()).map(r => ({
      ...r,
      planes: [...r.planes].sort((a, b) =>
        String(a.fecha_inicio || '').localeCompare(String(b.fecha_inicio || ''))
      ),
    }));

    // Ordenar responsables por cantidad de planes descendente
    lista.sort((a, b) => b.planes.length - a.planes.length);

    sinAsignar.sort((a, b) =>
      String(a.fecha_inicio || '').localeCompare(String(b.fecha_inicio || ''))
    );

    return { responsables: lista, sinAsignar };
  }, [planes, usuarios]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILTRAR
  // ═══════════════════════════════════════════════════════════════════════

  const responsablesFiltrados = useMemo(() => {
    return agrupado.responsables.filter(r => {
      const busq = busqueda.toLowerCase().trim();
      if (busq) {
        const matchNombre = r.nombre.toLowerCase().includes(busq);
        const matchEmail = r.email.toLowerCase().includes(busq);
        const matchPlan = r.planes.some(p =>
          String(p.nombre || '').toLowerCase().includes(busq)
        );
        if (!matchNombre && !matchEmail && !matchPlan) return false;
      }
      if (filtroRol && String(r.role || '').toLowerCase() !== filtroRol) return false;
      return true;
    });
  }, [agrupado.responsables, busqueda, filtroRol]);

  // ═══════════════════════════════════════════════════════════════════════
  // KPIs
  // ═══════════════════════════════════════════════════════════════════════

  const kpis = useMemo(() => {
    const totalResponsables = agrupado.responsables.length;
    const totalPlanesAsignados = agrupado.responsables.reduce((acc, r) => acc + r.planes.length, 0);
    const totalSinAsignar = agrupado.sinAsignar.length;
    const planesActivos = planes.filter(p => String(p.estado || '').toLowerCase() === 'activo').length;

    return { totalResponsables, totalPlanesAsignados, totalSinAsignar, planesActivos };
  }, [agrupado, planes]);

  // ═══════════════════════════════════════════════════════════════════════
  // REASIGNAR
  // ═══════════════════════════════════════════════════════════════════════

  const handleReasignar = async (plan, nuevoResponsableId) => {
    const nuevoIdStr = String(nuevoResponsableId || '');
    const actualIdStr = String(plan.responsable_id || '');

    if (nuevoIdStr === actualIdStr) {
      setReasignarPlan(null);
      return;
    }

    const respNuevo = usuarios.find(u => String(u.id) === nuevoIdStr);

    const toastId = toast.loading('Reasignando...');
    try {
      const payload = {
        responsable_id: nuevoIdStr,
        responsable_nombre: respNuevo?.nombre || '',
        responsable_email: respNuevo?.email || '',
        responsable_role: respNuevo?.role || respNuevo?.rol || '',
      };

      await actualizarDoc('planificacion_planes', plan.id, payload);

      // Actualizar presupuesto si existe
      if (plan.presupuesto_id) {
        try {
          await actualizarDoc('presupuestos', plan.presupuesto_id, {
            responsable_id: payload.responsable_id,
            responsable_nombre: payload.responsable_nombre,
            responsable_email: payload.responsable_email,
            responsable_role: payload.responsable_role,
          });
        } catch (err) {
          console.warn('[SubTabResponsables] No se pudo actualizar presupuesto:', err);
        }
      }

      toast.success(
        respNuevo
          ? `Reasignado a ${respNuevo.nombre || respNuevo.email}`
          : 'Responsable removido',
        { id: toastId }
      );
      setReasignarPlan(null);
    } catch (err) {
      console.error('[SubTabResponsables] Error:', err);
      toast.error('Error al reasignar: ' + (err.message || ''), { id: toastId });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (loadingPlanes) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-300 text-center">
        <p className="text-sm font-bold text-slate-500">Cargando responsables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Responsables" value={kpis.totalResponsables} icon={Shield} color="blue" />
        <KpiCard label="Planes Asignados" value={kpis.totalPlanesAsignados} icon={FolderKanban} color="emerald" />
        <KpiCard
          label="Sin Asignar"
          value={kpis.totalSinAsignar}
          icon={AlertTriangle}
          color={kpis.totalSinAsignar > 0 ? 'amber' : 'slate'}
        />
        <KpiCard label="Planes Activos" value={kpis.planesActivos} icon={TrendingUp} color="slate" />
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por responsable o plan..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer md:w-56"
        >
          <option value="">Todos los roles</option>
          {ROLES_RESPONSABLES.map(r => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Sección: Sin asignar (destacada) */}
      {agrupado.sinAsignar.length > 0 && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-400 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-black text-amber-900 uppercase">
              Sin responsable ({agrupado.sinAsignar.length})
            </p>
          </div>
          <div className="space-y-2">
            {agrupado.sinAsignar.map(plan => (
              <div
                key={plan.id}
                className="flex items-center gap-3 bg-white border border-amber-200 rounded-xl px-3 py-2.5"
              >
                <div className="w-1 h-8 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {plan.presupuesto_codigo && (
                      <span className="font-mono text-amber-700">
                        [{plan.presupuesto_codigo}]
                      </span>
                    )}{' '}
                    {plan.nombre || 'Sin nombre'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {plan.cliente_nombre || 'Sin cliente'}
                  </p>
                </div>
                <button
                  onClick={() => setReasignarPlan(plan)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Asignar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de responsables */}
      {responsablesFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <UserCog className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Sin responsables asignados</p>
          <p className="text-xs text-slate-400">
            Asigná un responsable a un plan desde el detalle del plan, o usá el botón "Asignar" en la sección de arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {responsablesFiltrados.map(resp => {
            const rolInfo = ROLES_RESPONSABLES.find(r =>
              r.id === String(resp.role || '').toLowerCase()
            );
            const inicial = String(resp.nombre || resp.email || '?').charAt(0).toUpperCase();

            return (
              <div
                key={resp.id}
                className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden"
              >

                {/* Header del responsable */}
                <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0">
                    {inicial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900 truncate">
                        {resp.nombre}
                      </p>
                      {rolInfo && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase',
                          rolInfo.color
                        )}>
                          {rolInfo.label}
                        </span>
                      )}
                    </div>
                    {resp.email && (
                      <p className="text-[10px] text-slate-500 truncate">
                        {resp.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-600 shrink-0">
                    {resp.planes.length} plan{resp.planes.length === 1 ? '' : 'es'}
                  </span>
                </div>

                {/* Lista de planes */}
                <div className="divide-y divide-slate-100">
                  {resp.planes.map(plan => (
                    <div
                      key={plan.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-1 h-8 rounded-full bg-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {plan.presupuesto_codigo && (
                            <span className="font-mono text-blue-700">
                              [{plan.presupuesto_codigo}]
                            </span>
                          )}{' '}
                          {plan.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {plan.cliente_nombre || 'Sin cliente'}
                          {plan.estado && ` · ${plan.estado}`}
                        </p>
                      </div>
                      <button
                        onClick={() => setReasignarPlan(plan)}
                        className="shrink-0 p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Reasignar responsable"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal de reasignación */}
      {reasignarPlan && (
        <ReasignarModal
          plan={reasignarPlan}
          responsables={responsablesDisponibles}
          onClose={() => setReasignarPlan(null)}
          onGuardar={handleReasignar}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE REASIGNACIÓN INLINE
// ═══════════════════════════════════════════════════════════════════════════

function ReasignarModal({ plan, responsables, onClose, onGuardar }) {
  const [seleccionado, setSeleccionado] = React.useState(String(plan.responsable_id || ''));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Reasignar responsable"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black text-slate-500 uppercase">Plan</p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {plan.nombre}
          </p>
          {plan.presupuesto_codigo && (
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              {plan.presupuesto_codigo}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
            Responsable
          </label>
          <select
            value={seleccionado}
            onChange={(e) => setSeleccionado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Sin responsable --</option>
            {responsables.map(u => {
              const rolLabel = ROLES_RESPONSABLES.find(
                r => r.id === String(u.role || u.rol || '').toLowerCase()
              )?.label || '';
              return (
                <option key={u.id} value={u.id}>
                  {u.nombre || u.email} — {rolLabel}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(plan, seleccionado)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black cursor-pointer shadow-sm"
          >
            Guardar
          </button>
        </div>

      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, icon: Icon, color = 'slate' }) {
  const colorMap = {
    slate:   { bg: 'bg-slate-100',  text: 'text-slate-700',  accent: 'text-slate-900' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',   accent: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600',accent: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',  accent: 'text-amber-700' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase">{label}</p>
        <div className={cn('p-1.5 rounded-lg', c.bg, c.text)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={cn('text-2xl font-black', c.accent)}>{value}</p>
    </div>
  );
}