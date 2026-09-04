import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { Printer, Plus, Trash2, ShieldCheck, ExternalLink, Eye, X, Users, Calendar, Calculator } from 'lucide-react';

export default function ReportesDiariosTab({
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
  }
}) {
  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));
  const [siceParteNro, setSiceParteNro] = useState('00005');
  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
  ]);
  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);
  const [siceRespProveedor, setSiceRespProveedor] = useState({ cargo: '', nombre: '', clave: '' });
  const [siceRespCliente, setSiceRespCliente] = useState({ cargo: '', nombre: '', clave: '' });
  const [isSavingSice, setIsSavingSice] = useState(false);
  const [parteVisualizando, setParteVisualizando] = useState(null);

  const empleadosActivosFiltrados = useMemo(() => {
    if (!Array.isArray(listaEmpleadosActivos)) return [];
    return listaEmpleadosActivos.filter(emp => {
      const estadoEmp = String(buscarValorEnObjeto(emp, ['estado', 'Estado']) || '').toLowerCase().trim();
      return estadoEmp === 'activo';
    });
  }, [listaEmpleadosActivos, buscarValorEnObjeto]);

  const calcularTotalHorasSice = useCallback((inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hIni, mIni] = String(inicio).split(':').map(Number);
    const [hFin, mFin] = String(fin).split(':').map(Number);
    let diffMinutos = ((hFin || 0) * 60 + (mFin || 0)) - ((hIni || 0) * 60 + (mIni || 0));
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return 0;
    const horasConProporcional = horasEfectivas * (11 / 9);
    return Number(horasConProporcional.toFixed(2));
  }, []);

  const totalHorasDefaultCalculado = useMemo(() => {
    return siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it?.horaComienzo, it?.horaFin), 0);
  }, [siceItems, calcularTotalHorasSice]);

  const granTotalHorasHombre = useMemo(() => {
    const cantOperarios = operariosSeleccionados.length > 0 ? operariosSeleccionados.length : 1;
    return Number((totalHorasDefaultCalculado * cantOperarios).toFixed(2));
  }, [totalHorasDefaultCalculado, operariosSeleccionados.length]);

  useEffect(() => {
    if (empleadosActivosFiltrados.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = empleadosActivosFiltrados.slice(0, 1).map(emp => {
        const nombreEmp = buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido']) || 'Operario';
        return {
          id: buscarValorEnObjeto(emp, ['id', 'ID']) || Math.random().toString(),
          nombre: nombreEmp,
          abreviacion: 'OE',
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
      const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo'])).trim();
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
        const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo'])).trim();
        return cId === String(contratoSeleccionadoId).trim();
      });
      if (contrato) {
        const { pCargo, pNombre, cCargo, cNombre } = extraerDatosContrato(contrato);
        setSiceRespProveedor(prev => ({ cargo: pCargo, nombre: pNombre, clave: prev?.clave || '' }));
        setSiceRespCliente(prev => ({ cargo: cCargo, nombre: cNombre, clave: prev?.clave || '' }));
      }
    }
  }, [contratoSeleccionadoId, contratosList, buscarValorEnObjeto, extraerDatosContrato]);

  const sicePartesAprobados = useMemo(() => {
    let lista = allReportesSice;
    if (contratoSeleccionadoId) {
      lista = allReportesSice.filter(r => {
        if (!r) return false;
        const rContratoId = String(buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id'])).trim();
        if (rContratoId === String(contratoSeleccionadoId).trim()) return true;
        const valores = Object.values(r).map(v => String(v).trim());
        return valores.includes(String(contratoSeleccionadoId).trim());
      });
    }

    return lista.map(r => {
      let itemsParsed = buscarValorEnObjeto(r, ['items', 'Item', 'Items']);
      if (typeof itemsParsed === 'string' && itemsParsed.trim()) {
        try { itemsParsed = JSON.parse(itemsParsed); } catch { itemsParsed = []; }
      }
      let operariosParsed = buscarValorEnObjeto(r, ['operarios', 'operariosPresentes']);
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

      return {
        id: buscarValorEnObjeto(r, ['id', 'ID', 'nro']) || `sice-${Math.random()}`,
        nro: buscarValorEnObjeto(r, ['nro', 'Nro', 'numero']) || '00001',
        fecha: buscarValorEnObjeto(r, ['fecha', 'Fecha']) || '',
        contratoid: buscarValorEnObjeto(r, ['contratoid', 'contratoId']) || '',
        items: Array.isArray(itemsParsed) ? itemsParsed : [],
        operarios: Array.isArray(operariosParsed) ? operariosParsed : [],
        proveedor: provParsed || { nombre: '', cargo: '' },
        cliente: cliParsed || { nombre: '', cargo: '' },
        totalHorasSuma: Number(buscarValorEnObjeto(r, ['totalhorassuma', 'totalHorasSuma']) || 0),
        pdfUrl: buscarValorEnObjeto(r, ['pdf_url', 'pdfUrl', 'urlPdf']) || ''
      };
    });
  }, [contratoSeleccionadoId, allReportesSice, buscarValorEnObjeto]);

  const agregarOperarioFila = () => {
    setOperariosSeleccionados([
      ...operariosSeleccionados,
      { id: Math.random().toString(), nombre: '', abreviacion: 'OE', horas: '' }
    ]);
  };

  const actualizarOperarioFila = (index, campo, valor) => {
    const actualizados = [...operariosSeleccionados];
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      setOperariosSeleccionados(actualizados);
    }
  };

  const eliminarOperarioFila = (index) => {
    setOperariosSeleccionados(operariosSeleccionados.filter((_, i) => i !== index));
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
      horas: op?.horas !== '' ? Number(op?.horas) : totalHorasDefaultCalculado
    }));

    setIsSavingSice(true);
    const toastId = toast.loading('Generando PDF en Google Drive y guardando...');

    try {
      const payloadPdf = {
        action: 'guardarYGenerarPDF',
        tabla: 'ReportesSice',
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
        id: `sice-${Date.now()}`,
        nro: String(siceParteNro),
        fecha: String(siceFecha),
        contratoid: String(contratoSeleccionadoId),
        items: [...siceItems],
        operarios: operariosFinales,
        proveedor: { cargo: String(siceRespProveedor.cargo), nombre: String(siceRespProveedor.nombre) },
        cliente: { cargo: String(siceRespCliente.cargo), nombre: String(siceRespCliente.nombre) },
        totalHorasSuma: Number(granTotalHorasHombre),
        pdfUrl: pdfUrlFinal
      };

      setFetchedReportesSice(prev => [nuevoParte, ...prev]);
      setSiceParteNro(String(Number(siceParteNro) + 1).padStart(5, '0'));
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
              <option value="">-- Seleccionar Contrato ({contratosList.length} disp.) --</option>
              {contratosList.map((c, i) => {
                const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo']) || i);
                const cCod = buscarValorEnObjeto(c, ['codigo', 'Codigo']) || 'S/C';
                const cNom = buscarValorEnObjeto(c, ['nombre', 'nombre_contrato', 'Nombre_contrato', 'nombreContrato', 'cliente', 'Cliente']) || 'Contrato';
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
                  <div key={op?.id || idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <div className="w-full sm:flex-1">
                      <select
                        value={op?.nombre}
                        onChange={(e) => {
                          const nombreVal = e.target.value;
                          const isCallapina = nombreVal.toLowerCase().includes('callapiña') || nombreVal.toLowerCase().includes('callapina');
                          const actualizados = [...operariosSeleccionados];
                          actualizados[idx] = { ...actualizados[idx], nombre: nombreVal, abreviacion: isCallapina ? 'S' : 'OE' };
                          setOperariosSeleccionados(actualizados);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">-- Seleccionar Operario (Personal Activo) --</option>
                        {empleadosActivosFiltrados.map((emp, eIdx) => {
                          const empNom = buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido']) || `Operario ${eIdx + 1}`;
                          const isSelectedElsewhere = operariosSeleccionados.some((oItem, oIdx) => oIdx !== idx && oItem?.nombre === empNom);
                          return (
                            <option key={eIdx} value={empNom} disabled={isSelectedElsewhere}>
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
                        placeholder={`${totalHorasDefaultCalculado} hs (Def.)`}
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
                    <tr key={index} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
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

          {/* RECUADRO TOTAL DE HORAS HOMBRE */}
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
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: AB1234):</label>
                    <input 
                      type="password" 
                      required
                      maxLength={6}
                      placeholder="Ej: AB1234"
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
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: CD5678):</label>
                    <input 
                      type="password" 
                      required
                      maxLength={6}
                      placeholder="Ej: CD5678"
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
    </div>
  );
}