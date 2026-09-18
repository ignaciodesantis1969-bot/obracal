import React from 'react';
import PlanificacionSubMenu from './PlanificacionSubMenu';

export default function PlanificacionLayout({ children }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Planificación</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestión de proyectos, tareas, reuniones y equipos vinculados a los presupuestos de obra.
        </p>
      </div>

      {/* Sub-menú de tabs */}
      <PlanificacionSubMenu />

      {/* Contenido de la tab activa */}
      {children}
    </div>
  );
}