import React, { useState, useMemo, useCallback } from 'react';
import { Printer, ShieldCheck, FileText, CalendarRange } from 'lucide-react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function CertificadoHorasHombreTab({ 
  contratosList = [], 
  allReportesSice = [],
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  }
}) {
  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [certificadoNro, setCertificadoNro] = useState('00005');
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');
  
  const [valorHora, setValorHora] = useState(8500); // Valor de la hora modificable
  const [isSaving, setIsSaving] = useState(false);

  // Leer cargos y nombres directamente del contrato
  const extraerDatosContrato = useCallback((contrato) => {
    if (!contrato) return { pCargo: '', pNombre: '', pKey: 'AT1020', cCargo: '', cNombre: '', cKey: 'CM7030' };
    let objData = { ...contrato };
    ['descripcion', 'detalle', 'config', 'datos'].forEach(campo => {
      if (typeof contrato[campo] === 'string') {
        try {
          if (contrato[campo].includes('{')) {
            const parsed = JSON.parse('{' + contrato[campo].split(/[{]/).slice(1).join('{'));
            objData = { ...objData, ...parsed };
          }
        } catch (e) {}
      }
    });

    return {
      pCargo: buscarValorEnObjeto(objData, ['proveedor_cargo', 'proveedorCargo', 'cargo_proveedor']) || objData?.proveedor?.cargo || '',
      pNombre: buscarValorEnObjeto(objData, ['proveedor_nombre', 'proveedorNombre', 'nombre_proveedor']) || objData?.proveedor?.nombre || '',
      pKey: buscarValorEnObjeto(objData, ['proveedor_key', 'proveedorKey']) || 'AT1020',
      cCargo: buscarValorEnObjeto(objData, ['cliente_cargo', 'clienteCargo', 'cargo_cliente']) || objData?.cliente?.cargo || '',
      cNombre: buscarValorEnObjeto(objData, ['cliente_nombre', 'clienteNombre', 'nombre_cliente']) || objData?.cliente?.nombre || '',
      cKey: buscarValorEnObjeto(objData, ['cliente_key', 'clienteKey']) || 'CM7030'
    };
  }, [buscarValorEnObjeto]);

  const contratoActual = useMemo(() => {
    if (!contratoSeleccionadoId) return null;
    return contratosList.find(c => String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo'])).trim() === String(contratoSeleccionadoId).trim());
  }, [contratoSeleccionadoId, contratosList, buscarValorEnObjeto]);

  const responsables = useMemo(() => extraerDatosContrato(contratoActual), [contratoActual, extraerDatosContrato]);

  const [respFirmas, setRespFirmas] = useState({ proveedor: '', cliente: '' });

  // Filtrado de reportes por contrato y fechas (desde/hasta)
  const reportesFiltrados = useMemo(() => {
    if (!contratoSeleccionadoId) return [];
    
    return allReportesSice.filter(r => {
      const rContratoId = String(buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id'])).trim();
      const rFecha = buscarValorEnObjeto(r, ['fecha', 'Fecha']);
      
      if (rContratoId !== String(contratoSeleccionadoId).trim() && 
          !Object.values(r).map(v => String(v).trim()).includes(String(contratoSeleccionadoId).trim())) {
        return false;
      }
      
      if (periodoDesde && rFecha < periodoDesde) return false;
      if (periodoHasta && rFecha > periodoHasta) return false;

      return true;
    }).map(r => ({
      id: buscarValorEnObjeto(r, ['id', 'ID']) || `sice-${Math.random()}`,
      nro: buscarValorEnObjeto(r, ['nro', 'Nro', 'numero']) || '---',
      fecha: buscarValorEnObjeto(r, ['fecha', 'Fecha']) || '---',
      totalHorasSuma: Number(buscarValorEnObjeto(r, ['totalhorassuma', 'totalHorasSuma']) || 0),
      items: (typeof r.items === 'string' ? JSON.parse(r.items || '[]') : r.items) || []
    })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  }, [allReportesSice, contratoSeleccionadoId, periodoDesde, periodoHasta, buscarValorEnObjeto]);

  const totales = useMemo(() => {
    let hs = 0;
    reportesFiltrados.forEach(r => hs += r.totalHorasSuma);
    return { horas: hs, valorTotal: hs * valorHora };
  }, [reportesFiltrados, valorHora]);

  const firmarYCertificar = async (e) => {
    e.preventDefault();
    if (!contratoSeleccionadoId) return toast.error('Seleccione un Contrato.');
    if (respFirmas.proveedor.toUpperCase() !== responsables.pKey.toUpperCase()) return toast.error('Clave Proveedor inválida.');
    if (respFirmas.cliente.toUpperCase() !== responsables.cKey.toUpperCase()) return toast.error('Clave Cliente inválida.');
    
    setIsSaving(true);
    const toastId = toast.loading('Procesando Certificado en Drive...');
    
    try {
      const payload = {
        action: 'guardarYGenerarPDF',
        tabla: 'CertificadosSice',
        tipo: 'HorasHombre',
        contratoId: String(contratoSeleccionadoId),
        nroCertificado: String(certificadoNro),
        fechaEmision: String(fechaEmision),
        periodoDesde,
        periodoHasta,
        valorHoraBase: Number(valorHora),
        totales,
        reportesAsociados: reportesFiltrados,
        proveedor: { cargo: responsables.pCargo, nombre: responsables.pNombre },
        cliente: { cargo: responsables.cCargo, nombre: responsables.cNombre }
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const resultado = await res.json();

      if (resultado?.success === false) throw new Error(resultado?.error || 'Fallo al certificar');
      
      toast.success('¡Certificado emitido y guardado exitosamente!', { id: toastId });
      setCertificadoNro(String(Number(certificadoNro) + 1).padStart(5, '0'));
      setRespFirmas({ proveedor: '', cliente: '' });
      if (resultado.pdfUrl) window.open(resultado.pdfUrl, '_blank');

    } catch (err) {
      toast.error(err.message || 'Error de conexión al procesar.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> Certificación Mensual de Horas Hombre
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Consolide los partes diarios aprobados para la facturación mensual del contrato.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={contratoSeleccionadoId}
            onChange={(e) => setContratoSeleccionadoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer min-w-[250px]"
          >
            <option value="">-- Seleccionar Contrato ({contratosList.length} disp.) --</option>
            {contratosList.map((c, i) => {
              const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo']) || i);
              const cCod = buscarValorEnObjeto(c, ['codigo', 'Codigo']) || 'S/C';
              const cNom = buscarValorEnObjeto(c, ['nombre', 'cliente']) || 'Contrato';
              return <option key={cId} value={cId}>[{cCod}] {cNom}</option>;
            })}
          </select>
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" /> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-400 space-y-6 text-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-07.png" alt="SICE S.A." className="h-24 object-contain" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-wide text-right">CERTIFICADO MENSUAL DE HORAS HOMBRE</h2>
        </div>

        <div className="text-xs space-y-1 border-b border-slate-300 pb-4">
          <p className="font-extrabold text-blue-900 text-sm">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div><span className="text-slate-500 font-semibold">C.U.I.T. Nro.:</span> <span className="font-bold">30-71573431-8</span></div>
            <div><span className="text-slate-500 font-semibold">Cliente:</span> <span className="font-bold">LDC Argentina S.A.</span></div>
            <div>
              <span className="text-slate-500 font-semibold">Fecha:</span>{' '}
              <input 
                type="date" 
                value={fechaEmision} 
                onChange={(e) => setFechaEmision(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 font-bold text-xs outline-none focus:border-amber-500"
              />
            </div>
            <div><span className="text-slate-500 font-semibold">Número de Proveedor Nro.:</span> <span className="font-bold">1490175</span></div>
            <div><span className="text-slate-500 font-semibold">Contrato Nro.:</span> <span className="font-bold">5000002190</span></div>
            <div>
              <span className="text-slate-500 font-semibold">Certificado Nro.:</span>
              <span className="font-black text-amber-600 font-mono text-sm">{certificadoNro}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-300 print:bg-white print:border-b">
          <CalendarRange className="w-5 h-5 text-slate-500 print:hidden" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-800">PERÍODO: Desde</span>
            <input 
              type="date" 
              value={periodoDesde} 
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-amber-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-800">Hasta</span>
            <input 
              type="date" 
              value={periodoHasta} 
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold focus:border-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-400 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center">Item</th>
                <th className="py-2.5 px-3 border-r border-slate-700 text-center">Fecha</th>
                <th className="py-2.5 px-3 border-r border-slate-700 text-center">Nro Parte</th>
                <th className="py-2.5 px-3 border-r border-slate-700 text-center text-amber-300">Total Horas</th>
                <th className="py-2.5 px-3 border-r border-slate-700 text-right">Valor Hora</th>
                <th className="py-2.5 px-4 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {reportesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 italic font-semibold">
                    No hay partes diarios aprobados para este contrato en el período seleccionado.
                  </td>
                </tr>
              ) : (
                reportesFiltrados.map((rep, idx) => (
                  <tr key={rep.id} className="bg-white hover:bg-slate-50">
                    <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-300">{idx + 1}</td>
                    <td className="py-2 px-3 text-center font-semibold border-r border-slate-300">{rep.fecha}</td>
                    <td className="py-2 px-3 text-center font-mono border-r border-slate-300 text-slate-600">{rep.nro}</td>
                    <td className="py-2 px-3 text-center font-black text-amber-800 border-r border-slate-300 bg-amber-50">{rep.totalHorasSuma.toFixed(2)} hs</td>
                    <td className="py-2 px-3 text-right font-medium text-slate-600 border-r border-slate-300">
                      $ <input 
                          type="number"
                          value={valorHora}
                          onChange={(e) => setValorHora(Number(e.target.value))}
                          className="w-20 text-right bg-transparent outline-none font-bold text-slate-800 hover:bg-amber-100 rounded px-1"
                        />
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-slate-900">$ {(rep.totalHorasSuma * valorHora).toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
            {reportesFiltrados.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200 border-t-2 border-slate-800">
                  <td colSpan="3" className="py-3 px-4 text-right font-black uppercase text-slate-900">TOTAL CERTIFICADO</td>
                  <td className="py-3 px-3 text-center font-black text-amber-900 bg-amber-200">{totales.horas.toFixed(2)} hs</td>
                  <td className="py-3 px-3 border-r border-slate-300"></td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 text-sm bg-slate-300">$ {totales.valorTotal.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <form onSubmit={firmarYCertificar} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            <div className="p-4 space-y-3">
              <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE PROVEEDOR</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">CARGO (TRAER DESDE SHEETS):</label>
                  <input type="text" readOnly value={responsables.pCargo} className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-600 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO (IDEM):</label>
                  <input type="text" readOnly value={responsables.pNombre} className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-600 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: AB1234):</label>
                  <input 
                    type="password" required maxLength={6} placeholder="Ej: AB1234" 
                    value={respFirmas.proveedor} onChange={(e) => setRespFirmas({...respFirmas, proveedor: e.target.value.toUpperCase()})} 
                    className="w-full bg-white border border-slate-400 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500" 
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE CLIENTE</h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">CARGO (IDEM):</label>
                  <input type="text" readOnly value={responsables.cCargo} className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-600 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO (IDEM):</label>
                  <input type="text" readOnly value={responsables.cNombre} className="w-full bg-slate-100 border border-slate-300 rounded px-3 py-1.5 font-bold text-slate-600 cursor-not-allowed outline-none" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: CD5678):</label>
                  <input 
                    type="password" required maxLength={6} placeholder="Ej: CD5678" 
                    value={respFirmas.cliente} onChange={(e) => setRespFirmas({...respFirmas, cliente: e.target.value.toUpperCase()})} 
                    className="w-full bg-white border border-slate-400 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-100 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
            <p className="text-xs text-slate-500">Ingrese sus claves para firmar y validar el certificado de horas hombre.</p>
            <button 
              type="submit" 
              disabled={isSaving || reportesFiltrados.length === 0} 
              className={`px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2 ${isSaving || reportesFiltrados.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Procesando...</> : <><ShieldCheck className="w-4 h-4" /> Aprobar, Firmar y Guardar Certificado</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}