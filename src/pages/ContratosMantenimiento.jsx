import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Edit2, Trash2, Building2, Truck, Calendar, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

export default function ContratosMantenimiento({ contratos = [], proveedores = [], obras = [], cargarDatos }) {
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [contratoEditando, setContratoEditando] = useState(null);

  const [formData, setFormData] = useState({
    codigo: '',
    obra_id: '',
    proveedor_id: '',
    descripcion: '',
    monto_mensual: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'Activo'
  });

  const abrirModalNuevo = () => {
    setContratoEditando(null);
    setFormData({
      codigo: 'CM-' + Math.floor(1000 + Math.random() * 9000),
      obra_id: obras[0]?.id || '',
      proveedor_id: proveedores[0]?.id || '',
      descripcion: '',
      monto_mensual: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      estado: 'Activo'
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (c) => {
    setContratoEditando(c);
    setFormData({
      codigo: c.codigo || '',
      obra_id: c.obra_id || '',
      proveedor_id: c.proveedor_id || '',
      descripcion: c.descripcion || '',
      monto_mensual: c.monto_mensual || '',
      fecha_inicio: c.fecha_inicio || '',
      fecha_fin: c.fecha_fin || '',
      estado: c.estado || 'Activo'
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
    if (!confirm("¿Estás seguro de eliminar este contrato de mantenimiento?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'delete', id })
      });
      const data = await res.json();
      if (data.success) {
        if (cargarDatos) cargarDatos();
      } else {
        alert("Error al eliminar: " + (data.error || 'Desconocido'));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    }
  };

  const contratosFiltrados = contratos.filter(c => 
    String(c.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    String(c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-amber-500" /> Contratos de Mantenimiento
          </h1>
          <p className="text-slate-500 text-sm">Gestión y control de contratos de servicios y mantenimiento para obras.</p>
        </div>
        <button 
          onClick={abrirModalNuevo}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Contrato
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por código o descripción..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-4">Código</th>
                <th className="p-4">Obra</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Monto Mensual</th>
                <th className="p-4">Vigencia</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contratosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No se encontraron contratos de mantenimiento registrados.
                  </td>
                </tr>
              ) : (
                contratosFiltrados.map((c) => {
                  const obraAsociada = obras.find(o => String(o.id) === String(c.obra_id));
                  const proveedorAsociado = proveedores.find(p => String(p.id) === String(c.proveedor_id));
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-700">{c.codigo}</td>
                      <td className="p-4 text-slate-600 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                        {obraAsociada?.nombre || obraAsociada?.obra || c.obra_id || '---'}
                      </td>
                      <td className="p-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                          {proveedorAsociado?.nombre || proveedorAsociado?.razon_social || c.proveedor_id || '---'}
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs truncate">{c.descripcion}</td>
                      <td className="p-4 font-semibold text-slate-800">
                        $ {Number(c.monto_mensual || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {c.fecha_inicio} al {c.fecha_fin || 'Indefinido'}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-semibold',
                          c.estado === 'Activo' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-200 text-slate-600'
                        )}>
                          {c.estado || 'Activo'}
                        </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Código</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Estado</label>
                  <select 
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Suspendido">Suspendido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Obra Asociada</label>
                  <select 
                    value={formData.obra_id}
                    onChange={(e) => setFormData({...formData, obra_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar obra...</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.id}>{o.nombre || o.obra || `Obra #${o.id}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Proveedor</label>
                  <select 
                    value={formData.proveedor_id}
                    onChange={(e) => setFormData({...formData, proveedor_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre || p.razon_social || `Proveedor #${p.id}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descripción del Servicio</label>
                <textarea 
                  rows="2"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="Detalles del mantenimiento..."
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Monto Mensual ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={formData.monto_mensual}
                  onChange={(e) => setFormData({...formData, monto_mensual: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de Fin</label>
                  <input 
                    type="date" 
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-md"
                >
                  {cargando ? 'Guardando...' : 'Guardar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}