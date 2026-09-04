import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useObraData } from '../../hooks/useObraData';
import { OBRAS_CONFIG } from '../../config/constants';
import ReportesDiariosTab from './ReportesDiariosTab';
import ListadoInsumosTab from './ListadoInsumosTab';
import ComparativoTab from './ComparativoTab';
import CertificadoHorasHombreTab from './CertificadoHorasHombreTab';
import { FileText, Building2, Clock, Package, TrendingUp, Calendar, ShieldCheck, Printer, Trash2, Eye, X, ExternalLink } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error en módulo de Reportes:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Algo salió mal en este panel</h2>
          <p className="text-xs text-slate-500">Ocurrió un error inesperado al renderizar los reportes.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReportesContent({
  contratosList = [],
  allReportesSice = [],
  setFetchedReportesSice = () => {},
  listaEmpleadosActivos = [],
  esOperador = false,
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  },
  presupuestos = [],
  facturas = [],
  setFetchedCertificados = () => {},
  certificadosList = [],
  obras = []
}) {
  const { isLoading: isLoadingReportes } = useObraData(OBRAS_CONFIG.TABLAS.REPORTES_SICE);
  const { isLoading: isLoadingCertificados } = useObraData(OBRAS_CONFIG.TABLAS.CERTIFICACIONES);

  const [activeTab, setActiveTab] = useState('Certificaciones');
  const [tipoCertificadoSubTab, setTipoCertificadoSubTab] = useState('avance_obra');

  // Estados de Certificados
  const [certificadoNro, setCertificadoNro] = useState('1');
  const [certFecha, setCertFecha] = useState(new Date().toISOString().slice(0, 10));
  const [certPresupuestoId, setCertPresupuestoId] = useState('');
  const [certClienteNombre, setCertClienteNombre] = useState('');
  const [adelantoPct, setAdelantoPct] = useState(20);
  const [adelantoMonto, setAdelantoMonto] = useState(0);
  const [adicionalesMonto, setAdicionalesMonto] = useState(0);
  const [redeterminacionPct, setRedeterminacionPct] = useState(0);
  const [redeterminacionMonto, setRedeterminacionMonto] = useState(0);
  const [avanceActualMap, setAvanceActualMap] = useState({});
  const [certRespProveedor, setCertRespProveedor] = useState({ cargo: 'Jefe de Obra', nombre: '', clave: '' });
  const [certRespCliente, setCertRespCliente] = useState({ cargo: 'Supervisor', nombre: '', clave: '' });
  const [isSavingCert, setIsSavingCert] = useState(false);

  const presupuestosDisponiblesCert = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
      return est === 'aprobado' || est === 'aprobada';
    });
  }, [presupuestos]);

  const certificadoPresupuestoObj = useMemo(() => {
    if (!certPresupuestoId) return null;
    return presupuestos.find(p => String(p?.id || p?.ID) === String(certPresupuestoId));
  }, [certPresupuestoId, presupuestos]);

  useEffect(() => {
    if (certificadoPresupuestoObj) {
      const cliName = certificadoPresupuestoObj?.cliente || certificadoPresupuestoObj?.nombre_cliente || 'Cliente SICE';
      setCertClienteNombre(cliName);
    }
  }, [certificadoPresupuestoObj]);

  const obtenerOrdenDeCompra = (presupuesto) => {
    if (!presupuesto) return 'OC-2026-001';
    return presupuesto?.orden_compra || presupuesto?.ordenCompra || 'OC-2026-001';
  };

  const certificadoCalculos = useMemo(() => {
    if (!certificadoPresupuestoObj) return { filasRender: [], totalPresupuestoCalc: 0, totalActualCalc: 0 };
    
    let rubrosList = certificadoPresupuestoObj?.rubros || certificadoPresupuestoObj?.detalles || [];
    if (typeof rubrosList === 'string') {
      try { rubrosList = JSON.parse(rubrosList); } catch { rubrosList = []; }
    }

    let totalPresupuesto = 0;
    let totalActual = 0;
    const filasRender = [];

    rubrosList.forEach((rubro, rIdx) => {
      const nombreRubro = rubro?.nombre || rubro?.rubro || `Rubro ${rIdx + 1}`;
      let tareasList = rubro?.tareas || rubro?.items || [];
      if (typeof tareasList === 'string') {
        try { tareasList = JSON.parse(tareasList); } catch { tareasList = []; }
      }

      let totalRubro = 0;
      let rubroAnterior = 0;
      let rubroActual = 0;
      const tareasFilas = [];

      tareasList.forEach((t, tIdx) => {
        const tareaDesc = t?.descripcion || t?.tarea || `Tarea ${tIdx + 1}`;
        const unidad = t?.unidad || 'un';
        const cant = Number(t?.cantidad || t?.cant || 1);
        const cUnit = Number(t?.costo_unitario || t?.precio_unitario || t?.unitario || 0);
        const totalItem = Number(t?.total || (cant * cUnit));
        totalRubro += totalItem;

        const keyMap = `${rIdx}_${tIdx}`;
        const pctActual = avanceActualMap[keyMap] !== undefined ? avanceActualMap[keyMap] : 0;
        const impActual = totalItem * (pctActual / 100);
        const pctAnterior = 0; 
        const impAnterior = 0;

        rubroActual += impActual;

        tareasFilas.push({
          rIdx,
          tIdx,
          tarea: tareaDesc,
          unidad,
          cant,
          totalItem,
          pctAnterior,
          impAnterior,
          pctActual,
          impActual,
          pctAcumulado: pctAnterior + pctActual,
          impAcumulado: impAnterior + impActual,
          keyMap
        });
      });

      totalPresupuesto += totalRubro;
      totalActual += rubroActual;

      filasRender.push({
        rIdx,
        nombre: nombreRubro,
        totalRubro,
        rubroAnterior,
        rubroActual,
        tareasFilas
      });
    });

    return { filasRender, totalPresupuestoCalc: totalPresupuesto, totalActualCalc: totalActual };
  }, [certificadoPresupuestoObj, avanceActualMap]);

  const aprobarYGuardarCertificado = async (e) => {
    e.preventDefault();
    if (!certPresupuestoId) {
      toast.error('Seleccione un presupuesto para certificar.');
      return;
    }

    setIsSavingCert(true);
    const toastId = toast.loading('Generando PDF del certificado y guardando...');

    try {
      const payloadCert = {
        action: 'guardarYGenerarPDF',
        tabla: 'Certificaciones',
        presupuesto_id: String(certPresupuestoId),
        certificadoNro: String(certificadoNro),
        fecha: String(certFecha),
        cliente: { nombre: String(certClienteNombre), cargo: String(certRespCliente?.cargo || '') },
        obra: certificadoPresupuestoObj?.nombre || certificadoPresupuestoObj?.nombre_obra || 'Obra',
        totalGeneral: certificadoCalculos.totalActualCalc || 0,
        proveedor_nombre: String(certRespProveedor?.nombre || ''),
        proveedor_cargo: String(certRespProveedor?.cargo || ''),
        cliente_nombre: String(certRespCliente?.nombre || ''),
        cliente_cargo: String(certRespCliente?.cargo || '')
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadCert)
      });
      const resultado = await res.json();

      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || resultado?.link || '';
      if (resultado?.success === false || (resultado?.error && !pdfUrlFinal)) {
        toast.error("Error al guardar el certificado: " + (resultado?.error || 'Desconocido'), { id: toastId });
        setIsSavingCert(false);
        return;
      }

      setFetchedCertificados(prev => [{ ...payloadCert, pdfUrl: pdfUrlFinal, id: `cert-${Date.now()}` }, ...prev]);
      toast.success("¡Certificado guardado con éxito en Sheets y PDF generado en Drive!", { id: toastId });
    } catch (err) {
      toast.error("Ocurrió un error al guardar el certificado.", { id: toastId });
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
        body: JSON.stringify({ tabla: 'Certificaciones', action: 'delete', id: certId })
      });
      setFetchedCertificados(prev => prev.filter(c => String(c?.id || c?.presupuesto_id + '_' + c?.certificado_nro) !== String(certId)));
      toast.success("Certificado eliminado exitosamente.", { id: toastId });
    } catch (err) {
      toast.error("Ocurrió un error al intentar eliminar el certificado.", { id: toastId });
    }
  };

  const certificadosDelPresupuestoActual = useMemo(() => {
    if (!certPresupuestoId) return [];
    return certificadosList.filter(c => String(c?.presupuesto_id || c?.presupuestoid) === String(certPresupuestoId));
  }, [certPresupuestoId, certificadosList]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-insumos-container, #printable-insumos-container *,
          #printable-certificado-container, #printable-certificado-container * {
            visibility: visible !important;
          }
          #printable-insumos-container, #printable-certificado-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
          }
          aside, nav, header, footer, .sidebar, [class*="sidebar"], [class*="nav"], .print\\:hidden {
            display: none !important;
          }
        }
      `}} />

      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm print:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">
          {esOperador ? "(Vista de Operador - Reportes Diarios)" : "(Certificaciones - Reportes - Listado de Insumos - Comparativas)"}
        </p>
      </div>

      {!esOperador && (
        <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap print:hidden">
          {['Certificaciones', 'Reportes Diarios', 'Listado de Insumos', 'Comparativo'].map((tab) => (
            <button
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {!esOperador && activeTab === 'Certificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" /> Gestión de Certificaciones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Seleccione el tipo de certificación a emitir o auditar en el sistema.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('avance_obra')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'avance_obra' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Building2 className="w-4 h-4 text-amber-600" /> Avance de Obra
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado Avance de Obra - Presupuesto</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('horas_hombre')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'horas_hombre' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Clock className="w-4 h-4 text-amber-600" /> Horas Hombre
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado de Horas Hombre - Contrato</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('compra_materiales')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'compra_materiales' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Package className="w-4 h-4 text-amber-600" /> Compra de Materiales
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado de Compra de Materiales - Contrato</p>
            </button>
          </div>

          {tipoCertificadoSubTab === 'avance_obra' && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Certificado Avance de Obra - Presupuesto</h4>
                    <p className="text-[11px] text-slate-500">Seleccione un presupuesto aprobado para generar o visualizar el certificado.</p>
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
                    <label className="text-xs font-bold text-slate-700">Fecha Emisión:</label>
                    <input
                      type="date"
                      value={certFecha}
                      onChange={(e) => setCertFecha(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={certPresupuestoId}
                    onChange={(e) => setCertPresupuestoId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Seleccionar Presupuesto Aprobado ({presupuestosDisponiblesCert.length} disp.) --</option>
                    {presupuestosDisponiblesCert.map(p => (
                      <option key={p?.id || p?.ID} value={p?.id || p?.ID}>
                        [{p?.codigo || p?.id}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}
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
                      <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase">
                        CERTIFICADO POR AVANCE DE OBRA
                      </h2>
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
                                  <input
                                    type="number"
                                    step="1"
                                    value={Math.round(adelantoMonto || montoAdelantoCalculado)}
                                    onChange={(e) => {
                                      const monto = parseFloat(e.target.value) || 0;
                                      setAdelantoMonto(monto);
                                      setAdelantoPct(totalPresupuestoBase > 0 ? Number(((monto / totalPresupuestoBase) * 100).toFixed(2)) : 0);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-right font-bold text-amber-900 outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col justify-center bg-slate-950 text-white p-4 rounded-xl shadow-md">
                              <span className="font-extrabold text-xs uppercase text-slate-400">TOTAL ADELANTO FINANCIERO A CERTIFICAR:</span>
                              <span className="font-black text-xl text-amber-400 mt-1">
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
                              <span className="font-black text-slate-900 text-sm">$ {totalCertificadoPeriodo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                              <span className="font-bold text-slate-700">Descuento por Adelanto Financiero ({adelantoPct}%):</span>
                              <span className="font-black text-rose-700">- $ {descuentoAdelantoCert.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                              <span className="font-bold text-slate-700">Adicionales Aprobados:</span>
                              <input
                                type="number"
                                value={adicionalesMonto}
                                onChange={(e) => setAdicionalesMonto(e.target.value)}
                                className="w-32 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-emerald-700 outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl shadow">
                              <span className="font-extrabold text-xs uppercase">TOTAL NETO A CERTIFICAR:</span>
                              <span className="font-black text-base text-amber-400">$ {netoACertificar.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
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
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 block">Monto Absoluto ($)</label>
                                  <input
                                    type="number"
                                    step="1"
                                    value={Math.round(redeterminacionMonto || montoRedetCalculado)}
                                    onChange={(e) => {
                                      const monto = parseFloat(e.target.value) || 0;
                                      setRedeterminacionMonto(monto);
                                      setRedeterminacionPct((monto / (netoACertificar || 1)) * 100);
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-950 text-white p-4 rounded-xl shadow-md mt-6">
                              <span className="font-extrabold text-xs uppercase">TOTAL GENERAL A CERTIFICAR:</span>
                              <span className="font-black text-lg text-amber-400">$ {totalFinalLiquidacion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-300">
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                      <p className="font-bold text-slate-800 uppercase">Responsable Proveedor</p>
                      <div>
                        <span className="text-slate-500 block">Nombre:</span>
                        <strong className="text-slate-900">{certRespProveedor.nombre}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cargo:</span>
                        <strong className="text-slate-900">{certRespProveedor.cargo}</strong>
                      </div>
                    </div>
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                      <p className="font-bold text-slate-800 uppercase">Responsable Cliente</p>
                      <div>
                        <span className="text-slate-500 block">Nombre:</span>
                        <strong className="text-slate-900">{certRespCliente.nombre}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Cargo:</span>
                        <strong className="text-slate-900">{certRespCliente.cargo}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {certificadoPresupuestoObj && (
                <form onSubmit={aprobarYGuardarCertificado} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50 p-4 space-y-4 print:hidden">
                  <h4 className="font-black text-xs text-slate-900 uppercase">Aprobación y Firma del Certificado</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                      <p className="font-bold text-slate-800 uppercase">Responsable Proveedor</p>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">Nombre y Apellido:</label>
                        <input 
                          type="text" 
                          required
                          value={certRespProveedor.nombre}
                          onChange={(e) => setCertRespProveedor({...certRespProveedor, nombre: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">Cargo:</label>
                        <input 
                          type="text" 
                          required
                          value={certRespProveedor.cargo}
                          onChange={(e) => setCertRespProveedor({...certRespProveedor, cargo: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                      <p className="font-bold text-slate-800 uppercase">Responsable Cliente</p>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">Nombre y Apellido:</label>
                        <input 
                          type="text" 
                          required
                          value={certRespCliente.nombre}
                          onChange={(e) => setCertRespCliente({...certRespCliente, nombre: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">Cargo:</label>
                        <input 
                          type="text" 
                          required
                          value={certRespCliente.cargo}
                          onChange={(e) => setCertRespCliente({...certRespCliente, cargo: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" /> Imprimir / PDF (Vista Exacta)
                    </button>
                    <button 
                      type="submit"
                      disabled={isSavingCert}
                      className={`px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2 ${isSavingCert ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSavingCert ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Procesando...</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4" /> Guardar Certificado en Sheets</>
                      )}
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
                          const fechaCert = cert?.fecha || cert?.fecha_emision || '---';
                          const clienteCert = typeof cert?.cliente === 'object' ? (cert?.cliente?.nombre || '---') : (cert?.cliente || '---');
                          const obraCert = cert?.obra || '---';
                          const totalGen = Number(cert?.totalGeneral || cert?.total_general || 0);
                          const pdfLink = cert?.pdfUrl || cert?.pdf_url;
                          const certKeyId = cert?.id || `${cert?.presupuesto_id}_${nroCert}`;

                          return (
                            <tr key={certKeyId} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-amber-800">
                                Certificado #{nroCert} {nroCert === '0' ? '(Adelanto)' : ''}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{fechaCert}</td>
                              <td className="px-4 py-3 text-slate-800 font-semibold">{clienteCert}</td>
                              <td className="px-4 py-3 text-slate-600">{obraCert}</td>
                              <td className="px-4 py-3 text-right font-black text-slate-950">
                                $ {totalGen.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                                {pdfLink ? (
                                  <a
                                    href={pdfLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Ver PDF
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">Guardado</span>
                                )}
                                <button
                                  onClick={() => eliminarCertificadoServidor(certKeyId)}
                                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar certificado"
                                >
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
            <CertificadoHorasHombreTab
              contratosList={contratosList}
              allReportesSice={allReportesSice}
            />
          )}

          {tipoCertificadoSubTab === 'compra_materiales' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Certificado de Compra de Materiales - Contrato</h4>
                  <p className="text-[11px] text-slate-500">Auditoría y certificación de insumos y facturas de compras imputadas a los contratos activos.</p>
                </div>
              </div>

              {facturas.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                  No hay facturas o compras de materiales registradas para certificar.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                      <th className="px-4 py-3">Nro. Factura / Comprobante</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3 text-right">Monto Total</th>
                      <th className="px-4 py-3 text-center">Estado Certificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturas.map((fac, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{fac?.n_factura || fac?.nro_factura || `Factura #${idx + 1}`}</td>
                        <td className="px-4 py-3 text-slate-600">{fac?.proveedor || 'Proveedor General'}</td>
                        <td className="px-4 py-3 text-slate-600">{fac?.fecha || '---'}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">$ {Number(fac?.total || fac?.subtotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                            Certificado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'Reportes Diarios' || esOperador) && (
        <ReportesDiariosTab
          contratosList={contratosList}
          allReportesSice={allReportesSice}
          setFetchedReportesSice={setFetchedReportesSice}
          listaEmpleadosActivos={listaEmpleadosActivos}
          esOperador={esOperador}
          buscarValorEnObjeto={buscarValorEnObjeto}
        />
      )}

      {!esOperador && activeTab === 'Listado de Insumos' && (
        <ListadoInsumosTab presupuestos={presupuestos} />
      )}

      {!esOperador && activeTab === 'Comparativo' && (
        <ComparativoTab
          presupuestos={presupuestos}
          facturas={facturas}
          allReportesSice={allReportesSice}
          obras={obras}
        />
      )}
    </div>
  );
}

export default function Reportes(props) {
  return (
    <ErrorBoundary>
      <ReportesContent {...props} />
    </ErrorBoundary>
  );
}