import React, { useState, useMemo } from 'react';
import { Building2, Layers, ShieldCheck, Filter, List, Package } from 'lucide-react';

export default function Reportes(props) {
  const obras = props.obras || props.Obras || [];
  const presupuestos = props.presupuestos || props.Presupuestos || [];
  const certificados = props.certificados || props.Certificados || [];
  const movimientos = props.movimientos || props.Movimientos || props.tesoreria || props.Tesoreria || [];
  const insumos = props.insumos || props.Insumos || [];
  const rubros = props.rubros || props.Rubros || [];
  const facturas = props.facturas || props.Facturas || [];
  const maestroTareasRubros = props.maestroTareasRubros || props.MaestroTareasRubros || props.maestro_tareas_rubros || [];

  const [obraFiltro, setObraFiltro] = useState('todas');
  const [activeTab, setActiveTab] = useState('Dashboard');

  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false);

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

  const presupuestosCompFiltrados = (compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(compObraId))
  ).filter(p => {
    const estadoBruto = p.estado_presupuesto || p.Estado_presupuesto || p.estado || p.Estado || '';
    const estadoLimpio = String(estadoBruto).toLowerCase().trim();
    return estadoLimpio === 'aprobado' || estadoLimpio === 'aprobada';
  });

  const presupuestoSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(compPresupuestoId));
  
  const insumosOficialMap = {};
  if (Array.isArray(insumos)) {
    insumos.forEach(insGlobal => {
      const gId = String(insGlobal.id || insGlobal.ID || insGlobal.insumo_id || '').trim();
      const tipoOriginal = String(insGlobal.tipo || insGlobal.Tipo || insGlobal.tipo_insumo || 'Material').trim().toLowerCase();
      if (gId) {
        let tipoNorm = 'Material';
        if (tipoOriginal.includes('mano')) tipoNorm = 'Mano de Obra';
        else if (tipoOriginal.includes('subcontrato')) tipoNorm = 'Subcontrato';
        else if (tipoOriginal.includes('equipo') || tipoOriginal.includes('maquinaria')) tipoNorm = 'Equipo/Maquinaria';
        insumosOficialMap[gId] = tipoNorm;
      }
    });
  }

  const limpiarTexto = (txt) => String(txt || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

  const maestroTareasMap = {};
  if (Array.isArray(maestroTareasRubros)) {
    maestroTareasRubros.forEach(itemMaestro => {
      const tareaRaw = itemMaestro.tarea || itemMaestro.nombre || itemMaestro.Tarea || '';
      const tareaKey = limpiarTexto(tareaRaw);
      let insumosDetalleParsed = itemMaestro.insumos_detalle || itemMaestro.Insumos_detalle || itemMaestro.insumos || [];
      if (typeof insumosDetalleParsed === 'string' && insumosDetalleParsed.trim()) {
        try { insumosDetalleParsed = JSON.parse(insumosDetalleParsed); } catch { insumosDetalleParsed = []; }
      }
      if (tareaKey && Array.isArray(insumosDetalleParsed)) {
        maestroTareasMap[tareaKey] = insumosDetalleParsed;
      }
    });
  }

  const buscarInsumosMaestro = (nombreTareaPresupuesto) => {
    const keyPres = limpiarTexto(nombreTareaPresupuesto);
    if (!keyPres) return [];
    if (maestroTareasMap[keyPres]) return maestroTareasMap[keyPres];
    for (const [mKey, mArr] of Object.entries(maestroTareasMap)) {
      if (keyPres.includes(mKey) || mKey.includes(keyPres)) return mArr;
    }
    return [];
  };

  const obtenerTipoInsumoInfalible = (insumoItem) => {
    const insId = String(insumoItem.id || insumoItem.ID || insumoItem.insumo_id || '').trim();
    if (insId && insumosOficialMap[insId]) return insumosOficialMap[insId];
    const t = String(insumoItem.tipo || insumoItem.Tipo || '').toLowerCase();
    if (t.includes('mano')) return 'Mano de Obra';
    if (t.includes('subcontrato')) return 'Subcontrato';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'Equipo/Maquinaria';
    return 'Material';
  };

  const presupuestoInsumosSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(insumoPresupuestoId));

  const { insumosPorRubro, insumosGenerales } = useMemo(() => {
    if (!presupuestoInsumosSeleccionado) return { insumosPorRubro: {}, insumosGenerales: {} };
    let itemsDetalle = [];
    try {
      const parsed = typeof presupuestoInsumosSeleccionado.items_detalle === 'string' 
        ? JSON.parse(presupuestoInsumosSeleccionado.items_detalle) 
        : presupuestoInsumosSeleccionado.items_detalle;
      itemsDetalle = parsed?.rubros || parsed || [];
    } catch (e) {
      itemsDetalle = [];
    }

    const porRubro = {};
    const general = { 'MANO DE OBRA': [], 'MATERIALES': [], 'SUBCONTRATOS': [], 'EQUIPOS / HERRAMIENTAS': [], 'OTROS': [] };

    itemsDetalle.forEach(rubroObj => {
      const nombreRubro = rubroObj.rubro || 'SIN RUBRO';
      if (!porRubro[nombreRubro]) {
        porRubro[nombreRubro] = { 'MANO DE OBRA': [], 'MATERIALES': [], 'SUBCONTRATOS': [], 'EQUIPOS / HERRAMIENTAS': [], 'OTROS': [] };
      }

      (rubroObj.tareas || []).forEach(tarea => {
        let insumosTarea = tarea.insumos;
        const cantTarea = Number(tarea.cantidad) || 1;
        const costoTarea = Number(tarea.costo_unitario) || 0;

        if (typeof insumosTarea === 'string' && insumosTarea.trim().startsWith('[')) {
          try { insumosTarea = JSON.parse(insumosTarea); } catch { insumosTarea = []; }
        }

        if (!Array.isArray(insumosTarea) || insumosTarea.length === 0) {
          const maestroInsumosEncontrados = buscarInsumosMaestro(tarea.tarea);
          if (Array.isArray(maestroInsumosEncontrados) && maestroInsumosEncontrados.length > 0) {
            insumosTarea = maestroInsumosEncontrados;
          }
        }

        if (Array.isArray(insumosTarea) && insumosTarea.length > 0) {
          insumosTarea.forEach(ins => {
            const tipoResuelto = obtenerTipoInsumoInfalible(ins);
            const categoriaOriginal = String(ins.tipo || ins.categoria || tipoResuelto).trim().toUpperCase();
            let catNormalizada = 'MATERIALES';
            if (categoriaOriginal.includes('MANO') || categoriaOriginal.includes('OBRA')) catNormalizada = 'MANO DE OBRA';
            else if (categoriaOriginal.includes('MAT')) catNormalizada = 'MATERIALES';
            else if (categoriaOriginal.includes('SUB')) catNormalizada = 'SUBCONTRATOS';
            else if (categoriaOriginal.includes('EQ') || categoriaOriginal.includes('HERR')) catNormalizada = 'EQUIPOS / HERRAMIENTAS';

            const cantIns = Number(ins.cantidad) || 1;
            const cUnitIns = Number(ins.costo_unitario) || Number(ins.costo) || costoTarea;
            const cantidadTotal = cantIns * cantTarea;
            const totalInsumo = cantidadTotal * cUnitIns;

            const itemProcesado = {
              rubro: nombreRubro,
              tarea: tarea.tarea || 'Sin tarea',
              nombre: ins.nombre || ins.nombre_del_articulo || ins.concepto || 'Insumo',
              unidad: ins.unidad || 'un',
              cantidad: cantidadTotal,
              costo_unitario: cUnitIns,
              total: totalInsumo
            };
            porRubro[nombreRubro][catNormalizada].push(itemProcesado);
            general[catNormalizada].push(itemProcesado);
          });
        }
      });
    });
    return { insumosPorRubro: porRubro, insumosGenerales: general };
  }, [presupuestoInsumosSeleccionado]);

  const ordenCategorias = ['MANO DE OBRA', 'MATERIALES', 'SUBCONTRATOS', 'EQUIPOS / HERRAMIENTAS', 'OTROS'];

  const movimientosRrhhPresupuesto = React.useMemo(() => {
    if (!compPresupuestoId) return [];
    return movimientos.filter(m => {
      const tipo = String(m.tipo || m.Tipo || '').toLowerCase();
      if (tipo !== 'egreso') return false;
      const concepto = String(m.concepto || m.Concepto || '');
      const referencia = String(m.referencia || m.Referencia || '');
      const mPresupuestoId = String(m.presupuesto_id || m.Presupuesto_id || '');
      const matchIdDirecto = mPresupuestoId && mPresupuestoId === String(compPresupuestoId);
      const matchTextoPresupuesto = concepto.includes(`Presupuesto: ${compPresupuestoId}`);
      const esRrhh = referencia.toUpperCase().includes('RRHH') || concepto.includes('Sueldos');
      return (matchIdDirecto || matchTextoPresupuesto) && esRrhh;
    });
  }, [movimientos, compPresupuestoId]);

  const obtenerSalariosPorRubro = (nombreRubro) => {
    let totalRubroRrhh = 0;
    movimientosRrhhPresupuesto.forEach(m => {
      const concepto = String(m.concepto || m.Concepto || '');
      const monto = Number(m.monto || m.Monto || 0);
      const regex = /\[Rubro:\s*(.*?)\s*-\s*[\d.]+%\s*\]/i;
      const match = concepto.match(regex);
      if (match && match[1]) {
        if (limpiarTexto(match[1].trim()) === limpiarTexto(nombreRubro)) {
          totalRubroRrhh += monto;
        }
      }
    });
    return totalRubroRrhh;
  };

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
          let acumuladorComponentes = { 'Material': 0, 'Mano de Obra': 0, 'Subcontrato': 0, 'Equipo/Maquinaria': 0 };

          tareasList.forEach(tareaItem => {
            const costoTareaTotal = (Number(tareaItem.cantidad) || 1) * (Number(tareaItem.costo_unitario) || 0);
            totalRubro += costoTareaTotal;
            acumuladorComponentes['Material'] = (acumuladorComponentes['Material'] || 0) + costoTareaTotal;
          });

          totalPresupuestoRubros += totalRubro;
          return {
            id: rIdx,
            nombre: rubroItem.rubro || `Rubro #${rIdx + 1}`,
            total: totalRubro,
            componentes: Object.fromEntries(Object.entries(acumuladorComponentes).filter(([_, val]) => val > 0.01)),
            tareas: tareasList
          };
        });
      }

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
      console.error(e);
    }
  }

  const facturasPresupuesto = facturas.filter(f => String(f.presupuesto_id || f.Presupuesto_id) === String(compPresupuestoId));
  
  // 🛡️ MOTOR DINÁMICO E INTELIGENTE DE GASTOS GENERALES E IMPREVISTOS
  let totalRealGGEspecifico = 0;
  let totalRealImprevistos = 0;
  const facturasAsignadasGG = new Set();

  const gastosGeneralesDetalle = gastosGeneralesBase.map(ggItem => {
    let realAsignado = 0;
    const conceptoClean = limpiarTexto(ggItem.concepto);

    if (!ggItem.esImprevistos) {
      facturasPresupuesto.forEach((fac, fIdx) => {
        const tipoInsFac = limpiarTexto(fac.tipo_insumo || fac.Tipo_insumo || fac.renglon || fac.Renglon || '');
        const rubroFac = limpiarTexto(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || '');
        const montoFac = Number(fac.subtotal || fac.Subtotal || 0);

        const match = tipoInsFac.includes(conceptoClean) || conceptoClean.includes(tipoInsFac) || rubroFac.includes(conceptoClean);
        
        if (match && !facturasAsignadasGG.has(fIdx)) {
          realAsignado += montoFac;
          facturasAsignadasGG.add(fIdx);
        }
      });
      totalRealGGEspecifico += realAsignado;
    }

    return {
      ...ggItem,
      real: realAsignado,
      desvio: ggItem.total - realAsignado
    };
  });

  // Asignación residual automática para Imprevistos
  const imprevistoItemIndex = gastosGeneralesDetalle.findIndex(g => g.esImprevistos);
  if (imprevistoItemIndex !== -1) {
    let realImprevistosCalc = 0;
    facturasPresupuesto.forEach((fac, fIdx) => {
      const rubroFac = limpiarTexto(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || '');
      const tipoInsFac = limpiarTexto(fac.tipo_insumo || fac.Tipo_insumo || fac.renglon || fac.Renglon || '');
      const montoFac = Number(fac.subtotal || fac.Subtotal || 0);

      const esDeGG = rubroFac.includes('gastos generales') || tipoInsFac.includes('gasto general') || tipoInsFac.includes('imprevisto');
      if (esDeGG && !facturasAsignadasGG.has(fIdx)) {
        realImprevistosCalc += montoFac;
        facturasAsignadasGG.add(fIdx);
      }
    });

    totalRealImprevistos = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].real = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].desvio = gastosGeneralesDetalle[imprevistoItemIndex].total - realImprevistosCalc;
  }

  const granTotalPresupuestado = totalPresupuestoRubros + totalPresupuestoGG;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
          <p className="text-slate-500 text-sm mt-1">Dashboard y análisis financiero</p>
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

      {activeTab === 'Dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Estado de Obras</h3>
            <div className="flex items-center justify-center gap-8 py-6">
              <div className="w-32 h-32 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-xl shadow">
                {obras.length} Obras
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
      )}

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
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-amber-100 text-amber-800">{c.estado || 'Pendiente'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

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

      {activeTab === 'Listado de Insumos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" /> Listado de Insumos por Presupuesto
            </h3>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                className="w-full sm:w-80 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                value={insumoPresupuestoId}
                onChange={(e) => setInsumoPresupuestoId(e.target.value)}
              >
                <option value="">-- Seleccionar Presupuesto --</option>
                {presupuestos.map(p => (
                  <option key={p.id || p.ID} value={String(p.id || p.ID)}>[{p.codigo || 'S/C'}] {p.nombre || p.Nombre}</option>
                ))}
              </select>
              {presupuestoInsumosSeleccionado && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => setVistaGeneralInsumos(false)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!vistaGeneralInsumos ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Rubro</button>
                  <button onClick={() => setVistaGeneralInsumos(true)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${vistaGeneralInsumos ? 'bg-white shadow-sm' : 'text-slate-500'}`}>General</button>
                </div>
              )}
            </div>
          </div>
          {!presupuestoInsumosSeleccionado ? (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">Selecciona un presupuesto arriba.</div>
          ) : vistaGeneralInsumos ? (
            <div className="space-y-6">
              {ordenCategorias.map(cat => {
                const lista = insumosGenerales[cat];
                if (!lista || lista.length === 0) return null;
                const totalCat = lista.reduce((acc, item) => acc + item.total, 0);
                return (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between items-center border-b pb-1">
                      <h5 className="text-xs font-black text-amber-600 uppercase">{cat} ({lista.length})</h5>
                      <span className="text-xs font-bold">$ {Math.round(totalCat).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <table className="w-full text-left text-xs border">
                      <thead><tr className="bg-slate-50 font-bold"><th className="p-2">Insumo</th><th className="p-2">Rubro</th><th className="p-2 text-right">Total</th></tr></thead>
                      <tbody>
                        {lista.map((ins, idx) => (
                          <tr key={idx} className="border-t hover:bg-slate-50">
                            <td className="p-2 font-bold">{ins.nombre}</td>
                            <td className="p-2 uppercase text-[11px]">{ins.rubro}</td>
                            <td className="p-2 text-right font-black">$ {Math.round(ins.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(insumosPorRubro).map(([nombreRubro, categorias]) => (
                <div key={nombreRubro} className="border rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-800 text-white px-6 py-3 font-extrabold text-xs uppercase">Rubro: {nombreRubro}</div>
                  <div className="p-6 space-y-4 bg-white">
                    {ordenCategorias.map(cat => {
                      const lista = categorias[cat];
                      if (!lista || lista.length === 0) return null;
                      return (
                        <div key={cat} className="space-y-1">
                          <h6 className="text-xs font-black text-amber-600 uppercase">{cat}</h6>
                          <table className="w-full text-left text-xs border">
                            <tbody>
                              {lista.map((ins, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2 font-bold">{ins.nombre}</td>
                                  <td className="p-2 text-right font-black">$ {Math.round(ins.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Comparativo' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Análisis Comparativo Detallado</h3>
            <div className="flex gap-3">
              <select className="border rounded-xl px-4 py-2 text-xs font-bold" value={compObraId} onChange={e => { setCompObraId(e.target.value); setCompPresupuestoId(''); }}>
                <option value="todas">Todas las obras</option>
                {obras.map(o => <option key={o.id || o.ID} value={String(o.id || o.ID)}>{o.nombre || o.Nombre}</option>)}
              </select>
              <select className="border rounded-xl px-4 py-2 text-xs font-bold" value={compPresupuestoId} onChange={e => setCompPresupuestoId(e.target.value)}>
                <option value="">Seleccionar Presupuesto...</option>
                {presupuestosCompFiltrados.map(p => <option key={p.id || p.ID} value={String(p.id || p.ID)}>{p.codigo} - {p.nombre}</option>)}
              </select>
            </div>
          </div>

          {!compPresupuestoId ? (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">Selecciona un presupuesto aprobado.</div>
          ) : (() => {
            let totalRealRubrosCalculado = 0;
            return (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase border-b">
                      <th className="px-4 py-3">Rubro / Componente / Gastos Generales</th>
                      <th className="px-4 py-3 text-right">Presupuestado ($)</th>
                      <th className="px-4 py-3 text-right">Facturas ($)</th>
                      <th className="px-4 py-3 text-right">RRHH ($)</th>
                      <th className="px-4 py-3 text-right">Desvío ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rubrosPresupuestoDetalle.map((rubro) => {
                      const realFacturasRubro = facturasPresupuesto
                        .filter(fac => {
                          const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || '').trim();
                          if (rFac.toLowerCase().includes('gastos generales')) return false;
                          return limpiarTexto(rFac) === limpiarTexto(rubro.nombre);
                        })
                        .reduce((acc, fac) => acc + Number(fac.subtotal || fac.Subtotal || 0), 0);

                      const realSalariosRubro = obtenerSalariosPorRubro(rubro.nombre);
                      const totalRealRubroActual = realFacturasRubro + realSalariosRubro;
                      totalRealRubrosCalculado += totalRealRubroActual;
                      const desvioRubro = rubro.total - totalRealRubroActual;

                      return (
                        <tr key={`rub-${rubro.id}`} className="bg-slate-50 font-extrabold">
                          <td className="px-4 py-3 uppercase text-amber-600">{rubro.nombre}</td>
                          <td className="px-4 py-3 text-right">$ {rubro.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right">$ {realFacturasRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-amber-600">$ {realSalariosRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-3 text-right ${desvioRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>$ {desvioRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}

                    {gastosGeneralesDetalle.length > 0 && (
                      <tr className="bg-amber-50 font-extrabold border-t-2">
                        <td className="px-4 py-3 uppercase text-amber-800">GASTOS GENERALES E IMPREVISTOS</td>
                        <td className="px-4 py-3 text-right">$ {totalPresupuestoGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right">$ {(totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right">$ 0,00</td>
                        <td className="px-4 py-3 text-right">$ {(totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}

                    {gastosGeneralesDetalle.map((ggItem) => (
                      <tr key={ggItem.id} className="hover:bg-amber-50/50">
                        <td className="px-4 py-2.5 pl-8 text-slate-700 font-medium">• {ggItem.concepto}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">$ {ggItem.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-700">$ {ggItem.real.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-amber-600">$ 0,00</td>
                        <td className={`px-4 py-2.5 text-right font-black ${ggItem.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>$ {ggItem.desvio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}

                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td className="px-4 py-4 uppercase">GRAN TOTAL GENERAL</td>
                      <td className="px-4 py-4 text-right">$ {granTotalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-right">$ {(totalRealRubrosCalculado + totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-right">$ {movimientosRrhhPresupuesto.reduce((acc, m) => acc + Number(m.monto || m.Monto || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-right">$ {(granTotalPresupuestado - (totalRealRubrosCalculado + totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}