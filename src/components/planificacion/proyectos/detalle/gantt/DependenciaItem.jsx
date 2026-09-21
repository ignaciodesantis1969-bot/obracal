// src/components/planificacion/proyectos/detalle/gantt/DependenciaItem.jsx
import React from 'react';
import { Trash2, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPOS_DEPENDENCIA } from '@/lib/planificacionHelpers';

/**
 * Fila de una dependencia en el modal.
 * Modo "editable" → muestra selectores y botón eliminar.
 * Modo "readonly" → solo lectura.
 */
export default function DependenciaItem({
  dependencia,
  tareas = [],
  editable = false,
  onCambiarTipo,
  onCambiarLag,
  onEliminar,
  tareasExcluidas = [],
}) {
  const tarea = tareas.find(t => String(t.id) === String(dependencia.tarea_id));

  const tipoInfo = TIPOS_DEPENDENCIA.find(t => t.id === dependencia.tipo) || TIPOS_DEPENDENCIA[0];

  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
    return f;
  };

  // Tareas disponibles para el select (excluye las ya elegidas + esta misma tarea)
  const tareasDisponibles = tareas.filter(t => {
    if (String(t.id) === String(dependencia.tarea_id)) return true; // la actual siempre visible
    return !tareasExcluidas.includes(String(t.id));
  });

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors',
        editable
          ? 'bg-white border-slate-200 hover:border-slate-300'
          : 'bg-slate-50 border-slate-200'
      )}
    >
      {/* Ícono */}
      <div className="shrink-0 w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
        <LinkIcon className="w-3.5 h-3.5" />
      </div>

      {/* Nombre de la tarea */}
      <div className="flex-1 min-w-0">
        {editable ? (
          <select
            value={dependencia.tarea_id}
            onChange={(e) => onCambiarTipo && null /* se maneja en el padre */}
            className="w-full bg-transparent border-0 outline-none text-xs font-bold text-slate-800 cursor-pointer truncate"
            disabled
          >
            {/* Solo lectura porque el cambio de tarea se hace eliminando + agregando */}
            <option value={dependencia.tarea_id}>
              {tarea?.tarea_nombre || 'Tarea no encontrada'}
            </option>
          </select>
        ) : (
          <p className="text-xs font-bold text-slate-800 truncate">
            {tarea?.tarea_nombre || 'Tarea no encontrada'}
          </p>
        )}
        <p className="text-[10px] text-slate-500 truncate">
          {tarea?.rubro_nombre || ''}
          {tarea?.fecha_inicio && tarea?.fecha_fin && (
            <>
              {' · '}
              {formatearFecha(tarea.fecha_inicio)} → {formatearFecha(tarea.fecha_fin)}
            </>
          )}
        </p>
      </div>

      {/* Tipo de dependencia */}
      {editable ? (
        <select
          value={dependencia.tipo}
          onChange={(e) => onCambiarTipo && onCambiarTipo(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer shrink-0"
          title={tipoInfo.descripcion}
        >
          {TIPOS_DEPENDENCIA.map(t => (
            <option key={t.id} value={t.id}>
              {t.id} — {t.label}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded shrink-0">
          {dependencia.tipo}
        </span>
      )}

      {/* Lag */}
      {editable && (
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            value={dependencia.lag || 0}
            onChange={(e) => onCambiarLag && onCambiarLag(Number(e.target.value) || 0)}
            className="w-12 bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-[10px] font-bold text-center text-slate-700 outline-none focus:border-amber-500"
            title="Días de espera (lag)"
          />
          <span className="text-[9px] text-slate-400 font-bold">d</span>
        </div>
      )}

      {/* Botón eliminar (solo editable) */}
      {editable && onEliminar && (
        <button
          type="button"
          onClick={onEliminar}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
          title="Eliminar dependencia"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

    </div>
  );
}