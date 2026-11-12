// src/components/compras/TablaFacturas.jsx
import React from 'react';
import { FileText, Paperclip, Edit2, Trash2 } from 'lucide-react';

export default function TablaFacturas({
  facturasFiltradas,
  proveedores,
  buscarValorEnObjeto,
  handleVerArchivo,
  handleEditarFacturaClick,
  handleEliminarFactura,
  formatearFechaDisplay,
  esACompletar,
  obtenerIdReal
}) {
  if (facturasFiltradas.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <FileText className="w-10 h-10 text-slate-300" />
        <span>No hay facturas registradas con los filtros seleccionados.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="px-6 py-4">Código</th>
          <th className="px-4 py-4">N° Factura</th>
          <th className="px-4 py-4">Imputación</th>
          <th className="px-6 py-4">Proveedor</th>
          <th className="px-4 py-4">Rubro / Detalle</th>
          <th className="px-4 py-4">Fecha</th>
          <th className="px-4 py-4 text-right">Total</th>
          <th className="px-4 py-4 text-center">Pago</th>
          <th className="px-4 py-4 text-center">Arch.</th>
          <th className="px-6 py-4 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {facturasFiltradas.map((f, index) => {
          const provId = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
          const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));
          const totalVal = Number(buscarValorEnObjeto(f, ['total', 'Total', 'TOTAL'])) || 0;
          const estadoPago = String(buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago', 'ESTADO_PAGO', 'estadopago']) || 'pendiente').toLowerCase();

          const numeroFacturaDisplay = buscarValorEnObjeto(f, ['n_factura', 'N_factura', 'N_FACTURA', 'numero_comp', 'numero', 'numero_factura', 'nfactura']) || '---';
          const codigoDisplay = buscarValorEnObjeto(f, ['codigo', 'Codigo', 'CODIGO']) || `FAC-${String(index + 1).padStart(4, '0')}`;
          const archivoLink = buscarValorEnObjeto(f, ['archivo_url', 'Archivo_url', 'archivo', 'Archivo', 'archivourl']) || '';
          const tipoGastoDisplay = buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto', 'tipogasto']) || 'Presupuesto';
          const tipoCompDisplay = buscarValorEnObjeto(f, ['comprobante_tipo', 'Comprobante_tipo', 'tipo_comprobante']) || 'Factura A';
          const esNCRow = String(tipoCompDisplay).toLowerCase().includes('nota de crédito') ||
                          String(tipoCompDisplay).toLowerCase().includes('nota de credito');

          const rubroImputacion = buscarValorEnObjeto(f, ['rubro_imputacion', 'Rubro_imputacion', 'rubro_presupuesto', 'Rubro_presupuesto', 'rubro', 'Rubro', 'rubroimputacion']);
          const tipoInsumo = buscarValorEnObjeto(f, ['tipo_insumo', 'Tipo_insumo', 'insumo', 'Insumo', 'renglon', 'Renglon', 'tipoinsumo']);
          const detalleGasto = buscarValorEnObjeto(f, ['detalle_gasto', 'detalle', 'Detalle_gasto']);
          
          const esGastoLibreRow = tipoGastoDisplay === 'Gasto Corriente' || tipoGastoDisplay === 'Gasto Extra';
          const textoImputacion = esGastoLibreRow 
                                  ? (detalleGasto || '---')
                                  : `${rubroImputacion || '---'} ${tipoInsumo && tipoInsumo !== 'Material' ? '('+tipoInsumo+')' : ''}`;

          const fechaFactura = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);
          const rowKey = `${obtenerIdReal(f)}-${numeroFacturaDisplay}-${index}`;

          return (
            <tr key={rowKey} className={`hover:bg-slate-50 transition-colors ${esNCRow ? 'bg-amber-50/40' : ''}`}>
              <td className="px-6 py-4 font-bold text-blue-600">
                {codigoDisplay}
                {esNCRow && <span className="ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-900 text-[9px] font-bold rounded">NC</span>}
              </td>
              <td className="px-4 py-4">
                <span className={esACompletar(numeroFacturaDisplay) ? 'text-slate-400 italic font-normal' : 'font-semibold text-slate-800'}>
                  {numeroFacturaDisplay}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${esACompletar(tipoGastoDisplay) ? 'bg-slate-100 text-slate-400 italic' : 'bg-amber-50 text-amber-800'}`}>
                  {tipoGastoDisplay}
                </span>
              </td>
              <td className="px-6 py-4 font-bold text-slate-900">
                {prov?.razon_social || prov?.nombre || prov?.Razon_social || buscarValorEnObjeto(f, ['proveedor']) || 'Proveedor'}
              </td>
              <td className="px-4 py-4">
                <span className={esACompletar(textoImputacion) ? 'text-slate-400 italic font-normal' : 'text-slate-600 font-medium'}>
                  {textoImputacion}
                </span>
              </td>
              <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(fechaFactura)}</td>
              <td className={`px-4 py-4 text-right font-black ${totalVal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
              <td className="px-4 py-4 text-center">
                {estadoPago === 'a asignar' ? (
                  <button
                    type="button"
                    onClick={() => handleEditarFacturaClick(f)}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] uppercase shadow-sm cursor-pointer transition-colors"
                    title="Asignar estado de pago"
                  >
                    Asignar
                  </button>
                ) : (
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoPago === 'pagado' ? 'bg-emerald-100 text-emerald-800' : estadoPago === 'contabilizado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                    {estadoPago}
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                {archivoLink && archivoLink !== 'Comprobante_Adjunto' ? (
                  <button type="button" onClick={() => handleVerArchivo(f)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg shadow-sm cursor-pointer" title="Ver comprobante"><Paperclip className="w-4 h-4" /></button>
                ) : (
                  <span className="text-slate-300">-</span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => handleEditarFacturaClick(f)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleEliminarFactura(f)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}