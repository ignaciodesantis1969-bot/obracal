// src/components/planificacion/equipo/OperarioGlobalCard.jsx
import React, { useState } from 'react';
import {
  User,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OperarioGlobalCard({ operario }) {
  const [expandido, setExpandido] = useState(operario.totalTareas > 0);

  const tieneTareas = operario.totalTareas > 0;

  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
    return f;
  };

  const formatearMoneda = (n) =>
    `$ ${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm transition-all">

      {/* Header */}
      <div
        onClick={() => tieneTareas && setExpandido(!expandido)}
        className={cn(
          'px-5 py-4 flex items-center gap-3 transition-colors rounded-t-2xl',
          tieneTareas ? 'cursor-pointer hover:bg-slate-50' : ''
        )}
      >
        {tieneTareas && (
          <div className="shrink-0">
            {expandido ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        )}

        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          tieneTareas ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
        )}>
          <User className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              'text-sm font-black truncate',
              tieneTareas ? 'text-slate-900' : 'text-slate-500'
            )}>
              {operario.nombre}
            </p>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap">
            <span className="flex items-center gap-1 text-slate-500">
              <Briefcase className="w-3 h-3" />
              {operario.especialidad}
            </span>
            {tieneTareas ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-blue-700">
                  {operario.planes.length} plan{operario.planes.length === 1 ? '' : 'es'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-700">
                  {operario.totalTareas} tarea{operario.totalTareas === 1 ? '' : 's'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  {Math.round(operario.totalDias * 10) / 10} días
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-700">
                  {formatearMoneda(operario.totalCosto)}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                ⚪ Disponible — sin asignaciones
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Costo/día</p>
          <p className="text-xs font-black text-slate-700">
            {formatearMoneda(operario.costo_en_mano)}
          </p>
        </div>
      </div>

      {/* Planes y tareas (expandible) */}
      {tieneTareas && expandido && (
        <div className="border-t border-slate-200 bg-slate-50/50">

          {operario.planes.map((plan, planIdx) => (
            <div key={plan.planId} className="px-5 py-3 border-b border-slate-100 last:border-b-0">

              {/* Header del plan */}
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <p className="text-[11px] font-black text-slate-800 truncate">
                  {plan.planCodigo && (
                    <span className="text-blue-700">[{plan.planCodigo}]</span>
                  )}{' '}
                  {plan.planNombre}
                </p>
                <span className="text-[10px] text-slate-500 font-bold shrink-0">
                  ({plan.tareas.length} tarea{plan.tareas.length === 1 ? '' : 's'})
                </span>
              </div>

              {/* Tareas del plan */}
              <div className="space-y-1.5 ml-5">
                {plan.tareas.map((t, tIdx) => (
                  <div
                    key={tIdx}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white border-slate-200"
                  >
                    <div className="w-1 h-6 rounded-full bg-blue-500 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {t.tarea_nombre}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {t.rubro_nombre}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span>{formatearFecha(t.fecha_inicio)}</span>
                      <span>→</span>
                      <span>{formatearFecha(t.fecha_fin)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-700">
                        {Math.round(t.duracion * 10) / 10} d
                      </span>
                    </div>

                    {t.costo > 0 && (
                      <div className="hidden sm:flex items-center gap-1 shrink-0">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-700">
                          {formatearMoneda(t.costo)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ))}

        </div>
      )}

      {/* Mensaje cuando no tiene tareas */}
      {!tieneTareas && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/30 rounded-b-2xl">
          <p className="text-[11px] text-slate-400 italic text-center">
            Este operario está disponible para asignar tareas desde el Gantt de cualquier plan.
          </p>
        </div>
      )}

    </div>
  );
}