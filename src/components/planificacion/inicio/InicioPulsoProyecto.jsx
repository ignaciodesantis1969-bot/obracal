import React from 'react';
import { Activity } from 'lucide-react';
import EmptyState from '../shared/EmptyState';

export default function InicioPulsoProyecto({ tareas = [], planes = [] }) {
  const porEstado = {
    no_iniciado: tareas.filter(t => t.estado === 'no_iniciado').length,
    en_curso: tareas.filter(t => t.estado === 'en_curso').length,
    terminado: tareas.filter(t => t.estado === 'completada').length,
    a_tiempo: 0,
    atrasado: tareas.filter(t => {
      if (!t.fecha_fin || t.estado === 'completada') return false;
      return new Date(t.fecha_fin) < new Date();
    }).length
  };

  const colores = [
    { key: 'no_iniciado', label: 'No iniciado', color: 'bg-slate-400', count: porEstado.no_iniciado },
    { key: 'en_curso', label: 'En curso', color: 'bg-blue-500', count: porEstado.en_curso },
    { key: 'a_tiempo', label: 'A tiempo', color: 'bg-emerald-500', count: porEstado.a_tiempo },
    { key: 'terminado', label: 'Terminado', color: 'bg-emerald-700', count: porEstado.terminado },
    { key: 'atrasado', label: 'Atrasado', color: 'bg-rose-500', count: porEstado.atrasado }
  ];

  const planesActivos = planes.filter(p => p.estado === 'activo').slice(0, 5);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <Activity className="w-4 h-4 text-amber-500" /> Pulso del proyecto
      </h3>

      {/* Leyenda de estados */}
      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
        {colores.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200">
            <span className={`w-2 h-2 rounded-full ${c.color}`}></span>
            <span className="text-slate-600">{c.label}</span>
            <span className="text-slate-900 font-black">{c.count}</span>
          </div>
        ))}
      </div>

      {/* Planes activos */}
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
          Planes activos ({planesActivos.length})
        </p>
        {planesActivos.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="Sin planes activos"
            description="Creá tu primer plan de trabajo desde el botón + Nuevo"
          />
        ) : (
          <div className="space-y-2">
            {planesActivos.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color || '#f59e0b' }}
                  ></span>
                  <p className="text-xs font-bold text-slate-800 truncate">{p.nombre}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-medium shrink-0">0%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}