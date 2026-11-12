// src/pages/Compras.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Calendar, AlertTriangle, Mail } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';
import { GOOGLE_SCRIPT_URL } from '@/api';
import BuscadorSelect from '@/components/BuscadorSelect';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/firebase';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { limit, orderBy, where } from 'firebase/firestore';

// Servicios
import { buscarMejorMatch, mapearTipoComprobante, subirArchivoADrive, procesarFacturaConAI } from '@/services/comprasService';

// Componentes
import ModalFactura from '@/components/compras/ModalFactura';
import ModalOrdenCompra from '@/components/compras/ModalOrdenCompra';
import ModalSubirFactura from '@/components/compras/ModalSubirFactura';
import ModalEnviarContador from '@/components/compras/ModalEnviarContador';
import TablaFacturas from '@/components/compras/TablaFacturas';
import TablaOrdenesCompra from '@/components/compras/TablaOrdenesCompra';

const esACompletar = (valor) => /\ba completar\b/i.test(String(valor || ''));

const normalizarEstadoPago = (raw) => {
  const s = String(raw || '').trim();
  if (s.toLowerCase() === 'a asignar') return 'pendiente';
  return s || 'pendiente';
};

export default function Compras() {
  const { data: ordenesCompra } = useFirestoreCollection('ordenes_compra');
  const { data: proveedores } = useFirestoreCollection('proveedores');
  const { data: obras } = useFirestoreCollection('obras');
  const { data: presupuestos } = useFirestoreCollection('presupuestos');
  const { data: contratosList } = useFirestoreCollection('contratos');
  const { data: rubros } = useFirestoreCollection('rubros');

  const { user } = useAuth();
  const nombreUsuarioLogueado = user?.nombre || user?.displayName || (user?.email ? user.email.split('@')[0] : '');

  const [activeTab, setActiveTab] = useState('facturas');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroDocumento, setFiltroDocumento] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('');

  const [optimisticFacturas, setOptimisticFacturas] = useState([]);
  const [deletedFacturas, setDeletedFacturas] = useState([]);
  const [optimisticOcs, setOptimisticOcs] = useState([]);
  const [deletedOcs, setDeletedOcs] = useState([]);

  const obtenerIdReal = (obj) => String(obj.id || obj.ID || obj.Id || obj.codigo || '');

  const facturasConstraints = useMemo(() => {
    const c = [];
    const isFiltered = filtroFechaDesde || filtroFechaHasta;
    
    if (filtroFechaDesde) c.push(where('fecha', '>=', filtroFechaDesde));
    if (filtroFechaHasta) c.push(where('fecha', '<=', filtroFechaHasta));
    
    c.push(orderBy('fecha', 'desc'));
    c.push(limit(isFiltered ? 500 : 100)); 
    
    return c;
  }, [filtroFechaDesde, filtroFechaHasta]);

  const { data: facturas } = useFirestoreQuery('facturas_compras', facturasConstraints);

  const facturasRender = useMemo(() => {
    const idsBorrados = deletedFacturas.map(String);
    const optimistasValidas = optimisticFacturas.filter(o => !idsBorrados.includes(obtenerIdReal(o)));
    const idsOptimistas = optimistasValidas.map(o => obtenerIdReal(o));
    const realesValidas = (facturas || []).filter(f => {
      const id = obtenerIdReal(f);
      return !idsBorrados.includes(id) && !idsOptimistas.includes(id);
    });
    return [...optimistasValidas, ...realesValidas];
  }, [facturas, optimisticFacturas, deletedFacturas]);

  const ordenesRender = useMemo(() => {
    const idsBorrados = deletedOcs.map(String);
    const optimistasValidas = optimisticOcs.filter(o => !idsBorrados.includes(obtenerIdReal(o)));
    const idsOptimistas = optimistasValidas.map(o => obtenerIdReal(o));
    const realesValidas = (ordenesCompra || []).filter(oc => {
      const id = obtenerIdReal(oc);
      return !idsBorrados.includes(id) && !idsOptimistas.includes(id);
    });
    return [...optimistasValidas, ...realesValidas];
  }, [ordenesCompra, optimisticOcs, deletedOcs]);

  // Estados de Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isOcModalOpen, setIsOcModalOpen] = useState(false);
  const [editingOcId, setEditingOcId] = useState(null);
  const [isEnviarContadorModalOpen, setIsEnviarContadorModalOpen] = useState(false);
  
  const [emailContador, setEmailContador] = useState('');
  const [enviandoFacturas, setEnviandoFacturas] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generandoPdfOcId, setGenerandoPdfOcId] = useState(null);

  const [candidatosProveedor, setCandidatosProveedor] = useState([]);
  const [nombreProveedorOCR, setNombreProveedorOCR] = useState('');

  const [formData, setFormData] = useState({
    codigo: 'FAC-0001', comprobante_tipo: 'Factura A', punto_venta: '', n_factura: '', proveedor_id: '', proveedor: '', obra_id: '', presupuesto_id: '', contrato_id: '', tipo_gasto: 'Presupuesto', rubro_imputacion: '', tipo_insumo: 'Material', detalle_gasto: '', fecha: new Date().toISOString().split('T')[0], vencimiento: '', estado_pago: 'pendiente', subtotal: 0, iva_21: 0, iva_10_5: 0, persp_iibb_bs_as: 0, persp_iibb_caba: 0, otros_impuestos: 0, total: 0, archivo_url: '', comprobante_anula: '', remitente: '', notificado_proveedor: false
  });

  const [formDataOc, setFormDataOc] = useState({
    codigo: 'OC-0001', proveedor_id: '', obra_id: '', fecha: new Date().toISOString().split('T')[0], fecha_entrega: '', estado: 'pendiente', subtotal: 0, iva_21: 0, total: 0, condiciones_pago: '', plazo_entrega: '', lugar_entrega: '', observaciones: '', firma_sice: '', firma_proveedor: '', insumos_oc: [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }]
  });

  const buscarValorEnObjeto = useCallback((obj, keys) => {
    if (!obj || typeof obj !== 'object') return '';
    const normalizar = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const objKeys = Object.keys(obj);

    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
      const keyNorm = normalizar(key);
      const realKey = objKeys.find(k => normalizar(k) === keyNorm);
      if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') return obj[realKey];
    }

    for (const key of keys) {
      const keyNorm = normalizar(key);
      const realKey = objKeys.find(k => normalizar(k).includes(keyNorm) || keyNorm.includes(normalizar(k)));
      if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') return obj[realKey];
    }

    return '';
  }, []);

  const extraerArrayDatos = useCallback((fuente) => {
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
  }, []);

  const presupuestosAprobados = useMemo(() => presupuestos.filter(pr => {
    const est = String(buscarValorEnObjeto(pr, ['estado', 'Estado', 'ESTADO']) || '').toLowerCase();
    return !est || est.includes('aprobad') || est.includes('aprobado');
  }), [presupuestos, buscarValorEnObjeto]);

  const listaPresupuestosFinal = presupuestosAprobados.length > 0 ? presupuestosAprobados : presupuestos;

  const contratosListFinal = useMemo(() => {
    const todos = extraerArrayDatos(contratosList);
    const unicosMap = new Map();
    todos.forEach((item, index) => {
      if (!item) return;
      const key = String(buscarValorEnObjeto(item, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id', 'nro_contrato']) || index);
      if (!unicosMap.has(key)) unicosMap.set(key, item);
    });
    return Array.from(unicosMap.values());
  }, [contratosList, extraerArrayDatos, buscarValorEnObjeto]);

  const listaContratosFinal = useMemo(() => {
    if (!contratosListFinal || contratosListFinal.length === 0) return [];
    const filtrados = contratosListFinal.filter(c => {
      const est = String(buscarValorEnObjeto(c, ['estado', 'Estado', 'ESTADO', 'status']) || '').toLowerCase();
      return !est || est.includes('aprobad') || est.includes('aprobado') || est.includes('vigente') || est.includes('activo') || est.includes('en curso');
    });
    return filtrados.length > 0 ? filtrados : contratosListFinal;
  }, [contratosListFinal, buscarValorEnObjeto]);

  const presupuestoSeleccionadoObj = useMemo(() => {
    if (!formData.presupuesto_id) return null;
    return presupuestos.find(pr => String(buscarValorEnObjeto(pr, ['id', 'ID', 'Id'])).trim() === String(formData.presupuesto_id).trim());
  }, [presupuestos, formData.presupuesto_id, buscarValorEnObjeto]);

  const { rubrosDelPresupuesto, gastosGeneralesDelPresupuesto } = useMemo(() => {
    let rubrosArr = [];
    let gastosGenerales = [];
    if (presupuestoSeleccionadoObj) {
      const rawItemsDetalle = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['items_detalle', 'Items_detalle', 'items', 'detalle']);
      try {
        let parsedData = rawItemsDetalle;
        if (typeof rawItemsDetalle === 'string') parsedData = JSON.parse(rawItemsDetalle);
        if (parsedData && Array.isArray(parsedData.rubros)) rubrosArr = parsedData.rubros.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);
        else if (Array.isArray(parsedData)) rubrosArr = parsedData.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);

        let rawGG = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['gastos_generales_insumos', 'Gastos_generales_insumos', 'gastos_generales', 'Gastos_generales']);
        if (!rawGG && parsedData && typeof parsedData === 'object') rawGG = parsedData.gastos_generales_insumos || parsedData.gastos_generales || (parsedData.comercial && (parsedData.comercial.gastos_generales_insumos || parsedData.comercial.gastos_generales));

        let comercialObj = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['comercial', 'Comercial']);
        if (typeof comercialObj === 'string') try { comercialObj = JSON.parse(comercialObj); } catch(e) {}
        if (!rawGG && comercialObj && typeof comercialObj === 'object') rawGG = comercialObj.gastos_generales_insumos || comercialObj.gastos_generales;

        if (typeof rawGG === 'string') try { rawGG = JSON.parse(rawGG); } catch(e) {}
        if (Array.isArray(rawGG)) gastosGenerales = rawGG.map(item => item.concepto || item.nombre || item.descripcion).filter(Boolean);
      } catch (e) { console.error("Error parse presupuesto:", e); }
    }
    return { rubrosDelPresupuesto: rubrosArr, gastosGeneralesDelPresupuesto: gastosGenerales };
  }, [presupuestoSeleccionadoObj, buscarValorEnObjeto]);

  const opcionesProveedores = useMemo(() => (proveedores || []).map(p => ({
    id: buscarValorEnObjeto(p, ['id', 'ID']),
    label: buscarValorEnObjeto(p, ['razon_social', 'nombre', 'Razon_social']) || 'Sin nombre'
  })), [proveedores, buscarValorEnObjeto]);

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return '---';
    const str = String(fechaStr).split('T')[0];
    const partes = str.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return fechaStr;
  };

  const formatearFechaParaInput = (fechaStr) => {
    if (!fechaStr) return '';
    const str = String(fechaStr).trim().split('T')[0];
    if (str.includes('/')) {
      const partes = str.split('/');
      if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    return str;
  };

  const generarSiguienteCodigoFactura = () => {
    const todas = [...(facturas || []), ...optimisticFacturas];
    if (todas.length === 0) return 'FAC-0001';
    const maxNum = todas.reduce((max, f) => {
      const match = (buscarValorEnObjeto(f, ['codigo', 'Codigo', 'CODIGO']) || '').match(/FAC-(\d+)/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `FAC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const generarSiguienteCodigoOc = () => {
    const todas = [...(ordenesCompra || []), ...optimisticOcs];
    if (todas.length === 0) return 'OC-0001';
    const maxNum = todas.reduce((max, oc) => {
      const match = (buscarValorEnObjeto(oc, ['codigo', 'Codigo', 'CODIGO']) || '').match(/OC-(\d+)/i);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `OC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  const handleArchivoSubido = async (e) => {
    if (!GOOGLE_SCRIPT_URL) return alert("ERROR: La variable GOOGLE_SCRIPT_URL no está configurada.");
    const archivo = e.target.files[0];
    if (!archivo) return;
    setLocalLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const data = await procesarFacturaConAI(base64Data, archivo.type);
          let proveedorEncontradoId = '';
          let candidatosFinales = [];
          const nombreProvBusqueda = data.proveedor || '';
          setNombreProveedorOCR(nombreProvBusqueda);

          if (nombreProvBusqueda && proveedores.length > 0) {
            const { mejor, candidatos } = buscarMejorMatch(nombreProvBusqueda, proveedores);
            if (mejor && candidatos.length === 1) {
              proveedorEncontradoId = buscarValorEnObjeto(mejor, ['id', 'ID', 'Id']);
            } else if (mejor && candidatos.length > 1) {
              candidatosFinales = candidatos;
              proveedorEncontradoId = buscarValorEnObjeto(mejor, ['id', 'ID', 'Id']);
            }
          }
          setCandidatosProveedor(candidatosFinales);

          const tipoComprobanteMapeado = mapearTipoComprobante(data.tipo_comprobante, data.tipo_factura, archivo.name || '');
          const comprobanteAnulaDetectado = data.comprobante_anula || data.comprobanteAnula || '';
          const nCompDetectado = String(data.n_factura || data.numero_comp || data.numero_factura || '').trim();
          let ptoVtaDetectado = '';
          let nCompLimpio = nCompDetectado;
          let nFacturaCompleto = nCompDetectado;

          if (nCompDetectado.includes('-')) {
            const partes = nCompDetectado.split('-').map(p => p.trim());
            if (partes.length >= 2) {
              ptoVtaDetectado = partes[0].replace(/\D/g, '').padStart(4, '0');
              nCompLimpio = partes[1].replace(/\D/g, '');
              nFacturaCompleto = `${ptoVtaDetectado}-${nCompLimpio}`;
            }
          } else {
            const soloDigitos = nCompDetectado.replace(/\D/g, '');
            if (soloDigitos.length >= 10) {
              ptoVtaDetectado = soloDigitos.slice(0, 4).padStart(4, '0');
              nCompLimpio = soloDigitos.slice(4);
              nFacturaCompleto = `${ptoVtaDetectado}-${nCompLimpio}`;
            }
          }

          setFormData(prev => ({
            ...prev, comprobante_tipo: tipoComprobanteMapeado, n_factura: nFacturaCompleto || prev.n_factura, punto_venta: ptoVtaDetectado || prev.punto_venta || '', proveedor_id: proveedorEncontradoId || prev.proveedor_id, proveedor: nombreProvBusqueda || prev.proveedor, fecha: (data && formatearFechaParaInput(data.fecha)) || prev.fecha, vencimiento: (data && formatearFechaParaInput(data.vencimiento)) || prev.vencimiento, estado_pago: 'pendiente', subtotal: Math.abs(Number(data && data.subtotal) || prev.subtotal), iva_21: Math.abs(Number(data && data.iva_21) || prev.iva_21), iva_10_5: Math.abs(Number(data && data.iva_10_5) || prev.iva_10_5), persp_iibb_bs_as: Math.abs(Number(data && (data.persp_iibb_bs_as || data.percepcion_iibb || data.iibb_bs_as)) || prev.persp_iibb_bs_as), persp_iibb_caba: Math.abs(Number(data && (data.persp_iibb_caba || data.percepcion_iibb_caba)) || prev.persp_iibb_caba), otros_impuestos: Math.abs(Number(data && data.otros_impuestos) || prev.otros_impuestos), total: Math.abs(Number(data && data.total) || prev.total), archivo_url: base64Data, comprobante_anula: comprobanteAnulaDetectado || prev.comprobante_anula
          }));

          if (nombreProvBusqueda && !proveedorEncontradoId && candidatosFinales.length === 0) {
            setTimeout(() => alert(`⚠️ El OCR detectó el proveedor "${nombreProvBusqueda}" pero no se encontró.`), 100);
          }

          setIsUploadModalOpen(false);
          setIsFacturaModalOpen(true);
        } catch (fetchErr) {
          alert("⚠️ Error al leer factura: " + fetchErr.message);
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
    if (!archivoUrl || archivoUrl === 'Comprobante_Adjunto') return alert("No hay un enlace válido.");
    window.open(archivoUrl, '_blank');
  };

  const handleEditarFacturaClick = (f) => {
    const realId = buscarValorEnObjeto(f, ['id', 'ID', 'Id', 'codigo']);
    setEditingId(realId);
    setCandidatosProveedor([]);
    setNombreProveedorOCR('');

    let rubroImputacionVal = buscarValorEnObjeto(f, ['rubro_imputacion', 'Rubro_imputacion']) === 'A completar' ? '' : buscarValorEnObjeto(f, ['rubro_imputacion']);
    let tipoInsumoVal = buscarValorEnObjeto(f, ['tipo_insumo']) === 'A completar' ? 'Material' : (buscarValorEnObjeto(f, ['tipo_insumo']) || 'Material');
    let tipoGastoObtenido = buscarValorEnObjeto(f, ['tipo_gasto']) === 'A completar' || !buscarValorEnObjeto(f, ['tipo_gasto']) ? 'Presupuesto' : buscarValorEnObjeto(f, ['tipo_gasto']);

    let provIdVal = buscarValorEnObjeto(f, ['proveedor_id']);
    if ((!provIdVal || provIdVal === 0) && buscarValorEnObjeto(f, ['proveedor']) && proveedores.length > 0) {
       const { mejor } = buscarMejorMatch(buscarValorEnObjeto(f, ['proveedor']), proveedores);
       if (mejor) provIdVal = buscarValorEnObjeto(mejor, ['id', 'ID']);
    }

    setFormData({
      ...f, comprobante_tipo: buscarValorEnObjeto(f, ['comprobante_tipo']) || 'Factura A', punto_venta: buscarValorEnObjeto(f, ['punto_venta']) || '', n_factura: buscarValorEnObjeto(f, ['n_factura']) || '', proveedor_id: provIdVal || '', proveedor: buscarValorEnObjeto(f, ['proveedor']) || '', obra_id: buscarValorEnObjeto(f, ['obra_id']) === 'A completar' ? '' : (buscarValorEnObjeto(f, ['obra_id']) || ''), presupuesto_id: tipoGastoObtenido === 'Presupuesto' || tipoGastoObtenido === 'Viaticos-Nafta' || tipoGastoObtenido === 'Gastos Directos' ? (buscarValorEnObjeto(f, ['presupuesto_id']) === 'A completar' ? '' : buscarValorEnObjeto(f, ['presupuesto_id'])) : '', contrato_id: tipoGastoObtenido === 'Contrato de Mantenimiento' ? (buscarValorEnObjeto(f, ['contrato_id']) === 'A completar' ? '' : buscarValorEnObjeto(f, ['contrato_id'])) : '', tipo_gasto: tipoGastoObtenido, rubro_imputacion: rubroImputacionVal, tipo_insumo: tipoInsumoVal, detalle_gasto: buscarValorEnObjeto(f, ['detalle_gasto']) || '', fecha: formatearFechaParaInput(buscarValorEnObjeto(f, ['fecha'])), vencimiento: formatearFechaParaInput(buscarValorEnObjeto(f, ['vencimiento'])), estado_pago: normalizarEstadoPago(buscarValorEnObjeto(f, ['estado_pago'])), subtotal: Math.abs(Number(buscarValorEnObjeto(f, ['subtotal']) || 0)), iva_21: Math.abs(Number(buscarValorEnObjeto(f, ['iva_21']) || 0)), iva_10_5: Math.abs(Number(buscarValorEnObjeto(f, ['iva_10_5']) || 0)), persp_iibb_bs_as: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_bs_as']) || 0)), persp_iibb_caba: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_caba']) || 0)), otros_impuestos: Math.abs(Number(buscarValorEnObjeto(f, ['otros_impuestos']) || 0)), total: Math.abs(Number(buscarValorEnObjeto(f, ['total']) || 0)), archivo_url: buscarValorEnObjeto(f, ['archivo_url']) || '', comprobante_anula: buscarValorEnObjeto(f, ['comprobante_anula']) || '', remitente: buscarValorEnObjeto(f, ['remitente']) || '', notificado_proveedor: Boolean(buscarValorEnObjeto(f, ['notificado_proveedor']))
    });
    setIsFacturaModalOpen(true);
  };

  const handleGuardarFactura = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!editingId && formData.n_factura) {
      const limpiarNro = (nro) => String(nro || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
      const facturaExistente = facturasRender.find(f => limpiarNro(f.n_factura) === limpiarNro(formData.n_factura));
      if (facturaExistente) return alert(`⚠️ La factura N° ${formData.n_factura} ya existe.`);
    }

    const codigoFinal = editingId ? (formData.codigo || generarSiguienteCodigoFactura()) : generarSiguienteCodigoFactura();
    const esNotaCredito = String(formData.comprobante_tipo || '').toLowerCase().includes('nota de crédito') || String(formData.comprobante_tipo || '').toLowerCase().includes('nota de credito');
    const factorSigno = esNotaCredito ? -1 : 1;
    const esPresupuestario = formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Viaticos-Nafta' || formData.tipo_gasto === 'Gastos Directos';
    const esContrato = formData.tipo_gasto === 'Contrato de Mantenimiento';
    const esGastoLibre = formData.tipo_gasto === 'Gasto Corriente' || formData.tipo_gasto === 'Gasto Extra';
    const tempId = editingId || `temp_${Date.now()}`;

    const datosOptimistas = {
      ...formData, id: tempId, codigo: codigoFinal, archivo_url: '', subtotal: Math.abs(Number(formData.subtotal) || 0) * factorSigno, iva_21: Math.abs(Number(formData.iva_21) || 0) * factorSigno, iva_10_5: Math.abs(Number(formData.iva_10_5) || 0) * factorSigno, persp_iibb_bs_as: Math.abs(Number(formData.persp_iibb_bs_as) || 0) * factorSigno, persp_iibb_caba: Math.abs(Number(formData.persp_iibb_caba) || 0) * factorSigno, otros_impuestos: Math.abs(Number(formData.otros_impuestos) || 0) * factorSigno, total: Math.abs(Number(formData.total) || 0) * factorSigno, estado_pago: esNotaCredito ? 'pendiente' : formData.estado_pago, n_factura: formData.n_factura, numero_comp: formData.n_factura, proveedor_id: formData.proveedor_id, proveedor: formData.proveedor, obra_id: (esPresupuestario || esContrato) ? formData.obra_id : '', presupuesto_id: esPresupuestario ? formData.presupuesto_id : '', contrato_id: esContrato ? formData.contrato_id : '', rubro_imputacion: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '', rubro_presupuesto: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '', rubro: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '', tipo_insumo: (esPresupuestario || esContrato) ? formData.tipo_insumo : '', insumo: (esPresupuestario || esContrato) ? formData.tipo_insumo : '', detalle_gasto: esGastoLibre ? formData.detalle_gasto : '', es_nota_credito: esNotaCredito, comprobante_anula: esNotaCredito ? (formData.comprobante_anula || '') : '', remitente: formData.remitente || '', notificado_proveedor: Boolean(formData.notificado_proveedor)
    };

    const backupOptimistic = [...optimisticFacturas];
    setOptimisticFacturas(prev => editingId ? prev.map(p => p.id === editingId ? datosOptimistas : p) : [datosOptimistas, ...prev]);
    setIsFacturaModalOpen(false);
    setIsSaving(true);

    try {
      let archivoUrlFinal = formData.archivo_url || '';
      if (archivoUrlFinal && archivoUrlFinal.indexOf('data:') === 0) archivoUrlFinal = await subirArchivoADrive(archivoUrlFinal, 'Facturas');

      const payloadData = { ...datosOptimistas, archivo_url: archivoUrlFinal };
      const datosLimpios = {};
      Object.keys(payloadData).forEach(key => { if (payloadData[key] !== undefined) datosLimpios[key] = payloadData[key]; });
      delete datosLimpios._creadoEn; delete datosLimpios._actualizadoEn; delete datosLimpios.id;

      let nuevoDocId = editingId;
      if (editingId) {
        await actualizarDoc('facturas_compras', editingId, datosLimpios);
        setOptimisticFacturas(prev => prev.map(p => p.id === editingId ? { ...p, archivo_url: archivoUrlFinal } : p));
      } else {
        nuevoDocId = await crearDoc('facturas_compras', datosLimpios);
        setOptimisticFacturas(prev => prev.map(p => p.id === tempId ? { ...p, id: nuevoDocId, archivo_url: archivoUrlFinal } : p));
      }

      if (formData.remitente && !formData.notificado_proveedor && formData.estado_pago !== 'a asignar') {
        try {
          let idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
          const resMail = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'enviarConfirmacionFactura', email: formData.remitente, n_factura: formData.n_factura, proveedor: formData.proveedor, idToken }) });
          const dataMail = await resMail.json();
          if (dataMail.success) await actualizarDoc('facturas_compras', nuevoDocId, { notificado_proveedor: true });
        } catch (e) { console.error(e); }
      }

      setCandidatosProveedor([]);
      setNombreProveedorOCR('');
    } catch (err) {
      setOptimisticFacturas(backupOptimistic);
      alert("⚠️ Error al guardar: " + err.message);
      setIsFacturaModalOpen(true); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarFactura = async (f) => {
    const facturaId = obtenerIdReal(f); 
    if (!facturaId) return alert("⚠️ Error: No se pudo identificar el ID.");
    
    const estadoPago = String(buscarValorEnObjeto(f, ['estado_pago']) || '').toLowerCase();
    const esNC = String(buscarValorEnObjeto(f, ['comprobante_tipo']) || '').toLowerCase().includes('nota de crédito');
    if (esNC && estadoPago === 'contabilizado') return alert("⚠️ NC Contabilizada. Descontabilizar primero.");

    if (!window.confirm("¿Eliminar esta factura?")) return;

    setDeletedFacturas(prev => [...prev, facturaId]);
    try {
      if (facturaId.startsWith('temp_')) setOptimisticFacturas(prev => prev.filter(x => obtenerIdReal(x) !== facturaId));
      else await eliminarDoc('facturas_compras', facturaId);
    } catch (err) {
      setDeletedFacturas(prev => prev.filter(id => id !== facturaId));
      alert("Error: " + err.message);
    }
  };

  const handleAgregarInsumoOc = () => setFormDataOc(prev => ({ ...prev, insumos_oc: [...prev.insumos_oc, { id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }] }));

  const handleCambiarInsumoOc = (id, campo, valor) => {
    const nuevos = formDataOc.insumos_oc.map(item => {
      if (item.id === id) {
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'cantidad' || campo === 'p_unitario') actualizado.total = (Number(actualizado.cantidad) || 0) * (Number(actualizado.p_unitario) || 0);
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
    setEditingOcId(buscarValorEnObjeto(oc, ['id', 'ID', 'Id', 'codigo']));
    let insumosParseados = [];
    try { insumosParseados = typeof oc.insumos_oc === 'string' ? JSON.parse(oc.insumos_oc) : (Array.isArray(oc.insumos_oc) ? oc.insumos_oc : []); } catch (err) { insumosParseados = []; }
    if (insumosParseados.length === 0) insumosParseados = [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }];
    setFormDataOc({ ...oc, fecha: formatearFechaParaInput(oc.fecha), fecha_entrega: formatearFechaParaInput(oc.fecha_entrega), condiciones_pago: oc.condiciones_pago || '', plazo_entrega: oc.plazo_entrega || '', lugar_entrega: oc.lugar_entrega || '', observaciones: oc.observaciones || '', firma_sice: oc.firma_sice || '', firma_proveedor: oc.firma_proveedor || '', insumos_oc: insumosParseados });
    setIsOcModalOpen(true);
  };

  const handleGuardarOc = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const codigoFinal = editingOcId ? formDataOc.codigo : generarSiguienteCodigoOc();
    const tempId = editingOcId || `temp_${Date.now()}`;
    const payloadData = { ...formDataOc, codigo: codigoFinal, insumos_oc: JSON.stringify(formDataOc.insumos_oc) };
    const datosOptimistas = { ...payloadData, id: tempId };
    const backup = [...optimisticOcs];

    setOptimisticOcs(prev => editingOcId ? prev.map(p => p.id === editingOcId ? datosOptimistas : p) : [datosOptimistas, ...prev]);
    setIsOcModalOpen(false);
    setIsSaving(true);

    try {
      const { _creadoEn, _actualizadoEn, id, ...datosLimpios } = payloadData;
      if (editingOcId) await actualizarDoc('ordenes_compra', editingOcId, datosLimpios);
      else {
        const nuevoDocId = await crearDoc('ordenes_compra', datosLimpios);
        setOptimisticOcs(prev => prev.map(p => p.id === tempId ? { ...p, id: nuevoDocId } : p));
      }
    } catch (err) {
      setOptimisticOcs(backup); alert("Error al guardar OC: " + err.message); setIsOcModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarOc = async (oc) => {
    const ocId = obtenerIdReal(oc);
    if (!ocId || !window.confirm("¿Eliminar Orden de Compra?")) return;
    setDeletedOcs(prev => [...prev, ocId]);
    try {
      if (ocId.startsWith('temp_')) setOptimisticOcs(prev => prev.filter(x => obtenerIdReal(x) !== ocId));
      else await eliminarDoc('ordenes_compra', ocId);
    } catch (err) {
      setDeletedOcs(prev => prev.filter(id => id !== ocId)); alert("Error: " + err.message);
    }
  };

  const handleGenerarPdfOc = async (oc) => {
    if (!GOOGLE_SCRIPT_URL) return alert("ERROR: GOOGLE_SCRIPT_URL no configurada.");
    const ocId = buscarValorEnObjeto(oc, ['id', 'ID', 'Id', 'codigo']);
    setGenerandoPdfOcId(ocId);

    try {
      const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id'])) === String(buscarValorEnObjeto(oc, ['proveedor_id'])));
      const obra = obras.find(o => String(buscarValorEnObjeto(o, ['id'])) === String(buscarValorEnObjeto(oc, ['obra_id'])));
      let insumos = []; try { insumos = typeof oc.insumos_oc === 'string' ? JSON.parse(oc.insumos_oc) : (Array.isArray(oc.insumos_oc) ? oc.insumos_oc : []); } catch (e) {}

      const payload = { action: 'generar_pdf_orden_compra', tabla: 'OrdenesCompra', orden: { codigo: oc.codigo, fecha: oc.fecha, fecha_entrega: oc.fecha_entrega, subtotal: oc.subtotal || 0, iva_21: oc.iva_21 || 0, total: oc.total || 0, condiciones_pago: oc.condiciones_pago || '', plazo_entrega: oc.plazo_entrega || '', lugar_entrega: oc.lugar_entrega || '', observaciones: oc.observaciones || '', firma_sice: oc.firma_sice || '', firma_proveedor: oc.firma_proveedor || '' }, proveedor: { razon_social: prov?.razon_social || '', cuit: prov?.cuit || '', direccion: prov?.direccion || '', telefono: prov?.telefono || '' }, obra: { codigo: obra?.codigo || '', nombre: obra?.nombre || obra?.nombre_obra || '' }, insumos };
      payload.idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';

      const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const data = await res.json();

      if (data && data.success && data.pdf_url) window.open(data.pdf_url, '_blank');
      else alert('Error PDF: ' + (data.error || 'desconocido'));
    } catch (err) { alert('Error: ' + err.message); } finally { setGenerandoPdfOcId(null); }
  };

  const handleEnviarAlContador = async (e) => {
    e.preventDefault();
    if (!emailContador || emailContador.indexOf('@') === -1) return alert("Correo inválido.");
    if (facturasFiltradas.length === 0) return alert("No hay facturas para enviar.");

    setEnviandoFacturas(true);
    try {
      const facturasParaEnviar = facturasFiltradas.filter(f => !obtenerIdReal(f).startsWith('temp_')).map(f => ({ ...f, proveedor: proveedores.find(p => String(buscarValorEnObjeto(p, ['id'])) === String(buscarValorEnObjeto(f, ['proveedor_id'])))?.razon_social || f.proveedor || 'Proveedor Desconocido' }));
      let idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'enviarFacturasAlContador', email: emailContador, fechaDesde: filtroFechaDesde ? formatearFechaDisplay(filtroFechaDesde) : 'Inicio', fechaHasta: filtroFechaHasta ? formatearFechaDisplay(filtroFechaHasta) : 'Fin', facturas: facturasParaEnviar, idToken }) });
      const data = await res.json();
      if (data.success) { alert("✅ Correo enviado."); setIsEnviarContadorModalOpen(false); setEmailContador(''); }
      else alert("⚠️ Error: " + data.error);
    } catch (err) { alert("Error de red."); } finally { setEnviandoFacturas(false); }
  };

  const facturasFiltradas = useMemo(() => {
    const filtradas = facturasRender.filter(f => {
      const provId = buscarValorEnObjeto(f, ['proveedor_id']);
      const matchProv = !filtroProveedor || String(provId) === String(filtroProveedor);
      const fFecha = buscarValorEnObjeto(f, ['fecha']);
      let matchFecha = true;
      if (filtroFechaDesde && fFecha && fFecha < filtroFechaDesde) matchFecha = false;
      if (filtroFechaHasta && fFecha && fFecha > filtroFechaHasta) matchFecha = false;
      let matchDoc = true;
      if (filtroDocumento) {
        if (filtroDocumento.startsWith('PRES-')) matchDoc = String(buscarValorEnObjeto(f, ['presupuesto_id'])).trim() === String(filtroDocumento.replace('PRES-', '')).trim();
        else if (filtroDocumento.startsWith('CONT-')) matchDoc = String(buscarValorEnObjeto(f, ['contrato_id'])).trim() === String(filtroDocumento.replace('CONT-', '')).trim();
      }
      let matchPago = true;
      if (filtroEstadoPago) matchPago = String(buscarValorEnObjeto(f, ['estado_pago']) || 'pendiente').toLowerCase().trim() === filtroEstadoPago.toLowerCase();
      return matchProv && matchFecha && matchDoc && matchPago;
    });

    const unicosMap = new Map();
    filtradas.forEach(f => {
      const key = buscarValorEnObjeto(f, ['n_factura']) ? `${buscarValorEnObjeto(f, ['n_factura'])}-${buscarValorEnObjeto(f, ['total'])}` : `key-${Math.random()}`;
      if (!unicosMap.has(key)) unicosMap.set(key, f);
      else {
        const ext = unicosMap.get(key);
        if (new Date(f._actualizadoEn || f._creadoEn || 0).getTime() > new Date(ext._actualizadoEn || ext._creadoEn || 0).getTime()) unicosMap.set(key, f);
      }
    });
    return Array.from(unicosMap.values());
  }, [facturasRender, filtroProveedor, filtroFechaDesde, filtroFechaHasta, filtroDocumento, filtroEstadoPago, buscarValorEnObjeto]);

  const ordenesFiltradas = useMemo(() => {
    return ordenesRender.filter(oc => {
      const matchProv = !filtroProveedor || String(buscarValorEnObjeto(oc, ['proveedor_id'])) === String(filtroProveedor);
      const ocFecha = buscarValorEnObjeto(oc, ['fecha']);
      let matchFecha = true;
      if (filtroFechaDesde && ocFecha && ocFecha < filtroFechaDesde) matchFecha = false;
      if (filtroFechaHasta && ocFecha && ocFecha > filtroFechaHasta) matchFecha = false;
      return matchProv && matchFecha;
    });
  }, [ordenesRender, filtroProveedor, filtroFechaDesde, filtroFechaHasta, buscarValorEnObjeto]);

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
            setFormDataOc({ codigo: generarSiguienteCodigoOc(), proveedor_id: '', obra_id: '', fecha: new Date().toISOString().split('T')[0], fecha_entrega: '', estado: 'pendiente', subtotal: 0, iva_21: 0, total: 0, condiciones_pago: '', plazo_entrega: '', lugar_entrega: '', observaciones: '', firma_sice: nombreUsuarioLogueado, firma_proveedor: '', insumos_oc: [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }] });
            setIsOcModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva OC
          </button>
          <button onClick={() => {
            setEditingId(null); setCandidatosProveedor([]); setNombreProveedorOCR('');
            setFormData({ codigo: generarSiguienteCodigoFactura(), comprobante_tipo: 'Factura A', punto_venta: '', n_factura: '', proveedor_id: '', proveedor: '', obra_id: '', presupuesto_id: '', contrato_id: '', tipo_gasto: 'Presupuesto', rubro_imputacion: '', tipo_insumo: 'Material', detalle_gasto: '', fecha: new Date().toISOString().split('T')[0], vencimiento: '', estado_pago: 'pendiente', subtotal: 0, iva_21: 0, iva_10_5: 0, persp_iibb_bs_as: 0, persp_iibb_caba: 0, otros_impuestos: 0, total: 0, archivo_url: '', comprobante_anula: '', remitente: '', notificado_proveedor: false });
            setIsUploadModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
          <button onClick={() => setIsEnviarContadorModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Mail className="w-4 h-4" /> Enviar a Contador
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm items-end">
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Proveedor</label><BuscadorSelect opciones={[{ id: '', label: 'Todos los Proveedores' }, ...opcionesProveedores]} value={filtroProveedor} onChange={setFiltroProveedor} placeholder="Todos" minChars={3} /></div>
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Estado de Pago</label><select value={filtroEstadoPago} onChange={(e) => setFiltroEstadoPago(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500 cursor-pointer"><option value="">Todos</option><option value="a asignar">A Asignar</option><option value="pendiente">Pendiente</option><option value="contabilizado">Contabilizado</option><option value="pagado">Pagado</option></select></div>
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Doc. Aprobado</label><select value={filtroDocumento} onChange={(e) => setFiltroDocumento(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500 cursor-pointer"><option value="">Todos</option><optgroup label="Presupuestos">{listaPresupuestosFinal.map(pr => <option key={`pr-${pr.id}`} value={`PRES-${pr.id}`}>{pr.codigo} - {pr.nombre}</option>)}</optgroup><optgroup label="Contratos">{listaContratosFinal.map((c, idx) => <option key={`c-${c.id || idx}`} value={`CONT-${c.id || idx}`}>[{c.codigo || 'S/C'}] {c.nombre || 'Contrato'}</option>)}</optgroup></select></div>
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Desde</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"><Calendar className="w-4 h-4 text-slate-400 shrink-0" /><input type="date" value={filtroFechaDesde} onChange={(e) => setFiltroFechaDesde(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" /></div></div>
        <div><label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Hasta</label><div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"><Calendar className="w-4 h-4 text-slate-400 shrink-0" /><input type="date" value={filtroFechaHasta} onChange={(e) => setFiltroFechaHasta(e.target.value)} className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none" /></div></div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'ordenes' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Órdenes de Compra ({ordenesRender.length})</button>
        <button onClick={() => setActiveTab('facturas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'facturas' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Facturas ({facturasRender.length})</button>
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-100 border-b text-[11px] text-slate-600 flex justify-between items-center"><span>Total: <b>{facturasRender.length}</b> | Filtradas: <b>{facturasFiltradas.length}</b></span></div>
          {facturas.length === (filtroFechaDesde || filtroFechaHasta ? 500 : 100) && (<div className="bg-amber-100 border-b border-amber-300 p-3 text-xs text-amber-900 font-medium flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /><span>Límite alcanzado. Ajustá fechas para ver más.</span></div>)}
          
          <TablaFacturas 
            facturasFiltradas={facturasFiltradas} 
            proveedores={proveedores} 
            buscarValorEnObjeto={buscarValorEnObjeto} 
            handleVerArchivo={handleVerArchivo} 
            handleEditarFacturaClick={handleEditarFacturaClick} 
            handleEliminarFactura={handleEliminarFactura} 
            formatearFechaDisplay={formatearFechaDisplay} 
            esACompletar={esACompletar} 
            obtenerIdReal={obtenerIdReal} 
          />
        </div>
      )}

      {activeTab === 'ordenes' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <TablaOrdenesCompra 
            ordenesFiltradas={ordenesFiltradas} 
            proveedores={proveedores} 
            obras={obras} 
            buscarValorEnObjeto={buscarValorEnObjeto} 
            handleGenerarPdfOc={handleGenerarPdfOc} 
            generandoPdfOcId={generandoPdfOcId} 
            handleEditarOcClick={handleEditarOcClick} 
            handleEliminarOc={handleEliminarOc} 
            formatearFechaDisplay={formatearFechaDisplay} 
            obtenerIdReal={obtenerIdReal} 
          />
        </div>
      )}

      <ModalOrdenCompra 
        isOpen={isOcModalOpen} 
        onClose={() => setIsOcModalOpen(false)} 
        onSubmit={handleGuardarOc} 
        formDataOc={formDataOc} 
        setFormDataOc={setFormDataOc} 
        isSaving={isSaving} 
        editingOcId={editingOcId} 
        obras={obras} 
        opcionesProveedores={opcionesProveedores} 
        handleAgregarInsumoOc={handleAgregarInsumoOc} 
        handleCambiarInsumoOc={handleCambiarInsumoOc} 
        handleQuitarInsumoOc={handleQuitarInsumoOc} 
        buscarValorEnObjeto={buscarValorEnObjeto} 
      />

      <ModalSubirFactura 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onCargarSinComprobante={() => { setIsUploadModalOpen(false); setIsFacturaModalOpen(true); }} 
        handleArchivoSubido={handleArchivoSubido} 
        localLoading={localLoading} 
      />

      <ModalFactura 
        isOpen={isFacturaModalOpen} 
        onClose={() => setIsFacturaModalOpen(false)} 
        onSubmit={handleGuardarFactura} 
        formData={formData} 
        setFormData={setFormData} 
        isSaving={isSaving} 
        editingId={editingId} 
        candidatosProveedor={candidatosProveedor} 
        nombreProveedorOCR={nombreProveedorOCR} 
        opcionesProveedores={opcionesProveedores} 
        obras={obras} 
        listaPresupuestosFinal={listaPresupuestosFinal} 
        listaContratosFinal={listaContratosFinal} 
        rubrosDelPresupuesto={rubrosDelPresupuesto} 
        gastosGeneralesDelPresupuesto={gastosGeneralesDelPresupuesto} 
        buscarValorEnObjeto={buscarValorEnObjeto} 
      />

      <ModalEnviarContador 
        isOpen={isEnviarContadorModalOpen} 
        onClose={() => setIsEnviarContadorModalOpen(false)} 
        onSubmit={handleEnviarAlContador} 
        emailContador={emailContador} 
        setEmailContador={setEmailContador} 
        enviandoFacturas={enviandoFacturas} 
        cantidadFacturas={facturasFiltradas.length} 
        filtroFechaDesde={filtroFechaDesde} 
        filtroFechaHasta={filtroFechaHasta} 
        formatearFechaDisplay={formatearFechaDisplay} 
      />
    </div>
  );
}