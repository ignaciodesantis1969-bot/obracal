// src/components/planificacion/proyectos/detalle/equipoDetalle/EquipoFiltros.jsx
import React from 'react';
import { Search, Filter, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EquipoFiltros({
  busqueda,
  setBusqueda,
  filtroEspecialidad,
  setFiltroEspecialidad,
  especialidades,
  soloConAsignaciones,
  setSoloConAsignaciones,
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">

        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o especialidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
          />
        </div>

        {/* Filtro por especialidad */}
        <div className="relative md:w-64">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filtroEspecialidad}
            onChange={(e) => setFiltroEspecialidad(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-amber-500 cursor-pointer appearance-none"
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map(esp => (
              <option key={esp} value={esp}>{esp}</option>
            ))}
          </select>
        </div>

        {/* Toggle solo con asignaciones */}
        <button
          type="button"
          onClick={() => setSoloConAsignaciones(!soloConAsignaciones)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0',
            soloConAsignaciones
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-slate-50 text-slate-600 border border-slate-300 hover:bg-slate-100'
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Solo con asignaciones
        </button>

      </div>
    </div>
  );
}