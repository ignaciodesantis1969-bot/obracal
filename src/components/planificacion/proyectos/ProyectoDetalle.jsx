// src/components/planificacion/proyectos/ProyectoDetalle.jsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderKanban, ArrowLeft, Loader2 } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import DetalleHeader from './detalle/DetalleHeader';
import DetalleTabs from './detalle/DetalleTabs';
import AsignarResponsableModal from './detalle/AsignarResponsableModal';

export default function ProyectoDetalle() {
  const { id: planId } = useParams();
  const navigate = useNavigate();

  const [isResponsableModalOpen, setIsResponsableModalOpen] = useState(false);

  const { data: planesFs, loading: loadingPlanes } = useFirestoreCollection('planificacion_planes');
  const { data: tareasFs, loading: loadingTareas } = useFirestoreCollection('planificacion_tareas');
  const { data: personalFs } = useFirestoreCollection('personal');
  const { data: insumosFs } = useFirestoreCollection('insumos');
  const { data: usuariosFs } = useFirestoreCollection('usuarios');

  const planes = useMemo(() => (Array.isArray(planesFs) ? planesFs : []), [planesFs]);
  const tareasTodas = useMemo(() => (Array.isArray(tareasFs) ? tareasFs : []), [tareasFs]);
  const personal = useMemo(() => (Array.isArray(personalFs) ? personalFs : []), [personalFs]);
  const insumos = useMemo(() => (Array.isArray(insumosFs) ? insumosFs : []), [insumosFs]);
  const usuarios = useMemo(() => (Array.isArray(usuariosFs) ? usuariosFs : []), [usuariosFs]);

  const plan = useMemo(() => {
    if (!planId) return null;
    return planes.find(p => String(p.id) === String(planId)) || null;
  }, [planes, planId]);

  const tareasDelPlan = useMemo(() => {
    if (!planId) return [];
    return tareasTodas.filter(t => String(t.plan_id || '') === String(planId));
  }, [tareasTodas, planId]);

  if (loadingPlanes || loadingTareas) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-300 shadow-sm text-center flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-sm text-slate-500 font-bold">Cargando plan...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-300 shadow-sm text-center space-y-3">
        <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">Plan no encontrado</p>
        <p className="text-xs text-slate-400">
          El plan que buscás no existe o fue eliminado.
        </p>
        <button
          onClick={() => navigate('/planificacion/proyectos')}
          className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con datos del plan */}
      <DetalleHeader
        plan={plan}
        tareas={tareasDelPlan}
        onVolver={() => navigate('/planificacion/proyectos')}
        onAsignarResponsable={() => setIsResponsableModalOpen(true)}
      />

      {/* Tabs internos */}
      <DetalleTabs
        plan={plan}
        tareas={tareasDelPlan}
        personal={personal}
        insumos={insumos}
      />

      {/* Modal de asignar responsable */}
      <AsignarResponsableModal
        isOpen={isResponsableModalOpen}
        onClose={() => setIsResponsableModalOpen(false)}
        plan={plan}
        usuarios={usuarios}
        onGuardado={() => {
          // Firestore onSnapshot refresca automáticamente
          // No hace falta hacer nada acá
        }}
      />
    </div>
  );
}