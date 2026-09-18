import React from 'react';
import { Home, Plus } from 'lucide-react';

export default function InicioTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 space-y-4">
      <div className="flex items-center gap-2">
        <Home className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-black text-slate-900 uppercase">Inicio</h2>
      </div>
      <p className="text-sm text-slate-500">
        Acá va el dashboard principal: resumen de tareas, próximas reuniones, proyectos activos y el botón "+ Nuevo".
      </p>
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
        <Plus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">Próximamente: Dashboard + botón "+ Nuevo"</p>
      </div>
    </div>
  );
}