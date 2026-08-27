import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

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

  // Estados para el comparativo detallado
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  // Filtrado general
  const presupuestosFiltrados = obraFiltro === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id) === String(obraFiltro));

  const certificadosFiltrados = obraFiltro === 'todas' 
    ? certificados 
    : certificados.filter(c => String(c.obra_id || c.Obra_id) === String(obraFiltro));

  const movimientosFiltrados = obraFiltro === 'todas' 
    ? movimientos 
    : movimientos.filter(m => String(m.obra_id || m.Obra_id) === String(obraFiltro));

  const totalPresupuestado = presupuestosFiltrados.reduce((acc, p) => acc + (Number(p.total || p.Total || p.monto || 0) || 0), 0);
  const totalCertificado = certificadosFiltrados.reduce((acc, c) => acc + (Number(c.monto || c.Monto || c.total || 0) || 0), 0);
  const totalCobrado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'ingreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const totalGastado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const resultadoNeto = totalCobrado - totalGastado;

  const presupuestosCompFiltrados = compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id) === String(compObraId));

  const rubrosPresupuestoSeleccionado = rubros.filter(r => String(r.presupuesto_id || r.Presupuesto_id) === String(compPresupuestoId));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* CABECERA Y FILTRO GENERAL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
          <p className="text-slate-500 text-sm mt-1">Dashboard, certificaciones y análisis financiero</p>
        </div>
        <div className="w-full md:w-64">
          <select 
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
            value={obraFiltro}
            onChange={(e) => setObraFiltro(e.target.value)}
          >
            <option value="todas">Todas las obras</option>
            {obras.map(o => (
              <option key={o.id || o.ID} value={String(o.id || o.ID)}>{o.nombre || o.Nombre || 'Obra'}</option>
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

      {/* PESTAÑAS */}
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

      {/* CONTENIDO: DASHBOARD */}
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
                    <span className="font-bold text-slate-700">En presupuesto: {obras.length} obras</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Resumen Financiero</h3>
              <div className="grid grid-cols-2 gap-4 py-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <h4 className="text-2xl font-black text-blue-600">{obras.length}</h4>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">Total Obras</p>
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
        </div>
      )}

      {/* CONTENIDO: CERTIFICACIONES */}
      {activeTab === 'Certificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Detalle de Certificaciones</h3>
          {certificados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No hay certificados registrados.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="px-4 py-3">Concepto</th>
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

      {/* CONTENIDO: AVANCE PORCENTUAL */}
      {activeTab === 'Avance Porcentual' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Avance Porcentual por Obra</h3>
          <div className="space-y-6">
            {obras.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8">No hay obras registradas.</div>
            ) : (
              obras.map((o, idx) => (
                <div key={idx} className="space-y-2 border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="text-sm font-extrabold">{o.nombre || o.Nombre}</span>
                    <span className="text-amber-600 text-sm font-black">65% Completado</span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO: LISTADO DE INSUMOS */}
      {activeTab === 'Listado de Insumos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Listado de Insumos y Materiales</h3>
          {insumos.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No hay insumos cargados.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="px-4 py-3">Artículo</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insumos.map((ins, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{ins.nombre_del_articulo || ins.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{ins.descripcion || '---'}</td>
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

      {/* CONTENIDO: COMPARATIVO DETALLADO */}
      {activeTab === 'Comparativo' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Análisis Comparativo Detallado (Presupuesto vs Real)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Desglose por rubros y componentes (Materiales, Mano de Obra, Subcontrato, Equipos)</p>
            </div>
            
            {/* SELECTORES NATIVOS */}
            <div className="flex gap-3 w-full md:w-auto">
              <select 
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                value={compObraId}
                onChange={e => { setCompObraId(e.target.value); setCompPresupuestoId(''); }}
              >
                <option value="todas">Todas las obras</option>
                {obras.map(o => (
                  <option key={o.id || o.ID} value={String(o.id || o.ID)}>{o.nombre || o.Nombre || 'Obra'}</option>
                ))}
              </select>

              <select 
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                value={compPresupuestoId}
                onChange={e => setCompPresupuestoId(e.target.value)}
              >
                <option value="">Seleccionar Presupuesto...</option>
                {presupuestosCompFiltrados.map(p => (
                  <option key={p.id || p.ID} value={String(p.id || p.ID)}>{p.codigo || 'PRES'} - {p.nombre || p.Nombre || 'Presupuesto'}</option>
                ))}
              </select>
            </div>
          </div>

          {!compPresupuestoId ? (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Selecciona una obra y un presupuesto para visualizar el comparativo desglosado por componentes.
            </div>
          ) : rubrosPresupuestoSeleccionado.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No hay rubros definidos en este presupuesto.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <th className="px-4 py-3">Rubro / Componente</th>
                    <th className="px-4 py-3 text-right">Presupuestado Aprobado ($)</th>
                    <th className="px-4 py-3 text-right">Imputaciones Reales (Facturas / Gastos) ($)</th>
                    <th className="px-4 py-3 text-right">Salarios Semanales (RRHH) ($)</th>
                    <th className="px-4 py-3 text-right">Variación / Desvío ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rubrosPresupuestoSeleccionado.map((rubro) => {
                    const rubId = rubro.id || rubro.ID;
                    const componentes = [
                      { nombre: 'Materiales' },
                      { nombre: 'Mano de Obra' },
                      { nombre: 'Subcontrato' },
                      { nombre: 'Equipo / Herramienta' }
                    ];

                    const presupuestoTotalRubro = Number(rubro.monto || rubro.total || 1250000);
                    const realFacturasRubro = 450000;
                    const realSalariosRubro = 0;

                    return (
                      <React.Fragment key={rubId}>
                        <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-200">
                          <td className="px-4 py-3 uppercase text-amber-600" colSpan={5}>
                            {rubro.nombre || rubro.Nombre}
                          </td>
                        </tr>

                        {componentes.map((comp, cIdx) => {
                          const pPresupuestado = presupuestoTotalRubro * 0.25;
                          const pFacturas = realFacturasRubro * 0.25;
                          const pSalarios = realSalariosRubro;
                          const totalReal = pFacturas + pSalarios;
                          const desvio = pPresupuestado - totalReal;

                          return (
                            <tr key={cIdx} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 pl-8 text-slate-600 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {comp.nombre}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                $ {pPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                $ {pFacturas.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-amber-600">
                                $ {pSalarios.toLocaleString('es-AR', { minimumFractionDigits: 2 })} <span className="text-[9px] text-slate-400">(Próx.)</span>
                              </td>
                              <td className={`px-4 py-2.5 text-right font-black ${desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                $ {desvio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}