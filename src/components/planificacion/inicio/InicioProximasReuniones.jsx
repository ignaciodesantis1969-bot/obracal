import React from 'react';
import { Calendar } from 'lucide-react';
import EmptyState from '../shared/EmptyState';

export default function InicioProximasReuniones({ reuniones = [] }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
        <Calendar className="w-4 h-4 text-amber-500" /> Próximas reuniones
      </h3>

      {reuniones.length === 0 ? (
        <EmptyState
          title="No hay reuniones programadas"
          description="Creá una reunión desde el botón + Nuevo"
        />
      ) : (
        <div className="space-y-2">
          {reuniones.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-center shrink-0">
                <p className="text-[10px] font-black text-amber-600 uppercase">HOY</p>
                <p className="text-xs font-bold text-slate-800">15:00</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">{r.titulo}</p>
                <p className="text-[10px] text-slate-500">{r.proyecto_nombre || 'Sin plan'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}