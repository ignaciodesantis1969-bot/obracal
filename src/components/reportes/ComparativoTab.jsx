import React, { useState, useMemo } from 'react';
import { TrendingUp, Printer } from 'lucide-react';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  tesoreria = [],
  allReportesSice = []
}) {
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const ordenCategorias = useMemo(() => ['Materiales', 'Mano de Obra', 'Equipos', 'Subcontratos', 'Gastos Generales'], []);

  const presupuestosAprobados = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.estado || p?.Estado_presupuesto || '').toLowerCase().trim();
      return est === 'aprobado' || est === 'aprobada';
    });
  }, [presupuestos]);

  const presupuestoSeleccionado = useMemo(() => {
    if (!compPresupuestoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID || p?.codigo || p?.Codigo) === String(compPresupuestoId));
  }, [compPresupuestoId, presupuestos]);

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

  const resolverTipoInsumoOficial = (textoCompleto) => {
    const tc = limpiarTexto(textoCompleto);
    
    if (
      tc.includes('mano de obra') || 
      tc.includes('sueldo') || 
      tc.includes('viatico') || 
      tc.includes('cargas sociales') || 
      tc.includes('jornal') ||
      tc.includes('rrhh')
    ) {
      return 'Mano de Obra';
    }

    if (tc.includes('subcontrato') || tc.includes('servicio')) return 'Subcontratos';
    if (tc.includes('equipo') || tc.includes('maquinaria') || tc.includes('herramienta') || tc.includes('alquiler')) return 'Equipos';
    if (tc.includes('gasto') || tc.includes('general') || tc.includes('imprevisto') || tc.includes('seguridad e higiene') || tc.includes('ropa de trabajo') || tc.includes('epp')) return 'Gastos Generales';
    
    return 'Materiales'; 
  };

  const mapaInsumosPresupuesto = useMemo(() => {
    if (!presupuestoSeleccionado) return {};
    let rawDetalle = presupuestoSeleccionado?.items_detalle || presupuestoSeleccionado?.itemsDetalle || presupuestoSeleccionado?.rubros || [];
    if (typeof rawDetalle === 'string') { try { rawDetalle = JSON.parse(rawDetalle); } catch { rawDetalle = []; } }
    
    let rubrosList = rawDetalle?.rubros || rawDetalle;
    if (typeof rubrosList === 'string') { try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; } }
    if (!Array.isArray(rubrosList)) rubrosList = [rubrosList];

    const map = {};
    rubrosList.forEach(r => {
      let tareasList = r?.tareas || r?.items || [];
      if (typeof tareasList === 'string') { try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; } }
      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insList = t?.insumos || t?.materiales || [];
          if (typeof insList === 'string') { try { insList = JSON.parse(insList); } catch { insList = []; } }
          if (Array.isArray(insList)) {
            insList.forEach(ins => {
              const nombreIns = limpiarTexto(ins?.nombre || ins?.descripcion || t?.tarea || '');
              const tipoIns = ins?.tipo || ins?.categoria || t?.tipo || 'Materiales';
              if (nombreIns) map[nombreIns] = resolverTipoInsumoOficial(`${tipoIns} ${nombreIns}`);
            });
          }
        });
      }
    });
    return map;
  }, [presupuestoSeleccionado]);

  const todosLosEgresos = useMemo(() => {
    return [...(Array.isArray(facturas) ? facturas : []), ...(Array.isArray(tesoreria) ? tesoreria : [])];
  }, [facturas, tesoreria]);

  const { analisisRubrosDetallado, gastosGeneralesDetalle } = useMemo(() => {
    if (!presupuestoSeleccionado) return { analisisRubrosDetallado: [], gastosGeneralesDetalle: [] };

    let rawDetalle = presupuestoSeleccionado?.items_detalle || presupuestoSeleccionado?.itemsDetalle || presupuestoSeleccionado?.rubros || [];
    if (typeof rawDetalle === 'string') { try { rawDetalle = JSON.parse(rawDetalle); } catch { rawDetalle = []; } }
    let rubrosList = rawDetalle?.rubros || rawDetalle;
    if (typeof rubrosList === 'string') { try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; } }
    if (!Array.isArray(rubrosList)) rubrosList = [rubrosList];

    const pIdReal = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.ID || '').trim();
    const pCodReal = String(presupuestoSeleccionado?.codigo || presupuestoSeleccionado?.Codigo || '').trim();
    const pNombreReal = String(presupuestoSeleccionado?.nombre || presupuestoSeleccionado?.nombre_obra || '').trim();
    
    // Identificamos el índice o número corto (ej: si el id es "1" o el selector manda el índice)
    const indicePresupuesto = presupuestosAprobados.findIndex(p => String(p?.id || p?.ID || p?.codigo) === String(compPresupuestoId)) + 1;

    // FILTRO SEGURO: Solo acepta registros cuyo ID coincida con la obra o cuyo texto mencione específicamente este presupuesto.
    const facturasDelPto = todosLosEgresos
      .filter(f => {
        const fPto = String(f?.presupuesto_id || f?.presupuestoId || '').trim();
        const fDesc = String(f?.concepto || f?.descripcion || f?.detalle_gasto || '');
        
        // 1. Coincidencia exacta por ID o código de obra
        if (fPto === pIdReal || fPto === pCodReal) return true;
        if (pCodReal && fDesc.includes(pCodReal)) return true;
        if (pNombreReal && fDesc.includes(pNombreReal)) return true;
        
        // 2. Coincidencia por número de presupuesto grabado por RRHH/Tesorería (ej: "Presupuesto: 1")
        if (fDesc.includes(`Presupuesto: ${pIdReal}`) || fDesc.includes(`Presupuesto: ${indicePresupuesto}`)) {
          return true;
        }

        // Si no tiene asignado ningún presupuesto, se asume que no pertenece a esta obra y se descarta por seguridad.
        return false;
      })
      .map((f, i) => ({ ...f, _uid: f.id || f.ID || f.n_factura || `fac_temp_${i}` }));

    let comercialObj = rawDetalle?.comercial || presupuestoSeleccionado?.comercial || {};
    if (typeof comercialObj === 'string') { try { comercialObj = JSON.parse(comercialObj); } catch { comercialObj = {}; } }

    let ggList = comercialObj?.gastos_generales_insumos || rawDetalle?.gastos_generales_insumos || rawDetalle?.gastos_generales || [];
    if (typeof ggList === 'string') { try { ggList = JSON.parse(ggList); } catch { ggList = []; } }
    
    let valorHoraReferencia = 15000;
    try {
      const primeraTarea = rubrosList[0]?.tareas?.[0] || rubrosList[0]?.items?.[0];
      if (primeraTarea?.costo_unitario) valorHoraReferencia = parsearMonto(primeraTarea.costo_unitario) || 15000;
    } catch (e) {}

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
            const esMano = limpiarTexto(t?.descripcion || '').includes('mano de obra') || limpiarTexto(t?.unidad || '').includes('hs');
            const catDestino = esMano ? 'Mano de Obra' : 'Materiales';
            categoriasMap[catDestino].presupuestado += tareaTotal;
            totalRubroPresupuestado += tareaTotal;
          } else {
            insumosList.forEach(ins => {
              const catDestino = resolverTipoInsumoOficial(`${ins?.tipo || ins?.categoria || ins?.rubro || ''} ${ins?.nombre || ''}`);
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

        const facturasGG = facturasDelPto.filter(f => {
          if (facturasUsadas.has(f._uid)) return false;
          const textoFacGG = limpiarTexto(`${f?.rubro || ''} ${f?.rubro_presupuesto || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''} ${f?.descripcion || ''} ${f?.tipo_insumo || ''}`);
          if (textoFacGG.includes(normGG)) {
            facturasUsadas.add(f._uid);
            return true;
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
        (rep?.items || []).forEach(it => {
          if (limpiarTexto(it?.descripcion).includes(normRubro)) totalHsSice += parsearMonto(rep?.totalHorasSuma || 0);
        });
      });
      ri.categoriasMap['Mano de Obra'].real += (totalHsSice * valorHoraReferencia);

      const facturasRubro = facturasDelPto.filter(f => {
        if (facturasUsadas.has(f._uid)) return false; 
        
        const fTextRaw = `${f?.rubro || ''} ${f?.rubro_presupuesto || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''} ${f?.descripcion || ''}`;
        const fTextLimpiado = limpiarTexto(fTextRaw);
        
        // Extraemos el nombre del rubro dentro del corchete de Tesorería (ej: [Rubro: DEMOLICIONES - 100%])
        const matchCorchetes = fTextRaw.match(/\[Rubro:\s*(.*?)\s*-/i);
        let rubroExtraido = '';
        if (matchCorchetes && matchCorchetes[1]) {
          rubroExtraido = limpiarTexto(matchCorchetes[1]);
        }

        if (
          (rubroExtraido && (normRubro === rubroExtraido || normRubro.includes(rubroExtraido) || rubroExtraido.includes(normRubro))) || 
          fTextLimpiado.includes(normRubro)
        ) {
          facturasUsadas.add(f._uid);
          return true;
        }
        return false;
      });

      facturasRubro.forEach(f => {
        const montoFactura = parsearMonto(f?.subtotal || f?.total || f?.monto || f?.importe);
        const textoCompletoFac = `${f?.tipo_insumo || ''} ${f?.tipoInsumo || ''} ${f?.categoria_insumo || ''} ${f?.categoria || ''} ${f?.tipo || ''} ${f?.detalle_gasto || ''} ${f?.concepto || ''} ${f?.descripcion || ''} ${f?.observaciones || ''}`;
        
        let catDestino = resolverTipoInsumoOficial(textoCompletoFac);
        
        if (catDestino === 'Materiales') {
          const tLimpiado = limpiarTexto(textoCompletoFac);
          Object.keys(mapaInsumosPresupuesto).forEach(keyIns => {
            if (tLimpiado.includes(keyIns)) {
              catDestino = mapaInsumosPresupuesto[keyIns];
            }
          });
        }
        
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
  }, [presupuestoSeleccionado, allReportesSice, todosLosEgresos, ordenCategorias, mapaInsumosPresupuesto, compPresupuestoId, presupuestosAprobados]);

  const granTotalPresupuestadoRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.presupuestado, 0), [analisisRubrosDetallado]);
  const granTotalRealRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.real, 0), [analisisRubrosDetallado]);
  const totalGGPresupuestado = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.presupuestado, 0), [gastosGeneralesDetalle]);
  const totalGGReal = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.real, 0), [gastosGeneralesDetalle]);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo (Presupuesto vs. Real)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Discriminado por rubros, subcategorías imputadas y gastos generales con subtotales.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={compPresupuestoId}
            onChange={(e) => setCompPresupuestoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer min-w-[300px]"
          >
            <option value="">-- Seleccionar Presupuesto Aprobado ({presupuestosAprobados.length} disp.) --</option>
            {presupuestosAprobados.map(p => {
              const pId = p?.id || p?.ID || p?.codigo;
              const pCod = p?.codigo || pId;
              const pNom = p?.nombre || p?.nombre_obra || 'Presupuesto';
              return <option key={pId} value={pId}>[{pCod}] {pNom}</option>;
            })}
          </select>
          <button
            onClick={() => window.print()}
            disabled={!presupuestoSeleccionado}
            className={`px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors ${!presupuestoSeleccionado ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-600 cursor-pointer'}`}
          >
            <Printer className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      {!presupuestoSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl print:hidden">
          Por favor, seleccione un presupuesto aprobado para visualizar el análisis comparativo detallado.
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
                      <td className={`px-4 py-2.5 text-right ${rubro.desvio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        $ {rubro.desvio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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
                          <td className={`px-4 py-2 text-right font-bold ${catData.desvio >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            $ {catData.desvio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                <tr className="bg-amber-100 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300 print:bg-amber-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <td className="px-4 py-3">SUBTOTAL RUBROS DE OBRA</td>
                  <td className="px-4 py-3 text-right">$ {granTotalPresupuestadoRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-amber-800">$ {granTotalRealRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className={`px-4 py-3 text-right ${(granTotalPresupuestadoRubros - granTotalRealRubros) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    $ {(granTotalPresupuestadoRubros - granTotalRealRubros).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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
                        <td className={`px-4 py-2 text-right font-bold ${gg.desvio >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          $ {gg.desvio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                    
                    <tr className="bg-amber-100 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300 print:bg-amber-100" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="px-4 py-3">SUBTOTAL GASTOS GENERALES</td>
                      <td className="px-4 py-3 text-right">$ {totalGGPresupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right text-amber-800">$ {totalGGReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className={`px-4 py-3 text-right ${(totalGGPresupuestado - totalGGReal) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        $ {(totalGGPresupuestado - totalGGReal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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
                  <td className={`px-4 py-4 text-right ${((granTotalPresupuestadoRubros + totalGGPresupuestado) - (granTotalRealRubros + totalGGReal)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    $ {((granTotalPresupuestadoRubros + totalGGPresupuestado) - (granTotalRealRubros + totalGGReal)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
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