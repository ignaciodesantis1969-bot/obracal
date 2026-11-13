// src/services/tesoreriaService.js
// Toda la lógica de Firestore / Drive / GAS para Tesorería.
// No usa hooks de React ni estado.

import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';
import { auth } from '@/firebase';
import { GOOGLE_SCRIPT_URL } from '@/api';
import {
  esNotaCredito,
  esNotaDebito,
  normalizarNumComp,
  calcularEstadoPagoFactura,
} from '@/utils/tesoreriaHelpers';

// ─────────────────────────────────────────────────────────────
// Drive / GAS
// ─────────────────────────────────────────────────────────────

/**
 * Sube un archivo base64 a Drive vía GAS. Devuelve la URL, o '' si falla.
 */
export const subirArchivoADrive = async (base64, tabla) => {
  if (!base64 || !base64.startsWith('data:')) return base64 || '';
  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'subirArchivoDrive',
        base64,
        tabla,
        subseccion: '',
        idToken,
      }),
    });
    const data = await res.json();
    if (data.success && data.archivo_url) return data.archivo_url;
    console.warn('[subirArchivoADrive] No se pudo subir:', data.error);
    return '';
  } catch (err) {
    console.error('[subirArchivoADrive] Error:', err);
    return '';
  }
};

/**
 * Procesa OCR de una factura de venta vía GAS. Devuelve el JSON parseado o lanza error.
 */
export const procesarFacturaVentaConIA = async ({ base64, mimeType }) => {
  if (!GOOGLE_SCRIPT_URL) throw new Error('GOOGLE_SCRIPT_URL no está configurada.');
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken(true) : '';
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'procesarFacturaConAI',
      tabla: 'FacturasVenta',
      base64,
      mimeType,
      idToken,
    }),
  });
  const texto = await res.text();
  let data;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error('El servidor no devolvió un formato JSON válido.');
  }
  if (!data.success || data.error) {
    throw new Error(data.error || 'No se pudieron extraer los datos.');
  }
  return data;
};

// ─────────────────────────────────────────────────────────────
// Helpers internos del service
// ─────────────────────────────────────────────────────────────

const resolverContextoComprobante = ({
  formData,
  facturasCompras,
  facturasVentas,
  proveedores,
  clientes,
}) => {
  const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';
  const facturaAsociadaId =
    formData.facturas_aplicadas?.find(f => f.factura_id)?.factura_id || '';

  let nroComprobanteTexto = '---';
  let proveedorIdReal = formData.proveedor_id || '';
  let clienteIdReal = formData.cliente_id || '';

  if (facturaAsociadaId) {
    if (esIngreso) {
      const fac = facturasVentas.find(f => String(f.id || f.ID) === String(facturaAsociadaId));
      if (fac) {
        const pv = fac.punto_venta ? String(fac.punto_venta).padStart(5, '0') : '';
        const nc = fac.numero_comp ? String(fac.numero_comp).padStart(8, '0') : '';
        nroComprobanteTexto = pv && nc ? `${pv}-${nc}` : (fac.numero_comp || '---');
        if (!clienteIdReal) clienteIdReal = fac.cliente_id || fac.Cliente_id || '';
      }
    } else {
      const fac = facturasCompras.find(f => String(f.id || f.ID) === String(facturaAsociadaId));
      if (fac) {
        const pv = fac.punto_venta ? String(fac.punto_venta).padStart(5, '0') : '';
        const nc = fac.numero_comp ? String(fac.numero_comp).padStart(8, '0') : '';
        nroComprobanteTexto = pv && nc ? `${pv}-${nc}` : (fac.n_factura || fac.numero_comp || '---');
        if (!proveedorIdReal) proveedorIdReal = fac.proveedor_id || fac.Proveedor_id || '';
      }
    }
  }

  if (formData.concepto) {
    const conceptoLower = formData.concepto.toLowerCase();
    if (esIngreso && !clienteIdReal) {
      const match = clientes.find(c => {
        const nombre = String(c.razon_social || c.nombre || '').toLowerCase();
        return nombre.length > 3 && conceptoLower.includes(nombre);
      });
      if (match) clienteIdReal = match.id || match.ID;
    } else if (!esIngreso && !proveedorIdReal) {
      const match = proveedores.find(p => {
        const nombre = String(p.razon_social || p.nombre || '').toLowerCase();
        return nombre.length > 3 && conceptoLower.includes(nombre);
      });
      if (match) proveedorIdReal = match.id || match.ID;
    }
    if (nroComprobanteTexto === '---') {
      const m = formData.concepto.match(/(\d{3,5}[-]\d{4,8})/);
      if (m) nroComprobanteTexto = m[0];
    }
  }

  return { esIngreso, nroComprobanteTexto, proveedorIdReal, clienteIdReal };
};

