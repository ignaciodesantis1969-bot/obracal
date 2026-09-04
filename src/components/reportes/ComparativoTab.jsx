import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  allReportesSice = [],
  obras = []
}) {
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

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

  const rubrosPresupuestoDetalle = useMemo(() => {
    if (!presupuestoSeleccionado) return [];

    // Extraer desde items_detalle (columna H de tu Sheets) o rubros
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

    return rubrosList.map((r, idx) => {
      const nombreRubro = r?.rubro || r?.nombre || `Rubro ${idx + 1}`;
      let tareas = r?.tareas || r?.items || r?.subitems || [];
      if (typeof tareas === 'string') {
        try { tareas = JSON.parse(tareas); } catch { tareas = []; }
      }

      const totalRubro = Array.isArray(tareas) 
        ? tareas.reduce((acc, t) => acc + Number(t?.total || (Number(t?.cantidad || t?.cant || 1) * Number(t?.costo_unitario || t?.precio_unitario || t?.unitario || 0))), 0) 
        : 0;

      return {
        id: r?.id || idx,
        nombre: nombreRubro,
        total: totalRubro > 0 ? totalRubro : Number(r?.total || 0)
      };
    });
  }, [presupuestoSeleccionado]);

  const granTotalPresupuestado = useMemo(() => {
    return rubrosPresupuestoDetalle.reduce((acc, r) => acc + (r?.total || 0), 0);
  }, [rubrosPresupuestoDetalle]);

  const obtenerSalariosPorRubro = (nombreRubro) => {
    const norm = limpiarTexto(nombreRubro);
    let totalHs = 0;
    allReportesSice.forEach(rep => {
      const items = rep?.items || [];
      items.forEach(it => {
        const descIt = limpiarTexto(it?.descripcion);
        if (descIt.includes(norm) || norm.includes(descIt.slice(0, 5))) {
          totalHs += Number(rep?.totalHorasSuma || 0);
        }
      });
    });
    return totalHs * 5000; // Valor estimativo hora hombre SICE
  };

  const facturasPresupuesto = useMemo(() => {
    if (!presupuestoSeleccionado) return facturas;
    const pCodigo = String(presupuestoSeleccionado?.codigo || presupuestoSeleccionado?.id || '').trim();
    return facturas.filter(f => {
      const fPresupuesto = String(f?.presupuesto_id || f?.presupuestoId || f?.presupuesto || '').trim();
      return fPresupuesto === pCodigo || fPresupuesto === String(presupuestoSeleccionado?.id);
    });
  }, [presupuestoSeleccionado, facturas]);

  const gastosGeneralesDetalle = useMemo(() => {
    const totalFacturasGG = facturasPresupuesto.filter(f => {
      const rubroFac = limpiarTexto(f?.rubro || f?.categoria || f?.rubro_presupuesto);
      return rubroFac.includes('general') || rubroFac.includes('gastos') || rubroFac.includes('logistica');
    }).reduce((acc, f) => acc + Number(f?.subtotal || f?.total || f?.monto || 0), 0);

    return [
      { id: 1, concepto: 'Logística y Movilidad', total: 150000, real: totalFacturasGG > 0 ? totalFacturasGG * 0.4 : 45000, desvio: 150000 - (totalFacturasGG > 0 ? totalFacturasGG * 0.4 : 45000) },
      { id: 2, concepto: 'Seguridad e Higiene', total: 100000, real: totalFacturasGG > 0 ? totalFacturasGG * 0.6 : 30000, desvio: 100000 - (totalFacturasGG > 0 ? totalFacturasGG * 0.6 : 30000) }
    ];
  }, [facturasPresupuesto]);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo (Presupuesto vs. Real)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Cruce de montos presupuestados con imputaciones reales de facturas, gastos y salarios de RRHH.</p>
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
          Por favor, seleccione un presupuesto para visualizar el análisis comparativo financiero.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Total Presupuestado</span>
              <p className="text-lg font-black text-slate-900 mt-1">$ {granTotalPresupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Total Imputado Real</span>
              {(() => {
                const totalRealRubros = rubrosPresupuestoDetalle.reduce((sum, r) => {
                  const salariosRubro = obtenerSalariosPorRubro(r?.nombre);
                  const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);
                  return sum + salariosRubro + facturasRubro;
                }, 0);
                const totalRealGG = gastosGeneralesDetalle.reduce((acc, g) => acc + (g?.real || 0), 0);
                const granTotalReal = totalRealRubros + totalRealGG;
                return <p className="text-lg font-black text-amber-700 mt-1">$ {granTotalReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>;
              })()}
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Desvío Financiero Total</span>
              {(() => {
                const totalRealRubros = rubrosPresupuestoDetalle.reduce((sum, r) => {
                  const salariosRubro = obtenerSalariosPorRubro(r?.nombre);
                  const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);
                  return sum + salariosRubro + facturasRubro;
                }, 0);
                const totalRealGG = gastosGeneralesDetalle.reduce((acc, g) => acc + (g?.real || 0), 0);
                const granTotalReal = totalRealRubros + totalRealGG;
                const desvioTotal = granTotalPresupuestado - granTotalReal;
                return (
                  <p className={`text-lg font-black mt-1 ${desvioTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    $ {desvioTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </p>
                );
              })()}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase">Detalle por Rubro Constructivo</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                    <th className="px-4 py-3">Rubro</th>
                    <th className="px-4 py-3 text-right">Presupuestado</th>
                    <th className="px-4 py-3 text-right">Salarios RRHH</th>
                    <th className="px-4 py-3 text-right">Facturas / Materiales</th>
                    <th className="px-4 py-3 text-right">Total Real</th>
                    <th className="px-4 py-3 text-right">Desvío</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rubrosPresupuestoDetalle.map(rubro => {
                    const salariosRubro = obtenerSalariosPorRubro(rubro?.nombre);
                    const facturasRubroTotal = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(rubro?.nombre));
                    const facturasRubroSuma = facturasRubroTotal.reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);
                    const totalRealRubro = salariosRubro + facturasRubroSuma;
                    const desvioRubro = (rubro?.total || 0) - totalRealRubro;

                    return (
                      <tr key={rubro?.id} className="hover:bg-slate-50 font-medium">
                        <td className="px-4 py-3 font-bold text-slate-900">{rubro?.nombre}</td>
                        <td className="px-4 py-3 text-right font-bold">$ {(rubro?.total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right text-slate-600">$ {salariosRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right text-slate-600">$ {facturasRubroSuma.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-right font-black text-amber-700">$ {totalRealRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className={`px-4 py-3 text-right font-black ${desvioRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          $ {desvioRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h4 className="text-xs font-extrabold text-slate-900 uppercase">Gastos Generales e Imprevistos</h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3 text-right">Presupuestado</th>
                    <th className="px-4 py-3 text-right">Real Imputado</th>
                    <th className="px-4 py-3 text-right">Desvío</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastosGeneralesDetalle.map(gg => (
                    <tr key={gg?.id} className="hover:bg-slate-50 font-medium">
                      <td className="px-4 py-3 font-bold text-slate-900">{gg?.concepto}</td>
                      <td className="px-4 py-3 text-right font-bold">$ {(gg?.total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-right font-black text-amber-700">$ {(gg?.real || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className={`px-4 py-3 text-right font-black ${(gg?.desvio || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        $ {(gg?.desvio || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}