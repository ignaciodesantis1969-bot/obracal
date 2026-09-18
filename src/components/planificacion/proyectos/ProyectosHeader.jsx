import React from 'react';
import { FolderKanban, Plus, Search } from 'lucide-react';

const FILTROS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'activo',     label: 'Activos' },
  { id: 'borrador',   label: 'Borrador' },
  { id: 'pausado',    label: 'Pausados' },
  { id: 'completado', label: 'Completados' },
  { id: 'archivado',  label: 'Archivados' },
];

export default function ProyectosHeader({
  planes,
  filtroActivo,
  onFiltroChange,
  busqueda,
  onBusquedaChange,
  onNuevoPlan
}) {
  // Stats
  const stats = React.useMemo(() => {
    const total = planes.length;
    const activos = planes.filter(p => p.estado === 'activo').length;
    const borrador = planes.filter(p => p.estado === 'borrador').length;
    const pausados = planes.filter(p => p.estado === 'pausado').length;
    const completados = planes.filter(p => p.estado === 'completado').length;
    const archivados = planes.filter(p => p.estado === 'archivado').length;
    return { total, activos, borrador, pausados, completados, archivados };
  }, [planes]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
      {/* Título + Botón */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 uppercase">
            <FolderKanban className="w-6 h-6 text-amber-500" />
            Proyectos de Trabajo
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.total} plan{stats.total !== 1 ? 'es' : ''} registrado{stats.total !== 1 ? 's' : ''} ·
            {' '}<strong className="text-emerald-600">{stats.activos} activo{stats.activos !== 1 ? 's' : ''}</strong>
          </p>
        </div>

        <button
          onClick={onNuevoPlan}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Plan
        </button>
      </div>

      {/* Filtros + búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200">
        <div className="flex flex-wrap gap-2 flex-1">
          {FILTROS.map(f => {
            const count = f.id === 'todos' ? stats.total : (stats[f.id] || 0);
            if (f.id !== 'todos' && count === 0) return null;
            return (
              <button
                key={f.id}
                onClick={() => onFiltroChange(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroActivo === f.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  filtroActivo === f.id ? 'bg-white/20' : 'bg-white'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar plan o cliente..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </div>
  );
}