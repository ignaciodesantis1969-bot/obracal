import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Building2, Clock, Package, ShieldCheck, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';
import CertificadoHorasHombreTab from './CertificadoHorasHombreTab';

export default function CertificacionesTab({
  presupuestos = [],
  obras = [],
  certificadosProps = [],
  fetchedCertificados = [],
  setFetchedCertificados = () => {},
  obtenerClienteDePresupuesto = () => '',
  obtenerOrdenDeCompra = () => '',
  buscarValorEnObjeto = () => '',
  allReportesSice = [],
  facturas = [],
  contratosList = []
}) {
  const [tipoCertificadoSubTab, setTipoCertificadoSubTab] = useState('avance_obra');
  const [certPresupuestoId, setCertPresupuestoId] = useState('');
  const [certClienteNombre, setCertClienteNombre] = useState('');
  const [fetchedCertificadosLocal, setFetchedCertificadosLocal] = useState([]);
  
  const [avanceActualMap, setAvanceActualMap] = useState({});
  const [adicionalesMonto, setAdicionalesMonto] = useState(0);
  
  const [certificadoNro, setCertificadoNro] = useState('0');
  const [certFecha, setCertFecha] = useState(new Date().toISOString().slice(0, 10));
  
  const [adelantoPct, setAdelantoPct] = useState(10);
  const [adelantoMonto, setAdelantoMonto] = useState(0);
  const [redeterminacionPct, setRedeterminacionPct] = useState(0);
  const [redeterminacionMonto, setRedeterminacionMonto] = useState(0);

  const [certRespProveedor, setCertRespProveedor] = useState({ nombre: 'Alexander Torres Lopez', cargo: 'JEFE DE OBRA' });
  const [certRespCliente, setCertRespCliente] = useState({ nombre: '', cargo: 'RESPONSABLE TÉCNICO' });
  const [isSavingCert, setIsSavingCert] = useState(false);

  const extraerArrayDatos = (fuente) => {
    if (Array.isArray(fuente)) return fuente;
    if (fuente && typeof fuente === 'object') {
      if (Array.isArray(fuente.data)) return fuente.data;
      if (Array.isArray(fuente.items)) return fuente.items;
      if (Array.isArray(fuente.result)) return fuente.result;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Certificados', action: 'get' })
    })
      .then(res => res.json())
      .then(data => { 
        const arr = extraerArrayDatos(data);
        if (arr.length > 0) {
          setFetchedCertificadosLocal(arr);
          if (typeof setFetchedCertificados === 'function') {
            setFetchedCertificados(arr);
          }
        }
      })
      .catch(() => {});
  }, [setFetchedCertificados]);

  const allCertificados = useMemo(() => {
    const cProps = extraerArrayDatos(certificadosProps);
    const fCert = extraerArrayDatos(fetchedCertificados);
    const fLocal = extraerArrayDatos(fetchedCertificadosLocal);
    
    let localCache = [];
    try {
      const cached = localStorage.getItem('sice_certificados_local_cache');
      if (cached) localCache = JSON.parse(cached);
    } catch (e) {}

    const combinados = [...cProps, ...fCert, ...fLocal, ...localCache];
    const map = new Map();
    combinados.forEach(c => {
      if (!c) return;
      const keyId = String(c.id || c.ID || `${c.presupuestoId || c.presupuesto_id}_${c.certificadoNro !== undefined ? c.certificadoNro : c.certificado_nro}` || Math.random());
      if (keyId) map.set(keyId, c);
    });
    return Array.from(map.values());
  }, [certificadosProps, fetchedCertificados, fetchedCertificadosLocal]);

  const certificadoPresupuestoObj = useMemo(() => {
    if (!certPresupuestoId) return null;
    return presupuestos.find(p => {
      const pId = String(p?.id || p?.ID || '').trim();
      const pCod = String(p?.codigo || '').trim();
      const sel = String(certPresupuestoId).trim();
      return pId === sel || pCod === sel;
    });
  }, [presupuestos, certPresupuestoId]);

  useEffect(() => {
    if (certificadoPresupuestoObj) {
      const clienteDetectado = obtenerClienteDePresupuesto 
        ? obtenerClienteDePresupuesto(certificadoPresupuestoObj) 
        : (certificadoPresupuestoObj.cliente || certificadoPresupuestoObj.razon_social || 'LDC Argentina S.A.');
      
      setCertClienteNombre(clienteDetectado);

      const respCli = buscarValorEnObjeto(certificadoPresupuestoObj, ['responsable_cliente', 'responsableCliente', 'cliente_responsable']) || 'Cristian Matei';
      const cargoCli = buscarValorEnObjeto(certificadoPresupuestoObj, ['cargo_cliente', 'cargoCliente']) || 'RESPONSABLE TÉCNICO';
      setCertRespCliente({ nombre: respCli, cargo: cargoCli });
    }
  }, [certificadoPresupuestoObj, obtenerClienteDePresupuesto, buscarValorEnObjeto]);

  const certificadosDelPresupuestoActual = useMemo(() => {
    if (!certPresupuestoId) return [];
    const idSel = String(certPresupuestoId).trim();
    const codigoSel = String(certificadoPresupuestoObj?.codigo || '').trim();
    
    return allCertificados.filter(c => {
      if (!c) return false;
      const pId = String(c?.presupuestoId || c?.presupuesto_id || c?.id_presupuesto || c?.presupuesto || '').trim();
      return pId === idSel || (codigoSel && pId === codigoSel) || pId.includes(idSel) || idSel.includes(pId);
    }).sort((a, b) => {
      const nroA = parseInt(a?.certificadoNro !== undefined ? a.certificadoNro : a?.certificado_nro || 0);
      const nroB = parseInt(b?.certificadoNro !== undefined ? b.certificadoNro : b?.certificado_nro || 0);
      return nroB - nroA;
    });
  }, [allCertificados, certPresupuestoId, certificadoPresupuestoObj]);

  const obtenerPctAnteriorAcumulado = (rIdx, tIdx) => {
    if (String(certificadoNro).trim() === '0') return 0;
    let sumaPct = 0;
    const nroActual = parseInt(certificadoNro, 10) || 1;
    certificadosDelPresupuestoActual.forEach(cert => {
      const certNro = parseInt(cert?.certificadoNro !== undefined ? cert.certificadoNro : cert?.certificado_nro, 10) || 0;
      if (certNro >= 0 && certNro < nroActual) {
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

    const coefPase = Number(certificadoPresupuestoObj?.coeficiente_pase || certificadoPresupuestoObj?.coeficiente || 1);

    let totalPresupuestoCalc = 0;
    let totalActualCalc = 0;

    const filasRender = itemsDetalle.map((rubro, rIdx) => {
      let totalRubro = 0, rubroAnterior = 0, rubroActual = 0;
      const tareasRubro = Array.isArray(rubro?.tareas) ? rubro.tareas : [];
      
      const tareasFilas = tareasRubro.map((t, tIdx) => {
        const cant = Number(t?.cantidad) || Number(t?.cant) || 1;
        const costoUnit = Number(t?.costo_unitario || t?.costoUnitario || t?.costo || 0);
        const pUnit = Number(t?.precio_venta) || Number(t?.precioVenta) || Number(t?.precioUnitarioVenta) || Number(t?.precio_unitario) || Number(t?.precioUnitario) || Number(t?.precio) || (costoUnit * coefPase);
        const totalItem = Number(t?.total || t?.subtotal || (cant * pUnit));
        
        totalRubro += totalItem;

        const pctAnterior = obtenerPctAnteriorAcumulado(rIdx, tIdx);
        const impAnterior = totalItem * (pctAnterior / 100);
        rubroAnterior += impAnterior;

        const keyMap = `${rIdx}-${tIdx}`;
        const pctActual = avanceActualMap[keyMap] !== undefined ? Number(avanceActualMap[keyMap]) : 0;
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
    if (certificadoCalculos?.totalPresupuestoCalc > 0 && String(certificadoNro).trim() === '0') {
      setAdelantoMonto(certificadoCalculos.totalPresupuestoCalc * (adelantoPct / 100));
    }
  }, [certificadoCalculos?.totalPresupuestoCalc, certPresupuestoId, certificadoNro, adelantoPct]);

  const aprobarYGuardarCertificado = async (e) => {
    e.preventDefault();
    if (!certificadoPresupuestoObj) {
      toast.error("Seleccione un presupuesto aprobado.");
      return;
    }

    setIsSavingCert(true);
    const toastId = toast.loading('Generando PDF en Google Drive y guardando certificado...');

    try {
      const isCertZero = String(certificadoNro).trim() === '0';
      const totalCertificadoPeriodo = isCertZero ? 0 : certificadoCalculos?.totalActualCalc;
      const descuentoAdelantoCert = !isCertZero ? totalCertificadoPeriodo * (adelantoPct / 100) : 0;
      const netoACertificar = totalCertificadoPeriodo - (isCertZero ? 0 : descuentoAdelantoCert) + Number(adicionalesMonto);
      const totalFinalLiquidacion = isCertZero ? adelantoMonto : (netoACertificar + redeterminacionMonto);

      const payloadCert = {
        action: 'guardarCertificado',
        tabla: 'Certificados',
        presupuesto_id: String(certPresupuestoId),
        certificado_nro: String(certificadoNro),
        fecha: String(certFecha),
        cliente: certClienteNombre,
        obra: String(certificadoPresupuestoObj?.nombre || 'Obra'),
        orden_compra: obtenerOrdenDeCompra(certificadoPresupuestoObj),
        filas: certificadoCalculos.filasRender,
        total_periodo: totalCertificadoPeriodo,
        adelanto_descuento: descuentoAdelantoCert,
        adicionales: Number(adicionalesMonto),
        redeterminacion: redeterminacionMonto,
        total_general: totalFinalLiquidacion,
        proveedor_nombre: certRespProveedor.nombre || 'Alexander Torres Lopez',
        proveedor_cargo: certRespProveedor.cargo || '',
        cliente_nombre: certRespCliente.nombre || certClienteNombre,
        cliente_cargo: certRespCliente.cargo || ''
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadCert)
      });
      const resultado = await res.json();
      
      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || resultado?.link || '';
      
      const nuevoCertGuardado = { 
        ...payloadCert, 
        presupuestoId: String(certPresupuestoId), 
        certificadoNro: String(certificadoNro), 
        pdfUrl: pdfUrlFinal, 
        id: resultado?.id || `cert-${Date.now()}` 
      };

      try {
        const cached = localStorage.getItem('sice_certificados_local_cache');
        const parsedCache = cached ? JSON.parse(cached) : [];
        parsedCache.unshift(nuevoCertGuardado);
        localStorage.setItem('sice_certificados_local_cache', JSON.stringify(parsedCache));
      } catch (e) {}

      setFetchedCertificadosLocal(prev => [nuevoCertGuardado, ...prev]);
      if (typeof setFetchedCertificados === 'function') {
        setFetchedCertificados(prev => [nuevoCertGuardado, ...prev]);
      }
      
      toast.success("¡Certificado guardado con éxito en Sheets y PDF generado en Drive!", { id: toastId });
    } catch (err) {
      toast.error("Error al guardar certificado.", { id: toastId });
    } finally {
      setIsSavingCert(false);
    }
  };

  const eliminarCertificadoServidor = async (certId) => {
    if (!window.confirm("¿Está seguro de eliminar este certificado?")) return;
    const toastId = toast.loading('Eliminando certificado...');
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Certificados', action: 'delete', id: certId })
      });
      
      try {
        const cached = localStorage.getItem('sice_certificados_local_cache');
        if (cached) {
          const parsedCache = JSON.parse(cached).filter(c => String(c.id) !== String(certId));
          localStorage.setItem('sice_certificados_local_cache', JSON.stringify(parsedCache));
        }
      } catch (e) {}

      setFetchedCertificadosLocal(prev => prev.filter(c => String(c?.id || '') !== String(certId)));
      if (typeof setFetchedCertificados === 'function') {
        setFetchedCertificados(prev => prev.filter(c => String(c?.id || '') !== String(certId)));
      }
      toast.success("Certificado eliminado.", { id: toastId });
    } catch (err) { 
      toast.error("Error al intentar eliminar.", { id: toastId });
    }
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
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
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
                {presupuestos.filter(p => {
                  const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
                  return est === 'aprobado' || est === 'aprobada';
                }).map(p => {
                  const pIdVal = p?.id || p?.ID;
                  return (
                    <option key={pIdVal} value={pIdVal}>
                      [{p?.codigo || pIdVal}] {p?.nombre || 'Presupuesto'}
                    </option>
                  );
                })}
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
                  <p className="text-sm font-bold mt-1 text-blue-600">
                    Certificado Nro.: {certificadoNro} {String(certificadoNro).trim() === '0' ? '(Adelanto Financiero)' : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-300 pb-3 bg-slate-50 p-3 rounded-xl">
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Cliente (Razón Social):</span>
                  <input
                    type="text"
                    value={certClienteNombre}
                    onChange={(e) => setCertClienteNombre(e.target.value)}
                    placeholder="Razón social del cliente"
                    className="mt-0.5 w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
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
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center w-8" rowSpan="2">Und</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-right w-10" rowSpan="2">Cant.</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-right w-36 whitespace-nowrap" rowSpan="2">Total Cotizado</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ANTERIOR</th>
                      <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ACTUAL (PERÍODO)</th>
                      <th className="py-2.5 px-1 text-center bg-slate-700" colSpan="2">ACUMULADO</th>
                    </tr>
                    <tr className="bg-slate-700 text-white font-bold text-[9px]">
                      <th className="py-1 px-1 text-center w-8 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                      <th className="py-1 px-1 text-center w-8 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                      <th className="py-1 px-1 text-center w-8 border-r border-slate-600">%</th>
                      <th className="py-1 px-3 text-right w-36 whitespace-nowrap">Importe ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {certificadoCalculos.filasRender.map((rubroObj) => {
                      const pctRubroAnterior = rubroObj.totalRubro > 0 ? Math.round((rubroObj.rubroAnterior / rubroObj.totalRubro) * 100) : 0;
                      const pctRubroActual = rubroObj.totalRubro > 0 ? Math.round((rubroObj.rubroActual / rubroObj.totalRubro) * 100) : 0;
                      const rubroAcumulado = rubroObj.rubroAnterior + rubroObj.rubroActual;
                      const pctRubroAcumulado = rubroObj.totalRubro > 0 ? Math.round((rubroAcumulado / rubroObj.totalRubro) * 100) : 0;

                      return (
                        <React.Fragment key={rubroObj.rIdx}>
                          <tr className="bg-slate-300 font-black text-slate-950 border-t-2 border-slate-400">
                            <td className="py-2.5 px-2 text-center border-r border-slate-400">{rubroObj.rIdx + 1}</td>
                            <td className="py-2.5 px-3 uppercase border-r border-slate-400" colSpan="3">{rubroObj.nombre}</td>
                            <td className="py-2.5 px-3 text-right border-r border-slate-400 whitespace-nowrap">$ {rubroObj.totalRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2.5 px-1 text-center border-r border-slate-400 font-bold">{pctRubroAnterior}%</td>
                            <td className="py-2.5 px-3 text-right border-r border-slate-400 whitespace-nowrap">$ {rubroObj.rubroAnterior.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2.5 px-1 text-center border-r border-slate-400 font-bold">{pctRubroActual}%</td>
                            <td className="py-2.5 px-3 text-right border-r border-slate-400 whitespace-nowrap">$ {rubroObj.rubroActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2.5 px-1 text-center border-r border-slate-400 font-bold">{pctRubroAcumulado}%</td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">$ {rubroAcumulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          </tr>
                          {rubroObj.tareasFilas.map((t) => (
                            <tr key={t.keyMap} className="hover:bg-amber-50/40 text-xs bg-white">
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
                                  className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 text-center font-bold text-xs outline-none focus:border-amber-500"
                                />
                              </td>
                              <td className="py-2 px-3 text-right border-r border-slate-300 font-semibold text-amber-900 bg-amber-50/50 whitespace-nowrap">$ {t.impActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-1 text-center border-r border-slate-300 font-bold text-slate-700">{t.pctAcumulado}%</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-950 whitespace-nowrap">$ {t.impAcumulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-300 pb-2">RESUMEN Y LIQUIDACIÓN FINANCIERA</h3>
                
                {(() => {
                  const totalPresupuestoBase = certificadoCalculos.totalPresupuestoCalc || 1;
                  const isCertZero = String(certificadoNro).trim() === '0';

                  if (isCertZero) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-300">
                          <span className="font-bold text-slate-700 block uppercase">Configuración Adelanto Financiero</span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={adelantoPct}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  setAdelantoPct(pct);
                                  setAdelantoMonto(totalPresupuestoBase * (pct / 100));
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
                                  value={adelantoMonto ? Math.round(adelantoMonto).toLocaleString('es-AR') : '0'}
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
                            $ {Math.round(adelantoMonto).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const totalCertificadoPeriodo = certificadoCalculos.totalActualCalc;
                  const descuentoAdelantoCert = totalCertificadoPeriodo * (adelantoPct / 100);
                  const netoACertificar = totalCertificadoPeriodo - descuentoAdelantoCert + Number(adicionalesMonto);
                  const totalFinalLiquidacion = netoACertificar + redeterminacionMonto;

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
                          <span className="font-bold text-slate-700 block uppercase">Redeterminación de Precio</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={redeterminacionPct}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  setRedeterminacionPct(pct);
                                  setRedeterminacionMonto(netoACertificar * (pct / 100));
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
                                  value={redeterminacionMonto ? Math.round(redeterminacionMonto).toLocaleString('es-AR') : '0'}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    const monto = parseFloat(raw) || 0;
                                    setRedeterminacionMonto(monto);
                                    setRedeterminacionPct(netoACertificar > 0 ? Number(((monto / netoACertificar) * 100).toFixed(2)) : 0);
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

              {/* BLOQUE DE FIRMAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 print:mt-10">
                <div className="border border-slate-400 rounded-lg overflow-hidden bg-white">
                  <div className="bg-[#e2e8f0] border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                    Responsable Proveedor
                  </div>
                  <div className="p-4 space-y-4 text-xs font-bold">
                    <div>
                      <span className="block text-slate-500 mb-0.5 text-[10px] tracking-wide">CARGO:</span>
                      <input type="text" value={certRespProveedor.cargo} onChange={(e) => setCertRespProveedor({...certRespProveedor, cargo: e.target.value})} className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 p-0 focus:ring-0 uppercase font-semibold" placeholder="Ingrese cargo..." />
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-0.5 text-[10px] tracking-wide">NOMBRE Y APELLIDO:</span>
                      <input type="text" value={certRespProveedor.nombre} onChange={(e) => setCertRespProveedor({...certRespProveedor, nombre: e.target.value})} className="w-full bg-transparent border-none outline-none text-slate-950 placeholder:text-slate-400 p-0 focus:ring-0 uppercase font-black" placeholder="Ingrese nombre..." />
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1 text-[10px] tracking-wide">FIRMA:</span>
                      <div className="text-emerald-700 tracking-widest text-sm select-none font-mono py-1">••••••</div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">✓ Firma Electrónica Verificada</div>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-400 rounded-lg overflow-hidden bg-white">
                  <div className="bg-[#e2e8f0] border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-[11px] uppercase tracking-wider">
                    Responsable Cliente
                  </div>
                  <div className="p-4 space-y-4 text-xs font-bold">
                    <div>
                      <span className="block text-slate-500 mb-0.5 text-[10px] tracking-wide">CARGO:</span>
                      <input type="text" value={certRespCliente.cargo} onChange={(e) => setCertRespCliente({...certRespCliente, cargo: e.target.value})} className="w-full bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 p-0 focus:ring-0 uppercase font-semibold" placeholder="Ingrese cargo..." />
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-0.5 text-[10px] tracking-wide">NOMBRE Y APELLIDO:</span>
                      <input type="text" value={certRespCliente.nombre} onChange={(e) => setCertRespCliente({...certRespCliente, nombre: e.target.value})} className="w-full bg-transparent border-none outline-none text-slate-950 placeholder:text-slate-400 p-0 focus:ring-0 uppercase font-black" placeholder="Ingrese nombre..." />
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1 text-[10px] tracking-wide">FIRMA:</span>
                      <div className="text-emerald-700 tracking-widest text-sm select-none font-mono py-1">••••••</div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">✓ Firma Electrónica Verificada</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {certificadoPresupuestoObj && (
            <form onSubmit={aprobarYGuardarCertificado} className="border border-slate-300 rounded-xl overflow-hidden mt-6 bg-white p-4 space-y-4 shadow-sm print:hidden">
              <h4 className="font-black text-xs text-slate-900 uppercase">Aprobación y Firma del Certificado</h4>
              <div className="flex justify-end pt-2">
                <button 
                  type="submit"
                  disabled={isSavingCert}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isSavingCert ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <ShieldCheck className="w-4 h-4" />}
                  {isSavingCert ? 'Generando PDF y Guardando...' : 'Guardar Certificado en Sheets'}
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
        <CertificadoHorasHombreTab contratosList={contratosList} allReportesSice={allReportesSice} />
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