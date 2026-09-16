// src/pages/Proveedores.jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, X, Filter } from 'lucide-react';
// 🔑 FIX: eliminado import de GOOGLE_SCRIPT_URL (ya no se usa)
// 🔑 NUEVO: lectura/escritura directo a Firestore
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';

export default function Proveedores() {
  // 🔑 NUEVO: lectura en tiempo real desde Firestore (colección `proveedores`)
  const { data: proveedores, loading: isLoading, error: errorFirestore } = useFirestoreCollection('proveedores');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRubro, setSelectedRubro] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState(null);

  // 🛡️ ESTADOS DE BLOQUEO CONTRA CLICS MÚLTIPLES (DUPLICACIÓN)
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [isSavingUpdate, setIsSavingUpdate] = useState(false);

  const [nuevoProveedor, setNuevoProveedor] = useState({
    codigo: '',
    razon_social: '',
    rubro: '',
    cuit: '',
    telefono: '',
    email: '',
    contacto: ''
  });

  // 🔑 NUEVO: autogenera PR### basándose en los proveedores existentes
  // Formato: PR001, PR002, PR003...  (acepta también PV### por compatibilidad)
  const generarCodigoAutomatico = (lista) => {
    let maxNum = 0;
    (lista || []).forEach(p => {
      const cod = String(p.codigo || '').trim();
      const match = cod.match(/^(?:PR|PV)-?0*(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `PR${String(maxNum + 1).padStart(3, '0')}`;
  };

  // 🔑 NUEVO: cuando el usuario abre el modal de "Nuevo Proveedor",
  // se autogenera el código. Al editar, se respeta el que ya tenía.
  useEffect(() => {
    if (isModalOpen && proveedores.length > 0 && !nuevoProveedor.codigo) {
      setNuevoProveedor(prev => ({
        ...prev,
        codigo: generarCodigoAutomatico(proveedores)
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, proveedores]);

  // 🔑 FIX: creación directo a Firestore (sin fetch al Apps Script)
  const handleCrear = async (e) => {
    e.preventDefault();
    if (isSavingCreate) return;

    setIsSavingCreate(true);
    try {
      const codigoActual = generarCodigoAutomatico(proveedores);
      const proveedorConCodigo = {
        ...nuevoProveedor,
        codigo: codigoActual,
        estado: 'Activo'
      };
      // 🔑 FIX: limpiar campos internos de Firestore (los que empiezan con _)
      const { _creadoEn, _actualizadoEn, id, ...datosLimpios } = proveedorConCodigo;

      await crearDoc('proveedores', datosLimpios);

      setIsModalOpen(false);
      setNuevoProveedor({ codigo: '', razon_social: '', rubro: '', cuit: '', telefono: '', email: '', contacto: '' });
      // Firestore actualiza la lista en tiempo real vía onSnapshot.
    } catch (err) {
      console.error("Error:", err);
      alert("Error al crear proveedor: " + (err.message || ''));
    } finally {
      setIsSavingCreate(false);
    }
  };

  // 🔑 FIX: actualización directo a Firestore
  const handleActualizar = async (e) => {
    e.preventDefault();
    if (!editingProveedor || isSavingUpdate) return;

    setIsSavingUpdate(true);
    try {
      // 🔑 FIX: limpiar campos internos (_creadoEn, _actualizadoEn) y el id antes de actualizar
      const { _creadoEn, _actualizadoEn, id, ...datosLimpios } = editingProveedor;

      await actualizarDoc('proveedores', id, datosLimpios);

      setIsEditModalOpen(false);
      setEditingProveedor(null);
      // Firestore actualiza la lista en tiempo real.
    } catch (err) {
      console.error("Error:", err);
      alert("Error al actualizar proveedor: " + (err.message || ''));
    } finally {
      setIsSavingUpdate(false);
    }
  };

  // 🔑 FIX: eliminación directo a Firestore
  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este proveedor?")) return;
    try {
      await eliminarDoc('proveedores', id);
      // Firestore actualiza la lista en tiempo real.
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert("Error al eliminar: " + (err.message || ''));
    }
  };

  // Obtener lista única de rubros para el desplegable de filtro
  const rubrosUnicos = [...new Set(
    proveedores.map(p => String(p.rubro || p.Rubro || '').trim()).filter(Boolean)
  )].sort();

  // Filtrado combinado por texto y por rubro seleccionado
  const proveedoresFiltrados = proveedores.filter(p => {
    const razonSocial = String(p.razon_social || p.nombre || '').toLowerCase();
    const rubro = String(p.rubro || p.Rubro || '').trim();
    const codigo = String(p.codigo || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      razonSocial.includes(query) ||
      rubro.toLowerCase().includes(query) ||
      codigo.includes(query);
    const matchesRubro = !selectedRubro || rubro.toLowerCase() === selectedRubro.toLowerCase();

    return matchesSearch && matchesRubro;
  });

  const error = errorFirestore ? 'Error al conectar con Firestore.' : '';

  if (isLoading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" />
        <span className="text-sm text-slate-500 font-medium">Cargando proveedores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Proveedores</h1>
          <p className="text-slate-500 text-sm mt-1">
            Administración de proveedores, rubros y datos de contacto. ({proveedores.length} registrados)
          </p>
        </div>
        <button
          onClick={() => {
            setNuevoProveedor({
              codigo: generarCodigoAutomatico(proveedores),
              razon_social: '',
              rubro: '',
              cuit: '',
              telefono: '',
              email: '',
              contacto: ''
            });
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

      {error && (
        <div className="p-4 bg-red-50 text-red-600 text-sm text-center border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {/* Tabla de Proveedores */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {proveedoresFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No se encontraron proveedores registrados con los filtros aplicados.
          </div>
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
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
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
                  onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, razon_social: e.target.value })}
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
                  onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, rubro: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIT</label>
                <input
                  type="text"
                  placeholder="Ej: 30-12345678-9"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={nuevoProveedor.cuit}
                  onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, cuit: e.target.value })}
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
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase sm:truncate mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contacto@proveedor.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={nuevoProveedor.email}
                    onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, email: e.target.value })}
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
                  onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingCreate}
                  className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCreate}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  {isSavingCreate ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar Proveedor'}
                </button>
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
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
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
                  onChange={(e) => setEditingProveedor({ ...editingProveedor, razon_social: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rubro *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={editingProveedor.rubro || editingProveedor.Rubro || ''}
                  onChange={(e) => setEditingProveedor({ ...editingProveedor, rubro: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIT</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={editingProveedor.cuit || ''}
                  onChange={(e) => setEditingProveedor({ ...editingProveedor, cuit: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={editingProveedor.telefono || ''}
                    onChange={(e) => setEditingProveedor({ ...editingProveedor, telefono: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase sm:truncate mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                    value={editingProveedor.email || ''}
                    onChange={(e) => setEditingProveedor({ ...editingProveedor, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contacto</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-slate-400 font-semibold"
                  value={editingProveedor.contacto || ''}
                  onChange={(e) => setEditingProveedor({ ...editingProveedor, contacto: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingUpdate}
                  className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUpdate}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                >
                  {isSavingUpdate ? <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</> : 'Actualizar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}