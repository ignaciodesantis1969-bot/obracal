import React, { useState } from 'react';
import { Plus, Calendar, FileText, Paperclip, Edit2, Trash2, X, Upload, AlertCircle, CheckCircle2, Loader2, ShoppingCart, Search } from 'lucide-react';

export default function Compras({ 
  GOOGLE_SCRIPT_URL, 
  facturas = [], 
  ordenesCompra = [], 
  proveedores = [], 
  obras = [], 
  presupuestos = [], 
  insumosList = [], 
  cargarDatos 
}) {
  const [activeTab, setActiveTab] = useState('facturas');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // Modales Facturas
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Modales Órdenes de Compra (OC)
  const [isOcModalOpen, setIsOcModalOpen] = useState(false);
  const [editingOcId, setEditingOcId] = useState(null);

  const [localLoading, setLocalLoading] = useState(false);

  // Estado para buscador rápido de insumos dentro de la factura
  const [busquedaInsumoTerm, setBusquedaInsumoTerm] = useState('');

  // Formulario Factura
  const [formData, setFormData] = useState({
    codigo: 'FAC-0001',
    tipo: 'Compra',
    comprobante_tipo: 'Factura A',
    n_factura: '',
    proveedor_id: '',
    obra_id: '',
    presupuesto_id: '',
    fecha: new Date().toISOString().split('T')[0],
    vencimiento: '',
    estado_pago: 'pendiente',
    subtotal: 0,
    iva_21: 0,
    iva_105: 0,
    persp_iibb_bsas: 0,
    persp_iibb_caba: 0,
    otros_impuestos: 0,
    total: 0,
    archivo_url: '',
    insumos_comprados: [
      { id: Date.now(), insumo_id: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }
    ]
  });

  // Formulario Orden de Compra (OC)
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

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return '---';
    const partes = String(fechaStr).split('T')[0].split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return fechaStr;
  };

  // Función robusta adaptada al formato DD/MM/YYYY de Google Sheets para inputs HTML (YYYY-MM-DD)
  const formatearFechaParaInput = (fechaStr) => {
    if (!fechaStr) return '';
    const str = String(fechaStr).trim().split('T')[0];
    
    // Si viene en formato DD/MM/YYYY (ej: 24/07/2026)
    if (str.includes('/')) {
      const partes = str.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const anio = partes[2];
        return `${anio}-${mes}-${dia}`;
      }
    }
    
    // Si ya viene en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    return str;
  };

  const generarSiguienteCodigoFactura = () => {
    if (!facturas || facturas.length === 0) return 'FAC-0001';
    const maxNum = facturas.reduce((max, f) => {
      const codeStr = f.codigo || f.Codigo || f.CODIGO || '';
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
      const codeStr = oc.codigo || oc.Codigo || oc.CODIGO || '';
      const match = codeStr.match(/OC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `OC-${String(maxNum + 1).padStart(4, '0')}`;
  };

  // IA Factura
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
          try {
            data = JSON.parse(textoRespuesta);
          } catch (parseErr) {
            throw new Error("El servidor no devolvió un formato JSON válido.");
          }
          
          if (data.success && !data.error) {
            let proveedorEncontradoId = '';
            if (data.proveedor && proveedores.length > 0) {
              const provMatch = proveedores.find(p => 
                (p.razon_social && p.razon_social.toLowerCase().includes(data.proveedor.toLowerCase())) ||
                (p.nombre && p.nombre.toLowerCase().includes(data.proveedor.toLowerCase()))
              );
              if (provMatch) proveedorEncontradoId = provMatch.id || provMatch.ID || provMatch.Id;
            }

            setFormData(prev => ({
              ...prev,
              n_factura: data.n_factura || data.numero_factura || data.nro_factura || prev.n_factura,
              proveedor_id: proveedorEncontradoId || prev.proveedor_id,
              fecha: formatearFechaParaInput(data.fecha || data.Fecha || data.FECHA) || prev.fecha,
              vencimiento: formatearFechaParaInput(data.vencimiento || data.Vencimiento || data.VENCIMIENTO) || prev.vencimiento,
              subtotal: Number(data.subtotal) || prev.subtotal,
              iva_21: Number(data.iva_21) || prev.iva_21,
              iva_105: Number(data.iva_105) || prev.iva_105,
              persp_iibb_bsas: Number(data.persp_iibb_bsas) || prev.persp_iibb_bsas,
              persp_iibb_caba: Number(data.persp_iibb_caba) || prev.persp_iibb_caba,
              otros_impuestos: Number(data.otros_impuestos) || prev.otros_impuestos,
              total: Number(data.total) || prev.total,
              archivo_url: base64Data
            }));
            setIsUploadModalOpen(false);
            setIsFacturaModalOpen(true);
          } else {
            alert("Error de IA: " + (data.error || "No se pudieron extraer los datos."));
          }
        } catch (fetchErr) {
          console.error("Error en el fetch:", fetchErr);
          alert("Error de conexión con el servidor.");
        } finally {
          setLocalLoading(false);
          e.target.value = "";
        }
      };

      reader.onerror = () => {
        setLocalLoading(false);
        alert("Error al leer el archivo local.");
      };

    } catch (err) {
      setLocalLoading(false);
      alert("Error inesperado: " + err.message);
    }
  };

  const handleVerArchivo = (archivoUrl) => {
    if (!archivoUrl) {
      alert("No hay archivo adjunto.");
      return;
    }
    if (archivoUrl.startsWith('data:')) {
      const win = window.open();
      win.document.write(`<iframe src="${archivoUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
    } else {
      alert("Archivo adjunto: " + archivoUrl);
    }
  };

  const handleEditarFacturaClick = (f) => {
    const realId = f.id || f.ID || f.Id;
    setEditingId(realId);
    
    let insumosParseados = [];
    const rawInsumos = f.insumos_comprados || f.Insumos_comprados || f.INSUMOS_COMPRADOS;
    try {
      if (typeof rawInsumos === 'string') {
        insumosParseados = JSON.parse(rawInsumos);
      } else if (Array.isArray(rawInsumos)) {
        insumosParseados = rawInsumos;
      }
    } catch (err) {
      insumosParseados = [];
    }

    if (!Array.isArray(insumosParseados) || insumosParseados.length === 0) {
      insumosParseados = [{ id: Date.now(), insumo_id: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }];
    }

    const fechaCruda = f.fecha || f.Fecha || f.FECHA;
    const vencCrudo = f.vencimiento || f.Vencimiento || f.VENCIMIENTO;

    setFormData({ 
      ...f, 
      fecha: formatearFechaParaInput(fechaCruda),
      vencimiento: formatearFechaParaInput(vencCrudo),
      insumos_comprados: insumosParseados 
    });
    setIsFacturaModalOpen(true);
  };

  const handleAgregarInsumoComprado = (insumoPreseleccionado = null) => {
    setFormData(prev => ({
      ...prev,
      insumos_comprados: [
        ...prev.insumos_comprados,
        { 
          id: Date.now(), 
          insumo_id: insumoPreseleccionado ? (insumoPreseleccionado.id || insumoPreseleccionado.ID || insumoPreseleccionado.Id) : '', 
          cantidad: 1, 
          unidad: insumoPreseleccionado ? (insumoPreseleccionado.unidad || 'unidad') : 'unidad', 
          p_unitario: insumoPreseleccionado ? Number(insumoPreseleccionado.costo_unitario || insumoPreseleccionado.precio || 0) : 0, 
          total: insumoPreseleccionado ? Number(insumoPreseleccionado.costo_unitario || insumoPreseleccionado.precio || 0) : 0 
        }
      ]
    }));
  };

  const handleCambiarInsumoComprado = (id, campo, valor) => {
    const nuevos = formData.insumos_comprados.map(item => {
      if (item.id === id) {
        let actualizado = { ...item, [campo]: valor };
        
        if (campo === 'insumo_id') {
          const insEncontrado = insumosList.find(i => String(i.id || i.ID || i.Id) === String(valor));
          if (insEncontrado) {
            actualizado.p_unitario = Number(insEncontrado.costo_unitario || insEncontrado.precio || 0);
            actualizado.unidad = insEncontrado.unidad || 'unidad';
            actualizado.total = (Number(actualizado.cantidad) || 0) * Number(actualizado.p_unitario);
          }
        }

        if (campo === 'cantidad' || campo === 'p_unitario') {
          actualizado.total = (Number(actualizado.cantidad) || 0) * (Number(actualizado.p_unitario) || 0);
        }
        return actualizado;
      }
      return item;
    });

    const nuevoSubtotal = nuevos.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const nuevoIva = nuevoSubtotal * 0.21;
    const nuevoTotal = nuevoSubtotal + nuevoIva + Number(formData.iva_105 || 0) + Number(formData.persp_iibb_bsas || 0) + Number(formData.persp_iibb_caba || 0) + Number(formData.otros_impuestos || 0);

    setFormData(prev => ({
      ...prev,
      insumos_comprados: nuevos,
      subtotal: nuevoSubtotal,
      iva_21: nuevoIva,
      total: nuevoTotal
    }));
  };

  const handleQuitarInsumoComprado = (id) => {
    const nuevos = formData.insumos_comprados.filter(i => i.id !== id);
    const nuevoSubtotal = nuevos.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const nuevoIva = nuevoSubtotal * 0.21;
    const nuevoTotal = nuevoSubtotal + nuevoIva + Number(formData.iva_105 || 0) + Number(formData.persp_iibb_bsas || 0) + Number(formData.persp_iibb_caba || 0) + Number(formData.otros_impuestos || 0);
    setFormData(prev => ({
      ...prev,
      insumos_comprados: nuevos,
      subtotal: nuevoSubtotal,
      iva_21: nuevoIva,
      total: nuevoTotal
    }));
  };

  const handleGuardarFactura = async (e) => {
    e.preventDefault();
    try {
      const action = editingId ? 'update' : 'create';
      const codigoFinal = editingId ? formData.codigo : generarSiguienteCodigoFactura();
      
      let urlLimpia = formData.archivo_url;
      if (urlLimpia && urlLimpia.startsWith('data:')) {
        urlLimpia = "Comprobante_Adjunto"; 
      }

      const payloadData = {
        ...formData,
        codigo: codigoFinal,
        archivo_url: urlLimpia,
        insumos_comprados: JSON.stringify(formData.insumos_comprados)
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
      try {
        data = JSON.parse(textoRespuesta);
      } catch (parseErr) {
        console.error("Respuesta no JSON:", textoRespuesta);
        alert("Error del servidor: " + textoRespuesta.substring(0, 150));
        return;
      }

      if (data.success || data.id) {
        setIsFacturaModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar factura: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar factura: " + err.message);
    }
  };

  const handleEliminarFactura = async (f) => {
    const facturaId = f.id || f.ID || f.Id;
    if (!facturaId) {
      alert("⚠️ Error: No se pudo identificar el ID de esta factura.");
      return;
    }
    if (!window.confirm("¿Estás seguro de eliminar esta factura?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          tabla: 'Facturas', 
          action: 'delete', 
          id: facturaId 
        })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        cargarDatos();
      } else {
        alert("No se pudo eliminar la factura: " + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al intentar eliminar la factura.");
    }
  };

  // Handlers para Órdenes de Compra (OC)
  const handleAgregarInsumoOc = () => {
    setFormDataOc(prev => ({
      ...prev,
      insumos_oc: [
        ...prev.insumos_oc,
        { id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }
      ]
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
    const nuevoIva = nuevoSubtotal * 0.21;
    const nuevoTotal = nuevoSubtotal + nuevoIva;

    setFormDataOc(prev => ({
      ...prev,
      insumos_oc: nuevos,
      subtotal: nuevoSubtotal,
      iva_21: nuevoIva,
      total: nuevoTotal
    }));
  };

  const handleQuitarInsumoOc = (id) => {
    const nuevos = formDataOc.insumos_oc.filter(i => i.id !== id);
    const nuevoSubtotal = nuevos.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const nuevoIva = nuevoSubtotal * 0.21;
    const nuevoTotal = nuevoSubtotal + nuevoIva;
    setFormDataOc(prev => ({
      ...prev,
      insumos_oc: nuevos,
      subtotal: nuevoSubtotal,
      iva_21: nuevoIva,
      total: nuevoTotal
    }));
  };

  const handleEditarOcClick = (oc) => {
    const realId = oc.id || oc.ID || oc.Id;
    setEditingOcId(realId);
    let insumosParseados = [];
    const rawInsumos = oc.insumos_oc || oc.Insumos_oc || oc.INSUMOS_OC;
    try {
      if (typeof rawInsumos === 'string') {
        insumosParseados = JSON.parse(rawInsumos);
      } else if (Array.isArray(rawInsumos)) {
        insumosParseados = rawInsumos;
      }
    } catch (err) {
      insumosParseados = [];
    }

    if (!Array.isArray(insumosParseados) || insumosParseados.length === 0) {
      insumosParseados = [{ id: Date.now(), descripcion: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }];
    }

    const fechaCruda = oc.fecha || oc.Fecha || oc.FECHA;
    const entregaCruda = oc.fecha_entrega || oc.Fecha_entrega || oc.FECHA_ENTREGA;

    setFormDataOc({ 
      ...oc, 
      fecha: formatearFechaParaInput(fechaCruda),
      fecha_entrega: formatearFechaParaInput(entregaCruda),
      insumos_oc: insumosParseados 
    });
    setIsOcModalOpen(true);
  };

  const handleGuardarOc = async (e) => {
    e.preventDefault();
    try {
      const action = editingOcId ? 'update' : 'create';
      const codigoFinal = editingOcId ? formDataOc.codigo : generarSiguienteCodigoOc();

      const payloadData = {
        ...formDataOc,
        codigo: codigoFinal,
        insumos_oc: JSON.stringify(formDataOc.insumos_oc)
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'OrdenesCompra',
          action: action,
          id: editingOcId,
          data: payloadData
        })
      });
      const textoRespuesta = await res.text();
      let data;
      try {
        data = JSON.parse(textoRespuesta);
      } catch (parseErr) {
        alert("Error del servidor: " + textoRespuesta.substring(0, 150));
        return;
      }
      if (data.success || data.id) {
        setIsOcModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar Orden de Compra: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar OC.");
    }
  };

  const handleEliminarOc = async (oc) => {
    const ocId = oc.id || oc.ID || oc.Id;
    if (!ocId) {
      alert("⚠️ Error: No se pudo identificar el ID de esta Orden de Compra.");
      return;
    }
    if (!window.confirm("¿Estás seguro de eliminar esta Orden de Compra?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'OrdenesCompra', action: 'delete', id: ocId })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        cargarDatos();
      } else {
        alert("No se pudo eliminar la Orden de Compra.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const facturasFiltradas = facturas.filter(f => {
    const provId = f.proveedor_id || f.Proveedor_id || f.PROVEEDOR_ID;
    const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
    const fFecha = f.fecha || f.Fecha || f.FECHA;
    let matchFecha = true;
    if (filtroFechaDesde && fFecha && fFecha < filtroFechaDesde) matchFecha = false;
    if (filtroFechaHasta && fFecha && fFecha > filtroFechaHasta) matchFecha = false;
    return matchProveedor && matchFecha;
  });

  const ordenesFiltradas = ordenesCompra.filter(oc => {
    const provId = oc.proveedor_id || oc.Proveedor_id || oc.PROVEEDOR_ID;
    const matchProveedor = !filtroProveedor || String(provId) === String(filtroProveedor);
    const ocFecha = oc.fecha || oc.Fecha || oc.FECHA;
    let matchFecha = true;
    if (filtroFechaDesde && ocFecha && ocFecha < filtroFechaDesde) matchFecha = false;
    if (filtroFechaHasta && ocFecha && ocFecha > filtroFechaHasta) matchFecha = false;
    return matchProveedor && matchFecha;
  });

  const insumosFiltradosModal = insumosList.filter(ins => 
    String(ins.nombre || ins.Nombre || '').toLowerCase().includes(busquedaInsumoTerm.toLowerCase()) ||
    String(ins.codigo || ins.Codigo || '').toLowerCase().includes(busquedaInsumoTerm.toLowerCase())
  );

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
          }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm">
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
              fecha: new Date().toISOString().split('T')[0],
              vencimiento: '',
              estado_pago: 'pendiente',
              subtotal: 0,
              iva_21: 0,
              iva_105: 0,
              persp_iibb_bsas: 0,
              persp_iibb_caba: 0,
              otros_impuestos: 0,
              total: 0,
              archivo_url: '',
              insumos_comprados: [{ id: Date.now(), insumo_id: '', cantidad: 1, unidad: 'unidad', p_unitario: 0, total: 0 }]
            });
            setIsUploadModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm items-end">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Proveedor</label>
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500">
            <option value="">Todos los Proveedores</option>
            {proveedores.map(p => <option key={p.id || p.ID} value={p.id || p.ID}>{p.razon_social || p.nombre}</option>)}
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
        <button onClick={() => setActiveTab('ordenes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'ordenes' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Órdenes de Compra ({ordenesCompra.length})</button>
        <button onClick={() => setActiveTab('facturas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'facturas' ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>Facturas ({facturas.length})</button>
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
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
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-4 py-4">Presupuesto</th>
                  <th className="px-4 py-4">Fecha</th>
                  <th className="px-4 py-4 text-right">Total</th>
                  <th className="px-4 py-4 text-center">Pago</th>
                  <th className="px-4 py-4 text-center">Arch.</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasFiltradas.map((f, index) => {
                  const provId = f.proveedor_id || f.Proveedor_id || f.PROVEEDOR_ID;
                  const presId = f.presupuesto_id || f.Presupuesto_id || f.PRESUPUESTO_ID;
                  const prov = proveedores.find(p => String(p.id || p.ID) === String(provId));
                  const pres = presupuestos.find(pr => String(pr.id || pr.ID) === String(presId));
                  const totalVal = Number(f.total || f.Total || f.TOTAL) || 0;
                  const estadoPago = String(f.estado_pago || f.Estado_pago || f.ESTADO_PAGO || 'pendiente').toLowerCase();
                  
                  const numeroFacturaDisplay = f.n_factura || f.N_factura || f.N_FACTURA || f.numero_factura || f.nro_factura || '---';
                  const presupuestoDisplay = pres?.codigo || pres?.nombre || presId || '---';
                  const codigoDisplay = f.codigo || f.Codigo || f.CODIGO || `FAC-${String(index + 1).padStart(4, '0')}`;
                  const archivoLink = f.archivo_url || f.Archivo_url || f.ARCHIVOURI || f.archivo || '';
                  const fechaDisplay = f.fecha || f.Fecha || f.FECHA;

                  return (
                    <tr key={f.id || f.ID || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-600">{codigoDisplay}</td>
                      <td className="px-4 py-4 font-semibold text-slate-800">{numeroFacturaDisplay}</td>
                      <td className="px-4 py-4"><span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[10px]">{f.comprobante_tipo || f.Comprobante_tipo || f.COMPROBANTE_TIPO || 'Factura A'}</span></td>
                      <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || f.proveedor || 'Proveedor'}</td>
                      <td className="px-4 py-4 text-slate-600">{presupuestoDisplay}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(fechaDisplay)}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center"><span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoPago === 'pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{estadoPago}</span></td>
                      <td className="px-4 py-4 text-center">
                        {archivoLink ? (
                          <button 
                            type="button"
                            onClick={() => handleVerArchivo(archivoLink)} 
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center justify-center p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm" 
                            title="Ver comprobante adjunto"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditarFacturaClick(f)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarFactura(f)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  const provId = oc.proveedor_id || oc.Proveedor_id;
                  const obraId = oc.obra_id || oc.Obra_id;
                  const prov = proveedores.find(p => String(p.id || p.ID) === String(provId));
                  const obra = obras.find(o => String(o.id || o.ID) === String(obraId));
                  const totalVal = Number(oc.total || oc.Total || oc.TOTAL) || 0;
                  const estadoOc = String(oc.estado || oc.Estado || oc.ESTADO || 'pendiente').toLowerCase();
                  const codigoDisplay = oc.codigo || oc.Codigo || oc.CODIGO || `OC-${String(index + 1).padStart(4, '0')}`;
                  const fechaDisplay = oc.fecha || oc.Fecha || oc.FECHA;
                  const entregaDisplay = oc.fecha_entrega || oc.Fecha_entrega || oc.FECHA_ENTREGA;

                  return (
                    <tr key={oc.id || oc.ID || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-600">{codigoDisplay}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || 'Proveedor'}</td>
                      <td className="px-4 py-4 text-slate-600">{obra?.codigo ? `${obra.codigo} - ${obra.nombre || obra.nombre_obra}` : (obra?.nombre || '---')}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(fechaDisplay)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(entregaDisplay)}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoOc === 'aprobada' ? 'bg-emerald-100 text-emerald-800' : estadoOc === 'recibida' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                          {estadoOc}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditarOcClick(oc)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarOc(oc)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* MODAL NUEVA / EDITAR ORDEN DE COMPRA */}
      {isOcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingOcId ? 'Modificar Orden de Compra' : 'Nueva Orden de Compra'}</h3>
              <button onClick={() => setIsOcModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleGuardarOc} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra *</label>
                  <select required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formDataOc.obra_id} onChange={(e) => setFormDataOc({...formDataOc, obra_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {obras.map(o => <option key={o.id || o.ID} value={o.id || o.ID}>{o.codigo} - {o.nombre || o.nombre_obra}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor *</label>
                  <select required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500" value={formDataOc.proveedor_id} onChange={(e) => setFormDataOc({...formDataOc, proveedor_id: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={p.id || p.ID} value={p.id || p.ID}>{p.razon_social || p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formDataOc.fecha} onChange={(e) => setFormDataOc({...formDataOc, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Entrega</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formDataOc.fecha_entrega} onChange={(e) => setFormDataOc({...formDataOc, fecha_entrega: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase" value={formDataOc.estado} onChange={(e) => setFormDataOc({...formDataOc, estado: e.target.value})}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobada">Aprobada</option>
                    <option value="recibida">Recibida</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs uppercase text-slate-800">Items</h4>
                  <button type="button" onClick={handleAgregarInsumoOc} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors">
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
                          <td className="px-3 py-2">
                            <input type="text" placeholder="Descripción del item..." className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500" value={item.descripcion || ''} onChange={(e) => handleCambiarInsumoOc(item.id, 'descripcion', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-amber-500" value={item.cantidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'cantidad', e.target.value)} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" placeholder="unidad" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs uppercase font-semibold outline-none focus:border-amber-500" value={item.unidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'unidad', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500" value={item.p_unitario} onChange={(e) => handleCambiarInsumoOc(item.id, 'p_unitario', e.target.value)} />
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-900">$ {Number(item.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => handleQuitarInsumoOc(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-6 pt-2 text-xs font-bold text-slate-700">
                  <span>Subtotal: <span className="font-black text-slate-900">$ {Number(formDataOc.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></span>
                  <span>IVA 21%: <span className="font-black text-slate-900">$ {Number(formDataOc.iva_21 || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></span>
                  <span>Total: <span className="font-black text-amber-600">$ {Number(formDataOc.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsOcModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm">{editingOcId ? 'Actualizar OC' : 'Crear OC'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUBIR FACTURA CON IA */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nueva Factura — Subir comprobante</h3>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-8 text-center space-y-6">
              <p className="text-xs text-slate-500">Sube el archivo de la factura. La IA leerá automáticamente los datos.</p>
              <label className="border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block">
                {localLoading ? <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" /> : <Upload className="w-10 h-10 text-amber-500 mb-3" />}
                <span className="font-bold text-sm text-slate-800">{localLoading ? "Procesando con IA..." : "Sube el archivo de la factura"}</span>
                <span className="text-[11px] text-slate-500 mt-1">Extracción automática por Inteligencia Artificial</span>
                <input type="file" className="hidden" onChange={handleArchivoSubido} disabled={localLoading} />
              </label>
              <div className="flex justify-between items-center pt-2">
                <button onClick={() => setIsUploadModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                <button onClick={() => { setIsUploadModalOpen(false); setIsFacturaModalOpen(true); }} className="text-xs font-bold text-amber-600 hover:underline">Cargar sin comprobante</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR FACTURA */}
      {isFacturaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nueva Factura (Confirmación y Corrección de Datos)</h3>
              <button onClick={() => setIsFacturaModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleGuardarFactura} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Verifique y corrija los datos leídos por la IA antes de confirmar la creación.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Compra">Compra</option>
                    <option value="Gasto">Gasto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comprobante</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.comprobante_tipo} onChange={(e) => setFormData({...formData, comprobante_tipo: e.target.value})}>
                    <option value="Factura A">Factura A</option>
                    <option value="Factura B">Factura B</option>
                    <option value="Factura C">Factura C</option>
                    <option value="Ticket">Ticket</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">N° Factura</label>
                  <input type="text" required placeholder="Ej: 0012-00031628" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.n_factura} onChange={(e) => setFormData({...formData, n_factura: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor</label>
                  <select required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-amber-500" value={formData.proveedor_id} onChange={(e) => setFormData({...formData, proveedor_id: e.target.value})}>
                    <option value="">Seleccione proveedor...</option>
                    {proveedores.map(p => <option key={p.id || p.ID} value={p.id || p.ID}>{p.razon_social || p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.obra_id} onChange={(e) => setFormData({...formData, obra_id: e.target.value})}>
                    <option value="">Seleccione obra...</option>
                    {obras.map(o => <option key={o.id || o.ID} value={o.id || o.ID}>{o.codigo} - {o.nombre || o.nombre_obra}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Presupuesto</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.presupuesto_id} onChange={(e) => setFormData({...formData, presupuesto_id: e.target.value})}>
                    <option value="">Seleccione presupuesto...</option>
                    {presupuestos.map(pr => <option key={pr.id || pr.ID} value={pr.id || pr.ID}>{pr.codigo} - {pr.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vencimiento</label>
                  <input type="date" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.vencimiento} onChange={(e) => setFormData({...formData, vencimiento: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Estado Pago</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase" value={formData.estado_pago} onChange={(e) => setFormData({...formData, estado_pago: e.target.value})}>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subtotal ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.subtotal} onChange={(e) => setFormData({...formData, subtotal: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 21% ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.iva_21} onChange={(e) => setFormData({...formData, iva_21: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 10.5% ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.iva_105} onChange={(e) => setFormData({...formData, iva_105: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Persp. IIBB Bs.As. ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.persp_iibb_bsas} onChange={(e) => setFormData({...formData, persp_iibb_bsas: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Persp. IIBB CABA ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.persp_iibb_caba} onChange={(e) => setFormData({...formData, persp_iibb_caba: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Otros Impuestos ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-amber-500" value={formData.otros_impuestos} onChange={(e) => setFormData({...formData, otros_impuestos: e.target.value})} />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total ($)</label>
                  <input type="number" step="0.01" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-amber-600 outline-none focus:border-amber-500" value={formData.total} onChange={(e) => setFormData({...formData, total: e.target.value})} />
                </div>
              </div>

              {formData.archivo_url && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600"/> Comprobante adjunto cargado correctamente</span>
                </div>
              )}

              {/* SECCIÓN DE IMPUTACIÓN RÁPIDA DE INSUMOS */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-800">Insumos comprados (Imputación)</h4>
                    <p className="text-[11px] text-slate-500">Busca y selecciona los insumos rápidamente para asignarlos.</p>
                  </div>
                  
                  {/* Buscador Rápido de Insumos para Agregar */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Buscar insumo para agregar..."
                        value={busquedaInsumoTerm}
                        onChange={(e) => setBusquedaInsumoTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:border-amber-500"
                      />
                    </div>
                    {busquedaInsumoTerm && (
                      <button 
                        type="button" 
                        onClick={() => setBusquedaInsumoTerm('')} 
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {busquedaInsumoTerm && (
                  <div className="bg-slate-50 border border-amber-300 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1.5 shadow-sm">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block mb-1">Resultados de búsqueda ({insumosFiltradosModal.length}):</span>
                    {insumosFiltradosModal.length === 0 ? (
                      <div className="text-xs text-slate-400 italic py-1">No se encontraron insumos con ese nombre o código.</div>
                    ) : (
                      insumosFiltradosModal.map(ins => (
                        <div 
                          key={ins.id || ins.ID} 
                          onClick={() => {
                            handleAgregarInsumoComprado(ins);
                            setBusquedaInsumoTerm('');
                          }}
                          className="flex justify-between items-center bg-white hover:bg-amber-100/60 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{ins.nombre || ins.Nombre}</span>
                            <span className="text-slate-400 ml-2 font-mono text-[10px]">({ins.codigo || ins.Codigo || 'S/C'})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-amber-600 font-black">$ {Number(ins.costo_unitario || ins.Costo_unitario || ins.precio || ins.Precio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded font-bold text-[10px]">Agregar +</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <th className="px-3 py-2.5">Insumo</th>
                        <th className="px-3 py-2.5 w-24 text-center">Cant.</th>
                        <th className="px-3 py-2.5 w-28">Unidad</th>
                        <th className="px-3 py-2.5 w-32 text-right">P. Unit.</th>
                        <th className="px-3 py-2.5 w-32 text-right">Total</th>
                        <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(formData.insumos_comprados) && formData.insumos_comprados.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <select className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500" value={item.insumo_id} onChange={(e) => handleCambiarInsumoComprado(item.id, 'insumo_id', e.target.value)}>
                              <option value="">Seleccionar insumo...</option>
                              {insumosList.map(ins => <option key={ins.id || ins.ID} value={ins.id || ins.ID}>{ins.nombre || ins.Nombre} {ins.codigo ? `(${ins.codigo})` : ''}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center"><input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-amber-500" value={item.cantidad} onChange={(e) => handleCambiarInsumoComprado(item.id, 'cantidad', e.target.value)} /></td>
                          <td className="px-3 py-2 uppercase text-slate-600 font-semibold">{item.unidad}</td>
                          <td className="px-3 py-2 text-right"><input type="number" step="0.01" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500" value={item.p_unitario} onChange={(e) => handleCambiarInsumoComprado(item.id, 'p_unitario', e.target.value)} /></td>
                          <td className="px-3 py-2 text-right font-black text-slate-900">$ {Number(item.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center"><button type="button" onClick={() => handleQuitarInsumoComprado(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-start">
                  <button type="button" onClick={() => handleAgregarInsumoComprado(null)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Agregar línea vacía
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsFacturaModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm">{editingId ? 'Actualizar Factura' : 'Crear Factura'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}