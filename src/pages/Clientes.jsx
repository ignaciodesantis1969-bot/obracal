import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Download, Loader2 } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 🛡️ ESTADO DE BLOQUEO CONTRA CLICS MÚLTIPLES (DUPLICACIÓN)
  const [isSaving, setIsSaving] = useState(false);

  // Incluimos 'direccion' en el estado del formulario
  const [nuevoCliente, setNuevoCliente] = useState({ 
    codigo: '', 
    razon_social: '', 
    cuit: '', 
    telefono: '', 
    email: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    estado: 'activo'
  });

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

  const cargarClientes = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Clientes', action: 'list' })
      });
      const data = await response.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Error al conectar con Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { cargarClientes(); }, []);

  const handleEditarClick = (cliente) => {
    setEditingId(cliente.id);
    setNuevoCliente({
      codigo: cliente.codigo || '',
      razon_social: cliente.razon_social || '',
      cuit: cliente.cuit || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
      provincia: cliente.provincia || '',
      estado: cliente.estado || 'activo'
    });
    setIsFormOpen(true);
  };

  // 🛡️ FUNCIÓN DE GUARDADO CON PROTECCIÓN CONTRA CLICS MÚLTIPLES
  const handleGuardar = async (e) => {
    e.preventDefault();
    if (isSaving) return; // Detiene clics adicionales si ya está enviando

    setIsSaving(true);
    try {
      const action = editingId ? 'update' : 'create';
      const bodyPayload = {
        tabla: 'Clientes',
        action: action,
        data: nuevoCliente
      };
      
      if (editingId) {
        bodyPayload.id = editingId;
      }

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyPayload)
      });
      
      const res = await response.json();
      if (res.success) {
        setNuevoCliente({ codigo: '', razon_social: '', cuit: '', telefono: '', email: '', direccion: '', ciudad: '', provincia: '', estado: 'activo' });
        setEditingId(null);
        setIsFormOpen(false);
        cargarClientes();
      } else {
        alert("Error al guardar: " + (res.error || "Desconocido"));
      }
    } catch (err) {
      alert("Error de conexión al intentar guardar.");
    } finally {
      setIsSaving(false); // 🔓 Libera el bloqueo al finalizar la petición
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este cliente?")) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Clientes', action: 'delete', id })
        });
        cargarClientes();
      } catch (err) {
        alert("Error al eliminar.");
      }
    }
  };

  const clientesFiltrados = clientes.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      (c.razon_social || '').toLowerCase().includes(term) ||
      (c.codigo || '').toLowerCase().includes(term) ||
      (c.ciudad || '').toLowerCase().includes(term) ||
      (c.direccion || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors flex-1 sm:flex-none shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button 
            onClick={() => { 
              setEditingId(null); 
              setNuevoCliente({ codigo: '', razon_social: '', cuit: '', telefono: '', email: '', direccion: '', ciudad: '', provincia: '', estado: 'activo' });
              setIsFormOpen(!isFormOpen); 
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors flex-1 sm:flex-none shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {isFormOpen && (
        <div className="bg-slate-200/90 p-6 rounded-xl border border-slate-400 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <h2 className="text-base font-semibold mb-4 text-slate-800 flex items-center justify-between">
            <span>{editingId ? 'Modificar Cliente' : 'Registrar Nuevo Cliente'}</span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-300 px-2.5 py-1 rounded-md border border-slate-400">
              {editingId ? 'Modo Edición' : 'Nuevo Registro'}
            </span>
          </h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input 
              type="text" 
              placeholder="Código (ej. CL005)" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.codigo} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, codigo: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="Razón Social" 
              required 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.razon_social} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, razon_social: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="CUIT" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.cuit} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, cuit: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="Dirección" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.direccion} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="Ciudad" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.ciudad} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, ciudad: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="Provincia" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.provincia} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, provincia: e.target.value })} 
            />
            <input 
              type="text" 
              placeholder="Teléfono" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.telefono} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} 
            />
            <input 
              type="email" 
              placeholder="Email" 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevoCliente.email} 
              onChange={(e) => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} 
            />
            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setEditingId(null); }} 
                disabled={isSaving}
                className="px-4 py-2 text-slate-700 hover:bg-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando...</> : (editingId ? 'Actualizar Cliente' : 'Guardar Cliente')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA Y BUSCADOR */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, dirección, ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 text-sm text-center border-b border-red-200">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-300">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Razón Social</th>
                <th className="px-6 py-4">Cuit</th>
                <th className="px-6 py-4">DIR/CIU/PROV</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="text-sm">Cargando clientes...</span>
                    </div>
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-500 text-sm">
                    No se encontraron clientes que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c, i) => {
                  // Combinar Dirección, Ciudad y Provincia limpiamente
                  const direccionCompleta = [c.direccion, c.ciudad, c.provincia].filter(Boolean).join(', ');

                  return (
                    <tr key={c.id || i} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-blue-600 text-sm">{c.codigo || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 text-sm">{c.razon_social || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 text-sm">{c.cuit || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-600 text-sm">
                          {direccionCompleta || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 text-sm">{c.telefono || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 text-sm">{c.email || '—'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          String(c.estado || 'activo').toLowerCase() === 'activo' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}>
                          {c.estado || 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditarClick(c)} 
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-slate-200 bg-white" 
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEliminar(c.id)} 
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-slate-200 bg-white" 
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}