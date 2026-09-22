// src/components/planificacion/proyectos/detalle/DetalleHeader.jsx
import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  DollarSign,
  TrendingUp,
  User,
  UserCog,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLES_RESPONSABLES } from '@/lib/planificacionHelpers';

const ESTADO_STYLES = {
  borrador:   { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Borrador' },
  activo:     { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Activo' },
  pausado:    { bg: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pausado' },
  completado: { bg: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completado' },
  archivado:  { bg: 'bg-slate-200 text-slate-700 border-slate-300', label: 'Archivado' },
};

export default function DetalleHeader({
  plan,
  tareas = [],
  onVolver,
  onAsignarResponsable,   // 🔑 NUEVO
}) {
  const estado = ESTADO_STYLES[plan.estado] || ESTADO_STYLES.borrador;

  const stats = useMemo(() => {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.estado === 'completada').length;
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0;
    const costoTotal = tareas.reduce((acc, t) => acc + (Number(t.costo_total) || 0), 0);
    return { total, completadas, porcentaje, costoTotal };
  }, [tareas]);

  const fechaInicio = plan.fecha_inicio ? new Date(plan.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR') : '---';
  const fechaFin = plan.fecha_fin ? new Date(plan.fecha_fin + 'T00:00:00').toLocaleDateString('es-AR') : '---';

  // 🔑 Info del responsable
  const responsableNombre = plan.responsable_nombre || '';
  const responsableEmail = plan.responsable_email || '';
  const responsableRoleId = String(plan.responsable_role || '').toLowerCase();
  const responsableRoleInfo = ROLES_RESPONSABLES.find(r => r.id === responsableRoleId);
  const tieneResponsable = Boolean(plan.responsable_id && responsableNombre);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-4">
      {/* Fila 1: Volver + nombre + estado + responsable */}
      <div className="flex items-start gap-4">
        <button
          onClick={onVolver}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
          title="Volver al listado"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: plan.color || '#f59e0b' }}
            />
            <h1 className="text-xl font-black text-slate-900 truncate">
              {plan.nombre}
            </h1>
            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${estado.bg} shrink-0`}>
              {estado.label}
            </span>
          </div>

          {plan.presupuesto_codigo && (
            <p className="text-xs font-mono text-slate-500 mt-1">
              {plan.presupuesto_codigo}
            </p>
          )}

          {plan.cliente_nombre && (
            <p className="text-xs text-slate-600 mt-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {plan.cliente_nombre}
            </p>
          )}
        </div>

        {/* 🔑 Chip del responsable */}
        <div className="shrink-0">
          {tieneResponsable ? (
            <button
              onClick={onAsignarResponsable}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer group"
              title="Cambiar responsable"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                {String(responsableNombre).charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-[9px] font-black text-blue-900 uppercase leading-tight">
                  {responsableRoleInfo?.label || 'Responsable'}
                </p>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                  {responsableNombre}
                </p>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ) : (
            <button
              onClick={onAsignarResponsable}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-dashed border-amber-400 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
              title="Asignar responsable"
            >
              <UserCog className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-amber-800">
                Asignar responsable
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Fila 2: Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase">Período</p>
            <p className="text-xs font-bold text-slate-800 truncate font-mono">
              {fechaInicio} → {fechaFin}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="p-2 bg-amber-50 rounded-lg">
            <CheckSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Tareas</p>
            <p className="text-xs font-bold text-slate-800">
              {stats.completadas} / {stats.total} <span className="text-slate-400">({stats.porcentaje}%)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Costo</p>
            <p className="text-xs font-bold text-slate-800">
              $ {stats.costoTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="p-2 bg-purple-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">Días-Hombre</p>
            <p className="text-xs font-bold text-slate-800">
              {(plan.total_dias_hombre || 0).toLocaleString('es-AR')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}