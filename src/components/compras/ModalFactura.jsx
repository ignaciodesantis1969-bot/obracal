// src/components/compras/ModalFactura.jsx
import React from 'react';
import { X, AlertCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import BuscadorSelect from '@/components/BuscadorSelect';

export default function ModalFactura({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isSaving,
  editingId,
  candidatosProveedor,
  nombreProveedorOCR,
  opcionesProveedores,
  obras,
  listaPresupuestosFinal,
  listaContratosFinal,
  rubrosDelPresupuesto,
  gastosGeneralesDelPresupuesto,
  buscarValorEnObjeto
}) {
  if (!isOpen) return null;

  // Calculamos los booleanos acá adentro para no ensuciar el padre
  const esTipoPresupuestario = formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Viaticos-Nafta' || formData.tipo_gasto === 'Gastos Directos';
  const esTipoContrato = formData.tipo_gasto === 'Contrato de Mantenimiento';
  const esGastoLibre = formData.tipo_gasto === 'Gasto Corriente' || formData.tipo_gasto === 'Gasto Extra';
  const requiereObra = esTipoPresupuestario || esTipoContrato;
  const esNotaCreditoForm = String(formData.comprobante_tipo || '').toLowerCase().includes('nota de crédito') ||
                            String(formData.comprobante_tipo || '').toLowerCase().includes('nota de credito');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900">Nueva Factura / Nota de Crédito (Confirmación y Corrección de Datos)</h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Verifique y corrija los datos leídos por la IA. Las Notas de Crédito se guardan como PENDIENTES y luego se contabilizan manualmente desde Tesorería → Facturas a pagar.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo Comprobante</label>
              <select
                disabled={isSaving}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
                value={formData.comprobante_tipo}
                onChange={(e) => setFormData({ ...formData, comprobante_tipo: e.target.value })}
              >
                <optgroup label="── FACTURAS ──">
                  <option value="Factura A">Factura A</option>
                  <option value="Factura B">Factura B</option>
                  <option value="Factura C">Factura C</option>
                  <option value="Factura de Crédito Electrónica MiPyMEs (FCE) A">Factura de Crédito Electrónica MiPyMEs (FCE) A</option>
                  <option value="Factura de Crédito Electrónica MiPyMEs (FCE) B">Factura de Crédito Electrónica MiPyMEs (FCE) B</option>
                  <option value="Ticket">Ticket</option>
                </optgroup>
                <optgroup label="── NOTAS DE CRÉDITO ──">
                  <option value="Nota de Crédito A">Nota de Crédito A</option>
                  <option value="Nota de Crédito B">Nota de Crédito B</option>
                  <option value="Nota de Crédito Electrónica MiPyMEs (FCE) A">Nota de Crédito Electrónica MiPyMEs (FCE) A</option>
                  <option value="Nota de Crédito Electrónica MiPyMEs (FCE) B">Nota de Crédito Electrónica MiPyMEs (FCE) B</option>
                </optgroup>
                <optgroup label="── NOTAS DE DÉBITO ──">
                  <option value="Nota de Débito A">Nota de Débito A</option>
                  <option value="Nota de Débito B">Nota de Débito B</option>
                  <option value="Nota de Débito Electrónica MiPyMEs (FCE) A">Nota de Débito Electrónica MiPyMEs (FCE) A</option>
                  <option value="Nota de Débito Electrónica MiPyMEs (FCE) B">Nota de Débito Electrónica MiPyMEs (FCE) B</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° Factura / NC</label>
              <input type="text" required disabled={isSaving} placeholder="Ej: 0002-00011834" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.n_factura} onChange={(e) => setFormData({...formData, n_factura: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor</label>
              <BuscadorSelect
                opciones={opcionesProveedores}
                value={formData.proveedor_id}
                onChange={(id) => setFormData({ ...formData, proveedor_id: id })}
                placeholder="Seleccione proveedor..."
                minChars={3}
                disabled={isSaving}
              />
            </div>

            {candidatosProveedor.length > 1 && (
              <div className="sm:col-span-3 bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      El OCR detectó "<strong>{nombreProveedorOCR}</strong>" — hay {candidatosProveedor.length} proveedores parecidos.
                    </p>
                    <p className="text-[10px] text-amber-700 mt-1">Elegí el correcto:</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {candidatosProveedor.map((provCand) => {
                    const provIdCand = buscarValorEnObjeto(provCand, ['id', 'ID']);
                    const provNomCand = buscarValorEnObjeto(provCand, ['razon_social', 'nombre']);
                    const seleccionado = String(formData.proveedor_id) === String(provIdCand);
                    return (
                      <button
                        key={provIdCand}
                        type="button"
                        onClick={() => setFormData({ ...formData, proveedor_id: provIdCand })}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                          seleccionado
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                      >
                        {seleccionado ? '✓ ' : ''}{provNomCand}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {esNotaCreditoForm && (
              <div className="sm:col-span-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                  Comprobante que Anula/Ajusta (Opcional)
                </label>
                <input
                  type="text"
                  disabled={isSaving}
                  placeholder="Ej: 0012-00008916 (dejar vacío si es NC parcial por devolución)"
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                  value={formData.comprobante_anula}
                  onChange={(e) => setFormData({ ...formData, comprobante_anula: e.target.value })}
                />
                <p className="text-[10px] text-amber-700 mt-1">
                  💡 Si es una NC parcial por devolución de ítems, podés dejarlo vacío. La factura original NO se marca como anulada; solo se registra la NC con su monto en negativo. La NC queda pendiente hasta contabilizarla.
                </p>
              </div>
            )}

            {requiereObra && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra *</label>
                <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.obra_id} onChange={(e) => setFormData({...formData, obra_id: e.target.value})}>
                  <option value="">Seleccione obra...</option>
                  {obras.map(o => <option key={buscarValorEnObjeto(o, ['id', 'ID'])} value={buscarValorEnObjeto(o, ['id', 'ID'])}>[{o.codigo}] {o.nombre || o.nombre_obra}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Gasto *</label>
              <select disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-amber-700 outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
                value={formData.tipo_gasto}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    tipo_gasto: val,
                    presupuesto_id: '',
                    contrato_id: '',
                    rubro_imputacion: val === 'Contrato de Mantenimiento' ? 'Materiales del Contrato' : '',
                    tipo_insumo: val === 'Contrato de Mantenimiento' ? 'Material' : 'Material',
                    detalle_gasto: ''
                  });
                }}>
                <option value="Presupuesto">Presupuesto Aprobado</option>
                <option value="Contrato de Mantenimiento">Contrato de Mantenimiento Aprobado</option>
                <option value="Viaticos-Nafta">Viáticos - Nafta</option>
                <option value="Gastos Directos">Gastos Directos</option>
                <option value="Gasto Corriente">Gasto Corriente</option>
                <option value="Gasto Extra">Gasto Extra</option>
              </select>
            </div>

            {esTipoPresupuestario && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento Aprobado *</label>
                <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.presupuesto_id} onChange={(e) => setFormData({...formData, presupuesto_id: e.target.value})}>
                  <option value="">Seleccione presupuesto...</option>
                  {listaPresupuestosFinal.map(pr => <option key={buscarValorEnObjeto(pr, ['id', 'ID'])} value={buscarValorEnObjeto(pr, ['id', 'ID'])}>{pr.codigo} - {pr.nombre}</option>)}
                </select>
              </div>
            )}

            {esTipoContrato && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento Aprobado *</label>
                <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.contrato_id} onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}>
                  <option value="">Seleccione contrato ({listaContratosFinal.length} disp.)...</option>
                  {listaContratosFinal.map((c, i) => {
                    const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id']) || i);
                    const cCod = buscarValorEnObjeto(c, ['codigo', 'Codigo', 'nro_contrato', 'numero']) || 'S/C';
                    const cNom = buscarValorEnObjeto(c, ['nombre', 'nombre_contrato', 'Nombre_contrato', 'nombreContrato', 'cliente', 'Cliente', 'razon_social']) || 'Contrato';
                    return (
                      <option key={cId} value={cId}>[{cCod}] {cNom}</option>
                    );
                  })}
                </select>
              </div>
            )}

            {(esTipoPresupuestario || esTipoContrato) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro Imputación *</label>
                {esTipoContrato ? (
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.rubro_imputacion} onChange={(e) => setFormData({...formData, rubro_imputacion: e.target.value})}>
                    <option value="Materiales del Contrato">Materiales del Contrato</option>
                  </select>
                ) : (
                  <select
                    required
                    disabled={isSaving}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
                    value={formData.rubro_imputacion}
                    onChange={(e) => {
                      const nuevoRubro = e.target.value;
                      setFormData({
                        ...formData,
                        rubro_imputacion: nuevoRubro,
                        tipo_insumo: formData.tipo_gasto === 'Viaticos-Nafta' ? 'Mano de Obra' : 'Material'
                      });
                    }}
                  >
                    <option value="">Seleccionar rubro...</option>
                    <option value="Gastos Generales">-- GASTOS GENERALES --</option>
                    {rubrosDelPresupuesto.length === 0 ? (
                      <option disabled value="">⚠️ Este presupuesto no tiene rubros en su detalle</option>
                    ) : (
                      rubrosDelPresupuesto.map((nombreRubro, idx) => (
                        <option key={idx} value={nombreRubro}>{nombreRubro}</option>
                      ))
                    )}
                  </select>
                )}
              </div>
            )}

            {esGastoLibre && (
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Detalle del Gasto *</label>
                <input type="text" required disabled={isSaving} placeholder="Ej: Servicio de Asesoramiento en HyS..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.detalle_gasto} onChange={(e) => setFormData({...formData, detalle_gasto: e.target.value})} />
              </div>
            )}

            {(esTipoPresupuestario || esTipoContrato) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {formData.rubro_imputacion === 'Gastos Generales' ? 'Renglón Gastos Generales *' : 'Tipo de Insumo *'}
                </label>
                <select
                  required
                  disabled={isSaving}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
                  value={formData.tipo_insumo}
                  onChange={(e) => setFormData({...formData, tipo_insumo: e.target.value})}
                >
                  {esTipoContrato ? (
                    <option value="Material">Material</option>
                  ) : formData.tipo_gasto === 'Viaticos-Nafta' ? (
                    <option value="Mano de Obra">Mano de Obra</option>
                  ) : formData.rubro_imputacion === 'Gastos Generales' ? (
                    <>
                      <option value="">Seleccionar gasto general...</option>
                      {gastosGeneralesDelPresupuesto.map((item, idx) => (
                        <option key={idx} value={item}>{item}</option>
                      ))}
                      <option value="Comisión de Venta">Comisión de Venta</option>
                      <option value="Imprevistos">Imprevistos</option>
                    </>
                  ) : (
                    <>
                      <option value="Material">Material</option>
                      <option value="Subcontrato">Subcontrato</option>
                      <option value="Equipo / Herramienta">Equipo / Herramienta</option>
                      <option value="Mano de Obra">Mano de Obra</option>
                    </>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
              <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vencimiento</label>
              <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.vencimiento} onChange={(e) => setFormData({...formData, vencimiento: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado Pago</label>
              {formData.estado_pago === 'pagado' ? (
                <>
                  <div className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800 uppercase">
                    Pagado
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                    🔒 Gestionado desde Tesorería — no editable acá.
                  </p>
                </>
              ) : (
                <select
                  disabled={isSaving || esNotaCreditoForm}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100 cursor-pointer"
                  value={formData.estado_pago}
                  onChange={(e) => setFormData({...formData, estado_pago: e.target.value})}
                >
                  <option value="pendiente">Pendiente</option>
                  {!esNotaCreditoForm && <option value="contabilizado">Contabilizado</option>}
                </select>
              )}
              {esNotaCreditoForm && formData.estado_pago !== 'pagado' && (
                <p className="text-[10px] text-amber-700 mt-1 font-semibold">
                  La NC arranca pendiente. Se contabiliza desde Tesorería → Facturas a pagar.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subtotal ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.subtotal} onChange={(e) => setFormData({...formData, subtotal: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 21% ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.iva_21} onChange={(e) => setFormData({...formData, iva_21: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 10.5% ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.iva_10_5} onChange={(e) => setFormData({...formData, iva_10_5: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Persp. IIBB Bs.As. ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.persp_iibb_bs_as} onChange={(e) => setFormData({...formData, persp_iibb_bs_as: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Persp. IIBB CABA ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.persp_iibb_caba} onChange={(e) => setFormData({...formData, persp_iibb_caba: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Otros Impuestos ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.otros_impuestos} onChange={(e) => setFormData({...formData, otros_impuestos: e.target.value})} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total ($)</label>
              <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-amber-600 outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.total} onChange={(e) => setFormData({...formData, total: e.target.value})} />
            </div>
          </div>

          {formData.archivo_url && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> Comprobante adjunto cargado correctamente</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Guardando...' : (editingId ? 'Actualizar Comprobante' : 'Crear Comprobante')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}