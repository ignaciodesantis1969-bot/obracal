// src/components/tesoreria/modal/ModalMovimiento.jsx
import React from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';

export default function ModalMovimiento({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isSaving,
  editingId,
  obras,
  contratos,
  presupuestosDisponibles,
  rubrosDelPresupuesto,
  gastosGeneralesConceptos,
  facturasVenta,
  facturasCompra,
  clientes,
  proveedores,
  totalRetenciones,
  montoNetoEfectivo,
  onAgregarFacturaFila,
  onCambiarFacturaFila,
  onQuitarFacturaFila,
}) {
  if (!isOpen) return null;

  const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900">
            {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento con Retenciones'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo *</label>
              <select
                required
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100"
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              >
                <option value="Egreso">Egreso</option>
                <option value="Ingreso">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha *</label>
              <input
                type="date"
                required
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto *</label>
              <input
                type="text"
                required
                disabled={isSaving}
                placeholder="Descripción del movimiento..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.concepto}
                onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra</label>
              <select
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.obra_id}
                onChange={(e) => setFormData({
                  ...formData,
                  obra_id: e.target.value,
                  presupuesto_id: '',
                  rubro_imputacion: '',
                })}
              >
                <option value="">Seleccione obra...</option>
                {obras.map(o => (
                  <option key={o.id || o.ID} value={o.id || o.ID}>
                    {o.nombre || o.Nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presupuesto Aprobado</label>
              <select
                disabled={isSaving || !formData.obra_id}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.presupuesto_id}
                onChange={(e) => setFormData({
                  ...formData,
                  presupuesto_id: e.target.value,
                  rubro_imputacion: '',
                })}
              >
                <option value="">
                  {formData.obra_id ? 'Seleccione presupuesto...' : 'Primero seleccione obra...'}
                </option>
                {presupuestosDisponibles.map(p => (
                  <option key={p.id || p.ID} value={p.id || p.ID}>
                    {p.codigo || p.Codigo || `Presupuesto #${p.id || p.ID}`} - {p.nombre || p.Nombre || ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contrato (Opcional)</label>
              <select
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.contrato_id}
                onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })}
              >
                <option value="">Seleccione contrato...</option>
                {contratos.map(c => (
                  <option key={c.id || c.ID} value={c.id || c.ID}>
                    {c.codigo || c.Codigo || `Contrato #${c.id || c.ID}`} - {c.nombre || c.Nombre || ''}
                  </option>
                ))}
              </select>
            </div>

            {formData.tipo === 'Egreso' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Insumo</label>
                  <select
                    disabled={isSaving}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                    value={formData.tipo_insumo}
                    onChange={(e) => setFormData({
                      ...formData,
                      tipo_insumo: e.target.value,
                      rubro_imputacion: '',
                    })}
                  >
                    <option value="Materiales">Materiales</option>
                    <option value="Mano de Obra">Mano de Obra</option>
                    <option value="Subcontratos">Subcontratos</option>
                    <option value="Equipos y herramientas">Equipos y herramientas</option>
                    <option value="Gastos Generales">Gastos Generales</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro de Imputación</label>
                  {String(formData.tipo_insumo).toLowerCase() === 'gastos generales' ? (
                    <select
                      disabled={isSaving}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                      value={formData.rubro_imputacion}
                      onChange={(e) => setFormData({ ...formData, rubro_imputacion: e.target.value })}
                    >
                      <option value="">Seleccione gasto general...</option>
                      {gastosGeneralesConceptos.map((g, idx) => (
                        <option key={idx} value={g}>{g}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      disabled={isSaving || !formData.presupuesto_id}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100"
                      value={formData.rubro_imputacion}
                      onChange={(e) => setFormData({ ...formData, rubro_imputacion: e.target.value })}
                    >
                      <option value="">
                        {formData.presupuesto_id ? 'Seleccione rubro del presupuesto...' : 'Primero seleccione presupuesto...'}
                      </option>
                      {rubrosDelPresupuesto.map((r, idx) => (
                        <option key={idx} value={r}>{r}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto Bruto / Factura ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medio de Pago</label>
              <select
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100"
                value={formData.medio_pago}
                onChange={(e) => setFormData({ ...formData, medio_pago: e.target.value })}
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referencia</label>
              <input
                type="text"
                disabled={isSaving}
                placeholder="N° cheque, transferencia..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-extrabold text-xs uppercase text-slate-800">Retenciones Sufridas (Descuentos)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { campo: 'retencion_suss', label: 'SUSS' },
                { campo: 'retencion_iva', label: 'IVA' },
                { campo: 'retencion_ganancias', label: 'Ganancias' },
                { campo: 'retencion_iibb_pba', label: 'IIBB PBA' },
                { campo: 'retencion_iibb_caba', label: 'IIBB CABA' },
              ].map(({ campo, label }) => (
                <div key={campo}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{label} ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isSaving}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                    value={formData[campo]}
                    onChange={(e) => setFormData({ ...formData, [campo]: e.target.value })}
                  />
                </div>
              ))}
              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase">Neto Cash Flow:</span>
                <span className="text-xs font-black text-amber-900">
                  $ {montoNetoEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-xs uppercase text-slate-800">
                  {esIngreso ? 'Aplicar a Facturas de Venta (Cobro)' : 'Aplicar a Facturas de Compra (Pago)'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  Asocia este movimiento a una o varias facturas (montos totales o parciales).
                </p>
              </div>
              <button
                type="button"
                onClick={onAgregarFacturaFila}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Factura
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-3 py-2.5">Factura</th>
                    <th className="px-3 py-2.5 w-36 text-right">Monto Aplicado</th>
                    <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.isArray(formData.facturas_aplicadas) &&
                    formData.facturas_aplicadas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <select
                            disabled={isSaving}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                            value={item.factura_id}
                            onChange={(e) => onCambiarFacturaFila(item.id, 'factura_id', e.target.value)}
                          >
                            <option value="">Seleccionar factura...</option>
                            {esIngreso
                              ? facturasVenta
                                  .filter(f =>
                                    String(f.estado_pago || '').toLowerCase() !== 'anulada' &&
                                    f.es_nota_credito !== true &&
                                    f.es_nota_debito !== true
                                  )
                                  .map(f => {
                                    const cli = clientes.find(
                                      c => String(c.id || c.ID) === String(f.cliente_id || f.Cliente_id)
                                    );
                                    const realId = f.id || f.ID;
                                    return (
                                      <option key={realId} value={realId}>
                                        {f.tipo_comprobante || 'FAC'} ({f.numero_comp || ''}) -{' '}
                                        {cli?.razon_social || cli?.nombre || 'Cliente'} ($ {Number(f.total || 0).toLocaleString('es-AR')})
                                      </option>
                                    );
                                  })
                              : facturasCompra
                                  .filter(f =>
                                    String(f.estado_pago || '').toLowerCase() !== 'anulada' &&
                                    f.es_nota_credito !== true
                                  )
                                  .map(f => {
                                    const prov = proveedores.find(
                                      p => String(p.id || p.ID) === String(f.proveedor_id || f.Proveedor_id)
                                    );
                                    const realId = f.id || f.ID;
                                    return (
                                      <option key={realId} value={realId}>
                                        {f.codigo || 'FAC'} - {prov?.razon_social || prov?.nombre || 'Proveedor'} ($ {Number(f.total || 0).toLocaleString('es-AR')})
                                      </option>
                                    );
                                  })}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isSaving}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500 disabled:bg-slate-100"
                            value={item.monto}
                            onChange={(e) => onCambiarFacturaFila(item.id, 'monto', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => onQuitarFacturaFila(item.id)}
                            disabled={isSaving}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Registrando...' : (editingId ? 'Actualizar' : 'Registrar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}