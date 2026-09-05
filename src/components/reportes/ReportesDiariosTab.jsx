import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Printer, Plus, Trash2, ShieldCheck, ExternalLink, Eye, X, Users, Calendar, Calculator } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '../../api';
import { useObraData } from '../../hooks/useObraData';
import { OBRAS_CONFIG } from '../../config/constants';

export default function ReportesDiariosTab({
  contratosList: propContratos = [],
  allReportesSice: propReportes = [],
  setFetchedReportesSice = () => {},
  listaEmpleadosActivos: propEmpleados = [],
  personal: propPersonal = [],
  esOperador = false,
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  }
}) {
  const { data: contratosSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento');
  const { data: reportesSheet, refetch: refetchReportes } = useObraData(OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice');
  const { data: personalSheet } = useObraData('Personal');

  // Estado local para fetch independiente blindado
  const [fetchedReportesLocal, setFetchedReportesLocal] = useState([]);

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFetchedReportesLocal(data);
      })
      .catch(err => console.error("Error al cargar ReportesDiariosSice directo:", err));
  }, []);

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

  const contratosList = useMemo(() => {
    const p = extraerArrayDatos(propContratos);
    if (p.length > 0) return p;
    return extraerArrayDatos(contratosSheet);
  }, [propContratos, contratosSheet]);

  // Consolidación de fuentes (Props + Hook + Fetch Independiente + Caché Local)
  const allReportesSice = useMemo(() => {
    const p = extraerArrayDatos(propReportes);
    const s = extraerArrayDatos(reportesSheet);
    const l = extraerArrayDatos(fetchedReportesLocal);
    
    let localCache = [];
    try {
      const cached = localStorage.getItem('sice_partes_local_cache_v2');
      if (cached) localCache = JSON.parse(cached);
    } catch (e) {}

    const combinados = [...p, ...s, ...l, ...localCache];
    const unicosMap = new Map();
    
    combinados.forEach(item => {
      if (!item) return;
      const key = String(item.id || item.ID || item.nro || item.Nro || Math.random());
      if (!unicosMap.has(key)) unicosMap.set(key, item);
    });

    return Array.from(unicosMap.values());
  }, [propReportes, reportesSheet, fetchedReportesLocal]);

  const listaEmpleadosActivos = useMemo(() => {
    const p = extraerArrayDatos(propEmpleados);
    if (p.length > 0) return p;
    const s = extraerArrayDatos(personalSheet);
    if (s.length > 0) return s;
    return extraerArrayDatos(propPersonal);
  }, [propEmpleados, personalSheet, propPersonal]);

  const personal = propPersonal;

  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));
  
  const siceParteNro = useMemo(() => {
    if (!allReportesSice || allReportesSice.length === 0) return '00001';
    const numeros = allReportesSice.map(item => {
      const nroStr = String(buscarValorEnObjeto(item, ['nro', 'Nro', 'numero', 'Numero']) || '0');
      return parseInt(nroStr.replace(/\D/g, ''), 10) || 0;
    });
    const maxNro = Math.max(...numeros, 0);
    return String(maxNro + 1).padStart(5, '0');
  }, [allReportesSice, buscarValorEnObjeto]);

  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
  ]);
  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);
  const [siceRespProveedor, setSiceRespProveedor] = useState({ cargo: '', nombre: '', clave: '' });
  const [siceRespCliente, setSiceRespCliente] = useState({ cargo: '', nombre: '', clave: '' });
  const [isSavingSice, setIsSavingSice] = useState(false);
  const [parteVisualizando, setParteVisualizando] = useState(null);

  const empleadosActivosFiltrados = useMemo(() => {
    const fuenteDatos = listaEmpleadosActivos.length > 0 ? listaEmpleadosActivos : personal;
    const arrayFuente = extraerArrayDatos(fuenteDatos);
    if (arrayFuente.length === 0) return [];
    
    return arrayFuente.filter(emp => {
      const estadoEmp = String(emp?.estado || emp?.Estado || buscarValorEnObjeto(emp, ['estado', 'Estado']) || '').toLowerCase().trim();
      return estadoEmp === 'activo' || estadoEmp === '' || estadoEmp === 'alta';
    });
  }, [listaEmpleadosActivos, personal, buscarValorEnObjeto]);

  const calcularTotalHorasSice = useCallback((inicio, fin) => {
    if (!inicio || !fin) return '0.00';
    const [hIni] = String(inicio).split(':').map(Number);
    const [hFin] = String(fin).split(':').map(Number);
    let diffMinutos = ((hFin || 0) * 60) - ((hIni || 0) * 60);
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return '0.00';
    const horasConProporcional = horasEfectivas * (11 / 9);
    return horasConProporcional.toFixed(2);
  }, []);

  const totalHorasDefaultCalculado = useMemo(() => {
    const suma = siceItems.reduce((acc, it) => acc + parseFloat(calcularTotalHorasSice(it?.horaComienzo, it?.horaFin) || 0), 0);
    return suma.toFixed(2);
  }, [siceItems, calcularTotalHorasSice]);

  const granTotalHorasHombre = useMemo(() => {
    let sumaIndividual = 0;
    if (operariosSeleccionados.length > 0) {
      operariosSeleccionados.forEach(op => {
        const hVal = op?.horas !== '' && !isNaN(op?.horas) ? parseFloat(op.horas) : parseFloat(totalHorasDefaultCalculado);
        sumaIndividual += hVal;
      });
    } else {
      sumaIndividual = parseFloat(totalHorasDefaultCalculado);
    }
    return sumaIndividual.toFixed(2);
  }, [totalHorasDefaultCalculado, operariosSeleccionados]);

  useEffect(() => {
    if (empleadosActivosFiltrados.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = empleadosActivosFiltrados.slice(0, 1).map(emp => {
        const nombreEmp = String(buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido', 'razon_social']) || 'Operario').trim();
        return {
          id: buscarValorEnObjeto(emp, ['id', 'ID']) || `op-${Math.random()}`,
          nombre: nombreEmp,
          abreviacion: OBRAS_CONFIG?.determinarCategoriaEmpleado ? OBRAS_CONFIG.determinarCategoriaEmpleado(nombreEmp) : 'OE',
          horas: ''
        };
      });
      setOperariosSeleccionados(iniciales);
    }
  }, [empleadosActivosFiltrados, operariosSeleccionados.length, buscarValorEnObjeto]);

  const extraerDatosContrato = useCallback((contrato) => {
    if (!contrato) return { pCargo: '', pNombre: '', pKey: 'AT1020', cCargo: '', cNombre: '', cKey: 'CM7030' };
    let objData = { ...contrato };
    ['descripcion', 'detalle', 'config', 'datos'].forEach(campo => {
      if (typeof contrato[campo] === 'string') {
        const val = contrato[campo];
        try {
          if (val.includes('{')) {
            const parts = val.split(/[{]/);
            if (parts.length > 1) {
              const jsonStr = '{' + parts.slice(1).join('{');
              const parsed = JSON.parse(jsonStr);
              objData = { ...objData, ...parsed };
            }
          }
        } catch (e) {}
      }
    });
    let pCargo = buscarValorEnObjeto(objData, ['proveedor_cargo', 'proveedorCargo', 'cargoProveedor', 'cargo_proveedor']) || objData?.proveedor?.cargo || '';
    let pNombre = buscarValorEnObjeto(objData, ['proveedor_nombre', 'proveedorNombre', 'nombreProveedor', 'nombre_proveedor']) || objData?.proveedor?.nombre || '';
    let pKey = buscarValorEnObjeto(objData, ['proveedor_key', 'proveedorKey', 'claveProveedor']) || objData?.proveedor?.key || 'AT1020';
    let cCargo = buscarValorEnObjeto(objData, ['cliente_cargo', 'clienteCargo', 'cargoCliente', 'cargo_cliente']) || objData?.cliente?.cargo || '';
    let cNombre = buscarValorEnObjeto(objData, ['cliente_nombre', 'clienteNombre', 'nombreCliente', 'nombre_cliente']) || objData?.cliente?.nombre || '';
    let cKey = buscarValorEnObjeto(objData, ['cliente_key', 'clienteKey', 'claveCliente']) || objData?.cliente?.key || 'CM7030';
    return { pCargo, pNombre, pKey, cCargo, cNombre, cKey };
  }, [buscarValorEnObjeto]);

  const clavesContratoActual = useMemo(() => {
    const contratoActivo = contratosList.find(c => {
      const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id'])).trim();
      return cId === String(contratoSeleccionadoId).trim();
    });
    if (contratoActivo) {
      const extracted = extraerDatosContrato(contratoActivo);
      return { proveedorKey: extracted.pKey, clienteKey: extracted.cKey };
    }
    return { proveedorKey: 'AT1020', clienteKey: 'CM7030' };
  }, [contratosList, contratoSeleccionadoId, buscarValorEnObjeto, extraerDatosContrato]);

  useEffect(() => {
    if (contratoSeleccionadoId) {
      const contrato = contratosList.find(c => {
        const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id'])).trim();
        return cId === String(contratoSeleccionadoId).trim();
      });
      if (contrato) {
        const { pCargo, pNombre, cCargo, cNombre } = extraerDatosContrato(contrato);
        setSiceRespProveedor(prev => ({ cargo: pCargo, nombre: pNombre, clave: prev?.clave || '' }));
        setSiceRespCliente(prev => ({ cargo: cCargo, nombre: cNombre, clave: prev?.clave || '' }));
      }
    }
  }, [contratoSeleccionadoId, contratosList, buscarValorEnObjeto, extraerDatosContrato]);

  // Filtrado super blindado: Busca coincidencia exacta o "includes"
  const sicePartesAprobados = useMemo(() => {
    let lista = allReportesSice;
    if (contratoSeleccionadoId) {
      const selectedIdStr = String(contratoSeleccionadoId).trim();
      lista = allReportesSice.filter(r => {
        if (!r) return false;
        const rContratoId = String(buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id', 'ContratoId'])).trim();
        return !rContratoId || rContratoId === selectedIdStr || rContratoId.includes(selectedIdStr) || selectedIdStr.includes(rContratoId);
      });
    }

    return lista.map(r => {
      let itemsParsed = buscarValorEnObjeto(r, ['items', 'Item', 'Items']);
      if (typeof itemsParsed === 'string' && itemsParsed.trim()) {
        try { itemsParsed = JSON.parse(itemsParsed); } catch { itemsParsed = []; }
      }
      let operariosParsed = buscarValorEnObjeto(r, ['operarios', 'operariosPresentes', 'Operarios']);
      if (typeof operariosParsed === 'string' && operariosParsed.trim()) {
        try { operariosParsed = JSON.parse(operariosParsed); } catch { operariosParsed = []; }
      }
      let provParsed = buscarValorEnObjeto(r, ['proveedor', 'Proveedor']);
      if (typeof provParsed === 'string' && provParsed.trim()) {
        try { provParsed = JSON.parse(provParsed); } catch { provParsed = { nombre: String(provParsed), cargo: '' }; }
      }
      let cliParsed = buscarValorEnObjeto(r, ['cliente', 'Cliente']);
      if (typeof cliParsed === 'string' && cliParsed.trim()) {
        try { cliParsed = JSON.parse(cliParsed); } catch { cliParsed = { nombre: String(cliParsed), cargo: '' }; }
      }

      const rawSuma = parseFloat(buscarValorEnObjeto(r, ['totalhorassuma', 'totalHorasSuma', 'TotalHorasSuma']) || 0);

      return {
        id: buscarValorEnObjeto(r, ['id', 'ID', 'nro', 'Nro']) || `sice-${Math.random()}`,
        nro: buscarValorEnObjeto(r, ['nro', 'Nro', 'numero', 'Numero']) || '00001',
        fecha: buscarValorEnObjeto(r, ['fecha', 'Fecha']) || '',
        contratoid: buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id']) || '',
        items: Array.isArray(itemsParsed) ? itemsParsed : [],
        operarios: Array.isArray(operariosParsed) ? operariosParsed.map(op => ({
          ...op,
          horas: op?.horas !== undefined && op?.horas !== '' ? Number(op.horas).toFixed(2) : '0.00'
        })) : [],
        proveedor: provParsed || { nombre: '', cargo: '' },
        cliente: cliParsed || { nombre: '', cargo: '' },
        totalHorasSuma: rawSuma.toFixed(2),
        pdfUrl: buscarValorEnObjeto(r, ['pdf_url', 'pdfUrl', 'urlPdf', 'pdfURL']) || ''
      };
    });
  }, [contratoSeleccionadoId, allReportesSice, buscarValorEnObjeto]);

  const agregarOperarioFila = () => {
    setOperariosSeleccionados([
      ...operariosSeleccionados,
      { id: `op-${Math.random()}`, nombre: '', abreviacion: 'OE', horas: '' }
    ]);
  };

  const actualizarOperarioFila = (index, campo, valor) => {
    const actualizados = [...operariosSeleccionados];
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      if (campo === 'nombre') {
        actualizados[index]['abreviacion'] = OBRAS_CONFIG?.determinarCategoriaEmpleado 
          ? OBRAS_CONFIG.determinarCategoriaEmpleado(valor) 
          : 'OE';
      }
      setOperariosSeleccionados(actualizados);
    }
  };

  const eliminarOperarioFila = (index) => {
    setOperariosSeleccionados(operariosSeleccionados.filter((_, i) => i !== index));
  };

  const eliminarParteServidor = async (idParte) => {
    if (esOperador) return;
    if (!window.confirm("¿Está seguro de eliminar este parte diario?")) return;
    const toastId = toast.loading('Eliminando parte diario...');
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice', action: 'delete', id: idParte })
      });

      try {
        const cached = localStorage.getItem('sice_partes_local_cache_v2');
        if (cached) {
          const parsedCache = JSON.parse(cached).filter(p => String(p.id || p.nro) !== String(idParte));
          localStorage.setItem('sice_partes_local_cache_v2', JSON.stringify(parsedCache));
        }
      } catch (e) {}

      setFetchedReportesLocal(prev => prev.filter(p => String(buscarValorEnObjeto(p, ['id', 'ID', 'nro'])) !== String(idParte)));
      setFetchedReportesSice(prev => prev.filter(p => String(buscarValorEnObjeto(p, ['id', 'ID', 'nro'])) !== String(idParte)));
      if (typeof refetchReportes === 'function') refetchReportes();
      toast.success('Parte diario eliminado exitosamente', { id: toastId });
    } catch (err) {
      toast.error('Ocurrió un error al intentar eliminar el parte', { id: toastId });
    }
  };

  const agregarFilaSice = () => {
    if (siceItems.length >= 10) {
      toast.error('El parte diario SICE permite un máximo de 10 ítems por documento.');
      return;
    }
    setSiceItems([
      ...siceItems,
      { id: siceItems.length + 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
    ]);
  };

  const actualizarItemSice = (index, campo, valor) => {
    const actualizados = [...siceItems];
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      setSiceItems(actualizados);
    }
  };

  const aprobarYArchivarParteSice = async (e) => {
    e.preventDefault();
    if (!contratoSeleccionadoId) {
      toast.error('Por favor seleccione un Contrato de Mantenimiento asociado.');
      return;
    }

    const regexClave = /^[A-Za-z]{2}\d{4}$/;
    if (!regexClave.test(siceRespProveedor.clave)) {
      toast.error('La clave del Responsable Proveedor debe tener 2 letras y 4 números (Ej: AB1234).');
      return;
    }
    if (!regexClave.test(siceRespCliente.clave)) {
      toast.error('La clave del Responsable Cliente debe tener 2 letras y 4 números (Ej: CD5678).');
      return;
    }

    if (siceRespProveedor.clave.toUpperCase() !== clavesContratoActual.proveedorKey.toUpperCase()) {
      toast.error('La clave del Responsable Proveedor no coincide con el contrato.');
      return;
    }
    if (siceRespCliente.clave.toUpperCase() !== clavesContratoActual.clienteKey.toUpperCase()) {
      toast.error('La clave del Responsable Cliente no coincide con el contrato.');
      return;
    }

    const operariosFinales = operariosSeleccionados.map(op => ({
      nombre: String(op?.nombre || ''),
      abreviacion: String(op?.abreviacion || 'OE'),
      horas: op?.horas !== '' && !isNaN(op?.horas) ? Number(op.horas).toFixed(2) : Number(totalHorasDefaultCalculado).toFixed(2)
    }));

    setIsSavingSice(true);
    const toastId = toast.loading('Generando PDF en Google Drive y guardando...');

    try {
      const payloadPdf = {
        action: 'guardarYGenerarPDF',
        tabla: OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice',
        contratoId: String(contratoSeleccionadoId),
        fecha: String(siceFecha),
        nro: String(siceParteNro),
        items: siceItems,
        operarios: operariosFinales,
        proveedor: { cargo: String(siceRespProveedor.cargo || ''), nombre: String(siceRespProveedor.nombre || '') },
        cliente: { cargo: String(siceRespCliente.cargo || ''), nombre: String(siceRespCliente.nombre || '') },
        totalHorasSuma: Number(granTotalHorasHombre)
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadPdf)
      });
      const resultado = await res.json();

      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || resultado?.link || '';
      if (resultado?.success === false || (resultado?.error && !pdfUrlFinal)) {
        toast.error('Error al generar el PDF: ' + (resultado?.error || 'Desconocido'), { id: toastId });
        setIsSavingSice(false);
        return;
      }

      const nuevoParte = {
        id: resultado?.id || `sice-${Date.now()}`,
        nro: String(siceParteNro),
        fecha: String(siceFecha),
        contratoid: String(contratoSeleccionadoId),
        items: [...siceItems],
        operarios: operariosFinales,
        proveedor: { cargo: String(siceRespProveedor.cargo), nombre: String(siceRespProveedor.nombre) },
        cliente: { cargo: String(siceRespCliente.cargo), nombre: String(siceRespCliente.nombre) },
        totalHorasSuma: Number(granTotalHorasHombre).toFixed(2),
        pdfUrl: pdfUrlFinal
      };

      try {
        const cached = localStorage.getItem('sice_partes_local_cache_v2');
        const parsedCache = cached ? JSON.parse(cached) : [];
        parsedCache.unshift(nuevoParte);
        localStorage.setItem('sice_partes_local_cache_v2', JSON.stringify(parsedCache));
      } catch (e) {}

      setFetchedReportesLocal(prev => [nuevoParte, ...prev]);
      setFetchedReportesSice(prev => [nuevoParte, ...prev]);
      if (typeof refetchReportes === 'function') refetchReportes();

      setSiceItems([{ id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }]);
      setSiceRespProveedor(prev => ({ ...prev, clave: '' }));
      setSiceRespCliente(prev => ({ ...prev, clave: '' }));

      toast.success('¡Parte Diario aprobado, PDF en Drive y guardado con éxito!', { id: toastId });
    } catch (err) {
      toast.error('Ocurrió un error de conexión al generar el PDF.', { id: toastId });
    } finally {
      setIsSavingSice(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> Parte Diario de Actividades (SICE S.A.)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Asocie un contrato, complete los operarios activos, los ítems y corrobore las claves.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={contratoSeleccionadoId}
              onChange={(e) => setContratoSeleccionadoId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">-- Todos los Contratos ({contratosList.length} disp.) --</option>
              {contratosList.map((c, i) => {
                const cId = String(c?.id || c?.ID || c?.codigo || c?.Codigo || c?.contrato_id || c?._id || i);
                const cCod = c?.codigo || c?.Codigo || c?.nro_contrato || 'S/C';
                const cNom = c?.nombre || c?.nombre_contrato || c?.Nombre_contrato || c?.nombreContrato || c?.cliente || c?.Cliente || 'Contrato';
                return (
                  <option key={cId} value={cId}>[{cCod}] {cNom}</option>
                );
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
            <h2 className="text-xl font-black text-slate-900 tracking-wide">PARTE DIARIO DE ACTIVIDADES</h2>
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
                  value={siceFecha} 
                  onChange={(e) => setSiceFecha(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>
              <div><span className="text-slate-500 font-semibold">Número de Proveedor Nro.:</span> <span className="font-bold">1490175</span></div>
              <div><span className="text-slate-500 font-semibold">Contrato Nro.:</span> <span className="font-bold">5000002190</span></div>
              <div>
                <span className="text-slate-500 font-semibold">Parte Nro.:</span>
                <span className="font-black text-amber-600 font-mono text-sm">{siceParteNro}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" /> Operarios Presentes ({empleadosActivosFiltrados.length} activos disponibles)
              </h3>
              <button
                type="button"
                onClick={agregarOperarioFila}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-sm cursor-pointer print:hidden"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Operario
              </button>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 p-3 space-y-2">
              {operariosSeleccionados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No hay operarios añadidos.</p>
              ) : (
                operariosSeleccionados.map((op, idx) => (
                  <div key={op?.id || `op-row-${idx}`} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <div className="w-full sm:flex-1">
                      <select
                        value={op?.nombre || ''}
                        onChange={(e) => actualizarOperarioFila(idx, 'nombre', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">-- Seleccionar Operario (Personal Activo) --</option>
                        {empleadosActivosFiltrados.map((emp, eIdx) => {
                          const empNom = String(
                            emp?.nombre || emp?.Nombre || emp?.empleado || emp?.apellido || emp?.razon_social || `Operario ${eIdx + 1}`
                          ).trim();
                          
                          const isSelectedElsewhere = operariosSeleccionados.some(
                            (oItem, oIdx) => oIdx !== idx && String(oItem?.nombre || '').trim() === empNom
                          );

                          return (
                            <option key={emp?.id || emp?.ID || `emp-${eIdx}`} value={empNom} disabled={isSelectedElsewhere}>
                              {empNom} {isSelectedElsewhere ? '(Seleccionado)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="w-24 text-center">
                      <input
                        type="text"
                        value={op?.abreviacion}
                        onChange={(e) => actualizarOperarioFila(idx, 'abreviacion', e.target.value.toUpperCase())}
                        title="Abreviación de categoría"
                        className="w-full bg-amber-100/70 border border-slate-300 rounded px-2 py-1.5 text-xs font-black text-amber-950 text-center uppercase focus:bg-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        step="0.01"
                        value={op?.horas}
                        onChange={(e) => actualizarOperarioFila(idx, 'horas', e.target.value)}
                        placeholder={`${totalHorasDefaultCalculado} hs`}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-black text-slate-900 text-center outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => eliminarOperarioFila(idx)}
                      className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors cursor-pointer print:hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-400 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                  <th className="py-2.5 px-2 border-r border-slate-700 w-12 text-center">Item</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Descripción del Servicio</th>
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-28">Hora Comienzo</th>
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-28">Hora Fin</th>
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-24">Total Horas</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                  <th className="py-2.5 px-2 text-center w-28">Terminó Tarea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {siceItems.map((row, index) => {
                  const totalHs = calcularTotalHorasSice(row?.horaComienzo, row?.horaFin);
                  return (
                    <tr key={`sice-item-${index}`} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                      <td className="py-2 px-2 text-center font-bold border-r border-slate-300 text-slate-700">{row?.id}</td>
                      <td className="py-1.5 px-2 border-r border-slate-300">
                        <input 
                          type="text" 
                          value={row?.descripcion}
                          onChange={(e) => actualizarItemSice(index, 'descripcion', e.target.value)}
                          placeholder="Descripción de labores..."
                          className="w-full bg-amber-100/50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                        <input 
                          type="time" 
                          value={row?.horaComienzo}
                          onChange={(e) => actualizarItemSice(index, 'horaComienzo', e.target.value)}
                          className="bg-amber-100/50 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-center"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                        <input 
                          type="time" 
                          value={row?.horaFin}
                          onChange={(e) => actualizarItemSice(index, 'horaFin', e.target.value)}
                          className="bg-amber-100/50 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-center"
                        />
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-300 text-center font-extrabold text-amber-900 bg-amber-100/80">
                        {totalHs} hs
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-300">
                        <input 
                          type="text" 
                          value={row?.observaciones}
                          onChange={(e) => actualizarItemSice(index, 'observaciones', e.target.value)}
                          placeholder="Observaciones..."
                          className="w-full bg-amber-100/50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => actualizarItemSice(index, 'terminoTarea', 'SI')}
                            className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row?.terminoTarea === 'SI' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
                          >
                            SI
                          </button>
                          <button
                            type="button"
                            onClick={() => actualizarItemSice(index, 'terminoTarea', 'NO')}
                            className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row?.terminoTarea === 'NO' ? 'bg-rose-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
                          >
                            NO
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center print:hidden">
            <button 
              type="button" 
              onClick={agregarFilaSice}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Agregar Ítem (Fila)
            </button>
            <span className="text-xs text-slate-500 font-semibold">Total filas: {siceItems.length} / 10</span>
          </div>

          <div className="bg-amber-100/60 border-2 border-amber-300 rounded-xl p-4 flex justify-between items-center mt-2 shadow-sm">
            <div className="space-y-1">
              <p className="text-amber-900 font-bold text-xs flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Resumen de Imputación:
              </p>
              <p className="text-amber-800 text-[11px] font-medium">Total Horas Demandadas (Tareas): <strong>{totalHorasDefaultCalculado} hs</strong></p>
              <p className="text-amber-800 text-[11px] font-medium">Operarios Activos Seleccionados: <strong>{operariosSeleccionados.length}</strong></p>
            </div>
            <div className="text-right bg-amber-500 text-slate-950 px-6 py-2 rounded-lg shadow-sm">
              <p className="font-extrabold text-[10px] uppercase tracking-wide opacity-80">Total Horas Hombre</p>
              <p className="font-black text-2xl">{granTotalHorasHombre} <span className="text-sm">hs</span></p>
            </div>
          </div>

          <form onSubmit={aprobarYArchivarParteSice} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="p-4 space-y-3">
                <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE PROVEEDOR</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">CARGO:</label>
                    <input 
                      type="text" 
                      required
                      value={siceRespProveedor.cargo}
                      onChange={(e) => setSiceRespProveedor({...siceRespProveedor, cargo: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO:</label>
                    <input 
                      type="text" 
                      required
                      value={siceRespProveedor.nombre}
                      onChange={(e) => setSiceRespProveedor({...siceRespProveedor, nombre: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: AT1020):</label>
                    <input 
                      type="password" 
                      required
                      maxLength={6}
                      placeholder="Ej: AT1020"
                      value={siceRespProveedor.clave}
                      onChange={(e) => setSiceRespProveedor({...siceRespProveedor, clave: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE CLIENTE</h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">CARGO:</label>
                    <input 
                      type="text" 
                      required
                      value={siceRespCliente.cargo}
                      onChange={(e) => setSiceRespCliente({...siceRespCliente, cargo: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO:</label>
                    <input 
                      type="text" 
                      required
                      value={siceRespCliente.nombre}
                      onChange={(e) => setSiceRespCliente({...siceRespCliente, nombre: e.target.value})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: CM7030):</label>
                    <input 
                      type="password" 
                      required
                      maxLength={6}
                      placeholder="Ej: CM7030"
                      value={siceRespCliente.clave}
                      onChange={(e) => setSiceRespCliente({...siceRespCliente, clave: e.target.value.toUpperCase()})}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
              <p className="text-xs text-slate-500">Ingrese sus claves para firmar y validar el parte diario.</p>
              <button 
                type="submit"
                disabled={isSavingSice}
                className={`px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2 ${isSavingSice ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSavingSice ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Procesando...</>
                ) : (
                  <><ShieldCheck className="w-4 h-4" /> Aprobar, Firmar y Guardar Reporte</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase">Historial de Partes Diarios SICE Aprobados</h3>
        {sicePartesAprobados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
            No hay partes diarios aprobados ni archivados en el sistema.
          </div>
        ) : (
          <div className="space-y-3">
            {sicePartesAprobados.map((parte, idx) => {
              const parteId = parte?.id || parte?.nro || `parte-${idx}`;
              const pObj = parte?.proveedor;
              const pNombre = (pObj && typeof pObj === 'object') ? (pObj.nombre || '---') : (pObj || '---');
              const pCargo = (pObj && typeof pObj === 'object') ? (pObj.cargo || '---') : '';

              const cObj = parte?.cliente;
              const cNombre = (cObj && typeof cObj === 'object') ? (cObj.nombre || '---') : (cObj || '---');
              const cCargo = (cObj && typeof cObj === 'object') ? (cObj.cargo || '---') : '';

              return (
                <div key={parteId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-full">Parte Nro: {parte?.nro}</span>
                      <span className="text-xs font-medium text-slate-500">Fecha: {parte?.fecha}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Total Horas: {parte?.totalHorasSuma} hs</span>
                    </div>
                    <p className="text-slate-700 text-xs mt-2">
                      Proveedor: <strong>{pNombre}</strong> ({pCargo}) | Cliente: <strong>{cNombre}</strong> ({cCargo})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {parte?.pdfUrl ? (
                      <a 
                        href={parte.pdfUrl}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" /> Ver PDF en Drive
                      </a>
                    ) : (
                      <button 
                        onClick={() => setParteVisualizando(parte)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Eye className="w-4 h-4" /> Visualizar
                      </button>
                    )}
                    {!esOperador && (
                      <button 
                        onClick={() => eliminarParteServidor(parteId)}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Eliminar reporte"
                      >
                        <Trash2 className="w-4 h-4" /> Borrar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {parteVisualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-300 p-6 space-y-6 text-slate-900 relative">
            <button
              onClick={() => setParteVisualizando(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 pr-12">
              <img src="/logo-07.png" alt="SICE S.A." className="h-20 object-contain" />
              <h2 className="text-lg font-black text-slate-900 tracking-wide text-right">PARTE DIARIO DE ACTIVIDADES</h2>
            </div>

            <div className="text-xs space-y-2 border-b border-slate-300 pb-4">
              <p className="font-extrabold text-blue-900 text-sm">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div><span className="text-slate-500 font-semibold">C.U.I.T.:</span> <span className="font-bold">30-71573431-8</span></div>
                <div><span className="text-slate-500 font-semibold">Cliente:</span> <span className="font-bold">LDC Argentina S.A.</span></div>
                <div><span className="text-slate-500 font-semibold">Fecha:</span> <span className="font-bold">{parteVisualizando?.fecha}</span></div>
                <div><span className="text-slate-500 font-semibold">Parte Nro.:</span> <span className="font-black text-amber-600 font-mono">{parteVisualizando?.nro}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" /> Operarios Presentes
              </h4>
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-3 space-y-1">
                {Array.isArray(parteVisualizando?.operarios) && parteVisualizando.operarios.length > 0 ? (
                  parteVisualizando.operarios.map((op, oIdx) => (
                    <div key={`modal-op-${oIdx}`} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200">
                      <span className="font-bold text-slate-800">{op?.nombre}</span>
                      <div className="flex gap-4">
                        <span className="text-slate-600">Cat./Abrev: <strong>{op?.abreviacion}</strong></span>
                        <span className="text-amber-800 font-black">{op?.horas} hs</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-1">Registrado con operario principal.</p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center">Item</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-28">Comienzo</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-28">Fin</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-24">Total</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                    <th className="py-2.5 px-3 text-center w-24">Terminó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.isArray(parteVisualizando?.items) && parteVisualizando.items.map((it, iIdx) => (
                    <tr key={`modal-item-${iIdx}`} className="bg-white">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{it?.id || iIdx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{it?.descripcion || '---'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaComienzo || '08:00'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaFin || '17:00'}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-amber-900 bg-amber-50">{calcularTotalHorasSice(it?.horaComienzo, it?.horaFin)} hs</td>
                      <td className="py-2.5 px-3 text-slate-600">{it?.observaciones || '---'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it?.terminoTarea || 'SI'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 bg-slate-50 text-xs">
              <div>
                <h5 className="font-black text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Responsable Proveedor</h5>
                <p><span className="text-slate-500">Cargo:</span> <strong>{parteVisualizando?.proveedor?.cargo}</strong></p>
                <p><span className="text-slate-500">Nombre:</span> <strong>{parteVisualizando?.proveedor?.nombre}</strong></p>
                <p className="text-emerald-700 font-semibold mt-1">✔ Firmado y Validado</p>
              </div>
              <div>
                <h5 className="font-black text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Responsable Cliente</h5>
                <p><span className="text-slate-500">Cargo:</span> <strong className="text-slate-950">{parteVisualizando?.cliente?.cargo}</strong></p>
                <p><span className="text-slate-500">Nombre:</span> <strong className="text-slate-950">{parteVisualizando?.cliente?.nombre}</strong></p>
                <p className="text-emerald-700 font-semibold mt-1">✔ Firmado y Validado</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Documento
              </button>
              <button
                onClick={() => setParteVisualizando(null)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}