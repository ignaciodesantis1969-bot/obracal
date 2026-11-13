// src/components/tesoreria/TablaFacturasCobrar.jsx
import React from 'react';
import { Clock, Paperclip, Edit2, Lock } from 'lucide-react';
import { formatearFechaDisplay } from '@/utils/tesoreriaHelpers';

const ESTADOS_BLOQUEADOS = ['pagado', 'anulada'];

export default function TablaFacturasCobrar({
  facturas,
  clientes,
  obras,
  onCobrar,
  onEditar,
}) {
  if (facturas.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <Clock className="w-10 h-10 text-slate-300" />
        <span>No hay facturas de venta pendientes de cobro.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="px-6 py-4">Tipo / N° Comprobante</th>
          <th className="px-6 py-4">Cliente</th>
          <th className="px-4 py-4">Obra</th>
          <th className="px-4 py-4">Fecha Emisión</th>
          <th className="px-4 py-4">Vencimiento</th>
          <th className="px-4 py-4 text-right">Total a Cobrar</th>
          <th className="px-3 py-4 text-center">Certif.</th>
          <th className="px-4 py-4 text-center">Estado</th>
          <th className="px-6 py-4 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {facturas.map((f, index) => {
          const cliId = f.cliente_id || f.Cliente_id;
          const cliente = clientes.find(c => String(c.id || c.ID) === String(cliId));
          const totalVal = Number(f.total || f.Total || 0) || 0;
          const tipoComp = f.tipo_comprobante || f.Tipo_comprobante || 'FACTURA A';
          const nComp = f.numero_comp || f.Numero_comp || '---';
          const estadoPago = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
          const urlArchivo = f.archivo_url || f.Archivo_url || f.archivo || f.Archivo || '';

          const obraId = f.obra_id || f.Obra_id || '';
          const obra = obras.find(o => String(o.id || o.ID) === String(obraId));
          const obraNombre = obra ? (obra.codigo ? `${obra.codigo} - ${obra.nombre || obra.nombre_obra}` : (obra.nombre || obra.nombre_obra)) : '—';

          const esEditable = !ESTADOS_BLOQUEADOS.includes(estadoPago) && f.es_nota_credito !== true && f.es_nota_debito !== true;

          return (
            <tr key={f.id || f.ID || index} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-bold text-sky-600">
                {tipoComp} <span className="text-slate-500 font-normal">({nComp})</span>
              </td>
              <td className="px-6 py-4 font-bold text-slate-900">{cliente?.razon_social || cliente?.nombre || 'Cliente'}</td>
              <td className="px-4 py-4 text-slate-600 truncate">{obraNombre}</td>
              <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(f.fecha_emision || f.Fecha_emision || f.fecha || f.Fecha)}</td>
              <td className="px-4 py-4 font-semibold text-rose-600">{formatearFechaDisplay(f.fecha_vencimiento || f.Fecha_vencimiento || f.vencimiento || f.Vencimiento)}</td>
              <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-4 text-center">
                {urlArchivo && String(urlArchivo).startsWith('http') ? (
                  <a
                    href={urlArchivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200 shadow-sm"
                    title="Ver certificado / comprobante"
                  >
                    <Paperclip className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-slate-300 text-[10px]">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                  estadoPago === 'pagado parcial' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {estadoPago}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                {esEditable ? (
                  <button
                    onClick={() => onEditar(f)}
                    className="p-1.5 text-slate-500 hover:text-sky-600 bg-white border rounded shadow-sm cursor-pointer"
                    title="Editar factura"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="inline-flex items-center p-1.5 text-slate-300" title="Bloqueada (ya cobrada / anulada / NC-ND)">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}
                <button
                  onClick={() => onCobrar(f)}
                  className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                >
                  Registrar Cobro
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}