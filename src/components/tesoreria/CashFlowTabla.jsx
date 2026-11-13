// src/components/tesoreria/CashFlowTabla.jsx
import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function CashFlowTabla({ titulo, filas, columnaPeriodo = 'Periodo' }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
      <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-amber-500" /> {titulo}
      </h3>
      {filas.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          No hay datos suficientes para mostrar este período.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <th className="px-6 py-3">{columnaPeriodo}</th>
                <th className="px-4 py-3 text-right text-emerald-600">Ingresos</th>
                <th className="px-4 py-3 text-right text-rose-600">Egresos</th>
                <th className="px-6 py-3 text-right">Neto / Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filas.map((row, idx) => {
                const neto = row.ingresos - row.egresos;
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-bold text-slate-800">{row.periodo}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      $ {row.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      $ {row.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-3 text-right font-black ${neto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      $ {neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}