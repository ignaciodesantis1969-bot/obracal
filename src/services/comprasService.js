// src/pages/Compras.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Calendar, FileText, Paperclip, Edit2, Trash2, X, Upload, AlertCircle, CheckCircle2, Loader2, ShoppingCart, AlertTriangle, Mail } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';
import { GOOGLE_SCRIPT_URL } from '@/api';
import BuscadorSelect from '@/components/BuscadorSelect';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/firebase';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { limit, orderBy, where } from 'firebase/firestore';

// 🔑 IMPORTAMOS LA LÓGICA DESDE EL SERVICIO
import { 
  buscarMejorMatch, 
  mapearTipoComprobante, 
  subirArchivoADrive, 
  procesarFacturaConAI 
} from '@/services/comprasService';

const esACompletar = (valor) => {
  return /\ba completar\b/i.test(String(valor || ''));
};

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

  // 🔑 OPTIMISTIC UPDATES STATES
  const [optimisticFacturas, setOptimisticFacturas] = useState([]);
  const [deletedFacturas, setDeletedFacturas] = useState([]);
  const [optimisticOcs, setOptimisticOcs] = useState([]);
  const [deletedOcs, setDeletedOcs] = useState([]);

  // 🔑 Helper para obtener el ID real y unificado de un documento (siempre como String)
  const obtenerIdReal = (obj) => {
    return String(obj.id || obj.ID || obj.Id || obj.codigo || '');
  };

  // 🔑 LÍMITE DINÁMICO: 100 por defecto, 500 si hay fechas seleccionadas
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

  // 🔑 DATA OPTIMISTA UNIFICADA (Firestore + cambios locales pendientes)
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
    codigo: 'FAC-0001',
    comprobante_tipo: 'Factura A',
    punto_venta: '',
    n_factura: '',
    proveedor_id: '',
    proveedor: '',
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
    archivo_url: '',
    comprobante_anula: '',
    remitente: '',
    notificado_proveedor: false
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
    condiciones_pago: '',
    plazo_entrega: '',
    lugar_entrega: '',
    observaciones: '',
    firma_sice: '',
    firma_proveedor: '',
    insumos_oc: [
      { id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }
    ]
  });

  const buscarValorEnObjeto = useCallback((obj, keys) => {
    if (!obj || typeof obj !== 'object') return '';

    const normalizar = (str) => String(str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const objKeys = Object.keys(obj);

    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
      const keyNorm = normalizar(key);
      const realKey = objKeys.find(k => normalizar(k) === keyNorm);
      if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') {
        return obj[realKey];
      }
    }

    for (const key of keys) {
      const keyNorm = normalizar(key);
      const realKey = objKeys.find(k => normalizar(k).includes(keyNorm) || keyNorm.includes(normalizar(k)));
      if (realKey && obj[realKey] !== undefined && obj[realKey] !== null && obj[realKey] !== '') {
        return obj[realKey];
      }
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

  const presupuestosAprobados = useMemo(() => {
    return presupuestos.filter(pr => {
      const est = String(buscarValorEnObjeto(pr, ['estado', 'Estado', 'ESTADO']) || '').toLowerCase();
      return !est || est.includes('aprobad') || est.includes('aprobado');
    });
  }, [presupuestos, buscarValorEnObjeto]);

  const listaPresupuestosFinal = presupuestosAprobados.length > 0 ? presupuestosAprobados : presupuestos;

  const contratosListFinal = useMemo(() => {
    const todos = extraerArrayDatos(contratosList);
    const unicosMap = new Map();
    todos.forEach((item, index) => {
      if (!item) return;
      const key = String(buscarValorEnObjeto(item, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id', 'nro_contrato']) || index);
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
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
    return presupuestos.find(pr => {
      const pId = buscarValorEnObjeto(pr, ['id', 'ID', 'Id']);
      return String(pId).trim() === String(formData.presupuesto_id).trim();
    });
  }, [presupuestos, formData.presupuesto_id, buscarValorEnObjeto]);

  const { rubrosDelPresupuesto, gastosGeneralesDelPresupuesto } = useMemo(() => {
    let rubrosArr = [];
    let gastosGenerales = [];
    if (presupuestoSeleccionadoObj) {
      const rawItemsDetalle = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['items_detalle', 'Items_detalle', 'items', 'detalle']);
      try {
        let parsedData = rawItemsDetalle;
        if (typeof rawItemsDetalle === 'string') {
          parsedData = JSON.parse(rawItemsDetalle);
        }
        if (parsedData && Array.isArray(parsedData.rubros)) {
          rubrosArr = parsedData.rubros.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);
        } else if (Array.isArray(parsedData)) {
          rubrosArr = parsedData.map(r => r.nombre || r.rubro || r.Rubro).filter(Boolean);
        }

        let rawGG = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['gastos_generales_insumos', 'Gastos_generales_insumos', 'gastos_generales', 'Gastos_generales']);
        if (!rawGG && parsedData && typeof parsedData === 'object') {
          rawGG = parsedData.gastos_generales_insumos || parsedData.gastos_generales || (parsedData.comercial && (parsedData.comercial.gastos_generales_insumos || parsedData.comercial.gastos_generales));
        }

        let comercialObj = buscarValorEnObjeto(presupuestoSeleccionadoObj, ['comercial', 'Comercial']);
        if (typeof comercialObj === 'string') {
          try { comercialObj = JSON.parse(comercialObj); } catch(e) {}
        }
        if (!rawGG && comercialObj && typeof comercialObj === 'object') {
          rawGG = comercialObj.gastos_generales_insumos || comercialObj.gastos_generales;
        }

        if (typeof rawGG === 'string') {
          try { rawGG = JSON.parse(rawGG); } catch(e) {}
        }
        if (Array.isArray(rawGG)) {
          gastosGenerales = rawGG.map(item => item.concepto || item.nombre || item.descripcion).filter(Boolean);
        }
      } catch (e) {
        console.error("Error al parsear presupuesto:", e);
      }
    }
    return { rubrosDelPresupuesto: rubrosArr, gastosGeneralesDelPresupuesto: gastosGenerales };
  }, [presupuestoSeleccionadoObj, buscarValorEnObjeto]);

  const opcionesProveedores = useMemo(() => {
    return (proveedores || []).map(p => ({
      id: buscarValorEnObjeto(p, ['id', 'ID']),
      label: buscarValorEnObjeto(p, ['razon_social', 'nombre', 'Razon_social']) || 'Sin nombre'
    }));
  }, [proveedores, buscarValorEnObjeto]);

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
    const todas = [...(facturas || []), ...optimisticFacturas];
    if (todas.length === 0) return 'FAC-0001';
    const maxNum = todas.reduce((max, f) => {
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
    const todas = [...(ordenesCompra || []), ...optimisticOcs];
    if (todas.length === 0) return 'OC-0001';
    const maxNum = todas.reduce((max, oc) => {
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

  // 🔑 HANDLER DE OCR REFACTORIZADO (Usa el servicio)
  const handleArchivoSubido = async (e) => {
    if (!GOOGLE_SCRIPT_URL) {
      alert("ERROR: La variable GOOGLE_SCRIPT_URL no está configurada.");
      return;
    }
    const archivo = e.target.files[0];
    if (!archivo) return;
    setLocalLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          // 1. Llamamos al servicio de OCR
          const data = await procesarFacturaConAI(base64Data, archivo.type);

          // 2. Procesamos el resultado para la UI
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

          const tipoComprobanteMapeado = mapearTipoComprobante(
            data.tipo_comprobante,
            data.tipo_factura,
            archivo.name || ''
          );
          
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
            ...prev,
            comprobante_tipo: tipoComprobanteMapeado,
            n_factura: nFacturaCompleto || prev.n_factura,
            punto_venta: ptoVtaDetectado || prev.punto_venta || '',
            proveedor_id: proveedorEncontradoId || prev.proveedor_id,
            proveedor: nombreProvBusqueda || prev.proveedor,
            fecha: (data && formatearFechaParaInput(data.fecha)) || prev.fecha,
            vencimiento: (data && formatearFechaParaInput(data.vencimiento)) || prev.vencimiento,
            estado_pago: 'pendiente',
            subtotal: Math.abs(Number(data && data.subtotal) || prev.subtotal),
            iva_21: Math.abs(Number(data && data.iva_21) || prev.iva_21),
            iva_10_5: Math.abs(Number(data && data.iva_10_5) || prev.iva_10_5),
            persp_iibb_bs_as: Math.abs(Number(data && (data.persp_iibb_bs_as || data.percepcion_iibb || data.iibb_bs_as)) || prev.persp_iibb_bs_as),
            persp_iibb_caba: Math.abs(Number(data && (data.persp_iibb_caba || data.percepcion_iibb_caba)) || prev.persp_iibb_caba),
            otros_impuestos: Math.abs(Number(data && data.otros_impuestos) || prev.otros_impuestos),
            total: Math.abs(Number(data && data.total) || prev.total),
            archivo_url: base64Data,
            comprobante_anula: comprobanteAnulaDetectado || prev.comprobante_anula
          }));

          if (nombreProvBusqueda && !proveedorEncontradoId && candidatosFinales.length === 0) {
            setTimeout(() => {
              alert(`⚠️ El OCR detectó el proveedor "${nombreProvBusqueda}" pero no se encontró en el sistema.\n\nCreá el proveedor primero desde la sección Proveedores, o seleccionalo manualmente si ya existe con otro nombre.`);
            }, 100);
          }

          setIsUploadModalOpen(false);
          setIsFacturaModalOpen(true);
        } catch (fetchErr) {
          console.error("Error en fetch OCR:", fetchErr);
          alert("⚠️ Error al leer la factura:\n\n" + fetchErr.message + "\n\nPodés cargar los datos manualmente.");
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
    setCandidatosProveedor([]);
    setNombreProveedorOCR('');

    const fechaCruda = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);
    const vencCrudo = buscarValorEnObjeto(f, ['vencimiento', 'Vencimiento', 'VENCIMIENTO']);
    
    let rubroImputacionVal = buscarValorEnObjeto(f, ['rubro_imputacion', 'Rubro_imputacion', 'rubro_presupuesto', 'Rubro_presupuesto', 'rubro', 'Rubro']);
    if (rubroImputacionVal === 'A completar') rubroImputacionVal = '';

    let tipoInsumoVal = buscarValorEnObjeto(f, ['tipo_insumo', 'Tipo_insumo', 'insumo', 'Insumo', 'renglon', 'Renglon']) || 'Material';
    if (tipoInsumoVal === 'A completar') tipoInsumoVal = 'Material';

    const tipoComp = buscarValorEnObjeto(f, ['comprobante_tipo', 'Comprobante_tipo', 'tipo_comprobante']) || 'Factura A';
    
    let tipoGastoObtenido = buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto']) || 'Presupuesto';
    if (tipoGastoObtenido === 'A completar' || tipoGastoObtenido === '') tipoGastoObtenido = 'Presupuesto';

    let provIdVal = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
    let provNombreVal = buscarValorEnObjeto(f, ['proveedor', 'Proveedor']) || '';

    if ((!provIdVal || provIdVal === 0) && provNombreVal && proveedores.length > 0) {
       const { mejor } = buscarMejorMatch(provNombreVal, proveedores);
       if (mejor) {
         provIdVal = buscarValorEnObjeto(mejor, ['id', 'ID', 'Id']);
       }
    }

    let presupuestoIdVal = tipoGastoObtenido === 'Presupuesto' || tipoGastoObtenido === 'Viaticos-Nafta' || tipoGastoObtenido === 'Gastos Directos' ? buscarValorEnObjeto(f, ['presupuesto_id', 'Presupuesto_id']) : '';
    if (presupuestoIdVal === 'A completar') presupuestoIdVal = '';

    let contratoIdVal = tipoGastoObtenido === 'Contrato de Mantenimiento' ? buscarValorEnObjeto(f, ['contrato_id', 'Contrato_id']) : '';
    if (contratoIdVal === 'A completar') contratoIdVal = '';

    let obraIdVal = buscarValorEnObjeto(f, ['obra_id', 'Obra_id', 'OBRA_ID', 'obraid']) || '';
    if (obraIdVal === 'A completar') obraIdVal = '';

    setFormData({
      ...f,
      comprobante_tipo: tipoComp,
      punto_venta: buscarValorEnObjeto(f, ['punto_venta', 'Punto_venta']) || '',
      n_factura: buscarValorEnObjeto(f, ['n_factura', 'N_factura', 'N_FACTURA', 'numero_comp', 'numero', 'numero_factura', 'nfactura']) || '',
      proveedor_id: provIdVal || '',
      proveedor: provNombreVal, 
      obra_id: obraIdVal,
      presupuesto_id: presupuestoIdVal,
      contrato_id: contratoIdVal,
      tipo_gasto: tipoGastoObtenido,
      rubro_imputacion: rubroImputacionVal,
      tipo_insumo: tipoInsumoVal,
      detalle_gasto: buscarValorEnObjeto(f, ['detalle_gasto', 'Detalle_gasto']) || '',
      fecha: formatearFechaParaInput(fechaCruda),
      vencimiento: formatearFechaParaInput(vencCrudo),
      estado_pago: normalizarEstadoPago(buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago', 'ESTADO_PAGO'])),
      subtotal: Math.abs(Number(buscarValorEnObjeto(f, ['subtotal', 'Subtotal']) || 0)),
      iva_21: Math.abs(Number(buscarValorEnObjeto(f, ['iva_21', 'Iva_21']) || 0)),
      iva_10_5: Math.abs(Number(buscarValorEnObjeto(f, ['iva_10_5', 'Iva_10_5']) || 0)),
      persp_iibb_bs_as: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_bs_as', 'Persp_iibb_bs_as', 'percepcion_iibb', 'iibb_bs_as']) || 0)),
      persp_iibb_caba: Math.abs(Number(buscarValorEnObjeto(f, ['persp_iibb_caba', 'Persp_iibb_caba', 'percepcion_iibb_caba']) || 0)),
      otros_impuestos: Math.abs(Number(buscarValorEnObjeto(f, ['otros_impuestos', 'Otros_impuestos']) || 0)),
      total: Math.abs(Number(buscarValorEnObjeto(f, ['total', 'Total', 'TOTAL']) || 0)),
      archivo_url: buscarValorEnObjeto(f, ['archivo_url', 'Archivo_url', 'archivo']) || '',
      comprobante_anula: buscarValorEnObjeto(f, ['comprobante_anula', 'Comprobante_anula']) || '',
      remitente: buscarValorEnObjeto(f, ['remitente', 'Remitente', 'from']) || '',
      notificado_proveedor: Boolean(buscarValorEnObjeto(f, ['notificado_proveedor', 'Notificado_proveedor']))
    });
    setIsFacturaModalOpen(true);
  };

  const handleGuardarFactura = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!editingId && formData.n_factura) {
      const limpiarNro = (nro) => String(nro || '').replace(/\D/g, '').replace(/^0+/, '') || '0';
      const nroAComparar = limpiarNro(formData.n_factura);
      
      const facturaExistente = facturasRender.find(f => {
        const nroBase = f.n_factura || f.N_factura || f.numero_comp || '';
        return limpiarNro(nroBase) === nroAComparar;
      });

      if (facturaExistente) {
        alert(`⚠️ La factura N° ${formData.n_factura} ya se encuentra registrada en el sistema con el código ${facturaExistente.codigo || 'N/A'}.\n\nSi querés modificarla, buscá ese código en la lista y hacé clic en Editar.`);
        return; 
      }
    }

    const codigoFinal = editingId ? (formData.codigo || generarSiguienteCodigoFactura()) : generarSiguienteCodigoFactura();
    const esNotaCredito = String(formData.comprobante_tipo || '').toLowerCase().includes('nota de crédito') || String(formData.comprobante_tipo || '').toLowerCase().includes('nota de credito');
    const factorSigno = esNotaCredito ? -1 : 1;

    const esPresupuestario = formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Viaticos-Nafta' || formData.tipo_gasto === 'Gastos Directos';
    const esContrato = formData.tipo_gasto === 'Contrato de Mantenimiento';
    const esGastoLibre = formData.tipo_gasto === 'Gasto Corriente' || formData.tipo_gasto === 'Gasto Extra';

    const tempId = editingId || `temp_${Date.now()}`;

    const datosOptimistas = {
      ...formData,
      id: tempId,
      codigo: codigoFinal,
      archivo_url: '',
      subtotal: Math.abs(Number(formData.subtotal) || 0) * factorSigno,
      iva_21: Math.abs(Number(formData.iva_21) || 0) * factorSigno,
      iva_10_5: Math.abs(Number(formData.iva_10_5) || 0) * factorSigno,
      persp_iibb_bs_as: Math.abs(Number(formData.persp_iibb_bs_as) || 0) * factorSigno,
      persp_iibb_caba: Math.abs(Number(formData.persp_iibb_caba) || 0) * factorSigno,
      otros_impuestos: Math.abs(Number(formData.otros_impuestos) || 0) * factorSigno,
      total: Math.abs(Number(formData.total) || 0) * factorSigno,
      estado_pago: esNotaCredito ? 'pendiente' : formData.estado_pago,
      n_factura: formData.n_factura,
      numero_comp: formData.n_factura,
      proveedor_id: formData.proveedor_id,
      proveedor: formData.proveedor,
      obra_id: (esPresupuestario || esContrato) ? formData.obra_id : '',
      presupuesto_id: esPresupuestario ? formData.presupuesto_id : '',
      contrato_id: esContrato ? formData.contrato_id : '',
      rubro_imputacion: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '',
      rubro_presupuesto: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '',
      rubro: (esPresupuestario || esContrato) ? formData.rubro_imputacion : '',
      tipo_insumo: (esPresupuestario || esContrato) ? formData.tipo_insumo : '',
      insumo: (esPresupuestario || esContrato) ? formData.tipo_insumo : '',
      detalle_gasto: esGastoLibre ? formData.detalle_gasto : '', 
      es_nota_credito: esNotaCredito,
      comprobante_anula: esNotaCredito ? (formData.comprobante_anula || '') : '',
      remitente: formData.remitente || '',
      notificado_proveedor: Boolean(formData.notificado_proveedor)
    };

    const backupOptimistic = [...optimisticFacturas];

    setOptimisticFacturas(prev => {
      if (editingId) return prev.map(p => p.id === editingId ? datosOptimistas : p);
      return [datosOptimistas, ...prev];
    });
    setIsFacturaModalOpen(false);
    setIsSaving(true);

    try {
      let archivoUrlFinal = formData.archivo_url || '';
      if (archivoUrlFinal && archivoUrlFinal.indexOf('data:') === 0) {
        // 🔑 Usamos el servicio
        archivoUrlFinal = await subirArchivoADrive(archivoUrlFinal, 'Facturas');
      }

      const payloadData = {
        ...datosOptimistas,
        archivo_url: archivoUrlFinal
      };

      const datosLimpios = {};
      Object.keys(payloadData).forEach(key => {
        if (payloadData[key] !== undefined) {
          datosLimpios[key] = payloadData[key];
        }
      });
      delete datosLimpios._creadoEn;
      delete datosLimpios._actualizadoEn;
      delete datosLimpios.id;

      let nuevoDocId = editingId;
      if (editingId) {
        await actualizarDoc('facturas_compras', editingId, datosLimpios);
        setOptimisticFacturas(prev => prev.map(p => p.id === editingId ? { ...p, archivo_url: archivoUrlFinal } : p));
      } else {
        nuevoDocId = await crearDoc('facturas_compras', datosLimpios);
        setOptimisticFacturas(prev => prev.map(p => p.id === tempId ? { ...p, id: nuevoDocId, archivo_url: archivoUrlFinal } : p));
      }

      if (formData.remitente && !formData.notificado_proveedor && formData.estado_pago !== 'a asignar' && formData.estado_pago !== 'A Asignar') {
        try {
          let idToken = '';
          if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
          const resMail = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'enviarConfirmacionFactura', email: formData.remitente, n_factura: formData.n_factura, proveedor: formData.proveedor, idToken })
          });
          const dataMail = await resMail.json();
          if (dataMail.success) {
            await actualizarDoc('facturas_compras', nuevoDocId, { notificado_proveedor: true });
          }
        } catch (emailErr) {
          console.error("Error enviando mail:", emailErr);
        }
      }

      setCandidatosProveedor([]);
      setNombreProveedorOCR('');
    } catch (err) {
      console.error("ERROR FIRESTORE:", err);
      setOptimisticFacturas(backupOptimistic);
      alert("⚠️ ATENCIÓN: La factura NO se guardó en la base de datos.\n\nMotivo: " + err.message);
      setIsFacturaModalOpen(true); 
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarFactura = async (f) => {
    const facturaId = obtenerIdReal(f); 
    
    if (!facturaId) {
      alert("⚠️ Error: No se pudo identificar el ID de la factura.");
      return;
    }

    const tipoComp = String(buscarValorEnObjeto(f, ['comprobante_tipo', 'tipo_comprobante']) || '');
    const esNC = tipoComp.toLowerCase().includes('nota de crédito') || tipoComp.toLowerCase().includes('nota de credito');
    const estadoPago = String(buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago']) || '').toLowerCase();

    if (esNC && estadoPago === 'contabilizado') {
      alert(
        "⚠️ Esta Nota de Crédito ya está CONTABILIZADA en Tesorería.\n\n" +
        "Para eliminarla primero tenés que descontabilizarla (borrar el movimiento asociado en Tesorería).\n\n" +
        "Si querés eliminar todo el registro, hacelo desde Tesorería → Movimientos."
      );
      return;
    }

    if (!window.confirm("¿Estás seguro de eliminar esta factura?")) return;

    setDeletedFacturas(prev => [...prev, facturaId]);

    try {
      if (facturaId.startsWith('temp_')) {
        setOptimisticFacturas(prev => prev.filter(x => obtenerIdReal(x) !== facturaId));
      } else {
        await eliminarDoc('facturas_compras', facturaId);
      }
    } catch (err) {
      console.error(err);
      setDeletedFacturas(prev => prev.filter(id => id !== facturaId));
      alert("Error al eliminar: " + (err.message || ''));
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
      condiciones_pago: buscarValorEnObjeto(oc, ['condiciones_pago', 'Condiciones_pago']) || '',
      plazo_entrega: buscarValorEnObjeto(oc, ['plazo_entrega', 'Plazo_entrega']) || '',
      lugar_entrega: buscarValorEnObjeto(oc, ['lugar_entrega', 'Lugar_entrega']) || '',
      observaciones: buscarValorEnObjeto(oc, ['observaciones', 'Observaciones']) || '',
      firma_sice: buscarValorEnObjeto(oc, ['firma_sice', 'Firma_sice']) || '',
      firma_proveedor: buscarValorEnObjeto(oc, ['firma_proveedor', 'Firma_proveedor']) || '',
      insumos_oc: insumosParseados
    });
    setIsOcModalOpen(true);
  };

  const handleGuardarOc = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const codigoFinal = editingOcId ? formDataOc.codigo : generarSiguienteCodigoOc();
    const tempId = editingOcId || `temp_${Date.now()}`;

    const payloadData = {
      ...formDataOc,
      codigo: codigoFinal,
      insumos_oc: JSON.stringify(formDataOc.insumos_oc)
    };

    const datosOptimistas = { ...payloadData, id: tempId };
    const backup = [...optimisticOcs];

    setOptimisticOcs(prev => {
      if (editingOcId) return prev.map(p => p.id === editingOcId ? datosOptimistas : p);
      return [datosOptimistas, ...prev];
    });
    setIsOcModalOpen(false);
    setIsSaving(true);

    try {
      const { _creadoEn, _actualizadoEn, id, ...datosLimpios } = payloadData;

      if (editingOcId) {
        await actualizarDoc('ordenes_compra', editingOcId, datosLimpios);
      } else {
        const nuevoDocId = await crearDoc('ordenes_compra', datosLimpios);
        setOptimisticOcs(prev => prev.map(p => p.id === tempId ? { ...p, id: nuevoDocId } : p));
      }
    } catch (err) {
      setOptimisticOcs(backup);
      alert("Error al guardar OC: " + (err.message || ''));
      setIsOcModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarOc = async (oc) => {
    const ocId = obtenerIdReal(oc);
    if (!ocId || !window.confirm("¿Eliminar Orden de Compra?")) return;

    setDeletedOcs(prev => [...prev, ocId]);

    try {
      if (ocId.startsWith('temp_')) {
        setOptimisticOcs(prev => prev.filter(x => obtenerIdReal(x) !== ocId));
      } else {
        await eliminarDoc('ordenes_compra', ocId);
      }
    } catch (err) {
      console.error(err);
      setDeletedOcs(prev => prev.filter(id => id !== ocId));
      alert("Error al eliminar OC: " + (err.message || ''));
    }
  };

  const handleGenerarPdfOc = async (oc) => {
    if (!GOOGLE_SCRIPT_URL) {
      alert("ERROR: La variable GOOGLE_SCRIPT_URL no está configurada.");
      return;
    }

    const ocId = buscarValorEnObjeto(oc, ['id', 'ID', 'Id', 'codigo']);
    setGenerandoPdfOcId(ocId);

    try {
      const provId = buscarValorEnObjeto(oc, ['proveedor_id', 'Proveedor_id']);
      const prov = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));

      const obraId = buscarValorEnObjeto(oc, ['obra_id', 'Obra_id']);
      const obra = obras.find(o => String(buscarValorEnObjeto(o, ['id', 'ID'])) === String(obraId));

      const rawInsumos = buscarValorEnObjeto(oc, ['insumos_oc', 'Insumos_oc']);
      let insumos = [];
      try {
        insumos = typeof rawInsumos === 'string' ? JSON.parse(rawInsumos) : (Array.isArray(rawInsumos) ? rawInsumos : []);
      } catch (e) { insumos = []; }

      const payload = {
        action: 'generar_pdf_orden_compra',
        tabla: 'OrdenesCompra',
        orden: {
          codigo: buscarValorEnObjeto(oc, ['codigo', 'Codigo']),
          fecha: buscarValorEnObjeto(oc, ['fecha', 'Fecha']),
          fecha_entrega: buscarValorEnObjeto(oc, ['fecha_entrega', 'Fecha_entrega']),
          subtotal: Number(buscarValorEnObjeto(oc, ['subtotal', 'Subtotal'])) || 0,
          iva_21: Number(buscarValorEnObjeto(oc, ['iva_21', 'Iva_21'])) || 0,
          total: Number(buscarValorEnObjeto(oc, ['total', 'Total'])) || 0,
          condiciones_pago: buscarValorEnObjeto(oc, ['condiciones_pago', 'Condiciones_pago']) || '',
          plazo_entrega: buscarValorEnObjeto(oc, ['plazo_entrega', 'Plazo_entrega']) || '',
          lugar_entrega: buscarValorEnObjeto(oc, ['lugar_entrega', 'Lugar_entrega']) || '',
          observaciones: buscarValorEnObjeto(oc, ['observaciones', 'Observaciones']) || '',
          firma_sice: buscarValorEnObjeto(oc, ['firma_sice', 'Firma_sice']) || '',
          firma_proveedor: buscarValorEnObjeto(oc, ['firma_proveedor', 'Firma_proveedor']) || ''
        },
        proveedor: {
          razon_social: buscarValorEnObjeto(prov, ['razon_social', 'nombre', 'Razon_social']) || '',
          cuit: buscarValorEnObjeto(prov, ['cuit', 'CUIT', 'Cuit']) || '',
          direccion: buscarValorEnObjeto(prov, ['direccion', 'Direccion']) || '',
          telefono: buscarValorEnObjeto(prov, ['telefono', 'Telefono']) || ''
        },
        obra: {
          codigo: buscarValorEnObjeto(obra, ['codigo', 'Codigo']) || '',
          nombre: buscarValorEnObjeto(obra, ['nombre', 'nombre_obra', 'Nombre']) || ''
        },
        insumos
      };

      let idToken = '';
      if (auth.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      payload.idToken = idToken;

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (data && data.success && data.pdf_url) {
        window.open(data.pdf_url, '_blank');
      } else {
        alert('Error generando PDF: ' + ((data && data.error) || 'desconocido'));
      }
    } catch (err) {
      console.error('[PDF OC] Error:', err);
      alert('Error generando PDF: ' + (err.message || ''));
    } finally {
      setGenerandoPdfOcId(null);
    }
  };

  const handleEnviarAlContador = async (e) => {
    e.preventDefault();
    if (!emailContador || emailContador.indexOf('@') === -1) {
      alert("Por favor, ingresá un correo válido.");
      return;
    }
    if (facturasFiltradas.length === 0) {
      alert("No hay facturas en el período seleccionado para enviar.");
      return;
    }

    setEnviandoFacturas(true);
    try {
      const facturasParaEnviar = facturasFiltradas
        .filter(f => {
          const id = obtenerIdReal(f);
          return !id.startsWith('temp_');
        })
        .map(f => {
          const provId = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
          const provObj = proveedores.find(p => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId));
          
          const provNombre = provObj?.razon_social || provObj?.nombre || provObj?.Razon_social || f.proveedor || 'Proveedor Desconocido';

          return {
            ...f,
            proveedor: provNombre 
          };
        });

      let idToken = '';
      if (auth.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'enviarFacturasAlContador',
          email: emailContador,
          fechaDesde: filtroFechaDesde ? formatearFechaDisplay(filtroFechaDesde) : 'Inicio',
          fechaHasta: filtroFechaHasta ? formatearFechaDisplay(filtroFechaHasta) : 'Fin',
          facturas: facturasParaEnviar,
          idToken: idToken
        })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("✅ Correo enviado al contador con éxito.");
        setIsEnviarContadorModalOpen(false);
        setEmailContador('');
      } else {
        alert("⚠️ Error al enviar: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Error de red al intentar enviar las facturas.");
    } finally {
      setEnviandoFacturas(false);
    }
  };

  const facturasFiltradas = useMemo(() => {
    const filtradas = facturasRender.filter(f => {
      const provId = buscarValorEnObjeto(f, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
      const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
      const fFecha = buscarValorEnObjeto(f, ['fecha', 'Fecha', 'FECHA']);
      let matchFecha = true;
      if (filtroFechaDesde && fFecha && fFecha < filtroFechaDesde) matchFecha = false;
      if (filtroFechaHasta && fFecha && fFecha > filtroFechaHasta) matchFecha = false;

      let matchDocumento = true;
      if (filtroDocumento) {
        const presId = buscarValorEnObjeto(f, ['presupuesto_id', 'Presupuesto_id', 'presupuestoid', 'presupuesto']);
        const contId = buscarValorEnObjeto(f, ['contrato_id', 'Contrato_id', 'contratoid', 'contrato']);

        if (filtroDocumento.startsWith('PRES-')) {
          const idLimpio = filtroDocumento.replace('PRES-', '');
          matchDocumento = String(presId).trim() === String(idLimpio).trim();
        } else if (filtroDocumento.startsWith('CONT-')) {
          const idLimpio = filtroDocumento.replace('CONT-', '');
          matchDocumento = String(contId).trim() === String(idLimpio).trim();
        }
      }

      let matchEstadoPago = true;
      if (filtroEstadoPago) {
        const estadoPagoFactura = String(
          buscarValorEnObjeto(f, ['estado_pago', 'Estado_pago', 'ESTADO_PAGO', 'estadopago']) || 'pendiente'
        ).toLowerCase().trim();
        matchEstadoPago = estadoPagoFactura === filtroEstadoPago.toLowerCase();
      }

      return matchProveedor && matchFecha && matchDocumento && matchEstadoPago;
    });

    const unicosMap = new Map();
    filtradas.forEach(f => {
      const nFactura = buscarValorEnObjeto(f, ['n_factura', 'N_factura', 'N_FACTURA', 'numero_comp', 'numero', 'numero_factura', 'nfactura']);
      const total = buscarValorEnObjeto(f, ['total', 'Total', 'TOTAL']);
      const key = nFactura ? `${nFactura}-${total}` : `key-${Math.random()}`;
      
      if (!unicosMap.has(key)) {
        unicosMap.set(key, f);
      } else {
        const existente = unicosMap.get(key);
        const fechaExistente = new Date(existente._actualizadoEn || existente._creadoEn || 0).getTime();
        const fechaNueva = new Date(f._actualizadoEn || f._creadoEn || 0).getTime();
        if (fechaNueva > fechaExistente) {
          unicosMap.set(key, f);
        }
      }
    });

    return Array.from(unicosMap.values());
  }, [facturasRender, filtroProveedor, filtroFechaDesde, filtroFechaHasta, filtroDocumento, filtroEstadoPago, buscarValorEnObjeto]);

  const ordenesFiltradas = useMemo(() => {
    return ordenesRender.filter(oc => {
      const provId = buscarValorEnObjeto(oc, ['proveedor_id', 'Proveedor_id', 'PROVEEDOR_ID', 'proveedorid']);
      const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
      const ocFecha = buscarValorEnObjeto(oc, ['fecha', 'Fecha', 'FECHA']);
      let matchFecha = true;
      if (filtroFechaDesde && ocFecha && ocFecha < filtroFechaDesde) matchFecha = false;
      if (filtroFechaHasta && ocFecha && ocFecha > filtroFechaHasta) matchFecha = false;
      return matchProveedor && matchFecha;
    });
  }, [ordenesRender, filtroProveedor, filtroFechaDesde, filtroFechaHasta, buscarValorEnObjeto]);

  const esTipoPresupuestario = formData.tipo_gasto === 'Presupuesto' || formData.tipo_gasto === 'Viaticos-Nafta' || formData.tipo_gasto === 'Gastos Directos';
  const esTipoContrato = formData.tipo_gasto === 'Contrato de Mantenimiento';
  const esGastoLibre = formData.tipo_gasto === 'Gasto Corriente' || formData.tipo_gasto === 'Gasto Extra';
  
  const requiereObra = esTipoPresupuestario || esTipoContrato;
  const esNotaCreditoForm = String(formData.comprobante_tipo || '').toLowerCase().includes('nota de crédito') ||
                            String(formData.comprobante_tipo || '').toLowerCase().includes('nota de credito');

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
              condiciones_pago: '',
              plazo_entrega: '',
              lugar_entrega: '',
              observaciones: '',
              firma_sice: nombreUsuarioLogueado,
              firma_proveedor: '',
              insumos_oc: [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }]
            });
            setIsOcModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer">
            <Plus className="w-4 h-4" /> Nueva OC
          </button>
          <button onClick={() => {
            setEditingId(null);
            setCandidatosProveedor([]);
            setNombreProveedorOCR('');
            setFormData({
              codigo: generarSiguienteCodigoFactura(),
              comprobante_tipo: 'Factura A',
              punto_venta: '',
              n_factura: '',
              proveedor_id: '',
              proveedor: '',
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
              archivo_url: '',
              comprobante_anula: '',
              remitente: '',
              notificado_proveedor: false
            });
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
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Proveedor</label>
          <BuscadorSelect
            opciones={[{ id: '', label: 'Todos los Proveedores' }, ...opcionesProveedores]}
            value={filtroProveedor}
            onChange={setFiltroProveedor}
            placeholder="Todos los Proveedores"
            minChars={3}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Estado de Pago</label>
          <select
            value={filtroEstadoPago}
            onChange={(e) => setFiltroEstadoPago(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">Todos</option>
            <option value="a asignar">A Asignar</option>
            <option value="pendiente">Pendiente</option>
            <option value="contabilizado">Contabilizado</option>
            <option value="pagado">Pagado</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Doc. Aprobado (Presup. / Contrato)</label>
          <select value={filtroDocumento} onChange={(e) => setFiltroDocumento(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500 cursor-pointer">
            <option value="">Todos los Documentos</option>
            <optgroup label="Presupuestos">
              {listaPresupuestosFinal.map(pr => {
                const prId = buscarValorEnObjeto(pr, ['id', 'ID']);
                return <option key={`pr-${prId}`} value={`PRES-${prId}`}>{pr.codigo} - {pr.nombre}</option>;
              })}
            </optgroup>
            <optgroup label="Contratos">
              {listaContratosFinal.map((c, idx) => {
                const cId = buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id']) || idx;
                const cCod = buscarValorEnObjeto(c, ['codigo', 'nro_contrato', 'numero']) || 'S/C';
                const cNom = buscarValorEnObjeto(c, ['nombre', 'cliente', 'razon_social']) || 'Contrato';
                return <option key={`c-${cId}`} value={`CONT-${cId}`}>[{cCod}] {cNom}</option>;
              })}
            </optgroup>
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
        <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'ordenes' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Órdenes de Compra ({ordenesRender.length})</button>
        <button onClick={() => setActiveTab('facturas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'facturas' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Facturas ({facturasRender.length})</button>
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-100 border-b text-[11px] text-slate-600 flex justify-between items-center">
            <span>Total de facturas mostradas: <b>{facturasRender.length}</b> | Filtradas: <b>{facturasFiltradas.length}</b></span>
          </div>

          {facturas.length === (filtroFechaDesde || filtroFechaHasta ? 500 : 100) && (
            <div className="bg-amber-100 border-b border-amber-300 p-3 text-xs text-amber-900 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Se alcanzó el límite máximo de visualización. Si buscás una factura más antigua, <b>ajustá el rango de fechas (Desde/Hasta)</b> para achicar el período.</span>
            </div>
          )}

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
                  <BuscadorSelect
                    opciones={opcionesProveedores}
                    value={formDataOc.proveedor_id}
                    onChange={(id) => setFormDataOc({ ...formDataOc, proveedor_id: id })}
                    placeholder="Seleccionar..."
                    minChars={3}
                    disabled={isSaving}
                  />
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
                <h4 className="font-extrabold text-xs uppercase text-slate-800">Condiciones Comerciales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condiciones de Pago</label>
                    <input type="text" disabled={isSaving} placeholder="Ej: 30 días fecha factura" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.condiciones_pago} onChange={(e) => setFormDataOc({...formDataOc, condiciones_pago: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plazo de Entrega</label>
                    <input type="text" disabled={isSaving} placeholder="Ej: 15 días corridos" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.plazo_entrega} onChange={(e) => setFormDataOc({...formDataOc, plazo_entrega: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lugar de Entrega</label>
                    <input type="text" disabled={isSaving} placeholder="Ej: Obra Planta San Lorenzo" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.lugar_entrega} onChange={(e) => setFormDataOc({...formDataOc, lugar_entrega: e.target.value})} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones</label>
                    <textarea
                      disabled={isSaving}
                      rows={2}
                      placeholder="Observaciones adicionales..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 resize-y"
                      value={formDataOc.observaciones}
                      onChange={(e) => setFormDataOc({...formDataOc, observaciones: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-extrabold text-xs uppercase text-slate-800">Firmas (aparecen en el PDF)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma SICE</label>
                    <input type="text" disabled={isSaving} placeholder="Nombre del responsable SICE" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.firma_sice} onChange={(e) => setFormDataOc({...formDataOc, firma_sice: e.target.value})} />
                    <p className="text-[10px] text-slate-500 mt-1">Debajo de la firma aparecerá "p/ SICE S.A."</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma Proveedor</label>
                    <input type="text" disabled={isSaving} placeholder="Nombre del responsable del proveedor" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.firma_proveedor} onChange={(e) => setFormDataOc({...formDataOc, firma_proveedor: e.target.value})} />
                    <p className="text-[10px] text-slate-500 mt-1">Podés dejarlo en blanco para firmar a mano</p>
                  </div>
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
                <span>Verifique y corrija los datos leídos por la IA. Las Notas de Crédito se guardan como PENDIENTES y luego se contabilizan manualmente desde Tesorería → Facturas a pagar.</span>
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
                      setFormData({
                        ...formData,
                        comprobante_tipo: tipoVal
                      });
                    }}
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

      {isEnviarContadorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Enviar Facturas al Contador</h3>
              <button onClick={() => setIsEnviarContadorModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleEnviarAlContador} className="p-6 space-y-4">
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg">
                Se enviarán <b>{facturasFiltradas.length}</b> facturas en PDF y un resumen en Excel.
                {filtroFechaDesde && ` Desde: ${formatearFechaDisplay(filtroFechaDesde)}`}
                {filtroFechaHasta && ` Hasta: ${formatearFechaDisplay(filtroFechaHasta)}`}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email del Contador *</label>
                <input 
                  type="email" 
                  required 
                  disabled={enviandoFacturas}
                  placeholder="contador@estudio.com" 
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 disabled:bg-slate-100" 
                  value={emailContador} 
                  onChange={(e) => setEmailContador(e.target.value)} 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsEnviarContadorModalOpen(false)} disabled={enviandoFacturas} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={enviandoFacturas} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
                  {enviandoFacturas && <Loader2 className="w-4 h-4 animate-spin" />}
                  {enviandoFacturas ? 'Enviando...' : 'Enviar Correo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}