import React from 'react';
import { CheckSquare } from 'lucide-react';
import EmptyState from '../shared/EmptyState';

export default function InicioListaTareas({ titulo, tareas = [] }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-amber-500" /> {titulo}
      </h3>

      {tareas.length === 0 ? (
        <EmptyState
          title="No hay tareas"
          description="Las tareas que crees van a aparecer acá"
        />
      ) : (
        <div className="space-y-2">
          {tareas.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
              <input
                type="checkbox"
                checked={t.estado === 'completada'}
                readOnly
                className="rounded border-slate-300 text-amber-600 w-4 h-4"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{t.titulo}</p>
                <p className="text-[10px] text-slate-500">{t.fecha_fin || 'Sin fecha'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}