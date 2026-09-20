// src/components/planificacion/proyectos/detalle/gantt/GanttHeader.jsx
import React from 'react';
import { Calendar, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIVELES_ZOOM } from './useGanttCalculos';

/**
 * Header del Gantt: eje temporal + controles de zoom.
 */
export default function GanttHeader({
  ticks,
  anchoTotal,
  nivelZoom,
  onCambiarZoom,
  alturaFila = 36,
}) {
  const niveles = Object.values(NIVELES_ZOOM);

  return (
    <div className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-20">

      {/* ─── Barra superior: título + controles zoom ─────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-[10px] font-black text-slate-600 uppercase">Vista Gantt</p>
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          {niveles.map((n) => (
            <button
              key={n.id}
              onClick={() => onCambiarZoom(n.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer',
                nivelZoom.id === n.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Eje temporal ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ height: `${alturaFila * 1.5}px` }}
      >
        <div
          className="absolute top-0 left-0 flex"
          style={{ width: `${anchoTotal}px`, height: '100%' }}
        >
          {ticks.map((tick, idx) => (
            <div
              key={`${tick.iso}-${idx}`}
              className={cn(
                'flex flex-col items-center justify-center border-r border-slate-200 shrink-0',
                tick.esFinde && 'bg-slate-50',
                tick.esInicioMes && 'border-l-2 border-l-slate-400'
              )}
              style={{ width: `${tick.anchoPx}px`, height: '100%' }}
            >
              <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                {tick.label1}
              </span>
              <span className="text-[10px] font-black text-slate-800 leading-tight">
                {tick.label2}
              </span>
              {tick.tipo === 'mes' && (
                <span className="text-[9px] text-slate-400 mt-0.5">
                  {tick.label2}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}