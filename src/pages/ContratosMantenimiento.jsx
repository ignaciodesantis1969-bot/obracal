import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Edit2, Trash2, MapPin, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

export default function ContratosMantenimiento({ contratos: contratosProp = [], clientes: clientesProp = [], cargarDatos }) {
  const [contratos, setContratos] = useState(contratosProp);
  const [clientes, setClientes] = useState(clientesProp);
  const [pestanaActiva, setPestanaActiva] = useState('trabajo');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);

  const [formData, setFormData] = useState({
    codigo: '',
    nombre_contrato: '',
    cliente: '',
    ubicacion: '',
    mes_base: '',
    actualizacion: 'Polinómica',
    estado: 'Borrador',
    descripcion: ''
  });

  // Función para recargar datos directamente desde Google Sheets
  const refrescarDatosLocales = async () => {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cargarDetalleCompleto' })
      });
      const data = await res.json();
      if (data.success) {
        if (data.contratos_mantenimiento) setContratos(data.contratos_mantenimiento);
        if (data.clientes) setClientes(data.clientes);
      }
    } catch (err) {
      console.error("Error al refrescar datos:", err);
    }
  };

  useEffect(() => {
    if (contratosProp.length > 0) setContratos(contratosProp);
    if (clientesProp.length > 0) setClientes(clientesProp);
    if (contratosProp.length === 0 || clientesProp.length === 0) {
      refrescarDatosLocales();
    }
  }, [contratosProp, clientesProp]);

  const totalBorrador = contratos.filter(c => String(c.estado || '').toLowerCase() === 'borrador').length;
  const totalEntregado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'entregado').length;
  const totalActivo = contratos.filter(c => String(c.estado || '').toLowerCase() === 'activo').length;
  const totalFinalizado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'finalizado').length;
  const totalArchivado = contratos.filter(c => String(c.estado || '').toLowerCase() === 'archivado').length;

  const generarNuevoCodigo = () => {
    if (!contratos || contratos.length === 0) return 'CM001';
    const numeros = contratos.map(c => {
      const match = String(c.codigo || '').match(/CM(\d+)/i);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(...numeros, 0);
    return `CM${String(maxNum + 1).padStart(3, '0')}`;
  };

  const abrirModalNuevo = () => {
    setContratoEditando(null);
    setFormData({
      codigo: generarNuevoCodigo(),
      nombre_contrato: '',
      cliente: '',
      ubicacion: '',
      mes_base: new Date().toISOString().slice(0, 7),
      actualizacion: 'Polinómica',
      estado: 'Borrador',
      descripcion: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (c) => {
    setContratoEditando(c);
    setFormData({
      codigo: c.codigo || generarNuevoCodigo(),
      nombre_contrato: c.nombre_contrato || '',
      cliente: c.cliente || '',
      ubicacion: c.ubicacion || '',
      mes_base: c.mes_base || '',
      actualizacion: c.actualizacion || 'Polinómica',
      estado: c.estado || 'Borrador',
      descripcion: c.descripcion || ''
    });
    setModalAbierto(true);
  };

  const guardarContrato = async (e) => {
    e.preventDefault();
    setCargando(true);
    try {
      const action = contratoEditando ? 'update' : 'create';
      const payload = {
        tabla: 'ContratosMantenimiento',
        action: action,
        id: contratoEditando ? contratoEditando.id : undefined,
        data: formData
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setModalAbierto(false);
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      } else {
        alert("Error al guardar: " + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const eliminarContrato = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este contrato?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    }
  };

  const cambiarEstadoRapido = async (id, nuevoEstado) => {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'ContratosMantenimiento',
          action: 'update',
          id: id,
          data: { estado: nuevoEstado }
        })
      });
      const data = await res.json();
      if (data.success) {
        await refrescarDatosLocales();
        if (cargarDatos) cargarDatos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const contratosFiltrados = contratos.filter(c => {
    const estado = String(c.estado || '').toLowerCase();
    const matchBusqueda = 
      String(c.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.nombre_contrato || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.cliente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      String(c.ubicacion || '').toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;

    if (pestanaActiva === 'trabajo') {
      return estado === 'borrador' || estado === 'entregado';
    } else if (pestanaActiva === 'activos') {
      return estado === 'activo';
    } else if (pestanaActiva === 'archivados') {
      return estado === 'archivado' || estado === 'finalizado';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-500" /> Contratos de Mantenimiento
          </h1>
          <p className="text-slate-500 text-sm">Gestión y control de contratos de servicios de mantenimiento para empresas.</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Contrato
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Borrador</p>
          <p className="text-3xl font-black text-slate-800">{totalBorrador}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Entregado</p>
          <p className="text-3xl font-black text-amber-600">{totalEntregado}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Activo</p>
          <p className="text-3xl font-black text-emerald-600">{totalActivo}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Finalizado</p>
          <p className="text-3xl font-black text-blue-600">{totalFinalizado}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Archivado</p>
          <p className="text-3xl font-black text-slate-600">{totalArchivado}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <button 
            onClick={() => setPestanaActiva('trabajo')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'trabajo' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Espacio de Trabajo (Borrador / Entregado)
          </button>
          <button 
            onClick={() => setPestanaActiva('activos')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'activos' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Activos
          </button>
          <button 
            onClick={() => setPestanaActiva('archivados')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
              pestanaActiva === 'archivados' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Archivados / Finalizados
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input 
            type="text" 
            placeholder="Buscar contrato, cliente..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-4">Código</th>
                <th className="p-4">Nombre del Contrato</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Ubicación / Planta</th>
                <th className="p-4">Mes Base</th>
                <th className="p-4">Actualización</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No se encontraron contratos en esta sección.
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-700">{c.codigo}</td>
                    <td className="p-4 font-semibold text-slate-800">{c.nombre_contrato || 'Sin Nombre'}</td>
                    <td className="p-4 text-slate-600">{c.cliente || '---'}</td>
                    <td className="p-4 text-slate-600 flex items-center gap-1.5 pt-5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {c.ubicacion || '---'}
                    </td>
                    <td className="p-4 text-slate-600">{c.mes_base || '---'}</td>
                    <td className="p-4 text-slate-600">{c.actualizacion || '---'}</td>
                    <td className="p-4">
                      <select 
                        value={c.estado || 'Borrador'}
                        onChange={(e) => cambiarEstadoRapido(c.id, e.target.value)}
                        className={cn(
                          'text-xs font-semibold px-3 py-1.5 rounded-xl border focus:outline-none cursor-pointer',
                          c.estado === 'Activo' && 'bg-emerald-50 text-emerald-600 border-emerald-200',
                          c.estado === 'Entregado' && 'bg-amber-50 text-amber-600 border-amber-200',
                          c.estado === 'Borrador' && 'bg-slate-100 text-slate-600 border-slate-200',
                          c.estado === 'Finalizado' && 'bg-blue-50 text-blue-600 border-blue-200',
                          c.estado === 'Archivado' && 'bg-slate-200 text-slate-700 border-slate-300',
                        )}
                      >
                        <option value="Borrador">Borrador</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Activo">Activo</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Archivado">Archivado</option>
                      </select>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => abrirModalEditar(c)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => eliminarContrato(c.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-lg">
                {contratoEditando ? 'Editar Contrato de Mantenimiento' : 'Nuevo Contrato de Mantenimiento'}
              </h3>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={guardarContrato} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código (Automático)</label>
                  <input 
                    type="text" 
                    disabled
                    value={formData.codigo}
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado Inicial</label>
                  <select 
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Entregado">Entregado</option>
                    <option value="Activo">Activo</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Archivado">Archivado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre del Contrato</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Mantenimiento Preventivo de Planta..."
                  value={formData.nombre_contrato}
                  onChange={(e) => setFormData({...formData, nombre_contrato: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
                  <select 
                    value={formData.cliente}
                    onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="">Seleccionar cliente...</option>
                    {clientes.map((cli, idx) => {
                      const nombreCli = cli.nombre || cli.razon_social || cli.cliente || `Cliente #${idx + 1}`;
                      return (
                        <option key={idx} value={nombreCli}>{nombreCli}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ubicación / Planta Industrial</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ej: Planta Benavidez / Sector A..."
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción del Servicio (Detalles)</label>
                <textarea 
                  rows="2"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Detalles y alcances del mantenimiento..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Mes Base</label>
                  <input 
                    type="text" 
                    value={formData.mes_base}
                    onChange={(e) => setFormData({...formData, mes_base: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="Ej: Mar 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Actualización</label>
                  <select 
                    value={formData.actualizacion}
                    onChange={(e) => setFormData({...formData, actualizacion: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Polinómica">Polinómica</option>
                    <option value="Índice">Índice</option>
                    <option value="Fija">Fija</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={cargando}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold rounded-xl text-sm shadow-md cursor-pointer"
                >
                  {cargando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    'Guardar Contrato'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}