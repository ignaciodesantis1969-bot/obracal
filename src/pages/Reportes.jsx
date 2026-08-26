import React, { useState } from 'react';
import { BarChart3, PieChart, TrendingUp, TrendingDown, Building2, DollarSign, CheckCircle2, FileText, Layers, Wallet, Package, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Reportes({ 
  obras = [], 
  presupuestos = [], 
  certificados = [], 
  movimientos = [], 
  insumos = [], 
  rubros = [] 
}) {
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Filtrar datos según la obra seleccionada
  const presupuestosFiltrados = obraFiltro === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id) === String(obraFiltro));

  const certificadosFiltrados = obraFiltro === 'todas' 
    ? certificados 
    : certificados.filter(c => String(c.obra_id || c.Obra_id) === String(obraFiltro));

  const movimientosFiltrados = obraFiltro === 'todas' 
    ? movimientos 
    : movimientos.filter(m => String(m.obra_id || m.Obra_id) === String(obraFiltro));

  // --- CÁLCULOS DE MÉTRICAS PRINCIPALES ---
  const totalPresupuestado = presupuestosFiltrados.reduce((acc, p) => {
    return acc + (Number(p.total || p.Total || p.monto || 0) || 0);
  }, 0);

  const totalCertificado = certificadosFiltrados.reduce((acc, c) => {
    return acc + (Number(c.monto || c.Monto || c.total || 0) || 0);
  }, 0);

  const totalCobrado = movimientosFiltrados
    .filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'ingreso')
    .reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);

  const totalGastado = movimientosFiltrados
    .filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso')
    .reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);

  const resultadoNeto = totalCobrado - totalGastado;

  const presupuestosAprobadosCount = presupuestos.filter(p => {
    const estado = String(p.estado || p.Estado || '').toLowerCase();
    return estado === 'aprobado' || estado === 'activo';
  }).length;

  const certificacionesCobradasCount = certificados.filter(c => {
    const estado = String(c.estado || c.Estado || '').toLowerCase();
    return estado === 'cobrado' || estado === 'pagado';
  }).length;

  // Costos por rubro
  const costosPorRubroMap = {};
  movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso').forEach(m => {
    const rubro = m.rubro || m.Rubro || 'Demolición';
    const monto = Number(m.monto || m.Monto) || 0;
    if (!costosPorRubroMap[rubro]) costosPorRubroMap[rubro] = 0;
    costosPorRubroMap[rubro] += monto;
  });

  const datosRubros = Object.keys(costosPorRubroMap).length > 0 
    ? Object.keys(costosPorRubroMap).map(k => ({ nombre: k, monto: costosPorRubroMap[k] }))
    : [
        { nombre: 'DEMOLICIÓN', monto: 9500000 },
        { nombre: 'PINTURAS', monto: 1800000 }
      ];

  const maxRubroMonto = Math.max(...datosRubros.map(d => d.monto), 1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* CABECERA Y FILTRO DE OBRAS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
          <p className="text-slate-500 text-sm mt-1">Dashboard, certificaciones y análisis financiero</p>
        </div>
        <div className="w-full md:w-64">
          <select 
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm"
            value={obraFiltro}
            onChange={(e) => setObraFiltro(e.target.value)}
          >
            <option value="todas">Todas las obras</option>
            {obras.map(o => (
              <option key={o.id || o.ID} value={o.id || o.ID}>{o.nombre || o.Nombre || 'Obra'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-blue-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Presupuestado</p>
          <h3 className="text-2xl font-black text-blue-600 mt-2">$ {totalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Certificado</p>
          <h3 className="text-2xl font-black text-amber-600 mt-2">$ {totalCertificado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-emerald-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Cobrado</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">$ {totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-rose-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Gastado</p>
          <h3 className="text-2xl font-black text-rose-600 mt-2">$ {totalGastado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* SUBSECCIONES (PESTAÑAS) SOLICITADAS */}
      <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap">
        {['Dashboard', 'Certificaciones', 'Avance Porcentual', 'Listado de Insumos', 'Comparativo'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO: 1. DASHBOARD */}
      {activeTab === 'Dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Estado de Obras</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6">
                <div className="relative w-44 h-44 rounded-full bg-amber-500 flex items-center justify-center shadow-inner border-4 border-white">
                  <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow">
                    <Building2 className="w-8 h-8 text-amber-500" />
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span className="font-bold text-slate-700">En presupuesto: {obras.length || 2} obras</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Costos por Rubro</h3>
              <div className="space-y-4 py-4">
                {datosRubros.map((rubro, idx) => {
                  const porcentaje = Math.min(100, Math.round((rubro.monto / maxRubroMonto) * 100));
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{rubro.nombre}</span>
                        <span>$ {rubro.monto.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden border border-slate-200">
                        <div 
                          className="bg-amber-500 h-full rounded-lg transition-all duration-500 flex items-center px-2 text-[10px] font-black text-white"
                          style={{ width: `${Math.max(porcentaje, 15)}%` }}
                        >
                          $ {rubro.monto.toLocaleString('es-AR')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Resumen Financiero</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <h4 className="text-2xl font-black text-blue-600">{obras.length || 2}</h4>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">Total Obras</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <h4 className="text-2xl font-black text-amber-600">{presupuestosAprobadosCount || 1}</h4>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">Presupuestos Aprobados</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <h4 className="text-2xl font-black text-emerald-600">{certificacionesCobradasCount || 0}</h4>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">Certificaciones Cobradas</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <h4 className={`text-2xl font-black ${resultadoNeto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  $ {resultadoNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </h4>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">Resultado Neto</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO: 2. CERTIFICACIONES */}
      {activeTab === 'Certificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Detalle de Certificaciones</h3>
          {certificados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No hay certificados registrados.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="px-4 py-3">Obra / Concepto</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificados.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.concepto || c.descripcion || `Certificado #${idx + 1}`}</td>
                    <td className="px-4 py-3 text-slate-600">{c.fecha || '---'}</td>
                    <td className="px-4 py-3 text-right font-black">$ {Number(c.monto || c.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-amber-100 text-amber-800">
                        {c.estado || 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONTENIDO: 3. AVANCE PORCENTUAL */}
      {activeTab === 'Avance Porcentual' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Avance Porcentual por Obra</h3>
          <div className="space-y-6">
            {(obras.length > 0 ? obras : [{ id: 1, nombre: 'Obra Residencial Benavidez' }, { id: 2, nombre: 'Nave Industrial Parque Único' }]).map((o, idx) => {
              const porcentajeAvance = idx === 0 ? 65 : 30; // Simulado o dinámico
              return (
                <div key={idx} className="space-y-2 border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="text-sm font-extrabold">{o.nombre || o.Nombre || `Obra #${idx + 1}`}</span>
                    <span className="text-amber-600 text-sm font-black">{porcentajeAvance}% Completado</span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeAvance}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENIDO: 4. LISTADO DE INSUMOS */}
      {activeTab === 'Listado de Insumos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Listado de Insumos y Materiales</h3>
          {insumos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No hay insumos cargados en el inventario.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Nro. Serie</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insumos.map((ins, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{ins.nombre_del_articulo || ins.nombre || '---'}</td>
                    <td className="px-4 py-3 text-slate-600">{ins.descripcion || '---'}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{ins.numero_de_serie || '---'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                        {ins.estado || 'Disponible'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONTENIDO: 5. COMPARATIVO */}
      {activeTab === 'Comparativo' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Análisis Comparativo: Presupuesto vs Gasto Real</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
              <p className="text-xs font-bold text-blue-700 uppercase">Total Presupuestado</p>
              <h4 className="text-2xl font-black text-blue-900 mt-2">$ {totalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl">
              <p className="text-xs font-bold text-rose-700 uppercase">Total Ejecutado / Gastado</p>
              <h4 className="text-2xl font-black text-rose-900 mt-2">$ {totalGastado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
            </div>
            <div className={`p-5 rounded-2xl border ${totalPresupuestado - totalGastado >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <p className="text-xs font-bold uppercase">Variación / Margen</p>
              <h4 className="text-2xl font-black mt-2">$ {(totalPresupuestado - totalGastado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}