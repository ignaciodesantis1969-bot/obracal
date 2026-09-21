// src/components/planificacion/proyectos/detalle/reuniones/ReunionesTab.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Calendar as CalendarIcon, List, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';
import { cn } from '@/lib/utils';
import ReunionesCalendario from './ReunionesCalendario';
import ReunionesLista from './ReunionesLista';
import ReunionModal from './ReunionModal';

export default function ReunionesTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [vista, setVista] = useState('calendario'); // 'calendario' | 'lista'
  const [mesActual, setMesActual] = useState(new Date());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reunionEditando, setReunionEditando] = useState(null);
  const [fechaPreseleccionada, setFechaPreseleccionada] = useState(null);

  // 🔑 Leer reuniones desde Firestore
  const { data: reunionesTodas, loading } = useFirestoreCollection('planificacion_reuniones');

  // Filtrar solo las del plan actual
  const reuniones = useMemo(() => {
    if (!Array.isArray(reunionesTodas)) return [];
    return reunionesTodas
      .filter(r => String(r.plan_id || '') === String(plan?.id || ''))
      .sort((a, b) => {
        const fa = `${a.fecha || ''} ${a.hora_inicio || ''}`;
        const fb = `${b.fecha || ''} ${b.hora_inicio || ''}`;
        return fa.localeCompare(fb);
      });
  }, [reunionesTodas, plan?.id]);

  // KPIs
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const proximas = reuniones.filter(r => (r.fecha || '') >= hoy).length;
    const pasadas = reuniones.filter(r => (r.fecha || '') < hoy).length;
    const compromisosPendientes = reuniones.reduce((acc, r) => {
      const comps = Array.isArray(r.compromisos) ? r.compromisos : [];
      return acc + comps.filter(c => !c.completado).length;
    }, 0);
    return { total: reuniones.length, proximas, pasadas, compromisosPendientes };
  }, [reuniones]);

  // Abrir modal para nueva reunión
  const handleNuevaReunion = (fecha = null) => {
    setReunionEditando(null);
    setFechaPreseleccionada(fecha);
    setModalAbierto(true);
  };

  // Abrir modal para editar
  const handleEditarReunion = (reunion) => {
    setReunionEditando(reunion);
    setFechaPreseleccionada(null);
    setModalAbierto(true);
  };

  // Guardar (crear o actualizar)
  const handleGuardarReunion = async (datos) => {
    const toastId = toast.loading(reunionEditando ? 'Actualizando reunión...' : 'Creando reunión...');
    try {
      const payload = {
        ...datos,
        plan_id: plan.id,
      };

      if (reunionEditando) {
        const { _creadoEn, _actualizadoEn, id, ...limpios } = payload;
        await actualizarDoc('planificacion_reuniones', reunionEditando.id, limpios);
        toast.success('Reunión actualizada', { id: toastId });
      } else {
        await crearDoc('planificacion_reuniones', payload);
        toast.success('Reunión creada', { id: toastId });
      }

      setModalAbierto(false);
      setReunionEditando(null);
    } catch (err) {
      console.error('[ReunionesTab] Error:', err);
      toast.error('Error al guardar: ' + (err.message || ''), { id: toastId });
    }
  };

  // Eliminar
  const handleEliminarReunion = async (reunion) => {
    if (!window.confirm(`¿Eliminar la reunión "${reunion.titulo}"?`)) return;
    const toastId = toast.loading('Eliminando...');
    try {
      await eliminarDoc('planificacion_reuniones', reunion.id);
      toast.success('Reunión eliminada', { id: toastId });
    } catch (err) {
      console.error('[ReunionesTab] Error:', err);
      toast.error('Error al eliminar: ' + (err.message || ''), { id: toastId });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Reuniones"
          value={kpis.total}
          icon={CalendarClock}
          color="slate"
        />
        <KpiCard
          label="Próximas"
          value={kpis.proximas}
          icon={CalendarIcon}
          color="blue"
        />
        <KpiCard
          label="Realizadas"
          value={kpis.pasadas}
          icon={CalendarIcon}
          color="emerald"
        />
        <KpiCard
          label="Compromisos Pendientes"
          value={kpis.compromisosPendientes}
          icon={List}
          color={kpis.compromisosPendientes > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Header con vista toggle + botón nueva */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">

        {/* Toggle de vista */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setVista('calendario')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              vista === 'calendario'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Calendario
          </button>
          <button
            onClick={() => setVista('lista')}
            className={cn(
              'px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              vista === 'lista'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <List className="w-3.5 h-3.5" />
            Lista
          </button>
        </div>

        {/* Botón nueva reunión */}
        <button
          onClick={() => handleNuevaReunion()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Reunión
        </button>
      </div>

      {/* Contenido según vista */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-500">Cargando reuniones...</p>
        </div>
      ) : vista === 'calendario' ? (
        <ReunionesCalendario
          reuniones={reuniones}
          mesActual={mesActual}
          setMesActual={setMesActual}
          personal={personal}
          onNuevaReunion={handleNuevaReunion}
          onEditarReunion={handleEditarReunion}
          onEliminarReunion={handleEliminarReunion}
        />
      ) : (
        <ReunionesLista
          reuniones={reuniones}
          personal={personal}
          onNuevaReunion={handleNuevaReunion}
          onEditarReunion={handleEditarReunion}
          onEliminarReunion={handleEliminarReunion}
        />
      )}

      {/* Modal */}
      {modalAbierto && (
        <ReunionModal
          isOpen={modalAbierto}
          onClose={() => {
            setModalAbierto(false);
            setReunionEditando(null);
            setFechaPreseleccionada(null);
          }}
          onGuardar={handleGuardarReunion}
          reunion={reunionEditando}
          fechaPreseleccionada={fechaPreseleccionada}
          personal={personal}
          tareas={tareas}
        />
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