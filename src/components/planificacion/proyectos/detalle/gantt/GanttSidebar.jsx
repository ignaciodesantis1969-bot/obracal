// src/components/planificacion/proyectos/detalle/gantt/GanttSidebar.jsx
import React from 'react';
import { Users, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO, formatearFechaLarga } from './useGanttCalculos';

/**
 * Sidebar izquierdo del Gantt: lista de tareas con info clave.
 */
export default function GanttSidebar({
  tareas,
  alturaFila = 36,
  onHoverTarea,
  tareaHoverId,
}) {
  if (!tareas || tareas.length === 0) {
    return (
      <div className="w-72 shrink-0 bg-slate-50 border-r border-slate-200 flex items-center justify-center p-4">
        <p className="text-xs text-slate-400 text-center">Sin tareas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-72 shrink-0 bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 px-3 flex items-center bg-slate-100">
        <p className="text-[10px] font-black text-slate-600 uppercase">Tarea / Rubro</p>
      </div>

      {/* Filas */}
      <div>
        {tareas.map((t) => {
          const estadoKey = String(t.estado || 'no_iniciado').toLowerCase();
          const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;
          const isHover = tareaHoverId === t.id;

          const operarios = Array.isArray(t.recursos)
            ? t.recursos.filter(r => r.tipo === 'operario').length
            : 0;

          return (
            <div
              key={t.id || t._idx}
              onMouseEnter={() => onHoverTarea?.(t.id)}
              onMouseLeave={() => onHoverTarea?.(null)}
              className={cn(
                'px-3 flex flex-col justify-center border-b border-slate-100 transition-colors cursor-pointer',
                isHover ? 'bg-amber-50' : 'hover:bg-white'
              )}
              style={{ height: alturaFila }}
            >
              <div className="flex items-center gap-2">
                {/* Punto de color por estado */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color.bg }}
                  title={color.label}
                />

                {/* Nombre de la tarea */}
                <p
                  className={cn(
                    'text-[11px] font-bold truncate flex-1',
                    isHover ? 'text-amber-900' : 'text-slate-800'
                  )}
                  title={t.tarea_nombre}
                >
                  {t.tarea_nombre || '---'}
                </p>
              </div>

              {/* Info secundaria: rubro + días-hombre */}
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-[9px] text-slate-400 truncate flex-1">
                  {t.rubro_nombre || 'Sin rubro'}
                </p>
                {Number(t.total_dias_hombre) > 0 && (
                  <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                    {Math.round(Number(t.total_dias_hombre))} dh
                  </span>
                )}
                {operarios > 0 && (
                  <span className="text-[9px] text-blue-600 font-semibold shrink-0 flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5" />
                    {operarios}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}