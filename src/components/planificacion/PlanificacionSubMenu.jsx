import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Bell, Users, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'inicio',         label: 'Inicio',         icon: Home,         path: '/planificacion/inicio' },
  { key: 'notificaciones', label: 'Notificaciones', icon: Bell,         path: '/planificacion/notificaciones' },
  { key: 'equipo',         label: 'Equipo',         icon: Users,        path: '/planificacion/equipo' },
  { key: 'proyectos',      label: 'Proyectos',      icon: FolderKanban, path: '/planificacion/proyectos' },
];

export default function PlanificacionSubMenu() {
  const location = useLocation();

  return (
    <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap">
      {TABS.map(({ key, label, icon: Icon, path }) => {
        const isActive = location.pathname === path || location.pathname.startsWith(path + '/');
        return (
          <NavLink
            key={key}
            to={path}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              isActive
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        );
      })}
    </div>
  );
}