import React from 'react';
import { Calendar, CheckSquare, Trash2, Edit2, ArrowRight, User } from 'lucide-react';

const ESTADO_STYLES = {
  borrador:   { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Borrador' },
  activo:     { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Activo' },
  pausado:    { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pausado' },
  completado: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completado' },
  archivado:  { bg: 'bg-slate-200 text-slate-700 border-slate-300', label: 'Archivado' },
};

export default function ProyectoCard({ plan, onVer, onEditar, onEliminar, tareasDelPlan = [] }) {
  if (!plan) return null;

  const estado = ESTADO_STYLES[plan.estado] || ESTADO_STYLES.borrador;
  const totalTareas = plan.total_tareas || tareasDelPlan.length || 0;
  const tareasCompletadas = tareasDelPlan.filter(t => t.estado === 'completada').length;
  const porcentaje = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const fechaInicio = plan.fecha_inicio ? new Date(plan.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR') : '---';
  const fechaFin = plan.fecha_fin ? new Date(plan.fecha_fin + 'T00:00:00').toLocaleDateString('es-AR') : '---';

  return (
    <div
      className="bg-white rounded-2xl border border-slate-300 shadow-sm hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group"
      onClick={() => onVer(plan)}
    >
      <div className="p-5 space-y-4">
        {/* Header: color + nombre + estado */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className="w-3 h-3 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: plan.color || '#f59e0b' }}
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                {plan.nombre}
              </h3>
              {plan.presupuesto_codigo && (
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                  {plan.presupuesto_codigo}
                </p>
              )}
            </div>
          </div>

          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${estado.bg} shrink-0`}>
            {estado.label}
          </span>
        </div>

        {/* Cliente */}
        {plan.cliente_nombre && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{plan.cliente_nombre}</span>
          </div>
        )}

        {/* Fechas */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-mono">{fechaInicio}</span>
          <ArrowRight className="w-3 h-3 text-slate-300" />
          <span className="font-mono">{fechaFin}</span>
        </div>

        {/* Tareas + progreso */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600">
              <strong className="text-slate-900">{totalTareas}</strong> tareas
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${porcentaje}%` }}
              />
            </div>
            <span className="text-xs font-black text-slate-700">{porcentaje}%</span>
          </div>
        </div>
      </div>

      {/* Footer con acciones */}
      <div className="px-5 pb-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEditar(plan); }}
          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
          title="Editar plan"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEliminar(plan); }}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          title="Eliminar plan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}