import React from 'react';
import { Check, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TareaSubcontratoItem({
  subcontrato,
  seleccionado,
  diasAsignados,
  onToggle,
  onDiasChange,
  disabled = false,
}) {
  const montoTotal = Number(subcontrato?.montoTotal || 0);
  const dias = Number(diasAsignados) || 0;
  const costoDiario = dias > 0 ? Math.round((montoTotal / dias) * 100) / 100 : 0;

  return (
    <div
      className={cn(
        'w-full p-3 rounded-xl border transition-all',
        seleccionado
          ? 'bg-amber-50 border-amber-400 shadow-sm'
          : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50',
        disabled && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox visual */}
        <button
          type="button"
          onClick={() => !disabled && onToggle()}
          disabled={disabled}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all mt-0.5 cursor-pointer',
            seleccionado
              ? 'bg-amber-500 border-amber-500'
              : 'bg-white border-slate-300'
          )}
        >
          {seleccionado && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>

        {/* Icono + nombre */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{subcontrato?.nombre}</p>
              <p className="text-[10px] text-slate-500">
                Monto total: <strong>${montoTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
              </p>
            </div>
          </div>

          {/* Días asignados (solo si está seleccionado) */}
          {seleccionado && (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                Días asignados:
                <input
                  type="number"
                  min="1"
                  value={dias}
                  onChange={(e) => onDiasChange(Math.max(1, Number(e.target.value) || 1))}
                  disabled={disabled}
                  className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center outline-none focus:border-amber-500"
                />
              </label>

              {dias > 0 && (
                <span className="text-[11px] font-bold text-blue-700">
                  ≈ ${costoDiario.toLocaleString('es-AR', { maximumFractionDigits: 0 })}/día
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}