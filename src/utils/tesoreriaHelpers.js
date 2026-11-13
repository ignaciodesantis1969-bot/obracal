// src/utils/tesoreriaHelpers.js
// Funciones puras de Tesorería (sin dependencias de React ni Firebase)

export const esNotaCredito = (tipoComprobante) => {
  return String(tipoComprobante || '').toUpperCase().includes('NOTA DE CREDITO');
};

export const esNotaDebito = (tipoComprobante) => {
  return String(tipoComprobante || '').toUpperCase().includes('NOTA DE DEBITO');
};

export const tipoMovimientoDesdeComprobante = (tipoComprobante) => {
  if (esNotaCredito(tipoComprobante)) return 'contabilizada';
  if (esNotaDebito(tipoComprobante)) return 'contabilizada';
  return 'Ingreso';
};

export const normalizarNombre = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?a\.?u?\.?|s\.?r\.?l\.?|sociedad anonima|sociedad de responsabilidad limitada)\b/gi, '')
    .replace(/[.,;:()\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizarNumComp = (s) => {
  return String(s || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
};

export const buscarMejorMatch = (nombreOCR, lista) => {
  if (!nombreOCR || !lista || lista.length === 0) {
    return { mejor: null, candidatos: [], scoreMejor: 0 };
  }
  const normOCR = normalizarNombre(nombreOCR);
  const palabrasOCR = normOCR.split(' ').filter(p => p.length >= 3);
  if (palabrasOCR.length === 0) return { mejor: null, candidatos: [], scoreMejor: 0 };

  const scored = lista.map(item => {
    const nombreItem = item.razon_social || item.nombre || item.Razon_social || item.Nombre || '';
    const normItem = normalizarNombre(nombreItem);
    const coincidencias = palabrasOCR.filter(w => normItem.includes(w)).length;
    const scorePalabras = (coincidencias / palabrasOCR.length) * 100;
    if (normOCR === normItem) return { item, nombre: nombreItem, score: 100 };
    if (normItem.includes(normOCR) || normOCR.includes(normItem)) {
      return { item, nombre: nombreItem, score: Math.min(95, scorePalabras + 20) };
    }
    return { item, nombre: nombreItem, score: scorePalabras };
  }).filter(s => s.score >= 60);

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return { mejor: null, candidatos: [], scoreMejor: 0 };
  const top = scored[0];
  const candidatos = scored.filter(s => (top.score - s.score) < 15);
  return { mejor: top.item, candidatos: candidatos.map(c => c.item), scoreMejor: top.score };
};

export const inferirOrigenMovimiento = (m) => {
  if (m.origen) return m.origen;
  const concepto = String(m.concepto || m.Concepto || '').toLowerCase();
  const tipo = String(m.tipo || m.Tipo || '').toLowerCase();

  if (concepto.startsWith('pago factura')) return 'compra';
  if (concepto.startsWith('cobro')) return 'venta';

  if (concepto.includes('nota de crédito') || concepto.includes('nota de credito') ||
      concepto.includes('nota de débito') || concepto.includes('nota de debito')) {
    const match = concepto.match(/(\d{3,5})-(\d{4,8})/);
    if (match) {
      const pv = match[1];
      if (pv.length === 5) return 'venta';
      if (pv.length === 4) return 'compra';
    }
    if (tipo.includes('anulad')) return 'venta';
    const rubroImp = String(m.rubro_imputacion || '').trim();
    if (rubroImp && rubroImp !== '---') return 'compra';
    return 'venta';
  }
  if (tipo === 'anulada') return 'venta';
  return '';
};

export const mapearTipoComprobante = (tipoComprobanteOCR, tipoFacturaOCR, nombreArchivo = '') => {
  const t = String(tipoComprobanteOCR || '').toLowerCase();
  const tf = String(tipoFacturaOCR || '').toLowerCase();
  const nf = String(nombreArchivo || '').toUpperCase();

  const esElectronica =
    nf.includes('NCE') || nf.includes('NDE') || nf.includes('FCE') ||
    nf.includes('NCA') || nf.includes('NDA') || nf.includes('FCA') ||
    nf.includes('NCB') || nf.includes('NDB') || nf.includes('FCB') ||
    nf.includes('ELECTRONICA') || nf.includes('MIPYME') ||
    tf.includes('electronica') || tf.includes('fce') || tf.includes('mipyme');

  const esTipoB = tf.includes(' b') || tf.endsWith('b') || /\bB\b/.test(nf);

  if (t.includes('nota de credito') || t.includes('nota de crédito') || t === 'nc') {
    if (esElectronica) {
      return esTipoB
        ? 'NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) B'
        : 'NOTA DE CREDITO ELECTRONICA MiPyMEs (FCE) A';
    }
    return esTipoB ? 'NOTA DE CREDITO B' : 'NOTA DE CREDITO A';
  }
  if (t.includes('nota de debito') || t.includes('nota de débito') || t === 'nd') {
    if (esElectronica) {
      return esTipoB
        ? 'NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) B'
        : 'NOTA DE DEBITO ELECTRONICA MiPyMEs (FCE) A';
    }
    return esTipoB ? 'NOTA DE DEBITO B' : 'NOTA DE DEBITO A';
  }
  if (t.includes('recibo')) {
    return esTipoB ? 'RECIBO B' : 'RECIBO A';
  }
  if (esElectronica) {
    return esTipoB
      ? 'FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) B'
      : 'FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) A';
  }
  return esTipoB ? 'FACTURA B' : 'FACTURA A';
};

export const formatearFechaDisplay = (fechaStr) => {
  if (!fechaStr) return '---';
  const partes = String(fechaStr).split('T')[0].split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return fechaStr;
};

export const formatearFechaParaInput = (fechaStr) => {
  if (!fechaStr) return '';
  const str = String(fechaStr).trim().split('T')[0];
  if (str.includes('/')) {
    const partes = str.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return str;
};

export const calcularEstadoPagoFactura = (montoAplicado, totalFactura) => {
  if (montoAplicado >= totalFactura) return 'pagado';
  if (montoAplicado > 0) return 'pagado parcial';
  return 'pendiente';
};