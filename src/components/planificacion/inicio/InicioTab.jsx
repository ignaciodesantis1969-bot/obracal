import React, { useState, useMemo } from 'react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import InicioHeader from './InicioHeader';
import InicioMiResumen from './InicioMiResumen';
import InicioPulsoProyecto from './InicioPulsoProyecto';
import InicioListaTareas from './InicioListaTareas';
import InicioProximasReuniones from './InicioProximasReuniones';
import Modal from '../shared/Modal';

export default function InicioTab() {
  // 🔑 Lectura de Firestore (se crean vacías automáticamente)
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');
  const { data: tareasFs } = useFirestoreCollection('planificacion_tareas');
  const { data: reunionesFs } = useFirestoreCollection('planificacion_reuniones');

  const extraerArray = (fuente) => (Array.isArray(fuente) ? fuente : []);
  const planes = useMemo(() => extraerArray(planesFs), [planesFs]);
  const tareas = useMemo(() => extraerArray(tareasFs), [tareasFs]);
  const reuniones = useMemo(() => extraerArray(reunionesFs), [reunionesFs]);

  // 🔑 Modales (por ahora vacíos con placeholder)
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
      {/* Header con saludo + botón Nuevo */}
      <InicioHeader
        onNuevaTarea={() => setModalNuevaTarea(true)}
        onNuevaReunion={() => setModalNuevaReunion(true)}
        onNuevoPlan={() => setModalNuevoPlan(true)}
      />

      {/* Fila 1: Mi resumen + Pulso del proyecto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <InicioMiResumen tareas={tareas} planes={planes} />
        </div>
        <div className="lg:col-span-1">
          <InicioPulsoProyecto tareas={tareas} planes={planes} />
        </div>
      </div>

      {/* Fila 2: Tareas hoy + Tareas semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InicioListaTareas titulo="Mis tareas para hoy" tareas={tareasHoy} />
        <InicioListaTareas titulo="Mis tareas para esta semana" tareas={tareasSemana} />
      </div>

      {/* Fila 3: Próximas reuniones */}
      <InicioProximasReuniones reuniones={reuniones} />

      {/* Modales (placeholder por ahora) */}
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

      <Modal
        isOpen={modalNuevoPlan}
        onClose={() => setModalNuevoPlan(false)}
        title="Nuevo Plan de Trabajo"
      >
        <p className="text-sm text-slate-500">Próximamente: formulario para crear un plan vinculado a un presupuesto.</p>
      </Modal>
    </div>
  );
}