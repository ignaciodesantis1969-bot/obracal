import React, { useState } from 'react';
import { Plus, Calendar, FileText, ArrowUpRight, ArrowDownLeft, Wallet, Search, Trash2, X, CheckCircle2, Edit2, BarChart3 } from 'lucide-react';

export default function Tesoreria({ 
  GOOGLE_SCRIPT_URL, 
  movimientos = [], 
  facturas = [], 
  proveedores = [], 
  obras = [], 
  cargarDatos 
}) {
  const [activeTab, setActiveTab] = useState('movimientos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Nuevo/Editar Movimiento
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    tipo: 'Egreso',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    monto: 0,
    medio_pago: 'transferencia',
    referencia: '',
    facturas_aplicadas: [
      { id: Date.now(), factura_id: '', monto: 0 }
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
          const facEncontrada = facturas.find(f => String(f.id || f.ID) === String(valor));
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

  const handleGuardarMovimiento = async (e) => {
    e.preventDefault();
    try {
      const action = editingId ? 'update' : 'create';
      const payloadData = {
        ...formData,
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
        setIsModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar movimiento: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar el movimiento.");
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

  // Cálculos de Totales (KPIs)
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

  // Agrupaciones para Cash Flow Mensual y Anual
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

  // Cálculos robustos de IVA considerando todas las variantes de mayúsculas/minúsculas
  const totalIvaCompras = facturas.reduce((acc, f) => {
    const iva21 = Number(f.iva_21 || f.Iva_21 || f.IVA_21 || f.iva21 || f.IVA21 || 0);
    const iva105 = Number(f.iva_105 || f.Iva_105 || f.IVA_105 || f.iva105 || f.IVA105 || f['iva_10.5'] || 0);
    return acc + iva21 + iva105;
  }, 0);

  const totalIvaVentas = 0; 
  const posicionIva = totalIvaVentas - totalIvaCompras; // Negativo significa a favor (CF > DB)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tesorería</h1>
          <p className="text-slate-500 text-sm mt-1">Flujo de caja, IVA y movimientos</p>
        </div>
        <button onClick={() => {
          setEditingId(null);
          setFormData({
            tipo: 'Egreso',
            fecha: new Date().toISOString().split('T')[0],
            concepto: '',
            monto: 0,
            medio_pago: 'transferencia',
            referencia: '',
            facturas_aplicadas: [{ id: Date.now(), factura_id: '', monto: 0 }]
          });
          setIsModalOpen(true);
        }} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </button>
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
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('movimientos')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'movimientos' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}>Movimientos</button>
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
                  <th className="px-4 py-4">Referencia</th>
                  <th className="px-4 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientosFiltrados.map((m, index) => {
                  const tipo = String(m.tipo || m.Tipo || 'Egreso').toLowerCase();
                  const monto = Number(m.monto || m.Monto) || 0;
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
                      <td className="px-4 py-4 text-slate-600">{m.referencia || m.Referencia || '---'}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="bg-emerald-50/40 border border-emerald-200 p-6 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-emerald-700 uppercase">Posición IVA</p>
              <h3 className="text-2xl font-black text-emerald-700 mt-2">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
              <span className="text-[11px] text-slate-500 mt-1 block">{posicionIva <= 0 ? 'A favor (CF > DB)' : 'A pagar'}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-2">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase">Cálculo: Posición IVA = IVA Ventas – IVA Compras</h4>
            <p className="text-xs text-slate-600 font-mono">
              $ {totalIvaVentas.toLocaleString('es-AR', { minimumFractionDigits: 2 })} – $ {totalIvaCompras.toLocaleString('es-AR', { minimumFractionDigits: 2 })} = <span className="font-bold text-emerald-600">$ {Math.abs(posicionIva).toLocaleString('es-AR', { minimumFractionDigits: 2 })} (A favor)</span>
            </p>
          </div>
        </div>
      )}

      {/* MODAL NUEVO MOVIMIENTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nuevo Movimiento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleGuardarMovimiento} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo *</label>
                  <select required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase" value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Egreso">Egreso</option>
                    <option value="Ingreso">Ingreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha *</label>
                  <input type="date" required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto *</label>
                  <input type="text" required placeholder="Descripción del movimiento..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.concepto} onChange={(e) => setFormData({...formData, concepto: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto ($) *</label>
                  <input type="number" step="0.01" required className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-black text-amber-600 outline-none focus:border-amber-500" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Medio de Pago</label>
                  <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 uppercase" value={formData.medio_pago} onChange={(e) => setFormData({...formData, medio_pago: e.target.value})}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="cheque">Cheque</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Referencia</label>
                  <input type="text" placeholder="N° cheque, transferencia..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" value={formData.referencia} onChange={(e) => setFormData({...formData, referencia: e.target.value})} />
                </div>
              </div>

              {/* SECCIÓN DE APLICACIÓN A FACTURAS */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase text-slate-800">Aplicar a Facturas</h4>
                    <p className="text-[11px] text-slate-500">Asocia este movimiento a una o varias facturas (montos totales o parciales).</p>
                  </div>
                  <button type="button" onClick={handleAgregarFacturaFila} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors">
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
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500"
                              value={item.factura_id}
                              onChange={(e) => handleCambiarFacturaFila(item.id, 'factura_id', e.target.value)}
                            >
                              <option value="">Seleccionar factura...</option>
                              {facturas.map(f => {
                                const prov = proveedores.find(p => String(p.id || p.ID) === String(f.proveedor_id || f.Proveedor_id));
                                return (
                                  <option key={f.id || f.ID} value={f.id || f.ID}>
                                    {f.codigo || 'FAC'} - {prov?.razon_social || prov?.nombre || 'Proveedor'} ($ {Number(f.total || 0).toLocaleString('es-AR')})
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input 
                              type="number" 
                              step="0.01" 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500" 
                              value={item.monto} 
                              onChange={(e) => handleCambiarFacturaFila(item.id, 'monto', e.target.value)} 
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={() => handleQuitarFacturaFila(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}