const sincronizarRetenciones = async ({
  movimientoId,
  formData,
  editingId,
  retencionesExistentes,
  nroComprobanteTexto,
  proveedorIdReal,
  clienteIdReal,
}) => {
  if (editingId) {
    const viejas = retencionesExistentes.filter(
      r => String(r.tesoreria_id) === String(editingId)
    );
    for (const r of viejas) {
      try {
        await eliminarDoc('retenciones', r.id || r.ID);
      } catch (err) {
        console.error(`Error al borrar retención vieja ${r.id}:`, err);
      }
    }
  }

  const tipos = [
    { campo: 'retencion_suss', tipo: 'SUSS' },
    { campo: 'retencion_iva', tipo: 'IVA' },
    { campo: 'retencion_ganancias', tipo: 'Ganancias' },
    { campo: 'retencion_iibb_pba', tipo: 'IIBB PBA' },
    { campo: 'retencion_iibb_caba', tipo: 'IIBB CABA' },
  ];
  const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';

  for (const t of tipos) {
    const monto = Number(formData[t.campo] || 0);
    if (monto <= 0) continue;
    try {
      await crearDoc('retenciones', {
        tesoreria_id: movimientoId,
        tipo: t.tipo,
        monto,
        fecha: formData.fecha,
        concepto: `Retención ${t.tipo} - ${formData.concepto}`,
        proveedor_id: esIngreso ? '' : proveedorIdReal,
        cliente_id: esIngreso ? clienteIdReal : '',
        obra_id: formData.obra_id || '',
        presupuesto_id: formData.presupuesto_id || '',
        comprobante_asociado: nroComprobanteTexto,
        certificado_url: '',
        es_manual: false,
      });
    } catch (err) {
      console.error(`Error al crear retención ${t.tipo}:`, err);
    }
  }
};

