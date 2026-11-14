// src/pages/Tesoreria.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Search, AlertTriangle, Mail } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { auth } from '@/firebase';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { limit, orderBy, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Servicios
import {
  guardarMovimientoTesoreria,
  eliminarMovimientoTesoreria,
  contabilizarNCCompra,
  crearFacturaVenta,
  actualizarFacturaVenta,
  subirCertificadoRetencion,
  procesarFacturaVentaConIA,
  subirArchivoADrive,
  enviarRetencionesAlContador,
} from '@/services/tesoreriaService';

// Helpers
import {
  buscarMejorMatch,
  mapearTipoComprobante,
  formatearFechaDisplay,
  formatearFechaParaInput,
  inferirOrigenMovimiento,
} from '@/utils/tesoreriaHelpers';

// Componentes
import TabsTesoreria from '@/components/tesoreria/TabsTesoreria';
import TablaMovimientos from '@/components/tesoreria/TablaMovimientos';
import TablaFacturasPagar from '@/components/tesoreria/TablaFacturasPagar';
import TablaFacturasCobrar from '@/components/tesoreria/TablaFacturasCobrar';
import TablaRetenciones from '@/components/tesoreria/TablaRetenciones';
import CashFlowTabla from '@/components/tesoreria/CashFlowTabla';
import ModalMovimiento from '@/components/tesoreria/modal/ModalMovimiento';
import ModalFacturaVenta from '@/components/tesoreria/modal/ModalFacturaVenta';
import ModalEnviarContador from '@/components/tesoreria/modal/ModalEnviarContador';
import BuscadorSelect from '@/components/BuscadorSelect';

const FORM_DATA_MOV_INICIAL = () => ({
  tipo: 'Egreso',
  fecha: new Date().toISOString().split('T')[0],
  concepto: '',
  monto: 0,
  obra_id: '',
  presupuesto_id: '',
  contrato_id: '',
  rubro_imputacion: '',
  tipo_insumo: 'Materiales',
  medio_pago: 'transferencia',
  referencia: '',
  retencion_suss: 0,
  retencion_iva: 0,
  retencion_ganancias: 0,
  retencion_iibb_pba: 0,
  retencion_iibb_caba: 0,
  facturas_aplicadas: [{ id: Date.now(), factura_id: '', monto: 0 }],
});

const FORM_DATA_VENTA_INICIAL = () => ({
  tipo_comprobante: 'FACTURA A',
  punto_venta: '00001',
  numero_comp: '',
  cliente_id: '',
  obra_id: '',
  presupuesto_id: '',
  contrato_id: '',
  certificado_id: '',
  fecha_emision: new Date().toISOString().split('T')[0],
  fecha_vencimiento: '',
  items: [{ id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }],
  neto_gravado: 0,
  iva_21: 0,
  iva_105: 0,
  otros_tributos: 0,
  total: 0,
  archivo_url: '',
  estado_pago: 'pendiente',
  comprobante_anula: '',
});

