// src/components/planificacion/proyectos/detalle/gantt/GanttSidebar.jsx
import React from 'react';
import { ChevronDown, ChevronRight, Users, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO, COLOR_RUBRO } from './useGanttCalculos';

export default function GanttSidebar({
  filas,
  alturaFila = 36,
  onHoverTarea,
  tareaHoverId,
  onToggleRubro,
}) {
  if (!filas || filas.length === 0) {
    return (
      <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-200 flex items-center justify-center p-4">
        <p className="text-xs text-slate-400 text-center">Sin tareas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-200">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 px-3 flex items-center bg-slate-100">
        <p className="text-[10px] font-black text-slate-600 uppercase">Rubro / Tarea</p>
      </div>

      {/* Filas */}
      <div>
        {filas.map((fila) => {
          if (fila._tipo === 'rubro') {
            return (
              <FilaRubro
                key={fila._key}
                rubro={fila}
                alturaFila={alturaFila}
                onClick={() => onToggleRubro?.(fila.nombre)}
              />
            );
          }

          return (
            <FilaTarea
              key={fila._key}
              tarea={fila}
              alturaFila={alturaFila}
              esHover={tareaHoverId === fila.id}
              onHover={onHoverTarea}
            />
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE RUBRO
// ═══════════════════════════════════════════════════════════════════════════

function FilaRubro({ rubro, alturaFila, onClick }) {
  const IconoChevron = rubro._colapsado ? ChevronRight : ChevronDown;

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-3 flex flex-col justify-center border-b border-slate-200 transition-colors cursor-pointer',
        'bg-slate-100 hover:bg-slate-200/70'
      )}
      style={{ height: alturaFila }}
    >
      <div className="flex items-center gap-2">
        <IconoChevron className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <FolderKanban className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <p
          className="text-[11px] font-black text-slate-900 truncate flex-1 uppercase"
          title={rubro.nombre}
        >
          {rubro.nombre}
        </p>
        <span className="text-[10px] font-bold text-slate-500 shrink-0">
          {rubro.tareasCompletadas}/{rubro.totalTareas}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-0.5 pl-5">
        <p className="text-[9px] text-slate-500 font-semibold">
          {rubro.duracionDias} d
        </p>
        {Number(rubro.diasHombreTotal) > 0 && (
          <p className="text-[9px] text-slate-500 font-semibold">
            {Math.round(rubro.diasHombreTotal)} dh
          </p>
        )}
        {Number(rubro.costoTotal) > 0 && (
          <p className="text-[9px] text-slate-500 font-semibold">
            $ {Math.round(rubro.costoTotal).toLocaleString('es-AR')}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE TAREA
// ═══════════════════════════════════════════════════════════════════════════

function FilaTarea({ tarea, alturaFila, esHover, onHover }) {
  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const operarios = Array.isArray(tarea.recursos)
    ? tarea.recursos.filter(r => r.tipo === 'operario').length
    : 0;

  return (
    <div
      onMouseEnter={() => onHover?.(tarea.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'pl-8 pr-3 flex flex-col justify-center border-b border-slate-100 transition-colors cursor-pointer',
        esHover ? 'bg-amber-50' : 'hover:bg-white'
      )}
      style={{ height: alturaFila }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color.border }}
          title={color.label}
        />
        <p
          className={cn(
            'text-[11px] font-bold truncate flex-1',
            esHover ? 'text-amber-900' : 'text-slate-800'
          )}
          title={tarea.tarea_nombre}
        >
          {tarea.tarea_nombre || '---'}
        </p>
      </div>
      <div className="flex items-center gap-3 mt-0.5 pl-4">
        {Number(tarea.total_dias_hombre) > 0 && (
          <span className="text-[9px] text-slate-500 font-semibold">
            {Math.round(Number(tarea.total_dias_hombre))} dh
          </span>
        )}
        {operarios > 0 && (
          <span className="text-[9px] text-blue-600 font-semibold flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" />
            {operarios}
          </span>
        )}
        {Number(tarea._duracionDias) > 0 && (
          <span className="text-[9px] text-slate-400 font-semibold">
            {tarea._duracionDias} d
          </span>
        )}
      </div>
    </div>
  );
}