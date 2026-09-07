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

  const resolverTipoInsumoOficial = (textoCompleto, tipoExplicito = '') => {
    const tipoExp = limpiarTexto(tipoExplicito);
    if (tipoExp.includes('mano de obra') || tipoExp.includes('rrhh') || tipoExp.includes('personal')) return 'Mano de Obra';
    if (tipoExp.includes('subcontrato') || tipoExp.includes('servicio')) return 'Subcontratos';
    if (tipoExp.includes('equipo') || tipoExp.includes('maquinaria') || tipoExp.includes('herramienta') || tipoExp.includes('alquiler')) return 'Equipos';
    if (tipoExp.includes('gasto') || tipoExp.includes('general') || tipoExp.includes('imprevisto') || tipoExp.includes('seguridad')) return 'Gastos Generales';
    if (tipoExp.includes('material') || tipoExp.includes('insumo')) return 'Materiales';

    const tc = limpiarTexto(textoCompleto);
    
    if (
      tc.includes('mano de obra') || 
      tc.includes('sueldo') || 
      tc.includes('viatico') || 
      tc.includes('cargas sociales') || 
      tc.includes('jornal') ||
      tc.includes('oficial') ||
      tc.includes('ayudante')
    ) {
      return 'Mano de Obra';
    }

    if (tc.includes('subcontrato') || tc.includes('contratista') || tc.includes('servicio de terceros')) return 'Subcontratos';
    
    if (
      tc.includes('alquiler de equipo') || 
      tc.includes('maquinaria pesada') || 
      tc.includes('retroexcavadora') || 
      tc.includes('hormigonera') || 
      tc.includes('andamio') ||
      tc.includes('guinche') ||
      tc.includes('compactadora')
    ) {
      return 'Equipos';
    }

    if (tc.includes('gasto general') || tc.includes('imprevisto') || tc.includes('seguridad e higiene') || tc.includes('epp')) return 'Gastos Generales';
    
    return 'Materiales'; 
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

    if (tipoProyecto === 'contrato') {
      if (!contratoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };
      
      const cIdReal = String(contratoSeleccionado?.id || contratoSeleccionado?.ID || contratoSeleccionado?.contrato_id || '').trim();
      const cCodReal = String(contratoSeleccionado?.codigo || contratoSeleccionado?.Codigo || contratoSeleccionado?.nro_contrato || '').trim();

      const facturasDelPto = todosLosEgresos.filter(f => {
        const fContrato = String(f?.contrato_id || f?.contratoId || '').trim();
        const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || f?.rubro_imputacion || '');
        
        if (cIdReal && fContrato === cIdReal) return true;
        if (cCodReal && fContrato === cCodReal) return true;
        if (cCodReal && fDesc.includes(cCodReal)) return true;
        return false;
      });

      const totalContrato = parsearMonto(contratoSeleccionado?.monto || contratoSeleccionado?.total || contratoSeleccionado?.Monto || 0);
      
      const categoriasMap = {};
      ordenCategorias.forEach(cat => { categoriasMap[cat] = { presupuestado: 0, real: 0, desvio: 0 }; });
      categoriasMap['Materiales'].presupuestado = totalContrato;

      let totalRealRubro = 0;

      facturasDelPto.forEach(f => {
        const montoFactura = parsearMonto(f?.subtotal || f?.total || f?.monto || f?.importe);
        const textoCompletoFac = `${f?.tipo_insumo || ''} ${f?.categoria_insumo || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''} ${f?.descripcion || ''}`;
        const catDestino = resolverTipoInsumoOficial(textoCompletoFac);
        
        categoriasMap[catDestino].real += montoFactura;
        totalRealRubro += montoFactura;
      });

      ordenCategorias.forEach(cat => {
        categoriasMap[cat].desvio = categoriasMap[cat].presupuestado - categoriasMap[cat].real;
      });

      const resultadosRubros = [{
        id: cIdReal || 'C1',
        nombre: contratoSeleccionado?.nombre || contratoSeleccionado?.nombre_contrato || contratoSeleccionado?.Nombre_contrato || contratoSeleccionado?.cliente || 'Mantenimiento General',
        presupuestado: totalContrato,
        real: totalRealRubro,
        desvio: totalContrato - totalRealRubro,
        categorias: categoriasMap
      }];

      return { analisisRubrosDetallado: resultadosRubros, gastosGeneralesDetalle: [] };
    }

    if (!presupuestoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };

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

    // ESTRATEGIA REFORZADA DE GASTOS GENERALES E IMPREVISTOS
    let comercialObj = parsedItemsDetalle?.comercial || presupuestoSeleccionado?.comercial || {};
    if (typeof comercialObj === 'string') { try { comercialObj = JSON.parse(comercialObj); } catch { comercialObj = {}; } }

    let ggList = comercialObj?.gastos_generales_insumos 
      || parsedItemsDetalle?.gastos_generales_insumos 
      || presupuestoSeleccionado?.gastos_generales_insumos 
      || comercialObj?.gastos_generales 
      || [];

    if (typeof ggList === 'string') { try { ggList = JSON.parse(ggList); } catch { ggList = []; } }
    if (!Array.isArray(ggList)) ggList = [];

    // Si dentro de comercialObj o parsedItemsDetalle viene un campo imprevistos u otros cargos comerciales, los agregamos como concepto si no están
    const imprevistosMonto = parsearMonto(comercialObj?.imprevistos_monto || comercialObj?.imprevisto || parsedItemsDetalle?.imprevistos || 0);
    if (imprevistosMonto > 0 && !ggList.some(g => limpiarTexto(g?.concepto || g?.nombre || '').includes('imprevisto'))) {
      ggList.push({ concepto: 'Imprevistos', total: imprevistosMonto });
    }

    const pIdReal = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.ID || '').trim();
    const pCodReal = String(presupuestoSeleccionado?.codigo || presupuestoSeleccionado?.Codigo || '').trim();
    const pObraId = String(presupuestoSeleccionado?.obra_id || '').trim();
    const pNombreReal = String(presupuestoSeleccionado?.nombre || presupuestoSeleccionado?.nombre_obra || '').trim();
    
    const indicePresupuesto = presupuestosAprobados.findIndex(p => String(p?.id || p?.ID || p?.codigo) === String(proyectoId)) + 1;

    const facturasDelPto = todosLosEgresos
      .filter(f => {
        const fPto = String(f?.presupuesto_id || f?.presupuestoId || f?.id_presupuesto || '').trim();
        const fObra = String(f?.obra_id || f?.obraId || f?.id_obra || '').trim();
        const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || f?.rubro_imputacion || f?.observaciones || '');
        
        if (pIdReal && fPto === pIdReal) return true;
        if (pCodReal && fPto === pCodReal) return true;
        if (pObraId && fObra === pObraId) return true;
        if (pCodReal && limpiarTexto(fDesc).includes(limpiarTexto(pCodReal))) return true;
        if (pNombreReal && limpiarTexto(fDesc).includes(limpiarTexto(pNombreReal))) return true;
        if (fPto === String(indicePresupuesto) || fDesc.includes(`Presupuesto: ${pIdReal}`) || fDesc.includes(`Presupuesto: ${indicePresupuesto}`)) {
          return true;
        }
        return false;
      })
      .map((f, i) => ({ ...f, _uid: f.id || f.ID || f.n_factura || `fac_temp_${i}` }));

    let granTotalPresupuestadoRubrosTemp = 0;
    const rubrosIntermedios = rubrosList.map((r, rIdx) => {
      const nombreRubro = r?.rubro || r?.nombre || `Rubro ${rIdx + 1}`;
      let tareasList = r?.tareas || r?.items || r?.subitems || [];
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
            const tipoExplicitTarea = t?.tipo || '';
            const descTarea = t?.descripcion || t?.tarea || '';
            const catDestino = resolverTipoInsumoOficial(descTarea, tipoExplicitTarea);
            categoriasMap[catDestino].presupuestado += tareaTotal;
            totalRubroPresupuestado += tareaTotal;
          } else {
            insumosList.forEach(ins => {
              const tipoExplicit = ins?.tipo || ins?.categoria || ins?.rubro || t?.tipo || '';
              const nombreIns = ins?.nombre || ins?.descripcion || t?.tarea || '';
              const catDestino = resolverTipoInsumoOficial(nombreIns, tipoExplicit);
              const insTotal = parsearMonto(ins?.total) || (parsearMonto(ins?.cantidad || 1) * parsearMonto(ins?.costo_unitario || ins?.precio || 0));
              categoriasMap[catDestino].presupuestado += insTotal;
              totalRubroPresupuestado += insTotal;
            });
          }
        });
      }
      
      const montoRubroBase = totalRubroPresupuestado > 0 ? totalRubroPresupuestado : parsearMonto(r?.total || 0);
      granTotalPresupuestadoRubrosTemp += montoRubroBase;

      return { id: r?.id || rIdx, nombreRubro, categoriasMap, montoRubroBase };
    });

    const facturasUsadas = new Set();
    const resultadosGG = [];
    if (Array.isArray(ggList)) {
      ggList.forEach((gg, idx) => {
        const nombreGG = gg?.concepto || gg?.nombre || gg?.descripcion || `Gasto General ${idx + 1}`;
        const cantGG = parsearMonto(gg?.cantidad || gg?.cant || 1);
        const unitGG = parsearMonto(gg?.unitario || gg?.costo_unitario || gg?.precio || 0);
        const presupuestadoGG = parsearMonto(gg?.total || gg?.monto) || (cantGG * unitGG);
        const normGG = limpiarTexto(nombreGG);

        // ESTRATEGIA DE ASIGNACIÓN REAL DE GASTOS GENERALES
        const facturasGG = facturasDelPto.filter(f => {
          if (facturasUsadas.has(f._uid)) return false;
          const textoFacGG = limpiarTexto(`${f?.rubro || ''} ${f?.rubro_imputacion || ''} ${f?.rubro_presupuesto || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''} ${f?.descripcion || ''} ${f?.tipo_insumo || ''}`);
          
          if (normGG) {
            const palabrasClave = normGG.split(' ').filter(p => p.length > 3);
            const coincideAlguna = palabrasClave.some(palabra => textoFacGG.includes(palabra));
            if (textoFacGG.includes(normGG) || coincideAlguna) {
              facturasUsadas.add(f._uid);
              return true;
            }
          }
          return false;
        });
        
        const realGG = facturasGG.reduce((acc, f) => acc + parsearMonto(f?.subtotal || f?.total || f?.monto || f?.importe), 0);
        resultadosGG.push({ id: gg?.id || idx, concepto: nombreGG, presupuestado: presupuestadoGG, real: realGG, desvio: presupuestadoGG - realGG });
      });
    }

    const resultadosRubros = rubrosIntermedios.map(ri => {
      const normRubro = limpiarTexto(ri.nombreRubro);
      
      let totalHsSice = 0;
      allReportesSice.forEach(rep => {
        const repRubro = limpiarTexto(rep?.rubro || rep?.obra_rubro || '');
        (rep?.items || []).forEach(it => {
          const itDesc = limpiarTexto(it?.descripcion || '');
          if (repRubro === normRubro || itDesc.includes(normRubro)) {
            totalHsSice += parsearMonto(rep?.totalHorasSuma || rep?.horas || 0);
          }
        });
      });
      ri.categoriasMap['Mano de Obra'].real += (totalHsSice * 15000);

      const facturasRubro = facturasDelPto.filter(f => {
        if (facturasUsadas.has(f._uid)) return false; 
        
        const fRubro = limpiarTexto(f?.rubro || f?.rubro_imputacion || f?.rubro_presupuesto || '');
        const fTextRaw = `${f?.concepto || ''} ${f?.descripcion || ''} ${f?.detalle_gasto || ''}`;
        
        if (fRubro && (fRubro === normRubro || fRubro.includes(normRubro) || normRubro.includes(fRubro))) {
          facturasUsadas.add(f._uid);
          return true;
        }

        const matchCorchetes = fTextRaw.match(/\[Rubro:\s*(.*?)\s*-/i);
        if (matchCorchetes && matchCorchetes[1]) {
          const rubroExtraido = limpiarTexto(matchCorchetes[1]);
          if (rubroExtraido === normRubro || normRubro.includes(rubroExtraido)) {
            facturasUsadas.add(f._uid);
            return true;
          }
        }

        if (limpiarTexto(fTextRaw).includes(normRubro)) {
          facturasUsadas.add(f._uid);
          return true;
        }

        return false;
      });

      facturasRubro.forEach(f => {
        const montoFactura = parsearMonto(f?.subtotal || f?.total || f?.monto || f?.importe);
        const tipoExplicitoFactura = f?.tipo_insumo || f?.tipoInsumo || f?.categoria || f?.tipo || '';
        const detalleFactura = f?.concepto || f?.descripcion || f?.detalle_gasto || '';
        
        let catDestino = resolverTipoInsumoOficial(detalleFactura, tipoExplicitoFactura);
        
        ri.categoriasMap[catDestino].real += montoFactura;
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
  }, [proyectoId, tipoProyecto, presupuestoSeleccionado, contratoSeleccionado, allReportesSice, todosLosEgresos, ordenCategorias, presupuestosAprobados]);

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
                      <tr key={`gg-${gg.id}`} className="hover:bg-slate-50 font-medium text-[11px]">
                        <td className="px-8 py-2 text-slate-700">{gg.concepto}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-800">$ {gg.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2 text-right text-amber-700 font-bold">$ {gg.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
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