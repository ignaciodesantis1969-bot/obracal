// src/services/comprasService.js
import { auth } from '@/firebase';
import { GOOGLE_SCRIPT_URL } from '@/api';

// ==========================================
// 1. LÓGICA DE MATCHING Y TEXTO
// ==========================================

export const normalizarNombre = (str) => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(s\.?a\.?u?\.?|s\.?r\.?l\.?|sociedad anonima|sociedad de responsabilidad limitada)\b/gi, '')
    .replace(/[.,;:()\-_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  return {
    mejor: top.item,
    candidatos: candidatos.map(c => c.item),
    scoreMejor: top.score
  };
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
      return esTipoB ? 'Nota de Crédito Electrónica MiPyMEs (FCE) B' : 'Nota de Crédito Electrónica MiPyMEs (FCE) A';
    }
    return esTipoB ? 'Nota de Crédito B' : 'Nota de Crédito A';
  }
  if (t.includes('nota de debito') || t.includes('nota de débito') || t === 'nd') {
    if (esElectronica) {
      return esTipoB ? 'Nota de Débito Electrónica MiPyMEs (FCE) B' : 'Nota de Débito Electrónica MiPyMEs (FCE) A';
    }
    return esTipoB ? 'Nota de Débito B' : 'Nota de Débito A';
  }
  if (t.includes('ticket')) return 'Ticket';
  if (t.includes('factura')) {
    if (tf.includes(' c') || tf.endsWith('c')) return 'Factura C';
    if (tf.includes(' b') || tf.endsWith('b')) return 'Factura B';
    if (esElectronica) {
      return esTipoB ? 'Factura de Crédito Electrónica MiPyMEs (FCE) B' : 'Factura de Crédito Electrónica MiPyMEs (FCE) A';
    }
    return 'Factura A';
  }
  return 'Factura A';
};

// ==========================================
// 2. LLAMADAS AL BACKEND (APPS SCRIPT)
// ==========================================

export const subirArchivoADrive = async (base64, tabla) => {
  if (!base64 || base64.indexOf('data:') !== 0) return base64 || '';
  try {
    let idToken = '';
    if (auth.currentUser) {
      idToken = await auth.currentUser.getIdToken(true);
    }

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'subirArchivoDrive',
        base64: base64,
        tabla: tabla,
        idToken: idToken
      })
    });
    const data = await res.json();
    
    // 🔑 AHORA LANZAMOS EL ERROR PARA QUE SE VEA EN PANTALLA
    if (!data.success || !data.archivo_url) {
      throw new Error(data.error || 'El servidor no devolvió una URL válida');
    }
    return data.archivo_url;
  } catch (err) {
    console.error("Error subiendo archivo a Drive:", err);
    throw err;
  }
};

export const procesarFacturaConAI = async (base64Data, mimeType) => {
  try {
    let idToken = '';
    if (auth.currentUser) {
      idToken = await auth.currentUser.getIdToken();
    }

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'procesarFacturaConAI',
        base64: base64Data,
        mimeType: mimeType,
        idToken: idToken
      })
    });
    const textoRespuesta = await res.text();
    let data;
    try { data = JSON.parse(textoRespuesta); } catch (parseErr) { data = { success: false, error: "Respuesta no-JSON del servidor." }; }

    if (!data || data.success === false) {
      throw new Error((data && data.error) || "El OCR no pudo procesar el archivo.");
    }
    return data;
  } catch (err) {
    throw err;
  }
};