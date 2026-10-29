// src/pages/Inventario.jsx
import { useState, useMemo } from 'react';
import { Package, Search, MapPin, User, Plus, Edit2, Trash2, Loader2, DollarSign, TrendingDown } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';

export default function Inventario() {
  const { data: inventario, loading } = useFirestoreCollection('inventario');

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estado del formulario con los campos nuevos
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    tipo: 'Herramienta Manual',
    descripcion: '',
    estado: 'en_obra',
    costo_inicial: '',
    depreciacion_anual: ''
  });

  const inventarioFiltrado = useMemo(() => {
    if (!inventario) return [];
    const term = searchTerm.toLowerCase();
    return inventario.filter(item => 
      (item.nombre || '').toLowerCase().includes(term) ||
      (item.codigo || '').toLowerCase().includes(term) ||
      (item.tipo || '').toLowerCase().includes(term) ||
      (item.encargado || '').toLowerCase().includes(term)
    );
  }, [inventario, searchTerm]);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        nombre: item.nombre || '',
        codigo: item.codigo || '',
        tipo: item.tipo || 'Herramienta Manual',
        descripcion: item.descripcion || '',
        estado: item.estado || 'en_obra',
        costo_inicial: item.costo_inicial || '',
        depreciacion_anual: item.depreciacion_anual || ''
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', codigo: '', tipo: 'Herramienta Manual', descripcion: '', estado: 'en_obra', costo_inicial: '', depreciacion_anual: '' });
    }
    setIsFormOpen(true);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Convertimos los valores a números antes de guardar
      const datosLimpios = {
        ...formData,
        costo_inicial: Number(formData.costo_inicial) || 0,
        depreciacion_anual: Number(formData.depreciacion_anual) || 0
      };

      if (editingId) {
        await actualizarDoc('inventario', editingId, datosLimpios);
      } else {
        await crearDoc('inventario', { ...datosLimpios, fecha_registro: new Date().toISOString() });
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta herramienta del inventario?")) return;
    try {
      await eliminarDoc('inventario', id);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar: " + (err.message || ''));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" /> Inventario de Obra
          </h1>
          <p className="text-slate-500 text-sm mt-1">Herramientas y máquinas registradas en obra</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Herramienta
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {isFormOpen && (
        <div className="bg-slate-200/90 p-6 rounded-xl border border-slate-400 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <h2 className="text-base font-semibold mb-4 text-slate-800 flex items-center justify-between">
            <span>{editingId ? 'Modificar Herramienta' : 'Registrar Nueva Herramienta'}</span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-300 px-2.5 py-1 rounded-md border border-slate-400">
              {editingId ? 'Modo Edición' : 'Nuevo Registro'}
            </span>
          </h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Nombre de la Herramienta/Máquina"
              required
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm md:col-span-2"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
            <input
              type="text"
              placeholder="Código / Nro de Serie"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            />
            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="Herramienta Manual">Herramienta Manual</option>
              <option value="Máquina Eléctrica">Máquina Eléctrica</option>
              <option value="Equipo de Protección (EPP)">Equipo de Protección (EPP)</option>
              <option value="Otro">Otro</option>
            </select>
            <input
              type="text"
              placeholder="Descripción / Estado"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm md:col-span-3"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
            >
              <option value="en_obra">En Obra</option>
              <option value="en_deposito">En Depósito</option>
              <option value="en_reparacion">En Reparación</option>
              <option value="baja">De Baja</option>
            </select>

            {/* CAMPOS CONTABLES */}
            <input
              type="number"
              placeholder="Costo Inicial ($)"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={formData.costo_inicial}
              onChange={(e) => setFormData({ ...formData, costo_inicial: e.target.value })}
            />
            <input
              type="number"
              placeholder="Depreciación Anual ($)"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={formData.depreciacion_anual}
              onChange={(e) => setFormData({ ...formData, depreciacion_anual: e.target.value })}
            />

            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-slate-700 hover:bg-slate-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Guardando...' : (editingId ? 'Actualizar Herramienta' : 'Guardar Herramienta')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLA Y BUSCADOR */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, código, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-300">
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Herramienta / Máquina</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Costo Inicial</th>
                <th className="px-6 py-4">Deprec. Anual</th>
                <th className="px-6 py-4">Valor Neto</th>
                <th className="px-6 py-4">Registrado por</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-500">Cargando inventario...</td></tr>
              ) : inventarioFiltrado.length === 0 ? (
                <tr><td colSpan="10" className="px-6 py-12 text-center text-slate-500 text-sm">No hay herramientas registradas.</td></tr>
              ) : (
                inventarioFiltrado.map((item) => {
                  const costo = Number(item.costo_inicial) || 0;
                  const deprec = Number(item.depreciacion_anual) || 0;
                  const valorNeto = Math.max(0, costo - deprec);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        {item.foto_url ? (
                          <img src={item.foto_url} alt={item.nombre} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{item.nombre}</span>
                          <span className="text-xs text-slate-500">Cód: {item.codigo || '---'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                          {item.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          item.estado === 'en_obra' ? 'bg-emerald-100 text-emerald-800' :
                          item.estado === 'en_deposito' ? 'bg-blue-100 text-blue-800' :
                          item.estado === 'en_reparacion' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.estado?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        $ {costo.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-rose-600">
                        - $ {deprec.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-600">
                        $ {valorNeto.toLocaleString('es-AR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> {item.encargado?.split('@')[0] || '---'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {item.latitud && item.longitud ? (
                          <a 
                            href={`https://maps.google.com/?q=${item.latitud},${item.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <MapPin className="w-4 h-4" /> Ver Mapa
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">Sin GPS</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(item)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-slate-200 bg-white" title="Editar"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleEliminar(item.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-slate-200 bg-white" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
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