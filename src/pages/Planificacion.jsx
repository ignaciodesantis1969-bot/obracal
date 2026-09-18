import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PlanificacionLayout from '@/components/planificacion/PlanificacionLayout';
import InicioTab from '@/components/planificacion/inicio/InicioTab';
import NotificacionesTab from '@/components/planificacion/notificaciones/NotificacionesTab';
import EquipoTab from '@/components/planificacion/equipo/EquipoTab';
import ProyectosTab from '@/components/planificacion/proyectos/ProyectosTab';

export default function Planificacion() {
  return (
    <PlanificacionLayout>
      <Routes>
        <Route index element={<Navigate to="inicio" replace />} />
        <Route path="inicio" element={<InicioTab />} />
        <Route path="notificaciones" element={<NotificacionesTab />} />
        <Route path="equipo" element={<EquipoTab />} />
        <Route path="proyectos" element={<ProyectosTab />} />
        <Route path="*" element={<Navigate to="inicio" replace />} />
      </Routes>
    </PlanificacionLayout>
  );
}