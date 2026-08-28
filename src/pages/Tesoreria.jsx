import React, { useState } from 'react';
import { Plus, Calendar, FileText, ArrowUpRight, ArrowDownLeft, Wallet, Search, Trash2, X, CheckCircle2, Edit2, BarChart3, Clock, Upload, ArrowLeft, Sparkles, Check, Loader2, Paperclip } from 'lucide-react';

export default function Tesoreria({ 
  GOOGLE_SCRIPT_URL, 
  movimientos = [], 
  facturas = [], 
  facturasVenta = [], 
  proveedores = [], 
  clientes = [], 
  obras = [], 
  cargarDatos 
}) {
  const [activeTab, setActiveTab] = useState('movimientos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Nuevo/Editar Movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Modal Nueva Factura de Venta y su Paso (subir vs formulario)
  const [isFacturaVentaModalOpen, setIsFacturaVentaModalOpen] = useState(false);
  const [pasoFacturaVenta, setPasoFacturaVenta] = useState('subir'); // 'subir' | 'formulario'
  const [leyendoFactura, setLeyendoFactura] = useState(false);
  
  // Estados para manejar el archivo adjunto en Base64 para Google Drive
  const [archivoBase64Venta, setArchivoBase64Venta] = useState('');
  const [nombreArchivoVenta, setNombreArchivoVenta] = useState('');

  // 🛡️ ESTADO DE BLOQUEO CONTRA CLICS MÚLTIPLES (DUPLICACIÓN)
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingVenta, setIsSavingVenta] = useState(false);

  const [formData, setFormData] = useState({
    tipo: 'Egreso',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    monto: 0,
    medio_pago: 'transferencia',
    referencia: '',
    retencion_suss: 0,
    retencion_iva: 0,
    retencion_ganancias: 0,
    retencion_iibb_pba: 0,
    retencion_iibb_caba: 0,
    facturas_aplicadas: [
      { id: Date.now(), factura_id: '', monto: 0 }
    ]
  });

  // Formulario Factura de Venta ampliado
  const [formDataVenta, setFormDataVenta] = useState({
    tipo_comprobante: 'FACTURA A',
    punto_venta: '00001',
    numero_comp: '',
    cliente_id: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    items: [
      { id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }
    ],
    neto_gravado: 0,
    iva_21: 0,
    iva_105: 0,
    otros_tributos: 0,
    total: 0,
    archivo_url: '',
    estado_pago: 'pendiente'
  });

  const formatearFechaDisplay = (fechaStr) => {
    if (!fechaStr) return '---';
    const partes = String(fechaStr).split('T')[0].split('-');
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

  const handleCobrarFacturaVenta = (f) => {
    const facturaIdReal = f.id || f.ID;
    const clienteObj = clientes.find(c => String(c.id || c.ID) === String(f.cliente_id || f.Cliente_id));
    const montoTotalFac = Number(f.total || f.Total || 0);
    setEditingId(null);
    setFormData({
      tipo: 'Ingreso',
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Cobro ${f.tipo_comprobante || 'Factura'} N° ${f.numero_comp || ''} - ${clienteObj?.razon_social || clienteObj?.nombre || ''}`,
      monto: montoTotalFac,
      medio_pago: 'transferencia',
      referencia: '',
      retencion_suss: 0,
      retencion_iva: 0,
      retencion_ganancias: 0,
      retencion_iibb_pba: 0,
      retencion_iibb_caba: 0,
      facturas_aplicadas: [
        { id: Date.now(), factura_id: facturaIdReal, monto: montoTotalFac }
      ]
    });
    setIsModalOpen(true);
  };

  const handlePagarFacturaCompra = (f) => {
    const facturaIdReal = f.id || f.ID;
    const provObj = proveedores.find(p => String(p.id || p.ID) === String(f.proveedor_id || f.Proveedor_id));
    const montoTotalFac = Number(f.total || f.Total || 0);
    setEditingId(null);
    setFormData({
      tipo: 'Egreso',
      fecha: new Date().toISOString().split('T')[0],
      concepto: `Pago Factura ${f.codigo || f.n_factura || ''} - ${provObj?.razon_social || provObj?.nombre || ''}`,
      monto: montoTotalFac,
      medio_pago: 'transferencia',
      referencia: '',
      retencion_suss: 0,
      retencion_iva: 0,
      retencion_ganancias: 0,
      retencion_iibb_pba: 0,
      retencion_iibb_caba: 0,
      facturas_aplicadas: [
        { id: Date.now(), factura_id: facturaIdReal, monto: montoTotalFac }
      ]
    });
    setIsModalOpen(true);
  };

  const handleAgregarFacturaFila = () => {
    setFormData(prev => ({
      ...prev,
      facturas_aplicadas: [
        ...prev.facturas_aplicadas,
        { id: Date.now(), factura_id: '', monto: 0 }
      ]
    }));
  };

  const handleCambiarFacturaFila = (id, campo, valor) => {
    const nuevas = formData.facturas_aplicadas.map(item => {
      if (item.id === id) {
        let actualizado = { ...item, [campo]: valor };
        if (campo === 'factura_id') {
          const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';
          const listaBusqueda = esIngreso ? facturasVenta : facturas;
          const facEncontrada = listaBusqueda.find(f => String(f.id || f.ID) === String(valor));
          if (facEncontrada) {
            actualizado.monto = Number(facEncontrada.total || facEncontrada.Total || facEncontrada.TOTAL || 0);
          }
        }
        return actualizado;
      }
      return item;
    });

    const sumaTotal = nuevas.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);

    setFormData(prev => ({
      ...prev,
      facturas_aplicadas: nuevas,
      monto: sumaTotal > 0 ? sumaTotal : prev.monto
    }));
  };

  const handleQuitarFacturaFila = (id) => {
    const nuevas = formData.facturas_aplicadas.filter(i => i.id !== id);
    const sumaTotal = nuevas.reduce((acc, curr) => acc + (Number(curr.monto) || 0), 0);
    setFormData(prev => ({
      ...prev,
      facturas_aplicadas: nuevas,
      monto: sumaTotal
    }));
  };

  const totalRetenciones = Number(formData.retencion_suss || 0) + 
                         Number(formData.retencion_iva || 0) + 
                         Number(formData.retencion_ganancias || 0) + 
                         Number(formData.retencion_iibb_pba || 0) + 
                         Number(formData.retencion_iibb_caba || 0);

  const montoBrutoFacturas = Number(formData.monto || 0);
  const montoNetoEfectivo = Math.max(0, montoBrutoFacturas - totalRetenciones);

  // Manejo de ítems de la Factura de Venta
  const handleAgregarItemVenta = () => {
    setFormDataVenta(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }
      ]
    }));
  };

  const handleCambiarItemVenta = (id, campo, valor) => {
    const nuevosItems = formDataVenta.items.map(item => {
      if (item.id === id) {
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'cantidad' || campo === 'precio_unitario') {
          const cant = campo === 'cantidad' ? Number(valor) || 0 : Number(item.cantidad) || 0;
          const precio = campo === 'precio_unitario' ? Number(valor) || 0 : Number(item.precio_unitario) || 0;
          actualizado.subtotal = cant * precio;
        }
        return actualizado;
      }
      return item;
    });

    const nuevoNeto = nuevosItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
    const nuevoIva21 = nuevoNeto * 0.21;
    const nuevoTotal = nuevoNeto + nuevoIva21 + Number(formDataVenta.otros_tributos || 0);

    setFormDataVenta(prev => ({
      ...prev,
      items: nuevosItems,
      neto_gravado: nuevoNeto,
      iva_21: nuevoIva21,
      total: nuevoTotal
    }));
  };

  const handleQuitarItemVenta = (id) => {
    const nuevosItems = formDataVenta.items.filter(i => i.id !== id);
    const nuevoNeto = nuevosItems.reduce((acc, curr) => acc + (Number(curr.subtotal) || 0), 0);
    const nuevoIva21 = nuevoNeto * 0.21;
    const nuevoTotal = nuevoNeto + nuevoIva21 + Number(formDataVenta.otros_tributos || 0);

    setFormDataVenta(prev => ({
      ...prev,
      items: nuevosItems,
      neto_gravado: nuevoNeto,
      iva_21: nuevoIva21,
      total: nuevoTotal
    }));
  };

  // Lector Factura con IA del Backend con la tabla especificada
  const procesarArchivoFacturaVenta = async (e) => {
    if (!GOOGLE_SCRIPT_URL) {
      alert("ERROR: La variable GOOGLE_SCRIPT_URL no está configurada.");
      return;
    }

    const archivo = e.target.files[0];
    if (!archivo) return;

    setLeyendoFactura(true);
    setNombreArchivoVenta(archivo.name);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(archivo);
      
      reader.onload = async () => {
        const base64Data = reader.result;
        setArchivoBase64Venta(base64Data); // Guardamos el Base64 completo
        
        try {
          const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'procesarFacturaConAI',
              tabla: 'FacturasVenta',
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
            let clienteEncontradoId = '';
            const nombreClienteBusqueda = data.cliente || data.proveedor || '';
            if (nombreClienteBusqueda && clientes.length > 0) {
              const cliMatch = clientes.find(c => 
                (c.razon_social && c.razon_social.toLowerCase().includes(nombreClienteBusqueda.toLowerCase())) ||
                (c.nombre && c.nombre.toLowerCase().includes(nombreClienteBusqueda.toLowerCase()))
              );
              if (cliMatch) clienteEncontradoId = cliMatch.id || cliMatch.ID || cliMatch.Id;
            }

            const nCompDetectado = data.n_factura || data.numero_factura || data.nro_factura || data.numero_comp || '';
            let ptoVtaDetectado = '00001';
            let nCompLimpio = nCompDetectado;

            if (nCompDetectado.includes('-')) {
              const partes = nCompDetectado.split('-');
              if (partes.length >= 2) {
                ptoVtaDetectado = partes[0].trim().padStart(5, '0');
                nCompLimpio = partes[1].trim();
              }
            }

            const netoVal = Number(data.subtotal || data.neto) || 0;
            const ivaVal = Number(data.iva_21 || data.iva) || (netoVal * 0.21);
            const totalVal = Number(data.total) || (netoVal + ivaVal);
            
            let descItem = `Factura N° ${nCompLimpio || '---'}`;
            if (data.items && Array.isArray(data.items) && data.items.length > 0 && data.items[0].descripcion) {
              descItem = data.items[0].descripcion;
            } else if (data.concepto || data.descripcion) {
              descItem = data.concepto || data.descripcion;
            }

            setFormDataVenta(prev => ({
              ...prev,
              punto_venta: ptoVtaDetectado,
              numero_comp: nCompLimpio || prev.numero_comp,
              cliente_id: clienteEncontradoId || prev.cliente_id,
              fecha_emision: formatearFechaParaInput(data.fecha || data.Fecha || data.FECHA) || prev.fecha_emision,
              fecha_vencimiento: formatearFechaParaInput(data.vencimiento || data.Vencimiento || data.VENCIMIENTO) || prev.fecha_vencimiento,
              neto_gravado: netoVal || prev.neto_gravado,
              iva_21: ivaVal || prev.iva_21,
              total: totalVal || prev.total,
              archivo_url: base64Data, // Asignamos el base64 de inmediato
              items: [
                {
                  id: Date.now(),
                  descripcion: descItem,
                  cantidad: 1,
                  precio_unitario: netoVal || prev.neto_gravado,
                  subtotal: netoVal || prev.neto_gravado
                }
              ]
            }));

            setIsFacturaVentaModalOpen(false);
            setPasoFacturaVenta('formulario');
            setIsFacturaVentaModalOpen(true);

          } else {
            alert("Error de IA: " + (data.error || "No se pudieron extraer los datos."));
          }
        } catch (fetchErr) {
          console.error("Error en el fetch:", fetchErr);
          alert("Error de conexión con el servidor.");
        } finally {
          setLeyendoFactura(false);
          e.target.value = "";
        }
      };

      reader.onerror = () => {
        setLeyendoFactura(false);
        alert("Error al leer el archivo local.");
      };

    } catch (err) {
      setLeyendoFactura(false);
      alert("Error inesperado: " + err.message);
    }
  };

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      const action = editingId ? 'update' : 'create';
      const payloadData = {
        ...formData,
        monto: montoNetoEfectivo,
        facturas_aplicadas: JSON.stringify(formData.facturas_aplicadas)
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Tesoreria',
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
        alert("Error del servidor: " + textoRespuesta.substring(0, 150));
        return;
      }

      if (data.success || data.id) {
        if (Array.isArray(formData.facturas_aplicadas)) {
          for (const item of formData.facturas_aplicadas) {
            if (!item.factura_id) continue;
            
            const esIngreso = String(formData.tipo).toLowerCase() === 'ingreso';
            const listaObjetivo = esIngreso ? facturasVenta : facturas;
            const tablaObjetivo = esIngreso ? 'FacturasVenta' : 'Facturas';
            
            const facturaObj = listaObjetivo.find(f => String(f.id || f.ID) === String(item.factura_id));
            if (facturaObj) {
              const totalFactura = Number(facturaObj.total || facturaObj.Total || 0);
              const montoAplicado = Number(item.monto || 0);
              
              let nuevoEstado = 'pendiente';
              if (montoAplicado >= totalFactura) {
                nuevoEstado = 'pagado';
              } else if (montoAplicado > 0) {
                nuevoEstado = 'pagado parcial';
              }

              await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                  tabla: tablaObjetivo,
                  action: 'update',
                  id: facturaObj.id || facturaObj.ID,
                  data: {
                    ...facturaObj,
                    estado_pago: nuevoEstado
                  }
                })
              });
            }
          }
        }

        setIsModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar movimiento: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar el movimiento.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardarFacturaVenta = async (e) => {
    e.preventDefault();
    if (isSavingVenta) return;

    setIsSavingVenta(true);
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'FacturasVenta',
          action: 'create',
          data: {
            ...formDataVenta,
            // Forzamos enviar el Base64 real tanto si vino de la IA como del estado almacenado
            archivo_url: archivoBase64Venta ? archivoBase64Venta : formDataVenta.archivo_url,
            estado_pago: 'pendiente',
            items: JSON.stringify(formDataVenta.items)
          }
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
        setIsFacturaVentaModalOpen(false);
        alert("Factura de Venta registrada correctamente.");
        cargarDatos();
      } else {
        alert("Error al guardar factura de venta: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al registrar la factura de venta.");
    } finally {
      setIsSavingVenta(false);
    }
  };

  const handleEliminarMovimiento = async (m) => {
    const mId = m.id || m.ID || m.Id;
    if (!mId) return;
    if (!window.confirm("¿Estás seguro de eliminar este movimiento?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Tesoreria', action: 'delete', id: mId })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        cargarDatos();
      } else {
        alert("No se pudo eliminar el movimiento.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalIngresos = movimientos
    .filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'ingreso')
    .reduce((acc, curr) => acc + (Number(curr.monto || curr.Monto) || 0), 0);

  const totalEgresos = movimientos
    .filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso')
    .reduce((acc, curr) => acc + (Number(curr.monto || curr.Monto) || 0), 0);

  const balance = totalIngresos - totalEgresos;

  const movimientosFiltrados = movimientos.filter(m => {
    const concepto = String(m.concepto || m.Concepto || '').toLowerCase();
    const ref = String(m.referencia || m.Referencia || '').toLowerCase();
    return concepto.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
  });

  const facturasAPagar = facturas.filter(f => {
    const estado = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
    return estado === 'pendiente' || estado === 'pagado parcial';
  });

  const facturasACobrar = facturasVenta.filter(f => {
    const estado = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
    return estado === 'pendiente' || estado === 'pagado parcial';
  });

  const cashFlowMensualMap = {};
  const cashFlowAnualMap = {};

  movimientos.forEach(m => {
    const fecha = m.fecha || m.Fecha;
    if (!fecha) return;
    const mesAnio = fecha.substring(0, 7); 
    const anio = fecha.substring(0, 4);    
    const tipo = String(m.tipo || m.Tipo).toLowerCase();
    const monto = Number(m.monto || m.Monto) || 0;

    if (!cashFlowMensualMap[mesAnio]) cashFlowMensualMap[mesAnio] = { ingresos: 0, egresos: 0 };
    if (tipo === 'ingreso') cashFlowMensualMap[mesAnio].ingresos += monto;
    if (tipo === 'egreso') cashFlowMensualMap[mesAnio].egresos += monto;

    if (!cashFlowAnualMap[anio]) cashFlowAnualMap[anio] = { ingresos: 0, egresos: 0 };
    if (tipo === 'ingreso') cashFlowAnualMap[anio].ingresos += monto;
    if (tipo === 'egreso') cashFlowAnualMap[anio].egresos += monto;
  });

  const listaMensual = Object.keys(cashFlowMensualMap).sort().map(k => ({ periodo: k, ...cashFlowMensualMap[k] }));
  const listaAnual = Object.keys(cashFlowAnualMap).sort().map(k => ({ periodo: k, ...cashFlowAnualMap[k] }));

  const totalIvaCompras = facturas.reduce((acc, f) => {
    const iva21 = Number(f.iva_21 || f.Iva_21 || f.IVA_21 || f.iva21 || 0);
    const iva105 = Number(f.iva_105 || f.Iva_105 || f.IVA_105 || f.iva105 || 0);
    return acc + iva21 + iva105;
  }, 0);

  const totalIvaVentas = facturasVenta.reduce((acc, f) => {
    const iva21 = Number(f.iva_21 || f.Iva_21 || f.IVA_21 || f.iva21 || 0);
    const iva105 = Number(f.iva_105 || f.Iva_105 || f.IVA_105 || f.iva105 || 0);
    return acc + iva21 + iva105;
  }, 0);

  const totalRetencionesIvaMovimientos = movimientos.reduce((acc, m) => {
    return acc + Number(m.retencion_iva || m.Retencion_iva || 0);
  }, 0);

  const posicionIva = totalIvaVentas - totalIvaCompras - totalRetencionesIvaMovimientos;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tesorería</h1>
          <p className="text-slate-500 text-sm mt-1">Flujo de caja, IVA y movimientos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => {
            setPasoFacturaVenta('subir');
            setArchivoBase64Venta('');
            setNombreArchivoVenta('');
            setFormDataVenta({
              tipo_comprobante: 'FACTURA A',
              punto_venta: '00001',
              numero_comp: '',
              cliente_id: '',
              fecha_emision: new Date().toISOString().split('T')[0],
              fecha_vencimiento: '',
              items: [{ id: Date.now(), descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }],
              neto_gravado: 0,
              iva_21: 0,
              iva_105: 0,
              otros_tributos: 0,
              total: 0,
              archivo_url: '',
              estado_pago: 'pendiente'
            });
            setIsFacturaVentaModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> + Nueva Factura Venta
          </button>
          <button onClick={() => {
            setEditingId(null);
            setFormData({
              tipo: 'Egreso',
              fecha: new Date().toISOString().split('T')[0],
              concepto: '',
              monto: 0,
              medio_pago: 'transferencia',
              referencia: '',
              retencion_suss: 0,
              retencion_iva: 0,
              retencion_ganancias: 0,
              retencion_iibb_pba: 0,
              retencion_iibb_caba: 0,
              facturas_aplicadas: [{ id: Date.now(), factura_id: '', monto: 0 }]
            });
            setIsModalOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Ingresos</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">$ {totalIngresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><ArrowUpRight className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Egresos</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">$ {totalEgresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><ArrowDownLeft className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Balance</p>
            <h3 className={`text-2xl font-black mt-1 ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>$ {balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl"><Wallet className="w-6 h-6" /></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('movimientos')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'movimientos' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Movimientos</button>
          <button onClick={() => setActiveTab('facturas_pagar')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'facturas_pagar' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Facturas a pagar ({facturasAPagar.length})</button>
          <button onClick={() => setActiveTab('facturas_cobrar')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'facturas_cobrar' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Facturas a cobrar ({facturasACobrar.length})</button>
          <button onClick={() => setActiveTab('cashflow')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'cashflow' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Cash Flow</button>
          <button onClick={() => setActiveTab('iva')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'iva' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>IVA</button>
        </div>

        {activeTab === 'movimientos' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar movimiento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {movimientosFiltrados.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Wallet className="w-10 h-10 text-slate-300" />
              <span>No hay movimientos registrados.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-4 py-4">Tipo</th>
                  <th className="px-6 py-4">Concepto</th>
                  <th className="px-4 py-4">Medio de Pago</th>
                  <th className="px-4 py-4 text-center">Retenciones</th>
                  <th className="px-4 py-4 text-right">Monto Neto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientosFiltrados.map((m, index) => {
                  const tipo = String(m.tipo || m.Tipo || 'Egreso').toLowerCase();
                  const monto = Number(m.monto || m.Monto) || 0;
                  const suss = Number(m.retencion_suss || m.Retencion_suss || 0);
                  const iva = Number(m.retencion_iva || m.Retencion_iva || 0);
                  const gan = Number(m.retencion_ganancias || m.Retencion_ganancias || 0);
                  const iibbPba = Number(m.retencion_iibb_pba || m.Retencion_iibb_pba || 0);
                  const iibbCaba = Number(m.retencion_iibb_caba || m.Retencion_iibb_caba || 0);
                  const sumRet = suss + iva + gan + iibbPba + iibbCaba;

                  return (
                    <tr key={m.id || m.ID || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-600">{formatearFechaDisplay(m.fecha || m.Fecha)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">{m.concepto || m.Concepto || '---'}</td>
                      <td className="px-4 py-4 uppercase text-slate-600">{m.medio_pago || m.Medio_pago || 'transferencia'}</td>
                      <td className="px-4 py-4 text-center">
                        {sumRet > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-semibold text-[10px]" title={`SUSS: $${suss} | IVA: $${iva} | Ganancias: $${gan} | IIBB PBA: $${iibbPba} | IIBB CABA: $${iibbCaba}`}>
                            $ {sumRet.toLocaleString('es-AR')}
                          </span>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                      <td className={`px-4 py-4 text-right font-black ${tipo === 'ingreso' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        $ {monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEliminarMovimiento(m)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'facturas_pagar' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {facturasAPagar.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Clock className="w-10 h-10 text-slate-300" />
              <span>No hay facturas pendientes de pago.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Código / N° Factura</th>
                  <th className="px-6 py-4">Proveedor</th>
                  <th className="px-4 py-4">Fecha Emisión</th>
                  <th className="px-4 py-4">Vencimiento</th>
                  <th className="px-4 py-4 text-right">Total a Pagar</th>
                  <th className="px-4 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasAPagar.map((f, index) => {
                  const provId = f.proveedor_id || f.Proveedor_id;
                  const prov = proveedores.find(p => String(p.id || p.ID) === String(provId));
                  const totalVal = Number(f.total || f.Total || 0) || 0;
                  const codigoDisplay = f.codigo || f.Codigo || `FAC-${String(index + 1).padStart(4, '0')}`;
                  const nFactura = f.n_factura || f.N_factura || '---';
                  const estadoPago = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();

                  return (
                    <tr key={f.id || f.ID || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-blue-600">{codigoDisplay} <span className="text-slate-500 font-normal">({nFactura})</span></td>
                      <td className="px-6 py-4 font-bold text-slate-900">{prov?.razon_social || prov?.nombre || 'Proveedor'}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(f.fecha || f.Fecha)}</td>
                      <td className="px-4 py-4 font-semibold text-rose-600">{formatearFechaDisplay(f.vencimiento || f.Vencimiento)}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoPago === 'pagado parcial' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                          {estadoPago}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handlePagarFacturaCompra(f)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors"
                        >
                          Registrar Pago
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'facturas_cobrar' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          {facturasACobrar.length === 0 ? (
            <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
              <Clock className="w-10 h-10 text-slate-300" />
              <span>No hay facturas de venta pendientes de cobro.</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Tipo / N° Comprobante</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-4 py-4">Fecha Emisión</th>
                  <th className="px-4 py-4">Vencimiento</th>
                  <th className="px-4 py-4 text-right">Total a Cobrar</th>
                  <th className="px-4 py-4 text-center">Archivo</th>
                  <th className="px-4 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturasACobrar.map((f, index) => {
                  const cliId = f.cliente_id || f.Cliente_id;
                  const cliente = clientes.find(c => String(c.id || c.ID) === String(cliId));
                  const totalVal = Number(f.total || f.Total || 0) || 0;
                  const tipoComp = f.tipo_comprobante || f.Tipo_comprobante || 'FACTURA A';
                  const nComp = f.numero_comp || f.Numero_comp || '---';
                  const estadoPago = String(f.estado_pago || f.Estado_pago || 'pendiente').toLowerCase();
                  
                  // Obtenemos el link del archivo de Google Drive
                  const urlArchivo = f.archivo_url || f.Archivo_url || f.archivo || f.Archivo || '';

                  return (
                    <tr key={f.id || f.ID || index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-sky-600">{tipoComp} <span className="text-slate-500 font-normal">({nComp})</span></td>
                      <td className="px-6 py-4 font-bold text-slate-900">{cliente?.razon_social || cliente?.nombre || 'Cliente'}</td>
                      <td className="px-4 py-4 text-slate-600">{formatearFechaDisplay(f.fecha_emision || f.Fecha_emision || f.fecha || f.Fecha)}</td>
                      <td className="px-4 py-4 font-semibold text-rose-600">{formatearFechaDisplay(f.fecha_vencimiento || f.Fecha_vencimiento || f.vencimiento || f.Vencimiento)}</td>
                      <td className="px-4 py-4 text-right font-black text-slate-900">$ {totalVal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      
                      {/* COLUMNA ARCHIVO CON EL ICONO DE CLIP (PAPERCLIP) */}
                      <td className="px-4 py-4 text-center">
                        {urlArchivo && String(urlArchivo).startsWith('http') ? (
                          <a 
                            href={urlArchivo} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center justify-center p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors border border-sky-200 shadow-sm"
                            title="Ver comprobante en Google Drive"
                          >
                            <Paperclip className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Sin archivo</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${estadoPago === 'pagado parcial' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                          {estadoPago}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleCobrarFacturaVenta(f)}
                          className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-bold text-[11px] shadow-sm transition-colors"
                        >
                          Registrar Cobro
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Cash Flow Mensual
            </h3>
            {listaMensual.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No hay datos suficientes para mostrar el cash flow mensual.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <th className="px-6 py-3">Periodo (Mes)</th>
                      <th className="px-4 py-3 text-right text-emerald-600">Ingresos</th>
                      <th className="px-4 py-3 text-right text-rose-600">Egresos</th>
                      <th className="px-6 py-3 text-right">Neto / Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listaMensual.map((row, idx) => {
                      const neto = row.ingresos - row.egresos;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-bold text-slate-800">{row.periodo}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">$ {row.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-600">$ {row.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className={`px-6 py-3 text-right font-black ${neto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>$ {neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm uppercase text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Cash Flow Anual
            </h3>
            {listaAnual.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No hay datos suficientes para mostrar el cash flow anual.</div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <th className="px-6 py-3">Año</th>
                      <th className="px-4 py-3 text-right text-emerald-600">Ingresos</th>
                      <th className="px-4 py-3 text-right text-rose-600">Egresos</th>
                      <th className="px-6 py-3 text-right">Neto / Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listaAnual.map((row, idx) => {
                      const neto = row.ingresos - row.egresos;
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-bold text-slate-800">{row.periodo}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">$ {row.ingresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-600">$ {row.egresos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className={`px-6 py-3 text-right font-black ${neto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>$ {neto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
              <h3 className="text-2xl font-black text-amber-900 mt-2">$ {totalRetencionesIvaMovimientos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">Pagos a cuenta sufridos</span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">Posición IVA</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-2">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">{posicionIva <= 0 ? 'A favor' : 'A pagar'}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">Cálculo: Posición IVA = IVA Ventas – IVA Compras – Retenciones IVA</h4>
            <p className="text-xs text-slate-600 font-mono">
              $ {totalIvaVentas.toLocaleString('es-AR', { minimumFractionDigits: 2 })} – $ {totalIvaCompras.toLocaleString('es-AR', { minimumFractionDigits: 2 })} – $ {totalRetencionesIvaMovimientos.toLocaleString('es-AR', { minimumFractionDigits: 2 })} = <span className="font-bold text-emerald-600">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ({posicionIva <= 0 ? 'A favor' : 'A pagar'})</span>
            </p>
          </div>
        </div>
      )}

      {/* MODAL NUEVO MOVIMIENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nuevo Movimiento con Retenciones</h3>
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleGuardarMovimiento} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo *</label>
                  <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Egreso">Egreso</option>
                    <option value="Ingreso">Ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha *</label>
                  <input type="date" required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto *</label>
                  <input type="text" required disabled={isSaving} placeholder="Descripción del movimiento..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.concepto} onChange={(e) => setFormData({...formData, concepto: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto Bruto / Factura ($) *</label>
                  <input type="number" step="0.01" required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medio de Pago</label>
                  <select disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase disabled:bg-slate-100" value={formData.medio_pago} onChange={(e) => setFormData({...formData, medio_pago: e.target.value})}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referencia</label>
                  <input type="text" disabled={isSaving} placeholder="N° cheque, transferencia..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.referencia} onChange={(e) => setFormData({...formData, referencia: e.target.value})} />
                </div>
              </div>

              {/* SECCIÓN DE RETENCIONES */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-extrabold text-xs uppercase text-slate-800">Retenciones Sufridas (Descuentos)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">SUSS ($)</label>
                    <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.retencion_suss} onChange={(e) => setFormData({...formData, retencion_suss: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IVA ($)</label>
                    <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.retencion_iva} onChange={(e) => setFormData({...formData, retencion_iva: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ganancias ($)</label>
                    <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.retencion_ganancias} onChange={(e) => setFormData({...formData, retencion_ganancias: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IIBB PBA ($)</label>
                    <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.retencion_iibb_pba} onChange={(e) => setFormData({...formData, retencion_iibb_pba: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IIBB CABA ($)</label>
                    <input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formData.retencion_iibb_caba} onChange={(e) => setFormData({...formData, retencion_iibb_caba: e.target.value})} />
                  </div>
                  <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Neto Cash Flow:</span>
                    <span className="text-xs font-black text-amber-900">$ {montoNetoEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-800">
                      {formData.tipo.toLowerCase() === 'ingreso' ? 'Aplicar a Facturas de Venta (Cobro)' : 'Aplicar a Facturas de Compra (Pago)'}
                    </h4>
                    <p className="text-[11px] text-slate-500">Asocia este movimiento a una o varias facturas (montos totales o parciales).</p>
                  </div>
                  <button type="button" onClick={handleAgregarFacturaFila} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                    <Plus className="w-3.5 h-3.5" /> Agregar Factura
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <th className="px-3 py-2.5">Factura</th>
                        <th className="px-3 py-2.5 w-36 text-right">Monto Aplicado</th>
                        <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(formData.facturas_aplicadas) && formData.facturas_aplicadas.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <select 
                              disabled={isSaving}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
                              value={item.factura_id}
                              onChange={(e) => handleCambiarFacturaFila(item.id, 'factura_id', e.target.value)}
                            >
                              <option value="">Seleccionar factura...</option>
                              {String(formData.tipo).toLowerCase() === 'ingreso' ? (
                                facturasVenta.map(f => {
                                  const cli = clientes.find(c => String(c.id || c.ID) === String(f.cliente_id || f.Cliente_id));
                                  const facturaIdReal = f.id || f.ID;
                                  return (
                                    <option key={facturaIdReal} value={facturaIdReal}>
                                      {f.tipo_comprobante || 'FAC'} ({f.numero_comp || ''}) - {cli?.razon_social || cli?.nombre || 'Cliente'} ($ {Number(f.total || 0).toLocaleString('es-AR')})
                                    </option>
                                  );
                                })
                              ) : (
                                facturas.map(f => {
                                  const prov = proveedores.find(p => String(p.id || p.ID) === String(f.proveedor_id || f.Proveedor_id));
                                  const facturaCompraIdReal = f.id || f.ID;
                                  return (
                                    <option key={facturaCompraIdReal} value={facturaCompraIdReal}>
                                      {f.codigo || 'FAC'} - {prov?.razon_social || prov?.nombre || 'Proveedor'} ($ {Number(f.total || 0).toLocaleString('es-AR')})
                                    </option>
                                  );
                                })
                              )}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input 
                              type="number" 
                              step="0.01" 
                              disabled={isSaving}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" 
                              value={item.monto} 
                              onChange={(e) => handleCambiarFacturaFila(item.id, 'monto', e.target.value)} 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => handleQuitarFacturaFila(item.id)} disabled={isSaving} className="text-slate-400 hover:text-red-600 disabled:opacity-50"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA FACTURA DE VENTA (CON SUBIDA E IA / FORMULARIO) */}
      {isFacturaVentaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-sky-50">
              <h3 className="font-bold text-sky-950">+ Nueva Factura de Venta</h3>
              <button onClick={() => setIsFacturaVentaModalOpen(false)} disabled={isSavingVenta} className="text-sky-400 hover:text-sky-700 disabled:opacity-50"><X className="w-5 h-5"/></button>
            </div>
            
            {pasoFacturaVenta === 'subir' ? (
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
                      <p className="text-xs text-slate-500 mt-1">Selecciona el archivo PDF o imagen para leerlo mediante IA y completar el formulario.</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-4">
                      <label className="border-2 border-dashed border-sky-300 rounded-2xl p-8 bg-sky-50/50 hover:bg-sky-50 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 block">
                        <Upload className="w-10 h-10 text-sky-500 mb-1" />
                        <span className="text-xs font-bold text-sky-900">Haz clic para seleccionar el comprobante</span>
                        <span className="text-[10px] text-slate-400">Soporta PDF, PNG, JPG (Procesamiento con IA del servidor)</span>
                        <input 
                          type="file" 
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          onChange={procesarArchivoFacturaVenta}
                          disabled={leyendoFactura}
                        />
                      </label>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t">
                      <button type="button" onClick={() => setIsFacturaVentaModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                      <button 
                        type="button" 
                        onClick={() => setPasoFacturaVenta('formulario')} 
                        className="text-xs text-sky-600 font-bold hover:underline"
                      >
                        O completar manualmente &rarr;
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <form onSubmit={handleGuardarFacturaVenta} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between bg-sky-50 p-3 rounded-xl border border-sky-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span className="text-xs font-bold text-sky-950">
                      {archivoBase64Venta ? `Factura analizada (${nombreArchivoVenta || 'Adjunta'})` : 'Formulario completado manualmente'}
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setPasoFacturaVenta('subir')} 
                    disabled={isSavingVenta}
                    className="flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" /> Cambiar archivo
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Comprobante *</label>
                    <select required disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 uppercase disabled:bg-slate-100" value={formDataVenta.tipo_comprobante} onChange={(e) => setFormDataVenta({...formDataVenta, tipo_comprobante: e.target.value})}>
                      <option value="FACTURA A">FACTURA A</option>
                      <option value="NOTA DE DEBITO A">NOTA DE DEBITO A</option>
                      <option value="NOTA DE CREDITO A">NOTA DE CREDITO A</option>
                      <option value="RECIBO A">RECIBO A</option>
                      <option value="FACTURA B">FACTURA B</option>
                      <option value="NOTA DE DEBITO B">NOTA DE DEBITO B</option>
                      <option value="NOTA DE CREDITO B">NOTA DE CREDITO B</option>
                      <option value="RECIBO B">RECIBO B</option>
                      <option value="FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) A">FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) A</option>
                      <option value="FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) B">FACTURA DE CREDITO ELECTRONICA MiPyMEs (FCE) B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Punto de Venta</label>
                    <input type="text" disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.punto_venta} onChange={(e) => setFormDataVenta({...formDataVenta, punto_venta: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Comp. Nro *</label>
                    <input type="text" required disabled={isSavingVenta} placeholder="Ej: 00000171" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.numero_comp} onChange={(e) => setFormDataVenta({...formDataVenta, numero_comp: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cliente *</label>
                    <select required disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.cliente_id} onChange={(e) => setFormDataVenta({...formDataVenta, cliente_id: e.target.value})}>
                      <option value="">Seleccione cliente...</option>
                      {clientes.map(c => <option key={c.id || c.ID} value={c.id || c.ID}>{c.razon_social || c.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Emisión</label>
                    <input type="date" disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.fecha_emision} onChange={(e) => setFormDataVenta({...formDataVenta, fecha_emision: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha Vto. Pago</label>
                    <input type="date" disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.fecha_vencimiento} onChange={(e) => setFormDataVenta({...formDataVenta, fecha_vencimiento: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-xs uppercase text-slate-800">Detalle de Conceptos / Ítems</h4>
                    <button type="button" onClick={handleAgregarItemVenta} disabled={isSavingVenta} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                      <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                    </button>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                          <th className="px-3 py-2.5">Descripción / Producto / Servicio</th>
                          <th className="px-3 py-2.5 w-20 text-center">Cant.</th>
                          <th className="px-3 py-2.5 w-28 text-right">P. Unitario</th>
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
                                disabled={isSavingVenta}
                                placeholder="Detalle del concepto..." 
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-sky-500 disabled:bg-slate-100"
                                value={item.descripcion}
                                onChange={(e) => handleCambiarItemVenta(item.id, 'descripcion', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                step="0.01" 
                                disabled={isSavingVenta}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                                value={item.cantidad}
                                onChange={(e) => handleCambiarItemVenta(item.id, 'cantidad', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input 
                                type="number" 
                                step="0.01" 
                                disabled={isSavingVenta}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-sky-500 disabled:bg-slate-100"
                                value={item.precio_unitario}
                                onChange={(e) => handleCambiarItemVenta(item.id, 'precio_unitario', e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-black text-slate-900 whitespace-nowrap">
                              $ {Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button type="button" onClick={() => handleQuitarItemVenta(item.id)} disabled={isSavingVenta} className="text-slate-400 hover:text-red-600 disabled:opacity-50"><Trash2 className="w-4 h-4 mx-auto" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Neto Gravado ($)</label>
                    <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none" value={formDataVenta.neto_gravado} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">IVA 21% ($)</label>
                    <input type="number" step="0.01" disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.iva_21} onChange={(e) => {
                      const iva = Number(e.target.value) || 0;
                      const total = Number(formDataVenta.neto_gravado) + iva + Number(formDataVenta.otros_tributos);
                      setFormDataVenta({...formDataVenta, iva_21: iva, total: total});
                    }} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total ($)</label>
                    <input type="number" step="0.01" required disabled={isSavingVenta} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-sky-600 outline-none focus:border-sky-500 disabled:bg-slate-100" value={formDataVenta.total} onChange={(e) => setFormDataVenta({...formDataVenta, total: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button type="button" onClick={() => setIsFacturaVentaModalOpen(false)} disabled={isSavingVenta} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Cancelar</button>
                  <button type="submit" disabled={isSavingVenta} className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                    {isSavingVenta && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSavingVenta ? 'Guardando...' : 'Guardar Factura Venta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}