// src/components/planificacion/proyectos/detalle/DetalleTabs.jsx
import React, { useState } from 'react';
import { CheckSquare, BarChart3, Users, Calendar, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import TareasTab from './tareas/TareasTab';
import ResumenTab from './resumen/ResumenTab';
import GanttTab from './gantt/GanttTab';
import EquipoTab from './equipoDetalle/EquipoTab';   // 🔑 NUEVO

const TABS = [
  { id: 'tareas',   label: 'Tareas',   icon: CheckSquare },
  { id: 'resumen',  label: 'Resumen',  icon: LayoutDashboard },
  { id: 'gantt',    label: 'Gantt',    icon: BarChart3 },
  { id: 'equipo',   label: 'Equipo',   icon: Users },
  { id: 'reuniones', label: 'Reuniones', icon: Calendar },
];

export default function DetalleTabs({ plan, tareas, personal, insumos }) {
  const [tabActiva, setTabActiva] = useState('tareas');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0',
              tabActiva === id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tabActiva === 'tareas' && (
        <TareasTab
          plan={plan}
          tareas={tareas}
          personal={personal}
          insumos={insumos}
        />
      )}

      {tabActiva === 'resumen' && (
        <ResumenTab
          plan={plan}
          tareas={tareas}
          personal={personal}
          insumos={insumos}
        />
      )}

      {tabActiva === 'gantt' && (
        <GanttTab
          plan={plan}
          tareas={tareas}
          personal={personal}
          insumos={insumos}
        />
      )}

      {/* 🔑 NUEVO: Tab Equipo */}
      {tabActiva === 'equipo' && (
        <EquipoTab
          plan={plan}
          tareas={tareas}
          personal={personal}
          insumos={insumos}
        />
      )}

      {tabActiva === 'reuniones' && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-500">Tab Reuniones — próximamente (Paso 5F)</p>
        </div>
      )}
    </div>
  );
}