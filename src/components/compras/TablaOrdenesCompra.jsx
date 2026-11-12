// src/components/compras/TablaOrdenesCompra.jsx
import React from 'react';
import { ShoppingCart, FileText, Edit2, Trash2, Loader2 } from 'lucide-react';

export default function TablaOrdenesCompra({
  ordenesFiltradas,
  proveedores,
  obras,
  buscarValorEnObjeto,
  handleGenerarPdfOc,
  generandoPdfOcId,
  handleEditarOcClick,
  handleEliminarOc,
  formatearFechaDisplay,
  obtenerIdReal
}) {
  if (ordenesFiltradas.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <ShoppingCart className="w-10 h-10 text-slate-300" />
        <span>No hay órdenes de compra registradas con los filtros seleccionados.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="px-6 py-4">Código OC</th>
          <th className="px-6 py-4">Proveedor</th>
          <th className="px-4 py-4">Obra</th>
          <th className="px-4 py-4">Fecha</th>
          <th className="px-4 py-4">Entrega</th>
          <th className="px-4 py-4 text-right">Total</th>
          <th className="px-4 py-4 text-center">Estado</th>
          <th className="px-6 py-4 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {ordenesFiltradas.map((oc, index) => {
          const provId = buscarValorEnObjeto(oc, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
          const obraId = buscarValorEnObjeto(oc, ['obra_id', 'Obra_id', 'obraid']);
          const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));
          const obra = obras.find(o => String(buscarValorEnObjeto(o, ['id', 'ID'])) === String(obraId));
          const totalVal = Number(buscarValorEnObjeto(oc, ['total', 'Total', 'TOTAL'])) || 0;
          const estadoOc = String(buscarValorEnObjeto(oc, ['estado', 'Estado']) || 'pendiente').toLowerCase();
          const codigoDisplay = buscarValorEnObjeto(oc, ['codigo', 'Codigo']) || `OC-${String(index + 1).padStart(4, '0')}`;
          const ocId = obtenerIdReal(oc);

          return (
            <tr key={ocId || index} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4 font-bold text-blue-600">{codigoDisplay}</td>
              <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || 'Proveedor'}</td>
              <td className="px-4 py-4 text-slate-600">{obra?.codigo ? `${obra.codigo} - ${obra.nombre || obra.nombre_obra}` : (obra?.nombre || '---')}</td>
              <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(buscarValorEnObjeto(oc, ['fecha', 'Fecha']))}</td>
              <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(buscarValorEnObjeto(oc, ['fecha_entrega', 'Fecha_entrega']))}</td>
              <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-4 text-center">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoOc === 'aprobada' ? 'bg-emerald-100 text-emerald-800' : estadoOc === 'recibida' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                  {estadoOc}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleGenerarPdfOc(oc)}
                    disabled={generandoPdfOcId === ocId}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 bg-white border rounded shadow-sm cursor-pointer disabled:opacity-50"
                    title="Generar PDF de la Orden de Compra"
                  >
                    {generandoPdfOcId === ocId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <FileText className="w-3.5 h-3.5" />
                    }
                  </button>
                  <button onClick={() => handleEditarOcClick(oc)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleEliminarOc(oc)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}