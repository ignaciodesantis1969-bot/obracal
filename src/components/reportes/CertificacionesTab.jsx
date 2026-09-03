import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Clock, Package, ShieldCheck, ExternalLink, Trash2 } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function CertificacionesTab({
  presupuestos,
  obras,
  certificadosProps,
  fetchedCertificados,
  setFetchedCertificados,
  obtenerClienteDePresupuesto,
  obtenerOrdenDeCompra,
  buscarValorEnObjeto,
  allReportesSice = [],
  facturas = []
}) {
  const [tipoCertificadoSubTab, setTipoCertificadoSubTab] = useState('avance_obra');
  const [certPresupuestoId, setCertPresupuestoId] = useState('');
  const [certClienteNombre, setCertClienteNombre] = useState('');
  const [fetchedClientes, setFetchedClientes] = useState([]);
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

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Clientes', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFetchedClientes(data);
      })
      .catch(() => {});
  }, []);

  const allCertificados = useMemo(() => {
    const cProps = Array.isArray(certificadosProps) ? certificadosProps : [];
    const fCert = Array.isArray(fetchedCertificados) ? fetchedCertificados : [];
    return [...cProps, ...fCert];
  }, [certificadosProps, fetchedCertificados]);

  const certificadoPresupuestoObj = presupuestos.find(p => String(p?.id || p?.ID) === String(certPresupuestoId));

  const extraerClienteRobusto = (pObj) => {
    if (!pObj) return '';
    const posiblesClaves = [
      'cliente', 'razon_social', 'razonSocial', 'cliente_razon_social', 
      'nombre_cliente', 'clientName', 'client', 'razon', 'empresa', 
      'razonsocial', 'client_name', 'clienteNombre', 'nombreCliente'
    ];
    for (const k of posiblesClaves) {
      if (pObj[k] != null && String(pObj[k]).trim() !== '' && String(pObj[k]) !== '---') {
        return String(pObj[k]);
      }
    }
    for (const [k, v] of Object.entries(pObj)) {
      const kl = k.toLowerCase();
      if ((kl.includes('client') || kl.includes('razon') || kl.includes('empresa') || (kl.includes('nombre') && !kl.includes('obra') && !kl.includes('presupuesto'))) && v != null && String(v).trim() !== '' && String(v) !== '---') {
        return String(v);
      }
    }
    return '';
  };

  const resolverRazonSocialCliente = (pObj) => {
    if (!pObj) return '';
    const textDirecto = extraerClienteRobusto(pObj);
    if (textDirecto && isNaN(textDirecto)) {
      return textDirecto;
    }
    const possibleIdKeys = ['cliente_id', 'clienteId', 'id_cliente', 'client_id', 'cliente'];
    let foundId = '';
    for (const k of possibleIdKeys) {
      if (pObj[k] != null && String(pObj[k]).trim() !== '') {
        foundId = String(pObj[k]).trim();
        break;
      }
    }
    if (foundId && fetchedClientes.length > 0) {
      const match = fetchedClientes.find(c => 
        String(c?.id || c?.ID || '') === foundId ||
        String(c?.codigo || c?.code || '') === foundId ||
        String(c?.razon_social || c?.nombre || '').toLowerCase() === foundId.toLowerCase()
      );
      if (match) {
        return match.razon_social || match.razonSocial || match.nombre || match.cliente || foundId;
      }
    }
    if (textDirecto) return textDirecto;
    if (typeof obtenerClienteDePresupuesto === 'function') {
      const resProp = obtenerClienteDePresupuesto(pObj);
      if (resProp && resProp !== '---') return resProp;
    }
    return '';
  };

  useEffect(() => {
    if (certPresupuestoId && certificadoPresupuestoObj) {
      const clienteResuelto = resolverRazonSocialCliente(certificadoPresupuestoObj);
      setCertClienteNombre(clienteResuelto);
    } else if (!certPresupuestoId) {
      setCertClienteNombre('');
    }
  }, [certPresupuestoId, certificadoPresupuestoObj, fetchedClientes]);

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

  useEffect(() => {
    const totalPresupuestoBase = certificadoCalculos?.totalPresupuestoCalc || 0;
    if (totalPresupuestoBase > 0) {
      setAdelantoMonto(Math.round(totalPresupuestoBase * (adelantoPct / 100)));
    }
  }, [certificadoCalculos?.totalPresupuestoCalc, adelantoPct]);

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
        cliente: certClienteNombre || resolverRazonSocialCliente(certificadoPresupuestoObj),
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <button
          type="button"
          onClick={() => setTipoCertificadoSubTab('avance_obra')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'avance_obra' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
        >
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
            <Building2 className="w-4 h-4 text-amber-600" /> Certificación Avance de Obra (P)
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Certificado por avance y certificación presupuestaria</p>
        </button>

        <button
          type="button"
          onClick={() => setTipoCertificadoSubTab('horas_hombre')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'horas_hombre' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
        >
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
            <Clock className="w-4 h-4 text-amber-600" /> Certificación Horas Hombre (CM)
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Consolidado y certificación de horas de contratos</p>
        </button>

        <button
          type="button"
          onClick={() => setTipoCertificadoSubTab('compra_materiales')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'compra_materiales' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
        >
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
            <Package className="w-4 h-4 text-amber-600" /> Certificación Materiales (CM)
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">Auditoría y certificación de insumos imputados</p>
        </button>
      </div>

      {tipoCertificadoSubTab === 'avance_obra' && (
        <div className="space-y-6 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase">Certificado Avance de Obra</h4>
                <p className="text-[11px] text-slate-500">Seleccione un presupuesto aprobado para generar o visualizar.</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Certificado N°:</label>
                <select
                  value={certificadoNro}
                  onChange={(e) => setCertificadoNro(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="0">0 (Adelanto Financiero)</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700">Fecha:</label>
                <input
                  type="date"
                  value={certFecha}
                  onChange={(e) => setCertFecha(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <select
                value={certPresupuestoId}
                onChange={(e) => setCertPresupuestoId(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer w-full"
              >
                <option value="">-- Seleccionar Presupuesto Aprobado --</option>
                {presupuestosDisponiblesCert.map(p => (
                  <option key={p?.id || p?.ID} value={p?.id || p?.ID}>
                    [{p?.codigo || p?.id}] {p?.nombre || 'Presupuesto'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!certificadoPresupuestoObj ? (
            <div className="p-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Seleccione un presupuesto aprobado en el selector superior para desplegar el Certificado de Avance de Obra.
            </div>
          ) : (
            <div id="printable-certificado-container" className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-6 text-slate-900 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
                <div>
                  <img src="/logo-07.png" alt="SICE S.A." className="h-20 object-contain mb-2" />
                  <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase">CERTIFICADO POR AVANCE DE OBRA</h2>
                  <p className={`text-sm font-bold mt-1 ${certificadoNro === '0' ? 'text-blue-600' : 'text-slate-700'}`}>
                    Certificado Nro.: {certificadoNro} {certificadoNro === '0' ? '(Adelanto Financiero)' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-300 pb-4 bg-slate-50 p-4 rounded-xl">
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Cliente (Razón Social):</span>
                  <input
                    type="text"
                    value={certClienteNombre}
                    onChange={(e) => setCertClienteNombre(e.target.value)}
                    placeholder="Razón social del cliente"
                    className="mt-0.5 w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Presupuesto Nro:</span>
                  <strong className="text-slate-900">{certificadoPresupuestoObj?.codigo || certificadoPresupuestoObj?.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Fecha Emisión:</span>
                  <strong className="text-slate-900">{certFecha}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Obra:</span>
                  <strong className="text-slate-900 block mt-0.5">{certificadoPresupuestoObj?.nombre || certificadoPresupuestoObj?.nombre_obra || 'Obra Albañilería'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Orden de Compra:</span>
                  <strong className="text-slate-900 font-mono">
                    {obtenerOrdenDeCompra(certificadoPresupuestoObj)}
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-400 rounded-xl">
                <table className="w-full text-left text-xs border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                      <th className="py-2.5 px-2 border-r border-slate-700 w-10 text-center" rowSpan="2">Ítem</th>
                      <th className="py-2.5 px-3 border-r border-slate-700" rowSpan="2">Descripción del Rubro / Tarea</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center w-10" rowSpan="2">Und</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-right w-12" rowSpan="2">Cant.</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-right w-36 whitespace-nowrap" rowSpan="2">Total Cotizado</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ANTERIOR</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ACTUAL (PERÍODO)</th>
                      <th className="py-2.5 px-1 text-center bg-slate-700" colSpan="2">ACUMULADO</th>
                    </tr>
                    <tr className="bg-slate-700 text-white font-bold text-[9px]">
                      <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                      <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                      <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 whitespace-nowrap">Importe ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {certificadoCalculos.filasRender.map((rubroObj) => (
                      <React.Fragment key={rubroObj.rIdx}>
                        <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                          <td className="py-2 px-2 text-center border-r border-slate-300">{rubroObj.rIdx + 1}</td>
                          <td className="py-2 px-3 uppercase border-r border-slate-300" colSpan="3">{rubroObj.nombre}</td>
                          <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.totalRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                          <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.rubroAnterior.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                          <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.rubroActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                          <td className="py-2 px-3 text-right whitespace-nowrap">$ {(rubroObj.rubroAnterior + rubroObj.rubroActual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        </tr>
                        {rubroObj.tareasFilas.map((t) => (
                          <tr key={t.tIdx} className="hover:bg-amber-50/40 text-xs">
                            <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-300">{t.rIdx + 1}.{t.tIdx + 1}</td>
                            <td className="py-2 px-3 text-slate-800 border-r border-slate-300 font-medium">{t.tarea}</td>
                            <td className="py-2 px-1 text-center text-slate-500 border-r border-slate-300">{t.unidad}</td>
                            <td className="py-2 px-1 text-right border-r border-slate-300">{t.cant}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">$ {t.totalItem.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-1 text-center border-r border-slate-300 text-slate-600">{t.pctAnterior}%</td>
                            <td className="py-2 px-3 text-right border-r border-slate-300 text-slate-600 whitespace-nowrap">$ {t.impAnterior.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-1 text-center border-r border-slate-300 bg-amber-50/50">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={t.pctActual}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setAvanceActualMap({ ...avanceActualMap, [t.keyMap]: val });
                                }}
                                className="w-10 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-bold text-xs outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="py-2 px-3 text-right border-r border-slate-300 font-semibold text-amber-900 bg-amber-50/50 whitespace-nowrap">$ {t.impActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-1 text-center border-r border-slate-300 font-bold text-slate-700">{t.pctAcumulado}%</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-950 whitespace-nowrap">$ {t.impAcumulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-300 pb-2">RESUMEN Y LIQUIDACIÓN FINANCIERA</h3>
                
                {(() => {
                  const totalPresupuestoBase = certificadoCalculos.totalPresupuestoCalc || 1;
                  const totalCertificadoPeriodo = certificadoNro === '0' ? 0 : certificadoCalculos.totalActualCalc;

                  let montoAdelantoCalculado = adelantoMonto;
                  if (certificadoNro === '0') {
                    montoAdelantoCalculado = totalPresupuestoBase * (adelantoPct / 100);
                  }

                  const descuentoAdelantoCert = certificadoNro !== '0' ? totalCertificadoPeriodo * (adelantoPct / 100) : 0;
                  const netoACertificar = totalCertificadoPeriodo - (certificadoNro === '0' ? 0 : descuentoAdelantoCert) + Number(adicionalesMonto);
                  
                  let montoRedetCalculado = redeterminacionMonto;
                  if (redeterminacionPct > 0) {
                    montoRedetCalculado = netoACertificar * (redeterminacionPct / 100);
                  }

                  const totalFinalLiquidacion = certificadoNro === '0' ? montoAdelantoCalculado : (netoACertificar + montoRedetCalculado);

                  if (certificadoNro === '0') {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-300">
                          <span className="font-bold text-slate-700 block uppercase">Configuración Adelanto Financiero</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                              <input
                                type="number"
                                step="1"
                                value={adelantoPct}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  setAdelantoPct(pct);
                                  setAdelantoMonto(Math.round(totalPresupuestoBase * (pct / 100)));
                                }}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-right font-bold text-amber-900 outline-none focus:border-amber-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Monto Absoluto ($)</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-xs font-bold text-slate-500">$</span>
                                <input
                                  type="text"
                                  value={adelantoMonto ? Number(adelantoMonto).toLocaleString('es-AR') : Math.round(montoAdelantoCalculado).toLocaleString('es-AR')}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const monto = parseFloat(raw) || 0;
                                    setAdelantoMonto(monto);
                                    setAdelantoPct(totalPresupuestoBase > 0 ? Number(((monto / totalPresupuestoBase) * 100).toFixed(2)) : 0);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1.5 text-right font-bold text-amber-900 outline-none focus:border-amber-500 font-mono text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col justify-center bg-slate-950 text-white p-4 rounded-xl shadow-md">
                          <span className="font-extrabold text-xs uppercase text-slate-400">TOTAL ADELANTO FINANCIERO A CERTIFICAR:</span>
                          <span className="font-black text-xl text-amber-400 mt-1 font-mono">
                            $ {Math.round(montoAdelantoCalculado).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                          <span className="font-bold text-slate-700">Total Certificado Período (Actual):</span>
                          <span className="font-black text-slate-900 text-sm font-mono">$ {totalCertificadoPeriodo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>

                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                          <span className="font-bold text-slate-700">Descuento por Adelanto Financiero ({adelantoPct}%):</span>
                          <span className="font-black text-rose-700 font-mono">- $ {descuentoAdelantoCert.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>

                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                          <span className="font-bold text-slate-700">Adicionales Aprobados:</span>
                          <input
                            type="number"
                            value={adicionalesMonto}
                            onChange={(e) => setAdicionalesMonto(e.target.value)}
                            className="w-32 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-emerald-700 outline-none focus:border-amber-500 font-mono"
                          />
                        </div>

                        <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl shadow">
                          <span className="font-extrabold text-xs uppercase">TOTAL NETO A CERTIFICAR:</span>
                          <span className="font-black text-base text-amber-400 font-mono">$ {netoACertificar.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2">
                          <span className="font-bold text-slate-700 block">Redeterminación de Precio:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                              <input
                                type="number"
                                step="1"
                                value={redeterminacionPct}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  setRedeterminacionPct(pct);
                                  setRedeterminacionMonto(Math.round(netoACertificar * (pct / 100)));
                                }}
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Monto Absoluto ($)</label>
                              <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-xs font-bold text-slate-500">$</span>
                                <input
                                  type="text"
                                  value={redeterminacionMonto ? Number(redeterminacionMonto).toLocaleString('es-AR') : Math.round(montoRedetCalculado).toLocaleString('es-AR')}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const monto = parseFloat(raw) || 0;
                                    setRedeterminacionMonto(monto);
                                    setRedeterminacionPct((monto / (netoACertificar || 1)) * 100);
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 rounded pl-7 pr-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500 font-mono text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-slate-950 text-white p-4 rounded-xl shadow-md mt-6">
                          <span className="font-extrabold text-xs uppercase">TOTAL GENERAL A CERTIFICAR:</span>
                          <span className="font-black text-lg text-amber-400 font-mono">$ {totalFinalLiquidacion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {certificadoPresupuestoObj && (
            <form onSubmit={aprobarYGuardarCertificado} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50 p-4 space-y-4 print:hidden">
              <h4 className="font-black text-xs text-slate-900 uppercase">Aprobación y Firma del Certificado</h4>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={isSavingCert}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Guardar Certificado en Sheets
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-4 mt-6 print:hidden">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Historial de Certificados Emitidos (Presupuesto Actual)</h3>
            {!certPresupuestoId ? (
              <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                Seleccione un presupuesto en la parte superior para visualizar y administrar sus certificados emitidos.
              </div>
            ) : certificadosDelPresupuestoActual.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                No hay certificados guardados para este presupuesto.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                      <th className="px-4 py-3">Certificado N°</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Obra</th>
                      <th className="px-4 py-3 text-right">Total General</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificadosDelPresupuestoActual.map((cert) => {
                      const nroCert = cert?.certificadoNro !== undefined ? cert.certificadoNro : (cert?.certificado_nro || '0');
                      const pdfLink = cert?.pdfUrl || cert?.pdf_url;
                      const certKeyId = cert?.id || `${cert?.presupuesto_id}_${nroCert}`;

                      return (
                        <tr key={certKeyId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-amber-800">Certificado #{nroCert}</td>
                          <td className="px-4 py-3 text-slate-600">{cert?.fecha}</td>
                          <td className="px-4 py-3 text-slate-800 font-semibold">{cert?.cliente}</td>
                          <td className="px-4 py-3 text-slate-600">{cert?.obra}</td>
                          <td className="px-4 py-3 text-right font-black text-slate-950 font-mono">
                            $ {Number(cert?.totalGeneral || cert?.total_general || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                            {pdfLink && (
                              <a href={pdfLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-[10px] inline-flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Ver PDF
                              </a>
                            )}
                            <button onClick={() => eliminarCertificadoServidor(certKeyId)} className="p-1.5 bg-rose-600 text-white rounded-lg cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tipoCertificadoSubTab === 'horas_hombre' && (
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-black text-slate-900 uppercase">Certificación Horas Hombre (Contrato Mantenimiento)</h4>
            <p className="text-[11px] text-slate-500">Consolidado de horas trabajadas y validadas a partir del historial de partes diarios SICE.</p>
          </div>
          {allReportesSice.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">No hay partes diarios aprobados para certificar.</div>
          ) : (
            <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="px-4 py-3">Parte Nro</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-center">Total Horas Validadas</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allReportesSice.map((parte, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">Parte #{parte?.nro}</td>
                    <td className="px-4 py-3 text-slate-600">{parte?.fecha}</td>
                    <td className="px-4 py-3 text-center font-black text-emerald-700 font-mono">{parte?.totalHorasSuma || parte?.total_horas_suma} hs</td>
                    <td className="px-4 py-3 text-center">
                      {(parte?.pdfUrl || parte?.pdf_url) && <a href={parte.pdfUrl || parte.pdf_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-amber-500 font-bold rounded-lg text-[10px]">Ver PDF</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tipoCertificadoSubTab === 'compra_materiales' && (
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-black text-slate-900 uppercase">Certificación Materiales (Contrato Mantenimiento)</h4>
            <p className="text-[11px] text-slate-500">Auditoría y certificación de insumos imputados a contratos.</p>
          </div>
          {facturas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">No hay facturas registradas.</div>
          ) : (
            <table className="w-full text-left text-xs border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="px-4 py-3">Factura</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {facturas.map((fac, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{fac?.n_factura || fac?.nro_factura || `Factura #${idx + 1}`}</td>
                    <td className="px-4 py-3 text-slate-600">{fac?.proveedor}</td>
                    <td className="px-4 py-3 text-right font-black font-mono">$ {Number(fac?.total || fac?.subtotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}