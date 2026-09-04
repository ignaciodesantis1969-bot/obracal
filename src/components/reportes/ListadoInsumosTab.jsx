import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { Package, FileText, Printer } from 'lucide-react';

export default function ListadoInsumosTab({
  presupuestos = []
}) {
  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(true);
  const [isSavingInsumosPdf, setIsSavingInsumosPdf] = useState(false);

  const ordenCategorias = useMemo(() => ['Mano de Obra', 'Materiales', 'Equipos', 'Subcontratos', 'Varios'], []);

  const presupuestosAprobados = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.estado || p?.Estado_presupuesto || '').toLowerCase().trim();
      return est === 'aprobado' || est === 'aprobada';
    });
  }, [presupuestos]);

  const presupuestoInsumosSeleccionado = useMemo(() => {
    if (!insumoPresupuestoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID || p?.codigo || p?.Codigo) === String(insumoPresupuestoId));
  }, [insumoPresupuestoId, presupuestos]);

  const limpiarTexto = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const insumosPorRubro = useMemo(() => {
    if (!presupuestoInsumosSeleccionado) return {};

    let rawDetalle = presupuestoInsumosSeleccionado?.items_detalle || 
                     presupuestoInsumosSeleccionado?.itemsDetalle || 
                     presupuestoInsumosSeleccionado?.rubros || 
                     presupuestoInsumosSeleccionado?.detalles || [];

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

    const mapRubros = {};
    rubrosList.forEach((r, rIdx) => {
      const nombreRubro = r?.rubro || r?.nombre || `Rubro ${rIdx + 1}`;
      let tareasList = r?.tareas || r?.items || r?.subitems || [];
      if (typeof tareasList === 'string') {
        try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; }
      }

      const catsMap = {};
      ordenCategorias.forEach(c => catsMap[c] = []);

      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insumosList = t?.insumos || t?.materiales || t?.detalle_insumos || [];
          if (typeof insumosList === 'string') {
            try { insumosList = JSON.parse(insumosList); } catch { insumosList = []; }
          }

          if (!Array.isArray(insumosList) || insumosList.length === 0) {
            const esManoDeObra = limpiarTexto(t?.descripcion || '').includes('mano de obra') || limpiarTexto(t?.unidad || '').includes('hs') || limpiarTexto(t?.unidad || '').includes('dia');
            const catDestino = esManoDeObra ? 'Mano de Obra' : 'Materiales';

            catsMap[catDestino].push({
              tarea: t?.descripcion || t?.tarea || 'Labor general',
              nombre: t?.descripcion || t?.tarea || 'Ítem general',
              proveedor: t?.proveedor || 'SICE S.A.',
              unidad: t?.unidad || 'un',
              cantidad: Number(t?.cantidad || t?.cant || 1),
              costo_unitario: Number(t?.costo_unitario || t?.precio_unitario || t?.unitario || t?.total || 0),
              total: Number(t?.total || (Number(t?.cantidad || t?.cant || 1) * Number(t?.costo_unitario || t?.precio_unitario || t?.unitario || 0)))
            });
          } else {
            insumosList.forEach(ins => {
              const catOriginal = limpiarTexto(ins?.categoria || ins?.tipo || 'Materiales');
              let catDestino = 'Materiales';
              
              if (catOriginal.includes('mano') || catOriginal.includes('obra')) catDestino = 'Mano de Obra';
              else if (catOriginal.includes('equipo') || catOriginal.includes('herramienta')) catDestino = 'Equipos';
              else if (catOriginal.includes('subcontrato')) catDestino = 'Subcontratos';
              else if (catOriginal.includes('vario')) catDestino = 'Varios';

              catsMap[catDestino].push({
                tarea: t?.descripcion || t?.tarea || 'Labor',
                nombre: ins?.nombre || ins?.descripcion || 'Insumo',
                proveedor: ins?.proveedor || 'Sin Proveedor',
                unidad: ins?.unidad || 'un',
                cantidad: Number(ins?.cantidad || ins?.cant || 1),
                costo_unitario: Number(ins?.costo_unitario || ins?.precio || 0),
                total: Number(ins?.total || (Number(ins?.cantidad || 1) * Number(ins?.costo_unitario || 0)))
              });
            });
          }
        });
      }
      mapRubros[nombreRubro] = catsMap;
    });

    return mapRubros;
  }, [presupuestoInsumosSeleccionado, ordenCategorias]);

  const insumosGenerales = useMemo(() => {
    const catsMap = {};
    ordenCategorias.forEach(c => catsMap[c] = []);
    Object.values(insumosPorRubro).forEach(rubroCats => {
      Object.entries(rubroCats).forEach(([cat, lista]) => {
        if (catsMap[cat]) {
          catsMap[cat].push(...lista);
        }
      });
    });
    return catsMap;
  }, [insumosPorRubro, ordenCategorias]);

  const exportarInsumosPDF = async () => {
    if (!presupuestoInsumosSeleccionado) {
      toast.error('Seleccione un presupuesto para exportar insumos.');
      return;
    }
    setIsSavingInsumosPdf(true);
    const toastId = toast.loading('Generando PDF de Insumos en Drive...');
    try {
      const payload = {
        action: 'guardarYGenerarPDF',
        tabla: 'InsumosPresupuesto',
        presupuesto_id: String(insumoPresupuestoId),
        obra: presupuestoInsumosSeleccionado?.nombre || presupuestoInsumosSeleccionado?.nombre_obra || 'Insumos Obra',
        insumos: insumosGenerales
      };
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const resultado = await res.json();
      if (resultado?.success === false) {
        toast.error('Error al generar PDF de insumos', { id: toastId });
      } else {
        toast.success('¡PDF de Insumos generado y guardado con éxito!', { id: toastId });
        if (resultado?.pdfUrl) {
          window.open(resultado.pdfUrl, '_blank');
        }
      }
    } catch (err) {
      toast.error('Error de conexión al exportar insumos.', { id: toastId });
    } finally {
      setIsSavingInsumosPdf(false);
    }
  };

  return (
    <div id="printable-insumos-container" className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-500" /> Listado de Insumos por Presupuesto
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Seleccione un presupuesto aprobado para desglosar sus insumos discriminando proveedores.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={insumoPresupuestoId}
            onChange={(e) => setInsumoPresupuestoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer min-w-[300px]"
          >
            <option value="">-- Seleccionar Presupuesto ({presupuestosAprobados.length} disp.) --</option>
            {presupuestosAprobados.map(p => {
              const pId = p?.id || p?.ID || p?.codigo;
              const pCod = p?.codigo || pId;
              const pNom = p?.nombre || p?.nombre_obra || 'Presupuesto';
              return (
                <option key={pId} value={pId}>
                  [{pCod}] {pNom}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => setVistaGeneralInsumos(!vistaGeneralInsumos)}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {vistaGeneralInsumos ? 'Ver por Rubros' : 'Ver Vista General'}
          </button>
          <button
            onClick={exportarInsumosPDF}
            disabled={isSavingInsumosPdf}
            className={`px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-600 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${isSavingInsumosPdf ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSavingInsumosPdf ? (
              <><div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div> Generando PDF...</>
            ) : (
              <><FileText className="w-4 h-4" /> Exportar PDF (Drive)</>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-100 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>
      </div>

      {!presupuestoInsumosSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
          Por favor, seleccione un presupuesto para visualizar sus insumos.
        </div>
      ) : vistaGeneralInsumos ? (
        <div className="space-y-8">
          <div className="border-b border-slate-300 pb-2">
            <h4 className="text-sm font-black text-slate-900 uppercase">Consolidado General de Insumos</h4>
          </div>
          
          {ordenCategorias.map(cat => {
            const itemsCat = insumosGenerales[cat] || [];
            if (itemsCat.length === 0) return null;

            // Agrupación estricta por Nombre + Proveedor
            const agrupadosMap = {};
            itemsCat.forEach(it => {
              const nombreNorm = String(it?.nombre || 'Sin nombre').trim();
              const provNorm = String(it?.proveedor || 'Sin Proveedor').trim();
              const uniqueKey = `${nombreNorm.toLowerCase()}_${provNorm.toLowerCase()}`;

              if (!agrupadosMap[uniqueKey]) {
                agrupadosMap[uniqueKey] = {
                  nombre: nombreNorm,
                  proveedor: provNorm,
                  unidad: String(it?.unidad || 'un').toLowerCase(),
                  cantidad: 0,
                  costo_unitario: Number(it?.costo_unitario) || 0,
                  total: 0
                };
              }
              agrupadosMap[uniqueKey].cantidad += Number(it?.cantidad) || 0;
              agrupadosMap[uniqueKey].total += Number(it?.total) || 0;
            });

            // Recalcular costo unitario promedio ponderado
            const itemsAgrupados = Object.values(agrupadosMap).map(item => ({
              ...item,
              costo_unitario: item.cantidad > 0 ? item.total / item.cantidad : item.costo_unitario
            }));

            const totalCat = itemsAgrupados.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);

            return (
              <div key={cat} className="space-y-0 border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="flex justify-between items-center bg-slate-100 px-4 py-3 border-b border-slate-300">
                  <span className="font-black text-xs text-slate-900 uppercase tracking-wide">{cat}</span>
                  <span className="font-black text-xs text-amber-800">$ {totalCat.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-bold uppercase text-[10px] bg-white border-b border-slate-200">
                      <th className="py-2.5 px-4 w-[35%]">Insumo / Articulo</th>
                      <th className="py-2.5 px-4 w-[25%]">Proveedor</th>
                      <th className="py-2.5 px-4 text-center">Unidad</th>
                      <th className="py-2.5 px-4 text-right">Cant.</th>
                      <th className="py-2.5 px-4 text-right">C. Unit.</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsAgrupados.map((it, iIdx) => (
                      <tr key={iIdx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 leading-tight">{it?.nombre}</td>
                        <td className="py-3 px-4 text-slate-600 font-medium leading-tight">{it?.proveedor}</td>
                        <td className="py-3 px-4 text-center text-slate-500">{it?.unidad}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-700">{Number(it?.cantidad || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right text-slate-600">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(insumosPorRubro).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              No se encontraron rubros con insumos detallados en este presupuesto.
            </div>
          ) : (
            Object.entries(insumosPorRubro).map(([nombreRubro, cats]) => (
              <div key={nombreRubro} className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm space-y-0">
                <div className="bg-slate-800 px-4 py-3 border-b border-slate-800">
                  <h4 className="font-black text-xs text-white uppercase tracking-wide">{nombreRubro}</h4>
                </div>
                
                {ordenCategorias.map(cat => {
                  const itemsCat = cats[cat] || [];
                  if (itemsCat.length === 0) return null;
                  
                  const subCatTotal = itemsCat.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
                  
                  return (
                    <div key={cat} className="border-b border-slate-200 last:border-0">
                      <div className="flex justify-between items-center bg-slate-100 px-4 py-2 border-b border-slate-200">
                        <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wide flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> {cat}
                        </span>
                        <span className="font-black text-[11px] text-amber-800">$ {subCatTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <table className="w-full text-left text-xs bg-white">
                        <thead>
                          <tr className="text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                            <th className="py-2 px-4 w-[35%]">Insumo / Articulo</th>
                            <th className="py-2 px-4 w-[25%]">Proveedor</th>
                            <th className="py-2 px-4 text-center">Unidad</th>
                            <th className="py-2 px-4 text-right">Cant.</th>
                            <th className="py-2 px-4 text-right">C. Unit.</th>
                            <th className="py-2 px-4 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {itemsCat.map((it, iIdx) => (
                            <tr key={iIdx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-4 font-bold text-slate-800 leading-tight">{it?.nombre}</td>
                              <td className="py-2 px-4 text-slate-600 font-medium leading-tight">{it?.proveedor}</td>
                              <td className="py-2 px-4 text-center text-slate-500">{it?.unidad}</td>
                              <td className="py-2 px-4 text-right font-semibold text-slate-700">{Number(it?.cantidad || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                              <td className="py-2 px-4 text-right text-slate-600">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-4 text-right font-black text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}