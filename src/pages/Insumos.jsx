import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Loader2 } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function Insumos() {
  const [insumos, setInsumos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 🛡️ ESTADO DE BLOQUEO CONTRA CLICS MÚLTIPLES (DUPLICACIÓN)
  const [isSaving, setIsSaving] = useState(false);

  const [nuevoInsumo, setNuevoInsumo] = useState({ 
    codigo: '', 
    nombre: '', 
    tipo: 'Material', 
    proveedor_id: '', 
    unidad: 'un', 
    costo_unitario: '', 
    estado: 'activo'
  });



  const cargarDatos = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [resInsumos, resProveedores] = await Promise.all([
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Insumos', action: 'list' })
        }),
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Proveedores', action: 'list' })
        })
      ]);

      const dataInsumos = await resInsumos.json();
      const dataProveedores = await resProveedores.json();

      setInsumos(Array.isArray(dataInsumos) ? dataInsumos : []);
      setProveedores(Array.isArray(dataProveedores) ? dataProveedores : []);
    } catch (err) {
      setError('Error al conectar con Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const generarCodigoAutomatico = (listaInsumos) => {
    const num = listaInsumos.length + 1;
    return `INS${String(num).padStart(3, '0')}`;
  };

  const obtenerCodigosSeparados = (insumo) => {
    const proveedor = proveedores.find(p => String(p.id) === String(insumo.proveedor_id));
    const codProveedor = proveedor && proveedor.codigo ? proveedor.codigo : 'PR000X';
    let codInsumo = insumo.codigo || 'INS001';
    if (codInsumo.includes('-')) {
      const parts = codInsumo.split('-');
      return { prov: parts[0], ins: parts.slice(1).join('-') };
    }
    return { prov: codProveedor, ins: codInsumo };
  };

  const obtenerClaseTipo = (tipo) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('material')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (t.includes('mano')) return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (t.includes('gastos') || t.includes('general')) return 'bg-purple-100 text-purple-800 border border-purple-200';
    if (t.includes('subcontrato')) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-slate-100 text-slate-800 border border-slate-200';
  };

  const handleEditarClick = (insumo) => {
    setEditingId(insumo.id);
    setNuevoInsumo({
      codigo: insumo.codigo || generarCodigoAutomatico(insumos),
      nombre: insumo.nombre || insumo.insumo || insumo.descripcion || '',
      tipo: insumo.tipo || insumo.categoria || 'Material',
      proveedor_id: insumo.proveedor_id || '',
      unidad: insumo.unidad || 'un',
      costo_unitario: insumo.costo_unitario || insumo.costo || insumo.precio || '',
      estado: insumo.estado || 'activo'
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
        tabla: 'Insumos', 
        action: action, 
        data: {
          ...nuevoInsumo,
          categoria: nuevoInsumo.tipo
        } 
      };
      if (editingId) bodyPayload.id = editingId;

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyPayload)
      });
      const res = await response.json();
      if (res.success || res) {
        setNuevoInsumo({ codigo: '', nombre: '', tipo: 'Material', proveedor_id: '', unidad: 'un', costo_unitario: '', estado: 'activo' });
        setEditingId(null);
        setIsFormOpen(false);
        cargarDatos();
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
    if (window.confirm("¿Estás seguro de eliminar este insumo?")) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Insumos', action: 'delete', id })
        });
        cargarDatos();
      } catch (err) {
        alert("Error al eliminar.");
      }
    }
  };

  const obtenerNombreProveedor = (proveedorId) => {
    const prov = proveedores.find(p => String(p.id) === String(proveedorId));
    return prov ? (prov.razon_social || prov.nombre) : '—';
  };

  const totalMaterial = insumos.filter(i => (i.tipo || i.categoria || '').toLowerCase() === 'material').length;
  const totalManoDeObra = insumos.filter(i => (i.tipo || i.categoria || '').toLowerCase().includes('mano')).length;
  const totalEquipo = insumos.filter(i => {
    const t = (i.tipo || i.categoria || '').toLowerCase();
    return t.includes('equipo') || t.includes('maquinaria');
  }).length;
  const totalGastosGenerales = insumos.filter(i => {
    const t = (i.tipo || i.categoria || '').toLowerCase();
    return t.includes('gastos') || t.includes('general');
  }).length;
  const totalSubcontrato = insumos.filter(i => {
    const t = (i.tipo || i.categoria || '').toLowerCase();
    return t.includes('subcontrato');
  }).length;

  const insumosFiltrados = insumos.filter(i => {
    const term = searchTerm.toLowerCase();
    const nombreInsumo = (i.nombre || i.insumo || i.descripcion || '').toLowerCase();
    const tipoInsumo = (i.tipo || i.categoria || '').toLowerCase();
    const proveedorNombre = obtenerNombreProveedor(i.proveedor_id).toLowerCase();
    const { prov, ins } = obtenerCodigosSeparados(i);
    const codigoCompleto = `${prov}-${ins}`.toLowerCase();
    
    const coincideBusqueda = nombreInsumo.includes(term) || codigoCompleto.includes(term) || proveedorNombre.includes(term) || tipoInsumo.includes(term);
    const coincideFiltroTipo = filtroTipo ? tipoInsumo.includes(filtroTipo.toLowerCase()) : true;
    const coincideFiltroProveedor = filtroProveedor ? String(i.proveedor_id) === String(filtroProveedor) : true;
    
    return coincideBusqueda && coincideFiltroTipo && coincideFiltroProveedor;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insumos y Gastos Generales</h1>
          <p className="text-slate-500 text-sm mt-1">{insumos.length} insumos registrados</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => { 
              setEditingId(null); 
              setNuevoInsumo({ 
                codigo: generarCodigoAutomatico(insumos), 
                nombre: '', 
                tipo: 'Material', 
                proveedor_id: '', 
                unidad: 'un', 
                costo_unitario: '', 
                estado: 'activo' 
              });
              setIsFormOpen(!isFormOpen); 
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors flex-1 sm:flex-none shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Insumo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm"><p className="text-[11px] font-bold text-slate-500 uppercase">Material</p><h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalMaterial}</h3></div>
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm"><p className="text-[11px] font-bold text-slate-500 uppercase">Mano de Obra</p><h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalManoDeObra}</h3></div>
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm"><p className="text-[11px] font-bold text-slate-500 uppercase">Equipo / Maquinaria</p><h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalEquipo}</h3></div>
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm"><p className="text-[11px] font-bold text-slate-500 uppercase">Gastos Generales</p><h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalGastosGenerales}</h3></div>
        <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm"><p className="text-[11px] font-bold text-slate-500 uppercase">Subcontrato</p><h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalSubcontrato}</h3></div>
      </div>

      {isFormOpen && (
        <div className="bg-slate-200/90 p-6 rounded-xl border border-slate-400 shadow-md">
          <h2 className="text-base font-semibold mb-4 text-slate-800 flex justify-between">
            <span>{editingId ? 'Modificar Insumo' : 'Registrar Nuevo Insumo'}</span>
          </h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={nuevoInsumo.proveedor_id}
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, proveedor_id: e.target.value })}
            >
              <option value="">Seleccionar Proveedor (Opcional)...</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} - ` : ''}{p.razon_social || p.nombre}</option>
              ))}
            </select>
            <input 
              type="text" 
              placeholder="Código automático" 
              required
              readOnly
              className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 cursor-not-allowed"
              value={nuevoInsumo.codigo} 
            />
            <input 
              type="text" 
              placeholder="Nombre / Descripción" 
              required 
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm md:col-span-2"
              value={nuevoInsumo.nombre} 
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })} 
            />
            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold"
              value={nuevoInsumo.tipo}
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, tipo: e.target.value })}
            >
              <option value="Material">Material</option>
              <option value="Mano de Obra">Mano de Obra</option>
              <option value="Equipo/Maquinaria">Equipo/Maquinaria</option>
              <option value="Gastos Generales">Gastos Generales</option>
              <option value="Subcontrato">Subcontrato</option>
            </select>
            <input 
              type="text" 
              placeholder="Unidad (ej. un, m2, mes)" 
              required
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={nuevoInsumo.unidad} 
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, unidad: e.target.value })} 
            />
            <input 
              type="number" 
              step="0.01"
              placeholder="Costo Unitario ($)" 
              required
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-600"
              value={nuevoInsumo.costo_unitario} 
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, costo_unitario: e.target.value })} 
            />
            <select
              className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={nuevoInsumo.estado}
              onChange={(e) => setNuevoInsumo({ ...nuevoInsumo, estado: e.target.value })}
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="md:col-span-4 flex justify-end gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => { setIsFormOpen(false); setEditingId(null); }} 
                disabled={isSaving}
                className="px-4 py-2 text-slate-700 text-sm font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando...</> : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-white flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar insumo o gasto general..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-amber-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={filtroProveedor}
              onChange={(e) => setFiltroProveedor(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500 font-semibold"
            >
              <option value="">Todos los proveedores</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.razon_social || p.nombre}</option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-500 font-semibold"
            >
              <option value="">Todos los tipos</option>
              <option value="Material">Material</option>
              <option value="Mano de Obra">Mano de Obra</option>
              <option value="Equipo/Maquinaria">Equipo/Maquinaria</option>
              <option value="Gastos Generales">Gastos Generales</option>
              <option value="Subcontrato">Subcontrato</option>
            </select>
          </div>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 text-sm text-center">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 text-xs font-semibold text-slate-600 uppercase border-b">
                <th className="w-[11%] px-4 py-4">Código</th>
                <th className="w-[28%] px-4 py-4">Nombre / Descripción</th>
                <th className="w-[14%] px-4 py-4">Tipo / Categoría</th>
                <th className="w-[17%] px-4 py-4">Proveedor</th>
                <th className="w-[8%] px-3 py-4">Unidad</th>
                <th className="w-[12%] px-4 py-4 text-right">Costo Unitario</th>
                <th className="w-[5%] px-2 py-4 text-center">Estado</th>
                <th className="w-[5%] px-2 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500"/></td></tr>
              ) : insumosFiltrados.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 text-sm">No se encontraron insumos.</td></tr>
              ) : (
                insumosFiltrados.map((i, idx) => {
                  const { prov, ins } = obtenerCodigosSeparados(i);
                  const nombreProveedor = obtenerNombreProveedor(i.proveedor_id);
                  const tipoActual = i.tipo || i.categoria || 'Material';
                  const nombreInsumo = i.nombre || i.insumo || i.descripcion || '—';
                  const costoUnit = i.costo_unitario || i.costo || i.precio || 0;

                  return (
                    <tr key={i.id || idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="w-[11%] px-4 py-4 whitespace-nowrap">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{prov}</div>
                        <div className="font-bold text-blue-600 text-xs mt-0.5">{ins}</div>
                      </td>
                      <td className="w-[28%] px-4 py-4">
                        <span className="font-semibold text-slate-800 text-sm break-words block">{nombreInsumo}</span>
                      </td>
                      <td className="w-[14%] px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${obtenerClaseTipo(tipoActual)}`}>
                          {tipoActual}
                        </span>
                      </td>
                      <td className="w-[17%] px-4 py-4">
                        <span className="text-slate-700 text-sm truncate block" title={nombreProveedor}>{nombreProveedor}</span>
                      </td>
                      <td className="w-[8%] px-3 py-4 whitespace-nowrap">
                        <span className="text-slate-600 uppercase text-xs font-semibold bg-slate-100 px-2 py-1 rounded border inline-block">{i.unidad || '—'}</span>
                      </td>
                      <td className="w-[12%] px-4 py-4 text-right whitespace-nowrap">
                        <span className="font-bold text-amber-600 text-sm">$ {costoUnit ? Number(costoUnit).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '0,00'}</span>
                      </td>
                      <td className="w-[5%] px-2 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">{i.estado || 'Activo'}</span>
                      </td>
                      <td className="w-[5%] px-2 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditarClick(i)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded-md shadow-sm" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminar(i.id)} className="p-1.5 text-slate-500 hover:text-red-600 bg-white border rounded-md shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
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