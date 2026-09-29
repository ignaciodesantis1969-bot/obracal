// src/components/planificacion/proyectos/detalle/gantt/GanttSidebar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users, FolderKanban, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLORES_ESTADO } from './useGanttCalculos';
import { obtenerIdsPredecesoras } from '@/lib/planificacionHelpers';

// ═══════════════════════════════════════════════════════════════════════════
// ANCHOS DE COLUMNA (deben coincidir con GanttHeader)
// ═══════════════════════════════════════════════════════════════════════════
export const ANCHO_COL_TAREA = 320;
export const ANCHO_COL_FECHA = 90;

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function GanttSidebar({
  filas = [],
  alturaFila = 36,
  onHoverTarea,
  tareaHoverId,
  onToggleRubro,
  onAbrirDependencias,
  onCambiarFecha,
  mostrarCriticas = true,   // 🔑 NUEVO
}) {
  if (!filas || filas.length === 0) {
    return (
      <div
        className="shrink-0 bg-slate-50 border-r border-slate-300 flex items-center justify-center p-4"
        style={{ width: `${ANCHO_COL_TAREA + ANCHO_COL_FECHA * 2}px` }}
      >
        <p className="text-xs text-slate-400 text-center">Sin tareas para mostrar</p>
      </div>
    );
  }

  const anchoTotal = ANCHO_COL_TAREA + ANCHO_COL_FECHA * 2;

  return (
    <div className="shrink-0 bg-slate-50 border-r border-slate-300" style={{ width: `${anchoTotal}px` }}>
      {/* Header con columnas alineadas al GanttHeader */}
      <div
        className="border-b-2 border-slate-300 bg-slate-200 flex items-stretch"
        style={{ height: `${44 + alturaFila * 1.5}px` }}
      >
        <div
          className="px-3 flex items-center border-r border-slate-300"
          style={{ width: `${ANCHO_COL_TAREA}px` }}
        >
          <p className="text-[10px] font-black text-slate-700 uppercase">Rubro / Tarea</p>
        </div>
        <div
          className="flex items-center justify-center border-r border-slate-300"
          style={{ width: `${ANCHO_COL_FECHA}px` }}
        >
          <p className="text-[10px] font-black text-slate-700 uppercase">Inicio</p>
        </div>
        <div
          className="flex items-center justify-center"
          style={{ width: `${ANCHO_COL_FECHA}px` }}
        >
          <p className="text-[10px] font-black text-slate-700 uppercase">Fin</p>
        </div>
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
                'border-b overflow-hidden transition-colors flex items-stretch',
                isRubro ? 'bg-slate-100 border-slate-300' : 'border-slate-200',
                isHover && !isRubro && 'bg-amber-100',
                isHover && isRubro && 'bg-blue-100'
              )}
            >
              {/* Columna nombre */}
              <div
                className="border-r border-slate-200"
                style={{ width: `${ANCHO_COL_TAREA}px` }}
              >
                {isRubro ? (
                  <FilaRubro
                    rubro={fila}
                    alturaFila={alturaFila}
                    onClick={() => onToggleRubro?.(fila.nombre)}
                    mostrarCriticas={mostrarCriticas}   // 🔑 NUEVO
                  />
                ) : (
                  <FilaTarea
                    tarea={fila}
                    alturaFila={alturaFila}
                    esHover={isHover}
                    onHover={onHoverTarea}
                    onAbrirDependencias={onAbrirDependencias}
                    mostrarCriticas={mostrarCriticas}   // 🔑 NUEVO
                  />
                )}
              </div>

              {/* Columnas de fecha — solo tareas, rubros van vacíos */}
              {!isRubro && (
                <>
                  <CeldaFechaEditable
                    valor={fila.fecha_inicio}
                    onCambiar={(nuevaFecha) => onCambiarFecha?.(fila.id, 'fecha_inicio', nuevaFecha)}
                    ancho={ANCHO_COL_FECHA}
                  />
                  <CeldaFechaEditable
                    valor={fila.fecha_fin}
                    onCambiar={(nuevaFecha) => onCambiarFecha?.(fila.id, 'fecha_fin', nuevaFecha)}
                    ancho={ANCHO_COL_FECHA}
                  />
                </>
              )}
              {isRubro && (
                <>
                  <div
                    className="border-r border-slate-300 bg-slate-100"
                    style={{ width: `${ANCHO_COL_FECHA}px` }}
                  />
                  <div
                    className="bg-slate-100"
                    style={{ width: `${ANCHO_COL_FECHA}px` }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CELDA DE FECHA EDITABLE
// ═══════════════════════════════════════════════════════════════════════════

function CeldaFechaEditable({ valor, onCambiar, ancho }) {
  const [editando, setEditando] = useState(false);
  const [valorLocal, setValorLocal] = useState(valor || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setValorLocal(valor || '');
  }, [valor]);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.showPicker?.();
    }
  }, [editando]);

  const handleChange = (e) => {
    const nuevaFecha = e.target.value;
    setValorLocal(nuevaFecha);
    if (nuevaFecha && nuevaFecha !== valor) {
      onCambiar?.(nuevaFecha);
    }
    setTimeout(() => setEditando(false), 100);
  };

  const cancelar = () => {
    setValorLocal(valor || '');
    setEditando(false);
  };

  const formatearFechaCorta = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso + 'T00:00:00');
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = String(d.getFullYear()).slice(-2);
      return `${dia}/${mes}/${anio}`;
    } catch {
      return iso;
    }
  };

  if (editando) {
    return (
      <div
        className="flex items-center justify-center px-1 border-r border-slate-200 bg-amber-50"
        style={{ width: `${ancho}px` }}
      >
        <input
          ref={inputRef}
          type="date"
          value={valorLocal}
          onChange={handleChange}
          onBlur={() => setTimeout(() => setEditando(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancelar();
          }}
          className="w-full text-[10px] font-bold text-slate-800 bg-white border border-amber-400 rounded px-1 py-0.5 outline-none"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className={cn(
        'flex items-center justify-center border-r border-slate-200 text-[10px] font-bold transition-colors cursor-pointer',
        valor ? 'text-slate-700 hover:bg-amber-100' : 'text-slate-400 hover:bg-slate-200 italic'
      )}
      style={{ width: `${ancho}px` }}
      title={valor ? `Click para editar (${valor})` : 'Click para asignar fecha'}
    >
      {formatearFechaCorta(valor)}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILA DE RUBRO
// ═══════════════════════════════════════════════════════════════════════════

export function FilaRubro({ rubro, alturaFila = 36, onClick, mostrarCriticas = true }) {
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
          {/* 🔑 CPM: contador de críticas del rubro */}
          {mostrarCriticas && Number(rubro.tareasCriticas) > 0 && (
            <span className="text-[9px] text-rose-700 font-black">
              {rubro.tareasCriticas}/{rubro.totalTareas} críticas
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
// FILA DE TAREA
// ═══════════════════════════════════════════════════════════════════════════

export function FilaTarea({
  tarea,
  alturaFila = 36,
  esHover,
  onHover,
  onAbrirDependencias,
  mostrarCriticas = true,   // 🔑 NUEVO
}) {
  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const operarios = Array.isArray(tarea.recursos)
    ? tarea.recursos.filter(r => r.tipo === 'operario').length
    : 0;

  const predsCount = obtenerIdsPredecesoras(tarea.predecesoras).length;

  const esCritica = tarea._esCritica && mostrarCriticas;

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
        style={{ backgroundColor: esCritica ? '#dc2626' : color.border }}
        title={esCritica ? 'Tarea crítica' : color.label}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p
            className={cn(
              'text-[11px] font-bold truncate leading-tight',
              esHover
                ? 'text-amber-900'
                : esCritica
                  ? 'text-rose-700'
                  : 'text-slate-800'
            )}
            title={tarea.tarea_nombre}
          >
            {tarea.tarea_nombre || '---'}
          </p>
          {/* 🔑 CPM: badge CRÍTICA */}
          {esCritica && (
            <span className="shrink-0 text-[8px] font-black text-white bg-rose-600 rounded px-1 py-0.5 leading-none uppercase">
              Crítica
            </span>
          )}
        </div>
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