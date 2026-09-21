// src/components/planificacion/proyectos/detalle/equipo/EquipoKpis.jsx
import React from 'react';
import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EquipoKpis({ kpis }) {
  const cards = [
    {
      label: 'Operarios Totales',
      value: kpis.totalOperarios,
      icon: Users,
      color: 'slate',
    },
    {
      label: 'Con Asignaciones',
      value: kpis.conAsignaciones,
      icon: UserCheck,
      color: 'emerald',
      subtitle: kpis.totalAsignaciones > 0
        ? `${kpis.totalAsignaciones} tarea${kpis.totalAsignaciones === 1 ? '' : 's'} asignada${kpis.totalAsignaciones === 1 ? '' : 's'}`
        : 'Sin asignar',
    },
    {
      label: 'Disponibles',
      value: kpis.sinAsignaciones,
      icon: UserX,
      color: 'amber',
      subtitle: 'Sin tareas asignadas',
    },
    {
      label: 'Con Sobrecarga',
      value: kpis.conSobrecarga,
      icon: AlertTriangle,
      color: kpis.conSobrecarga > 0 ? 'rose' : 'slate',
      subtitle: kpis.conSobrecarga > 0
        ? 'Tareas con fechas superpuestas'
        : 'Sin conflictos',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        const colorMap = {
          slate:   { bg: 'bg-slate-100',   text: 'text-slate-700',   accent: 'text-slate-900' },
          emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', accent: 'text-emerald-700' },
          amber:   { bg: 'bg-amber-50',    text: 'text-amber-600',   accent: 'text-amber-700' },
          rose:    { bg: 'bg-rose-50',     text: 'text-rose-600',    accent: 'text-rose-700' },
        };
        const col = colorMap[c.color] || colorMap.slate;

        return (
          <div
            key={idx}
            className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase">{c.label}</p>
              <div className={cn('p-1.5 rounded-lg', col.bg, col.text)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className={cn('text-2xl font-black', col.accent)}>{c.value}</p>
            {c.subtitle && (
              <p className="text-[10px] text-slate-500 leading-tight">{c.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}