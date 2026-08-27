import React, { useState } from 'react';
import { Building2, Layers, ShieldCheck } from 'lucide-react';

export default function Reportes({ 
  obras = [], 
  presupuestos = [], 
  certificados = [], 
  movimientos = [], 
  insumos = [], 
  rubros = [],
  facturas = [],
  maestroTareasRubros = []
}) {
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Estados para el comparativo detallado
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  // Filtrado general de métricas superiores
  const presupuestosFiltrados = obraFiltro === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(obraFiltro));

  const certificadosFiltrados = obraFiltro === 'todas' 
    ? certificados 
    : certificados.filter(c => String(c.obra_id || c.Obra_id || c.obraId) === String(obraFiltro));

  const movimientosFiltrados = obraFiltro === 'todas' 
    ? movimientos 
    : movimientos.filter(m => String(m.obra_id || m.Obra_id || m.obraId) === String(obraFiltro));

  const totalPresupuestado = presupuestosFiltrados.reduce((acc, p) => acc + (Number(p.total || p.Total || p.monto || p.precio_venta || 0) || 0), 0);
  const totalCertificado = certificadosFiltrados.reduce((acc, c) => acc + (Number(c.monto || c.Monto || c.total || 0) || 0), 0);
  const totalCobrado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'ingreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const totalGastado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const resultadoNeto = totalCobrado - totalGastado;

  const presupuestosCompFiltrados = compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(compObraId));

  // Obtener presupuesto seleccionado para el comparativo
  const presupuestoSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(compPresupuestoId));
  
  // 1. Diccionario de Insumos basado estrictamente en el ID de la pestaña "Insumos"
  const insumosPorIdMap = {};
  if (Array.isArray(insumos)) {
    insumos.forEach(insGlobal => {
      const gId = String(insGlobal.id || insGlobal.ID || insGlobal.insumo_id || '').trim();
      if (gId) {
        const tipoOriginal = String(insGlobal.tipo || insGlobal.Tipo || 'Material').trim();
        let tipoNorm = 'Material';
        const tLower = tipoOriginal.toLowerCase();
        if (tLower.includes('mano')) tipoNorm = 'Mano de Obra';
        else if (tLower.includes('subcontrato')) tipoNorm = 'Subcontrato';
        else if (tLower.includes('equipo') || tLower.includes('maquinaria')) tipoNorm = 'Equipo/Maquinaria';
        else tipoNorm = 'Material';

        insumosPorIdMap[gId] = tipoNorm;
      }
    });
  }

  // 2. Diccionario Maestro de Tareas basado en ID de tarea y nombre (MaestroTareasRubros)
  const maestroTareasPorId = {};
  const maestroTareasPorNombre = {};
  if (Array.isArray(maestroTareasRubros)) {
    maestroTareasRubros.forEach(itemMaestro => {
      const mId = String(itemMaestro.id || itemMaestro.ID || '').trim();
      const mNombre = String(itemMaestro.tarea || itemMaestro.nombre || '').trim().toLowerCase();
      
      let insumosDetalleParsed = itemMaestro.insumos_detalle || itemMaestro.Insumos_detalle;
      if (typeof insumosDetalleParsed === 'string' && insumosDetalleParsed.trim()) {
        try { insumosDetalleParsed = JSON.parse(insumosDetalleParsed); } catch { insumosDetalleParsed = []; }
      }
      
      const arrayInsumos = Array.isArray(insumosDetalleParsed) ? insumosDetalleParsed : [];
      if (mId) maestroTareasPorId[mId] = arrayInsumos;
      if (mNombre) maestroTareasPorNombre[mNombre] = arrayInsumos;
    });
  }

  // Función para resolver el tipo de un insumo analizando su ID contra la pestaña Insumos
  const resolverTipoInsumo = (insumoItem) => {
    const insId = String(insumoItem.id || insumoItem.ID || insumoItem.insumo_id || '').trim();
    if (insId && insumosPorIdMap[insId]) {
      return insumosPorIdMap[insId];
    }
    // Fallback si el objeto ya trae el tipo especificado
    const t = String(insumoItem.tipo || insumoItem.Tipo || '').toLowerCase();
    if (t.includes('mano')) return 'Mano de Obra';
    if (t.includes('subcontrato')) return 'Subcontrato';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'Equipo/Maquinaria';
    return 'Material';
  };

  // Procesar rubros del presupuesto desde items_detalle
  let rubrosPresupuestoDetalle = [];
  let gastosGeneralesBase = [];
  let totalPresupuestoRubros = 0;
  let totalPresupuestoGG = 0;

  if (presupuestoSeleccionado && presupuestoSeleccionado.items_detalle) {
    try {
      const parsedDetalle = typeof presupuestoSeleccionado.items_detalle === 'string' 
        ? JSON.parse(presupuestoSeleccionado.items_detalle) 
        : presupuestoSeleccionado.items_detalle;
      
      if (parsedDetalle && parsedDetalle.rubros) {
        rubrosPresupuestoDetalle = parsedDetalle.rubros.map((rubroItem, rIdx) => {
          const tareasList = rubroItem.tareas || [];
          let totalRubro = 0;
          
          let acumuladorComponentes = {
            'Material': 0,
            'Mano de Obra': 0,
            'Subcontrato': 0,
            'Equipo/Maquinaria': 0
          };

          tareasList.forEach(tareaItem => {
            const costoTareaTotal = (Number(tareaItem.cantidad) || 1) * (Number(tareaItem.costo_unitario) || 0);
            totalRubro += costoTareaTotal;

            // Camino inverso por ID o Nombre hacia MaestroTareasRubros
            const tareaId = String(tareaItem.id || tareaItem.tarea_id || '').trim();
            const tareaNombreKey = String(tareaItem.tarea || '').trim().toLowerCase();

            let insumosDeLaTarea = tareaItem.insumos;
            if (typeof insumosDeLaTarea === 'string' && insumosDeLaTarea.trim()) {
              try { insumosDeLaTarea = JSON.parse(insumosDeLaTarea); } catch { insumosDeLaTarea = []; }
            }

            if (!Array.isArray(insumosDeLaTarea) || insumosDeLaTarea.length === 0) {
              if (tareaId && maestroTareasPorId[tareaId]) {
                insumosDeLaTarea = maestroTareasPorId[tareaId];
              } else if (tareaNombreKey && maestroTareasPorNombre[tareaNombreKey]) {
                insumosDeLaTarea = maestroTareasPorNombre[tareaNombreKey];
              } else {
                insumosDeLaTarea = [];
              }
            }

            if (Array.isArray(insumosDeLaTarea) && insumosDeLaTarea.length > 0) {
              let subtotalesIns = [];
              let sumaInsCosto = 0;

              insumosDeLaTarea.forEach(insumo => {
                const tipoNormalizado = resolverTipoInsumo(insumo);
                const costoIns = (Number(insumo.cantidad) || 1) * (Number(insumo.costo_unitario) || 0);
                subtotalesIns.push({ tipo: tipoNormalizado, costo: costoIns });
                sumaInsCosto += costoIns;
              });

              if (sumaInsCosto > 0) {
                const ratio = costoTareaTotal / sumaInsCosto;
                subtotalesIns.forEach(item => {
                  acumuladorComponentes[item.tipo] = (acumuladorComponentes[item.tipo] || 0) + (item.costo * ratio);
                });
              } else {
                acumuladorComponentes['Material'] = (acumuladorComponentes['Material'] || 0) + costoTareaTotal;
              }
            } else {
              // Si la tarea no tiene insumos en absoluto, se asigna a Material por defecto
              acumuladorComponentes['Material'] = (acumuladorComponentes['Material'] || 0) + costoTareaTotal;
            }
          });

          totalPresupuestoRubros += totalRubro;

          const componentesActivos = Object.fromEntries(
            Object.entries(acumuladorComponentes).filter(([_, val]) => val > 0.01)
          );

          return {
            id: rIdx,
            nombre: rubroItem.rubro || `Rubro #${rIdx + 1}`,
            total: totalRubro,
            componentes: componentesActivos,
            tareas: tareasList
          };
        });
      }

      // Gastos Generales e Imprevistos
      if (parsedDetalle && parsedDetalle.comercial) {
        if (parsedDetalle.comercial.gastos_generales_insumos) {
          parsedDetalle.comercial.gastos_generales_insumos.forEach((gg, ggIdx) => {
            const cant = Number(gg.cantidad) || 1;
            const unit = Number(gg.unitario) || 0;
            const subtotalGG = cant * unit;
            totalPresupuestoGG += subtotalGG;
            gastosGeneralesBase.push({
              id: `gg-${ggIdx}`,
              concepto: gg.concepto || `Gasto General #${ggIdx + 1}`,
              cantidad: cant,
              unitario: unit,
              total: subtotalGG,
              esImprevistos: false
            });
          });
        }

        const porcentajeImprevistos = Number(parsedDetalle.comercial.porcentaje_imprevistos) || 0;
        const costoDirectoBase = Number(presupuestoSeleccionado.costo_directo) || totalPresupuestoRubros;
        const montoImprevistos = costoDirectoBase * (porcentajeImprevistos / 100);
        
        if (montoImprevistos > 0) {
          totalPresupuestoGG += montoImprevistos;
          gastosGeneralesBase.push({
            id: 'gg-imprevistos',
            concepto: `Imprevistos (${porcentajeImprevistos}% s/ CD)`,
            cantidad: 1,
            unitario: montoImprevistos,
            total: montoImprevistos,
            esImprevistos: true
          });
        }
      }
    } catch (e) {
      console.error("Error al procesar el presupuesto:", e);
    }
  }

  // Imputación real de facturas para Gastos Generales sin duplicaciones
  const facturasPresupuesto = facturas.filter(f => String(f.presupuesto_id || f.Presupuesto_id) === String(compPresupuestoId));
  
  let totalRealGGEspecifico = 0;
  let totalRealImprevistos = 0;

  const gastosGeneralesDetalle = gastosGeneralesBase.map(ggItem => {
    let realAsignado = 0;
    const conceptoLower = ggItem.concepto.toLowerCase();
    
    facturasPresupuesto.forEach(fac => {
      const provId = String(fac.proveedor_id || fac.Proveedor_id || '');
      const montoFac = Number(fac.total || 0);

      if (conceptoLower.includes('licenciado - (programa)') && provId === '1') {
        realAsignado += montoFac;
      } else if (conceptoLower.includes('visita obligatoria') && provId === '2') {
        realAsignado += montoFac;
      } else if (conceptoLower.includes('técnico') && provId === '6') {
        realAsignado += montoFac;
      } else if (conceptoLower.includes('ropa') && provId === '11') {
        realAsignado += montoFac;
      } else if (conceptoLower.includes('epp') && provId === '14') {
        realAsignado += montoFac;
      } else if (ggItem.esImprevistos) {
        if (!['1', '2', '6', '11', '14'].includes(provId)) {
          realAsignado += montoFac;
        }
      }
    });

    if (ggItem.esImprevistos) {
      totalRealImprevistos += realAsignado;
    } else {
      totalRealGGEspecifico += realAsignado;
    }

    return {
      ...ggItem,
      real: realAsignado,
      desvio: ggItem.total - realAsignado
    };
  });

  const totalRealRubros = 0;
  const granTotalPresupuestado = totalPresupuestoRubros + totalPresupuestoGG;
  const granTotalReal = totalRealRubros + totalRealGGEspecifico + totalRealImprevistos;

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
              <p className="text-xs text-slate-500 mt-0.5">Desglose por rubros, gastos generales y componentes reales</p>
            </div>
            
            {/* SELECTORES DE OBRA Y PRESUPUESTO */}
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
              Selecciona una obra y un presupuesto para visualizar el comparativo desglosado.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <th className="px-4 py-3">Rubro / Componente / Gastos Generales</th>
                    <th className="px-4 py-3 text-right">Presupuestado Aprobado ($)</th>
                    <th className="px-4 py-3 text-right">Imputaciones Reales (Facturas) ($)</th>
                    <th className="px-4 py-3 text-right">Salarios Semanales (RRHH) ($)</th>
                    <th className="px-4 py-3 text-right">Variación / Desvío ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* SECCIÓN 1: RUBROS CON SUS COMPONENTES REALES */}
                  {rubrosPresupuestoDetalle.map((rubro) => {
                    const componentesEntradas = Object.entries(rubro.componentes);
                    const realFacturasRubro = 0;

                    return (
                      <React.Fragment key={`rub-${rubro.id}`}>
                        <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-200">
                          <td className="px-4 py-3 uppercase text-amber-600 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-500" />
                            {rubro.nombre}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            $ {rubro.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-700">
                            $ {realFacturasRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">
                            $ 0,00 <span className="text-[9px] text-slate-400">(Próx.)</span>
                          </td>
                          <td className={`px-4 py-3 text-right font-black ${rubro.total - realFacturasRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            $ {(rubro.total - realFacturasRubro).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {componentesEntradas.map(([compNombre, montoComp], cIdx) => {
                          const desvioComp = montoComp;

                          return (
                            <tr key={cIdx} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 pl-8 text-slate-600 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {compNombre}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                $ {montoComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-700">$ 0,00</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-amber-600">$ 0,00</td>
                              <td className="px-4 py-2.5 text-right font-black text-emerald-600">
                                $ {desvioComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* SECCIÓN 2: GASTOS GENERALES E IMPREVISTOS */}
                  {gastosGeneralesDetalle.length > 0 && (
                    <React.Fragment>
                      <tr className="bg-amber-50 font-extrabold text-slate-900 border-t-2 border-amber-200">
                        <td className="px-4 py-3 uppercase text-amber-800 flex items-center gap-2" colSpan={1}>
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          GASTOS GENERALES (SEGURIDAD E HIGIENE / EPP / ROPA / IMPREVISTOS)
                        </td>
                        <td className="px-4 py-3 text-right font-black text-amber-900">
                          $ {totalPresupuestoGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-700">
                          $ {(totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-600">$ 0,00</td>
                        <td className={`px-4 py-3 text-right font-black ${totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          $ {(totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>

                      {gastosGeneralesDetalle.map((ggItem) => {
                        const realItemGG = ggItem.real || 0;
                        const desvioGG = ggItem.desvio !== undefined ? ggItem.desvio : (ggItem.total - realItemGG);

                        return (
                          <tr key={ggItem.id} className="hover:bg-amber-50/50">
                            <td className="px-4 py-2.5 pl-8 text-slate-700 font-medium flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              {ggItem.concepto} {!ggItem.esImprevistos && `(Cant: ${ggItem.cantidad})`}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                              $ {ggItem.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                              $ {realItemGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-amber-600">$ 0,00</td>
                            <td className={`px-4 py-2.5 text-right font-black ${desvioGG >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              $ {desvioGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  )}

                  {/* FILAS DE TOTALES AL PIE */}
                  <tr className="bg-slate-200 text-slate-900 font-extrabold border-t-2 border-slate-400">
                    <td className="px-4 py-3 uppercase">SUBTOTAL RUBROS</td>
                    <td className="px-4 py-3 text-right">$ {totalPresupuestoRubros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">$ 0,00</td>
                    <td className="px-4 py-3 text-right">$ 0,00</td>
                    <td className="px-4 py-3 text-right">$ {totalPresupuestoRubros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="bg-amber-200 text-amber-950 font-extrabold">
                    <td className="px-4 py-3 uppercase">TOTAL GASTOS GENERALES E IMPREVISTOS</td>
                    <td className="px-4 py-3 text-right">$ {totalPresupuestoGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">$ {(totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right">$ 0,00</td>
                    <td className="px-4 py-3 text-right">$ {(totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  </tr>

                  <tr className="bg-slate-900 text-white font-black text-sm">
                    <td className="px-4 py-4 uppercase">GRAN TOTAL GENERAL</td>
                    <td className="px-4 py-4 text-right">$ {granTotalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-right">$ {granTotalReal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-right">$ 0,00</td>
                    <td className={`px-4 py-4 text-right ${granTotalPresupuestado - granTotalReal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      $ {(granTotalPresupuestado - granTotalReal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}