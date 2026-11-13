// src/components/tesoreria/TablaMovimientos.jsx
import React from 'react';
import { Wallet, Edit2, Trash2 } from 'lucide-react';
import { inferirOrigenMovimiento, formatearFechaDisplay } from '@/utils/tesoreriaHelpers';

export default function TablaMovimientos({
  movimientos,
  onEditar,
  onEliminar,
}) {
  if (movimientos.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <Wallet className="w-10 h-10 text-slate-300" />
        <span>No hay movimientos registrados con los filtros seleccionados.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs table-fixed">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="w-24 px-3 py-4">Fecha</th>
          <th className="w-28 px-3 py-4">Tipo</th>
          <th className="w-auto px-4 py-4">Concepto</th>
          <th className="w-32 px-3 py-4">Contrato ID</th>
          <th className="w-40 px-3 py-4">Imputación / Rubro</th>
          <th className="w-24 px-3 py-4">Medio Pago</th>
          <th className="w-40 px-4 py-4 text-right">Monto Neto</th>
          <th className="w-24 px-3 py-4 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {movimientos.map((m, index) => {
          const tipo = String(m.tipo || m.Tipo || 'Egreso').toLowerCase().replace(/o$/, 'a');
          const monto = Number(m.monto || m.Monto) || 0;
          const rubroImputacion = m.rubro_imputacion || m.Rubro_imputacion || '---';
          const tipoInsumo = m.tipo_insumo || m.Tipo_insumo || '';
          const contratoIdVal = m.contrato_id || m.Contrato_id || m.contratoid || '---';
          const esContabilizada = tipo === 'contabilizada';
          const esAnulada = tipo === 'anulada';
          const origenMov = inferirOrigenMovimiento(m);

          let clasesBadge = 'bg-rose-100 text-rose-800';
          let labelBadge = tipo;
          if (esAnulada) {
            clasesBadge = 'bg-slate-300 text-slate-800';
            labelBadge = 'ANULADA';
          } else if (esContabilizada) {
            clasesBadge = origenMov === 'compra'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800';
            labelBadge = 'CONTABILIZADA';
          } else if (tipo === 'ingreso') {
            clasesBadge = 'bg-emerald-100 text-emerald-800';
          }

          return (
            <tr key={m.id || m.ID || index} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-4 text-slate-600 truncate">{formatearFechaDisplay(m.fecha || m.Fecha)}</td>
              <td className="px-3 py-4">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${clasesBadge}`}>
                  {labelBadge}
                </span>
              </td>
              <td className="px-4 py-4 font-bold text-slate-900 break-words">{m.concepto || m.Concepto || '---'}</td>
              <td className="px-3 py-4 text-slate-600 truncate font-mono">{contratoIdVal}</td>
              <td className="px-3 py-4 text-slate-700">
                <span className="font-semibold block truncate">{rubroImputacion}</span>
                {tipoInsumo && <span className="text-[10px] text-slate-400 truncate block">{tipoInsumo}</span>}
              </td>
              <td className="px-3 py-4 uppercase text-slate-600 truncate">{m.medio_pago || m.Medio_pago || '---'}</td>
              <td className={`px-4 py-4 text-right font-black whitespace-nowrap ${
                esAnulada
                  ? 'text-slate-400 italic'
                  : monto < 0
                  ? 'text-rose-600'
                  : (tipo === 'ingreso' || esContabilizada)
                  ? 'text-emerald-600'
                  : 'text-slate-900'
              }`}>
                {esAnulada ? '—' : `$ ${monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              </td>
              <td className="px-3 py-4 text-right space-x-1">
                <button
                  onClick={() => onEditar(m)}
                  className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onEliminar(m)}
                  className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}