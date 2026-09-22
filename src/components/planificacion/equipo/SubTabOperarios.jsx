// src/components/planificacion/equipo/SubTabOperarios.jsx
import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, AlertTriangle, Search, Briefcase, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import OperarioGlobalCard from './OperarioGlobalCard';

export default function SubTabOperarios() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [soloConAsignaciones, setSoloConAsignaciones] = useState(false);

  const { data: personalFs, loading: loadingPersonal } = useFirestoreCollection('personal');
  const { data: tareasFs, loading: loadingTareas } = useFirestoreCollection('planificacion_tareas');
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');

  const personal = useMemo(() => (Array.isArray(personalFs) ? personalFs : []), [personalFs]);
  const tareas = useMemo(() => (Array.isArray(tareasFs) ? tareasFs : []), [tareasFs]);
  const planes = useMemo(() => (Array.isArray(planesFs) ? planesFs : []), [planesFs]);

  // ═══════════════════════════════════════════════════════════════════════
  // AGRUPAR OPERARIOS + SUS TAREAS POR PLAN
  // ═══════════════════════════════════════════════════════════════════════

  const operariosConPlanes = useMemo(() => {
    const mapa = new Map();

    // Inicializar con todos los operarios activos
    personal
      .filter(p => String(p.estado || '').toLowerCase() === 'activo')
      .forEach(op => {
        const opId = String(op.id || op.ID);
        mapa.set(opId, {
          id: opId,
          nombre: op.nombre || op.Nombre || 'Operario',
          especialidad: op.especialidad || op.Especialidad || 'Sin especialidad',
          costo_en_mano: Number(op.costo_en_mano) || 0,
          planes: {},              // { planId: { plan, tareas: [] } }
          totalTareas: 0,
          totalDias: 0,
          totalDiasHombre: 0,
          totalCosto: 0,
        });
      });

    // Recorrer tareas
    tareas.forEach(t => {
      const recursos = Array.isArray(t.recursos) ? t.recursos : [];
      const operariosDeLaTarea = recursos.filter(r => r.tipo === 'operario');

      operariosDeLaTarea.forEach(r => {
        const opId = String(r.id);
        if (!mapa.has(opId)) return;

        const op = mapa.get(opId);
        const planId = String(t.plan_id || 'sin-plan');
        const plan = planes.find(p => String(p.id) === planId);

        if (!op.planes[planId]) {
          op.planes[planId] = {
            planId,
            planNombre: plan?.nombre || 'Sin plan',
            planCodigo: plan?.presupuesto_codigo || '',
            clienteNombre: plan?.cliente_nombre || '',
            tareas: [],
          };
        }

        const duracionTarea = Number(t.duracion_real_dias) || 0;
        const diasHombre = Number(t.total_dias_hombre) || 0;
        const costoDiario = Number(r.costo_diario_con_cargas) || 0;

        op.planes[planId].tareas.push({
          tareaId: t.id,
          tarea_nombre: t.tarea_nombre || 'Tarea',
          rubro_nombre: t.rubro_nombre || 'Sin rubro',
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          duracion: duracionTarea,
          diasHombre,
          costo: costoDiario * duracionTarea,
        });

        op.totalTareas += 1;
        op.totalDias += duracionTarea;
        op.totalDiasHombre += diasHombre;
        op.totalCosto += costoDiario * duracionTarea;
      });
    });

    // Convertir planes a array
    return Array.from(mapa.values()).map(op => ({
      ...op,
      planes: Object.values(op.planes),
    }));
  }, [personal, tareas, planes]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILTRAR
  // ═══════════════════════════════════════════════════════════════════════

  const operariosFiltrados = useMemo(() => {
    return operariosConPlanes.filter(op => {
      const busq = busqueda.toLowerCase().trim();
      if (busq) {
        const matchNombre = op.nombre.toLowerCase().includes(busq);
        const matchEspecialidad = op.especialidad.toLowerCase().includes(busq);
        if (!matchNombre && !matchEspecialidad) return false;
      }
      if (filtroEspecialidad && op.especialidad !== filtroEspecialidad) return false;
      if (soloConAsignaciones && op.totalTareas === 0) return false;
      return true;
    }).sort((a, b) => {
      if (a.totalTareas !== b.totalTareas) return b.totalTareas - a.totalTareas;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [operariosConPlanes, busqueda, filtroEspecialidad, soloConAsignaciones]);

  // Especialidades únicas
  const especialidades = useMemo(() => {
    const set = new Set();
    operariosConPlanes.forEach(op => {
      if (op.especialidad) set.add(op.especialidad);
    });
    return Array.from(set).sort();
  }, [operariosConPlanes]);

  // ═══════════════════════════════════════════════════════════════════════
  // KPIs
  // ═══════════════════════════════════════════════════════════════════════

  const kpis = useMemo(() => {
    const total = operariosConPlanes.length;
    const conAsignaciones = operariosConPlanes.filter(op => op.totalTareas > 0).length;
    const sinAsignaciones = total - conAsignaciones;
    const totalDiasHombre = operariosConPlanes.reduce((acc, op) => acc + op.totalDiasHombre, 0);

    return { total, conAsignaciones, sinAsignaciones, totalDiasHombre };
  }, [operariosConPlanes]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (loadingPersonal || loadingTareas) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-300 text-center">
        <p className="text-sm font-bold text-slate-500">Cargando operarios...</p>
      </div>
    );
  }

  if (personal.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <Users className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">No hay operarios cargados</p>
        <p className="text-xs text-slate-400">
          Cargá operarios en Recursos Humanos para verlos acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Operarios" value={kpis.total} icon={Users} color="slate" />
        <KpiCard
          label="Con Asignaciones"
          value={kpis.conAsignaciones}
          icon={UserCheck}
          color="emerald"
        />
        <KpiCard
          label="Disponibles"
          value={kpis.sinAsignaciones}
          icon={UserX}
          color="amber"
        />
        <KpiCard
          label="Días-Hombre Totales"
          value={Math.round(kpis.totalDiasHombre).toLocaleString('es-AR')}
          icon={Briefcase}
          color="blue"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filtroEspecialidad}
          onChange={(e) => setFiltroEspecialidad(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer md:w-56"
        >
          <option value="">Todas las especialidades</option>
          {especialidades.map(esp => (
            <option key={esp} value={esp}>{esp}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSoloConAsignaciones(!soloConAsignaciones)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0',
            soloConAsignaciones
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-50 text-slate-600 border border-slate-300 hover:bg-slate-100'
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Solo con asignaciones
        </button>
      </div>

      {/* Lista */}
      {operariosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <UserX className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Sin resultados</p>
          <p className="text-xs text-slate-400">
            Probá cambiar los filtros o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <p className="text-[11px] font-black text-slate-700 uppercase">
              Operarios ({operariosFiltrados.length})
            </p>
          </div>
          {operariosFiltrados.map(op => (
            <OperarioGlobalCard key={op.id} operario={op} />
          ))}
        </div>
      )}

    </div>
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