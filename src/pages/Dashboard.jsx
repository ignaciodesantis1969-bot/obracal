import React from 'react';
import { Users, Truck, Building2, Calculator, Loader2, FileText, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ 
  movimientos = [], 
  facturas = [], 
  obras = [], 
  presupuestos = [], 
  clientes = [], 
  proveedores = [], 
  loading = false 
}) {
  // Blindaje de arrays
  const safeObras = Array.isArray(obras) ? obras : [];
  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeProveedores = Array.isArray(proveedores) ? proveedores : [];
  const safePresupuestos = Array.isArray(presupuestos) ? presupuestos : [];
  const safeMovimientos = Array.isArray(movimientos) ? movimientos : [];

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" />
        <span className="text-sm text-slate-500 font-medium mt-2 block">Cargando resumen general...</span>
      </div>
    );
  }

  // Cálculos financieros basados en movimientos reales de Tesorería
  const totalIngresos = safeMovimientos.filter(m => String(m.tipo).toLowerCase() === 'ingreso').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const totalEgresos = safeMovimientos.filter(m => String(m.tipo).toLowerCase() === 'egreso').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const balance = totalIngresos - totalEgresos;

  // Conteo para las barras de Estado de Obras
  const enPresupuestoCount = safeObras.filter(o => String(o.estado || '').toLowerCase() === 'en presupuesto' || !o.estado).length;
  const adjudicadasCount = safeObras.filter(o => String(o.estado || '').toLowerCase() === 'adjudicadas').length;
  const enEjecucionCount = safeObras.filter(o => String(o.estado || '').toLowerCase() === 'en ejecución' || String(o.estado || '').toLowerCase() === 'en ejecucion').length;
  const finalizadasCount = safeObras.filter(o => String(o.estado || '').toLowerCase() === 'finalizadas').length;

  // Obtener las últimas 5 obras creadas
  const obrasRecientes = [...safeObras].reverse().slice(0, 5);

  // Cash Flow por mes para el gráfico
  const cashFlowData = () => {
    const byMonth = {};
    safeMovimientos.forEach(m => {
      const mes = m.fecha ? String(m.fecha).substring(0, 7) : 'N/A';
      if (!byMonth[mes]) byMonth[mes] = { mes, ingresos: 0, egresos: 0 };
      if (String(m.tipo).toLowerCase() === 'ingreso') byMonth[mes].ingresos += Number(m.monto) || 0;
      else byMonth[mes].egresos += Number(m.monto) || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* CABECERA */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Resumen general del sistema</p>
      </div>

      {/* TARJETAS SUPERIORES (Métricas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{safeClientes.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-600"></div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Proveedores</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{safeProveedores.length}</h3>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Obras Totales</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{safeObras.length}</h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600"></div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presupuestos</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{safePresupuestos.length}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Calculator className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TARJETAS FINANCIERAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ingresos</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{fmt(totalIngresos)}</h3>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><ArrowUpCircle className="w-5 h-5"/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Egresos</span>
            <h3 className="text-2xl font-black text-red-600 mt-1">{fmt(totalEgresos)}</h3>
          </div>
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600"><ArrowDownCircle className="w-5 h-5"/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Balance</span>
            <h3 className={`text-2xl font-black mt-1 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(balance)}</h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}><Wallet className="w-5 h-5"/></div>
        </div>
      </div>

      {/* SECCIÓN GRÁFICOS Y ESTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Estado de Obras */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-800 text-sm">Estado de Obras</h3>
          <div className="h-56 flex items-end justify-around pt-6 pb-2 border-b border-slate-200 px-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{enPresupuestoCount}</span>
              <div className="w-16 bg-amber-500 rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(enPresupuestoCount * 25, 8)}px` }}></div>
              <span className="text-[11px] font-semibold text-slate-500">En Presupuesto</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{adjudicadasCount}</span>
              <div className="w-16 bg-blue-500 rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(adjudicadasCount * 25, 8)}px` }}></div>
              <span className="text-[11px] font-semibold text-slate-500">Adjudicadas</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{enEjecucionCount}</span>
              <div className="w-16 bg-indigo-500 rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(enEjecucionCount * 25, 8)}px` }}></div>
              <span className="text-[11px] font-semibold text-slate-500">En Ejecución</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{finalizadasCount}</span>
              <div className="w-16 bg-emerald-500 rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(finalizadasCount * 25, 8)}px` }}></div>
              <span className="text-[11px] font-semibold text-slate-500">Finalizadas</span>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="font-extrabold text-slate-800 text-sm mb-4">Cash Flow (últimos meses)</h3>
          {cashFlowData().length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs italic">
              No hay movimientos registrados
            </div>
          ) : (
            <ResponsiveContainer width="100%\" height={200}>
              <BarChart data={cashFlowData()} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div></div>
        </div>

      </div>

      {/* OBRAS RECIENTES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-extrabold text-slate-800 text-sm">Obras Recientes</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {obrasRecientes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No hay obras recientes registradas.</div>
          ) : (
            obrasRecientes.map((obra, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{obra.nombre || obra.nombre_obra || 'Sin nombre'}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{obra.codigo || 'S/C'} {obra.ubicacion ? `• ${obra.ubicacion}` : ''}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[10px] uppercase">
                  {obra.estado || 'en presupuesto'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}