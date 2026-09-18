import React, { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NuevoDropdown from './NuevoDropdown';

export default function InicioHeader({ onNuevaTarea, onNuevaReunion, onNuevoPlan }) {
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
    // Capitalizar primera letra
    const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1);

    const nombreCompleto = String(user?.nombre || user?.email || '').trim();
    const primerNombre = nombreCompleto.split(' ')[0] || 'Usuario';

    return {
      saludo: s,
      fechaHoy: fechaCap,
      nombreCorto: primerNombre
    };
  }, [user]);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
  );
}