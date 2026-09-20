// src/components/planificacion/proyectos/detalle/gantt/GanttTooltip.jsx
import React from 'react';
import { Users, DollarSign, Calendar, Percent, AlertTriangle } from 'lucide-react';
import { COLORES_ESTADO, formatearFechaLarga } from './useGanttCalculos';

/**
 * Tooltip flotante que sigue al mouse sobre una barra del Gantt.
 */
export default function GanttTooltip({ tarea, posicion }) {
  if (!tarea || !posicion) return null;

  const estadoKey = String(tarea.estado || 'no_iniciado').toLowerCase();
  const color = COLORES_ESTADO[estadoKey] || COLORES_ESTADO.no_iniciado;

  const operarios = Array.isArray(tarea.recursos)
    ? tarea.recursos.filter(r => r.tipo === 'operario')
    : [];

  const subcontratos = Array.isArray(tarea.recursos)
    ? tarea.recursos.filter(r => r.tipo === 'subcontrato')
    : [];

  const formatearMoneda = (n) =>
    `$ ${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

  // Ajustar posición para que no se salga de la pantalla
  const OFFSET = 12;
  const ANCHO_TOOLTIP = 280;
  const ALTO_TOOLTIP = 260;

  let left = posicion.x + OFFSET;
  let top = posicion.y + OFFSET;

  if (typeof window !== 'undefined') {
    if (left + ANCHO_TOOLTIP > window.innerWidth) {
      left = posicion.x - ANCHO_TOOLTIP - OFFSET;
    }
    if (top + ALTO_TOOLTIP > window.innerHeight) {
      top = Math.max(0, window.innerHeight - ALTO_TOOLTIP - OFFSET);
    }
  }

  return (
    <div
      className="fixed z-50 pointer-events-none bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-3 space-y-2"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${ANCHO_TOOLTIP}px`,
      }}
    >
      {/* Header: nombre + estado */}
      <div className="space-y-1">
        <p className="text-xs font-black leading-tight">{tarea.tarea_nombre}</p>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color.bg }}
          />
          <span className="text-[10px] font-bold text-slate-300 uppercase">
            {color.label}
          </span>
        </div>
        {tarea.rubro_nombre && (
          <p className="text-[10px] text-slate-400 italic">{tarea.rubro_nombre}</p>
        )}
      </div>

      {/* Fechas */}
      <div className="border-t border-slate-700 pt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-[10px]">
          <Calendar className="w-3 h-3 text-amber-400" />
          <span className="text-slate-400">Inicio:</span>
          <span className="font-bold text-white">{formatearFechaLarga(tarea.fecha_inicio)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <Calendar className="w-3 h-3 text-amber-400" />
          <span className="text-slate-400">Fin:</span>
          <span className="font-bold text-white">{formatearFechaLarga(tarea.fecha_fin)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-slate-400">Duración:</span>
          <span className="font-bold text-white">
            {tarea._duracionDias} día{tarea._duracionDias === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Métricas */}
      <div className="border-t border-slate-700 pt-2 space-y-1">
        {Number(tarea.total_dias_hombre) > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Users className="w-3 h-3 text-blue-400" />
            <span className="text-slate-400">Días-hombre:</span>
            <span className="font-bold text-white">{Math.round(Number(tarea.total_dias_hombre))}</span>
          </div>
        )}

        {Number(tarea.costo_total) > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">Costo:</span>
            <span className="font-bold text-white">{formatearMoneda(tarea.costo_total)}</span>
          </div>
        )}

        {Number(tarea.porcentaje_avance) > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Percent className="w-3 h-3 text-purple-400" />
            <span className="text-slate-400">Avance:</span>
            <span className="font-bold text-white">{Math.round(Number(tarea.porcentaje_avance))}%</span>
          </div>
        )}
      </div>

      {/* Recursos */}
      {(operarios.length > 0 || subcontratos.length > 0) && (
        <div className="border-t border-slate-700 pt-2 space-y-1">
          {operarios.length > 0 && (
            <div className="text-[10px]">
              <span className="text-slate-400">
                {operarios.length} operario{operarios.length === 1 ? '' : 's'}:
              </span>
              <div className="text-slate-300 mt-0.5 truncate">
                {operarios.slice(0, 3).map(o => o.nombre).join(', ')}
                {operarios.length > 3 && ` +${operarios.length - 3}`}
              </div>
            </div>
          )}

          {subcontratos.length > 0 && (
            <div className="text-[10px]">
              <span className="text-slate-400">
                {subcontratos.length} subcontrato{subcontratos.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bloqueada (warning) */}
      {estadoKey === 'bloqueada' && (
        <div className="border-t border-rose-500 pt-2 flex items-center gap-1.5 text-[10px] text-rose-300">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-bold">Tarea bloqueada</span>
        </div>
      )}
    </div>
  );
}