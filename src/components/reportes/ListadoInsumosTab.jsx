import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { Package, FileText, Printer } from 'lucide-react';

export default function ListadoInsumosTab({
  presupuestos = [],
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  }
}) {
  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false);
  const [isSavingInsumosPdf, setIsSavingInsumosPdf] = useState(false);

  const ordenCategorias = useMemo(() => ['Materiales', 'Mano de Obra', 'Equipos', 'Subcontratos', 'Varios'], []);

  const presupuestosAprobados = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(buscarValorEnObjeto(p, ['estado_presupuesto', 'Estado_presupuesto', 'estado', 'Estado'])).toLowerCase().trim();
      return est === 'aprobado' || est === 'aprobada';
    });
  }, [presupuestos, buscarValorEnObjeto]);

  const presupuestoInsumosSeleccionado = useMemo(() => {
    if (!insumoPresupuestoId) return null;
    return presupuestos.find(p => String(buscarValorEnObjeto(p, ['id', 'ID', 'codigo'])) === String(insumoPresupuestoId));
  }, [insumoPresupuestoId, presupuestos, buscarValorEnObjeto]);

  const insumosPorRubro = useMemo(() => {
    if (!presupuestoInsumosSeleccionado) return {};
    let rubrosList = buscarValorEnObjeto(presupuestoInsumosSeleccionado, ['rubros', 'detalles', 'items']) || [];
    if (typeof rubrosList === 'string') {
      try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; }
    }

    const mapRubros = {};
    if (!Array.isArray(rubrosList)) return mapRubros;

    rubrosList.forEach((r, rIdx) => {
      const nombreRubro = r?.nombre || r?.rubro || `Rubro ${rIdx + 1}`;
      let tareasList = r?.tareas || r?.items || [];
      if (typeof tareasList === 'string') {
        try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; }
      }

      const catsMap = {};
      ordenCategorias.forEach(c => catsMap[c] = []);

      if (Array.isArray(tareasList)) {
        tareasList.forEach(t => {
          let insumosList = t?.insumos || t?.materiales || [];
          if (typeof insumosList === 'string') {
            try { insumosList = JSON.parse(insumosList); } catch { insumosList = []; }
          }

          if (!Array.isArray(insumosList) || insumosList.length === 0) {
            catsMap['Materiales'].push({
              tarea: t?.descripcion || t?.tarea || 'Labor general',
              nombre: t?.descripcion || t?.tarea || 'Ítem general',
              proveedor: 'SICE S.A.',
              unidad: t?.unidad || 'un',
              cantidad: Number(t?.cantidad || 1),
              costo_unitario: Number(t?.costo_unitario || t?.total || 0),
              total: Number(t?.total || (Number(t?.cantidad || 1) * Number(t?.costo_unitario || 0)))
            });
          } else {
            insumosList.forEach(ins => {
              const catIns = ins?.categoria || ins?.tipo || 'Materiales';
              const catDestino = ordenCategorias.includes(catIns) ? catIns : 'Materiales';
              catsMap[catDestino].push({
                tarea: t?.descripcion || t?.tarea || 'Labor',
                nombre: ins?.nombre || ins?.descripcion || 'Insumo',
                proveedor: ins?.proveedor || 'Proveedor SICE',
                unidad: ins?.unidad || 'un',
                cantidad: Number(ins?.cantidad || 1),
                costo_unitario: Number(ins?.costo_unitario || ins?.precio || 0),
                total: Number(ins?.total || (Number(ins?.cantidad || 1) * Number(ins?.costo_unitario || ins?.precio || 0)))
              });
            });
          }
        });
      }
      mapRubros[nombreRubro] = catsMap;
    });
    return mapRubros;
  }, [presupuestoInsumosSeleccionado, ordenCategorias, buscarValorEnObjeto]);

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
          <p className="text-xs text-slate-500 mt-0.5">Seleccione un presupuesto aprobado para desglosar sus insumos y materiales.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={insumoPresupuestoId}
            onChange={(e) => setInsumoPresupuestoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Seleccionar Presupuesto Aprobado ({presupuestosAprobados.length} disp.) --</option>
            {presupuestosAprobados.map(p => {
              const pId = p?.id || p?.ID;
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
          Por favor, seleccione un presupuesto aprobado para visualizar sus insumos.
        </div>
      ) : vistaGeneralInsumos ? (
        <div className="space-y-6">
          <h4 className="text-xs font-extrabold text-slate-800 uppercase">Consolidado General de Insumos</h4>
          {ordenCategorias.map(cat => {
            const itemsCat = insumosGenerales[cat] || [];
            if (itemsCat.length === 0) return null;

            const agrupadosMap = {};
            itemsCat.forEach(it => {
              const nombreKey = String(it?.nombre || '').trim().toLowerCase();
              if (!agrupadosMap[nombreKey]) {
                agrupadosMap[nombreKey] = {
                  nombre: it?.nombre || 'Sin nombre',
                  proveedor: it?.proveedor || '---',
                  unidad: it?.unidad || 'un',
                  cantidad: 0,
                  costo_unitario: Number(it?.costo_unitario) || 0,
                  total: 0
                };
              }
              agrupadosMap[nombreKey].cantidad += Number(it?.cantidad) || 0;
              agrupadosMap[nombreKey].total += Number(it?.total) || 0;
              if ((agrupadosMap[nombreKey].proveedor === '---' || !agrupadosMap[nombreKey].proveedor) && it?.proveedor && it?.proveedor !== '---') {
                agrupadosMap[nombreKey].proveedor = it.proveedor;
              }
            });
            const itemsAgrupados = Object.values(agrupadosMap).map(item => ({
              ...item,
              costo_unitario: item.cantidad > 0 ? item.total / item.cantidad : item.costo_unitario
            }));

            const totalCat = itemsAgrupados.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
            return (
              <div key={cat} className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-xs text-slate-900 uppercase">{cat}</span>
                  <span className="font-black text-xs text-amber-800">$ {totalCat.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2">Insumo / Artículo</th>
                      <th className="py-2 px-2">Proveedor</th>
                      <th className="py-2 px-2 text-center">Unidad</th>
                      <th className="py-2 px-2 text-right">Cant.</th>
                      <th className="py-2 px-2 text-right">C. Unit.</th>
                      <th className="py-2 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsAgrupados.map((it, iIdx) => (
                      <tr key={iIdx} className="hover:bg-white">
                        <td className="py-2 px-2 font-bold text-slate-900">{it?.nombre}</td>
                        <td className="py-2 px-2 text-slate-700 font-medium">{it?.proveedor}</td>
                        <td className="py-2 px-2 text-center text-slate-500">{it?.unidad}</td>
                        <td className="py-2 px-2 text-right">{Number(it?.cantidad || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-2 text-right font-black text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
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
          {Object.keys(insumosPorRubro).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No se encontraron rubros con insumos detallados en este presupuesto.</div>
          ) : (
            Object.entries(insumosPorRubro).map(([nombreRubro, cats]) => (
              <div key={nombreRubro} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                <h4 className="font-extrabold text-xs text-slate-900 uppercase border-b border-slate-200 pb-2">{nombreRubro}</h4>
                {ordenCategorias.map(cat => {
                  const itemsCat = cats[cat] || [];
                  if (itemsCat.length === 0) return null;
                  const subCatTotal = itemsCat.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
                  return (
                    <div key={cat} className="space-y-2 pl-4 border-l-2 border-amber-500">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-700 uppercase">{cat}</span>
                        <span className="font-black text-xs text-amber-800">$ {subCatTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-slate-500 font-bold uppercase text-[10px]">
                            <th className="py-1.5 px-2">Tarea</th>
                            <th className="py-1.5 px-2">Insumo</th>
                            <th className="py-1.5 px-2">Proveedor</th>
                            <th className="py-1.5 px-2 text-center">Unidad</th>
                            <th className="py-1.5 px-2 text-right">Cant.</th>
                            <th className="py-1.5 px-2 text-right">C. Unit.</th>
                            <th className="py-1.5 px-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {itemsCat.map((it, iIdx) => (
                            <tr key={iIdx} className="hover:bg-white">
                              <td className="py-1.5 px-2 text-slate-600">{it?.tarea}</td>
                              <td className="py-1.5 px-2 font-bold text-slate-900">{it?.nombre}</td>
                              <td className="py-1.5 px-2 text-slate-700 font-medium">{it?.proveedor}</td>
                              <td className="py-1.5 px-2 text-center text-slate-500">{it?.unidad}</td>
                              <td className="py-1.5 px-2 text-right">{Number(it?.cantidad || 0).toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-1.5 px-2 text-right font-bold text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
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