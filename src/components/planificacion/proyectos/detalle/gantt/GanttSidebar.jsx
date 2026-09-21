// src/components/planificacion/proyectos/detalle/gantt/GanttSidebar.jsx
import React from 'react';
import { ChevronDown, ChevronRight, Users, FolderKanban, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO } from './useGanttCalculos';
import { obtenerIdsPredecesoras } from '@/lib/planificacionHelpers';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE DEFAULT (compatibilidad hacia atrás)
// ═══════════════════════════════════════════════════════════════════════════

export default function GanttSidebar({
  filas = [],
  alturaFila = 36,
  onHoverTarea,
  tareaHoverId,
  onToggleRubro,
  onAbrirDependencias,   // 🔑 NUEVO: callback al abrir el modal
}) {
  if (!filas || filas.length === 0) {
    return (
      <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-300 flex items-center justify-center p-4">
        <p className="text-xs text-slate-400 text-center">Sin tareas para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-300">
      <div
        className="border-b-2 border-slate-300 px-3 flex items-center bg-slate-200"
        style={{ height: `${44 + alturaFila * 1.5}px` }}
      >
        <p className="text-[10px] font-black text-slate-700 uppercase">Rubro / Tarea</p>
      </div>

      <div>
        {filas.map((fila) => {
          const isRubro = fila._tipo === 'rubro';
          const isHover = tareaHoverId === (isRubro ? `rubro-${fila.nombre}` : fila.id);

          return (
            <div
              key={fila._key}
              style={{ height: `${alturaFila}px` }}
              className={cn(
                'border-b overflow-hidden transition-colors',
                isRubro ? 'bg-slate-100 border-slate-300' : 'border-slate-200',
                isHover && !isRubro && 'bg-amber-100',
                isHover && isRubro && 'bg-blue-100'
              )}
            >
              {isRubro ? (
                <FilaRubro
                  rubro={fila}
                  alturaFila={alturaFila}
                  onClick={() => onToggleRubro?.(fila.nombre)}
                />
              ) : (
                <FilaTarea
                  tarea={fila}
                  alturaFila={alturaFila}
                  esHover={isHover}
                  onHover={onHoverTarea}
                  onAbrirDependencias={onAbrirDependencias}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE RUBRO
// ═══════════════════════════════════════════════════════════════════════════

export function FilaRubro({ rubro, alturaFila = 36, onClick }) {
  const IconoChevron = rubro._colapsado ? ChevronRight : ChevronDown;

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-3 flex items-center gap-2 transition-colors cursor-pointer h-full w-full',
        'hover:bg-slate-200'
      )}
    >
      <IconoChevron className="w-3.5 h-3.5 text-slate-700 shrink-0" />
      <FolderKanban className="w-3.5 h-3.5 text-blue-700 shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-black text-slate-900 truncate uppercase leading-tight"
          title={rubro.nombre}
        >
          {rubro.nombre}
        </p>
        <div className="flex items-center gap-2 leading-tight">
          <span className="text-[9px] text-slate-600 font-semibold">
            {rubro.duracionDias} d
          </span>
          {Number(rubro.diasHombreTotal) > 0 && (
            <span className="text-[9px] text-slate-600 font-semibold">
              {Math.round(rubro.diasHombreTotal)} dh
            </span>
          )}
        </div>
      </div>
      <span className="text-[10px] font-bold text-slate-600 shrink-0">
        {rubro.tareasCompletadas}/{rubro.totalTareas}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE TAREA (con botón de dependencias)
// ═══════════════════════════════════════════════════════════════════════════

export function FilaTarea({ tarea, alturaFila = 36, esHover, onHover, onAbrirDependencias }) {
  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const operarios = Array.isArray(tarea.recursos)
    ? tarea.recursos.filter(r => r.tipo === 'operario').length
    : 0;

  // 🔑 Contar predecesoras (para mostrar en el badge del botón)
  const predsCount = obtenerIdsPredecesoras(tarea.predecesoras).length;

  return (
    <div
      onMouseEnter={() => onHover?.(tarea.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'pl-8 pr-3 flex items-center gap-2 transition-colors h-full w-full group',
        'hover:bg-slate-50'
      )}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color.border }}
        title={color.label}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-[11px] font-bold truncate leading-tight',
            esHover ? 'text-amber-900' : 'text-slate-800'
          )}
          title={tarea.tarea_nombre}
        >
          {tarea.tarea_nombre || '---'}
        </p>
        <div className="flex items-center gap-2 leading-tight">
          {Number(tarea.total_dias_hombre) > 0 && (
            <span className="text-[9px] text-slate-600 font-semibold">
              {Math.round(Number(tarea.total_dias_hombre))} dh
            </span>
          )}
          {operarios > 0 && (
            <span className="text-[9px] text-blue-700 font-semibold flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5" />
              {operarios}
            </span>
          )}
          {Number(tarea._duracionDias) > 0 && (
            <span className="text-[9px] text-slate-500 font-semibold">
              {tarea._duracionDias} d
            </span>
          )}
        </div>
      </div>

      {/* 🔑 Botón de dependencias */}
      {onAbrirDependencias && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAbrirDependencias(tarea);
          }}
          className={cn(
            'shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all cursor-pointer',
            predsCount > 0
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 opacity-100'
              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 opacity-0 group-hover:opacity-100'
          )}
          title={
            predsCount > 0
              ? `${predsCount} predecesora${predsCount === 1 ? '' : 's'} — click para editar`
              : 'Agregar dependencias'
          }
        >
          <LinkIcon className="w-3 h-3" />
          {predsCount > 0 && (
            <span className="text-[9px] font-black">{predsCount}</span>
          )}
        </button>
      )}
    </div>
  );
}