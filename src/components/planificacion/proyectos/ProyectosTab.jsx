import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { FolderKanban } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { eliminarDoc, eliminarDocsFiltrados } from '@/lib/firestoreHelpers';
import { eliminarPlanConTareas } from '@/lib/planificacionHelpers';
import ProyectosHeader from './ProyectosHeader';
import ProyectoCard from './ProyectoCard';
import NuevoPlanModal from './NuevoPlanModal';
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import EmptyState from '../shared/EmptyState';

export default function ProyectosTab({ onVerDetalle }) {
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');
  const { data: tareasFs } = useFirestoreCollection('planificacion_tareas');

  const planes = useMemo(() => (Array.isArray(planesFs) ? planesFs : []), [planesFs]);
  const tareas = useMemo(() => (Array.isArray(tareasFs) ? tareasFs : []), [tareasFs]);

  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [planEditando, setPlanEditando] = useState(null);
  const [planAEliminar, setPlanAEliminar] = useState(null);

  // Filtrar planes
  const planesFiltrados = useMemo(() => {
    let lista = planes;

    if (filtroActivo !== 'todos') {
      lista = lista.filter(p => p.estado === filtroActivo);
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      lista = lista.filter(p =>
        String(p.nombre || '').toLowerCase().includes(q) ||
        String(p.cliente_nombre || '').toLowerCase().includes(q) ||
        String(p.presupuesto_codigo || '').toLowerCase().includes(q)
      );
    }

    return lista.sort((a, b) => {
      const fa = a._creadoEn?.toDate?.() || new Date(a.fecha_inicio || 0);
      const fb = b._creadoEn?.toDate?.() || new Date(b.fecha_inicio || 0);
      return fb - fa;
    });
  }, [planes, filtroActivo, busqueda]);

  // Eliminar plan con cascada a tareas
  const handleEliminarPlan = async (planId) => {
    const toastId = toast.loading('Eliminando plan y tareas...');
    try {
      const resultado = await eliminarPlanConTareas(planId, {
        tareas,
        eliminarDoc,
        eliminarDocsFiltrados,
      });
      toast.success(`Plan eliminado (${resultado.tareasEliminadas || 0} tareas borradas)`, { id: toastId });
    } catch (err) {
      console.error('[ProyectosTab] Error eliminando:', err);
      toast.error('Error al eliminar: ' + (err.message || ''), { id: toastId });
      throw err;
    }
  };

  const handleVerDetalle = (plan) => {
    if (typeof onVerDetalle === 'function') {
      onVerDetalle(plan.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con stats + filtros + botón nuevo */}
      <ProyectosHeader
        planes={planes}
        filtroActivo={filtroActivo}
        onFiltroChange={setFiltroActivo}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        onNuevoPlan={() => setModalCrear(true)}
      />

      {/* Listado de cards */}
      {planesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm">
          <EmptyState
            icon={FolderKanban}
            title={planes.length === 0 ? 'No hay planes de trabajo todavía' : 'No se encontraron planes con esos filtros'}
            description={
              planes.length === 0
                ? 'Creá tu primer plan vinculado a un presupuesto'
                : 'Probá cambiando los filtros o la búsqueda'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {planesFiltrados.map(plan => (
            <ProyectoCard
              key={plan.id}
              plan={plan}
              tareasDelPlan={tareas.filter(t => String(t.plan_id || '') === String(plan.id))}
              onVer={handleVerDetalle}
              onEditar={(p) => setPlanEditando(p)}
              onEliminar={(p) => setPlanAEliminar(p)}
            />
          ))}
        </div>
      )}

      {/* Modal crear / editar */}
      <NuevoPlanModal
        isOpen={modalCrear || !!planEditando}
        planId={planEditando?.id || null}
        onClose={() => {
          setModalCrear(false);
          setPlanEditando(null);
        }}
        onPlanCreado={() => {
          // El hook refresca automáticamente
          console.info('[ProyectosTab] Plan guardado');
        }}
      />

      {/* Modal eliminar */}
      <ConfirmarEliminarModal
        isOpen={!!planAEliminar}
        plan={planAEliminar}
        onClose={() => setPlanAEliminar(null)}
        onConfirm={handleEliminarPlan}
      />
    </div>
  );
}