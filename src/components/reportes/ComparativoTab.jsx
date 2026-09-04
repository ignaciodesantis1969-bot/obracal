import React, { useState, useMemo } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  allReportesSice = [],
  obras = []
}) {
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');
  const [rubroExpandidoId, setRubroExpandidoId] = useState(null);
  const [mostrarGastosGeneralesDetalle, setMostrarGastosGeneralesDetalle] = useState(true);

  const ordenCategorias = useMemo(() => ['Materiales', 'Mano de Obra', 'Equipos', 'Subcontratos', 'Varios'], []);

  const presupuestosCompFiltrados = useMemo(() => {
    let lista = presupuestos;
    if (compObraId && compObraId !== 'todas') {
      lista = lista.filter(p => {
        const pObra = String(p?.obra_id || p?.obraId || p?.obra || '').trim();
        return pObra === String(compObraId);
      });
    }
    return lista;
  }, [presupuestos, compObraId]);

  const presupuestoSeleccionado = useMemo(() => {
    if (!compPresupuestoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID || p?.codigo || p?.Codigo) === String(compPresupuestoId));
  }, [compPresupuestoId, presupuestos]);

  const limpiarTexto = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  // Procesamiento detallado por Rubro y Categorías de Insumos
  const analisisRubrosDetallado = useMemo(() => {
    if (!presupuestoSeleccionado) return [];

    let rawDetalle = presupuestoSeleccionado?.items_detalle || 
                     presupuestoSeleccionado?.itemsDetalle || 
                     presupuestoSeleccionado?.rubros || 
                     presupuestoSeleccionado?.detalles || [];

    if (typeof rawDetalle === 'string') {
      try { rawDetalle = JSON.parse(rawDetalle); } catch { rawDetalle = []; }
    }

    let rubrosList = rawDetalle?.rubros || rawDetalle;
    if (typeof rubrosList === 'string') {
      try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; }
    }

    if (!Array.isArray(rubrosList)) {
      rubrosList = [rubrosList];
    }

    return rubrosList.map((r, rIdx) => {
      const nombreRubro = r?.rubro || r?.nombre || `Rubro ${rIdx + 1}`;
      let tareasList = r?.tareas || r?.items || r?.subitems || [];
      if (typeof tareasList === 'string') {
        try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; }
      }

      const categoriasMap = {};
      ordenCategorias.forEach(cat => categoriasMap[cat] = { presupuestado: 0, items: [] });

      let totalRubroPresupuestado = 0;

      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insumosList = t?.insumos || t?.materiales || t?.detalle_insumos || [];
          if (typeof insumosList === 'string') {
            try { insumosList = JSON.parse(insumosList); } catch { insumosList = []; }
          }

          const tareaDesc = t?.descripcion || t?.tarea || 'Labor general';
          const tareaTotal = Number(t?.total || (Number(t?.cantidad || t?.cant || 1) * Number(t?.costo_unitario || t?.precio_unitario || t?.unitario || 0)));

          if (!Array.isArray(insumosList) || insumosList.length === 0) {
            // Asignar a Materiales por defecto si no tiene insumos desglosados
            categoriasMap['Materiales'].presupuestado += tareaTotal;
            categoriasMap['Materiales'].items.push({ nombre: tareaDesc, total: tareaTotal });
            totalRubroPresupuestado += tareaTotal;
          } else {
            insumosList.forEach(ins => {
              const catIns = ins?.categoria || ins?.tipo || 'Materiales';
              const catDestino = ordenCategorias.includes(catIns) ? catIns : 'Materiales';
              const insTotal = Number(ins?.total || (Number(ins?.cantidad || ins?.cant || 1) * Number(ins?.costo_unitario || ins?.precio || 0)));
              
              categoriasMap[catDestino].presupuestado += insTotal;
              categoriasMap[catDestino].items.push({ nombre: ins?.nombre || ins?.descripcion || 'Insumo', total: insTotal });
              totalRubroPresupuestado += insTotal;
            });
          }
        });
      }

      // Cálculo de real imputado (Salarios SICE + Facturas asociadas a este rubro)
      const normRubro = limpiarTexto(nombreRubro);
      let totalHsSice = 0;
      allReportesSice.forEach(rep => {
        const itemsRep = rep?.items || [];
        itemsRep.forEach(it => {
          if (limpiarTexto(it?.descripcion).includes(normRubro) || normRubro.includes(limpiarTexto(it?.descripcion).slice(0, 5))) {
            totalHsSice += Number(rep?.totalHorasSuma || 0);
          }
        });
      });
      const realSalarios = totalHsSice * 5000;

      const facturasRubro = facturas.filter(f => {
        const fPresupuesto = String(f?.presupuesto_id || f?.presupuestoId || '').trim();
        const pId = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.codigo || '').trim();
        const fRubro = limpiarTexto(f?.rubro_presupuesto || f?.rubro || '');
        return (fPresupuesto === pId || !fPresupuesto) && fRubro.includes(normRubro);
      });
      const realFacturas = facturasRubro.reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);

      const totalRealRubro = realSalarios + realFacturas;
      const desvioRubro = totalRubroPresupuestado - totalRealRubro;

      return {
        id: r?.id || rIdx,
        nombre: nombreRubro,
        presupuestado: totalRubroPresupuestado > 0 ? totalRubroPresupuestado : Number(r?.total || 0),
        real: totalRealRubro,
        desvio: desvioRubro,
        categorias: categoriasMap
      };
    });
  }, [presupuestoSeleccionado, allReportesSice, facturas, ordenCategorias]);

  const granTotalPresupuestado = useMemo(() => {
    return analisisRubrosDetallado.reduce((acc, r) => acc + r.presupuestado, 0);
  }, [analisisRubrosDetallado]);

  const granTotalReal = useMemo(() => {
    return analisisRubrosDetallado.reduce((acc, r) => acc + r.real, 0);
  }, [analisisRubrosDetallado]);

  const granDesvioTotal = granTotalPresupuestado - granTotalReal;

  // Gastos Generales e Imprevistos desglosados
  const gastosGeneralesItems = useMemo(() => {
    const facturasGG = facturas.filter(f => {
      const fPresupuesto = String(f?.presupuesto_id || f?.presupuestoId || '').trim();
      const pId = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.codigo || '').trim();
      const rubroFac = limpiarTexto(f?.rubro || f?.categoria || f?.rubro_presupuesto);
      return (fPresupuesto === pId || !fPresupuesto) && (rubroFac.includes('general') || rubroFac.includes('gastos') || rubroFac.includes('imprevisto'));
    });

    if (facturasGG.length > 0) {
      return facturasGG.map((f, idx) => ({
        id: f?.id || idx,
        concepto: f?.descripcion || f?.concepto || `Gasto General #${idx + 1}`,
        presupuestado: Number(f?.presupuestado || 100000),
        real: Number(f?.subtotal || f?.total || 0)
      }));
    }

    // Datos por defecto si no hay facturas de GG específicas
    return [
      { id: 1, concepto: 'Logística, Movilidad y Viáticos', presupuestado: 150000, real: 65000 },
      { id: 2, concepto: 'Seguridad e Higiene / EPP', presupuestado: 100000, real: 40000 },
      { id: 3, concepto: 'Imprevistos de Obra y Contingencias', presupuestado: 200000, real: 85000 }
    ];
  }, [facturas, presupuestoSeleccionado]);

  const totalGGPresupuestado = gastosGeneralesItems.reduce((acc, i) => acc + i.presupuestado, 0);
  const totalGGReal = gastosGeneralesItems.reduce((acc, i) => acc + i.real, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo Detallado (Presupuesto vs. Real)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Cruce de montos por rubro, categorías de insumos, mano de obra, equipos y gastos generales.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={compObraId}
            onChange={(e) => {
              setCompObraId(e.target.value);
              setCompPresupuestoId('');
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="todas">-- Todas las Obras --</option>
            {obras.map(o => {
              const oId = o?.id || o?.ID;
              const oNom = o?.nombre || o?.nombre_obra || 'Obra';
              return <option key={oId} value={oId}>{oNom}</option>;
            })}
          </select>
          <select
            value={compPresupuestoId}
            onChange={(e) => setCompPresupuestoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Seleccionar Presupuesto ({presupuestosCompFiltrados.length} disp.) --</option>
            {presupuestosCompFiltrados.map(p => {
              const pId = p?.id || p?.ID || p?.codigo;
              const pCod = p?.codigo || pId;
              const pNom = p?.nombre || p?.nombre_obra || 'Presupuesto';
              return <option key={pId} value={pId}>[{pCod}] {pNom}</option>;
            })}
          </select>
        </div>
      </div>

      {!presupuestoSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
          Por favor, seleccione un presupuesto para visualizar el análisis comparativo detallado.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Total Presupuestado</span>
              <p className="text-lg font-black text-slate-900 mt-1">$ {(granTotalPresupuestado + totalGGPresupuestado).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Total Imputado Real</span>
              <p className="text-lg font-black text-amber-700 mt-1">$ {(granTotalReal + totalGGReal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Desvío Financiero Total</span>
              <p className={`text-lg font-black mt-1 ${(granDesvioTotal + (totalGGPresupuestado - totalGGReal)) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                $ {((granTotalPresupuestado + totalGGPresupuestado) - (granTotalReal + totalGGReal)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase">Detalle por Rubro Constructivo (Con discriminación por Categorías)</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                    <th className="px-4 py-3">Rubro / Categoría</th>
                    <th className="px-4 py-3 text-right">Presupuestado</th>
                    <th className="px-4 py-3 text-right">Real Imputado</th>
                    <th className="px-4 py-3 text-right">Desvío</th>
                    <th className="px-4 py-3 text-center w-16">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analisisRubrosDetallado.map((rubro) => {
                    const isExpanded = rubroExpandidoId === rubro.id;
                    const desvioRubro = rubro.presupuestado - rubro.real;

                    return (
                      <React.Fragment key={rubro.id}>
                        <tr className="hover:bg-slate-50 font-medium bg-slate-50/50 border-t border-slate-200">
                          <td className="px-4 py-3 font-extrabold text-slate-900 flex items-center gap-2">
                            <span>{rubro.nombre}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">$ {rubro.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="px-4 py-3 text-right font-black text-amber-800">$ {rubro.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className={`px-4 py-3 text-right font-black ${desvioRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            $ {desvioRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setRubroExpandidoId(isExpanded ? null : rubro.id)}
                              className="p-1 bg-slate-200 hover:bg-amber-500 hover:text-white rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Desplegar categorías"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && ordenCategorias.map(cat => {
                          const catData = rubro.categorias[cat];
                          if (!catData || catData.presupuestado === 0) return null;

                          return (
                            <tr key={cat} className="bg-white text-[11px] border-b border-slate-100">
                              <td className="px-8 py-2 text-slate-700 font-semibold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ↳ {cat}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">$ {catData.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="px-4 py-2 text-right text-slate-600">-</td>
                              <td className="px-4 py-2 text-right text-slate-500">-</td>
                              <td></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase">Gastos Generales, Contingencias e Imprevistos</h4>
              <button
                onClick={() => setMostrarGastosGeneralesDetalle(!mostrarGastosGeneralesDetalle)}
                className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
              >
                {mostrarGastosGeneralesDetalle ? 'Ocultar Desglose' : 'Ver Desglose Completo'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
                <span>Concepto de Gasto General / Imprevisto</span>
                <div className="flex gap-12 text-right">
                  <span>Presupuestado</span>
                  <span>Real Imputado</span>
                  <span>Desvío</span>
                </div>
              </div>

              {gastosGeneralesItems.map(gg => {
                const desvioGG = gg.presupuestado - gg.real;
                return (
                  <div key={gg.id} className="flex justify-between items-center text-xs bg-white p-3 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-900">{gg.concepto}</span>
                    <div className="flex gap-12 text-right font-semibold">
                      <span className="text-slate-800">$ {gg.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-amber-800 font-bold">$ {gg.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      <span className={desvioGG >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        $ {desvioGG.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-between items-center text-xs bg-slate-900 text-white p-3 rounded-xl font-extrabold mt-2">
                <span>TOTAL GASTOS GENERALES E IMPREVISTOS:</span>
                <div className="flex gap-12 text-right">
                  <span>$ {totalGGPresupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                  <span className="text-amber-400">$ {totalGGReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                  <span className={(totalGGPresupuestado - totalGGReal) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    $ {(totalGGPresupuestado - totalGGReal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}