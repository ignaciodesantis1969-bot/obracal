import React, { useState, useEffect, useMemo } from 'react';
import { Building2, ShieldCheck, FileText, ExternalLink, Trash2, Printer } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function CertificacionesTab({
  presupuestos,
  obras,
  certificadosProps,
  fetchedCertificados,
  setFetchedCertificados,
  obtenerClienteDePresupuesto,
  obtenerOrdenDeCompra,
  buscarValorEnObjeto
}) {
  const [tipoCertificadoSubTab, setTipoCertificadoSubTab] = useState('avance_obra');
  const [certPresupuestoId, setCertPresupuestoId] = useState('');
  const [certClienteNombre, setCertClienteNombre] = useState('');
  const [avanceActualMap, setAvanceActualMap] = useState({});
  const [adicionalesMonto, setAdicionalesMonto] = useState(0);
  
  const [certificadoNro, setCertificadoNro] = useState('0');
  const [certFecha, setCertFecha] = useState(new Date().toISOString().slice(0, 10));
  const [adelantoPct, setAdelantoPct] = useState(10);
  const [adelantoMonto, setAdelantoMonto] = useState(0);
  const [redeterminacionPct, setRedeterminacionPct] = useState(0);
  const [redeterminacionMonto, setRedeterminacionMonto] = useState(0);

  const [certRespProveedor, setCertRespProveedor] = useState({ nombre: 'Alexander Torres Lopez', cargo: 'Jefe de Obra' });
  const [certRespCliente, setCertRespCliente] = useState({ nombre: 'Cristian Matei', cargo: 'Gerente de Planta' });
  const [isSavingCert, setIsSavingCert] = useState(false);

  const allCertificados = useMemo(() => {
    const cProps = Array.isArray(certificadosProps) ? certificadosProps : [];
    const fCert = Array.isArray(fetchedCertificados) ? fetchedCertificados : [];
    return [...cProps, ...fCert];
  }, [certificadosProps, fetchedCertificados]);

  const fetchClientNameFromScript = async (pId) => {
    if (!pId) return;
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'obtenerCliente', presupuestoId: pId, presupuesto_id: pId })
      });
      const resultado = await response.json();
      if (resultado && (resultado.cliente || resultado.razonSocial || resultado.razon_social)) {
        setCertClienteNombre(resultado.cliente || resultado.razonSocial || resultado.razon_social);
      }
    } catch (error) {
      console.error("Error al obtener cliente del script:", error);
    }
  };

  const certificadoPresupuestoObj = presupuestos.find(p => String(p?.id || p?.ID) === String(certPresupuestoId));

  useEffect(() => {
    if (certPresupuestoId && certificadoPresupuestoObj) {
      const clienteLocal = obtenerClienteDePresupuesto(certificadoPresupuestoObj);
      setCertClienteNombre(clienteLocal !== '---' ? clienteLocal : '');
      fetchClientNameFromScript(certPresupuestoId);
    } else if (!certPresupuestoId) {
      setCertClienteNombre('');
    }
  }, [certPresupuestoId, certificadoPresupuestoObj]);

  useEffect(() => {
    if (certificadoPresupuestoObj) {
      const respProv = buscarValorEnObjeto(certificadoPresupuestoObj, ['responsable_proveedor', 'responsableProveedor'], 'Alexander Torres Lopez');
      const respCli = buscarValorEnObjeto(certificadoPresupuestoObj, ['responsable_cliente', 'responsableCliente'], 'Cristian Matei');
      setCertRespProveedor({ nombre: respProv, cargo: 'Jefe de Obra' });
      setCertRespCliente({ nombre: respCli, cargo: 'Gerente de Planta' });
    }
  }, [certPresupuestoId, certificadoPresupuestoObj]);

  const certificadosGuardadosSet = useMemo(() => {
    const set = new Set();
    allCertificados.forEach(c => {
      const pId = String(c?.presupuestoId || c?.presupuesto_id || '').trim();
      const nro = String(c?.certificadoNro || c?.certificado_nro || '').trim();
      if (pId && nro !== '') set.add(`${pId}_${nro}`);
    });
    return set;
  }, [allCertificados]);

  const presupuestosDisponiblesCert = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
      if (est !== 'aprobado' && est !== 'aprobada') return false;
      const pId = String(p?.id || p?.ID || '').trim();
      return !certificadosGuardadosSet.has(`${pId}_${certificadoNro}`);
    });
  }, [presupuestos, certificadosGuardadosSet, certificadoNro]);

  const certificadosDelPresupuestoActual = useMemo(() => {
    if (!certPresupuestoId) return [];
    return allCertificados.filter(c => String(c?.presupuestoId || c?.presupuesto_id || '').trim() === String(certPresupuestoId).trim());
  }, [allCertificados, certPresupuestoId]);

  const obtenerPctAnteriorAcumulado = (rIdx, tIdx) => {
    if (certificadoNro === '0' || certificadoNro === '1') return 0;
    let sumaPct = 0;
    const nroActual = parseInt(certificadoNro, 10) || 1;
    certificadosDelPresupuestoActual.forEach(cert => {
      const certNro = parseInt(cert?.certificadoNro !== undefined ? cert.certificadoNro : cert?.certificado_nro, 10) || 0;
      if (certNro > 0 && certNro < nroActual) {
        const filasCert = cert?.filas || cert?.items || [];
        filasCert.forEach(rubro => {
          if (Number(rubro?.rIdx) === rIdx && Array.isArray(rubro?.tareasFilas)) {
            const tareaFila = rubro.tareasFilas.find(tf => Number(tf?.tIdx) === tIdx);
            if (tareaFila) sumaPct += Number(tareaFila?.pctActual || 0);
          }
        });
      }
    });
    return Math.min(100, sumaPct);
  };

  const certificadoCalculos = useMemo(() => {
    if (!certificadoPresupuestoObj) return { filasRender: [], totalPresupuestoCalc: 0, totalActualCalc: 0 };
    let itemsDetalle = [];
    try {
      const parsed = typeof certificadoPresupuestoObj?.items_detalle === 'string'
        ? JSON.parse(certificadoPresupuestoObj.items_detalle)
        : certificadoPresupuestoObj?.items_detalle;
      itemsDetalle = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.rubros) ? parsed.rubros : []);
    } catch (e) { itemsDetalle = []; }

    let totalPresupuestoCalc = 0;
    let totalActualCalc = 0;

    const filasRender = itemsDetalle.map((rubro, rIdx) => {
      let totalRubro = 0, rubroAnterior = 0, rubroActual = 0;
      const tareasRubro = Array.isArray(rubro?.tareas) ? rubro.tareas : [];
      
      const tareasFilas = tareasRubro.map((t, tIdx) => {
        const cant = Number(t?.cantidad) || 1;
        const pUnit = Number(t?.costo_unitario) || Number(t?.precio_unitario) || 0;
        const totalItem = cant * pUnit;
        totalRubro += totalItem;

        const pctAnterior = obtenerPctAnteriorAcumulado(rIdx, tIdx);
        const impAnterior = totalItem * (pctAnterior / 100);
        rubroAnterior += impAnterior;

        const keyMap = `${rIdx}-${tIdx}`;
        const defaultPctActual = certificadoNro === '1' || certificadoNro === '0' ? 0 : 10;
        const pctActual = avanceActualMap[keyMap] !== undefined ? Number(avanceActualMap[keyMap]) : defaultPctActual;
        const impActual = totalItem * (pctActual / 100);
        rubroActual += impActual;

        totalPresupuestoCalc += totalItem;
        totalActualCalc += impActual;

        return {
          rIdx, tIdx, tarea: t?.tarea || t?.descripcion || 'Índice de obra', unidad: t?.unidad || 'm2',
          cant, totalItem, pctAnterior, impAnterior, pctActual, impActual,
          pctAcumulado: Math.min(100, pctAnterior + pctActual), impAcumulado: impAnterior + impActual, keyMap
        };
      });

      return { rIdx, nombre: rubro?.rubro || `Rubro #${rIdx + 1}`, totalRubro, rubroAnterior, rubroActual, tareasFilas };
    });

    return { filasRender, totalPresupuestoCalc, totalActualCalc };
  }, [certificadoPresupuestoObj, avanceActualMap, certificadoNro, certificadosDelPresupuestoActual]);

  const aprobarYGuardarCertificado = async (e) => {
    e.preventDefault();
    if (!certificadoPresupuestoObj) return alert("Seleccione un presupuesto aprobado.");
    setIsSavingCert(true);
    try {
      const totalPresupuestoBase = certificadoCalculos?.totalPresupuestoCalc || 1;
      const totalCertificadoPeriodo = certificadoNro === '0' ? 0 : certificadoCalculos?.totalActualCalc;
      let montoAdelantoCalculado = adelantoMonto;
      if (certificadoNro === '0') montoAdelantoCalculado = totalPresupuestoBase * (adelantoPct / 100);
      const descuentoAdelantoCert = certificadoNro !== '0' ? totalCertificadoPeriodo * (adelantoPct / 100) : 0;
      const netoACertificar = totalCertificadoPeriodo - (certificadoNro === '0' ? 0 : descuentoAdelantoCert) + Number(adicionalesMonto);
      let montoRedetCalculado = redeterminacionPct > 0 ? netoACertificar * (redeterminacionPct / 100) : redeterminacionMonto;
      const totalFinalLiquidacion = certificadoNro === '0' ? montoAdelantoCalculado : (netoACertificar + montoRedetCalculado);

      const payloadCert = {
        action: 'guardarCertificado',
        tabla: 'Certificaciones',
        presupuesto_id: String(certPresupuestoId),
        certificado_nro: String(certificadoNro),
        fecha: String(certFecha),
        cliente: certClienteNombre || obtenerClienteDePresupuesto(certificadoPresupuestoObj),
        obra: String(certificadoPresupuestoObj?.nombre || 'Obra'),
        orden_compra: obtenerOrdenDeCompra(certificadoPresupuestoObj),
        filas: certificadoCalculos.filasRender,
        total_periodo: totalCertificadoPeriodo,
        adelanto_descuento: descuentoAdelantoCert,
        adicionales: Number(adicionalesMonto),
        redeterminacion: montoRedetCalculado,
        total_general: totalFinalLiquidacion,
        proveedor_nombre: certRespProveedor.nombre,
        proveedor_cargo: certRespProveedor.cargo,
        cliente_nombre: certRespCliente.nombre,
        cliente_cargo: certRespCliente.cargo
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadCert)
      });
      const resultado = await res.json();
      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || '';
      
      setFetchedCertificados(prev => [{ ...payloadCert, pdfUrl: pdfUrlFinal, id: `cert-${Date.now()}` }, ...prev]);
      alert("¡Certificado guardado con éxito en Sheets y PDF generado en Drive!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar certificado.");
    } finally {
      setIsSavingCert(false);
    }
  };

  const eliminarCertificadoServidor = async (certId) => {
    if (!window.confirm("¿Está seguro de eliminar este certificado?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Certificaciones', action: 'delete', id: certId })
      });
      setFetchedCertificados(prev => prev.filter(c => String(c?.id || '') !== String(certId)));
      alert("Certificado eliminado.");
    } catch (err) { console.error(err); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex gap-2 print:hidden">
        <button onClick={() => setTipoCertificadoSubTab('avance_obra')} className={`px-4 py-2 rounded-xl text-xs font-bold ${tipoCertificadoSubTab === 'avance_obra' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>Avance de Obra</button>
      </div>

      {tipoCertificadoSubTab === 'avance_obra' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 items-center bg-slate-50 p-4 rounded-xl border print:hidden">
            <div>
              <label className="text-xs font-bold text-slate-700 block">Certificado N°:</label>
              <select value={certificadoNro} onChange={(e) => setCertificadoNro(e.target.value)} className="bg-white border rounded-xl px-2 py-1 text-xs font-bold">
                <option value="0">0 (Adelanto Financiero)</option>
                <option value="1">1</option><option value="2">2</option><option value="3">3</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block">Fecha:</label>
              <input type="date" value={certFecha} onChange={(e) => setCertFecha(e.target.value)} className="bg-white border rounded-xl px-2 py-1 text-xs font-bold" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-slate-700 block">Presupuesto Aprobado:</label>
              <select value={certPresupuestoId} onChange={(e) => setCertPresupuestoId(e.target.value)} className="w-full bg-white border rounded-xl px-3 py-1.5 text-xs font-bold">
                <option value="">-- Seleccionar Presupuesto --</option>
                {presupuestosDisponiblesCert.map(p => (
                  <option key={p?.id || p?.ID} value={p?.id || p?.ID}>[{p?.codigo || p?.id}] {p?.nombre || 'Presupuesto'}</option>
                ))}
              </select>
            </div>
          </div>

          {!certificadoPresupuestoObj ? (
            <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">Seleccione un presupuesto aprobado para generar el certificado.</div>
          ) : (
            <div id="printable-certificado-container" className="bg-white p-6 rounded-2xl border-2 border-slate-800 space-y-6">
              <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4">
                <div>
                  <img src="/logo-07.png" alt="SICE" className="h-16 object-contain" />
                  <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black uppercase">CERTIFICADO POR AVANCE DE OBRA</h2>
                  <p className="text-sm font-bold">Certificado Nro.: {certificadoNro}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border">
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Cliente (Razón Social):</span>
                  <input type="text" value={certClienteNombre} onChange={(e) => setCertClienteNombre(e.target.value)} className="w-full bg-white border rounded px-2 py-1 text-xs font-bold" />
                </div>
                <div><span className="text-slate-500 font-semibold block">Presupuesto:</span> <strong>{certificadoPresupuestoObj?.codigo}</strong></div>
                <div><span className="text-slate-500 font-semibold block">Fecha:</span> <strong>{certFecha}</strong></div>
              </div>

              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[10px]">
                      <th className="p-2 text-center">Ítem</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2 text-center">Und</th>
                      <th className="p-2 text-right">Cant</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center">Act. (%)</th>
                      <th className="p-2 text-right">Importe Act.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificadoCalculos.filasRender.map(rubro => (
                      <React.Fragment key={rubro.rIdx}>
                        <tr className="bg-slate-100 font-extrabold">
                          <td className="p-2 text-center">{rubro.rIdx + 1}</td>
                          <td className="p-2 uppercase" colSpan="3">{rubro.nombre}</td>
                          <td className="p-2 text-right">$ {rubro.totalRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="p-2">-</td>
                          <td className="p-2 text-right">$ {rubro.rubroActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        </tr>
                        {rubro.tareasFilas.map(t => (
                          <tr key={t.tIdx} className="hover:bg-amber-50">
                            <td className="p-2 text-center text-slate-500">{t.rIdx + 1}.{t.tIdx + 1}</td>
                            <td className="p-2">{t.tarea}</td>
                            <td className="p-2 text-center">{t.unidad}</td>
                            <td className="p-2 text-right">{t.cant}</td>
                            <td className="p-2 text-right">$ {t.totalItem.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="p-2 text-center bg-amber-50">
                              <input type="number" min="0" max="100" value={t.pctActual} onChange={(e) => setAvanceActualMap({ ...avanceActualMap, [t.keyMap]: parseFloat(e.target.value) || 0 })} className="w-12 text-center border rounded py-0.5 font-bold" />
                            </td>
                            <td className="p-2 text-right font-bold text-amber-900">$ {t.impActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={aprobarYGuardarCertificado} className="bg-slate-50 border p-4 rounded-xl space-y-4 print:hidden">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1"><Printer className="w-4 h-4" /> Imprimir</button>
                  <button type="submit" disabled={isSavingCert} className="px-6 py-2 bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Guardar Certificado</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}