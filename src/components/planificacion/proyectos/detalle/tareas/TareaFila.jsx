import React, { useMemo } from 'react';
import { Users, Calendar, Pencil } from 'lucide-react';

export default function TareaFila({ tarea, personal = [], insumos = [] }) {
  // Recursos asignados (por ahora vacío)
  const recursosAsignados = useMemo(() => {
    if (!Array.isArray(tarea.recursos)) return [];
    return tarea.recursos;
  }, [tarea.recursos]);

  const formatFecha = (iso) => {
    if (!iso) return '---';
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const duracion = Number(tarea.duracion_real_dias) || Number(tarea.cantidad_dias_teoricos) || 0;
  const costo = Number(tarea.costo_total) || 0;

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-amber-50/60 transition-colors items-center text-xs">
      {/* Nombre indentado */}
      <div className="col-span-4 pl-8">
        <p className="font-semibold text-slate-800 truncate" title={tarea.tarea_nombre}>
          {tarea.tarea_nombre}
        </p>
        {tarea.insumo_mo_nombre && (
          <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={tarea.insumo_mo_nombre}>
            {tarea.insumo_mo_nombre}
          </p>
        )}
      </div>

      {/* Duración */}
      <div className="col-span-1 text-center font-bold text-slate-700">
        {duracion} d
      </div>

      {/* Comienzo */}
      <div className="col-span-2 text-center font-mono text-slate-600">
        {formatFecha(tarea.fecha_inicio)}
      </div>

      {/* Fin */}
      <div className="col-span-2 text-center font-mono text-slate-600">
        {formatFecha(tarea.fecha_fin)}
      </div>

      {/* % completado */}
      <div className="col-span-1 text-center">
        <span className="font-bold text-slate-700">
          {Number(tarea.porcentaje_avance) || 0}%
        </span>
      </div>

      {/* Costo + Recursos + Editar */}
      <div className="col-span-2 flex items-center justify-end gap-2">
        <span className="font-bold text-slate-800 font-mono text-[11px]">
          $ {costo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </span>

        {recursosAsignados.length > 0 ? (
          <div className="flex items-center -space-x-1">
            {recursosAsignados.slice(0, 3).map((r, idx) => (
              <div
                key={idx}
                className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border-2 border-white"
                title={r.nombre}
              >
                {String(r.nombre || '?').charAt(0).toUpperCase()}
              </div>
            ))}
            {recursosAsignados.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 text-[9px] font-black flex items-center justify-center border-2 border-white">
                +{recursosAsignados.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300" title="Sin recursos asignados">
            <Users className="w-3 h-3 text-slate-400" />
          </div>
        )}

        <button
          type="button"
          disabled
          className="p-1 text-slate-300 rounded cursor-not-allowed"
          title="Edición disponible en Paso 5B"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}