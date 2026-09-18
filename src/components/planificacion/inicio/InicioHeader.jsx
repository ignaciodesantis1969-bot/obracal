import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FolderKanban } from 'lucide-react';
import NuevoDropdown from './NuevoDropdown';

export default function InicioHeader({
  planes = [],
  planActivoId,
  onPlanActivoChange,
  onNuevaTarea,
  onNuevaReunion,
  onNuevoPlan
}) {
  const { user } = useAuth();

  const { saludo, fechaHoy, nombreCorto } = useMemo(() => {
    const hora = new Date().getHours();
    let s = 'Buenas noches';
    if (hora < 12) s = 'Buenos días';
    else if (hora < 19) s = 'Buenas tardes';

    const fecha = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1);

    const nombreCompleto = String(user?.nombre || user?.email || '').trim();
    const primerNombre = nombreCompleto.split(' ')[0] || 'Usuario';

    return { saludo: s, fechaHoy: fechaCap, nombreCorto: primerNombre };
  }, [user]);

  // 🔑 Planes disponibles (activos + borrador + pausados)
  const planesDisponibles = useMemo(() => {
    return planes.filter(p =>
      p.estado === 'activo' ||
      p.estado === 'borrador' ||
      p.estado === 'pausado'
    );
  }, [planes]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {saludo}, {nombreCorto}
          </h2>
          <p className="text-slate-500 text-sm mt-1">{fechaHoy}</p>
        </div>

        <NuevoDropdown
          onNuevaTarea={onNuevaTarea}
          onNuevaReunion={onNuevaReunion}
          onNuevoPlan={onNuevoPlan}
        />
      </div>

      {/* 🔑 NUEVO: Selector de plan activo */}
      {planesDisponibles.length > 0 && (
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <FolderKanban className="w-4 h-4 text-amber-500" />
            Plan activo:
          </label>
          <select
            value={planActivoId || ''}
            onChange={(e) => onPlanActivoChange(e.target.value)}
            className="w-full sm:w-96 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Seleccionar plan --</option>
            {planesDisponibles.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.estado})
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}