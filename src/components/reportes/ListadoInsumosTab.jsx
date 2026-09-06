import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { Package, FileText, Filter, ArrowUpDown } from 'lucide-react';
import { useObraData } from '../../hooks/useObraData';

export default function ListadoInsumosTab({
  presupuestos = [],
  insumos: propInsumos = [],
  proveedores: propProveedores = []
}) {
  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(true);
  const [isSavingInsumosPdf, setIsSavingInsumosPdf] = useState(false);
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [ordenPrecio, setOrdenPrecio] = useState('nombre');

  const { data: insumosSheet } = useObraData('Insumos');
  const { data: proveedoresSheet } = useObraData('Proveedores');

  const [fetchedInsumosLocal, setFetchedInsumosLocal] = useState([]);
  const [fetchedProveedoresLocal, setFetchedProveedoresLocal] = useState([]);

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Insumos', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.data || data?.items || Object.values(data).find(v => Array.isArray(v)) || []);
        if (arr.length > 0) setFetchedInsumosLocal(arr);
      })
      .catch(() => {});

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Proveedores', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.data || data?.items || Object.values(data).find(v => Array.isArray(v)) || []);
        if (arr.length > 0) setFetchedProveedoresLocal(arr);
      })
      .catch(() => {});
  }, []);

  const proveedoresList = useMemo(() => {
    const combinados = [...propProveedores, ...(Array.isArray(proveedoresSheet) ? proveedoresSheet : []), ...fetchedProveedoresLocal];
    const map = {};
    combinados.forEach(p => {
      if (!p) return;
      const pId = String(p.id || p.ID || p.codigo || '').trim();
      const pNombre = p.razon_social || p.nombre || p.nombre_proveedor || '';
      if (pId) map[pId] = pNombre;
    });
    return map;
  }, [propProveedores, proveedoresSheet, fetchedProveedoresLocal]);

  const maestroInsumosMap = useMemo(() => {
    const combinados = [...propInsumos, ...(Array.isArray(insumosSheet) ? insumosSheet : []), ...fetchedInsumosLocal];
    const map = {};
    combinados.forEach(ins => {
      if (!ins) return;
      const codigo = String(ins.codigo || ins.Codigo || ins.id || '').trim().toLowerCase();
      const nombre = String(ins.nombre || ins.Nombre || '').trim().toLowerCase();
      
      const tipoColD = ins.tipo || ins.Tipo || ins.categoria || ins.rubro || '';
      const provId = String(ins.proveedor_id || ins.proveedorId || ins.proveedor || '').trim();
      const proveedorNombre = proveedoresList[provId] || provId || 'Sin Proveedor';

      const infoInsumo = {
        tipo: tipoColD,
        proveedor: proveedorNombre,
        unidad: ins.unidad || ins.unid || 'un',
        costo_unitario: Number(ins.costo_unitario || ins.precio || 0)
      };

      if (codigo) map[codigo] = infoInsumo;
      if (nombre) map[nombre] = infoInsumo;
    });
    return map;
  }, [propInsumos, insumosSheet, fetchedInsumosLocal, proveedoresList]);

  const ordenCategorias = useMemo(() => ['Mano de Obra', 'Materiales', 'Equipos', 'Subcontratos', 'Gastos Generales', 'Varios'], []);

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

  const clasificarCategoria = (tipoStr, nombreItem = '') => {
    const t = limpiarTexto(tipoStr);
    const n = limpiarTexto(nombreItem);
    const textoAnalizar = `${t} ${n}`;

    if (textoAnalizar.includes('mano') || textoAnalizar.includes('obra') && !textoAnalizar.includes('repisa')) return 'Mano de Obra';
    if (textoAnalizar.includes('equipo') || textoAnalizar.includes('maquinaria') || textoAnalizar.includes('andamio')) return 'Equipos';
    if (textoAnalizar.includes('subcontrato') || textoAnalizar.includes('servicio de') || textoAnalizar.includes('flete')) return 'Subcontratos';
    if (textoAnalizar.includes('gasto') || textoAnalizar.includes('general') || textoAnalizar.includes('gg') || 
        textoAnalizar.includes('seguridad') || textoAnalizar.includes('higiene') || textoAnalizar.includes('seguro') || 
        textoAnalizar.includes('poliza') || textoAnalizar.includes('ropa de trabajo') || textoAnalizar.includes('visita obligatoria')) return 'Gastos Generales';
    if (textoAnalizar.includes('vario')) return 'Varios';
    return 'Materiales';
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
            const codigoT = String(t?.codigo || t?.Cod || '').trim().toLowerCase();
            const nombreT = String(t?.descripcion || t?.tarea || '').trim().toLowerCase();
            const maestroInfo = maestroInsumosMap[codigoT] || maestroInsumosMap[nombreT] || {};

            const catDestino = clasificarCategoria(maestroInfo.tipo || t?.tipo || t?.categoria || t?.rubro || '', nombreT);

            catsMap[catDestino].push({
              tarea: t?.descripcion || t?.tarea || 'Labor general',
              nombre: t?.descripcion || t?.tarea || 'Ítem general',
              proveedor: maestroInfo.proveedor || t?.proveedor || 'Sin Proveedor',
              unidad: maestroInfo.unidad || t?.unidad || 'un',
              cantidad: Number(t?.cantidad || t?.cant || 1),
              costo_unitario: Number(maestroInfo.costo_unitario || t?.costo_unitario || t?.precio_unitario || 0),
              total: Number(t?.total || (Number(t?.cantidad || t?.cant || 1) * Number(maestroInfo.costo_unitario || t?.costo_unitario || 0)))
            });
          } else {
            insumosList.forEach(ins => {
              const codigoIns = String(ins?.codigo || ins?.Cod || '').trim().toLowerCase();
              const nombreIns = String(ins?.nombre || ins?.descripcion || '').trim().toLowerCase();
              const maestroInfo = maestroInsumosMap[codigoIns] || maestroInsumosMap[nombreIns] || {};

              const catDestino = clasificarCategoria(maestroInfo.tipo || ins?.tipo || ins?.categoria || ins?.rubro || '', nombreIns);

              const provFinal = maestroInfo.proveedor || ins?.proveedor || 'Sin Proveedor';
              const costoU = Number(maestroInfo.costo_unitario || ins?.costo_unitario || ins?.precio || 0);
              const cant = Number(ins?.cantidad || ins?.cant || 1);

              catsMap[catDestino].push({
                tarea: t?.descripcion || t?.tarea || 'Labor',
                nombre: ins?.nombre || ins?.descripcion || 'Insumo',
                proveedor: provFinal,
                unidad: maestroInfo.unidad || ins?.unidad || 'un',
                cantidad: cant,
                costo_unitario: costoU,
                total: Number(ins?.total || (cant * costoU))
              });
            });
          }
        });
      }
      mapRubros[nombreRubro] = catsMap;
    });

    return mapRubros;
  }, [presupuestoInsumosSeleccionado, ordenCategorias, maestroInsumosMap]);

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

  const listaProveedoresUnicos = useMemo(() => {
    const provSet = new Set();
    Object.values(insumosGenerales).forEach(lista => {
      lista.forEach(it => {
        const p = String(it?.proveedor || '').trim();
        if (p && p !== '' && p.toLowerCase() !== 'sin proveedor') {
          provSet.add(p);
        }
      });
    });
    return Array.from(provSet).sort((a, b) => a.localeCompare(b));
  }, [insumosGenerales]);

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
        tipoReporte: 'insumos',
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
        toast.error('Error al generar PDF: ' + (resultado?.error || ''), { id: toastId });
      } else {
        toast.success('¡PDF guardado en la carpeta Listados de insumos!', { id: toastId });
        const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || '';
        if (pdfUrlFinal) {
          window.open(pdfUrlFinal, '_blank');
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
            className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer min-w-[240px]"
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

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer max-w-[180px]"
            >
              <option value="">-- Todos los Proveedores --</option>
              {listaProveedoresUnicos.map(prov => (
                <option key={prov} value={prov}>{prov}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={ordenPrecio}
              onChange={(e) => setOrdenPrecio(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="nombre">Ordenar por Nombre</option>
              <option value="mayorPrecioTotal">Mayor Precio Total ($)</option>
              <option value="menorPrecioTotal">Menor Precio Total ($)</option>
            </select>
          </div>

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
        </div>
      </div>

      {!presupuestoInsumosSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
          Por favor, seleccione un presupuesto para visualizar sus insumos.
        </div>
      ) : vistaGeneralInsumos ? (
        <div className="space-y-8">
          <div className="border-b border-slate-300 pb-2 flex justify-between items-center">
            <h4 className="text-sm font-black text-slate-900 uppercase">Consolidado General de Insumos</h4>
            {proveedorFiltro && (
              <span className="text-xs bg-amber-100 text-amber-900 font-bold px-3 py-1 rounded-full">
                Filtrado por proveedor: {proveedorFiltro} (<button onClick={() => setProveedorFiltro('')} className="underline ml-1">Quitar</button>)
              </span>
            )}
          </div>
          
          {ordenCategorias.map(cat => {
            const itemsCat = insumosGenerales[cat] || [];
            
            const itemsFiltrados = proveedorFiltro 
              ? itemsCat.filter(it => String(it?.proveedor).toLowerCase() === proveedorFiltro.toLowerCase())
              : itemsCat;

            if (itemsFiltrados.length === 0) return null;

            const agrupadosMap = {};
            itemsFiltrados.forEach(it => {
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

            let itemsAgrupados = Object.values(agrupadosMap).map(item => ({
              ...item,
              costo_unitario: item.cantidad > 0 ? item.total / item.cantidad : item.costo_unitario
            }));

            itemsAgrupados.sort((a, b) => {
              if (ordenPrecio === 'mayorPrecioTotal') return b.total - a.total;
              if (ordenPrecio === 'menorPrecioTotal') return a.total - b.total;
              return a.nombre.localeCompare(b.nombre);
            });

            const totalCat = itemsAgrupados.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);

            return (
              <div key={cat} className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm space-y-0">
                <div className="flex justify-between items-center bg-slate-900 px-4 py-3 border-b border-slate-800">
                  <span className="font-black text-xs text-white uppercase tracking-wide">{cat}</span>
                  <span className="font-black text-xs text-amber-400">$ {totalCat.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 font-bold uppercase text-[10px] bg-white border-b border-slate-200">
                      <th className="py-2.5 px-4 w-[35%]">Insumo / Articulo</th>
                      <th className="py-2.5 px-4 w-[25%]">Proveedor</th>
                      <th className="py-2.5 px-4 text-center">Unidad</th>
                      <th className="py-2.5 px-4 text-right">Cant.</th>
                      <th className="py-2.5 px-4 text-right">C. Unit.</th>
                      <th className="py-2.5 px-4 text-right">Total ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsAgrupados.map((it) => (
                      <tr key={`${cat}-${it.nombre}-${it.proveedor}`} className="hover:bg-slate-50 transition-colors">
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
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800">
                  <h4 className="font-black text-xs text-white uppercase tracking-wide">{nombreRubro}</h4>
                </div>
                
                {ordenCategorias.map(cat => {
                  let itemsCat = cats[cat] || [];
                  if (proveedorFiltro) {
                    itemsCat = itemsCat.filter(it => String(it?.proveedor).toLowerCase() === proveedorFiltro.toLowerCase());
                  }
                  if (itemsCat.length === 0) return null;
                  
                  itemsCat.sort((a, b) => {
                    if (ordenPrecio === 'mayorPrecioTotal') return b.total - a.total;
                    if (ordenPrecio === 'menorPrecioTotal') return a.total - b.total;
                    return a.nombre.localeCompare(b.nombre);
                  });

                  const subCatTotal = itemsCat.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
                  
                  return (
                    <div key={cat} className="border-b border-slate-200 last:border-0">
                      <div className="flex justify-between items-center bg-slate-800 text-white px-4 py-2 border-b border-slate-700">
                        <span className="font-bold text-[11px] uppercase tracking-wide flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> {cat}
                        </span>
                        <span className="font-black text-[11px] text-amber-400">$ {subCatTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <table className="w-full text-left text-xs bg-white">
                        <thead>
                          <tr className="text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                            <th className="py-2 px-4 w-[35%]">Insumo / Articulo</th>
                            <th className="py-2 px-4 w-[25%]">Proveedor</th>
                            <th className="py-2 px-4 text-center">Unidad</th>
                            <th className="py-2 px-4 text-right">Cant.</th>
                            <th className="py-2 px-4 text-right">C. Unit.</th>
                            <th className="py-2 px-4 text-right">Total ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {itemsCat.map((it, iIdx) => {
                            const costoU = it.cantidad > 0 ? it.total / it.cantidad : it.costo_unitario;
                            return (
                              <tr key={`${nombreRubro}-${cat}-${iIdx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-4 font-bold text-slate-800 leading-tight">{it?.nombre}</td>
                                <td className="py-2 px-4 text-slate-600 font-medium leading-tight">{it?.proveedor}</td>
                                <td className="py-2 px-4 text-center text-slate-500">{it?.unidad}</td>
                                <td className="py-2 px-4 text-right font-semibold text-slate-700">{Number(it?.cantidad || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                                <td className="py-2 px-4 text-right text-slate-600">$ {Number(costoU).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 px-4 text-right font-black text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              </tr>
                            );
                          })}
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