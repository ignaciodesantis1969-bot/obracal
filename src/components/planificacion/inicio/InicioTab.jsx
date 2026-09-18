import React, { useState, useMemo, useEffect } from 'react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import InicioHeader from './InicioHeader';
import InicioMiResumen from './InicioMiResumen';
import InicioPulsoProyecto from './InicioPulsoProyecto';
import InicioListaTareas from './InicioListaTareas';
import InicioProximasReuniones from './InicioProximasReuniones';
import Modal from '../shared/Modal';
import NuevoPlanModal from '../proyectos/NuevoPlanModal';

const STORAGE_KEY = 'planificacion_plan_activo_id';

export default function InicioTab() {
  // 🔑 Lectura de Firestore
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');
  const { data: tareasFs } = useFirestoreCollection('planificacion_tareas');
  const { data: reunionesFs } = useFirestoreCollection('planificacion_reuniones');

  const extraerArray = (fuente) => (Array.isArray(fuente) ? fuente : []);
  const planes = useMemo(() => extraerArray(planesFs), [planesFs]);
  const tareasTodas = useMemo(() => extraerArray(tareasFs), [tareasFs]);
  const reunionesTodas = useMemo(() => extraerArray(reunionesFs), [reunionesFs]);

  // 🔑 Plan activo persistido en localStorage
  const [planActivoId, setPlanActivoId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // 🔑 Persistir cuando cambia
  useEffect(() => {
    try {
      if (planActivoId) localStorage.setItem(STORAGE_KEY, planActivoId);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, [planActivoId]);

  // 🔑 Auto-seleccionar el primer plan activo si no hay ninguno seleccionado
  useEffect(() => {
    if (planActivoId) return;
    if (!planes.length) return;

    const primerActivo = planes.find(p => p.estado === 'activo') || planes[0];
    if (primerActivo?.id) setPlanActivoId(primerActivo.id);
  }, [planes, planActivoId]);

  // 🔑 Validar que el plan activo exista (por si lo borraron)
  useEffect(() => {
    if (!planActivoId) return;
    const existe = planes.some(p => p.id === planActivoId);
    if (!existe && planes.length > 0) {
      const primerActivo = planes.find(p => p.estado === 'activo') || planes[0];
      setPlanActivoId(primerActivo?.id || '');
    }
  }, [planes, planActivoId]);

  // 🔑 FILTRAR tareas por plan activo
  const tareas = useMemo(() => {
    if (!planActivoId) return [];
    return tareasTodas.filter(t => String(t.plan_id || '') === String(planActivoId));
  }, [tareasTodas, planActivoId]);

  // 🔑 FILTRAR reuniones por plan activo
  const reuniones = useMemo(() => {
    if (!planActivoId) return [];
    return reunionesTodas.filter(r => String(r.plan_id || '') === String(planActivoId));
  }, [reunionesTodas, planActivoId]);

  const planActivo = useMemo(() => {
    return planes.find(p => p.id === planActivoId) || null;
  }, [planes, planActivoId]);

  // 🔑 Modales
  const [modalNuevaTarea, setModalNuevaTarea] = useState(false);
  const [modalNuevaReunion, setModalNuevaReunion] = useState(false);
  const [modalNuevoPlan, setModalNuevoPlan] = useState(false);

  // 🔑 Tareas para hoy / esta semana
  const tareasHoy = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return tareas.filter(t => {
      if (!t.fecha_fin || t.estado === 'completada') return false;
      const f = new Date(t.fecha_fin);
      f.setHours(0, 0, 0, 0);
      return f.getTime() === hoy.getTime();
    });
  }, [tareas]);

  const tareasSemana = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() + 7);
    return tareas.filter(t => {
      if (!t.fecha_fin || t.estado === 'completada') return false;
      const f = new Date(t.fecha_fin);
      f.setHours(0, 0, 0, 0);
      return f.getTime() > hoy.getTime() && f.getTime() <= fin.getTime();
    });
  }, [tareas]);

  return (
    <div className="space-y-6">
      {/* Header con saludo + botón Nuevo + selector de plan */}
      <InicioHeader
        planes={planes}
        planActivoId={planActivoId}
        onPlanActivoChange={setPlanActivoId}
        onNuevaTarea={() => setModalNuevaTarea(true)}
        onNuevaReunion={() => setModalNuevaReunion(true)}
        onNuevoPlan={() => setModalNuevoPlan(true)}
      />

      {/* Si no hay plan activo seleccionado, mostrar aviso */}
      {!planActivo ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-500">
            No hay ningún plan de trabajo seleccionado.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Creá uno con el botón "+ Nuevo" o seleccioná uno existente arriba.
          </p>
        </div>
      ) : (
        <>
          {/* Fila 1: Mi resumen + Pulso del proyecto */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <InicioMiResumen tareas={tareas} planes={[planActivo]} />
            </div>
            <div className="lg:col-span-1">
              <InicioPulsoProyecto tareas={tareas} planes={[planActivo]} />
            </div>
          </div>

          {/* Fila 2: Tareas hoy + Tareas semana */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InicioListaTareas titulo="Mis tareas para hoy" tareas={tareasHoy} />
            <InicioListaTareas titulo="Mis tareas para esta semana" tareas={tareasSemana} />
          </div>

          {/* Fila 3: Próximas reuniones */}
          <InicioProximasReuniones reuniones={reuniones} />
        </>
      )}

      {/* Modales */}
      <Modal
        isOpen={modalNuevaTarea}
        onClose={() => setModalNuevaTarea(false)}
        title="Nueva Tarea"
      >
        <p className="text-sm text-slate-500">Próximamente: formulario de nueva tarea.</p>
      </Modal>

      <Modal
        isOpen={modalNuevaReunion}
        onClose={() => setModalNuevaReunion(false)}
        title="Nueva Reunión"
      >
        <p className="text-sm text-slate-500">Próximamente: formulario de nueva reunión.</p>
      </Modal>

      <NuevoPlanModal
        isOpen={modalNuevoPlan}
        onClose={() => setModalNuevoPlan(false)}
        onPlanCreado={(nuevoPlanId) => {
          // 🔑 Auto-seleccionar el plan recién creado
          if (nuevoPlanId) setPlanActivoId(nuevoPlanId);
        }}
      />
    </div>
  );
}