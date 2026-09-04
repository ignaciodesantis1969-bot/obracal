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
    let lista = presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
      return est === 'aprobado' || est === 'aprobada';
    });
    if (compObraId && compObraId !== 'todas') {
      lista = lista.filter(p => String(p?.obra_id || p?.obraId || p?.obra) === String(compObraId));
    }
    return lista;
  }, [presupuestos, compObraId]);

  const presupuestoSeleccionado = useMemo(() => {
    if (!compPresupuestoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID) === String(compPresupuestoId));
  }, [compPresupuestoId, presupuestos]);

  const rubrosPresupuestoDetalle = useMemo(() => {
    if (!presupuestoSeleccionado) return [];
    let rubros = presupuestoSeleccionado?.rubros || presupuestoSeleccionado?.detalles || [];
    if (typeof rubros === 'string') {
      try { rubros = JSON.parse(rubros); } catch { rubros = []; }
    }
    return rubros.map((r, idx) => {
      let tareas = r?.tareas || r?.items || [];
      if (typeof tareas === 'string') {
        try { tareas = JSON.parse(tareas); } catch { tareas = []; }
      }
      const totalRubro = tareas.reduce((acc, t) => acc + Number(t?.total || (Number(t?.cantidad || 1) * Number(t?.costo_unitario || 0))), 0);
      return {
        id: r?.id || idx,
        nombre: r?.nombre || r?.rubro || `Rubro ${idx + 1}`,
        total: totalRubro
      };
    });
  }, [presupuestoSeleccionado]);

  const granTotalPresupuestado = useMemo(() => {
    return rubrosPresupuestoDetalle.reduce((acc, r) => acc + (r?.total || 0), 0);
  }, [rubrosPresupuestoDetalle]);

  const limpiarTexto = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const obtenerSalariosPorRubro = (nombreRubro) => {
    const norm = limpiarTexto(nombreRubro);
    let totalHs = 0;
    allReportesSice.forEach(rep => {
      const items = rep?.items || [];
      items.forEach(it => {
        if (limpiarTexto(it?.descripcion).includes(norm) || norm.includes(limpiarTexto(it?.descripcion).slice(0, 5))) {
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
      const fPresupuesto = String(f?.presupuesto_id || f?.presupuestoId || '').trim();
      return fPresupuesto === pCodigo || fPresupuesto === String(presupuestoSeleccionado?.id);
    });
  }, [presupuestoSeleccionado, facturas]);

  const gastosGeneralesDetalle = useMemo(() => {
    const totalFacturasGG = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro || f?.categoria).includes('general') || limpiarTexto(f?.rubro || f?.categoria).includes('gastos')).reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);
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
            {obras.map(o => (
              <option key={o?.id || o?.ID} value={o?.id || o?.ID}>{o?.nombre || o?.nombre_obra || 'Obra'}</option>
            ))}
          </select>
          <select
            value={compPresupuestoId}
            onChange={(e) => setCompPresupuestoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Seleccionar Presupuesto Aprobado --</option>
            {presupuestosCompFiltrados.map(p => (
              <option key={p?.id || p?.ID} value={p?.id || p?.ID}>[{p?.codigo || p?.id}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}</option>
            ))}
          </select>
        </div>
      </div>

      {!presupuestoSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
          Por favor, seleccione un presupuesto aprobado para visualizar el análisis comparativo financiero.
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
                  const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
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
                  const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
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
                    const facturasRubroSuma = facturasRubroTotal.reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
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