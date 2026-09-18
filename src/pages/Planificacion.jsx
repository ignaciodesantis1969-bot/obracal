import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import PlanificacionLayout from '@/components/planificacion/PlanificacionLayout';
import InicioTab from '@/components/planificacion/inicio/InicioTab';
import NotificacionesTab from '@/components/planificacion/notificaciones/NotificacionesTab';
import EquipoTab from '@/components/planificacion/equipo/EquipoTab';
import ProyectosTab from '@/components/planificacion/proyectos/ProyectosTab';

export default function Planificacion() {
  const navigate = useNavigate();

  const irADetallePlan = (planId) => {
    navigate(`/planificacion/proyectos/${planId}`);
  };

  return (
    <PlanificacionLayout>
      <Routes>
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<InicioTab />} />
        <Route path="notificaciones" element={<NotificacionesTab />} />
        <Route path="equipo" element={<EquipoTab />} />

        {/* Proyectos - Listado */}
        <Route
          path="proyectos"
          element={<ProyectosTab onVerDetalle={irADetallePlan} />}
        />

        {/* Proyectos - Detalle (placeholder para Paso 5) */}
        <Route
          path="proyectos/:id"
          element={
            <div className="bg-white p-12 rounded-2xl border border-slate-300 shadow-sm text-center space-y-2">
              <p className="text-sm font-bold text-slate-500">
                Detalle del plan — próximamente (Paso 5)
              </p>
              <p className="text-xs text-slate-400">
                Acá vas a poder ver las tareas, asignar personal y ver el Gantt.
              </p>
              <button
                onClick={() => navigate('/planificacion/proyectos')}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Volver al listado
              </button>
            </div>
          }
        />

        <Route path="*" element={<Navigate to="inicio" replace />} />
      </Routes>
    </PlanificacionLayout>
  );
}