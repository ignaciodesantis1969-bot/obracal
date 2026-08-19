import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, X, Filter } from 'lucide-react';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRubro, setSelectedRubro] = useState(''); // Estado para el filtro por rubro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);

  const [nuevoProveedor, setNuevoProveedor] = useState({
    codigo: '',
    razon_social: '',
    rubro: '',
    cuit: '',
    telefono: '',
    email: '',
    contacto: ''
  });

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXN_38YE0WIX1QHT915n9rJOnQPYeH3npgJ49E7T_OJFyP70eyB0NaD3mXr9yeYMlfzQ/exec";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'cargarDetalleCompleto' }) 
      });

      const data = await response.json();
      const listaProv = data.proveedores || data.Proveedores || [];
      setProveedores(Array.isArray(listaProv) ? listaProv : []);

      const codigoSugerido = generarCodigoAutomatico(listaProv);
      setNuevoProveedor(prev => ({ ...prev, codigo: codigoSugerido }));
    } catch (err) {
      console.error("Error al cargar proveedores:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generarCodigoAutomatico = (lista) => {
    let maxNum = 0;
    (lista || []).forEach(p => {
      const cod = String(p.codigo || '');
      const match = cod.match(/(?:PR|PV)(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `PR${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const codigoActual = generarCodigoAutomatico(proveedores);
      const proveedorConCodigo = { ...nuevoProveedor, codigo: codigoActual, estado: 'Activo' };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Proveedores',
          action: 'create',
          data: proveedorConCodigo
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNuevoProveedor({ codigo: '', razon_social: '', rubro: '', cuit: '', telefono: '', email: '', contacto: '' });
        fetchData();
      } else {
        alert("Error al crear proveedor: " + (data.error || ''));
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de conexión al crear.");
    }
  };

  const handleActualizar = async (e) => {
    e.preventDefault();
    if (!editingProveedor) return;

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Proveedores',
          action: 'update',
          id: editingProveedor.id,
          data: editingProveedor
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        setEditingProveedor(null);
        fetchData();
      } else {
        alert("Error al actualizar proveedor: " + (data.error || ''));
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de conexión al actualizar.");
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este proveedor?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Proveedores', action: 'delete', id })
      });
      fetchData();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  // Obtener lista única de rubros para el desplegable de filtro
  const rubrosUnicos = [...new Set(proveedores.map(p => String(p.rubro || p.Rubro || '').trim()).filter(Boolean))].sort();

  // Filtrado combinado por texto y por rubro seleccionado
  const proveedoresFiltrados = proveedores.filter(p => {
    const razonSocial = String(p.razon_social || p.nombre || '').toLowerCase();
    const rubro = String(p.rubro || p.Rubro || '').trim();
    const codigo = String(p.codigo || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch = razonSocial.includes(query) || rubro.toLowerCase().includes(query) || codigo.includes(query);
    const matchesRubro = !selectedRubro || rubro.toLowerCase() === selectedRubro.toLowerCase();

    return matchesSearch && matchesRubro;
  });

  if (isLoading) {
    return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" /> <span className="text-sm text-slate-500 font-medium">Cargando proveedores...</span></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Proveedores</h1>
          <p className="text-slate-500 text-sm mt-1">Administración de proveedores, rubros y datos de contacto.</p>
        </div>
        <button
          onClick={() => {
            setNuevoProveedor({ codigo: generarCodigoAutomatico(proveedores), razon_social: '', rubro: '', cuit: '', telefono: '', email: '', contacto: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {/* Barra de Búsqueda y Filtro por Rubro */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* Buscador */}
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm w-full flex-1">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            type="text"
            placeholder="Buscar proveedor por código, razón social o rubro..."
            className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro por Rubro */}
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-300 shadow-sm w-full md:w-72 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedRubro}
            onChange={(e) => setSelectedRubro(e.target.value)}
            className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700 uppercase cursor-pointer"
          >
            <option value="">Todos los Rubros</option>
            {rubrosUnicos.map((rubro, idx) => (
              <option key={idx} value={rubro}>{rubro}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Proveedores */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {proveedoresFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No se encontraron proveedores registrados con los filtros aplicados.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Razón Social / Nombre</th>
                <th className="px-6 py-4">Rubro</th>
                <th className="px-6 py-4">CUIT</th>
                <th className="px-6 py-4">Teléfono / Email</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proveedoresFiltrados.map(p => {
                const razonSocialValor = p.razon_social || p.nombre || 'Sin nombre';
                const rubroValor = p.rubro || p.Rubro || 'General';
                const telefonoValor = p.telefono || 'Sin teléfono';
                const emailValor = p.email || 'Sin email';

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-blue-600">{p.codigo || '---'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{razonSocialValor}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-extrabold text-[11px] uppercase">
                        {rubroValor}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.cuit || '---'}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex flex-col">
                        <span>{telefonoValor}</span>
                        <span className="text-[11px] text-slate-400">{emailValor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingProveedor(p);
                            setIsEditModalOpen(true);
                          }}
                          className="p-2 text-slate-600 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-300 rounded-xl shadow-sm transition-all flex items-center justify-center"
                          title="Modificar Proveedor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEliminar(p.id)}
                          className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-300 rounded-xl shadow-sm transition-all flex items-center justify-center"
                          title="Eliminar Proveedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nuevo Proveedor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nuevo Proveedor</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código (Automático)</label>
                <input 
                  type="text"
                  required
                  readOnly
                  className="w-full bg-slate-100 border border-slate-300 text-blue-600 rounded-lg px-3 py-2 text-sm outline-none font-bold cursor-not-allowed"
                  value={nuevoProveedor.codigo}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Razón Social *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Corralón El Constructor S.A."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={nuevoProveedor.razon_social}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, razon_social: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Materiales de Construcción"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={nuevoProveedor.rubro}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, rubro: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIT</label>
                <input 
                  type="text"
                  placeholder="Ej: 30-12345678-9"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={nuevoProveedor.cuit}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, cuit: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input 
                    type="text"
                    placeholder="Ej: 11-2345-6789"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={nuevoProveedor.telefono}
                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, telefono: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase sm:truncate mb-1">Email</label>
                  <input 
                    type="email"
                    placeholder="contacto@proveedor.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={nuevoProveedor.email}
                    onChange={(e) => setNuevoProveedor({...nuevoProveedor, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contacto</label>
                <input 
                  type="text"
                  placeholder="Nombre de la persona de contacto"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={nuevoProveedor.contacto}
                  onChange={(e) => setNuevoProveedor({...nuevoProveedor, contacto: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modificar Proveedor */}
      {isEditModalOpen && editingProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Modificar Proveedor</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleActualizar} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código</label>
                <input 
                  type="text"
                  readOnly
                  className="w-full bg-slate-100 border border-slate-300 text-blue-600 rounded-lg px-3 py-2 text-sm outline-none font-bold cursor-not-allowed"
                  value={editingProveedor.codigo || ''}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Razón Social *</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={editingProveedor.razon_social || editingProveedor.nombre || ''}
                  onChange={(e) => setEditingProveedor({...editingProveedor, razon_social: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro *</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={editingProveedor.rubro || editingProveedor.Rubro || ''}
                  onChange={(e) => setEditingProveedor({...editingProveedor, rubro: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIT</label>
                <input 
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={editingProveedor.cuit || ''}
                  onChange={(e) => setEditingProveedor({...editingProveedor, cuit: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input 
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={editingProveedor.telefono || ''}
                    onChange={(e) => setEditingProveedor({...editingProveedor, telefono: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase sm:truncate mb-1">Email</label>
                  <input 
                    type="email"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={editingProveedor.email || ''}
                    onChange={(e) => setEditingProveedor({...editingProveedor, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contacto</label>
                <input 
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={editingProveedor.contacto || ''}
                  onChange={(e) => setEditingProveedor({...editingProveedor, contacto: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Actualizar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}