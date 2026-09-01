import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Edit2, Trash2, MapPin, X, Loader2, Eye, ArrowLeft, Calculator, FileText, DollarSign, TrendingUp, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

export default function ContratosMantenimiento({ contratos: contratosProp = [], clientes: clientesProp = [], cargarDatos }) {
  const [contratos, setContratos] = useState(contratosProp);
  const [clientes, setClientes] = useState(clientesProp);
  const [pestanaActiva, setPestanaActiva] = useState('trabajo');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);
  
  const [contratoDetalle, setContratoDetalle] = useState(null);
  const [subTabDetalle, setSubTabDetalle] = useState('fee');

  const formatearMesBase = (val) => {
    if (!val) return '---';
    try {
      let fecha = new Date(val);
      if (!isNaN(fecha.getTime())) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mes = meses[fecha.getUTCMonth()];
        const anio = fecha.getUTCFullYear();
        return `${mes}-${anio}`;
      }
      if (val.includes('-')) {
        const partes = val.split('-');
        if (partes.length >= 2) {
          const anio = partes[0];
          const numMes = parseInt(partes[1], 10) - 1;
          const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          if (meses[numMes]) return `${meses[numMes]}-${anio}`;
        }
      }
    } catch (e) {}
    return val;
  };

  const [costoMaterialBase, setCostoMaterialBase] = useState(100);
  const [porcentajeBeneficioDeseado, setPorcentajeBeneficioDeseado] = useState(4.61);
  const P = porcentajeBeneficioDeseado / 100;
  const porcentajeFee = Math.max(0, ((P + 0.2057) / 0.50874) * 100);

  const [registrosMeses, setRegistrosMeses] = useState([
    { mes: 'Mes 1 (Base) - Julio 2026', uocra: 5817, ipc: 0, dolar: 1489 },
    { mes: 'Mes 2 - Agosto 2026', uocra: 6348, ipc: 2.1, dolar: 1485 },
    { mes: 'Mes 3 - Septiembre 2026', uocra: 7049, ipc: 1.9, dolar: 1520 }
  ]);
  const [ajustesAplicados, setAjustesAplicados] = useState([]);
  const [nuevoMes, setNuevoMes] = useState({ mes: '', uocra: 0, ipc: 0, dolar: 0 });

  useEffect(() => {
    if (contratoDetalle) {
      if (contratoDetalle.registros_meses) {
        try {
          const parsed = JSON.parse(contratoDetalle.registros_meses);
          if (Array.isArray(parsed) && parsed.length > 0) setRegistrosMeses(parsed);
        } catch (e) {}
      }
      if (contratoDetalle.ajustes_aplicados) {
        try {
          const parsedAjustes = JSON.parse(contratoDetalle.ajustes_aplicados);
          if (Array.isArray(parsedAjustes)) setAjustesAplicados(parsedAjustes);
        } catch (e) {}
      }
    }
  }, [contratoDetalle]);

  const guardarCambiosPolinomicaEnServidor = async (nuevosRegistros, nuevosAjustes) => {
    if (!contratoDetalle) return;
    try {
      const payload = {
        tabla: 'ContratosMantenimiento',
        action: 'update',
        id: contratoDetalle.id,
        data: {
          ...contratoDetalle,
          registros_meses: JSON.stringify(nuevosRegistros),
          ajustes_aplicados: JSON.stringify(nuevosAjustes || ajustesAplicados)
        }
      };
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        await refrescarDatosLocales();
      }
    } catch (err) {
      console.error("Error al guardar cambios polinómicos:", err);
    }
  };

  const agregarMesPolinomica = (e) => {
    e.preventDefault();
    if (!nuevoMes.mes) return;
    const actualizados = [...registrosMeses, { ...nuevoMes }];
    setRegistrosMeses(actualizados);
    setNuevoMes({ mes: '', uocra: 0, ipc: 0, dolar: 0 });
    guardarCambiosPolinomicaEnServidor(actualizados, ajustesAplicados);
  };

  const eliminarMesPolinomica = (idx) => {
    if (idx === 0) {
      alert("No se puede eliminar el Mes Base (Mes 1).");
      return;
    }
    const actualizados = registrosMeses.filter((_, i) => i !== idx);
    setRegistrosMeses(actualizados);
    guardarCambiosPolinomicaEnServidor(actualizados, ajustesAplicados);
  };

  const actualizarCeldaMes = (idx, campo, valor) => {
    const actualizados = [...registrosMeses];
    actualizados[idx][campo] = valor;
    setRegistrosMeses(actualizados);
    guardarCambiosPolinomicaEnServidor(actualizados, ajustesAplicados);
  };

  const [formData, setFormData] = useState({
    codigo: '',
    nombre_contrato: '',
    cliente: '',
    ubicacion: '',
    mes_base: '',
    actualizacion: 'Polinómica',
    estado: 'Borrador',
    descripcion: ''
  });

  const refrescarDatosLocales = async () => {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cargarDetalleCompleto' })
      });
      const data = await res.json();
      if (data.success) {
        if (data.contratos_mantenimiento) {
          setContratos(data.contratos_mantenimiento);
          if (contratoDetalle) {
            const actualizado = data.contratos_mantenimiento.find(c => c.id === contratoDetalle.id);
            if (actualizado) setContratoDetalle(actualizado);
          }
        }
        if (data.clientes) setClientes(data.clientes);
      }
    } catch (err) {
      console.error("Error al refrescar datos:", err);
    }
  };

  useEffect(() => {
    if (contratosProp.length > 0) setContratos(contratosProp);
    if (clientesProp.length > 0) setClientes(clientesProp);
    if (contratosProp.length === 0 || clientesProp.length === 0) {
      refrescarDatosLocales();
    }
  }, [contratosProp, clientesProp]);

  const totalBorrador = contratos.filter(c => String(c.estado || '').toLowerCase() === 'borrador').length;
  const totalEntregado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'entregado').length;
  const totalActivo = contratos.filter(c => String(c.estado || '').toLowerCase() === 'activo').length;
  const totalFinalizado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'finalizado').length;
  const totalArchivado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'archivado').length;

  const generarNuevoCodigo = () => {
    if (!contratos || contratos.length === 0) return 'CM001';
    const numeros = contratos.map(c => {
      const match = String(c.codigo || '').match(/CM(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(...numeros, 0);
    return `CM${String(maxNum + 1).padStart(3, '0')}`;
  };

  const abrirModalNuevo = () => {
    setContratoEditando(null);
    setFormData({
      codigo: generarNuevoCodigo(),
      nombre_contrato: '',
      cliente: '',
      ubicacion: '',
      mes_base: new Date().toISOString().slice(0, 7),
      actualizacion: 'Polinómica',
      estado: 'Borrador',
      descripcion: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (c) => {
    setContratoEditando(c);
    setFormData({
      codigo: c.codigo || generarNuevoCodigo(),
      nombre_contrato: c.nombre_contrato || '',
      cliente: c.cliente || '',
      ubicacion: c.ubicacion || '',
      mes_base: c.mes_base || '',
      actualizacion: c.actualizacion || 'Polinómica',
      estado: c.estado || 'Borrador',
      descripcion: c.descripcion || ''
    });
    setModalAbierto(true);
  };

  const guardarContrato = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const action = contratoEditando ? 'update' : 'create';
      const payload = {
        tabla: 'ContratosMantenimiento',
        action: action,
        id: contratoEditando ? contratoEditando.id : undefined,
        data: formData
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setModalAbierto(false);
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      } else {
        alert("Error al guardar: " + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const eliminarContrato = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este contrato?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    }
  };

  const cambiarEstadoRapido = async (id, nuevoEstado) => {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'ContratosMantenimiento',
          action: 'update',
          id: id,
          data: { estado: nuevoEstado }
        })
      });
      const data = await res.json();
      if (data.success) {
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const contratosFiltrados = contratos.filter(c => {
    const estado = String(c.estado || '').toLowerCase();
    const matchBusqueda = 
      String(c.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.nombre_contrato || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.ubicacion || '').toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    if (pestanaActiva === 'trabajo') {
      return estado === 'borrador' || estado === 'entregado';
    } else if (pestanaActiva === 'activos') {
      return estado === 'activo';
    } else if (pestanaActiva === 'archivados') {
      return estado === 'archivado' || estado === 'finalizado';
    }
    return true;
  });

  const procesarMesesPolinomica = () => {
    let acumuladoTotal = 0;
    let cicloAcumulado = 0;
    let resultados = [];

    registrosMeses.forEach((reg, idx) => {
      if (idx === 0) {
        resultados.push({
          ...reg,
          varUocra: 0,
          varIpc: 0,
          varDolar: 0,
          poliMes: 0,
          cicloAcumulado: 0,
          acumuladoTotal: 0,
          reajusteAplicado: false
        });
      } else {
        const prevU = Number(registrosMeses[idx - 1].uocra) || 1;
        const prevD = Number(registrosMeses[idx - 1].dolar) || 1;

        const varUocra = ((Number(reg.uocra) / prevU) - 1) * 100;
        const varIpc = Number(reg.ipc) || 0;
        const varDolar = ((Number(reg.dolar) / prevD) - 1) * 100;

        const poliMes = (varUocra * 0.80) + (varIpc * 0.10) + (varDolar * 0.10);

        cicloAcumulado += poliMes;
        acumuladoTotal += poliMes;

        const supera = cicloAcumulado > 5.0;

        resultados.push({
          ...reg,
          varUocra,
          varIpc,
          varDolar,
          poliMes,
          cicloAcumulado,
          acumuladoTotal,
          reajusteAplicado: supera
        });

        if (supera) {
          cicloAcumulado = 0;
        }
      }
    });
    return resultados;
  };

  const mesesProcesados = procesarMesesPolinomica();
  const polinomioAcumuladoTotal = mesesProcesados.length > 0 ? mesesProcesados[mesesProcesados.length - 1].acumuladoTotal : 0;
  
  const mesPendienteAplicar = mesesProcesados.find(m => m.reajusteAplicado && !ajustesAplicados.some(a => a.mes === m.mes));

  const aplicarAjustePendiente = (mesObj) => {
    const nuevoAjuste = {
      mes: mesObj.mes,
      cicloAcumulado: mesObj.cicloAcumulado,
      acumuladoTotal: mesObj.acumuladoTotal,
      indice: 1 + (mesObj.cicloAcumulado / 100)
    };
    const nuevosAjustes = [...ajustesAplicados, nuevoAjuste];
    setAjustesAplicados(nuevosAjustes);
    guardarCambiosPolinomicaEnServidor(registrosMeses, nuevosAjustes);
  };

  const eliminarAjusteAplicado = (indexAjuste) => {
    const nuevosAjustes = ajustesAplicados.filter((_, i) => i !== indexAjuste);
    setAjustesAplicados(nuevosAjustes);
    guardarCambiosPolinomicaEnServidor(registrosMeses, nuevosAjustes);
  };

  if (contratoDetalle) {
    const manoDeObraBase = [
      { codigo: '4000011125', topico: 'Valor HH SUPERVISOR', ars: 34157.25 },
      { codigo: '4000001424', topico: 'Valor HH TECNICO EHS', ars: 19369.70 },
      { codigo: '4000011128', topico: 'Valor HH OFICIAL ESPECIALIZADO', ars: 25301.41 },
      { codigo: '4000011131', topico: 'Valor HH Normal MEDIO OFICIAL', ars: 22282.63 },
      { codigo: '-', topico: 'Valor HH TECNICO OFICINA TECNICA', ars: 39294.02 }
    ];

    const precioVentaMaterial = costoMaterialBase * (1 + porcentajeFee / 100);
    const ivaCompra = costoMaterialBase * 0.21;
    const totalCompra = costoMaterialBase + ivaCompra;
    const ivaVenta = precioVentaMaterial * 0.21;
    const totalVenta = precioVentaMaterial + ivaVenta;
    const beneficioNetoConIVA = totalVenta - totalCompra;
    const impuestoGanancias = beneficioNetoConIVA * 0.35;
    const diferenciaIVA = ivaVenta - ivaCompra;
    const ingresosBrutos = totalVenta * 0.05;
    const costoFinanciero = totalCompra * 0.108;
    const impuestoDebitosCreditos = (totalCompra * 0.006) + (totalVenta * 0.006);
    const totalBeneficio = beneficioNetoConIVA - (impuestoGanancias + diferenciaIVA + ingresosBrutos + costoFinanciero + impuestoDebitosCreditos);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setContratoDetalle(null)}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Volver a Contratos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">{contratoDetalle.codigo}</span>
                <h1 className="text-xl font-black text-slate-800">{contratoDetalle.nombre_contrato || 'Contrato sin nombre'}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg">{contratoDetalle.estado}</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">Cliente: <strong className="text-slate-700">{contratoDetalle.cliente}</strong> • Ubicación: <strong className="text-slate-700">{contratoDetalle.ubicacion}</strong> • Mes Base: <strong className="text-slate-700">{formatearMesBase(contratoDetalle.mes_base)}</strong></p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Mes Base</p>
            <p className="text-2xl font-black text-slate-800">{formatearMesBase(contratoDetalle.mes_base)}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Actualización</p>
            <p className="text-2xl font-black text-amber-600">{contratoDetalle.actualizacion || 'Polinómica'}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fee Materiales</p>
            <p className="text-2xl font-black text-emerald-600">{porcentajeFee.toFixed(2)} %</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado Polinómica</p>
            <p className={cn('text-2xl font-black', polinomioAcumuladoTotal > 5 ? 'text-red-600' : 'text-slate-700')}>
              {polinomioAcumuladoTotal.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button 
            onClick={() => setSubTabDetalle('fee')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              subTabDetalle === 'fee' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <DollarSign className="w-4 h-4" /> Cálculo de Fee y Materiales
          </button>
          <button 
            onClick={() => setSubTabDetalle('horas')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              subTabDetalle === 'horas' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <Calculator className="w-4 h-4" /> Cálculo de Horas (HH)
          </button>
          <button 
            onClick={() => setSubTabDetalle('polinomica')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              subTabDetalle === 'polinomica' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <TrendingUp className="w-4 h-4" /> Determinacion de Polinomica o Indice
          </button>
          <button 
            onClick={() => setSubTabDetalle('general')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              subTabDetalle === 'general' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <FileText className="w-4 h-4" /> Descripción General
          </button>
        </div>

        {subTabDetalle === 'fee' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-black text-slate-800">2. Materiales — Cálculo Inverso de Fee (%)</h2>
                <p className="text-slate-500 text-sm">Define el beneficio deseado y el sistema calcula automáticamente el Fee de Gestión necesario.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Costo Material Base ($)</label>
                  <input 
                    type="number" 
                    value={costoMaterialBase}
                    onChange={(e) => setCostoMaterialBase(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Porcentaje de Beneficio Deseado (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={porcentajeBeneficioDeseado}
                    onChange={(e) => setPorcentajeBeneficioDeseado(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-500 text-emerald-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center">
                <p className="text-xs font-bold text-amber-800">Fee de Gestión Resultante:</p>
                <p className="text-2xl font-black text-amber-900">{porcentajeFee.toFixed(2)} %</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 uppercase mb-2">a) Compra a proveedor externo</p>
                    <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                      <span className="text-slate-600">Precio Neto:</span>
                      <span className="font-semibold">$ {costoMaterialBase.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b border-slate-200">
                      <span className="text-slate-600">IVA (21%):</span>
                      <span className="font-semibold">$ {ivaCompra.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 font-bold text-slate-800">
                      <span>Total Compra (con IVA):</span>
                      <span>$ {totalCompra.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <p className="text-xs font-bold text-amber-800 uppercase mb-2">b) Facturación al Cliente</p>
                    <div className="flex justify-between text-sm py-1 border-b border-amber-500/20">
                      <span className="text-slate-700">Precio con Fee ({porcentajeFee.toFixed(2)}%):</span>
                      <span className="font-bold text-slate-900">$ {precioVentaMaterial.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 border-b border-amber-500/20">
                      <span className="text-slate-700">IVA (21%):</span>
                      <span className="font-bold text-slate-900">$ {ivaVenta.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1 font-black text-amber-900">
                      <span>Total Facturado (con IVA):</span>
                      <span>$ {totalVenta.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800 uppercase mb-2">c) Desglose de Beneficio Bruto</p>
                    <div className="flex justify-between text-sm py-1 font-bold text-emerald-900">
                      <span>Beneficio Neto (Total con IVA - Total Compra):</span>
                      <span>$ {beneficioNetoConIVA.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                    <p className="font-bold text-slate-700 uppercase mb-1">d) Gastos, Impuestos y Costos Financieros</p>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Impuesto a las Ganancias (35%):</span>
                      <span className="font-medium">$ {impuestoGanancias.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Diferencia I.V.A. (con IVA):</span>
                      <span className="font-medium">$ {diferenciaIVA.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Ingresos Brutos (5%):</span>
                      <span className="font-medium">$ {ingresosBrutos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Costo Financiero (10,8%):</span>
                      <span className="font-medium">$ {costoFinanciero.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200">
                      <span className="text-slate-600">Imp. Débitos y Créditos (1,2%):</span>
                      <span className="font-medium">$ {impuestoDebitosCreditos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 font-black text-sm text-slate-900 bg-amber-500/20 px-2 rounded-lg mt-2">
                      <span>TOTAL BENEFICIO REAL:</span>
                      <span className="text-emerald-700">$ {totalBeneficio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTabDetalle === 'horas' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
              <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">1. Mano de Obra — Valores por Hora (HH) y Ajustes Aplicados</h2>
                  <p className="text-slate-500 text-sm">Valores base iniciales y columnas sucesivas por cada mes en que se aplicó el reajuste polinómico.</p>
                </div>
                {ajustesAplicados.length > 0 && (
                  <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{ajustesAplicados.length} Ajuste(s) Aplicado(s)</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-4">Código</th>
                      <th className="p-4">Tópico</th>
                      <th className="p-4 text-right bg-slate-100 text-slate-800">ARS / HR (Base)</th>
                      {ajustesAplicados.map((aj, aIdx) => (
                        <th key={aIdx} className="p-4 text-right bg-amber-500/10 text-slate-900 border-l border-amber-200">
                          ARS/HR - {aj.mes} <span className="block text-[10px] text-amber-700 font-bold">(+{aj.cicloAcumulado.toFixed(2)}%)</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manoDeObraBase.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-4 font-mono text-slate-600">{item.codigo}</td>
                        <td className="p-4 font-semibold text-slate-800">{item.topico}</td>
                        <td className="p-4 text-right font-medium text-slate-600 bg-slate-50/50">
                          $ {item.ars.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        {ajustesAplicados.map((aj, aIdx) => {
                          const valorAjustado = item.ars * aj.indice;
                          return (
                            <td key={aIdx} className="p-4 text-right font-bold text-slate-900 bg-amber-500/5 border-l border-amber-200">
                              $ {valorAjustado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-4">
              <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">2. Aplicación de Reajuste por Umbral (&gt; 5%)</h2>
                  <p className="text-slate-500 text-sm">Cuando un periodo supera el 5% acumulado, active el botón Aplicar para oficializar los nuevos valores en el certificado mensual.</p>
                </div>
              </div>

              {mesPendienteAplicar ? (
                <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Ajuste pendiente para el período: {mesPendienteAplicar.mes}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">El ciclo acumulado alcanzó <strong>+{mesPendienteAplicar.cicloAcumulado.toFixed(2)}%</strong>. Haga clic en aplicar para actualizar las horas hombre del certificado.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => aplicarAjustePendiente(mesPendienteAplicar)}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aplicar Ajuste
                  </button>
                </div>
              ) : ajustesAplicados.length > 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Todos los reajustes requeridos han sido aplicados correctamente. Hay <strong>{ajustesAplicados.length}</strong> ajuste(s) registrado(s).</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>No hay umbrales pendientes de aplicar (&gt; 5%). Cuando se supere el 5% en la pestaña de fórmula polinómica, aparecerá el botón de aplicación aquí.</span>
                </div>
              )}

              {ajustesAplicados.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Ajustes Aplicados</h3>
                  <div className="space-y-2">
                    {ajustesAplicados.map((aj, aIdx) => (
                      <div key={aIdx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-700 font-bold flex items-center justify-center text-xs">{aIdx + 1}</span>
                          <div>
                            <strong className="text-slate-800">{aj.mes}</strong>
                            <span className="text-xs text-slate-500 ml-2">(Índice de reajuste: <strong className="text-amber-600 font-mono">+{aj.cicloAcumulado.toFixed(2)}%</strong>)</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => eliminarAjusteAplicado(aIdx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar Ajuste Aplicado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {subTabDetalle === 'polinomica' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
              <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">Determinación de Fórmula Polinómica (Mes a Mes)</h2>
                  <p className="text-slate-500 text-sm">Variación respecto al mes anterior. Al superar el 5% acumulado en el ciclo, se aplica el índice, se traza línea y el acumulado del ciclo vuelve a 0.</p>
                </div>
                <div className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border shadow-sm',
                  polinomioAcumuladoTotal > 5 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                )}>
                  <TrendingUp className="w-4 h-4" />
                  <span>Variación Total: {polinomioAcumuladoTotal.toFixed(2)}%</span>
                </div>
              </div>

              <form onSubmit={agregarMesPolinomica} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Periodo / Mes</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Mes 4 - Octubre 2026" 
                    required
                    value={nuevoMes.mes}
                    onChange={(e) => setNuevoMes({...nuevoMes, mes: e.target.value})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">U.O.C.R.A. (Salario $)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={nuevoMes.uocra}
                    onChange={(e) => setNuevoMes({...nuevoMes, uocra: Number(e.target.value)})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">IPC Nac. (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={nuevoMes.ipc}
                    onChange={(e) => setNuevoMes({...nuevoMes, ipc: Number(e.target.value)})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dólar BNA ($/u$s)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={nuevoMes.dolar}
                    onChange={(e) => setNuevoMes({...nuevoMes, dolar: Number(e.target.value)})}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-10"
                >
                  <Plus className="w-4 h-4" /> Agregar Mes
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="p-4">Período</th>
                      <th className="p-4 text-center">U.O.C.R.A. (80%)</th>
                      <th className="p-4 text-center">IPC Nac. (10%)</th>
                      <th className="p-4 text-center">Dólar BNA (10%)</th>
                      <th className="p-4 text-right bg-amber-500/10 text-slate-900">Polinómica del Mes</th>
                      <th className="p-4 text-right bg-slate-100 text-slate-900">Acumulado Ciclo</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mesesProcesados.map((reg, idx) => {
                      const esBase = idx === 0;

                      return (
                        <>
                          <tr key={idx} className={cn("hover:bg-slate-50", reg.reajusteAplicado && "bg-red-50/40")}>
                            <td className="p-4 font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                <input 
                                  type="text"
                                  value={reg.mes}
                                  onChange={(e) => actualizarCeldaMes(idx, 'mes', e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 focus:outline-none font-bold text-slate-800 w-56 text-xs px-1 py-0.5"
                                  placeholder="Ej: Mes 2 - Agosto 2026"
                                />
                                {esBase && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded shrink-0">BASE</span>}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number"
                                step="0.01"
                                value={reg.uocra}
                                onChange={(e) => actualizarCeldaMes(idx, 'uocra', Number(e.target.value))}
                                className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-semibold focus:outline-none focus:border-amber-500 mx-auto"
                              />
                              {!esBase && (
                                <span className="block text-[11px] font-bold text-amber-700 mt-0.5">
                                  ({reg.varUocra >= 0 ? '+' : ''}{reg.varUocra.toFixed(2)}%)
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number"
                                step="0.01"
                                value={reg.ipc}
                                onChange={(e) => actualizarCeldaMes(idx, 'ipc', Number(e.target.value))}
                                className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-semibold focus:outline-none focus:border-amber-500 mx-auto"
                              />
                              {!esBase && (
                                <span className="block text-[11px] font-bold text-amber-700 mt-0.5">
                                  (+{Number(reg.ipc).toFixed(2)}%)
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <input 
                                type="number"
                                step="0.01"
                                value={reg.dolar}
                                onChange={(e) => actualizarCeldaMes(idx, 'dolar', Number(e.target.value))}
                                className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-center font-semibold focus:outline-none focus:border-amber-500 mx-auto"
                              />
                              {!esBase && (
                                <span className="block text-[11px] font-bold text-amber-700 mt-0.5">
                                  ({reg.varDolar >= 0 ? '+' : ''}{reg.varDolar.toFixed(2)}%)
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right font-semibold text-slate-800 bg-amber-500/5">
                              {esBase ? '0.00%' : `+${reg.poliMes.toFixed(2)}%`}
                            </td>
                            <td className={cn('p-4 text-right font-bold bg-slate-50', reg.cicloAcumulado > 5 ? 'text-red-600' : 'text-slate-900')}>
                              {esBase ? '0.00%' : `+${reg.cicloAcumulado.toFixed(2)}%`}
                            </td>
                            <td className="p-4 text-center">
                              {!esBase && (
                                <button 
                                  onClick={() => eliminarMesPolinomica(idx)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar Mes"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                          {reg.reajusteAplicado && (
                            <tr key={`reajuste-${idx}`} className="bg-red-500/10 border-t-2 border-b-2 border-red-500">
                              <td colSpan="7" className="py-2 px-4 text-center text-red-700 font-black text-xs tracking-wide">
                                ⚡ REAJUSTE APLICADO (&gt; 5%): Se alcanza umbral. Vaya a "Cálculo de Horas (HH)" para aplicar el reajuste oficial. (Acumulado Total: +{reg.acumuladoTotal.toFixed(2)}%)
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {subTabDetalle === 'general' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-black text-slate-800">Detalles del Contrato</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-400 block">Cliente</span>
                <strong className="text-slate-800">{contratoDetalle.cliente}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-xs text-slate-400 block">Ubicación / Planta</span>
                <strong className="text-slate-800">{contratoDetalle.ubicacion}</strong>
              </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <span className="text-xs text-slate-400 block mb-1">Descripción del Servicio</span>
              <p className="text-slate-700 text-sm">{contratoDetalle.descripcion || 'Sin descripción adicional.'}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-500" /> Contratos de Mantenimiento
          </h1>
          <p className="text-slate-500 text-sm">Gestión y control de contratos de servicios de mantenimiento para empresas.</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Contrato
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Borrador</p>
          <p className="text-3xl font-black text-slate-800">{totalBorrador}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Entregado</p>
          <p className="text-3xl font-black text-amber-600">{totalEntregado}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Activo</p>
          <p className="text-3xl font-black text-emerald-600">{totalActivo}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Finalizado</p>
          <p className="text-3xl font-black text-blue-600">{totalFinalizado}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Archivado</p>
          <p className="text-3xl font-black text-slate-600">{totalArchivado}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={() => setPestanaActiva('trabajo')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'trabajo' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Espacio de Trabajo (Borrador / Entregado)
          </button>
          <button 
            onClick={() => setPestanaActiva('activos')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'activos' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Activos
          </button>
          <button 
            onClick={() => setPestanaActiva('archivados')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'archivados' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Archivados / Finalizados
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Buscar contrato, cliente..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-4">Código</th>
                <th className="p-4">Nombre del Contrato</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Ubicación / Planta</th>
                <th className="p-4">Mes Base</th>
                <th className="p-4">Actualización</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No se encontraron contratos en esta sección.
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{c.codigo}</td>
                    <td className="p-4 font-semibold text-slate-800">{c.nombre_contrato || 'Sin Nombre'}</td>
                    <td className="p-4 text-slate-600">{c.cliente || '---'}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-1.5 pt-5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {c.ubicacion || '---'}
                    </td>
                    <td className="p-4 text-slate-600">{formatearMesBase(c.mes_base)}</td>
                    <td className="p-4 text-slate-600">{c.actualizacion || 'Polinómica'}</td>
                    <td className="p-4">
                      <select 
                        value={c.estado || 'Borrador'}
                        onChange={(e) => cambiarEstadoRapido(c.id, e.target.value)}
                        className={cn(
                          'text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer',
                          c.estado === 'Activo' && 'bg-emerald-50 text-emerald-600 border-emerald-200',
                          c.estado === 'Entregado' && 'bg-amber-50 text-amber-600 border-amber-200',
                          c.estado === 'Borrador' && 'bg-slate-100 text-slate-600 border-slate-200',
                          c.estado === 'Finalizado' && 'bg-blue-50 text-blue-600 border-blue-200',
                          c.estado === 'Archivado' && 'bg-slate-200 text-slate-700 border-slate-300',
                        )}
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Activo">Activo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Archivado">Archivado</option>
                      </select>
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button 
                        onClick={() => setContratoDetalle(c)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Ver Detalles y Cálculos"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => abrirModalEditar(c)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => eliminarContrato(c.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg">
                {contratoEditando ? 'Editar Contrato de Mantenimiento' : 'Nuevo Contrato de Mantenimiento'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarContrato} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código (Automático)</label>
                  <input 
                    type="text" 
                    disabled
                    value={formData.codigo}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Inicial</label>
                  <select 
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Activo">Activo</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Archivado">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Contrato</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Mantenimiento Preventivo de Planta..."
                  value={formData.nombre_contrato}
                  onChange={(e) => setFormData({...formData, nombre_contrato: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                  <select 
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((cli, idx) => {
                      const nombreCli = cli.nombre || cli.razon_social || cli.cliente || `Cliente #${idx + 1}`;
                      return (
                        <option key={idx} value={nombreCli}>{nombreCli}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ubicación / Planta Industrial</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Planta Benavidez / Sector A..."
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción del Servicio (Detalles)</label>
                <textarea 
                  rows="2"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Detalles y alcances del mantenimiento..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mes Base</label>
                  <input 
                    type="text" 
                    value={formData.mes_base}
                    onChange={(e) => setFormData({...formData, mes_base: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Ej: Agosto-2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Actualización</label>
                  <select 
                    value={formData.actualizacion}
                    onChange={(e) => setFormData({...formData, actualizacion: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Polinómica">Polinómica</option>
                    <option value="Índice">Índice</option>
                    <option value="Fija">Fija</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargando}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold rounded-xl text-sm shadow-md cursor-pointer"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Contrato'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}