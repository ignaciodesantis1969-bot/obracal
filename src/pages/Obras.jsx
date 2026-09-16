// src/pages/Obras.jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2, Calculator } from 'lucide-react';
// 🔑 FIX: eliminado import de GOOGLE_SCRIPT_URL (ya no se usa)
// 🔑 NUEVO: lectura/escritura directo a Firestore
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';

export default function Obras() {
  // 🔑 NUEVO: leemos DOS colecciones en paralelo (obras + clientes)
  // `clientes` se usa para mostrar el nombre del cliente y armar el código CL###-OB###
  const { data: obras, loading: loadingObras, error: errorObras } = useFirestoreCollection('obras');
  const { data: clientes, loading: loadingClientes, error: errorClientes } = useFirestoreCollection('clientes');

  const isLoading = loadingObras || loadingClientes;
  const errorFirestore = errorObras || errorClientes;

  const [isSaving, setIsSaving] = useState(false); // 🛡️ bloqueo anti doble clic
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nuevaObra, setNuevaObra] = useState({
    codigo: '',
    nombre: '',
    cliente_id: '',
    direccion: '',
    ciudad: '',
    estado: 'en_ejecucion',
    fecha_de_inicio: '',
    notas: ''
  });

  // 🔑 NUEVO: autogenera OB### basándose en las obras existentes
  const generarProximoCodigo = (listaObras) => {
    if (!listaObras || listaObras.length === 0) return 'OB001';

    let maxNum = 0;
    listaObras.forEach(o => {
      const cod = String(o.codigo || '').toUpperCase().trim();
      // Acepta "OB001", "OB1", "OB-001", etc.
      const match = cod.match(/^OB-?0*(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `OB${String(maxNum + 1).padStart(3, '0')}`;
  };

  // 🔑 NUEVO: cuando se abre el modal de "Nueva Obra", autogenera el código
  useEffect(() => {
    if (isFormOpen && !editingId && obras.length > 0 && !nuevaObra.codigo) {
      setNuevaObra(prev => ({
        ...prev,
        codigo: generarProximoCodigo(obras)
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormOpen, editingId, obras]);

  // 🔑 FIX: cliente_id sigue guardándose como string del doc.id del cliente
  // Función para armar el código completo visualmente (ej: CL002-OB001)
  const obtenerCodigoCompleto = (obra) => {
    const cliente = clientes.find(c => String(c.id) === String(obra.cliente_id));
    const codCliente = cliente && cliente.codigo ? cliente.codigo : 'CL00X';
    let codObra = obra.codigo || 'OB001';

    if (codObra.includes('-')) {
      return codObra;
    }
    return `${codCliente}-${codObra}`;
  };

  const handleClienteChange = (e) => {
    const nuevoClienteId = e.target.value;
    setNuevaObra({
      ...nuevaObra,
      cliente_id: nuevoClienteId
    });
  };

  const handleAbrirFormularioNuevo = () => {
    setEditingId(null);
    setNuevaObra({
      codigo: generarProximoCodigo(obras),
      nombre: '',
      cliente_id: '',
      direccion: '',
      ciudad: '',
      estado: 'en_ejecucion',
      fecha_de_inicio: '',
      notas: ''
    });
    setIsFormOpen(true);
  };

  const handleEditarClick = (obra) => {
    setEditingId(obra.id);
    setNuevaObra({
      codigo: obra.codigo || '',
      nombre: obra.nombre || '',
      cliente_id: obra.cliente_id || '',
      direccion: obra.direccion || '',
      ciudad: obra.ciudad || '',
      estado: obra.estado || 'en_ejecucion',
      fecha_de_inicio: obra.fecha_de_inicio ? String(obra.fecha_de_inicio).split('T')[0] : '',
      notas: obra.notas || ''
    });
    setIsFormOpen(true);
  };

  // 🔑 FIX: guardado directo a Firestore
  // 🛡️ bloqueo anti doble clic con isSaving
  const handleGuardar = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    try {
      // 🔑 FIX: limpiar campos internos de Firestore antes de escribir
      const { _creadoEn, _actualizadoEn, id, ...datosLimpios } = nuevaObra;

      if (editingId) {
        await actualizarDoc('obras', editingId, datosLimpios);
      } else {
        await crearDoc('obras', datosLimpios);
      }

      setNuevaObra({ codigo: '', nombre: '', cliente_id: '', direccion: '', ciudad: '', estado: 'en_ejecucion', fecha_de_inicio: '', notas: '' });
      setEditingId(null);
      setIsFormOpen(false);
      // Firestore actualiza la lista en tiempo real vía onSnapshot.
    } catch (err) {
      console.error(err);
      alert("Error al guardar: " + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  // 🔑 FIX: eliminación directo a Firestore
  const handleEliminar = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar esta obra?")) return;
    try {
      await eliminarDoc('obras', id);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar: " + (err.message || ''));
    }
  };

  const obtenerNombreCliente = (clienteId) => {
    const clienteEncontrado = clientes.find(c => String(c.id) === String(clienteId));
    if (clienteEncontrado) {
      return clienteEncontrado.razon_social || clienteEncontrado.nombre || `Cliente #${clienteId}`;
    }
    return clienteId ? `Cliente #${clienteId}` : '—';
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    try {
      const soloFecha = String(fechaStr).split('T')[0];
      const partes = soloFecha.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      return fechaStr;
    } catch (e) {
      return fechaStr;
    }
  };

  const obrasFiltradas = obras.filter(o => {
    const term = searchTerm.toLowerCase();
    const clienteNombre = obtenerNombreCliente(o.cliente_id).toLowerCase();
    const codigoCompleto = obtenerCodigoCompleto(o).toLowerCase();
    return (
      (o.nombre || '').toLowerCase().includes(term) ||
      codigoCompleto.includes(term) ||
      (o.ciudad || '').toLowerCase().includes(term) ||
      clienteNombre.includes(term)
    );
  });

  const error = errorFirestore ? 'Error al conectar con Firestore.' : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Obras</h1>
          <p className="text-slate-500 text-sm mt-1">{obras.length} obras registradas</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={isFormOpen ? () => setIsFormOpen(false) : handleAbrirFormularioNuevo}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors w-full sm:w-auto shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva Obra
          </button>
        </div>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {isFormOpen && (
        <div className="bg-slate-200/90 p-6 rounded-xl border border-slate-400 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <h2 className="text-base font-semibold mb-4 text-slate-800 flex items-center justify-between">
            <span>{editingId ? 'Modificar Obra' : 'Registrar Nueva Obra'}</span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-300 px-2.5 py-1 rounded-md border border-slate-400">
              {editingId ? 'Modo Edición' : 'Nuevo Registro'}
            </span>
          </h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              required
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.cliente_id}
              onChange={handleClienteChange}
            >
              <option value="">Seleccionar Cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo ? `${c.codigo} - ` : ''}{c.razon_social || c.nombre}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Código de Obra"
              required
              readOnly
              className="bg-slate-100 border border-slate-300 text-slate-500 font-bold rounded-lg px-3 py-2 text-sm focus:outline-none shadow-sm cursor-not-allowed"
              value={nuevaObra.codigo}
              title="El código se genera automáticamente"
            />

            <input
              type="text"
              placeholder="Nombre de la Obra"
              required
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.nombre}
              onChange={(e) => setNuevaObra({ ...nuevaObra, nombre: e.target.value })}
            />

            <input
              type="text"
              placeholder="Dirección"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.direccion}
              onChange={(e) => setNuevaObra({ ...nuevaObra, direccion: e.target.value })}
            />

            <input
              type="text"
              placeholder="Ciudad"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.ciudad}
              onChange={(e) => setNuevaObra({ ...nuevaObra, ciudad: e.target.value })}
            />

            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.estado}
              onChange={(e) => setNuevaObra({ ...nuevaObra, estado: e.target.value })}
            >
              <option value="en_ejecucion">En Ejecución</option>
              <option value="en_presupuesto">En Presupuesto</option>
              <option value="finalizada">Finalizada</option>
              <option value="pausada">Pausada</option>
            </select>

            <input
              type="date"
              placeholder="Fecha de Inicio"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.fecha_de_inicio}
              onChange={(e) => setNuevaObra({ ...nuevaObra, fecha_de_inicio: e.target.value })}
            />

            <input
              type="text"
              placeholder="Notas adicionales"
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-4 focus:outline-none focus:border-amber-500 shadow-sm"
              value={nuevaObra.notas}
              onChange={(e) => setNuevaObra({ ...nuevaObra, notas: e.target.value })}
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
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Guardando...' : (editingId ? 'Actualizar Obra' : 'Guardar Obra')}
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
              placeholder="Buscar por nombre, código, cliente, ciudad..."
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
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4">Inicio</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="text-sm">Cargando obras...</span>
                    </div>
                  </td>
                </tr>
              ) : obrasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                    No se encontraron obras que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                obrasFiltradas.map((o, i) => (
                  <tr key={o.id || i} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-blue-600 text-sm">{obtenerCodigoCompleto(o)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800 text-sm">{o.nombre || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-700 font-medium text-sm">{obtenerNombreCliente(o.cliente_id)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 text-sm">
                        {o.direccion ? `${o.direccion}${o.ciudad ? `, ${o.ciudad}` : ''}` : (o.ciudad || '—')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-600 text-sm">{formatearFecha(o.fecha_de_inicio)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        String(o.estado || '').toLowerCase() === 'en_ejecucion'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {o.estado ? o.estado.replace('_', ' ').toUpperCase() : 'EN EJECUCIÓN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`/presupuestos?obra=${o.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-slate-200 bg-white"
                          title="Ver Presupuestos de la Obra"
                        >
                          <Calculator className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleEditarClick(o)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors border border-slate-200 bg-white"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(o.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-slate-200 bg-white"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}