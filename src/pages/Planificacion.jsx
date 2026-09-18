import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import PlanificacionLayout from '@/components/planificacion/PlanificacionLayout';
import InicioTab from '@/components/planificacion/inicio/InicioTab';
import NotificacionesTab from '@/components/planificacion/notificaciones/NotificacionesTab';
import EquipoTab from '@/components/planificacion/equipo/EquipoTab';
import ProyectosTab from '@/components/planificacion/proyectos/ProyectosTab';
import ProyectoDetalle from '@/components/planificacion/proyectos/ProyectoDetalle';

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

        {/* Proyectos - Detalle */}
        <Route path="proyectos/:id" element={<ProyectoDetalle />} />

        <Route path="*" element={<Navigate to="inicio" replace />} />
      </Routes>
    </PlanificacionLayout>
  );
}