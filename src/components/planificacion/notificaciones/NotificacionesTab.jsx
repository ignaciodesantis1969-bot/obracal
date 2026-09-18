import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificacionesTab() {
  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-black text-slate-900 uppercase">Notificaciones</h2>
      </div>
      <p className="text-sm text-slate-500">
        Acá van las notificaciones del sistema: tareas asignadas, comentarios, menciones, vencimientos, etc.
      </p>
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">Próximamente: Lista de notificaciones</p>
      </div>
    </div>
  );
}