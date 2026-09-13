import React, { useState, useMemo } from 'react';
import { TrendingUp, Printer, TrendingUp as ArrowUpRight, TrendingDown as ArrowDownRight } from 'lucide-react';
import { useObraData } from '@/hooks/useObraData';
import { OBRAS_CONFIG } from '@/config/constants';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  tesoreria = [],
  contratos = [],
  contratosList = [],
  contratos_mantenimiento = [],
  allReportesSice = [],
  cargasSemanales = []
}) {
  const [tipoProyecto, setTipoProyecto] = useState('obra');
  const [proyectoId, setProyectoId] = useState('');
  const [tipoInsumoFiltro, setTipoInsumoFiltro] = useState('TODOS');

  // Consulta directa de Cargas Semanales desde la base de datos para garantizar que nunca esté vacío
  const { data: cargasSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.CARGAS_SEMANALES || 'CargasSemanales');
  const { data: contratosSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento');

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
      if (Array.isArray(fuente.cargas_semanales)) return fuente.cargas_semanales;
      if (Array.isArray(fuente.cargasSemanales)) return fuente.cargasSemanales;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  // UNIFICACIÓN ROBUSTA DE CONTRATOS
  const listaContratosUnificada = useMemo(() => {
    const c1 = extraerArrayDatos(contratos);
    const c2 = extraerArrayDatos(contratosList);
    const c3 = extraerArrayDatos(contratos_mantenimiento);
    const c4 = extraerArrayDatos(contratosSheet);
    
    let extraGlobales = [];
    if (typeof window !== 'undefined') {
      if (window.globalData) {
        extraGlobales = [
          ...extraerArrayDatos(window.globalData.contratos),
          ...extraerArrayDatos(window.globalData.contratosList),
          ...extraerArrayDatos(window.globalData.contratos_mantenimiento),
          ...extraerArrayDatos(window.globalData.cargasSemanales)
        ];
      }
      if (window.contratos) extraGlobales.push(...extraerArrayDatos(window.contratos));
    }

    const combinados = [...c1, ...c2, ...c3, ...c4, ...extraGlobales];
    const unicosMap = new Map();
    combinados.forEach((item, index) => {
      if (!item) return;
      const key = String(item?.id || item?.ID || item?.codigo || item?.Codigo || item?.contrato_id || item?.nro_contrato || index);
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [contratos, contratosList, contratos_mantenimiento, contratosSheet]);

  // UNIFICACIÓN Y CAPTURA TOTAL DE CARGAS SEMANALES (PROPS + HOOK DB + WINDOW GLOBAL)
  const listaCargasSemanalesUnificada = useMemo(() => {
    const cs1 = extraerArrayDatos(cargasSemanales);
    const cs2 = extraerArrayDatos(cargasSheet);
    
    let csGlobales = [];
    if (typeof window !== 'undefined') {
      if (window.globalData) {
        csGlobales = [
          ...extraerArrayDatos(window.globalData.cargasSemanales),
          ...extraerArrayDatos(window.globalData.cargas_semanales)
        ];
      }
      if (window.cargasSemanales) csGlobales.push(...extraerArrayDatos(window.cargasSemanales));
    }

    const combinadas = [...cs1, ...cs2, ...csGlobales];
    const unicosMap = new Map();
    combinadas.forEach((item, index) => {
      if (!item) return;
      const key = String(item?.id || item?.ID || index);
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [cargasSemanales, cargasSheet]);

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

  const parsearCantidad = (val, porDefecto = 1) => {
    if (val === undefined || val === null || val === '') return porDefecto;
    return parsearMonto(val);
  };

  const obtenerMontoNetoFactura = (f) => {
    const subtotal = parsearMonto(f?.subtotal || f?.neto || f?.importe_neto || f?.Neto || f?.Subtotal);
    if (subtotal !== 0) return subtotal;
    
    const total = parsearMonto(f?.total || f?.monto || f?.importe || f?.Total || f?.Monto);
    const iva21 = parsearMonto(f?.iva_21 || f?.Iva_21 || f?.iva21 || 0);
    const iva105 = parsearMonto(f?.iva_105 || f?.Iva_105 || f?.iva105 || 0);
    const otrosTributos = parsearMonto(f?.otros_tributos || f?.Otros_tributos || 0);

    if (total > 0 && (iva21 > 0 || iva105 > 0)) {
      const netoCalculado = total - iva21 - iva105 - otrosTributos;
      if (netoCalculado > 0) return netoCalculado;
    }

    return total;
  };

  const resolverTipoInsumoOficial = (tipoExplicito = '', textoCompleto = '') => {
    const tipoExp = limpiarTexto(tipoExplicito);
    const tc = limpiarTexto(textoCompleto);
    const combinado = `${tipoExp} ${tc}`;

    if (
      combinado.includes('mano de obra') || 
      combinado.includes('rrhh') || 
      combinado.includes('personal') || 
      combinado.includes('viatico') || 
      combinado.includes('nafta') || 
      combinado.includes('combustible') || 
      combinado.includes('peaje') || 
      combinado.includes('sueldo') || 
      combinado.includes('jornal') || 
      combinado.includes('carga social') || 
      combinado.includes('f931') || 
      combinado.includes('931') || 
      combinado.includes('remuneracion') || 
      combinado.includes('aporte') || 
      combinado.includes('sindicato')
    ) {
      return 'Mano de Obra';
    }

    if (combinado.includes('subcontrato') || combinado.includes('servicio')) {
      if (!combinado.includes('seguridad e higiene')) return 'Subcontratos';
    }

    if (combinado.includes('equipo') || combinado.includes('maquinaria') || combinado.includes('alquiler') || combinado.includes('volquete')) {
      return 'Equipos';
    }

    if (
      combinado.includes('gastos generales') || 
      combinado.includes('gasto general') || 
      combinado.includes('imprevisto') || 
      combinado.includes('seguridad e higiene') || 
      combinado.includes('epp') ||
      combinado.includes('ropa de trabajo') ||
      combinado.includes('examen medico') ||
      combinado.includes('examen médico')
    ) {
      return 'Gastos Generales';
    }

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

  const egresosFacturasUnicos = useMemo(() => {
    return (Array.isArray(facturas) ? facturas : []).map(f => ({
      ...f,
      _montoReal: obtenerMontoNetoFactura(f)
    }));
  }, [facturas]);

  const { analisisRubrosDetallado, gastosGeneralesDetalle } = useMemo(() => {
    if (!proyectoId) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };

    if (tipoProyecto === 'contrato') {
      if (!contratoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };
      const cIdReal = String(contratoSeleccionado?.id || contratoSeleccionado?.contrato_id || '').trim();
      const cCodReal = String(contratoSeleccionado?.codigo || contratoSeleccionado?.nro_contrato || '').trim();

      const facturasDelPto = egresosFacturasUnicos.filter(f => {
        const fContrato = String(f?.contrato_id || f?.contratoId || '').trim();
        const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || '');
        return (cIdReal && fContrato === cIdReal) || (cCodReal && fContrato === cCodReal) || (cCodReal && fDesc.includes(cCodReal));
      });

      const cargasDelPto = listaCargasSemanalesUnificada.filter(cs => {
        const csContrato = String(cs?.contrato_mantenimiento_id || cs?.contrato_id || '').trim();
        return (cIdReal && csContrato === cIdReal) || (cCodReal && csContrato === cCodReal);
      });

      const totalContrato = parsearMonto(contratoSeleccionado?.monto || contratoSeleccionado?.total || 0);
      const categoriasMap = {};
      ordenCategorias.forEach(cat => { categoriasMap[cat] = { presupuestado: 0, real: 0, desvio: 0 }; });
      categoriasMap['Materiales'].presupuestado = totalContrato;

      let totalRealRubro = 0;
      facturasDelPto.forEach(f => {
        const monto = f._montoReal !== undefined ? f._montoReal : parsearMonto(f?.subtotal);
        const cat = resolverTipoInsumoOficial(f?.tipo_insumo, `${f?.concepto || ''} ${f?.detalle_gasto || ''} ${f?.rubro_imputacion || ''}`);
        categoriasMap[cat].real += monto;
        totalRealRubro += monto;
      });

      cargasDelPto.forEach(cs => {
        const totalCs = parsearMonto(cs?.total_general || cs?.total || 0);
        categoriasMap['Mano de Obra'].real += totalCs;
        totalRealRubro += totalCs;
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
            const tareaTotal = parsearMonto(t?.total) || (parsearCantidad(t?.cantidad) * parsearMonto(t?.costo_unitario || 0));
            const cat = resolverTipoInsumoOficial(t?.tipo, t?.descripcion || t?.tarea);
            categoriasMap[cat].presupuestado += tareaTotal;
            totalRubroPresupuestado += tareaTotal;
          } else {
            insumosList.forEach(ins => {
              const cat = resolverTipoInsumoOficial(ins?.tipo || ins?.categoria, ins?.nombre || ins?.descripcion);
              const insTotal = parsearMonto(ins?.total) || (parsearCantidad(ins?.cantidad) * parsearMonto(ins?.costo_unitario || ins?.precio || 0));
              categoriasMap[cat].presupuestado += insTotal;
              totalRubroPresupuestado += insTotal;
            });
          }
        });
      }
      
      const montoBase = totalRubroPresupuestado > 0 ? totalRubroPresupuestado : parsearMonto(r?.total || 0);
      costoDirectoTotal += montoBase;
      return { id: r?.id || rIdx, nombreRubro, categoriasMap, montoRubroBase: montoBase };
    });

    const pctImprevisto = parsearMonto(comercialObj?.porcentaje_imprevistos || comercialObj?.porcentaje_imprevisto || 0);
    let montoImprevistosFijo = parsearMonto(comercialObj?.imprevistos_monto || comercialObj?.imprevisto || parsedItemsDetalle?.imprevistos || 0);
    if (pctImprevisto > 0 && montoImprevistosFijo === 0) {
      montoImprevistosFijo = costoDirectoTotal * (pctImprevisto / 100);
    }
    if (montoImprevistosFijo > 0 && !ggList.some(g => limpiarTexto(g?.concepto || g?.nombre || '').includes('imprevisto'))) {
      ggList.push({ id: 'gg_imprevisto_calc', concepto: 'Imprevistos', presupuestado_calc: montoImprevistosFijo });
    }

    const pIdReal = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.ID || '').trim();
    const pCodReal = String(presupuestoSeleccionado?.codigo || presupuestoSeleccionado?.Codigo || '').trim();

    const facturasProyecto = egresosFacturasUnicos.filter(f => {
      const fPto = String(f?.presupuesto_id || f?.presupuestoId || f?.obra_id || '').trim();
      const fConcepto = String(f?.concepto || f?.descripcion || f?.detalle_gasto || '').trim();
      
      const matchId = pIdReal && (fPto === pIdReal || String(f?.obra_id) === pIdReal || String(f?.presupuesto_id) === pIdReal);
      const matchCodExacto = pCodReal && (fPto === pCodReal || fConcepto.includes(`[${pCodReal}]`) || fConcepto === pCodReal);
      
      return matchId || matchCodExacto;
    });

    // FILTRO ROBUSTO DE CARGAS SEMANALES
    const cargasSemanalesProyecto = listaCargasSemanalesUnificada.filter(cs => {
      const csPto = String(cs?.presupuesto_id || cs?.presupuestoId || cs?.obra_id || '').trim();
      return pIdReal && (csPto === pIdReal || Number(csPto) === Number(pIdReal));
    });

    // 1. ASIGNACIÓN DE GASTOS GENERALES
    const resultadosGG = [];
    ggList.forEach((gg, idx) => {
      const nombreGG = gg?.concepto || gg?.nombre || gg?.descripcion || `Gasto General ${idx + 1}`;
      const presupuestadoGG = gg?.presupuestado_calc || parsearMonto(gg?.total || gg?.monto) || (parsearCantidad(gg?.cantidad) * parsearMonto(gg?.unitario || 0));
      const normGG = limpiarTexto(nombreGG);

      let realGG = 0;
      facturasProyecto.forEach(f => {
        const rubroImp = limpiarTexto(f?.rubro_imputacion || f?.rubro || '');
        const tipoIns = limpiarTexto(f?.tipo_insumo || f?.categoria || '');

        if (rubroImp.includes('gasto') || rubroImp.includes('imprevisto') || rubroImp.includes('epp') || rubroImp.includes('seguridad')) {
          if (tipoIns === normGG || rubroImp === normGG || rubroImp.includes(normGG)) {
            realGG += (f._montoReal !== undefined ? f._montoReal : parsearMonto(f?.monto ?? f?.subtotal));
          }
        }
      });

      resultadosGG.push({ id: gg?.id || idx, concepto: nombreGG, presupuestado: presupuestadoGG, real: realGG, desvio: presupuestadoGG - realGG });
    });

    // 2. ASIGNACIÓN ESTRICTA DE RUBROS DE OBRA Y CARGAS SEMANALES
    const resultadosRubros = rubrosIntermedios.map(ri => {
      const normRubro = limpiarTexto(ri.nombreRubro);

      // ASIGNAR MANO DE OBRA DESDE CARGAS SEMANALES
      cargasSemanalesProyecto.forEach(cs => {
        let distribucion = cs?.distribucion_rubros || cs?.distribucionRubros || [];
        if (typeof distribucion === 'string') {
          try { distribucion = JSON.parse(distribucion); } catch { distribucion = []; }
        }
        if (!Array.isArray(distribucion)) distribucion = [distribucion];

        const totalCs = parsearMonto(cs?.total_general || cs?.total || 0);

        distribucion.forEach(d => {
          const rubroDist = limpiarTexto(d?.rubro || d?.nombre || '');
          const porcentaje = parsearMonto(d?.porcentaje || d?.pct || 100);
          
          if (rubroDist && (rubroDist === normRubro || normRubro.includes(rubroDist) || rubroDist.includes(normRubro))) {
            const montoAsignado = totalCs * (porcentaje / 100);
            ri.categoriasMap['Mano de Obra'].real += montoAsignado;
          }
        });
      });

      // ASIGNAR FACTURAS (MATERIALES, EQUIPOS, SUBCONTRATOS)
      facturasProyecto.forEach(f => {
        const rubroImp = limpiarTexto(f?.rubro_imputacion || f?.rubro || '');
        const esGastoGeneral = rubroImp.includes('gastos generales') || rubroImp.includes('gasto general') || rubroImp.includes('imprevisto');

        if (rubroImp === normRubro && !esGastoGeneral) {
          const montoNeto = f._montoReal !== undefined ? f._montoReal : obtenerMontoNetoFactura(f);
          const categoriaDestino = resolverTipoInsumoOficial(f?.tipo_insumo, `${f?.concepto || ''} ${f?.detalle_gasto || ''} ${f?.rubro_imputacion || ''}`);
          ri.categoriasMap[categoriaDestino].real += montoNeto;
        }
      });

      return {
        id: ri.id,
        nombre: ri.nombreRubro,
        categorias: ri.categoriasMap
      };
    });

    return { analisisRubrosDetallado: resultadosRubros, gastosGeneralesDetalle: resultadosGG };
  }, [proyectoId, tipoProyecto, presupuestoSeleccionado, contratoSeleccionado, allReportesSice, egresosFacturasUnicos, listaCargasSemanalesUnificada, ordenCategorias]);

  const { granTotalPresupuestadoFiltrado, granTotalRealFiltrado } = useMemo(() => {
    let sumPresupuestado = 0;
    let sumReal = 0;

    analisisRubrosDetallado.forEach(rubro => {
      ordenCategorias.forEach(cat => {
        if (tipoInsumoFiltro === 'TODOS' || cat === tipoInsumoFiltro) {
          const catData = rubro.categorias[cat];
          sumPresupuestado += catData.presupuestado;
          sumReal += catData.real;
        }
      });
    });

    return {
      granTotalPresupuestadoFiltrado: sumPresupuestado,
      granTotalRealFiltrado: sumReal
    };
  }, [analisisRubrosDetallado, tipoInsumoFiltro, ordenCategorias]);

  const totalGGPresupuestado = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.presupuestado, 0), [gastosGeneralesDetalle]);
  const totalGGReal = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.real, 0), [gastosGeneralesDetalle]);

  const hasSeleccion = (tipoProyecto === 'obra' && presupuestoSeleccionado) || (tipoProyecto === 'contrato' && contratoSeleccionado);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo Económico
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Discriminado por rubros, subcategorías imputadas y gastos generales (Mano de obra de Cargas Semanales y Facturas netas sin IVA).</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <div className="flex gap-3 px-2">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
              <input 
                type="radio" 
                checked={tipoProyecto === 'obra'} 
                onChange={() => { setTipoProyecto('obra'); setProyectoId(''); setTipoInsumoFiltro('TODOS'); }} 
                className="accent-amber-500" 
              />
              Presupuestos
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-800">
              <input 
                type="radio" 
                checked={tipoProyecto === 'contrato'} 
                onChange={() => { setProyectoId(''); setTipoProyecto('contrato'); setTipoInsumoFiltro('TODOS'); }} 
                className="accent-amber-500" 
              />
              Contratos
            </label>
          </div>

          <select
            value={proyectoId}
            onChange={(e) => { setProyectoId(e.target.value); setTipoInsumoFiltro('TODOS'); }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer max-w-[280px]"
          >
            {tipoProyecto === 'obra' ? (
              <>
                <option value="">-- Seleccionar Presupuesto --</option>
                {presupuestosAprobados.map(p => {
                  const pId = p?.id || p?.ID || p?.codigo;
                  return <option key={pId} value={pId}>[{p?.codigo || pId}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}</option>;
                })}
              </>
            ) : (
              <>
                <option value="">-- Seleccionar Contrato --</option>
                {contratosActivos.map(c => {
                  const cId = c?.id || c?.ID || c?.codigo || c?.Codigo || c?.contrato_id || c?.nro_contrato;
                  const cCod = c?.codigo || c?.Codigo || c?.nro_contrato || 'S/C';
                  const cNom = c?.nombre || c?.nombre_contrato || c?.Nombre_contrato || c?.cliente || 'Contrato';
                  return <option key={cId} value={cId}>[{cCod}] {cNom}</option>;
                })}
              </>
            )}
          </select>

          <select
            value={tipoInsumoFiltro}
            onChange={(e) => setTipoInsumoFiltro(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="TODOS">Todos los Tipos de Insumo</option>
            {ordenCategorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            disabled={!hasSeleccion}
            className={`px-3.5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors ${!hasSeleccion ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-600 cursor-pointer'}`}
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
                  <th className="px-4 py-3 text-right">Monto Real Imputado (Neto sin IVA)</th>
                  <th className="px-4 py-3 text-right">Desvío por Categoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {analisisRubrosDetallado.map((rubro) => {
                  const categoriasFiltradas = ordenCategorias.filter(cat => {
                    const catData = rubro.categorias[cat];
                    if (catData.presupuestado === 0 && catData.real === 0) return false;
                    if (tipoInsumoFiltro !== 'TODOS' && cat !== tipoInsumoFiltro) return false;
                    return true;
                  });

                  if (tipoInsumoFiltro !== 'TODOS' && categoriasFiltradas.length === 0) return null;

                  const rubroPresupuestadoFiltrado = categoriasFiltradas.reduce((acc, cat) => acc + rubro.categorias[cat].presupuestado, 0);
                  const rubroRealFiltrado = categoriasFiltradas.reduce((acc, cat) => acc + rubro.categorias[cat].real, 0);
                  const rubroDesvioFiltrado = rubroPresupuestadoFiltrado - rubroRealFiltrado;

                  return (
                    <React.Fragment key={rubro.id}>
                      <tr className="bg-slate-800 text-white font-extrabold uppercase text-[11px] print:bg-slate-800 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        <td className="px-4 py-2.5">{rubro.nombre}</td>
                        <td className="px-4 py-2.5 text-right">$ {rubroPresupuestadoFiltrado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5 text-right text-amber-400">$ {rubroRealFiltrado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-2.5 text-right">
                          {renderDesvioConFlecha(rubroDesvioFiltrado)}
                        </td>
                      </tr>
                      
                      {categoriasFiltradas.map(cat => {
                        const catData = rubro.categorias[cat];
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
                  );
                })}

                <tr className="bg-amber-100 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300 print:bg-amber-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td className="px-4 py-3">SUBTOTAL {tipoProyecto === 'obra' ? 'RUBROS DE OBRA' : 'CONTRATO'}</td>
                  <td className="px-4 py-3 text-right">$ {granTotalPresupuestadoFiltrado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-amber-800">$ {granTotalRealFiltrado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right">
                    {renderDesvioConFlecha(granTotalPresupuestadoFiltrado - granTotalRealFiltrado)}
                  </td>
                </tr>

                {gastosGeneralesDetalle.length > 0 && tipoInsumoFiltro === 'TODOS' && (
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
                  <td className="px-4 py-4 text-right">$ {(granTotalPresupuestadoFiltrado + (tipoInsumoFiltro === 'TODOS' ? totalGGPresupuestado : 0)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-4 text-right text-amber-400">$ {(granTotalRealFiltrado + (tipoInsumoFiltro === 'TODOS' ? totalGGReal : 0)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-4 text-right">
                    {renderDesvioConFlecha(((granTotalPresupuestadoFiltrado + (tipoInsumoFiltro === 'TODOS' ? totalGGPresupuestado : 0))) - ((granTotalRealFiltrado + (tipoInsumoFiltro === 'TODOS' ? totalGGReal : 0))))}
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