export default function Tesoreria() {
  const { data: proveedores } = useFirestoreCollection('proveedores');
  const { data: clientes } = useFirestoreCollection('clientes');
  const { data: obras } = useFirestoreCollection('obras');
  const { data: presupuestos } = useFirestoreCollection('presupuestos');
  
  // 🔑 Normalizamos contratos para asegurar que sea un array
  const { data: contratosRaw } = useFirestoreCollection('contratos');
  const contratos = useMemo(() => {
    if (Array.isArray(contratosRaw)) return contratosRaw;
    if (contratosRaw && typeof contratosRaw === 'object') {
      if (Array.isArray(contratosRaw.data)) return contratosRaw.data;
      if (Array.isArray(contratosRaw.items)) return contratosRaw.items;
      const foundArray = Object.values(contratosRaw).find(val => Array.isArray(val));
      if (foundArray) return foundArray;
    }
    return [];
  }, [contratosRaw]);

  const { data: certificados } = useFirestoreCollection('certificados');

  const [activeTab, setActiveTab] = useState('movimientos');

  // Filtros
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const [filtroProveedorMovimientos, setFiltroProveedorMovimientos] = useState('');
  const [filtroTipoMovimiento, setFiltroTipoMovimiento] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [filtroProveedorPagar, setFiltroProveedorPagar] = useState('');
  const [filtroClienteCobrar, setFiltroClienteCobrar] = useState('');
  const [filtroClienteRetencion, setFiltroClienteRetencion] = useState('');
  const [filtroTipoRetencion, setFiltroTipoRetencion] = useState('');

  // Modales
  const [isModalMovOpen, setIsModalMovOpen] = useState(false);
  const [editingMovId, setEditingMovId] = useState(null);
  const [formDataMov, setFormDataMov] = useState(FORM_DATA_MOV_INICIAL());
  const [isSavingMov, setIsSavingMov] = useState(false);

  const [isModalVentaOpen, setIsModalVentaOpen] = useState(false);
  const [editingVentaId, setEditingVentaId] = useState(null);
  const [pasoFacturaVenta, setPasoFacturaVenta] = useState('subir');
  const [leyendoFactura, setLeyendoFactura] = useState(false);
  const [formDataVenta, setFormDataVenta] = useState(FORM_DATA_VENTA_INICIAL());
  const [archivoBase64Venta, setArchivoBase64Venta] = useState('');
  const [nombreArchivoVenta, setNombreArchivoVenta] = useState('');
  const [candidatosCliente, setCandidatosCliente] = useState([]);
  const [nombreClienteOCR, setNombreClienteOCR] = useState('');
  const [isSavingVenta, setIsSavingVenta] = useState(false);

  const [subiendoCertificadoId, setSubiendoCertificadoId] = useState(null);

  const [isEnviarContadorOpen, setIsEnviarContadorOpen] = useState(false);
  const [emailContador, setEmailContador] = useState('');
  const [enviandoRetenciones, setEnviandoRetenciones] = useState(false);

  // Queries
  const movimientosConstraints = useMemo(() => {
    const c = [];
    const isFiltered = filtroFechaDesde || filtroFechaHasta;
    if (filtroFechaDesde) c.push(where('fecha', '>=', filtroFechaDesde));
    if (filtroFechaHasta) c.push(where('fecha', '<=', filtroFechaHasta));
    c.push(orderBy('fecha', 'desc'));
    c.push(limit(isFiltered ? 500 : 100));
    return c;
  }, [filtroFechaDesde, filtroFechaHasta]);
  const { data: movimientos } = useFirestoreQuery('tesoreria', movimientosConstraints);

  const facturasComprasConstraints = useMemo(() => {
    const c = [];
    const isFiltered = filtroFechaDesde || filtroFechaHasta;
    if (filtroFechaDesde) c.push(where('fecha', '>=', filtroFechaDesde));
    if (filtroFechaHasta) c.push(where('fecha', '<=', filtroFechaHasta));
    c.push(orderBy('fecha', 'desc'));
    c.push(limit(isFiltered ? 500 : 100));
    return c;
  }, [filtroFechaDesde, filtroFechaHasta]);
  const { data: facturasCompras } = useFirestoreQuery('facturas_compras', facturasComprasConstraints);

  const facturasVentasConstraints = useMemo(() => {
    const c = [];
    const isFiltered = filtroFechaDesde || filtroFechaHasta;
    if (filtroFechaDesde) c.push(where('fecha_emision', '>=', filtroFechaDesde));
    if (filtroFechaHasta) c.push(where('fecha_emision', '<=', filtroFechaHasta));
    c.push(orderBy('fecha_emision', 'desc'));
    c.push(limit(isFiltered ? 500 : 100));
    return c;
  }, [filtroFechaDesde, filtroFechaHasta]);
  const { data: facturasVentas } = useFirestoreQuery('facturas_ventas', facturasVentasConstraints);

  const retencionesConstraints = useMemo(() => {
    const c = [];
    const isFiltered = filtroFechaDesde || filtroFechaHasta;
    if (filtroFechaDesde) c.push(where('fecha', '>=', filtroFechaDesde));
    if (filtroFechaHasta) c.push(where('fecha', '<=', filtroFechaHasta));
    c.push(orderBy('fecha', 'desc'));
    c.push(limit(isFiltered ? 500 : 100));
    return c;
  }, [filtroFechaDesde, filtroFechaHasta]);
  const { data: retenciones } = useFirestoreQuery('retenciones', retencionesConstraints);

  // Derivados
  const opcionesProveedores = useMemo(
    () => (proveedores || []).map(p => ({ id: p.id || p.ID, label: p.razon_social || p.nombre || 'Sin nombre' })),
    [proveedores]
  );
  const opcionesClientes = useMemo(
    () => (clientes || []).map(c => ({ id: c.id || c.ID, label: c.razon_social || c.nombre || 'Sin nombre' })),
    [clientes]
  );
  const opcionesTerceros = useMemo(() => {
    const map = new Map();
    (proveedores || []).forEach(p => map.set(String(p.id || p.ID), p.razon_social || p.nombre || 'Sin nombre'));
    (clientes || []).forEach(c => {
      const key = String(c.id || c.ID);
      if (!map.has(key)) map.set(key, c.razon_social || c.nombre || 'Sin nombre');
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [proveedores, clientes]);

  const presupuestosDisponibles = useMemo(() => {
    return (presupuestos || []).filter(p => {
      if (!formDataMov.obra_id) return false;
      const pObraId = String(p.obra_id || p.Obra_id || p.obraId || '');
      const estado = String(p.estado || p.Estado || '').toLowerCase();
      return pObraId === String(formDataMov.obra_id) && (estado.includes('aprobad') || estado === 'activo' || estado === '');
    });
  }, [presupuestos, formDataMov.obra_id]);

  const rubrosDelPresupuesto = useMemo(() => {
    if (!formDataMov.presupuesto_id) return [];
    const presu = (presupuestos || []).find(p => String(p.id || p.ID) === String(formDataMov.presupuesto_id));
    if (!presu) return [];
    const raw = presu.items_detalle || presu.Items_detalle || '';
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const listaRubros = parsed.rubros || parsed.Rubros || [];
      return listaRubros.map(r => r.rubro || r.Rubro || r.nombre || r.Nombre).filter(Boolean);
    } catch {
      return [];
    }
  }, [presupuestos, formDataMov.presupuesto_id]);

  const gastosGeneralesConceptos = useMemo(() => {
    if (!formDataMov.presupuesto_id) return [];
    const presu = (presupuestos || []).find(p => String(p.id || p.ID) === String(formDataMov.presupuesto_id));
    if (!presu) return [];
    const raw = presu.items_detalle || presu.Items_detalle || '';
    if (!raw) return [];
    let parsed = raw;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { return []; }
    }
    const insumosGG = parsed?.comercial?.gastos_generales_insumos || [];
    if (!Array.isArray(insumosGG)) return [];
    return insumosGG.map(g => (g.concepto || g.Concepto || '').trim()).filter(Boolean);
  }, [presupuestos, formDataMov.presupuesto_id]);

  const totalRetencionesMov =
    Number(formDataMov.retencion_suss || 0) +
    Number(formDataMov.retencion_iva || 0) +
    Number(formDataMov.retencion_ganancias || 0) +
    Number(formDataMov.retencion_iibb_pba || 0) +
    Number(formDataMov.retencion_iibb_caba || 0);
  const montoNetoEfectivo = Math.max(0, Number(formDataMov.monto || 0) - totalRetencionesMov);

  const movimientosFiltrados = useMemo(() => {
    return (movimientos || []).filter(m => {
      const concepto = String(m.concepto || m.Concepto || '').toLowerCase();
      const ref = String(m.referencia || m.Referencia || '').toLowerCase();
      const matchTexto = concepto.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
      let matchProveedor = true;
      if (filtroProveedorMovimientos) {
        const prov = (proveedores || []).find(p => String(p.id || p.ID) === String(filtroProveedorMovimientos));
        const nombreProv = prov ? (prov.razon_social || prov.nombre || '').toLowerCase() : '';
        matchProveedor = concepto.includes(nombreProv);
      }
      let matchTipo = true;
      if (filtroTipoMovimiento) {
        const tipoMov = String(m.tipo || m.Tipo || '').toLowerCase().replace(/o$/, 'a');
        matchTipo = tipoMov === filtroTipoMovimiento.toLowerCase().replace(/o$/, 'a');
      }
      let matchOrigen = true;
      if (filtroOrigen) matchOrigen = inferirOrigenMovimiento(m) === filtroOrigen;
      return matchTexto && matchProveedor && matchTipo && matchOrigen;
    });
  }, [movimientos, searchTerm, filtroProveedorMovimientos, filtroTipoMovimiento, filtroOrigen, proveedores]);

  const retencionesFiltradas = useMemo(() => {
    return (retenciones || []).filter(r => {
      if (filtroTipoRetencion && r.tipo !== filtroTipoRetencion) return false;
      if (filtroClienteRetencion) {
        const match = String(r.cliente_id) === String(filtroClienteRetencion) || String(r.proveedor_id) === String(filtroClienteRetencion);
        if (!match) return false;
      }
      return true;
    });
  }, [retenciones, filtroTipoRetencion, filtroClienteRetencion]);

  const facturasAPagar = useMemo(() => {
    return (facturasCompras || []).filter(f => {
      const estado = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
      if (estado === 'anulada') return false;
      const esPendiente = estado === 'pendiente' || estado === 'pagado parcial' || estado === 'a asignar';
      const provId = String(f.proveedor_id || f.Proveedor_id || '');
      const matchProv = !filtroProveedorPagar || provId === String(filtroProveedorPagar);
      return esPendiente && matchProv;
    });
  }, [facturasCompras, filtroProveedorPagar]);

  const facturasACobrar = useMemo(() => {
    return (facturasVentas || []).filter(f => {
      const estado = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
      if (estado === 'anulada') return false;
      if (f.es_nota_credito === true || f.es_nota_debito === true) return false;
      if (estado !== 'pendiente' && estado !== 'pagado parcial') return false;
      if (filtroClienteCobrar && String(f.cliente_id || f.Cliente_id) !== String(filtroClienteCobrar)) return false;
      return true;
    });
  }, [facturasVentas, filtroClienteCobrar]);

  // KPIs
  const totalIngresos = (movimientos || [])
    .filter(m => String(m.tipo || m.Tipo || '').toLowerCase() === 'ingreso')
    .reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const totalEgresos = (movimientos || [])
    .filter(m => String(m.tipo || m.Tipo || '').toLowerCase() === 'egreso')
    .reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const balance = totalIngresos - totalEgresos;

  const totalFacturasAPagar = facturasAPagar.reduce((acc, f) => acc + (Number(f.total || f.Total || 0) || 0), 0);
  const totalFacturasACobrar = facturasACobrar.reduce((acc, f) => acc + (Number(f.total || f.Total || 0) || 0), 0);
  const flujoNetoPendiente = totalFacturasACobrar - totalFacturasAPagar;

  // Cash flow
  const { listaMensual, listaAnual } = useMemo(() => {
    const mensualMap = {};
    const anualMap = {};
    (movimientos || []).forEach(m => {
      const fecha = m.fecha || m.Fecha;
      if (!fecha) return;
      const mesAnio = String(fecha).substring(0, 7);
      const anio = String(fecha).substring(0, 4);
      const tipo = String(m.tipo || m.Tipo || '').toLowerCase().replace(/o$/, 'a');
      const monto = Number(m.monto || m.Monto) || 0;
      if (tipo === 'anulada') return;
      if (!mensualMap[mesAnio]) mensualMap[mesAnio] = { ingresos: 0, egresos: 0 };
      if (!anualMap[anio]) anualMap[anio] = { ingresos: 0, egresos: 0 };
      if (tipo === 'ingreso' || tipo === 'contabilizada') {
        mensualMap[mesAnio].ingresos += monto;
        anualMap[anio].ingresos += monto;
      } else if (tipo === 'egreso') {
        mensualMap[mesAnio].egresos += monto;
        anualMap[anio].egresos += monto;
      }
    });
    return {
      listaMensual: Object.keys(mensualMap).sort().map(k => ({ periodo: k, ...mensualMap[k] })),
      listaAnual: Object.keys(anualMap).sort().map(k => ({ periodo: k, ...anualMap[k] })),
    };
  }, [movimientos]);

  // IVA
  const totalIvaCompras = (facturasCompras || []).reduce((acc, f) => {
    const estado = String(f.estado_pago || '').toLowerCase();
    const esNC = f.es_nota_credito === true || String(f.tipo_comprobante || '').toUpperCase().includes('NOTA DE CREDITO');
    if (estado === 'anulada' || esNC) return acc;
    return acc + Number(f.iva_21 || f.iva21 || 0) + Number(f.iva_105 || f.iva105 || 0);
  }, 0);

  const totalIvaVentas = useMemo(() => {
    const unicas = new Map();
    (facturasVentas || []).forEach(f => {
      const estado = String(f.estado_pago || '').toLowerCase();
      const esNC = f.es_nota_credito === true || String(f.tipo_comprobante || '').toUpperCase().includes('NOTA DE CREDITO');
      if (estado === 'anulada' || esNC) return;
      const pv = String(f.punto_venta || '').padStart(5, '0');
      const nc = String(f.numero_comp || '').padStart(8, '0');
      const key = `${pv}-${nc}`;
      if (!unicas.has(key)) unicas.set(key, f);
    });
    return Array.from(unicas.values()).reduce(
      (acc, f) => acc + Number(f.iva_21 || f.iva21 || 0) + Number(f.iva_105 || f.iva105 || 0),
      0
    );
  }, [facturasVentas]);

  const totalRetencionesIva = (movimientos || []).reduce(
    (acc, m) => acc + Number(m.retencion_iva || m.Retencion_iva || 0),
    0
  );
  const posicionIva = totalIvaVentas - totalIvaCompras - totalRetencionesIva;

  // ────────────────────────────────────────────────────────
  // Handlers: Movimientos
  // ────────────────────────────────────────────────────────

  const abrirNuevoMovimiento = () => {
    setEditingMovId(null);
    setFormDataMov(FORM_DATA_MOV_INICIAL());
    setIsModalMovOpen(true);
  };

  const handleEditarMovimiento = (m) => {
    setEditingMovId(m.id || m.ID);
    let facturasAplicadas = [{ id: Date.now(), factura_id: '', monto: 0 }];
    const faRaw = m.facturas_aplicadas || m.Facturas_aplicadas;
    if (faRaw) {
      try {
        const parsed = typeof faRaw === 'string' ? JSON.parse(faRaw) : faRaw;
        if (Array.isArray(parsed) && parsed.length > 0) facturasAplicadas = parsed;
      } catch { /* noop */ }
    }
    const bruto = Number(m.monto || 0) +
      Number(m.retencion_suss || 0) +
      Number(m.retencion_iva || 0) +
      Number(m.retencion_ganancias || 0) +
      Number(m.retencion_iibb_pba || 0) +
      Number(m.retencion_iibb_caba || 0);
    setFormDataMov({
      tipo: m.tipo || 'Egreso',
      fecha: formatearFechaParaInput(m.fecha) || new Date().toISOString().split('T')[0],
      concepto: m.concepto || '',
      monto: bruto > 0 ? bruto : Number(m.monto || 0),
      obra_id: m.obra_id || '',
      presupuesto_id: m.presupuesto_id || '',
      contrato_id: m.contrato_id || '',
      rubro_imputacion: m.rubro_imputacion || '',
      tipo_insumo: m.tipo_insumo || 'Materiales',
      medio_pago: m.medio_pago || 'transferencia',
      referencia: m.referencia || '',
      retencion_suss: Number(m.retencion_suss || 0),
      retencion_iva: Number(m.retencion_iva || 0),
      retencion_ganancias: Number(m.retencion_ganancias || 0),
      retencion_iibb_pba: Number(m.retencion_iibb_pba || 0),
      retencion_iibb_caba: Number(m.retencion_iibb_caba || 0),
      facturas_aplicadas: facturasAplicadas,
    });
    setIsModalMovOpen(true);
  };

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    if (isSavingMov) return;
    setIsSavingMov(true);
    const toastId = toast.loading('Guardando movimiento...');
    try {
      await guardarMovimientoTesoreria({
        formData: formDataMov,
        editingId: editingMovId,
        montoNetoEfectivo,
        retencionesExistentes: retenciones,
        facturasCompras,
        facturasVentas,
        proveedores,
        clientes,
      });
      setIsModalMovOpen(false);
      toast.success('Movimiento guardado correctamente', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsSavingMov(false);
    }
  };

  const handleEliminarMovimiento = async (m) => {
    const id = m.id || m.ID;
    if (!id) return;
    if (!window.confirm('¿Estás seguro de eliminar este movimiento?')) return;
    const toastId = toast.loading('Eliminando movimiento...');
    try {
      const retsAsociadas = (retenciones || []).filter(r => String(r.tesoreria_id) === String(id));
      await eliminarMovimientoTesoreria(id, retsAsociadas);
      toast.success('Movimiento eliminado', { id: toastId });
    } catch (err) {
      toast.error('Error al eliminar: ' + (err.message || ''), { id: toastId });
    }
  };

  const handleAgregarFacturaFila = () => {
    setFormDataMov(prev => ({
      ...prev,
      facturas_aplicadas: [...prev.facturas_aplicadas, { id: Date.now(), factura_id: '', monto: 0 }],
    }));
  };

  const handleCambiarFacturaFila = (id, campo, valor) => {
    const nuevas = formDataMov.facturas_aplicadas.map(item => {
      if (item.id !== id) return item;
      const actualizado = { ...item, [campo]: valor };
      if (campo === 'factura_id') {
        const esIngreso = String(formDataMov.tipo).toLowerCase() === 'ingreso';
        const lista = esIngreso ? facturasVentas : facturasCompras;
        const fac = lista.find(f => String(f.id || f.ID) === String(valor));
        if (fac) actualizado.monto = Number(fac.total || fac.Total || 0);
      }
      return actualizado;
    });
    const suma = nuevas.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
    setFormDataMov(prev => ({
      ...prev,
      facturas_aplicadas: nuevas,
      monto: suma > 0 ? suma : prev.monto,
    }));
  };

  const handleQuitarFacturaFila = (id) => {
    const nuevas = formDataMov.facturas_aplicadas.filter(i => i.id !== id);
    const suma = nuevas.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
    setFormDataMov(prev => ({ ...prev, facturas_aplicadas: nuevas, monto: suma }));
  };

  // ────────────────────────────────────────────────────────
  // Handlers: Facturas a pagar
  // ────────────────────────────────────────────────────────

  const handlePagarFacturaCompra = (f) => {
    const prov = (proveedores || []).find(p => String(p.id || p.ID) === String(f.proveedor_id || f.Proveedor_id));
    const monto = Number(f.total || f.Total || 0);
    setEditingMovId(null);
    setFormDataMov({
      ...FORM_DATA_MOV_INICIAL(),
      tipo: 'Egreso',
      concepto: `Pago Factura ${f.codigo || f.n_factura || ''} - ${prov?.razon_social || prov?.nombre || ''}`,
      monto,
      obra_id: f.obra_id || '',
      presupuesto_id: f.presupuesto_id || '',
      contrato_id: f.contrato_id || '',
      rubro_imputacion: f.rubro_imputacion || '',
      tipo_insumo: f.tipo_insumo || 'Materiales',
      facturas_aplicadas: [{ id: Date.now(), factura_id: f.id || f.ID, monto }],
    });
    setIsModalMovOpen(true);
  };

  const handleContabilizarNC = async (f) => {
    if (!window.confirm(
      '¿Contabilizar esta Nota de Crédito?\n\n' +
      'Se va a crear un movimiento contable con el monto en negativo. ' +
      'Esto afectará los totales de compras e IVA.'
    )) return;
    const toastId = toast.loading('Contabilizando NC...');
    try {
      const concepto = await contabilizarNCCompra(f, proveedores);
      toast.success(`NC contabilizada: ${concepto}`, { id: toastId });
    } catch (err) {
      toast.error('Error: ' + (err.message || ''), { id: toastId });
    }
  };

  // ────────────────────────────────────────────────────────
  // Handlers: Facturas a cobrar
  // ────────────────────────────────────────────────────────

  const handleCobrarFacturaVenta = (f) => {
    const cli = (clientes || []).find(c => String(c.id || c.ID) === String(f.cliente_id || f.Cliente_id));
    const monto = Number(f.total || f.Total || 0);
    setEditingMovId(null);
    setFormDataMov({
      ...FORM_DATA_MOV_INICIAL(),
      tipo: 'Ingreso',
      concepto: `Cobro ${f.tipo_comprobante || 'Factura'} N° ${f.numero_comp || ''} - ${cli?.razon_social || cli?.nombre || ''}`,
      monto,
      obra_id: f.obra_id || '',
      presupuesto_id: f.presupuesto_id || '',
      contrato_id: f.contrato_id || '',
      rubro_imputacion: f.rubro_imputacion || '',
      tipo_insumo: f.tipo_insumo || 'Materiales',
      facturas_aplicadas: [{ id: Date.now(), factura_id: f.id || f.ID, monto }],
    });
    setIsModalMovOpen(true);
  };

  const handleEditarFacturaVenta = (f) => {
    setEditingVentaId(f.id || f.ID);
    let items = [{ id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }];
    try {
      const parsed = typeof f.items === 'string' ? JSON.parse(f.items) : f.items;
      if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
    } catch { /* noop */ }
    setFormDataVenta({
      ...FORM_DATA_VENTA_INICIAL(),
      tipo_comprobante: f.tipo_comprobante || 'FACTURA A',
      punto_venta: f.punto_venta || '00001',
      numero_comp: f.numero_comp || '',
      cliente_id: f.cliente_id || '',
      obra_id: f.obra_id || '',
      presupuesto_id: f.presupuesto_id || '',
      contrato_id: f.contrato_id || '',
      certificado_id: f.certificado_id || '',
      fecha_emision: formatearFechaParaInput(f.fecha_emision || f.fecha) || new Date().toISOString().split('T')[0],
      fecha_vencimiento: formatearFechaParaInput(f.fecha_vencimiento || f.vencimiento) || '',
      items,
      neto_gravado: Number(f.neto_gravado || 0),
      iva_21: Number(f.iva_21 || 0),
      iva_105: Number(f.iva_105 || 0),
      otros_tributos: Number(f.otros_tributos || 0),
      total: Number(f.total || 0),
      archivo_url: f.archivo_url || '',
      estado_pago: f.estado_pago || 'pendiente',
      comprobante_anula: f.comprobante_anula || '',
      es_nota_credito: f.es_nota_credito === true,
      es_nota_debito: f.es_nota_debito === true,
    });
    setArchivoBase64Venta('');
    setNombreArchivoVenta('');
    setCandidatosCliente([]);
    setNombreClienteOCR('');
    setPasoFacturaVenta('formulario');
    setIsModalVentaOpen(true);
  };

  const handleNuevaFacturaVenta = () => {
    setEditingVentaId(null);
    setFormDataVenta(FORM_DATA_VENTA_INICIAL());
    setArchivoBase64Venta('');
    setNombreArchivoVenta('');
    setCandidatosCliente([]);
    setNombreClienteOCR('');
    setPasoFacturaVenta('subir');
    setIsModalVentaOpen(true);
  };

  const procesarArchivoFacturaVenta = async (e) => {
    if (!GOOGLE_SCRIPT_URL) {
      toast.error('ERROR: GOOGLE_SCRIPT_URL no está configurada.');
      return;
    }
    const archivo = e.target.files[0];
    if (!archivo) return;
    setLeyendoFactura(true);
    setNombreArchivoVenta(archivo.name);

    const reader = new FileReader();
    reader.readAsDataURL(archivo);
    reader.onload = async () => {
      const base64Data = reader.result;
      setArchivoBase64Venta(base64Data);
      try {
        const data = await procesarFacturaVentaConIA({ base64: base64Data, mimeType: archivo.type });
        let clienteId = '';
        let candidatosFinales = [];
        const nombreBusqueda = data.cliente || data.proveedor || '';
        setNombreClienteOCR(nombreBusqueda);
        if (nombreBusqueda && (clientes || []).length > 0) {
          const { mejor, candidatos } = buscarMejorMatch(nombreBusqueda, clientes);
          if (mejor && candidatos.length === 1) clienteId = mejor.id || mejor.ID || '';
          else if (mejor && candidatos.length > 1) {
            candidatosFinales = candidatos;
            clienteId = mejor.id || mejor.ID || '';
          }
        }
        setCandidatosCliente(candidatosFinales);

        const nComp = data.n_factura || data.numero_factura || '';
        let pv = '00001';
        let nLimpio = nComp;
        if (nComp.includes('-')) {
          const partes = nComp.split('-');
          pv = partes[0].trim().padStart(5, '0');
          nLimpio = partes[1].trim();
        }
        const netoVal = Number(data.subtotal || data.neto) || 0;
        const ivaVal = Number(data.iva_21 || data.iva) || netoVal * 0.21;
        const iva105Val = Number(data.iva_105 || 0) || 0;
        const totalVal = Number(data.total) || netoVal + ivaVal + iva105Val;
        const tipoMapeado = mapearTipoComprobante(data.tipo_comprobante, data.tipo_factura, archivo.name || '');

        setFormDataVenta(prev => ({
          ...prev,
          tipo_comprobante: tipoMapeado,
          punto_venta: pv,
          numero_comp: nLimpio || prev.numero_comp,
          cliente_id: clienteId || prev.cliente_id,
          fecha_emision: formatearFechaParaInput(data.fecha) || prev.fecha_emision,
          fecha_vencimiento: formatearFechaParaInput(data.vencimiento) || prev.fecha_vencimiento,
          neto_gravado: netoVal || prev.neto_gravado,
          iva_21: ivaVal || prev.iva_21,
          iva_105: iva105Val || prev.iva_105,
          total: totalVal || prev.total,
          archivo_url: base64Data,
          comprobante_anula: data.comprobante_anula || prev.comprobante_anula,
          items: [{
            id: Date.now(),
            descripcion: (data.items && data.items[0]?.descripcion) || `Factura N° ${nLimpio || '---'}`,
            cantidad: 1,
            precio_unitario: netoVal || prev.neto_gravado,
            subtotal: netoVal || prev.neto_gravado,
          }],
        }));

        if (nombreBusqueda && !clienteId && candidatosFinales.length === 0) {
          setTimeout(() => {
            toast.error(`⚠️ El OCR detectó "${nombreBusqueda}" pero no se encontró. Creá el cliente primero.`);
          }, 100);
        }

        setPasoFacturaVenta('formulario');
      } catch (err) {
        toast.error('Error de IA: ' + (err.message || 'Error desconocido.'));
      } finally {
        setLeyendoFactura(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setLeyendoFactura(false);
      toast.error('Error al leer el archivo local.');
    };
  };

  const handleAgregarItem = () => {
    setFormDataVenta(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }],
    }));
  };

  const recalcular = (items) => {
    const neto = items.reduce((acc, i) => acc + (Number(i.subtotal) || 0), 0);
    const iva21 = neto * 0.21;
    const iva105 = Number(formDataVenta.iva_105 || 0);
    return { neto, iva21, iva105, total: neto + iva21 + iva105 + Number(formDataVenta.otros_tributos || 0) };
  };

  const handleCambiarItem = (id, campo, valor) => {
    const nuevos = formDataVenta.items.map(item => {
      if (item.id !== id) return item;
      const act = { ...item, [campo]: valor };
      if (campo === 'cantidad' || campo === 'precio_unitario') {
        const cant = campo === 'cantidad' ? Number(valor) || 0 : Number(item.cantidad) || 0;
        const precio = campo === 'precio_unitario' ? Number(valor) || 0 : Number(item.precio_unitario) || 0;
        act.subtotal = cant * precio;
      }
      return act;
    });
    const totales = recalcular(nuevos);
    setFormDataVenta(prev => ({
      ...prev,
      items: nuevos,
      neto_gravado: totales.neto,
      iva_21: totales.iva21,
      iva_105: totales.iva105,
      total: totales.total,
    }));
  };

  const handleQuitarItem = (id) => {
    const nuevos = formDataVenta.items.filter(i => i.id !== id);
    const totales = recalcular(nuevos);
    setFormDataVenta(prev => ({
      ...prev,
      items: nuevos,
      neto_gravado: totales.neto,
      iva_21: totales.iva21,
      iva_105: totales.iva105,
      total: totales.total,
    }));
  };

  const handleGuardarFacturaVenta = async (e) => {
    e.preventDefault();
    if (isSavingVenta) return;
    setIsSavingVenta(true);
    const toastId = toast.loading(editingVentaId ? 'Actualizando factura...' : 'Guardando factura...');
    try {
      // Modo edición: solo actualiza el doc
      if (editingVentaId) {
        let archivoUrlFinal = formDataVenta.archivo_url || '';
        if (archivoBase64Venta && archivoBase64Venta.startsWith('data:')) {
          archivoUrlFinal = await subirArchivoADrive(archivoBase64Venta, 'FacturasVenta');
        }
        await actualizarFacturaVenta(editingVentaId, {
          ...formDataVenta,
          archivo_url: archivoUrlFinal,
          items: formDataVenta.items,
        });
        setIsModalVentaOpen(false);
        toast.success('Factura actualizada', { id: toastId });
        return;
      }

      // Modo creación: flujo completo
      const { totalFinal, esNC, esND, anulacionFallida } = await crearFacturaVenta({
        formDataVenta,
        archivoBase64: archivoBase64Venta,
        facturasVentas,
      });

      if (anulacionFallida) {
        toast.error(`⚠️ NC guardada, pero no se pudo anular la factura original: ${anulacionFallida}`, { id: toastId, duration: 8000 });
      } else if (esNC) {
        toast.success(
          `Nota de Crédito registrada (total: $${Math.abs(totalFinal).toLocaleString('es-AR')}). Movimientos generados.`,
          { id: toastId, duration: 6000 }
        );
      } else if (esND) {
        toast.success(`Nota de Débito registrada (total: $${totalFinal.toLocaleString('es-AR')}).`, { id: toastId, duration: 6000 });
      } else {
        toast.success('Factura de Venta registrada correctamente.', { id: toastId });
      }

      setCandidatosCliente([]);
      setNombreClienteOCR('');
      setIsModalVentaOpen(false);
      setArchivoBase64Venta('');
      setNombreArchivoVenta('');
    } catch (err) {
      console.error(err);
      toast.error('Error: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsSavingVenta(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Handlers: Retenciones
  // ────────────────────────────────────────────────────────

  const handleSubirCertificadoRetencion = async (retencion, file) => {
    if (!file) return;
    const id = retencion.id || retencion.ID;
    if (!id) return;
    setSubiendoCertificadoId(id);
    const toastId = toast.loading('Subiendo certificado...');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await subirCertificadoRetencion(id, base64, file.name);
      toast.success('Certificado subido correctamente', { id: toastId });
    } catch (err) {
      toast.error('Error: ' + (err.message || ''), { id: toastId });
    } finally {
      setSubiendoCertificadoId(null);
    }
  };

  const handleEnviarRetencionesAlContador = async (e) => {
    e.preventDefault();
    if (!emailContador || emailContador.indexOf('@') === -1) return toast.error('Correo inválido.');
    if (retencionesFiltradas.length === 0) return toast.error('No hay retenciones para enviar.');
    setEnviandoRetenciones(true);
    try {
      const data = retencionesFiltradas.map(r => {
        const prov = (proveedores || []).find(p => String(p.id || p.ID) === String(r.proveedor_id));
        const cli = (clientes || []).find(c => String(c.id || c.ID) === String(r.cliente_id));
        const obra = (obras || []).find(o => String(o.id || o.ID) === String(r.obra_id));
        const presu = (presupuestos || []).find(p => String(p.id || p.ID) === String(r.presupuesto_id));
        return {
          fecha: r.fecha,
          tipo: r.tipo,
          monto: Number(r.monto || 0),
          comprobante_asociado: r.comprobante_asociado || '',
          certificado_url: r.certificado_url || '',
          certificado_nombre: r.certificado_nombre || '',
          tercero_nombre: prov?.razon_social || prov?.nombre || cli?.razon_social || cli?.nombre || '---',
          obra_nombre: obra ? `${obra.codigo || ''} ${obra.nombre || obra.nombre_obra || ''}`.trim() : '---',
          presupuesto_nombre: presu?.codigo || '---',
        };
      });

      await enviarRetencionesAlContador({
        email: emailContador,
        fechaDesde: filtroFechaDesde ? formatearFechaDisplay(filtroFechaDesde) : 'Inicio',
        fechaHasta: filtroFechaHasta ? formatearFechaDisplay(filtroFechaHasta) : 'Fin',
        retenciones: data,
      });
      toast.success('✅ Correo enviado con las retenciones.');
      setIsEnviarContadorOpen(false);
      setEmailContador('');
    } catch (err) {
      toast.error('Error al enviar: ' + (err.message || ''));
    } finally {
      setEnviandoRetenciones(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────

  const fechaInputs = (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Desde</span>
        <input
          type="date"
          value={filtroFechaDesde}
          onChange={(e) => setFiltroFechaDesde(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
        />
      </div>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Hasta</span>
        <input
          type="date"
          value={filtroFechaHasta}
          onChange={(e) => setFiltroFechaHasta(e.target.value)}
          className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tesorería</h1>
          <p className="text-slate-500 text-sm mt-1">Flujo de caja, IVA, retenciones y movimientos</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleNuevaFacturaVenta}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nueva Factura Venta
          </button>
          <button
            onClick={abrirNuevoMovimiento}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      {(movimientos.length === (filtroFechaDesde || filtroFechaHasta ? 500 : 100)) && (
        <div className="bg-amber-100 border border-amber-300 p-3 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Se alcanzó el límite máximo de movimientos. Ajustá el rango de fechas para ver más.</span>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Ingresos</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">$ {totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Egresos</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">$ {totalEgresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Balance</p>
          <h3 className={`text-2xl font-black mt-1 ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>$ {balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* KPIs pendientes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm">
          <p className="text-xs font-bold text-rose-600 uppercase">Facturas a Pagar</p>
          <h3 className="text-2xl font-black text-rose-600 mt-1">$ {totalFacturasAPagar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{facturasAPagar.length} pendiente{facturasAPagar.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase">Facturas a Cobrar</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">$ {totalFacturasACobrar.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          <p className="text-[11px] text-slate-500 mt-1">{facturasACobrar.length} pendiente{facturasACobrar.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Flujo Neto Pendiente</p>
          <h3 className={`text-2xl font-black mt-1 ${flujoNetoPendiente >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            $ {flujoNetoPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{flujoNetoPendiente >= 0 ? 'A favor' : 'A financiar'}</p>
        </div>
      </div>

      {/* Tabs + filtros contextuales */}
      <TabsTesoreria
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          facturasAPagar: facturasAPagar.length,
          facturasACobrar: facturasACobrar.length,
          retenciones: retenciones.length,
        }}
      >
        {activeTab === 'movimientos' && (
          <>
            {fechaInputs}
            <select
              value={filtroTipoMovimiento}
              onChange={(e) => setFiltroTipoMovimiento(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500"
            >
              <option value="">Todos los Tipos</option>
              <option value="Ingreso">Ingresos</option>
              <option value="Egreso">Egresos</option>
              <option value="contabilizada">Contabilizadas</option>
              <option value="anulada">Anuladas</option>
            </select>
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500"
            >
              <option value="">Todos los Orígenes</option>
              <option value="venta">Ventas</option>
              <option value="compra">Compras</option>
            </select>
            <div className="min-w-[180px]">
              <BuscadorSelect
                opciones={[{ id: '', label: 'Todos los Proveedores' }, ...opcionesProveedores]}
                value={filtroProveedorMovimientos}
                onChange={setFiltroProveedorMovimientos}
                placeholder="Todos los Proveedores"
                minChars={3}
              />
            </div>
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>
          </>
        )}

        {activeTab === 'facturas_pagar' && (
          <div className="w-full sm:w-72">
            <BuscadorSelect
              opciones={[{ id: '', label: 'Todos los Proveedores' }, ...opcionesProveedores]}
              value={filtroProveedorPagar}
              onChange={setFiltroProveedorPagar}
              placeholder="Todos los Proveedores"
              minChars={3}
            />
          </div>
        )}

        {activeTab === 'facturas_cobrar' && (
          <>
            {fechaInputs}
            <div className="w-full sm:w-72">
              <BuscadorSelect
                opciones={[{ id: '', label: 'Todos los Clientes' }, ...opcionesClientes]}
                value={filtroClienteCobrar}
                onChange={setFiltroClienteCobrar}
                placeholder="Todos los Clientes"
                minChars={3}
              />
            </div>
          </>
        )}

        {activeTab === 'retenciones' && (
          <>
            {fechaInputs}
            <div className="w-full sm:w-64">
              <BuscadorSelect
                opciones={[{ id: '', label: 'Todos los terceros' }, ...opcionesTerceros]}
                value={filtroClienteRetencion}
                onChange={setFiltroClienteRetencion}
                placeholder="Todos los terceros"
                minChars={3}
              />
            </div>
            <select
              value={filtroTipoRetencion}
              onChange={(e) => setFiltroTipoRetencion(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">Todos los tipos</option>
              <option value="SUSS">SUSS</option>
              <option value="IVA">IVA</option>
              <option value="Ganancias">Ganancias</option>
              <option value="IIBB PBA">IIBB PBA</option>
              <option value="IIBB CABA">IIBB CABA</option>
            </select>
            <button
              onClick={() => setIsEnviarContadorOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4" /> Enviar al Contador
            </button>
          </>
        )}
      </TabsTesoreria>

      {/* Contenido por tab */}
      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <TablaMovimientos
            movimientos={movimientosFiltrados}
            onEditar={handleEditarMovimiento}
            onEliminar={handleEliminarMovimiento}
          />
        </div>
      )}

      {activeTab === 'facturas_pagar' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <TablaFacturasPagar
            facturas={facturasAPagar}
            proveedores={proveedores}
            onPagar={handlePagarFacturaCompra}
            onContabilizarNC={handleContabilizarNC}
          />
        </div>
      )}

      {activeTab === 'facturas_cobrar' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <TablaFacturasCobrar
            facturas={facturasACobrar}
            clientes={clientes}
            obras={obras}
            onCobrar={handleCobrarFacturaVenta}
            onEditar={handleEditarFacturaVenta}
          />
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="space-y-8">
          <CashFlowTabla titulo="Cash Flow Mensual" filas={listaMensual} columnaPeriodo="Periodo (Mes)" />
          <CashFlowTabla titulo="Cash Flow Anual" filas={listaAnual} columnaPeriodo="Año" />
        </div>
      )}

      {activeTab === 'iva' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-rose-50/40 border border-rose-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-rose-700 uppercase">IVA Compras (CF)</p>
              <h3 className="text-2xl font-black text-rose-900 mt-2">$ {totalIvaCompras.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Crédito Fiscal</span>
            </div>
            <div className="bg-blue-50/40 border border-blue-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-blue-700 uppercase">IVA Ventas (DB)</p>
              <h3 className="text-2xl font-black text-blue-900 mt-2">$ {totalIvaVentas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Débito Fiscal</span>
            </div>
            <div className="bg-amber-50/40 border border-amber-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-amber-700 uppercase">Retenciones IVA</p>
              <h3 className="text-2xl font-black text-amber-900 mt-2">$ {totalRetencionesIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Pagos a cuenta sufridos</span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">Posición IVA</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-2">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">{posicionIva <= 0 ? 'A favor' : 'A pagar'}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">Cálculo: IVA Ventas – IVA Compras – Retenciones IVA</h4>
            <p className="text-xs text-slate-600 font-mono">
              $ {totalIvaVentas.toLocaleString('es-AR', { minimumFractionDigits: 2 })} – $ {totalIvaCompras.toLocaleString('es-AR', { minimumFractionDigits: 2 })} – $ {totalRetencionesIva.toLocaleString('es-AR', { minimumFractionDigits: 2 })} =
              <span className="font-bold text-emerald-600 ml-2">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ({posicionIva <= 0 ? 'A favor' : 'A pagar'})</span>
            </p>
          </div>
        </div>
      )}

      {activeTab === 'retenciones' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <TablaRetenciones
            retenciones={retencionesFiltradas}
            proveedores={proveedores}
            clientes={clientes}
            obras={obras}
            presupuestos={presupuestos}
            subiendoCertificadoId={subiendoCertificadoId}
            onSubirCertificado={handleSubirCertificadoRetencion}
          />
        </div>
      )}

      {/* Modales */}
      <ModalMovimiento
        isOpen={isModalMovOpen}
        onClose={() => setIsModalMovOpen(false)}
        onSubmit={handleGuardarMovimiento}
        formData={formDataMov}
        setFormData={setFormDataMov}
        isSaving={isSavingMov}
        editingId={editingMovId}
        obras={obras}
        contratos={contratos}
        presupuestosDisponibles={presupuestosDisponibles}
        rubrosDelPresupuesto={rubrosDelPresupuesto}
        gastosGeneralesConceptos={gastosGeneralesConceptos}
        facturasVenta={facturasVentas}
        facturasCompra={facturasCompras}
        clientes={clientes}
        proveedores={proveedores}
        totalRetenciones={totalRetencionesMov}
        montoNetoEfectivo={montoNetoEfectivo}
        onAgregarFacturaFila={handleAgregarFacturaFila}
        onCambiarFacturaFila={handleCambiarFacturaFila}
        onQuitarFacturaFila={handleQuitarFacturaFila}
      />

      <ModalFacturaVenta
        isOpen={isModalVentaOpen}
        onClose={() => setIsModalVentaOpen(false)}
        onSubmit={handleGuardarFacturaVenta}
        paso={pasoFacturaVenta}
        setPaso={setPasoFacturaVenta}
        leyendoFactura={leyendoFactura}
        onSubirArchivo={procesarArchivoFacturaVenta}
        formDataVenta={formDataVenta}
        setFormDataVenta={setFormDataVenta}
        archivoBase64Venta={archivoBase64Venta}
        setArchivoBase64Venta={setArchivoBase64Venta}
        nombreArchivoVenta={nombreArchivoVenta}
        setNombreArchivoVenta={setNombreArchivoVenta}
        isSavingVenta={isSavingVenta}
        editingId={editingVentaId}
        clientes={clientes}
        obras={obras}
        presupuestos={presupuestos}
        contratos={contratos}
        certificados={certificados}
        candidatosCliente={candidatosCliente}
        nombreClienteOCR={nombreClienteOCR}
        onAgregarItem={handleAgregarItem}
        onCambiarItem={handleCambiarItem}
        onQuitarItem={handleQuitarItem}
      />

      <ModalEnviarContador
        isOpen={isEnviarContadorOpen}
        onClose={() => setIsEnviarContadorOpen(false)}
        onSubmit={handleEnviarRetencionesAlContador}
        emailContador={emailContador}
        setEmailContador={setEmailContador}
        enviando={enviandoRetenciones}
        cantidadItems={retencionesFiltradas.length}
        filtroDesde={filtroFechaDesde}
        filtroHasta={filtroFechaHasta}
        formatearFechaDisplay={formatearFechaDisplay}
        tipo="retenciones"
      />
    </div>
  );
}