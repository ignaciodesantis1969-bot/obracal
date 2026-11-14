// src/components/tesoreria/modal/ModalFacturaVenta.jsx
import React, { useRef } from 'react';
import {
  X, Plus, Trash2, Loader2, Upload, ArrowLeft, Sparkles, Check,
  FileText, AlertTriangle, Paperclip, Lock,
} from 'lucide-react';
import { esNotaCredito } from '@/utils/tesoreriaHelpers';

const ESTADOS_BLOQUEADOS = ['pagado', 'anulada'];

export default function ModalFacturaVenta({
  isOpen,
  onClose,
  onSubmit,
  paso,
  setPaso,
  leyendoFactura,
  onSubirArchivo,
  formDataVenta,
  setFormDataVenta,
  archivoBase64Venta,
  setArchivoBase64Venta,
  nombreArchivoVenta,
  setNombreArchivoVenta,
  isSavingVenta,
  editingId,
  clientes,
  obras,
  presupuestos,
  contratos,
  certificados,
  candidatosCliente,
  nombreClienteOCR,
  onAgregarItem,
  onCambiarItem,
  onQuitarItem,
}) {
  const fileInputRef = useRef(null);
  if (!isOpen) return null;

  const estadoPago = String(formDataVenta.estado_pago || '').toLowerCase();
  const esReadOnly = !!editingId && (
    ESTADOS_BLOQUEADOS.includes(estadoPago) ||
    formDataVenta.es_nota_credito === true ||
    formDataVenta.es_nota_debito === true
  );

  const handleAdjuntarArchivoLocal = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNombreArchivoVenta(file.name);
    const reader = new FileReader();
    reader.onload = () => setArchivoBase64Venta(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputProps = { disabled: isSavingVenta || esReadOnly };

  // 🔑 Presupuestos filtrados por Obra y que estén Aprobados (tolerante a mayúsculas/espacios)
  const presupuestosDeObra = (presupuestos || []).filter(p => {
    if (!formDataVenta.obra_id) return false;
    const pObraId = String(p.obra_id || p.Obra_id || p.obraId || '');
    const estado = String(p.estado || p.Estado || '').toLowerCase();
    const esAprobado = estado.includes('aprobad') || estado.includes('activo') || estado === '';
    return pObraId === String(formDataVenta.obra_id) && esAprobado;
  });

  // 🔑 Certificados filtrados por Presupuesto o Contrato
  const certificadosFiltrados = (certificados || []).filter(c => {
    if (formDataVenta.contrato_id) {
      const certContratoId = String(c.contrato_id || c.Contrato_id || '');
      return certContratoId === String(formDataVenta.contrato_id);
    }
    if (formDataVenta.presupuesto_id) {
      const certPresId = String(c.presupuesto_id || c.Presupuesto_id || '');
      return certPresId === String(formDataVenta.presupuesto_id);
    }
    if (formDataVenta.obra_id) {
      const certObraId = String(c.obra_id || c.Obra_id || '');
      return certObraId === String(formDataVenta.obra_id);
    }
    return false; 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-sky-50">
          <h3 className="font-bold text-sky-950">
            {editingId ? 'Editar Factura de Venta' : '+ Nueva Factura de Venta'}
          </h3>
          <button
            onClick={onClose}
            disabled={isSavingVenta}
            className="text-sky-400 hover:text-sky-700 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {esReadOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-2 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <b>Solo lectura.</b> Esta factura ya está {estadoPago === 'anulada'
                ? 'anulada'
                : formDataVenta.es_nota_credito
                ? 'contabilizada como Nota de Crédito'
                : formDataVenta.es_nota_debito
                ? 'contabilizada como Nota de Débito'
                : 'cobrada'} y no se puede modificar.
            </span>
          </div>
        )}

        {/* PASO SUBIR (solo en creación) */}
        {!editingId && paso === 'subir' ? (
          <div className="p-8 space-y-6 text-center">
            {leyendoFactura ? (
              <div className="py-12 space-y-4">
                <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Analizando factura con Inteligencia Artificial...</h4>
                  <p className="text-xs text-slate-500 mt-1">Extrayendo número, cliente, fechas, ítems e importes automáticamente.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">Subir factura de venta (IA)</h4>
                  <p className="text-xs text-slate-500 mt-1">Seleccioná el archivo PDF o imagen para leerlo mediante IA y completar el formulario.</p>
                </div>
                <div className="max-w-md mx-auto">
                  <label className="border-2 border-dashed border-sky-300 rounded-2xl p-8 bg-sky-50/50 hover:bg-sky-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
                    <Upload className="w-10 h-10 text-sky-500 mb-1" />
                    <span className="text-xs font-bold text-sky-900">Hacé clic para seleccionar el comprobante</span>
                    <span className="text-[10px] text-slate-400">Soporta PDF, PNG, JPG (Procesamiento con IA del servidor)</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={onSubirArchivo}
                      disabled={leyendoFactura}
                    />
                  </label>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaso('formulario')}
                    className="text-xs text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    O completar manualmente &rarr;
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {!editingId && (
              <div className="flex items-center justify-between bg-sky-50 p-3 rounded-xl border border-sky-200">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-sky-950">
                    {archivoBase64Venta
                      ? `Factura analizada (${nombreArchivoVenta || 'Adjunta'})`
                      : 'Formulario completado manualmente'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaso('subir')}
                  disabled={isSavingVenta}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 disabled:opacity-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Cambiar archivo
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Comprobante *</label>
                <select
                  required
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 uppercase disabled:bg-slate-100"
                  value={formDataVenta.tipo_comprobante}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, tipo_comprobante: e.target.value })}
                >
                  <optgroup label="── FACTURAS ──">
                    <option value="FACTURA A">FACTURA A</option>
                    <option value="FACTURA B">FACTURA B</option>
                    <option value="FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) A">FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) A</option>
                    <option value="FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) B">FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) B</option>
                  </optgroup>
                  <optgroup label="── NOTAS DE CRÉDITO ──">
                    <option value="NOTA DE CREDITO A">NOTA DE CREDITO A</option>
                    <option value="NOTA DE CREDITO B">NOTA DE CREDITO B</option>
                    <option value="NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) A">NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) A</option>
                    <option value="NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) B">NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) B</option>
                  </optgroup>
                  <optgroup label="── NOTAS DE DÉBITO ──">
                    <option value="NOTA DE DEBITO A">NOTA DE DEBITO A</option>
                    <option value="NOTA DE DEBITO B">NOTA DE DEBITO B</option>
                    <option value="NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) A">NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) A</option>
                    <option value="NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) B">NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) B</option>
                  </optgroup>
                  <optgroup label="── RECIBOS ──">
                    <option value="RECIBO A">RECIBO A</option>
                    <option value="RECIBO B">RECIBO B</option>
                  </optgroup>
                </select>

                {archivoBase64Venta && formDataVenta.tipo_comprobante && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Tipo detectado por IA: {formDataVenta.tipo_comprobante}
                  </p>
                )}

                {esNotaCredito(formDataVenta.tipo_comprobante) && !editingId && (
                  <>
                    <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <FileText className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] font-bold text-amber-900">
                        Este comprobante es una Nota de Crédito. Al guardar, los importes se registrarán en NEGATIVO y la factura que anula quedará marcada como ANULADA.
                      </p>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Comprobante que Anula (PV-Número) *
                      </label>
                      <input
                        type="text"
                        required
                        {...inputProps}
                        placeholder="Ej: 00001-00000172"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                        value={formDataVenta.comprobante_anula || ''}
                        onChange={(e) => setFormDataVenta({ ...formDataVenta, comprobante_anula: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Formato: <strong>00001-00000172</strong></p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Punto de Venta</label>
                <input
                  type="text"
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.punto_venta}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, punto_venta: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comp. Nro *</label>
                <input
                  type="text"
                  required
                  {...inputProps}
                  placeholder="Ej: 00000171"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.numero_comp}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, numero_comp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente *</label>
                <select
                  required
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.cliente_id}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, cliente_id: e.target.value })}
                >
                  <option value="">Seleccione cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id || c.ID} value={c.id || c.ID}>
                      {c.razon_social || c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {candidatosCliente.length > 1 && !esReadOnly && (
                <div className="sm:col-span-3 bg-amber-50 border-2 border-amber-400 rounded-lg px-4 py-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">
                        El OCR detectó "<strong>{nombreClienteOCR}</strong>" — hay {candidatosCliente.length} clientes parecidos.
                      </p>
                      <p className="text-[10px] text-amber-700 mt-1">Elegí el correcto:</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {candidatosCliente.map((cliCand) => {
                      const cliIdCand = cliCand.id || cliCand.ID || cliCand.Id;
                      const cliNomCand = cliCand.razon_social || cliCand.nombre || 'Cliente';
                      const seleccionado = String(formDataVenta.cliente_id) === String(cliIdCand);
                      return (
                        <button
                          key={cliIdCand}
                          type="button"
                          onClick={() => setFormDataVenta({ ...formDataVenta, cliente_id: cliIdCand })}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            seleccionado
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {seleccionado ? '✓ ' : ''}{cliNomCand}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Fechas + Obra + Contrato + Presupuesto + Certificado + Archivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.fecha_emision}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, fecha_emision: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Vto. Pago</label>
                <input
                  type="date"
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.fecha_vencimiento || ''}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, fecha_vencimiento: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra (opcional)</label>
                <select
                  {...inputProps}
                  disabled={!!formDataVenta.contrato_id || inputProps.disabled}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:opacity-60"
                  value={formDataVenta.obra_id || ''}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, obra_id: e.target.value, presupuesto_id: '', certificado_id: '' })}
                >
                  <option value="">Sin obra asignada</option>
                  {obras.map(o => (
                    <option key={o.id || o.ID} value={o.id || o.ID}>
                      {o.codigo ? `[${o.codigo}] ` : ''}{o.nombre || o.Nombre || o.nombre_obra}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contrato de Mantenimiento (opcional)</label>
                <select
                  {...inputProps}
                  disabled={!!formDataVenta.obra_id || inputProps.disabled}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:opacity-60"
                  value={formDataVenta.contrato_id || ''}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, contrato_id: e.target.value, obra_id: '', presupuesto_id: '', certificado_id: '' })}
                >
                  <option value="">Sin contrato asignado</option>
                  {contratos.map((c, idx) => (
                    <option key={c.id || c.ID || idx} value={c.id || c.ID}>
                      {c.codigo || c.Codigo || c.nro_contrato ? `[${c.codigo || c.Codigo || c.nro_contrato}] ` : ''}{c.nombre || c.Nombre || c.descripcion || `Contrato #${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presupuesto (opcional)</label>
                <select
                  {...inputProps}
                  disabled={!formDataVenta.obra_id || !!formDataVenta.contrato_id || inputProps.disabled}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:opacity-60"
                  value={formDataVenta.presupuesto_id || ''}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, presupuesto_id: e.target.value, certificado_id: '' })}
                >
                  <option value="">{formDataVenta.obra_id ? 'Seleccione presupuesto...' : 'Primero seleccione obra...'}</option>
                  {presupuestosDeObra.map(p => (
                    <option key={p.id || p.ID} value={p.id || p.ID}>
                      {p.codigo || p.Codigo || `Presupuesto #${p.id || p.ID}`} - {p.nombre || p.Nombre || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Certificado Asociado (opcional)</label>
                <select
                  {...inputProps}
                  disabled={(!formDataVenta.presupuesto_id && !formDataVenta.contrato_id) || inputProps.disabled}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100 disabled:opacity-60"
                  value={formDataVenta.certificado_id || ''}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, certificado_id: e.target.value })}
                >
                  <option value="">Sin certificado asignado</option>
                  {certificadosFiltrados.map(c => {
                    const tipo = c.tipo || c.Tipo || 'Cert.';
                    const nro = c.certificado_nro || c.numero || c.codigo || c.id || c.ID;
                    const fecha = c.fecha_emision || c.fecha || '';
                    return (
                      <option key={c.id || c.ID} value={c.id || c.ID}>
                        {tipo} N° {nro} {fecha ? `- ${fecha}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comprobante Adjunto (opcional)</label>
                <div className="flex items-center gap-2">
                  {formDataVenta.archivo_url && String(formDataVenta.archivo_url).startsWith('http') && (
                    <a
                      href={formDataVenta.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 text-sky-700 rounded-lg font-bold text-[10px] border border-sky-200 hover:bg-sky-100"
                      title="Ver archivo actual"
                    >
                      <Paperclip className="w-3 h-3" /> Ver actual
                    </a>
                  )}
                  {archivoBase64Venta && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Nuevo adjunto listo
                    </span>
                  )}
                  {!esReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                      >
                        {formDataVenta.archivo_url ? 'Reemplazar archivo' : 'Adjuntar archivo'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={handleAdjuntarArchivoLocal}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs uppercase text-slate-800">Detalle de Conceptos / Ítems</h4>
                {!esReadOnly && (
                  <button
                    type="button"
                    onClick={onAgregarItem}
                    disabled={isSavingVenta}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                  </button>
                )}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <th className="px-3 py-2.5">Descripción</th>
                      <th className="px-3 py-2.5 w-20 text-center">Cant.</th>
                      <th className="px-3 py-2.5 w-28 text-right">P. Unit.</th>
                      <th className="px-3 py-2.5 w-36 text-right">Subtotal</th>
                      <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formDataVenta.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            {...inputProps}
                            placeholder="Detalle del concepto..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                            value={item.descripcion}
                            onChange={(e) => onCambiarItem(item.id, 'descripcion', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            {...inputProps}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                            value={item.cantidad}
                            onChange={(e) => onCambiarItem(item.id, 'cantidad', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            {...inputProps}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                            value={item.precio_unitario}
                            onChange={(e) => onCambiarItem(item.id, 'precio_unitario', e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-black text-slate-900 whitespace-nowrap">
                          $ {Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!esReadOnly && (
                            <button
                              type="button"
                              onClick={() => onQuitarItem(item.id)}
                              disabled={isSavingVenta}
                              className="text-slate-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Neto Gravado ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none"
                  value={formDataVenta.neto_gravado}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, neto_gravado: e.target.value })}
                  disabled={esReadOnly}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 21% ($)</label>
                <input
                  type="number"
                  step="0.01"
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.iva_21}
                  onChange={(e) => {
                    const iva = Number(e.target.value) || 0;
                    const total = Number(formDataVenta.neto_gravado) + iva + Number(formDataVenta.iva_105 || 0) + Number(formDataVenta.otros_tributos || 0);
                    setFormDataVenta({ ...formDataVenta, iva_21: iva, total });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 10.5% ($)</label>
                <input
                  type="number"
                  step="0.01"
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.iva_105}
                  onChange={(e) => {
                    const iva105 = Number(e.target.value) || 0;
                    const total = Number(formDataVenta.neto_gravado) + Number(formDataVenta.iva_21 || 0) + iva105 + Number(formDataVenta.otros_tributos || 0);
                    setFormDataVenta({ ...formDataVenta, iva_105: iva105, total });
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  {...inputProps}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-sky-600 outline-none focus:border-sky-500 disabled:bg-slate-100"
                  value={formDataVenta.total}
                  onChange={(e) => setFormDataVenta({ ...formDataVenta, total: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                disabled={isSavingVenta}
                className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer"
              >
                {esReadOnly ? 'Cerrar' : 'Cancelar'}
              </button>
              {!esReadOnly && (
                <button
                  type="submit"
                  disabled={isSavingVenta}
                  className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  {isSavingVenta && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSavingVenta ? 'Guardando...' : (editingId ? 'Actualizar Factura' : 'Guardar Factura Venta')}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}