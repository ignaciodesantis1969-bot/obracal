import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TareaOperarioItem({
  operario,
  seleccionado,
  onToggle,
  porcentajeCargas = 76,
  disabled = false,
}) {
  const sueldoBase = Number(operario?.costo_en_mano || operario?.Costo_en_mano || operario?.salario || 0);
  const factor = 1 + (porcentajeCargas / 100);
  const costoConCargas = Math.round(sueldoBase * factor * 100) / 100;

  const nombre = operario?.nombre || operario?.Nombre || 'Sin nombre';
  const especialidad = operario?.especialidad || operario?.Especialidad || 'Operario';

  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(operario.id || operario.ID)}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
        seleccionado
          ? 'bg-amber-50 border-amber-400 shadow-sm'
          : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Checkbox visual */}
      <div className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
        seleccionado
          ? 'bg-amber-500 border-amber-500'
          : 'bg-white border-slate-300'
      )}>
        {seleccionado && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-700 text-sm shrink-0">
        {String(nombre).charAt(0).toUpperCase()}
      </div>

      {/* Nombre + especialidad */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{nombre}</p>
        <p className="text-[10px] text-slate-500 font-semibold uppercase">{especialidad}</p>
      </div>

      {/* Costos */}
      <div className="text-right shrink-0">
        <p className="text-[10px] text-slate-500">Base: ${sueldoBase.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
        <p className="text-xs font-black text-emerald-700">
          ${costoConCargas.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/día
        </p>
      </div>
    </button>
  );
}