const actualizarEstadosFacturasAplicadas = async ({
  formData,
  facturasCompras,
  facturasVentas,
}) => {
  if (!Array.isArray(formData.facturas_aplicadas)) return;
  const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';
  const listaObjetivo = esIngreso ? facturasVentas : facturasCompras;
  const coleccion = esIngreso ? 'facturas_ventas' : 'facturas_compras';

  for (const item of formData.facturas_aplicadas) {
    if (!item.factura_id) continue;
    const fac = listaObjetivo.find(f => String(f.id || f.ID) === String(item.factura_id));
    if (!fac) continue;
    const total = Number(fac.total || fac.Total || 0);
    const aplicado = Number(item.monto || 0);
    const nuevoEstado = calcularEstadoPagoFactura(aplicado, total);
    try {
      await actualizarDoc(coleccion, fac.id || fac.ID, { estado_pago: nuevoEstado });
    } catch (err) {
      console.error(`Error al actualizar estado_pago de factura ${fac.id}:`, err);
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Movimientos
// ─────────────────────────────────────────────────────────────

export const guardarMovimientoTesoreria = async ({
  formData,
  editingId,
  montoNetoEfectivo,
  retencionesExistentes = [],
  facturasCompras = [],
  facturasVentas = [],
  proveedores = [],
  clientes = [],
}) => {
  const payload = {
    ...formData,
    monto: montoNetoEfectivo,
    facturas_aplicadas: JSON.stringify(formData.facturas_aplicadas),
  };
  delete payload._creadoEn;
  delete payload._actualizadoEn;
  delete payload.id;

  let nuevoDocId = editingId;
  if (editingId) {
    await actualizarDoc('tesoreria', editingId, payload);
  } else {
    nuevoDocId = await crearDoc('tesoreria', payload);
  }
  if (!nuevoDocId) throw new Error('No se pudo guardar el movimiento.');

  const { nroComprobanteTexto, proveedorIdReal, clienteIdReal } = resolverContextoComprobante({
    formData,
    facturasCompras,
    facturasVentas,
    proveedores,
    clientes,
  });

  await sincronizarRetenciones({
    movimientoId: nuevoDocId,
    formData,
    editingId,
    retencionesExistentes,
    nroComprobanteTexto,
    proveedorIdReal,
    clienteIdReal,
  });

  await actualizarEstadosFacturasAplicadas({ formData, facturasCompras, facturasVentas });

  return nuevoDocId;
};

export const eliminarMovimientoTesoreria = async (movimientoId, retencionesAsociadas = []) => {
  await eliminarDoc('tesoreria', movimientoId);
  for (const r of retencionesAsociadas) {
    try {
      await eliminarDoc('retenciones', r.id || r.ID);
    } catch (err) {
      console.error(`Error al borrar retención ${r.id}:`, err);
    }
  }
};

export const contabilizarNCCompra = async (factura, proveedores = []) => {
  const facturaId = factura.id || factura.ID;
  if (!facturaId) throw new Error('No se pudo identificar la NC.');

  const prov = proveedores.find(
    p => String(p.id || p.ID) === String(factura.proveedor_id || factura.Proveedor_id)
  );
  const nombreProv = prov?.razon_social || prov?.nombre || 'Proveedor';
  const tipoComp = factura.comprobante_tipo || factura.tipo_comprobante || 'Nota de Crédito';
  const nFactura = factura.n_factura || factura.numero_comp || 'S/N';
  const concepto = `${tipoComp} ${nFactura} - ${nombreProv}`;

  await crearDoc('tesoreria', {
    tipo: 'contabilizada',
    origen: 'compra',
    fecha: factura.fecha || factura.Fecha || new Date().toISOString().split('T')[0],
    concepto,
    monto: Number(factura.total || factura.Total || 0),
    obra_id: factura.obra_id || '',
    presupuesto_id: factura.presupuesto_id || '',
    contrato_id: factura.contrato_id || '',
    rubro_imputacion: factura.rubro_imputacion || '',
    tipo_insumo: factura.tipo_insumo || '',
    medio_pago: '',
    referencia: factura.comprobante_anula
      ? `Anula/ajusta: ${factura.comprobante_anula}`
      : 'NC parcial por devolución',
    retencion_suss: 0,
    retencion_iva: 0,
    retencion_ganancias: 0,
    retencion_iibb_pba: 0,
    retencion_iibb_caba: 0,
    facturas_aplicadas: JSON.stringify([]),
    es_autogenerado: true,
    factura_compra_id: facturaId,
  });

  await actualizarDoc('facturas_compras', facturaId, { estado_pago: 'contabilizado' });
  return concepto;
};

// ─────────────────────────────────────────────────────────────
// Facturas de Venta
// ─────────────────────────────────────────────────────────────

const anularFacturaPorNC = async ({ formDataVenta, facturasVentas, nuevoDocId }) => {
  const anula = String(formDataVenta.comprobante_anula).trim();
  let ptoVtaAnula = '';
  let nCompAnula = '';
  if (anula.includes('-')) {
    const [pv, nc] = anula.split('-');
    ptoVtaAnula = pv.trim();
    nCompAnula = nc.trim();
  } else {
    nCompAnula = anula;
  }

  const pvNorm = normalizarNumComp(ptoVtaAnula);
  const ncNorm = normalizarNumComp(nCompAnula);
  const esFacturable = (f) =>
    String(f.estado_pago || '').toLowerCase() !== 'anulada' &&
    f.es_nota_credito !== true &&
    f.es_nota_debito !== true;

  let original = facturasVentas.find((f) => {
    if (!esFacturable(f)) return false;
    const fpvNorm = normalizarNumComp(f.punto_venta);
    const fncNorm = normalizarNumComp(f.numero_comp);
    if (pvNorm && ncNorm) return fpvNorm === pvNorm && fncNorm === ncNorm;
    return fncNorm === ncNorm;
  });
  if (!original && ncNorm) {
    original = facturasVentas.find(
      f => esFacturable(f) && normalizarNumComp(f.numero_comp) === ncNorm
    );
  }

  if (!original) {
    throw new Error(
      `No se encontró la factura ${formDataVenta.comprobante_anula} en el sistema. ` +
      `La Nota de Crédito se guardó pero la factura no se marcó como anulada.`
    );
  }

  const originalId = original.id || original.ID;
  await actualizarDoc('facturas_ventas', originalId, {
    estado_pago: 'anulada',
    anulada_por_nc_id: nuevoDocId,
    anulada_por_nc_numero: `${formDataVenta.punto_venta}-${formDataVenta.numero_comp}`,
    anulada_fecha: formDataVenta.fecha_emision,
  });

  const tipo = original.tipo_comprobante || 'Factura';
  const pv = String(original.punto_venta || ptoVtaAnula || '').padStart(5, '0');
  const nro = String(original.numero_comp || nCompAnula || '').padStart(8, '0');

  await crearDoc('tesoreria', {
    tipo: 'anulada',
    origen: 'venta',
    fecha: formDataVenta.fecha_emision,
    concepto: `ANULACIÓN ${tipo} ${pv}-${nro}`,
    monto: 0,
    obra_id: original.obra_id || '',
    presupuesto_id: original.presupuesto_id || '',
    contrato_id: original.contrato_id || '',
    rubro_imputacion: '',
    tipo_insumo: '',
    medio_pago: '',
    referencia: `Anulada por NC ${formDataVenta.punto_venta}-${formDataVenta.numero_comp}`,
    retencion_suss: 0,
    retencion_iva: 0,
    retencion_ganancias: 0,
    retencion_iibb_pba: 0,
    retencion_iibb_caba: 0,
    facturas_aplicadas: JSON.stringify([]),
    es_autogenerado: true,
    es_anulacion: true,
    factura_anulada_id: originalId,
    nota_credito_id: nuevoDocId,
  });
};

const crearMovimientoContableNCND = async ({ formDataVenta, nuevoDocId, totalFinal, esNC }) => {
  const concepto = esNC
    ? `Nota de Crédito ${formDataVenta.punto_venta}-${formDataVenta.numero_comp}`
    : `Nota de Débito ${formDataVenta.punto_venta}-${formDataVenta.numero_comp}`;

  await crearDoc('tesoreria', {
    tipo: 'contabilizada',
    origen: 'venta',
    fecha: formDataVenta.fecha_emision,
    concepto,
    monto: totalFinal,
    obra_id: formDataVenta.obra_id || '',
    presupuesto_id: '',
    contrato_id: '',
    rubro_imputacion: '',
    tipo_insumo: '',
    medio_pago: '',
    referencia: `Comprobante que anula: ${formDataVenta.comprobante_anula || '---'}`,
    retencion_suss: 0,
    retencion_iva: 0,
    retencion_ganancias: 0,
    retencion_iibb_pba: 0,
    retencion_iibb_caba: 0,
    facturas_aplicadas: JSON.stringify([]),
    es_autogenerado: true,
    factura_venta_id: nuevoDocId,
  });
};

/**
 * Crea una factura de venta (con o sin archivo), maneja NC/ND y anulación de la original.
 * Devuelve { nuevoDocId, totalFinal, esNC, esND, anulacionFallida }.
 */
export const crearFacturaVenta = async ({
  formDataVenta,
  archivoBase64,
  facturasVentas = [],
}) => {
  let archivoUrlFinal = formDataVenta.archivo_url || '';
  if (archivoBase64 && archivoBase64.startsWith('data:')) {
    archivoUrlFinal = await subirArchivoADrive(archivoBase64, 'FacturasVenta');
  }

  const esNC = esNotaCredito(formDataVenta.tipo_comprobante);
  const esND = esNotaDebito(formDataVenta.tipo_comprobante);
  const signo = esNC ? -1 : 1;
  const totalFinal = Number(formDataVenta.total || 0) * signo;

  const datos = {
    ...formDataVenta,
    neto_gravado: Number(formDataVenta.neto_gravado || 0) * signo,
    iva_21: Number(formDataVenta.iva_21 || 0) * signo,
    iva_105: Number(formDataVenta.iva_105 || 0) * signo,
    otros_tributos: Number(formDataVenta.otros_tributos || 0) * signo,
    total: totalFinal,
    archivo_url: archivoUrlFinal,
    estado_pago: esNC ? 'anulada' : (formDataVenta.estado_pago || 'pendiente'),
    es_nota_credito: esNC,
    es_nota_debito: esND,
    items: JSON.stringify(formDataVenta.items || []),
  };
  delete datos._creadoEn;
  delete datos._actualizadoEn;
  delete datos.id;

  const nuevoDocId = await crearDoc('facturas_ventas', datos);

  let anulacionFallida = null;
  if (esNC && formDataVenta.comprobante_anula) {
    try {
      await anularFacturaPorNC({ formDataVenta, facturasVentas, nuevoDocId });
    } catch (err) {
      console.error('[crearFacturaVenta] Error anulando factura original:', err);
      anulacionFallida = err.message || 'Error desconocido';
    }
  }

  if (esNC || esND) {
    try {
      await crearMovimientoContableNCND({ formDataVenta, nuevoDocId, totalFinal, esNC });
    } catch (err) {
      console.error('[crearFacturaVenta] Error al crear movimiento contable:', err);
    }
  }

  return { nuevoDocId, totalFinal, esNC, esND, anulacionFallida };
};

/**
 * Actualiza una factura de venta existente (usado por el modal de edición).
 * NO permite cambiar los importes en negativo de una NC ya contabilizada
 * desde acá (eso lo maneja el flujo de anulación).
 */
export const actualizarFacturaVenta = async (facturaId, datos) => {
  if (!facturaId) throw new Error('Falta el ID de la factura.');
  const payload = { ...datos };
  delete payload._creadoEn;
  delete payload._actualizadoEn;
  delete payload.id;
  if (Array.isArray(payload.items)) {
    payload.items = JSON.stringify(payload.items);
  }
  await actualizarDoc('facturas_ventas', facturaId, payload);
  return facturaId;
};

// ─────────────────────────────────────────────────────────────
// Retenciones
// ─────────────────────────────────────────────────────────────

export const subirCertificadoRetencion = async (retencionId, base64, nombreArchivo) => {
  if (!retencionId) throw new Error('No se pudo identificar la retención.');
  const url = await subirArchivoADrive(base64, 'Retenciones');
  if (!url) throw new Error('No se pudo subir el archivo a Drive.');
  await actualizarDoc('retenciones', retencionId, {
    certificado_url: url,
    certificado_nombre: nombreArchivo,
  });
  return url;
};
// ─────────────────────────────────────────────────────────────
// Envío al contador
// ─────────────────────────────────────────────────────────────

/**
 * Envía un lote de retenciones al contador vía GAS.
 * Requiere que en Apps Script exista `action: 'enviarRetencionesAlContador'`.
 */
export const enviarRetencionesAlContador = async ({
  email,
  fechaDesde,
  fechaHasta,
  retenciones,
}) => {
  const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'enviarRetencionesAlContador',
      email,
      fechaDesde: fechaDesde || 'Inicio',
      fechaHasta: fechaHasta || 'Fin',
      retenciones,
      idToken,
    }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Error desconocido al enviar.');
  }
  return data;
};