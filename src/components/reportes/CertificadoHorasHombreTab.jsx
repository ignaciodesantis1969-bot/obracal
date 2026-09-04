import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Plus, Trash2, ShieldCheck, Loader2 } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { useObraData } from '@/hooks/useObraData';
import { OBRAS_CONFIG } from '@/config/obrasConfig';

export default function CertificadoHorasHombreTab({ 
  contratosList: propContratos = [], 
  allReportesSice: propReportes = [] 
}) {
  const { data: contratosSheet, isLoading: loadingContratos } = useObraData(OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento');
  const { data: reportesSheet, isLoading: loadingReportes } = useObraData(OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice');

  // Estados locales para respaldo manual directo por fetch
  const [contratosRemotos, setContratosRemotos] = useState([]);
  const [reportesRemotos, setReportesRemotos] = useState([]);

  // Forzar una petición directa de respaldo a la API si el hook no trae datos
  useEffect(() => {
    let activo = true;
    async function fetchDirecto() {
      try {
        if (!GOOGLE_SCRIPT_URL) return;
        
        // Petición para contratos
        const resC = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'read', tabla: OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento' })
        });
        const jsonC = await resC.json();
        
        // Petición para reportes SICE
        const resR = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'read', tabla: OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice' })
        });
        const jsonR = await resR.json();

        if (activo) {
          console.log("🔍 [DEBUG] Respuesta Directa Contratos:", jsonC);
          console.log("🔍 [DEBUG] Respuesta Directa Reportes:", jsonR);

          const extraerArray = (res) => {
            if (Array.isArray(res)) return res;
            if (res && typeof res === 'object') {
              if (Array.isArray(res.data)) return res.data;
              if (Array.isArray(res.items)) return res.items;
              if (Array.isArray(res.result)) return res.result;
              const found = Object.values(res).find(v => Array.isArray(v));
              if (found) return found;
            }
            return [];
          };

          const cArreglo = extraerArray(jsonC);
          const rArreglo = extraerArray(jsonR);

          if (cArreglo.length > 0) setContratosRemotos(cArreglo);
          if (rArreglo.length > 0) setReportesRemotos(rArreglo);
        }
      } catch (err) {
        console.error("Error en fetch directo de respaldo:", err);
      }
    }
    fetchDirecto();
    return () => { activo = false; };
  }, []);

  // Extractor universal inteligente
  const unificarDatos = (propiedad, hookData, remotoData) => {
    const extraer = (fuente) => {
      if (Array.isArray(fuente)) return fuente;
      if (fuente && typeof fuente === 'object') {
        if (Array.isArray(fuente.data)) return fuente.data;
        if (Array.isArray(fuente.items)) return fuente.items;
        if (Array.isArray(fuente.result)) return fuente.result;
        const found = Object.values(fuente).find(v => Array.isArray(v));
        if (found) return found;
      }
      return [];
    };

    const p = extraer(propiedad);
    if (p.length > 0) return p;

    const h = extraer(hookData);
    if (h.length > 0) return h;

    return remotoData;
  };

  const contratosList = useMemo(() => {
    return unificarDatos(propContratos, contratosSheet, contratosRemotos);
  }, [propContratos, contratosSheet, contratosRemotos]);

  const allReportesSice = useMemo(() => {
    return unificarDatos(propReportes, reportesSheet, reportesRemotos);
  }, [propReportes, reportesSheet, reportesRemotos]);

  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState('');
  const [certificadoNro, setCertificadoNro] = useState('00005');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');

  const [partesSeleccionados, setPartesSeleccionados] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [respProveedor, setRespProveedor] = useState({ cargo: 'JEFE DE OBRA', nombre: 'Alexander Torres Lopez', firma: '' });
  const [respCliente, setRespCliente] = useState({ cargo: '', nombre: '', firma: '' });

  const contratosDisponibles = useMemo(() => {
    return Array.isArray(contratosList) ? contratosList : [];
  }, [contratosList]);

  const contratoActual = useMemo(() => {
    if (!contratoIdSeleccionado) return null;
    return contratosDisponibles.find(c => {
      const cId = String(c?.id || c?.ID || c?.codigo || c?.contrato_id || c?.nro_contrato || c?._id || '').trim();
      return cId === String(contratoIdSeleccionado).trim();
    });
  }, [contratosDisponibles, contratoIdSeleccionado]);

  useEffect(() => {
    if (contratoActual) {
      const clienteNombre = contratoActual.cliente_nombre || contratoActual.cliente || contratoActual.razon_social || contratoActual.razonSocial || '';
      const clienteCargo = contratoActual.cliente_cargo || contratoActual.cargo_cliente || 'RESPONSABLE TÉCNICO';
      
      const provNombre = contratoActual.responsable_proveedor || contratoActual.proveedor_nombre || 'Alexander Torres Lopez';
      const provCargo = contratoActual.responsable_proveedor_cargo || contratoActual.proveedor_cargo || 'JEFE DE OBRA';

      setRespCliente(prev => ({
        ...prev,
        nombre: clienteNombre || prev.nombre,
        cargo: clienteCargo || prev.cargo
      }));

      setRespProveedor(prev => ({
        ...prev,
        cargo: provCargo || prev.cargo,
        nombre: provNombre || prev.nombre
      }));
    }
  }, [contratoActual]);

  const agregarParteFila = (parteObj) => {
    const clasificacionOperario = parteObj?.clasificacion || parteObj?.categoria || 'General';
    let valorHora = 0;
    
    if (contratoActual?.tarifas && typeof contratoActual.tarifas === 'object') {
      valorHora = Number(contratoActual.tarifas[clasificacionOperario] || contratoActual.tarifas['General'] || 0);
    } else {
      valorHora = Number(contratoActual?.valor_hora || contratoActual?.precioHora || contratoActual?.tarifa || 15000);
    }

    const totalHoras = Number(parteObj?.totalHorasSuma || parteObj?.total_horas_suma || parteObj?.horas || 8);
    const nuevoItem = {
      id: `parte-item-${Date.now()}-${Math.random()}`,
      nroParte: parteObj?.nro || parteObj?.id || '001',
      fecha: parteObj?.fecha || fechaEmision,
      totalHoras,
      valorHora,
      valorTotal: totalHoras * valorHora,
      clasificacion: clasificacionOperario
    };
    setPartesSeleccionados(prev => [...prev, nuevoItem]);
  };

  const eliminarFila = (id) => {
    setPartesSeleccionados(prev => prev.filter(item => item.id !== id));
  };

  const actualizarFila = (id, campo, valor) => {
    setPartesSeleccionados(prev => prev.map(item => {
      if (item.id === id) {
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'totalHoras' || campo === 'valorHora') {
          const h = campo === 'totalHoras' ? Number(valor) || 0 : item.totalHoras;
          const v = campo === 'valorHora' ? Number(valor) || 0 : item.valorHora;
          actualizado.valorTotal = h * v;
        }
        return actualizado;
      }
      return item;
    }));
  };

  const totalGeneralMonto = useMemo(() => {
    return partesSeleccionados.reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);
  }, [partesSeleccionados]);

  const guardarCertificadoHoras = async (e) => {
    e.preventDefault();
    if (!contratoActual) return alert("Seleccione un contrato válido.");
    if (partesSeleccionados.length === 0) return alert("Agregue al menos un parte diario al certificado.");

    setIsSaving(true);
    try {
      const payload = {
        tabla: 'CertificacionesHoras',
        action: 'guardar',
        contrato_id: String(contratoIdSeleccionado),
        certificado_nro: certificadoNro,
        fecha_emision: fechaEmision,
        periodo_desde: periodoDesde,
        periodo_hasta: periodoHasta,
        cliente: contratoActual?.cliente || contratoActual?.razon_social || 'Cliente',
        filas: partesSeleccionados,
        total_general: totalGeneralMonto,
        responsable_proveedor: respProveedor,
        responsable_cliente: respCliente
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      await res.json();
      alert("¡Certificado mensual de horas hombre guardado con éxito!");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el certificado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-6 text-slate-900 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
        <div>
          <img src="/logo-07.png" alt="SICE S.A." className="h-16 object-contain mb-2" />
          <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-slate-900 tracking-wide uppercase">CERTIFICADO MENSUAL DE HORAS HOMBRE</h2>
          <div className="mt-2 flex items-center justify-end gap-2">
            <label className="text-xs font-bold text-slate-600">Certificado Nro.:</label>
            <input
              type="text"
              value={certificadoNro}
              onChange={(e) => setCertificadoNro(e.target.value)}
              className="w-24 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-amber-600 text-right outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs border-b border-slate-300 pb-4 bg-slate-50 p-4 rounded-xl">
        <div className="sm:col-span-2 space-y-1">
          <span className="text-slate-500 font-semibold block">
            Seleccionar Contrato ({contratosDisponibles.length} disponibles):
            {loadingContratos && <span className="ml-2 text-amber-600 font-bold">Cargando...</span>}
          </span>
          <select
            value={contratoIdSeleccionado}
            onChange={(e) => setContratoIdSeleccionado(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Seleccionar Contrato / Mantenimiento --</option>
            {contratosDisponibles.map((c, idx) => {
              const cId = String(c?.id || c?.ID || c?.codigo || c?.contrato_id || c?.nro_contrato || c?._id || idx);
              const cNombre = c?.nombre || c?.cliente || c?.razon_social || c?.descripcion || `Contrato #${idx + 1}`;
              const cCodigo = c?.codigo || c?.nro_contrato || c?.id || '';
              return (
                <option key={cId} value={cId}>
                  {cCodigo ? `[${cCodigo}] ` : ''}{cNombre}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block">C.U.I.T. Nro.:</span>
          <strong className="text-slate-900 block mt-1">30-71573431-8</strong>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block">Número de Proveedor Nro.:</span>
          <strong className="text-slate-900 block mt-1">1490175</strong>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block">Cliente:</span>
          <strong className="text-slate-900 block mt-1">
            {contratoActual?.cliente || contratoActual?.razon_social || contratoActual?.razonSocial || '---'}
          </strong>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block">Contrato Nro.:</span>
          <strong className="text-slate-900 block mt-1 font-mono">
            {contratoActual?.codigo || contratoActual?.nro_contrato || contratoActual?.id || '---'}
          </strong>
        </div>

        <div>
          <span className="text-slate-500 font-semibold block">Fecha Emisión:</span>
          <input
            type="date"
            value={fechaEmision}
            onChange={(e) => setFechaEmision(e.target.value)}
            className="mt-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
          />
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl flex flex-wrap items-center gap-4">
        <span className="font-black text-xs text-slate-800 uppercase flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" /> PERÍODO:
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">DESDE</label>
          <input
            type="date"
            value={periodoDesde}
            onChange={(e) => setPeriodoDesde(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600">HASTA</label>
          <input
            type="date"
            value={periodoHasta}
            onChange={(e) => setPeriodoHasta(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none"
          />
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-300">
        <span className="text-xs font-bold text-slate-700">
          Partes Diarios Disponibles ({allReportesSice.length} disp.):
          {loadingReportes && <span className="ml-2 text-amber-600 font-bold">Cargando...</span>}
        </span>
        <select
          onChange={(e) => {
            const parteId = e.target.value;
            if (!parteId) return;
            const parteEncontrado = allReportesSice.find(p => String(p?.id || p?.nro) === String(parteId));
            if (parteEncontrado) {
              agregarParteFila(parteEncontrado);
            }
            e.target.value = '';
          }}
          className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
        >
          <option value="">+ Seleccionar parte diario aprobado...</option>
          {allReportesSice.map((p, idx) => (
            <option key={idx} value={p?.id || p?.nro}>
              Parte #{p?.nro || idx + 1} ({p?.fecha}) - {p?.totalHorasSuma || p?.total_horas_suma || 0} hs
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border border-slate-400 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
              <th className="py-3 px-3 text-center w-12 border-r border-slate-700">ÍTEM</th>
              <th className="py-3 px-3 border-r border-slate-700">FECHA</th>
              <th className="py-3 px-3 border-r border-slate-700">NRO PARTE</th>
              <th className="py-3 px-3 text-center border-r border-slate-700">TOTAL HORAS</th>
              <th className="py-3 px-3 text-right border-r border-slate-700">VALOR HORA ($)</th>
              <th className="py-3 px-3 text-right border-r border-slate-700">VALOR TOTAL ($)</th>
              <th className="py-3 px-3 text-center w-16">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 bg-white">
            {partesSeleccionados.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400 italic">
                  No hay partes diarios incorporados en este certificado. Seleccione uno arriba para comenzar.
                </td>
              </tr>
            ) : (
              partesSeleccionados.map((item, index) => (
                <tr key={item.id} className="hover:bg-amber-50/40">
                  <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r border-slate-300">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-medium">
                    {item.fecha}
                  </td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold">
                    Parte #{item.nroParte}
                  </td>
                  <td className="py-2.5 px-3 text-center border-r border-slate-300">
                    <input
                      type="number"
                      value={item.totalHoras}
                      onChange={(e) => actualizarFila(item.id, 'totalHoras', e.target.value)}
                      className="w-16 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-center font-bold text-xs"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right border-r border-slate-300">
                    <input
                      type="number"
                      value={item.valorHora}
                      onChange={(e) => actualizarFila(item.id, 'valorHora', e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-right font-bold text-xs font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-right border-r border-slate-300 font-black text-slate-900 font-mono">
                    $ {Number(item.valorTotal).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => eliminarFila(item.id)}
                      className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {partesSeleccionados.length > 0 && (
            <tfoot>
              <tr className="bg-slate-900 text-white font-black">
                <td colSpan="5" className="py-3 px-4 text-right uppercase text-xs">TOTAL GENERAL A CERTIFICAR:</td>
                <td className="py-3 px-4 text-right text-amber-400 font-mono text-sm" colSpan="2">
                  $ {totalGeneralMonto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
          <div className="bg-slate-200 border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-xs uppercase tracking-wider">
            RESPONSABLE PROVEEDOR
          </div>
          <div className="p-4 space-y-3 text-xs font-bold">
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">CARGO:</span>
              <input 
                type="text" 
                value={respProveedor.cargo} 
                onChange={(e) => setRespProveedor({...respProveedor, cargo: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800" 
              />
            </div>
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
              <input 
                type="text" 
                value={respProveedor.nombre} 
                onChange={(e) => setRespProveedor({...respProveedor, nombre: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-950 font-black" 
              />
            </div>
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">FIRMA (Clave de 6 caracteres, Ej: AB1234):</span>
              <input 
                type="text" 
                maxLength={6}
                value={respProveedor.firma} 
                onChange={(e) => setRespProveedor({...respProveedor, firma: e.target.value})} 
                placeholder="EJ: AB1234"
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono uppercase text-emerald-700 font-bold" 
              />
            </div>
          </div>
        </div>

        <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
          <div className="bg-slate-200 border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-xs uppercase tracking-wider">
            RESPONSABLE CLIENTE
          </div>
          <div className="p-4 space-y-3 text-xs font-bold">
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">CARGO:</span>
              <input 
                type="text" 
                value={respCliente.cargo} 
                onChange={(e) => setRespCliente({...respCliente, cargo: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800" 
                placeholder="Ingrese cargo..."
              />
            </div>
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
              <input 
                type="text" 
                value={respCliente.nombre} 
                onChange={(e) => setRespCliente({...respCliente, nombre: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-950 font-black" 
                placeholder="Ingrese nombre..."
              />
            </div>
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">FIRMA (Clave de 6 caracteres, Ej: CD5678):</span>
              <input 
                type="text" 
                maxLength={6}
                value={respCliente.firma} 
                onChange={(e) => setRespCliente({...respCliente, firma: e.target.value})} 
                placeholder="EJ: CD5678"
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono uppercase text-emerald-700 font-bold" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-300 gap-4">
        <span className="text-xs text-slate-500 font-medium">
          Ingrese sus claves para firmar y validar el certificado de horas hombre.
        </span>
        <button
          type="button"
          onClick={guardarCertificadoHoras}
          disabled={isSaving}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <ShieldCheck className="w-4 h-4" />}
          {isSaving ? 'Guardando Certificado...' : 'Aprobar, Firmar y Guardar Certificado'}
        </button>
      </div>
    </div>
  );
}