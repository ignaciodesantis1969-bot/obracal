// src/components/tesoreria/TablaFacturasPagar.jsx
import React from 'react';
import { Clock } from 'lucide-react';
import { formatearFechaDisplay } from '@/utils/tesoreriaHelpers';

export default function TablaFacturasPagar({
  facturas,
  proveedores,
  onPagar,
  onContabilizarNC,
}) {
  if (facturas.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <Clock className="w-10 h-10 text-slate-300" />
        <span>No hay facturas pendientes de pago para el proveedor seleccionado.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="px-6 py-4">Código / N° Factura</th>
          <th className="px-6 py-4">Proveedor</th>
          <th className="px-4 py-4">Fecha Emisión</th>
          <th className="px-4 py-4">Vencimiento</th>
          <th className="px-4 py-4 text-right">Total a Pagar</th>
          <th className="px-4 py-4 text-center">Estado</th>
          <th className="px-6 py-4 text-right">Acción</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {facturas.map((f, index) => {
          const provId = f.proveedor_id || f.Proveedor_id;
          const prov = proveedores.find(p => String(p.id || p.ID) === String(provId));
          const totalVal = Number(f.total || f.Total || 0) || 0;
          const codigoDisplay = f.codigo || f.Codigo || `FAC-${String(index + 1).padStart(4, '0')}`;
          const nFactura = f.n_factura || f.N_factura || '---';
          const estadoPago = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
          const tipoComp = String(f.comprobante_tipo || f.tipo_comprobante || '').toUpperCase();
          const esNC = tipoComp.includes('NOTA DE CREDITO') || tipoComp.includes('NOTA DE CRÉDITO');
          return (
            <tr key={f.id || f.ID || index} className={`hover:bg-slate-50 transition-colors ${esNC ? 'bg-amber-50/40' : ''}`}>
              <td className="px-6 py-4 font-bold text-blue-600">
                {codigoDisplay} <span className="text-slate-500 font-normal">({nFactura})</span>
                {esNC && (
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] font-bold rounded">NC</span>
                )}
              </td>
              <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || 'Proveedor'}</td>
              <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(f.fecha || f.Fecha)}</td>
              <td className="px-4 py-4 font-semibold text-rose-600">{formatearFechaDisplay(f.vencimiento || f.Vencimiento)}</td>
              <td className={`px-4 py-4 text-right font-black ${totalVal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {totalVal < 0
                  ? `- $ ${Math.abs(totalVal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                  : `$ ${totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`}
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                  estadoPago === 'pagado parcial'
                    ? 'bg-sky-100 text-sky-800'
                    : estadoPago === 'contabilizado'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {estadoPago}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {esNC ? (
                  estadoPago === 'contabilizado' ? (
                    <span className="text-[11px] text-emerald-700 font-bold">✓ Contabilizada</span>
                  ) : (
                    <button
                      onClick={() => onContabilizarNC(f)}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                    >
                      Contabilizar
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => onPagar(f)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                  >
                    Registrar Pago
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}