import React, { useState, useMemo } from 'react';
import { TrendingUp, Printer, TrendingUp as ArrowUpRight, TrendingDown as ArrowDownRight } from 'lucide-react';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  tesoreria = [],
  contratos = [],
  contratosList = [],
  contratos_mantenimiento = [],
  allReportesSice = []
}) {
  const [tipoProyecto, setTipoProyecto] = useState('obra');
  const [proyectoId, setProyectoId] = useState('');

  const ordenCategorias = useMemo(() => ['Materiales', 'Mano de Obra', 'Equipos', 'Subcontratos', 'Gastos Generales'], []);

  const extraerArrayDatos = (fuente) => {
    if (Array.isArray(fuente)) return fuente;
    if (fuente && typeof fuente === 'object') {
      if (Array.isArray(fuente.data)) return fuente.data;
      if (Array.isArray(fuente.items)) return fuente.items;
      if (Array.isArray(fuente.result)) return fuente.result;
      if (Array.isArray(fuente.contratos_mantenimiento)) return fuente.contratos_mantenimiento;
      if (Array.isArray(fuente.contratosMantenimiento)) return fuente.contratosMantenimiento;
      if (Array.isArray(fuente.contratos)) return fuente.contratos;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  const listaContratosUnificada = useMemo(() => {
    const c1 = extraerArrayDatos(contratos);
    const c2 = extraerArrayDatos(contratosList);
    const c3 = extraerArrayDatos(contratos_mantenimiento);
    
    let extraGlobales = [];
    if (typeof window !== 'undefined') {
      if (window.globalData) {
        extraGlobales = [
          ...extraerArrayDatos(window.globalData.contratos),
          ...extraerArrayDatos(window.globalData.contratosList),
          ...extraerArrayDatos(window.globalData.contratos_mantenimiento)
        ];
      }
      if (window.contratos) extraGlobales.push(...extraerArrayDatos(window.contratos));
    }

    const combinados = [...c1, ...c2, ...c3, ...extraGlobales];
    const unicosMap = new Map();
    combinados.forEach((item, index) => {
      if (!item) return;
      const key = String(item?.id || item?.ID || item?.codigo || item?.Codigo || item?.contrato_id || item?.nro_contrato || index);
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [contratos, contratosList, contratos_mantenimiento]);

  const presupuestosAprobados = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.estado || p?.Estado_presupuesto || '').toLowerCase().trim();
      return !est || est.includes('aprobad') || est.includes('aprobado');
    });
  }, [presupuestos]);

  const contratosActivos = useMemo(() => {
    if (!listaContratosUnificada || listaContratosUnificada.length === 0) return [];
    return listaContratosUnificada;
  }, [listaContratosUnificada]);

  const presupuestoSeleccionado = useMemo(() => {
    if (tipoProyecto !== 'obra' || !proyectoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID || p?.codigo || p?.Codigo) === String(proyectoId));
  }, [proyectoId, tipoProyecto, presupuestos]);

  const contratoSeleccionado = useMemo(() => {
    if (tipoProyecto !== 'contrato' || !proyectoId) return null;
    return listaContratosUnificada.find(c => String(c?.id || c?.ID || c?.codigo || c?.Codigo || c?.contrato_id || c?.nro_contrato) === String(proyectoId));
  }, [proyectoId, tipoProyecto, listaContratosUnificada]);

  const limpiarTexto = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const parsearMonto = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).trim();
    if (/,/.test(s)) {
      if (/\./.test(s) && s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else if (!/\./.test(s)) {
        s = s.replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    }
    s = s.replace(/[^0-9.-]/g, '');
    return Number(s) || 0;
  };

  // Motor principal para clasificar entre Rubros vs Gastos Generales
  const resolverTipoInsumoOficial = (textoCompleto, tipoExplicito = '') => {
    const tipoExp = limpiarTexto(tipoExplicito);
    if (tipoExp.includes('mano de obra') || tipoExp.includes('rrhh') || tipoExp.includes('personal')) return 'Mano de Obra';
    if (tipoExp.includes('subcontrato') || tipoExp.includes('servicio')) return 'Subcontratos';
    if (tipoExp.includes('equipo') || tipoExp.includes('maquinaria') || tipoExp.includes('alquiler')) return 'Equipos';
    if (tipoExp.includes('gasto') || tipoExp.includes('general') || tipoExp.includes('imprevisto') || tipoExp.includes('seguridad') || tipoExp.includes('epp')) return 'Gastos Generales';
    if (tipoExp.includes('material') || tipoExp.includes('insumo')) return 'Materiales';

    const tc = limpiarTexto(textoCompleto);
    
    if (tc.includes('gasto general') || tc.includes('imprevisto') || tc.includes('seguridad') || tc.includes('higiene') || tc.includes('epp') || tc.includes('medico') || tc.includes('ropa de trabajo') || tc.includes('botines')) {
      return 'Gastos Generales';
    }
    if (tc.includes('mano de obra') || tc.includes('sueldo') || tc.includes('cargas sociales') || tc.includes('jornal')) return 'Mano de Obra';
    if (tc.includes('subcontrato') || tc.includes('contratista') || tc.includes('terceros')) return 'Subcontratos';
    if (tc.includes('alquiler') || tc.includes('maquinaria') || tc.includes('retroexcavadora') || tc.includes('hormigonera')) return 'Equipos';
    
    return 'Materiales'; 
  };

  // Mini-Motor de Diccionario de Sinónimos para cruzar gastos generales reales con filas presupuestadas
  const obtenerSinonimosGG = (texto) => {
    const t = limpiarTexto(texto);
    let sin = [t];
    if (t.includes('seguridad') || t.includes('higiene') || t.includes('licenciado')) sin.push('seguridad', 'higiene', 'licenciado', 'programa', 'visita', 'tecnico');
    if (t.includes('ropa')) sin.push('ropa', 'pantalon', 'camisa', 'botin', 'indumentaria');
    if (t.includes('epp') || t.includes('casco') || t.includes('gafas')) sin.push('epp', 'casco', 'guante', 'gafa', 'protector', 'proteccion');
    if (t.includes('medico') || t.includes('examen')) sin.push('medico', 'preocupacional', 'examen', 'salud', 'clinica');
    if (t.includes('revision') || t.includes('certificacion')) sin.push('revision', 'certificacion', 'ypf', 'gas');
    if (t.includes('imprevisto')) sin.push('imprevisto', 'extra', 'contingencia');
    return sin;
  };

  const renderDesvioConFlecha = (monto) => {
    const esPositivo = monto >= 0;
    const colorClase = esPositivo ? 'text-emerald-500' : 'text-rose-500';
    return (
      <span className={`inline-flex items-center justify-end gap-1 font-bold ${colorClase}`}>
        {esPositivo ? (
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
        )}
        $ {Math.abs(monto).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
      </span>
    );
  };

  const todosLosEgresos = useMemo(() => {
    return [...(Array.isArray(facturas) ? facturas : []), ...(Array.isArray(tesoreria) ? tesoreria : [])];
  }, [facturas, tesoreria]);

  const { analisisRubrosDetallado, gastosGeneralesDetalle } = useMemo(() => {
    if (!proyectoId) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };

    // Lógica rápida para contratos (mantenimiento)
    if (tipoProyecto === 'contrato') {
      if (!contratoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };
      
      const cIdReal = String(contratoSeleccionado?.id || contratoSeleccionado?.contrato_id || '').trim();
      const cCodReal = String(contratoSeleccionado?.codigo || contratoSeleccionado?.nro_contrato || '').trim();

      const facturasDelPto = todosLosEgresos.filter(f => {
        const fContrato = String(f?.contrato_id || f?.contratoId || '').trim();
        const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || '');
        if (cIdReal && fContrato === cIdReal) return true;
        if (cCodReal && fContrato === cCodReal) return true;
        if (cCodReal && fDesc.includes(cCodReal)) return true;
        return false;
      });

      const totalContrato = parsearMonto(contratoSeleccionado?.monto || contratoSeleccionado?.total || 0);
      const categoriasMap = {};
      ordenCategorias.forEach(cat => { categoriasMap[cat] = { presupuestado: 0, real: 0, desvio: 0 }; });
      categoriasMap['Materiales'].presupuestado = totalContrato;

      let totalRealRubro = 0;
      facturasDelPto.forEach(f => {
        const montoFactura = parsearMonto(f?.subtotal || f?.total || f?.monto || f?.importe);
        const catDestino = resolverTipoInsumoOficial(`${f?.tipo_insumo || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''}`);
        categoriasMap[catDestino].real += montoFactura;
        totalRealRubro += montoFactura;
      });

      ordenCategorias.forEach(cat => { categoriasMap[cat].desvio = categoriasMap[cat].presupuestado - categoriasMap[cat].real; });

      return {
        analisisRubrosDetallado: [{
          id: cIdReal || 'C1',
          nombre: contratoSeleccionado?.nombre || contratoSeleccionado?.cliente || 'Mantenimiento General',
          presupuestado: totalContrato,
          real: totalRealRubro,
          desvio: totalContrato - totalRealRubro,
          categorias: categoriasMap
        }],
        gastosGeneralesDetalle: []
      };
    }

    if (!presupuestoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };

    // LÓGICA ROBUSTA PARA PRESUPUESTOS DE OBRA
    let parsedItemsDetalle = {};
    const rawItemsDetalle = presupuestoSeleccionado?.items_detalle || presupuestoSeleccionado?.itemsDetalle;
    if (typeof rawItemsDetalle === 'string') {
      try { parsedItemsDetalle = JSON.parse(rawItemsDetalle); } catch { parsedItemsDetalle = {}; }
    } else if (typeof rawItemsDetalle === 'object' && rawItemsDetalle !== null) {
      parsedItemsDetalle = rawItemsDetalle;
    }

    let rubrosList = parsedItemsDetalle?.rubros || presupuestoSeleccionado?.rubros || [];
    if (typeof rubrosList === 'string') { try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; } }
    if (!Array.isArray(rubrosList)) rubrosList = [rubrosList];

    let comercialObj = parsedItemsDetalle?.comercial || presupuestoSeleccionado?.comercial || {};
    if (typeof comercialObj === 'string') { try { comercialObj = JSON.parse(comercialObj); } catch { comercialObj = {}; } }

    let ggList = comercialObj?.gastos_generales_insumos 
      || parsedItemsDetalle?.gastos_generales_insumos 
      || comercialObj?.gastos_generales 
      || [];
    if (typeof ggList === 'string') { try { ggList = JSON.parse(ggList); } catch { ggList = []; } }
    if (!Array.isArray(ggList)) ggList = [];

    // --- PILAR 1: CÁLCULO DEL COSTO DIRECTO Y EXTRACCIÓN DE IMPREVISTOS ---
    let costoDirectoTotal = 0;
    const rubrosIntermedios = rubrosList.map((r, rIdx) => {
      const nombreRubro = r?.rubro || r?.nombre || `Rubro ${rIdx + 1}`;
      let tareasList = r?.tareas || r?.items || [];
      if (typeof tareasList === 'string') { try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; } }

      const categoriasMap = {};
      ordenCategorias.forEach(cat => { categoriasMap[cat] = { presupuestado: 0, real: 0, desvio: 0 }; });

      let totalRubroPresupuestado = 0;
      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insumosList = t?.insumos || t?.materiales || [];
          if (typeof insumosList === 'string') { try { insumosList = JSON.parse(insumosList); } catch { insumosList = []; } }

          if (!Array.isArray(insumosList) || insumosList.length === 0) {
            const tareaTotal = parsearMonto(t?.total) || (parsearMonto(t?.cantidad || 1) * parsearMonto(t?.costo_unitario || 0));
            const catDestino = resolverTipoInsumoOficial(`${t?.descripcion || t?.tarea || ''}`, t?.tipo || '');
            categoriasMap[catDestino].presupuestado += tareaTotal;
            totalRubroPresupuestado += tareaTotal;
          } else {
            insumosList.forEach(ins => {
              const catDestino = resolverTipoInsumoOficial(`${ins?.nombre || ins?.descripcion || ''}`, ins?.tipo || ins?.categoria || '');
              const insTotal = parsearMonto(ins?.total) || (parsearMonto(ins?.cantidad || 1) * parsearMonto(ins?.costo_unitario || ins?.precio || 0));
              categoriasMap[catDestino].presupuestado += insTotal;
              totalRubroPresupuestado += insTotal;
            });
          }
        });
      }
      
      const montoRubroBase = totalRubroPresupuestado > 0 ? totalRubroPresupuestado : parsearMonto(r?.total || 0);
      costoDirectoTotal += montoRubroBase;

      return { id: r?.id || rIdx, nombreRubro, categoriasMap, montoRubroBase };
    });

    // Inyección del "Imprevisto" mediante porcentaje sobre Costo Directo
    const pctImprevisto = parsearMonto(comercialObj?.porcentaje_imprevistos || comercialObj?.porcentaje_imprevisto || 0);
    let montoImprevistosFijo = parsearMonto(comercialObj?.imprevistos_monto || comercialObj?.imprevisto || parsedItemsDetalle?.imprevistos || 0);
    
    if (pctImprevisto > 0 && montoImprevistosFijo === 0) {
      montoImprevistosFijo = costoDirectoTotal * (pctImprevisto / 100);
    }
    if (montoImprevistosFijo > 0 && !ggList.some(g => limpiarTexto(g?.concepto || g?.nombre || '').includes('imprevisto'))) {
      ggList.push({ id: 'gg_imprevisto_calc', concepto: 'Imprevistos', presupuestado_calc: montoImprevistosFijo });
    }

    // --- PILAR 2: SEPARACIÓN DE EGRESOS EN DOS BOLSAS (Obra vs Gastos Generales) ---
    const pIdReal = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.ID || '').trim();
    const pCodReal = String(presupuestoSeleccionado?.codigo || presupuestoSeleccionado?.Codigo || '').trim();
    
    const bolsaObra = [];
    const bolsaGG = [];

    todosLosEgresos.forEach((f, i) => {
      const fPto = String(f?.presupuesto_id || f?.presupuestoId || '').trim();
      const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || f?.rubro_imputacion || '');
      
      let perteneceAlProyecto = false;
      if (pIdReal && fPto === pIdReal) perteneceAlProyecto = true;
      if (pCodReal && fPto === pCodReal) perteneceAlProyecto = true;
      if (pCodReal && limpiarTexto(fDesc).includes(limpiarTexto(pCodReal))) perteneceAlProyecto = true;

      if (perteneceAlProyecto) {
        const textoFull = `${f?.rubro_imputacion || ''} ${f?.concepto || ''} ${f?.descripcion || ''} ${f?.detalle_gasto || ''}`;
        const tipoMacro = resolverTipoInsumoOficial(textoFull, f?.tipo_insumo || '');
        const objGasto = { ...f, _uid: `fac_${i}`, _usada: false, _catAsignada: tipoMacro };
        
        if (tipoMacro === 'Gastos Generales') {
          bolsaGG.push(objGasto);
        } else {
          bolsaObra.push(objGasto);
        }
      }
    });

    // --- PILAR 3: ASIGNACIÓN INTELIGENTE DE GASTOS GENERALES ---
    const resultadosGG = [];
    ggList.forEach((gg, idx) => {
      const nombreGG = gg?.concepto || gg?.nombre || gg?.descripcion || `Gasto General ${idx + 1}`;
      const cantGG = parsearMonto(gg?.cantidad || gg?.cant || 1);
      const unitGG = parsearMonto(gg?.unitario || gg?.costo_unitario || gg?.precio || 0);
      const presupuestadoGG = gg?.presupuestado_calc || (parsearMonto(gg?.total || gg?.monto) || (cantGG * unitGG));
      
      const sinonimos = obtenerSinonimosGG(nombreGG);
      let realGG = 0;

      bolsaGG.forEach(f => {
        if (!f._usada) {
          const textoFac = limpiarTexto(`${f.rubro_imputacion || ''} ${f.concepto || ''} ${f.detalle_gasto || ''}`);
          // Busca coincidencia en el diccionario de sinónimos
          if (sinonimos.some(sin => textoFac.includes(sin))) {
            realGG += parsearMonto(f.subtotal || f.total || f.monto || f.importe);
            f._usada = true; // Marcar como consumida
          }
        }
      });
      resultadosGG.push({ id: gg?.id || idx, concepto: nombreGG, presupuestado: presupuestadoGG, real: realGG, desvio: presupuestadoGG - realGG });
    });

    // --- PILAR 4: FILA SALVAVIDAS PARA GASTOS GENERALES NO CLASIFICADOS ---
    let ggRealNoClasificado = 0;
    bolsaGG.forEach(f => {
      if (!f._usada) {
        ggRealNoClasificado += parsearMonto(f.subtotal || f.total || f.monto || f.importe);
        f._usada = true;
      }
    });

    if (ggRealNoClasificado > 0) {
      resultadosGG.push({
        id: 'gg_no_clasificado',
        concepto: 'Otros Gastos Generales (Fuera de Cotización)',
        presupuestado: 0,
        real: ggRealNoClasificado,
        desvio: -ggRealNoClasificado
      });
    }

    // --- ASIGNACIÓN DE RUBROS DE OBRA ---
    const resultadosRubros = rubrosIntermedios.map(ri => {
      const normRubro = limpiarTexto(ri.nombreRubro);
      
      // Asignar reportes SICE (Horas de mano de obra directas)
      let totalHsSice = 0;
      allReportesSice.forEach(rep => {
        const repRubro = limpiarTexto(rep?.rubro || rep?.obra_rubro || '');
        (rep?.items || []).forEach(it => {
          if (repRubro === normRubro || limpiarTexto(it?.descripcion || '').includes(normRubro)) {
            totalHsSice += parsearMonto(rep?.totalHorasSuma || rep?.horas || 0);
          }
        });
      });
      ri.categoriasMap['Mano de Obra'].real += (totalHsSice * 15000);

      // Asignar egresos de la bolsaObra al rubro correspondiente
      bolsaObra.forEach(f => {
        if (!f._usada) {
          const fRubro = limpiarTexto(f?.rubro_imputacion || f?.rubro_presupuesto || f?.rubro || '');
          const fTextRaw = limpiarTexto(`${f?.concepto || ''} ${f?.detalle_gasto || ''}`);
          
          let coincide = false;
          if (fRubro && (fRubro === normRubro || fRubro.includes(normRubro) || normRubro.includes(fRubro))) coincide = true;
          else if (fTextRaw.includes(normRubro)) coincide = true;

          if (coincide) {
            const montoF = parsearMonto(f.subtotal || f.total || f.monto || f.importe);
            ri.categoriasMap[f._catAsignada].real += montoF;
            f._usada = true;
          }
        }
      });

      let totalRealRubro = 0;
      ordenCategorias.forEach(cat => {
        ri.categoriasMap[cat].desvio = ri.categoriasMap[cat].presupuestado - ri.categoriasMap[cat].real;
        totalRealRubro += ri.categoriasMap[cat].real;
      });

      return {
        id: ri.id,
        nombre: ri.nombreRubro,
        presupuestado: ri.montoRubroBase,
        real: totalRealRubro,
        desvio: ri.montoRubroBase - totalRealRubro,
        categorias: ri.categoriasMap
      };
    });

    return { analisisRubrosDetallado: resultadosRubros, gastosGeneralesDetalle: resultadosGG };
  }, [proyectoId, tipoProyecto, presupuestoSeleccionado, contratoSeleccionado, allReportesSice, todosLosEgresos, ordenCategorias]);

  const granTotalPresupuestadoRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.presupuestado, 0), [analisisRubrosDetallado]);
  const granTotalRealRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.real, 0), [analisisRubrosDetallado]);
  const totalGGPresupuestado = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.presupuestado, 0), [gastosGeneralesDetalle]);
  const totalGGReal = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.real, 0), [gastosGeneralesDetalle]);

  const hasSeleccion = (tipoProyecto === 'obra' && presupuestoSeleccionado) || (tipoProyecto === 'contrato' && contratoSeleccionado);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo Económico
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Discriminado por rubros, subcategorías imputadas y gastos generales.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
          <div className="flex gap-4 px-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input 
                type="radio" 
                checked={tipoProyecto === 'obra'} 
                onChange={() => { setTipoProyecto('obra'); setProyectoId(''); }} 
                className="accent-amber-500" 
              />
              Presupuestos
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
              <input 
                type="radio" 
                checked={tipoProyecto === 'contrato'} 
                onChange={() => { setProyectoId(''); setTipoProyecto('contrato'); }} 
                className="accent-amber-500" 
              />
              Contratos
            </label>
          </div>

          <select
            value={proyectoId}
            onChange={(e) => setProyectoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer min-w-[300px]"
          >
            {tipoProyecto === 'obra' ? (
              <>
                <option value="">-- Seleccionar Presupuesto ({presupuestosAprobados.length}) --</option>
                {presupuestosAprobados.map(p => {
                  const pId = p?.id || p?.ID || p?.codigo;
                  return <option key={pId} value={pId}>[{p?.codigo || pId}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}</option>;
                })}
              </>
            ) : (
              <>
                <option value="">-- Seleccionar Contrato ({contratosActivos.length}) --</option>
                {contratosActivos.map(c => {
                  const cId = c?.id || c?.ID || c?.codigo || c?.Codigo || c?.contrato_id || c?.nro_contrato;
                  const cCod = c?.codigo || c?.Codigo || c?.nro_contrato || 'S/C';
                  const cNom = c?.nombre || c?.nombre_contrato || c?.Nombre_contrato || c?.cliente || 'Contrato';
                  return <option key={cId} value={cId}>[{cCod}] {cNom}</option>;
                })}
              </>
            )}
          </select>
          <button
            onClick={() => window.print()}
            disabled={!hasSeleccion}
            className={`px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors ${!hasSeleccion ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-600 cursor-pointer'}`}
          >
            <Printer className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {!hasSeleccion ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl print:hidden">
          Por favor, seleccione un documento aprobado para visualizar el análisis comparativo detallado.
        </div>
      ) : (
        <div className="space-y-6 print:m-0 print:p-0">
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-300 text-[10px]">
                  <th className="px-4 py-3">Concepto / Rubro / Subcategoría</th>
                  <th className="px-4 py-3 text-right">Monto Presupuestado</th>
                  <th className="px-4 py-3 text-right">Monto Real Imputado</th>
                  <th className="px-4 py-3 text-right">Desvío por Categoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {analisisRubrosDetallado.map((rubro) => (
                  <React.Fragment key={rubro.id}>
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[11px] print:bg-slate-800 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="px-4 py-2.5">{rubro.nombre}</td>
                      <td className="px-4 py-2.5 text-right">$ {rubro.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400">$ {rubro.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5 text-right">
                        {renderDesvioConFlecha(rubro.desvio)}
                      </td>
                    </tr>
                    
                    {ordenCategorias.map(cat => {
                      const catData = rubro.categorias[cat];
                      if (catData.presupuestado === 0 && catData.real === 0) return null;
                      
                      return (
                        <tr key={`${rubro.id}-${cat}`} className="hover:bg-slate-50 font-medium text-[11px]">
                          <td className="px-8 py-2 text-slate-600 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span> {cat}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">
                            $ {catData.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-2 text-right text-amber-700 font-bold">
                            $ {catData.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-2 text-right font-bold">
                            {renderDesvioConFlecha(catData.desvio)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                <tr className="bg-amber-100 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300 print:bg-amber-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td className="px-4 py-3">SUBTOTAL {tipoProyecto === 'obra' ? 'RUBROS DE OBRA' : 'CONTRATO'}</td>
                  <td className="px-4 py-3 text-right">$ {granTotalPresupuestadoRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-amber-800">$ {granTotalRealRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right">
                    {renderDesvioConFlecha(granTotalPresupuestadoRubros - granTotalRealRubros)}
                  </td>
                </tr>

                {gastosGeneralesDetalle.length > 0 && (
                  <>
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[11px] border-t-4 border-white print:bg-slate-800 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td colSpan="4" className="px-4 py-2.5">GASTOS GENERALES E IMPREVISTOS</td>
                    </tr>
                    {gastosGeneralesDetalle.map((gg) => (
                      <tr key={`gg-${gg.id}`} className={`hover:bg-slate-50 font-medium text-[11px] ${gg.id === 'gg_no_clasificado' ? 'bg-rose-50/50' : ''}`}>
                        <td className={`px-8 py-2 ${gg.id === 'gg_no_clasificado' ? 'text-rose-700 font-bold' : 'text-slate-700'}`}>{gg.concepto}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">$ {gg.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className={`px-4 py-2 text-right font-bold ${gg.id === 'gg_no_clasificado' ? 'text-rose-700' : 'text-amber-700'}`}>$ {gg.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2 text-right font-bold">
                          {renderDesvioConFlecha(gg.desvio)}
                        </td>
                      </tr>
                    ))}
                    
                    <tr className="bg-amber-100 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300 print:bg-amber-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="px-4 py-3">SUBTOTAL GASTOS GENERALES</td>
                      <td className="px-4 py-3 text-right">$ {totalGGPresupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-amber-800">$ {totalGGReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right">
                        {renderDesvioConFlecha(totalGGPresupuestado - totalGGReal)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
              
              <tfoot>
                <tr className="bg-slate-900 text-white font-black uppercase text-xs print:bg-slate-900 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td className="px-4 py-4">TOTAL GENERAL</td>
                  <td className="px-4 py-4 text-right">$ {(granTotalPresupuestadoRubros + totalGGPresupuestado).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-4 text-right text-amber-400">$ {(granTotalRealRubros + totalGGReal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-4 text-right">
                    {renderDesvioConFlecha((granTotalPresupuestadoRubros + totalGGPresupuestado) - (granTotalRealRubros + totalGGReal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}