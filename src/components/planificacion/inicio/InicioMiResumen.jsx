import React from 'react';
import { CheckSquare, Clock, Calendar, FolderKanban } from 'lucide-react';

export default function InicioMiResumen({ tareas = [], planes = [] }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const tareasPendientes = tareas.filter(t => t.estado !== 'completada').length;
  const tareasHoy = tareas.filter(t => {
    if (!t.fecha_fin || t.estado === 'completada') return false;
    const f = new Date(t.fecha_fin);
    f.setHours(0, 0, 0, 0);
    return f.getTime() === hoy.getTime();
  }).length;
  const planesActivos = planes.filter(p => p.estado === 'activo').length;

  const cards = [
    {
      label: 'Tareas',
      value: tareasPendientes,
      sublabel: 'pendientes',
      icon: CheckSquare,
      color: 'amber'
    },
    {
      label: 'Hoy',
      value: tareasHoy,
      sublabel: 'vencen hoy',
      icon: Clock,
      color: 'rose'
    },
    {
      label: 'Esta semana',
      value: 0,
      sublabel: 'por vencer',
      icon: Calendar,
      color: 'blue'
    },
    {
      label: 'Planes',
      value: planesActivos,
      sublabel: 'activos',
      icon: FolderKanban,
      color: 'emerald'
    }
  ];

  const colorMap = {
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    rose: 'text-rose-600 bg-rose-50 border-rose-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Mi resumen</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`p-4 rounded-xl border ${colorMap[card.color]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-900">{card.value}</p>
              <p className="text-[10px] text-slate-500 font-medium">{card.sublabel}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}