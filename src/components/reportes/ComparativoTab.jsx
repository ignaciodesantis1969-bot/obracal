import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

export default function ComparativoTab({
  presupuestos = [],
  facturas = [],
  allReportesSice = []
}) {
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const ordenCategorias = useMemo(() => ['Materiales', 'Mano de Obra', 'Equipos', 'Subcontratos', 'Varios'], []);

  // 1. Filtrar solo presupuestos aprobados
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

  // 2. Procesamiento de Rubros y Categorías
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
      ordenCategorias.forEach(cat => categoriasMap[cat] = 0);
      let totalRubroPresupuestado = 0;

      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insumosList = t?.insumos || t?.materiales || t?.detalle_insumos || [];
          if (typeof insumosList === 'string') {
            try { insumosList = JSON.parse(insumosList); } catch { insumosList = []; }
          }

          if (!Array.isArray(insumosList) || insumosList.length === 0) {
            // Si la tarea no tiene insumos, va a Mano de Obra o Materiales según el nombre, por defecto Materiales
            const tareaTotal = Number(t?.total || (Number(t?.cantidad || 1) * Number(t?.costo_unitario || 0)));
            const esManoDeObra = limpiarTexto(t?.descripcion || '').includes('mano de obra') || limpiarTexto(t?.unidad || '').includes('hs');
            const catDestino = esManoDeObra ? 'Mano de Obra' : 'Materiales';
            
            categoriasMap[catDestino] += tareaTotal;
            totalRubroPresupuestado += tareaTotal;
          } else {
            // Discriminar cada insumo en su categoría correcta
            insumosList.forEach(ins => {
              const catOriginal = limpiarTexto(ins?.categoria || ins?.tipo || 'Materiales');
              let catDestino = 'Materiales'; // Default
              
              if (catOriginal.includes('mano') || catOriginal.includes('obra')) catDestino = 'Mano de Obra';
              else if (catOriginal.includes('equipo') || catOriginal.includes('herramienta')) catDestino = 'Equipos';
              else if (catOriginal.includes('subcontrato')) catDestino = 'Subcontratos';
              else if (catOriginal.includes('vario')) catDestino = 'Varios';

              const insTotal = Number(ins?.total || (Number(ins?.cantidad || 1) * Number(ins?.costo_unitario || ins?.precio || 0)));
              categoriasMap[catDestino] += insTotal;
              totalRubroPresupuestado += insTotal;
            });
          }
        });
      }

      // Costo Real: Horas SICE y Facturas del Rubro
      const normRubro = limpiarTexto(nombreRubro);
      let totalHsSice = 0;
      allReportesSice.forEach(rep => {
        (rep?.items || []).forEach(it => {
          if (limpiarTexto(it?.descripcion).includes(normRubro)) totalHsSice += Number(rep?.totalHorasSuma || 0);
        });
      });
      const realSalarios = totalHsSice * 5000;

      const facturasRubro = facturas.filter(f => {
        const fPresupuesto = String(f?.presupuesto_id || '').trim();
        const pId = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.codigo || '').trim();
        const fRubro = limpiarTexto(f?.rubro_presupuesto || f?.rubro || '');
        return (fPresupuesto === pId || !fPresupuesto) && fRubro.includes(normRubro);
      });
      const realFacturas = facturasRubro.reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);

      const totalRealRubro = realSalarios + realFacturas;

      return {
        id: r?.id || rIdx,
        nombre: nombreRubro,
        presupuestado: totalRubroPresupuestado > 0 ? totalRubroPresupuestado : Number(r?.total || 0),
        real: totalRealRubro,
        desvio: (totalRubroPresupuestado > 0 ? totalRubroPresupuestado : Number(r?.total || 0)) - totalRealRubro,
        categorias: categoriasMap,
        realSalarios,
        realFacturas
      };
    });
  }, [presupuestoSeleccionado, allReportesSice, facturas, ordenCategorias]);

  const granTotalPresupuestadoRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.presupuestado, 0), [analisisRubrosDetallado]);
  const granTotalRealRubros = useMemo(() => analisisRubrosDetallado.reduce((acc, r) => acc + r.real, 0), [analisisRubrosDetallado]);

  // 3. Gastos Generales extraídos del presupuesto (como en tu imagen)
  const gastosGeneralesDetalle = useMemo(() => {
    if (!presupuestoSeleccionado) return [];

    let rawDetalle = presupuestoSeleccionado?.items_detalle || presupuestoSeleccionado?.itemsDetalle || {};
    if (typeof rawDetalle === 'string') {
      try { rawDetalle = JSON.parse(rawDetalle); } catch { rawDetalle = {}; }
    }

    // Buscar en diferentes posibles claves donde se guarden los GG
    let ggList = rawDetalle?.gastosGenerales || rawDetalle?.gastos_generales || 
                 presupuestoSeleccionado?.gastosGenerales || presupuestoSeleccionado?.gastos_generales || [];
    
    if (typeof ggList === 'string') {
      try { ggList = JSON.parse(ggList); } catch { ggList = []; }
    }

    if (!Array.isArray(ggList) || ggList.length === 0) {
      return []; // Si no hay GG definidos, retorna vacío
    }

    return ggList.map((gg, idx) => {
      const nombreGG = gg?.concepto || gg?.nombre || gg?.descripcion || `Gasto General ${idx + 1}`;
      const presupuestadoGG = Number(gg?.total || gg?.monto || (Number(gg?.cantidad || 1) * Number(gg?.unitario || gg?.costo_unitario || 0)));

      // Buscar si hay facturas imputadas a este gasto general
      const normGG = limpiarTexto(nombreGG);
      const facturasGG = facturas.filter(f => {
        const fPresupuesto = String(f?.presupuesto_id || '').trim();
        const pId = String(presupuestoSeleccionado?.id || presupuestoSeleccionado?.codigo || '').trim();
        const rubroFac = limpiarTexto(f?.rubro || f?.categoria || f?.rubro_presupuesto);
        return (fPresupuesto === pId || !fPresupuesto) && rubroFac.includes(normGG);
      });
      
      const realGG = facturasGG.reduce((acc, f) => acc + Number(f?.subtotal || f?.total || 0), 0);

      return {
        id: gg?.id || idx,
        concepto: nombreGG,
        presupuestado: presupuestadoGG,
        real: realGG,
        desvio: presupuestadoGG - realGG
      };
    });
  }, [presupuestoSeleccionado, facturas]);

  const totalGGPresupuestado = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.presupuestado, 0), [gastosGeneralesDetalle]);
  const totalGGReal = useMemo(() => gastosGeneralesDetalle.reduce((acc, g) => acc + g.real, 0), [gastosGeneralesDetalle]);

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      {/* Cabecera y Filtro */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo (Presupuesto vs. Real)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Discriminado por rubros, categorías y gastos generales con subtotales.</p>
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
        </div>
      </div>

      {!presupuestoSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
          Por favor, seleccione un presupuesto aprobado para visualizar el análisis comparativo detallado.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase border-b border-slate-300 text-[10px]">
                  <th className="px-4 py-3">Concepto / Rubro / Categoría</th>
                  <th className="px-4 py-3 text-right">Monto Presupuestado</th>
                  <th className="px-4 py-3 text-right">Monto Real Imputado</th>
                  <th className="px-4 py-3 text-right">Desvío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                
                {/* LISTADO DE RUBROS CON FONDO OSCURO Y DESPLEGADOS */}
                {analisisRubrosDetallado.map((rubro) => (
                  <React.Fragment key={rubro.id}>
                    {/* Fila del Rubro (Fondo Oscuro) */}
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[11px]">
                      <td className="px-4 py-2.5">{rubro.nombre}</td>
                      <td className="px-4 py-2.5 text-right">$ {rubro.presupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className="px-4 py-2.5 text-right text-amber-400">$ {rubro.real.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      <td className={`px-4 py-2.5 text-right ${rubro.desvio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        $ {rubro.desvio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                    
                    {/* Categorías Desplegadas del Rubro */}
                    {ordenCategorias.map(cat => {
                      const montoCat = rubro.categorias[cat];
                      if (montoCat === 0) return null; // No mostrar categorías vacías
                      return (
                        <tr key={`${rubro.id}-${cat}`} className="hover:bg-slate-50 font-medium text-[11px]">
                          <td className="px-8 py-2 text-slate-600 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-slate-400"></span> {cat}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-slate-800">$ {montoCat.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="px-4 py-2 text-right text-slate-400 italic">
                            {cat === 'Mano de Obra' && rubro.realSalarios > 0 ? `$ ${rubro.realSalarios.toLocaleString('es-AR', { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-400">-</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {/* SUBTOTAL RUBROS (Fondo Amarillo Claro) */}
                <tr className="bg-amber-100/60 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300">
                  <td className="px-4 py-3">SUBTOTAL RUBROS DE OBRA</td>
                  <td className="px-4 py-3 text-right">$ {granTotalPresupuestadoRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-right text-amber-800">$ {granTotalRealRubros.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  <td className={`px-4 py-3 text-right ${(granTotalPresupuestadoRubros - granTotalRealRubros) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    $ {(granTotalPresupuestadoRubros - granTotalRealRubros).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                  </td>
                </tr>

                {/* GASTOS GENERALES */}
                {gastosGeneralesDetalle.length > 0 && (
                  <>
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[11px] border-t-4 border-white">
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
                    
                    {/* SUBTOTAL GASTOS GENERALES (Fondo Amarillo Claro) */}
                    <tr className="bg-amber-100/60 font-black text-slate-900 uppercase text-[11px] border-t-2 border-slate-300">
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
              
              {/* TOTAL GENERAL DE PRESUPUESTO */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-black uppercase text-xs">
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