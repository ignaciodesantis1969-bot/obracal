import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import TareaFila from './TareaFila';

export default function TareaGrupoRubro({ rubro, personal = [], insumos = [] }) {
  const [abierto, setAbierto] = useState(true);

  // Calcular stats del rubro (duración + rango fechas)
  const stats = useMemo(() => {
    if (!rubro.tareas || rubro.tareas.length === 0) {
      return { duracionTotal: 0, fechaMin: null, fechaMax: null };
    }

    let duracionTotal = 0;
    let fechaMin = null;
    let fechaMax = null;

    rubro.tareas.forEach(t => {
      duracionTotal += Number(t.duracion_real_dias) || 0;

      if (t.fecha_inicio) {
        if (!fechaMin || t.fecha_inicio < fechaMin) fechaMin = t.fecha_inicio;
        if (!fechaMax || t.fecha_inicio > fechaMax) fechaMax = t.fecha_inicio;
      }
      if (t.fecha_fin) {
        if (!fechaMax || t.fecha_fin > fechaMax) fechaMax = t.fecha_fin;
      }
    });

    return { duracionTotal, fechaMin, fechaMax };
  }, [rubro.tareas]);

  const formatFecha = (iso) => {
    if (!iso) return '---';
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      {/* Fila del rubro (padre) */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full grid grid-cols-12 gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 transition-colors text-left cursor-pointer items-center"
      >
        <div className="col-span-4 flex items-center gap-2 font-black text-slate-900 text-xs uppercase">
          {abierto ? (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
          )}
          <span className="truncate">{rubro.rubro_nombre}</span>
        </div>
        <div className="col-span-1 text-center text-xs font-bold text-slate-700">
          {stats.duracionTotal} d
        </div>
        <div className="col-span-2 text-center text-xs font-semibold text-slate-600 font-mono">
          {formatFecha(stats.fechaMin)}
        </div>
        <div className="col-span-2 text-center text-xs font-semibold text-slate-600 font-mono">
          {formatFecha(stats.fechaMax)}
        </div>
        <div className="col-span-1 text-center text-xs font-bold text-slate-500">—</div>
        <div className="col-span-2 text-right text-xs font-bold text-slate-500">—</div>
      </button>

      {/* Tareas hijas */}
      {abierto && (
        <div className="divide-y divide-slate-100 bg-amber-50/20">
          {rubro.tareas.map(t => (
            <TareaFila
              key={t.id}
              tarea={t}
              personal={personal}
              insumos={insumos}
            />
          ))}
        </div>
      )}
    </div>
  );
}