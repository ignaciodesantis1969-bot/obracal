import React, { useMemo } from 'react';
import { Users, DollarSign, Pencil } from 'lucide-react';

export default function TareaFila({ tarea, personal = [], insumos = [], onEditar }) {
  // 🔑 Recursos asignados a esta tarea
  const recursosAsignados = useMemo(() => {
    if (!Array.isArray(tarea.recursos)) return [];
    return tarea.recursos;
  }, [tarea.recursos]);

  const operariosAsignados = useMemo(
    () => recursosAsignados.filter(r => r.tipo === 'operario'),
    [recursosAsignados]
  );

  const subcontratosAsignados = useMemo(
    () => recursosAsignados.filter(r => r.tipo === 'subcontrato'),
    [recursosAsignados]
  );

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
  const tieneRecursos = recursosAsignados.length > 0;

  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-2.5 hover:bg-amber-50/60 transition-colors items-center text-xs">
      {/* 🔑 Nombre indentado + insumo MO */}
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

      {/* 🔑 Costo + Recursos + Editar */}
      <div className="col-span-2 flex items-center justify-end gap-2">
        {/* Costo */}
        <span
          className={`font-bold font-mono text-[11px] ${costo > 0 ? 'text-slate-800' : 'text-slate-400'}`}
          title={`Costo total: $${costo.toLocaleString('es-AR')}`}
        >
          $ {costo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
        </span>

        {/* Avatares de recursos */}
        {tieneRecursos ? (
          <div className="flex items-center -space-x-1">
            {/* Operarios (avatares con inicial) */}
            {operariosAsignados.slice(0, 2).map((r, idx) => (
              <div
                key={`op-${idx}`}
                className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border-2 border-white shadow-sm"
                title={`${r.nombre} (${r.especialidad || 'Operario'})`}
              >
                {String(r.nombre || '?').charAt(0).toUpperCase()}
              </div>
            ))}

            {/* Subcontratos (icono $ azul) */}
            {subcontratosAsignados.slice(0, 1).map((r, idx) => (
              <div
                key={`sub-${idx}`}
                className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white shadow-sm"
                title={`Subcontrato: ${r.nombre}`}
              >
                <DollarSign className="w-3 h-3" />
              </div>
            ))}

            {/* Contador si hay más de 3 */}
            {recursosAsignados.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 text-[9px] font-black flex items-center justify-center border-2 border-white">
                +{recursosAsignados.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-300"
            title="Sin recursos asignados"
          >
            <Users className="w-3 h-3 text-slate-400" />
          </div>
        )}

        {/* Botón editar */}
        <button
          type="button"
          onClick={() => onEditar && onEditar(tarea)}
          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
          title="Asignar recursos / editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}