import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useObraData } from '../../hooks/useObraData';
import { OBRAS_CONFIG } from '../../config/constants';
import { GOOGLE_SCRIPT_URL } from '@/api';
import { Printer, Trash2, Plus, FileText, ExternalLink } from 'lucide-react';

export default function ReportesDiariosTab({
  contratosList,
  allReportesSice,
  setFetchedReportesSice,
  listaEmpleadosActivos,
  esOperador,
  buscarValorEnObjeto
}) {
  const { isLoading: isLoadingReportes } = useObraData(OBRAS_CONFIG.TABLAS.REPORTES_SICE);
  
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

  const calcularTotalHorasSice = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hIni, mIni] = String(inicio).split(':').map(Number);
    const [hFin, mFin] = String(fin).split(':').map(Number);
    let diffMinutos = ((hFin || 0) * 60 + (mFin || 0)) - ((hIni || 0) * 60 + (mIni || 0));
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return 0;
    const horasConProporcional = horasEfectivas * (11 / 9);
    return Number(horasConProporcional.toFixed(2));
  };

  useEffect(() => {
    if (listaEmpleadosActivos.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = listaEmpleadosActivos.slice(0, 1).map(emp => {
        const nombreEmp = buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido']) || 'Operario';
        const abrevEmp = OBRAS_CONFIG.determinarCategoriaEmpleado(nombreEmp);
        return {
          id: buscarValorEnObjeto(emp, ['id', 'ID']) || Math.random().toString(),
          nombre: nombreEmp,
          abreviacion: abrevEmp,
          horas: ''
        };
      });
      setOperariosSeleccionados(iniciales);
    }
  }, [listaEmpleadosActivos, operariosSeleccionados.length, buscarValorEnObjeto]);

  const extraerDatosContrato = (contrato) => {
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
  };

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
  }, [contratosList, contratoSeleccionadoId, buscarValorEnObjeto]);

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
  }, [contratoSeleccionadoId, contratosList, buscarValorEnObjeto]);

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

  const eliminarParteServidor = async (idParte) => {
    if (esOperador) return;
    if (!window.confirm("¿Está seguro de eliminar este parte diario?")) return;
    const toastId = toast.loading('Eliminando parte diario...');
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ReportesSice', action: 'delete', id: idParte })
      });
      setFetchedReportesSice(prev => prev.filter(p => String(buscarValorEnObjeto(p, ['id', 'ID', 'nro'])) !== String(idParte)));
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

    const totalHsSuma = siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it?.horaComienzo, it?.horaFin), 0);
    const operariosFinales = operariosSeleccionados.map(op => ({
      nombre: String(op?.nombre || ''),
      abreviacion: String(op?.abreviacion || 'OE'),
      horas: op?.horas !== '' ? Number(op?.horas) : totalHsSuma
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
        totalHorasSuma: Number(totalHsSuma)
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
        totalHorasSuma: Number(totalHsSuma),
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
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Gestión de Reportes Diarios SICE</h2>
        
        {/* Selector de Contrato */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contrato de Mantenimiento Asociado:</label>
          <select
            value={contratoSeleccionadoId}
            onChange={(e) => setContratoSeleccionadoId(e.target.value)}
            className="w-full p-2.5 border rounded-xl text-sm bg-slate-50 font-medium"
          >
            <option value="">-- Seleccione un Contrato --</option>
            {contratosList.map(c => {
              const cId = buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo']);
              const cNombre = buscarValorEnObjeto(c, ['nombre', 'nombre_contrato', 'Nombre']);
              const cCliente = buscarValorEnObjeto(c, ['cliente', 'Cliente']);
              return (
                <option key={cId} value={cId}>
                  {cId} - {cNombre} ({cCliente})
                </option>
              );
            })}
          </select>
        </div>

        {/* Formulario de carga de parte */}
        <form onSubmit={aprobarYArchivarParteSice} className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha del Parte:</label>
              <input
                type="date"
                value={siceFecha}
                onChange={(e) => setSiceFecha(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Número de Parte:</label>
              <input
                type="text"
                value={siceParteNro}
                onChange={(e) => setSiceParteNro(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm font-mono"
                required
              />
            </div>
          </div>

          {/* Tabla de ítems diarios */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-slate-600">Ítems de Actividades</h3>
              <button
                type="button"
                onClick={agregarFilaSice}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1"
              >
                <Plus size={14} /> Agregar Ítem
              </button>
            </div>
            {siceItems.map((item, idx) => (
              <div key={item.id || idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border">
                <input
                  type="text"
                  placeholder="Descripción de la tarea"
                  value={item.descripcion}
                  onChange={(e) => actualizarItemSice(idx, 'descripcion', e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-xs bg-white"
                  required
                />
                <input
                  type="time"
                  value={item.horaComienzo}
                  onChange={(e) => actualizarItemSice(idx, 'horaComienzo', e.target.value)}
                  className="p-2 border rounded-lg text-xs bg-white w-24"
                />
                <input
                  type="time"
                  value={item.horaFin}
                  onChange={(e) => actualizarItemSice(idx, 'horaFin', e.target.value)}
                  className="p-2 border rounded-lg text-xs bg-white w-24"
                />
                <select
                  value={item.terminoTarea}
                  onChange={(e) => actualizarItemSice(idx, 'terminoTarea', e.target.value)}
                  className="p-2 border rounded-lg text-xs bg-white w-20"
                >
                  <option value="SI">SI</option>
                  <option value="NO">NO</option>
                </select>
                {siceItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSiceItems(siceItems.filter((_, i) => i !== idx))}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Operarios */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase text-slate-600">Personal Operativo Presente</h3>
              <button
                type="button"
                onClick={agregarOperarioFila}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1"
              >
                <Plus size={14} /> Agregar Operario
              </button>
            </div>
            {operariosSeleccionados.map((op, idx) => (
              <div key={op.id || idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border">
                <input
                  type="text"
                  placeholder="Nombre del operario"
                  value={op.nombre}
                  onChange={(e) => actualizarOperarioFila(idx, 'nombre', e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-xs bg-white"
                />
                <input
                  type="text"
                  placeholder="Abrev (S / OE)"
                  value={op.abreviacion}
                  onChange={(e) => actualizarOperarioFila(idx, 'abreviacion', e.target.value)}
                  className="w-24 p-2 border rounded-lg text-xs bg-white uppercase text-center font-bold"
                />
                <input
                  type="number"
                  placeholder="Horas"
                  value={op.horas}
                  onChange={(e) => actualizarOperarioFila(idx, 'horas', e.target.value)}
                  className="w-24 p-2 border rounded-lg text-xs bg-white"
                />
                <button
                  type="button"
                  onClick={() => eliminarOperarioFila(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Claves de aprobación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
              <h4 className="text-xs font-bold uppercase text-amber-900 mb-2">Firma Proveedor ({siceRespProveedor.nombre || 'Sin asignar'})</h4>
              <input
                type="password"
                placeholder="Clave (Ej: AT1020)"
                maxLength={6}
                value={siceRespProveedor.clave}
                onChange={(e) => setSiceRespProveedor({ ...siceRespProveedor, clave: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-sm font-mono uppercase bg-white"
                required
              />
            </div>
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200">
              <h4 className="text-xs font-bold uppercase text-sky-900 mb-2">Firma Cliente ({siceRespCliente.nombre || 'Sin asignar'})</h4>
              <input
                type="password"
                placeholder="Clave (Ej: CM7030)"
                maxLength={6}
                value={siceRespCliente.clave}
                onChange={(e) => setSiceRespCliente({ ...siceRespCliente, clave: e.target.value })}
                className="w-full p-2.5 border rounded-xl text-sm font-mono uppercase bg-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingSice}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition-all uppercase tracking-wider disabled:opacity-50"
          >
            {isSavingSice ? 'Generando PDF y Guardando...' : 'Aprobar, Generar PDF en Drive y Guardar Parte'}
          </button>
        </form>
      </div>

      {/* Historial de Partes Diarios SICE */}
      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Historial de Partes Diarios SICE Aprobados</h3>
        {isLoadingReportes ? (
          <p className="text-xs text-slate-500 animate-pulse">Cargando partes...</p>
        ) : sicePartesAprobados.length === 0 ? (
          <p className="text-xs text-slate-500">No hay partes diarios registrados para este contrato.</p>
        ) : (
          <div className="space-y-3">
            {sicePartesAprobados.map(parte => (
              <div key={parte.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">Parte N° {parte.nro}</span>
                    <span className="text-xs text-slate-500">({parte.fecha})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Total Horas: <strong className="text-slate-900">{parte.totalHorasSuma} hs</strong></p>
                </div>
                <div className="flex items-center gap-2">
                  {parte.pdfUrl && (
                    <a
                      href={parte.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold hover:bg-sky-100 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink size={14} /> Ver PDF
                    </a>
                  )}
                  {!esOperador && (
                    <button
                      onClick={() => eliminarParteServidor(parte.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar parte"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}