import React, { useState, useMemo } from 'react';
import { Plus, Calendar, FileText, Paperclip, Edit2, Trash2, X, Upload, AlertCircle, CheckCircle2, Loader2, ShoppingCart } from 'lucide-react';

export default function Compras({  
  GOOGLE_SCRIPT_URL, 
  facturas = [], 
  ordenesCompra = [], 
  proveedores = [], 
  obras = [], 
  presupuestos = [],
  contratosList: propContratos = [], 
  contratos: propContratosAlt = [], 
  insumosList = [], 
  rubros = [], 
  cargarDatos,
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    
    // 1. Búsqueda exacta directa
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    
    // 2. Búsqueda normalizada flexible (elimina tildes, símbolos especiales, mayúsculas, espacios y guiones bajos)
    const normalizar = (str) => String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const objKeys = Object.keys(obj);
    
    for (const key of keys) {
      const keyNorm = normalizar(key);
      const realKey = objKeys.find(k => normalizar(k) === keyNorm);
      if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') {
        return obj[realKey];
      }
    }
    return '';
  }
}) {
  const [activeTab, setActiveTab] = useState('facturas');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [isOcModalOpen, setIsOcModalOpen] = useState(false);
  const [editingOcId, setEditingOcId] = useState(null);

  const [localLoading, setLocalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    codigo: 'FAC-0001',
    tipo: 'Compra',
    comprobante_tipo: 'Factura A',
    n_factura: '',
    proveedor_id: '',
    obra_id: '',
    presupuesto_id: '',
    contrato_id: '', 
    tipo_gasto: 'Presupuesto', 
    rubro_imputacion: '', 
    tipo_insumo: 'Material', 
    detalle_gasto: '',
    fecha: new Date().toISOString().split('T')[0],
    vencimiento: '',
    estado_pago: 'pendiente',
    subtotal: 0,
    iva_21: 0,
    iva_10_5: 0,
    persp_iibb_bs_as: 0,
    persp_iibb_caba: 0,
    otros_impuestos: 0,
    total: 0,
    archivo_url: ''
  });

  const [formDataOc, setFormDataOc] = useState({
    codigo: 'OC-0001',
    proveedor_id: '',
    obra_id: '',
    fecha: new Date().toISOString().split('T')[0],
    fecha_entrega: '',
    estado: 'pendiente',
    subtotal: 0,
    iva_21: 0,
    total: 0,
    insumos_oc: [
      { id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }
    ]
  });

  const extraerArrayDatos = (fuente) => {
    if (Array.isArray(fuente)) return fuente;
    if (fuente && typeof fuente === 'object') {
      if (Array.isArray(fuente.data)) return fuente.data;
      if (Array.isArray(fuente.items)) return fuente.items;
      if (Array.isArray(fuente.result)) return fuente.result;
      if (Array.isArray(fuente.contratos_mantenimiento)) return fuente.contratos_mantenimiento;
      if (Array.isArray(fuente.contratosMantenimiento)) return fuente.contratosMantenimiento;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  const presupuestosAprobados = presupuestos.filter(pr => {
    const est = String(buscarValorEnObjeto(pr, ['estado', 'Estado', 'ESTADO']) || '').toLowerCase();
    return !est || est.includes('aprobad') || est.includes('aprobado');
  });
  const listaPresupuestosFinal = presupuestosAprobados.length > 0 ? presupuestosAprobados : presupuestos;

  const contratosList = useMemo(() => {
    const p = extraerArrayDatos(propContratos);
    const s = extraerArrayDatos(propContratosAlt);
    
    let extraGlobales = [];
    if (p.length === 0 && s.length === 0) {
      if (typeof window !== 'undefined' && window.globalData) {
        extraGlobales = extraerArrayDatos(window.globalData.contratos || window.globalData.contratosList || window.globalData.contratos_mantenimiento);
      }
    }

    const combinados = [...p, ...s, ...extraGlobales];
    const unicosMap = new Map();
    combinados.forEach((item, index) => {
      if (!item) return;
      const key = String(buscarValorEnObjeto(item, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id', 'nro_contrato']) || index);
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [propContratos, propContratosAlt]);

  const listaContratosFinal = useMemo(() => {
    if (!contratosList || contratosList.length === 0) return [];
    const filtrados = contratosList.filter(c => {
      const est = String(buscarValorEnObjeto(c, ['estado', 'Estado', 'ESTADO', 'status']) || '').toLowerCase();
      return !est || est.includes('aprobad') || est.includes('aprobado') || est.includes('vigente') || est.includes('activo') || est.includes('en curso');
    });
    return filtrados.length > 0 ? filtrados : contratosList;
  }, [contratosList]);

  const presupuestoSeleccionadoObj = presupuestos.find(pr => {
    const pId = buscarValorEnObjeto(pr, ['id', 'ID', 'Id']);
    return String(pId).trim() === String(formData.presupuesto_id).trim();
  });

  let rubrosDelPresupuesto = [];
  let gastosGeneralesDelPresupuesto = [];

  if (presupuestoSeleccionadoObj) {
    const rawItemsDetalle = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['items_detalle', 'Items_detalle', 'items', 'detalle']);
    try {
      let parsedData = rawItemsDetalle;
      if (typeof rawItemsDetalle === 'string') {
        parsedData = JSON.parse(rawItemsDetalle);
      }
      if (parsedData && Array.isArray(parsedData.rubros)) {
        rubrosDelPresupuesto = parsedData.rubros.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);
      } else if (Array.isArray(parsedData)) {
        rubrosDelPresupuesto = parsedData.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);
      }

      let rawGG = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['gastos_generales_insumos', 'Gastos_generales_insumos']);
      if (typeof rawGG === 'string') {
        try { rawGG = JSON.parse(rawGG); } catch(e) {}
      }
      if (Array.isArray(rawGG)) {
        gastosGeneralesDelPresupuesto = rawGG.map(item => item.concepto || item.nombre || item.descripcion).filter(Boolean);
      }
    } catch (e) {
      console.error("Error al parsear presupuesto:", e);
    }
  }

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return '---';
    const str = String(fechaStr).split('T')[0];
    const partes = str.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
  };

  const formatearFechaParaInput = (fechaStr) => {
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

  const generarSiguienteCodigoFactura = () => {
    if (!facturas || facturas.length === 0) return 'FAC-0001';
    const maxNum = facturas.reduce((max, f) => {
      const codeStr = buscarValorEnObjeto(f, ['codigo', 'Codigo', 'CODIGO']) || '';
      const match = codeStr.match(/FAC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `FAC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const generarSiguienteCodigoOc = () => {
    if (!ordenesCompra || ordenesCompra.length === 0) return 'OC-0001';
    const maxNum = ordenesCompra.reduce((max, oc) => {
      const codeStr = buscarValorEnObjeto(oc, ['codigo', 'Codigo', 'CODIGO']) || '';
      const match = codeStr.match(/OC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `OC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const handleArchivoSubido = async (e) => {
    if (!GOOGLE_SCRIPT_URL) {
      alert("ERROR: La variable GOOGLE_SCRIPT_URL no está configurada.");
      return;
    }
    const archivo = e.target.files[0];
    if (!archivo) return;
    setLocalLoading(true);

    const nombreArchivo = archivo.name.toLowerCase();
    const esNcArchivo = nombreArchivo.includes('nc') || nombreArchivo.includes('nota de credito') || nombreArchivo.includes('nota de crédito') || nombreArchivo.includes('credito');
    const tipoNcSugerido = nombreArchivo.includes(' b') || nombreArchivo.includes('_b') || nombreArchivo.includes('-b') ? 'Nota de Crédito B' : 'Nota de Crédito A';
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'procesarFacturaConAI',
              base64: base64Data,
              mimeType: archivo.type
            })
          });
          const textoRespuesta = await res.text();
          let data;
          try { data = JSON.parse(textoRespuesta); } catch (parseErr) { data = { success: false }; }
          
          let proveedorEncontradoId = '';
          if (data && data.proveedor && proveedores.length > 0) {
            const provMatch = proveedores.find(p => {
              const rSocial = buscarValorEnObjeto(p, ['razon_social', 'Razon_social', 'razonSocial']) || '';
              const nom = buscarValorEnObjeto(p, ['nombre', 'Nombre']) || '';
              return rSocial.toLowerCase().includes(data.proveedor.toLowerCase()) || nom.toLowerCase().includes(data.proveedor.toLowerCase());
            });
            if (provMatch) proveedorEncontradoId = buscarValorEnObjeto(provMatch, ['id', 'ID', 'Id']);
          }

          const tipoCompIA = data && (data.comprobante_tipo || data.tipo_comprobante || data.tipo);
          const esNcIA = tipoCompIA && (tipoCompIA.toLowerCase().includes('nota de crédito') || tipoCompIA.toLowerCase().includes('nota de credito'));
          const esNotaCreditoFinal = esNcArchivo || esNcIA;
          let tipoComprobanteFinal = esNotaCreditoFinal ? tipoNcSugerido : (tipoCompIA || 'Factura A');

          setFormData(prev => ({
            ...prev,
            comprobante_tipo: tipoComprobanteFinal,
            n_factura: (data && (data.n_factura || data.numero_factura)) || prev.n_factura,
            proveedor_id: proveedorEncontradoId || prev.proveedor_id,
            fecha: (data && formatearFechaParaInput(data.fecha)) || prev.fecha,
            vencimiento: (data && formatearFechaParaInput(data.vencimiento)) || prev.vencimiento,
            estado_pago: esNotaCreditoFinal ? 'contabilizado' : prev.estado_pago,
            subtotal: Math.abs(Number(data && data.subtotal) || prev.subtotal),
            iva_21: Math.abs(Number(data && data.iva_21) || prev.iva_21),
            iva_10_5: Math.abs(Number(data && data.iva_10_5) || prev.iva_10_5),
            persp_iibb_bs_as: Math.abs(Number(data && (data.persp_iibb_bs_as || data.percepcion_iibb)) || prev.persp_iibb_bs_as),
            persp_iibb_caba: Math.abs(Number(data && data.persp_iibb_caba) || prev.persp_iibb_caba),
            otros_impuestos: Math.abs(Number(data && data.otros_impuestos) || prev.otros_impuestos),
            total: Math.abs(Number(data && data.total) || prev.total),
            archivo_url: base64Data
          }));
          setIsUploadModalOpen(false);
          setIsFacturaModalOpen(true);
        } catch (fetchErr) {
          setFormData(prev => ({ ...prev, archivo_url: base64Data }));
          setIsUploadModalOpen(false);
          setIsFacturaModalOpen(true);
        } finally {
          setLocalLoading(false);
          e.target.value = "";
        }
      };
    } catch (err) {
      setLocalLoading(false);
      alert("Error: " + err.message);
    }
  };

  const handleVerArchivo = (f) => {
    const archivoUrl = buscarValorEnObjeto(f, ['archivo_url', 'Archivo_url', 'archivo', 'Archivo']) || '';
    if (!archivoUrl || archivoUrl === 'Comprobante_Adjunto') {
      alert("No hay un enlace de archivo válido.");
      return;
    }
    window.open(archivoUrl, '_blank');
  };

  const handleEditarFacturaClick = (f) => {
    const realId = buscarValorEnObjeto(f, ['id', 'ID', 'Id', 'codigo']);
    setEditingId(realId);

    const fechaCruda = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);
    const vencCrudo = buscarValorEnObjeto(f, ['vencimiento', 'Vencimiento', 'VENCIMIENTO']);
    const rubroImputacionVal = buscarValorEnObjeto(f, ['rubro_imputacion', 'Rubro_imputacion', 'rubro_presupuesto', 'Rubro_presupuesto', 'rubro', 'Rubro']);
    const tipoInsumoVal = buscarValorEnObjeto(f, ['tipo_insumo', 'Tipo_insumo', 'insumo', 'Insumo', 'renglon', 'Renglon']) || 'Material';
    const tipoComp = buscarValorEnObjeto(f, ['comprobante_tipo', 'Comprobante_tipo', 'tipo_comprobante']) || 'Factura A';
    const esNC = String(tipoComp).toLowerCase().includes('nota de crédito') || String(tipoComp).toLowerCase().includes('nota de credito');

    setFormData({ 
      ...f, 
      comprobante_tipo: tipoComp,
      n_factura: buscarValorEnObjeto(f, ['n_factura', 'N_factura', 'N_FACTURA', 'numero_factura']) || '',
      proveedor_id: buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID']) || '',
      obra_id: buscarValorEnObjeto(f, ['obra_id', 'Obra_id', 'OBRA_ID']) || '',
      presupuesto_id: buscarValorEnObjeto(f, ['presupuesto_id', 'Presupuesto_id']) || '',
      contrato_id: buscarValorEnObjeto(f, ['contrato_id', 'Contrato_id']) || '',
      tipo_gasto: buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto']) || 'Presupuesto',
      rubro_imputacion: rubroImputacionVal,
      tipo_insumo: tipoInsumoVal,
      detalle_gasto: buscarValorEnObjeto(f, ['detalle_gasto', 'Detalle_gasto']) || '',
      fecha: formatearFechaParaInput(fechaCruda),
      vencimiento: formatearFechaParaInput(vencCrudo),
      estado_pago: buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago', 'ESTADO_PAGO']) || (esNC ? 'contabilizado' : 'pendiente'),
      subtotal: Math.abs(Number(buscarValorEnObjeto(f, ['subtotal', 'Subtotal']) || 0)),
      iva_21: Math.abs(Number(buscarValorEnObjeto(f, ['iva_21', 'Iva_21']) || 0)),
      iva_10_5: Math.abs(Number(buscarValorEnObjeto(f, ['iva_10_5', 'Iva_10_5']) || 0)),
      persp_iibb_bs_as: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_bs_as', 'Persp_iibb_bs_as']) || 0)),
      persp_iibb_caba: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_caba', 'Persp_iibb_caba']) || 0)),
      otros_impuestos: Math.abs(Number(buscarValorEnObjeto(f, ['otros_impuestos', 'Otros_impuestos']) || 0)),
      total: Math.abs(Number(buscarValorEnObjeto(f, ['total', 'Total', 'TOTAL']) || 0)),
      archivo_url: buscarValorEnObjeto(f, ['archivo_url', 'Archivo_url', 'archivo']) || ''
    });
    setIsFacturaModalOpen(true);
  };

  const handleGuardarFactura = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const action = editingId ? 'update' : 'create';
      const codigoFinal = editingId ? (formData.codigo || generarSiguienteCodigoFactura()) : generarSiguienteCodigoFactura();

      const esNotaCredito = String(formData.comprobante_tipo || '').toLowerCase().includes('nota de crédito') || String(formData.comprobante_tipo || '').toLowerCase().includes('nota de credito');
      const factorSigno = esNotaCredito ? -1 : 1;

      // Se envían llaves duales para asegurar compatibilidad estricta con cualquier estructura en Google Sheets
      const payloadData = {
        ...formData,
        subtotal: Math.abs(Number(formData.subtotal) || 0) * factorSigno,
        iva_21: Math.abs(Number(formData.iva_21) || 0) * factorSigno,
        iva_10_5: Math.abs(Number(formData.iva_10_5) || 0) * factorSigno,
        persp_iibb_bs_as: Math.abs(Number(formData.persp_iibb_bs_as) || 0) * factorSigno,
        persp_iibb_caba: Math.abs(Number(formData.persp_iibb_caba) || 0) * factorSigno,
        otros_impuestos: Math.abs(Number(formData.otros_impuestos) || 0) * factorSigno,
        total: Math.abs(Number(formData.total) || 0) * factorSigno,
        estado_pago: esNotaCredito ? 'contabilizado' : formData.estado_pago,
        codigo: codigoFinal,
        n_factura: formData.n_factura,
        proveedor_id: formData.proveedor_id,
        obra_id: formData.obra_id,
        presupuesto_id: formData.presupuesto_id,
        contrato_id: formData.contrato_id,
        rubro_imputacion: formData.rubro_imputacion,
        rubro_presupuesto: formData.rubro_imputacion,
        rubro: formData.rubro_imputacion,
        tipo_insumo: formData.tipo_insumo,
        insumo: formData.tipo_insumo
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Facturas',
          action: action,
          id: editingId,
          data: payloadData
        })
      });

      const textoRespuesta = await res.text();
      let data;
      try { data = JSON.parse(textoRespuesta); } catch (parseErr) {
        alert("Error del servidor.");
        return;
      }

      if (data.success || data.id) {
        setIsFacturaModalOpen(false);
        if (cargarDatos) cargarDatos();
      } else {
        alert("Error al guardar: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      alert("Error de conexión: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarFactura = async (f) => {
    const facturaId = buscarValorEnObjeto(f, ['id', 'ID', 'Id', 'codigo']);
    if (!facturaId) {
      alert("⚠️ Error: No se pudo identificar el ID.");
      return;
    }
    if (!window.confirm("¿Estás seguro de eliminar esta factura?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Facturas', action: 'delete', id: facturaId })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        if (cargarDatos) cargarDatos();
      } else {
        alert("No se pudo eliminar.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAgregarInsumoOc = () => {
    setFormDataOc(prev => ({
      ...prev,
      insumos_oc: [...prev.insumos_oc, { id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }]
    }));
  };

  const handleCambiarInsumoOc = (id, campo, valor) => {
    const nuevos = formDataOc.insumos_oc.map(item => {
      if (item.id === id) {
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'cantidad' || campo === 'p_unitario') {
          actualizado.total = (Number(actualizado.cantidad) || 0) * (Number(actualizado.p_unitario) || 0);
        }
        return actualizado;
      }
      return item;
    });
    const nuevoSubtotal = nuevos.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    setFormDataOc(prev => ({ ...prev, insumos_oc: nuevos, subtotal: nuevoSubtotal, iva_21: nuevoSubtotal * 0.21, total: nuevoSubtotal * 1.21 }));
  };

  const handleQuitarInsumoOc = (id) => {
    const nuevos = formDataOc.insumos_oc.filter(i => i.id !== id);
    const nuevoSubtotal = nuevos.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    setFormDataOc(prev => ({ ...prev, insumos_oc: nuevos, subtotal: nuevoSubtotal, iva_21: nuevoSubtotal * 0.21, total: nuevoSubtotal * 1.21 }));
  };

  const handleEditarOcClick = (oc) => {
    const realId = buscarValorEnObjeto(oc, ['id', 'ID', 'Id', 'codigo']);
    setEditingOcId(realId);
    let insumosParseados = [];
    const rawInsumos = buscarValorEnObjeto(oc, ['insumos_oc', 'Insumos_oc', 'INSUMOS_OC']);
    try {
      insumosParseados = typeof rawInsumos === 'string' ? JSON.parse(rawInsumos) : (Array.isArray(rawInsumos) ? rawInsumos : []);
    } catch (err) { insumosParseados = []; }

    if (insumosParseados.length === 0) {
      insumosParseados = [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }];
    }

    setFormDataOc({ 
      ...oc, 
      fecha: formatearFechaParaInput(buscarValorEnObjeto(oc, ['fecha', 'Fecha'])),
      fecha_entrega: formatearFechaParaInput(buscarValorEnObjeto(oc, ['fecha_entrega', 'Fecha_entrega'])),
      insumos_oc: insumosParseados 
    });
    setIsOcModalOpen(true);
  };

  const handleGuardarOc = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const action = editingOcId ? 'update' : 'create';
      const codigoFinal = editingOcId ? formDataOc.codigo : generarSiguienteCodigoOc();
      const payloadData = { ...formDataOc, codigo: codigoFinal, insumos_oc: JSON.stringify(formDataOc.insumos_oc) };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'OrdenesCompra', action: action, id: editingOcId, data: payloadData })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success || data.id) {
        setIsOcModalOpen(false);
        if (cargarDatos) cargarDatos();
      } else {
        alert("Error al guardar OC.");
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const handleEliminarOc = async (oc) => {
    const ocId = buscarValorEnObjeto(oc, ['id', 'ID', 'Id', 'codigo']);
    if (!ocId || !window.confirm("¿Eliminar Orden de Compra?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'OrdenesCompra', action: 'delete', id: ocId })
      });
      if (cargarDatos) cargarDatos();
    } catch (err) { console.error(err); }
  };

  const facturasFiltradas = facturas.filter(f => {
    const provId = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID']);
    const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
    const fFecha = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);
    let matchFecha = true;
    if (filtroFechaDesde && fFecha && fFecha < filtroFechaDesde) matchFecha = false;
    if (filtroFechaHasta && fFecha && fFecha > filtroFechaHasta) matchFecha = false;
    return matchProveedor && matchFecha;
  });

  const ordenesFiltradas = ordenesCompra.filter(oc => {
    const provId = buscarValorEnObjeto(oc, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID']);
    const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
    const ocFecha = buscarValorEnObjeto(oc, ['fecha', 'Fecha', 'FECHA']);
    let matchFecha = true;
    if (filtroFechaDesde && ocFecha && ocFecha < filtroFechaDesde) matchFecha = false;
    if (filtroFechaHasta && ocFecha && ocFecha > filtroFechaHasta) matchFecha = false;
    return matchProveedor && matchFecha;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Compras</h1>
          <p className="text-slate-500 text-sm mt-1">Órdenes de compra y facturas de proveedores</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => {
            setEditingOcId(null);
            setFormDataOc({
              codigo: generarSiguienteCodigoOc(),
              proveedor_id: '',
              obra_id: '',
              fecha: new Date().toISOString().split('T')[0],
              fecha_entrega: '',
              estado: 'pendiente',
              subtotal: 0,
              iva_21: 0,
              total: 0,
              insumos_oc: [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }]
            });
            setIsOcModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva OC
          </button>
          <button onClick={() => {
            setEditingId(null);
            setFormData({
              codigo: generarSiguienteCodigoFactura(),
              tipo: 'Compra',
              comprobante_tipo: 'Factura A',
              n_factura: '',
              proveedor_id: '',
              obra_id: '',
              presupuesto_id: '',
              contrato_id: '',
              tipo_gasto: 'Presupuesto',
              rubro_imputacion: '',
              tipo_insumo: 'Material',
              detalle_gasto: '',
              fecha: new Date().toISOString().split('T')[0],
              vencimiento: '',
              estado_pago: 'pendiente',
              subtotal: 0,
              iva_21: 0,
              iva_10_5: 0,
              persp_iibb_bs_as: 0,
              persp_iibb_caba: 0,
              otros_impuestos: 0,
              total: 0,
              archivo_url: ''
            });
            setIsUploadModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm items-end">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Proveedor</label>
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500 cursor-pointer">
            <option value="">Todos los Proveedores</option>
            {proveedores.map(p => <option key={buscarValorEnObjeto(p, ['id', 'ID'])} value={buscarValorEnObjeto(p, ['id', 'ID'])}>{buscarValorEnObjeto(p, ['razon_social', 'nombre', 'Razon_social'])}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Desde</label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" />
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'ordenes' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Órdenes de Compra ({ordenesCompra.length})</button>
        <button onClick={() => setActiveTab('facturas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'facturas' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Facturas ({facturas.length})</button>
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-100 border-b text-[11px] text-slate-600 flex justify-between items-center">
            <span>Total de facturas recibidas: <b>{facturas.length}</b> | Filtradas: <b>{facturasFiltradas.length}</b></span>
          </div>

          {facturasFiltradas.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <FileText className="w-10 h-10 text-slate-300" />
              <span>No hay facturas registradas con los filtros seleccionados.</span>
            </div>
          ) : (
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
                  const provId = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID']);
                  const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));
                  const totalVal = Number(buscarValorEnObjeto(f, ['total', 'Total', 'TOTAL'])) || 0;
                  const estadoPago = String(buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago', 'ESTADO_PAGO']) || 'pendiente').toLowerCase();
                  const numeroFacturaDisplay = buscarValorEnObjeto(f, ['n_factura', 'N_factura', 'N_FACTURA', 'numero_factura']) || '---';
                  const codigoDisplay = buscarValorEnObjeto(f, ['codigo', 'Codigo', 'CODIGO']) || `FAC-${String(index + 1).padStart(4, '0')}`;
                  const archivoLink = buscarValorEnObjeto(f, ['archivo_url', 'Archivo_url', 'archivo', 'Archivo']) || '';
                  const tipoGastoDisplay = buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto']) || 'Presupuesto';
                  
                  const rubroImputacion = buscarValorEnObjeto(f, ['rubro_imputacion', 'Rubro_imputacion', 'rubro_presupuesto', 'Rubro_presupuesto', 'rubro', 'Rubro']);
                  const tipoInsumo = buscarValorEnObjeto(f, ['tipo_insumo', 'Tipo_insumo', 'insumo', 'Insumo', 'renglon', 'Renglon']);
                  const detalleDisplay = rubroImputacion ? `${rubroImputacion} (${tipoInsumo})` : (buscarValorEnObjeto(f, ['rubro', 'Rubro', 'detalle_gasto']) || '---');
                  const fechaFactura = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);

                  const rowKey = `${buscarValorEnObjeto(f, ['id', 'ID']) || codigoDisplay}-${numeroFacturaDisplay}-${index}`;

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-600">{codigoDisplay}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{numeroFacturaDisplay}</td>
                      <td className="px-4 py-4"><span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded text-[10px]">{tipoGastoDisplay}</span></td>
                      <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || prov?.Razon_social || buscarValorEnObjeto(f, ['proveedor']) || 'Proveedor'}</td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{detalleDisplay}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(fechaFactura)}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center"><span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoPago === 'pagado' ? 'bg-emerald-100 text-emerald-800' : estadoPago === 'contabilizado' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{estadoPago}</span></td>
                      <td className="px-4 py-4 text-center">
                        {archivoLink && archivoLink !== 'Comprobante_Adjunto' ? (
                          <button type="button" onClick={() => handleVerArchivo(f)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg shadow-sm cursor-pointer" title="Ver comprobante en Google Drive"><Paperclip className="w-4 h-4" /></button>
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
          )}
        </div>
      )}

      {activeTab === 'ordenes' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {ordenesFiltradas.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <ShoppingCart className="w-10 h-10 text-slate-300" />
              <span>No hay órdenes de compra registradas con los filtros seleccionados.</span>
            </div>
          ) : (
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
                  const provId = buscarValorEnObjeto(oc, ['proveedor_id', 'Proveedor_id']);
                  const obraId = buscarValorEnObjeto(oc, ['obra_id', 'Obra_id']);
                  const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));
                  const obra = obras.find(o => String(buscarValorEnObjeto(o, ['id', 'ID'])) === String(obraId));
                  const totalVal = Number(buscarValorEnObjeto(oc, ['total', 'Total', 'TOTAL'])) || 0;
                  const estadoOc = String(buscarValorEnObjeto(oc, ['estado', 'Estado']) || 'pendiente').toLowerCase();
                  const codigoDisplay = buscarValorEnObjeto(oc, ['codigo', 'Codigo']) || `OC-${String(index + 1).padStart(4, '0')}`;

                  return (
                    <tr key={buscarValorEnObjeto(oc, ['id', 'ID']) || index} className="hover:bg-slate-50 transition-colors">
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
                          <button onClick={() => handleEditarOcClick(oc)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarOc(oc)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isOcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingOcId ? 'Modificar Orden de Compra' : 'Nueva Orden de Compra'}</h3>
              <button onClick={() => setIsOcModalOpen(false)} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleGuardarOc} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra *</label>
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formDataOc.obra_id} onChange={(e) => setFormDataOc({...formDataOc, obra_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {obras.map(o => <option key={buscarValorEnObjeto(o, ['id', 'ID'])} value={buscarValorEnObjeto(o, ['id', 'ID'])}>{o.codigo} - {o.nombre || o.nombre_obra}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor *</label>
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formDataOc.proveedor_id} onChange={(e) => setFormDataOc({...formDataOc, proveedor_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={buscarValorEnObjeto(p, ['id', 'ID'])} value={buscarValorEnObjeto(p, ['id', 'ID'])}>{buscarValorEnObjeto(p, ['razon_social', 'nombre'])}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                  <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.fecha} onChange={(e) => setFormDataOc({...formDataOc, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Entrega</label>
                  <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.fecha_entrega} onChange={(e) => setFormDataOc({...formDataOc, fecha_entrega: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs uppercase text-slate-800">Items</h4>
                  <button type="button" onClick={handleAgregarInsumoOc} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <th className="px-3 py-2.5">Descripción</th>
                        <th className="px-3 py-2.5 w-24 text-center">Cant.</th>
                        <th className="px-3 py-2.5 w-28">Unidad</th>
                        <th className="px-3 py-2.5 w-32 text-right">P.Unit.</th>
                        <th className="px-3 py-2.5 w-32 text-right">Total</th>
                        <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(formDataOc.insumos_oc) && formDataOc.insumos_oc.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2"><input type="text" disabled={isSaving} placeholder="Descripción..." className="w-full bg-white border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.descripcion || ''} onChange={(e) => handleCambiarInsumoOc(item.id, 'descripcion', e.target.value)} /></td>
                          <td className="px-3 py-2 text-center"><input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.cantidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'cantidad', e.target.value)} /></td>
                          <td className="px-3 py-2"><input type="text" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-xs uppercase font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.unidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'unidad', e.target.value)} /></td>
                          <td className="px-3 py-2 text-right"><input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.p_unitario} onChange={(e) => handleCambiarInsumoOc(item.id, 'p_unitario', e.target.value)} /></td>
                          <td className="px-3 py-2 text-right font-black text-slate-900">$ {Number(item.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center"><button type="button" onClick={() => handleQuitarInsumoOc(item.id)} disabled={isSaving} className="text-slate-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsOcModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Guardando...' : (editingOcId ? 'Actualizar OC' : 'Crear OC')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nueva Factura — Subir comprobante</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 text-center space-y-6">
              <p className="text-xs text-slate-500">Sube el archivo de la factura o nota de crédito. La IA leerá automáticamente los datos.</p>
              <label className="border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block">
                {localLoading ? <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" /> : <Upload className="w-10 h-10 text-amber-500 mb-3" />}
                <span className="font-bold text-sm text-slate-800">{localLoading ? "Procesando con IA..." : "Sube el archivo del comprobante"}</span>
                <span className="text-[11px] text-slate-500 mt-1">Extracción automática por Inteligencia Artificial</span>
                <input type="file" className="hidden" onChange={handleArchivoSubido} disabled={localLoading} />
              </label>
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">Cancelar</button>
                <button onClick={() => { setIsUploadModalOpen(false); setIsFacturaModalOpen(true); }} className="text-xs font-bold text-amber-600 hover:underline cursor-pointer">Cargar sin comprobante</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFacturaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nueva Factura / Nota de Crédito (Confirmación y Corrección de Datos)</h3>
              <button onClick={() => setIsFacturaModalOpen(false)} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleGuardarFactura} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Verifique y corrija los datos leídos por la IA antes de confirmar la creación. Las notas de crédito se registrarán automáticamente en el listado de movimientos de tesorería y restarán en los totales.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo Comprobante</label>
                  <select 
                    disabled={isSaving} 
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" 
                    value={formData.comprobante_tipo} 
                    onChange={(e) => {
                      const tipoVal = e.target.value;
                      const esNC = tipoVal.toLowerCase().includes('nota de crédito') || tipoVal.toLowerCase().includes('nota de credito');
                      setFormData({
                        ...formData, 
                        comprobante_tipo: tipoVal,
                        estado_pago: esNC ? 'contabilizado' : formData.estado_pago
                      });
                    }}
                  >
                    <option value="Factura A">Factura A</option>
                    <option value="Factura B">Factura B</option>
                    <option value="Factura C">Factura C</option>
                    <option value="Nota de Crédito A">Nota de Crédito A</option>
                    <option value="Nota de Crédito B">Nota de Crédito B</option>
                    <option value="Ticket">Ticket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° Factura / NC</label>
                  <input type="text" required disabled={isSaving} placeholder="Ej: 0012-00031628" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.n_factura} onChange={(e) => setFormData({...formData, n_factura: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor</label>
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.proveedor_id} onChange={(e) => setFormData({...formData, proveedor_id: e.target.value})}>
                    <option value="">Seleccione proveedor...</option>
                    {proveedores.map(p => <option key={buscarValorEnObjeto(p, ['id', 'ID'])} value={buscarValorEnObjeto(p, ['id', 'ID'])}>{buscarValorEnObjeto(p, ['razon_social', 'nombre'])}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra *</label>
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.obra_id} onChange={(e) => setFormData({...formData, obra_id: e.target.value})}>
                    <option value="">Seleccione obra...</option>
                    {obras.map(o => <option key={buscarValorEnObjeto(o, ['id', 'ID'])} value={buscarValorEnObjeto(o, ['id', 'ID'])}>[{o.codigo}] {o.nombre || o.nombre_obra}</option>)}
                  </select>
                </div>

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
                        tipo_insumo: 'Material'
                      });
                    }}>
                    <option value="Presupuesto">Presupuesto Aprobado</option>
                    <option value="Contrato de Mantenimiento">Contrato de Mantenimiento Aprobado</option>
                    <option value="Gasto Corriente">Gasto Corriente</option>
                    <option value="Gasto Extra">Gasto Extra</option>
                  </select>
                </div>

                {(formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Contrato de Mantenimiento') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Documento Aprobado *</label>
                    {formData.tipo_gasto === 'Presupuesto' ? (
                      <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formData.presupuesto_id} onChange={(e) => setFormData({...formData, presupuesto_id: e.target.value})}>
                        <option value="">Seleccione presupuesto...</option>
                        {listaPresupuestosFinal.map(pr => <option key={buscarValorEnObjeto(pr, ['id', 'ID'])} value={buscarValorEnObjeto(pr, ['id', 'ID'])}>{pr.codigo} - {pr.nombre}</option>)}
                      </select>
                    ) : (
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
                    )}
                  </div>
                )}

                {(formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Contrato de Mantenimiento') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro Imputación *</label>
                    {formData.tipo_gasto === 'Contrato de Mantenimiento' ? (
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
                            tipo_insumo: '' 
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
                    {formData.tipo_gasto === 'Contrato de Mantenimiento' ? (
                      <option value="Material">Material</option>
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
                  <select disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100 cursor-pointer" value={formData.estado_pago} onChange={(e) => setFormData({...formData, estado_pago: e.target.value})}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                    <option value="contabilizado">Contabilizado</option>
                  </select>
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
                <button type="button" onClick={() => setIsFacturaModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Guardando...' : (editingId ? 'Actualizar Comprobante' : 'Crear Comprobante')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}