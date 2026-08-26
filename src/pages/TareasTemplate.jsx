import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Copy, Search, Download, Loader2, FolderPlus, Clock, ChevronDown, ChevronUp, X, Filter } from 'lucide-react';

export default function TareasTemplate() {
  const [items, setItems] = useState([]);
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [rubrosList, setRubrosList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRubro, setSelectedRubro] = useState(''); // Estado para el filtro por rubro
  const [activeForm, setActiveForm] = useState(null); // 'tarea' o 'rubro'
  const [editingId, setEditingId] = useState(null);
  const [rubrosAbiertos, setRubrosAbiertos] = useState({});
  const [tareasAbiertas, setTareasAbiertas] = useState({});

  const [formData, setFormData] = useState({ 
    codigo: '', 
    rubro: '', 
    tarea: '', 
    unidad: 'm2', 
    descripcion: '',
    costo_estimado: 0, 
    hs_mo: '', 
    insumos_asociados: [],
    estado: 'activo'
  });

  const [busquedaInsumo, setBusquedaInsumo] = useState('');

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [resTareas, resInsumos, resRubros] = await Promise.all([
        fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'MaestroTareasRubros', action: 'list' }) }),
        fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Insumos', action: 'list' }) }),
        fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Rubros', action: 'list' }) })
      ]);
      
      const dataTareas = await resTareas.json();
      const dataInsumos = await resInsumos.json();
      const dataRubros = await resRubros.json();

      const itemsList = Array.isArray(dataTareas) ? dataTareas : [];
      setItems(itemsList);
      setInsumosDisponibles(Array.isArray(dataInsumos) ? dataInsumos : []);
      setRubrosList(Array.isArray(dataRubros) ? dataRubros : []);

      const rubrosUnicos = [...new Set([
        ...itemsList.map(i => String(i.rubro || 'GENERAL').toUpperCase()),
        ...dataRubros.map(r => String(r.nombre || r.Nombre || '').toUpperCase())
      ])].filter(Boolean);

      const inicialAbiertos = {};
      rubrosUnicos.forEach(r => inicialAbiertos[r] = true);
      setRubrosAbiertos(inicialAbiertos);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const obtenerClaseTipo = (tipo) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('material')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (t.includes('mano')) return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'bg-blue-100 text-blue-800 border border-blue-200';
    if (t.includes('subcontrato')) return 'bg-orange-100 text-orange-800 border border-orange-200';
    return 'bg-slate-100 text-slate-800 border border-slate-200';
  };

  const calcularTotales = (insumosAsociados) => {
    let costoTotal = 0;
    let totalHsMo = 0;
    const desglose = { Material: 0, 'Mano de Obra': 0, 'Equipo/Maquinaria': 0, Subcontrato: 0 };

    insumosAsociados.forEach(item => {
      const cantidad = Number(item.cantidad) || 0;
      const costoUnitario = Number(item.costo_unitario || item.precio || 0);
      const subtotal = cantidad * costoUnitario;
      costoTotal += subtotal;

      const tipo = item.tipo || 'Material';
      if (desglose[tipo] !== undefined) {
        desglose[tipo] += subtotal;
      } else {
        desglose['Material'] += subtotal;
      }

      if (tipo.toLowerCase().includes('mano')) {
        totalHsMo += cantidad;
      }
    });

    return { costoTotal, totalHsMo, desglose };
  };

  const { costoTotal, totalHsMo, desglose } = calcularTotales(formData.insumos_asociados);

  const handleAgregarInsumo = (insumo) => {
    if (formData.insumos_asociados.some(i => String(i.id) === String(insumo.id))) return;
    setFormData({
      ...formData,
      insumos_asociados: [...formData.insumos_asociados, { ...insumo, cantidad: 1 }]
    });
    setBusquedaInsumo('');
  };

  const handleCambiarCantidadInsumo = (id, cantidad) => {
    const nuevos = formData.insumos_asociados.map(i => {
      if (String(i.id) === String(id)) return { ...i, cantidad };
      return i;
    });
    setFormData({ ...formData, insumos_asociados: nuevos });
  };

  const handleQuitarInsumo = (id) => {
    const nuevos = formData.insumos_asociados.filter(i => String(i.id) !== String(id));
    setFormData({ ...formData, insumos_asociados: nuevos });
  };

  const handleEditarTarea = (item) => {
    let insumosParseados = [];
    try {
      if (item.insumos_detalle) {
        insumosParseados = typeof item.insumos_detalle === 'string' ? JSON.parse(item.insumos_detalle) : item.insumos_detalle;
      }
    } catch (e) {
      insumosParseados = [];
    }

    setEditingId(item.id);
    setFormData({
      codigo: item.codigo || '',
      rubro: item.rubro || '',
      tarea: item.tarea || '',
      unidad: item.unidad || 'm2',
      descripcion: item.descripcion || '',
      costo_estimado: item.costo_estimado || 0,
      hs_mo: item.hs_mo || '',
      insumos_asociados: insumosParseados,
      estado: item.estado || 'activo'
    });
    setActiveForm('tarea');
  };

  const handleDuplicarTarea = async (item) => {
    const nombreActual = item.tarea || '';
    const nuevoNombre = window.prompt("Ingrese el nombre para la nueva tarea duplicada:", `${nombreActual} (Copia)`);
    
    if (!nuevoNombre || !nuevoNombre.trim()) return;

    let insumosParseados = [];
    try {
      if (item.insumos_detalle) {
        insumosParseados = typeof item.insumos_detalle === 'string' ? JSON.parse(item.insumos_detalle) : item.insumos_detalle;
      }
    } catch (e) {
      insumosParseados = [];
    }

    setIsLoading(true);
    try {
      const itemADuplicar = {
        codigo: item.codigo || '',
        rubro: String(item.rubro || 'GENERAL').trim().toUpperCase(),
        tarea: nuevoNombre.trim(),
        unidad: item.unidad || 'm2',
        descripcion: item.descripcion || '',
        costo_estimado: item.costo_estimado || 0,
        hs_mo: item.hs_mo || '',
        insumos_detalle: JSON.stringify(insumosParseados),
        estado: item.estado || 'activo'
      };

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'MaestroTareasRubros', action: 'create', data: itemADuplicar })
      });
      const res = await response.json();

      if (res.success) {
        cargarDatos();
      } else {
        alert("Error al duplicar la tarea: " + (res.error || "Desconocido"));
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al duplicar la tarea.");
      setIsLoading(false);
    }
  };

  const generarCodigoRubroAutomatico = () => {
    if (!rubrosList || rubrosList.length === 0) return 'R001';
    let maxNum = 0;
    rubrosList.forEach(r => {
      const cod = String(r.codigo || r.Codigo || '');
      if (cod.startsWith('R')) {
        const num = parseInt(cod.replace('R', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `R${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (activeForm === 'rubro') {
      const nombreRubroUpper = (formData.rubro || '').trim().toUpperCase();
      if (!nombreRubroUpper) {
        alert("Ingrese un nombre de rubro válido.");
        return;
      }

      const codigoGenerado = generarCodigoRubroAutomatico();

      try {
        const resRubro = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            tabla: 'Rubros',
            action: 'create',
            data: {
              codigo: codigoGenerado,
              nombre: nombreRubroUpper,
              descripcion: 'Creado desde Maestro de Tareas'
            }
          })
        });
        const resData = await resRubro.json();

        if (resData.success) {
          setFormData({ codigo: '', rubro: '', tarea: '', unidad: 'm2', descripcion: '', costo_estimado: 0, hs_mo: '', insumos_asociados: [], estado: 'activo' });
          setEditingId(null);
          setActiveForm(null);
          cargarDatos();
        } else {
          alert("Error al guardar el rubro: " + (resData.error || "Desconocido"));
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión al guardar el rubro.");
      }
      return;
    }

    const action = editingId ? 'update' : 'create';
    const itemAGuardar = {
        ...formData,
        rubro: (formData.rubro || '').trim().toUpperCase(),
        tarea: formData.tarea,
        costo_estimado: costoTotal,
        hs_mo: `${totalHsMo.toFixed(3)} hs`,
        insumos_detalle: JSON.stringify(formData.insumos_asociados)
    };
    
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'MaestroTareasRubros', action, id: editingId, data: itemAGuardar })
    });
    const res = await response.json();
    
    if (res.success) {
      setFormData({ codigo: '', rubro: '', tarea: '', unidad: 'm2', descripcion: '', costo_estimado: 0, hs_mo: '', insumos_asociados: [], estado: 'activo' });
      setEditingId(null);
      setActiveForm(null);
      cargarDatos();
    } else {
      alert("Error al guardar: " + (res.error || "Desconocido"));
    }
  };

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este registro?")) {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'MaestroTareasRubros', action: 'delete', id })
      });
      cargarDatos();
    }
  };

  const handleEliminarRubroGlobal = async (rubroName) => {
    if (window.confirm(`¿Estás seguro de eliminar el rubro "${rubroName}"? Esto lo borrará de la lista general.`)) {
      const rubroEncontrado = rubrosList.find(r => String(r.nombre || r.Nombre || '').trim().toUpperCase() === rubroName);
      
      if (rubroEncontrado && rubroEncontrado.id) {
        try {
          await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ tabla: 'Rubros', action: 'delete', id: rubroEncontrado.id })
          });
        } catch (err) {
          console.error("Error al eliminar el rubro:", err);
        }
      }
      cargarDatos();
    }
  };

  const listaRubrosUnicos = [...new Set([
    ...items.map(i => String(i.rubro || 'GENERAL').toUpperCase()),
    ...rubrosList.map(r => String(r.nombre || r.Nombre || '').toUpperCase())
  ])].filter(Boolean);

  const insumosFiltradosBusqueda = insumosDisponibles.filter(i => (i.nombre || '').toLowerCase().includes(busquedaInsumo.toLowerCase()));

  const toggleTareaAbierta = (id) => {
    setTareasAbiertas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtrado de rubros basado en el buscador y el selector de rubro
  const rubrosFiltrados = listaRubrosUnicos.filter(rubroName => {
    const matchesRubroFilter = !selectedRubro || rubroName === selectedRubro.toUpperCase();
    if (!matchesRubroFilter) return false;

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const rubroMatches = rubroName.toLowerCase().includes(term);
    const tareasDelRubro = items.filter(i => String(i.rubro || 'GENERAL').toUpperCase() === rubroName && i.tarea !== '---');
    const hasMatchingTask = tareasDelRubro.some(t => 
      (t.tarea || '').toLowerCase().includes(term) || 
      (t.descripcion || '').toLowerCase().includes(term)
    );

    return rubroMatches || hasMatchingTask;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Maestro de Tareas</h1>
          <p className="text-slate-500 text-sm mt-1">{items.filter(i => i.tarea !== '---').length} plantillas de tareas reutilizables</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => { setActiveForm('rubro'); setEditingId(null); setFormData({rubro: '', tarea: '', insumos_asociados: []}); }} 
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
                <FolderPlus className="w-4 h-4" /> Nuevo Rubro
            </button>
            <button 
              onClick={() => { setActiveForm('tarea'); setEditingId(null); setFormData({rubro: listaRubrosUnicos[0] || '', tarea: '', unidad: 'm2', descripcion: '', costo_estimado: 0, hs_mo: '', insumos_asociados: []}); }} 
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" /> Nueva Tarea
            </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro por Rubro */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-300 shadow-sm w-full flex-1">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input 
            type="text"
            placeholder="Buscar por nombre de tarea, descripción o rubro..."
            className="w-full bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-300 shadow-sm w-full md:w-72 shrink-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedRubro}
            onChange={(e) => setSelectedRubro(e.target.value)}
            className="w-full bg-transparent outline-none text-xs font-semibold text-slate-700 uppercase cursor-pointer"
          >
            <option value="">Todos los Rubros</option>
            {listaRubrosUnicos.map((rubro, idx) => (
              <option key={idx} value={rubro}>{rubro}</option>
            ))}
          </select>
        </div>
      </div>

      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                {activeForm === 'rubro' ? 'Crear Nuevo Rubro' : (editingId ? 'Editar Tarea' : 'Nueva Tarea')}
              </h2>
              <button onClick={() => { setActiveForm(null); setEditingId(null); }} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardar} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {activeForm === 'rubro' && (
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Rubro (En Mayúsculas) *</label>
                    <input 
                        type="text" 
                        required
                        placeholder="Ej: INSTALACIONES, ESTRUCTURA" 
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm uppercase font-semibold focus:border-amber-500 focus:outline-none"
                        value={formData.rubro}
                        onChange={(e) => setFormData({...formData, rubro: e.target.value.toUpperCase()})}
                    />
                </div>
              )}

              {activeForm === 'tarea' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Rubro *</label>
                    <select 
                        required
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm uppercase font-semibold focus:border-amber-500 focus:outline-none"
                        value={formData.rubro}
                        onChange={(e) => setFormData({...formData, rubro: e.target.value})}
                    >
                        <option value="">Seleccione un Rubro...</option>
                        {listaRubrosUnicos.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Tarea *</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ej: Hormigón H-21" 
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
                            value={formData.tarea}
                            onChange={(e) => setFormData({...formData, tarea: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidad de Medida *</label>
                        <select 
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm uppercase focus:border-amber-500 focus:outline-none"
                            value={formData.unidad}
                            onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                        >
                            <option value="m2">m²</option>
                            <option value="m3">m³</option>
                            <option value="ml">ml</option>
                            <option value="un">un</option>
                            <option value="gl">gl</option>
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
                    <textarea 
                        rows="2"
                        placeholder="Descripción opcional" 
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase">Insumos por unidad de medida</label>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Buscar insumo para agregar..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-amber-500 outline-none"
                        value={busquedaInsumo}
                        onChange={(e) => setBusquedaInsumo(e.target.value)}
                      />
                      
                      {busquedaInsumo.trim() !== '' && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                          {insumosFiltradosBusqueda.length === 0 ? (
                            <div className="p-3 text-xs text-slate-500 text-center">No se encontraron insumos.</div>
                          ) : (
                            insumosFiltradosBusqueda.map(ins => (
                              <div 
                                key={ins.id}
                                onClick={() => handleAgregarInsumo(ins)}
                                className="p-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center text-xs"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">{ins.nombre}</span>
                                  <span className="text-slate-400 ml-2">({ins.tipo || 'Material'})</span>
                                </div>
                                <span className="font-semibold text-emerald-600">$ {Number(ins.costo_unitario || ins.precio || 0).toLocaleString('es-AR')} / {ins.unidad}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {formData.insumos_asociados.length === 0 ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                          Buscá y agregá insumos arriba
                        </div>
                      ) : (
                        formData.insumos_asociados.map(item => (
                          <div key={item.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{item.nombre}</p>
                              <span className="text-slate-500 text-[11px]">{item.tipo || 'Material'} • $ {Number(item.costo_unitario || item.precio || 0).toLocaleString('es-AR')} c/u</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Cant ({item.unidad}):</span>
                              <input 
                                type="number" 
                                step="0.001" 
                                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                                value={item.cantidad}
                                onChange={(e) => handleCambiarCantidadInsumo(item.id, e.target.value)}
                              />
                              <button type="button" onClick={() => handleQuitarInsumo(item.id)} className="p-1 text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Costo por unidad ({formData.unidad})</span>
                      <span className="text-2xl font-black text-slate-900">$ {costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Horas MO por unidad ({formData.unidad})</span>
                      <span className="text-xl font-bold text-amber-800">{totalHsMo.toFixed(3)} hs</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => { setActiveForm(null); setEditingId(null); }} className="px-4 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl text-sm font-medium">Cancelar</button>
                  <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-sm">
                    {activeForm === 'rubro' ? 'Crear Rubro' : (editingId ? 'Actualizar Tarea' : 'Crear Tarea')}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center bg-white border border-slate-300 rounded-xl"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>
        ) : rubrosFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-300 rounded-xl p-12 text-center text-slate-500 text-sm">No se encontraron rubros ni tareas con los filtros aplicados.</div>
        ) : (
          rubrosFiltrados.map(rubroName => {
            const tareasDelRubro = items.filter(i => {
              const rName = String(i.rubro || 'GENERAL').toUpperCase();
              if (rName !== rubroName || i.tarea === '---') return false;
              if (!searchTerm.trim()) return true;
              const term = searchTerm.toLowerCase();
              return (i.tarea || '').toLowerCase().includes(term) || (i.descripcion || '').toLowerCase().includes(term) || rName.toLowerCase().includes(term);
            });

            const isOpen = rubrosAbiertos[rubroName] !== false;

            return (
              <div key={rubroName} className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="bg-slate-700 text-white px-6 py-3.5 flex justify-between items-center hover:bg-slate-800 transition-colors">
                   <div 
                     onClick={() => setRubrosAbiertos({...rubrosAbiertos, [rubroName]: !isOpen})} 
                     className="flex-1 cursor-pointer flex items-center"
                   >
                     <span className="font-extrabold tracking-wider text-sm uppercase">
                       {rubroName} <span className="text-xs font-normal text-slate-300 ml-2">({tareasDelRubro.length} tareas)</span>
                     </span>
                   </div>
                   <div className="flex items-center gap-3">
                     <button 
                       onClick={(e) => { e.stopPropagation(); handleEliminarRubroGlobal(rubroName); }} 
                       className="text-red-300 hover:text-white p-1.5 rounded transition-colors text-xs font-semibold bg-slate-800 hover:bg-red-600 border border-red-500/40 flex items-center gap-1 px-2.5 py-1"
                       title="Eliminar Rubro"
                     >
                       <Trash2 className="w-3.5 h-3.5"/> Eliminar Rubro
                     </button>
                     <div 
                       onClick={() => setRubrosAbiertos({...rubrosAbiertos, [rubroName]: !isOpen})} 
                       className="cursor-pointer p-1"
                     >
                       {isOpen ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                     </div>
                   </div>
                </div>

                {isOpen && (
                    <div className="divide-y divide-slate-200">
                        {tareasDelRubro.length === 0 ? (
                            <div className="px-6 py-4 text-xs text-slate-400 italic">No hay tareas que coincidan con la búsqueda en este rubro.</div>
                        ) : (
                            tareasDelRubro.map(item => {
                              const isTareaOpen = tareasAbiertas[item.id];
                              let insumosDetalle = [];
                              try {
                                insumosDetalle = typeof item.insumos_detalle === 'string' ? JSON.parse(item.insumos_detalle) : (item.insumos_detalle || []);
                              } catch (e) {
                                insumosDetalle = [];
                              }

                              return (
                                <div key={item.id} className="border-b border-slate-200 last:border-b-0">
                                  <div 
                                    onClick={() => toggleTareaAbierta(item.id)}
                                    className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTareaOpen ? 'rotate-180' : ''}`} />
                                      <div>
                                        <p className="text-sm font-bold text-slate-800">{item.tarea}</p>
                                        {item.descripcion && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.descripcion}</p>}
                                        <div className="flex gap-3 text-xs text-slate-500 mt-1.5">
                                            <span className="uppercase font-bold bg-slate-100 px-2 py-0.5 rounded border">{item.unidad || 'un'}</span>
                                            <span className="text-slate-600">{insumosDetalle.length} insumos</span>
                                            {item.hs_mo && <span className="text-amber-700 font-semibold">{item.hs_mo} MO/u</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-6 self-end sm:self-center">
                                        <div className="text-right">
                                            <span className="text-xs text-slate-400 block">Costo/u</span>
                                            <span className="text-sm font-black text-slate-900">$ {Number(item.costo_estimado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicarTarea(item); }} className="p-1.5 text-slate-500 hover:text-blue-600 bg-white border rounded-md shadow-sm" title="Duplicar tarea"><Copy className="w-4 h-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleEditarTarea(item); }} className="p-1.5 text-slate-500 hover:text-amber-600 bg-white border rounded-md shadow-sm" title="Editar tarea"><Edit2 className="w-4 h-4"/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleEliminar(item.id); }} className="p-1.5 text-slate-500 hover:text-red-600 bg-white border rounded-md shadow-sm" title="Eliminar tarea"><Trash2 className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                  </div>

                                  {isTareaOpen && (
                                    <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-200">
                                      {insumosDetalle.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-2 text-center">No hay insumos detallados para esta tarea.</p>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="text-slate-400 font-semibold uppercase border-b border-slate-200 pb-2">
                                                <th className="pb-2">Tipo</th>
                                                <th className="pb-2">Insumo</th>
                                                <th className="pb-2 text-center">Cantidad/unidad</th>
                                                <th className="pb-2">Unidad</th>
                                                <th className="pb-2 text-right">Costo Unit.</th>
                                                <th className="pb-2 text-right">Costo/unidad tarea</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/60">
                                              {insumosDetalle.map((ins, idx) => {
                                                const cantidad = Number(ins.cantidad) || 0;
                                                const costoUnit = Number(ins.costo_unitario || ins.precio) || 0;
                                                const subtotal = cantidad * costoUnit;
                                                return (
                                                  <tr key={idx} className="hover:bg-slate-100/50">
                                                    <td className="py-2.5 whitespace-nowrap">
                                                      <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${obtenerClaseTipo(ins.tipo)}`}>
                                                        {ins.tipo || 'Material'}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 font-medium text-slate-800">{ins.nombre}</td>
                                                    <td className="py-2.5 text-center text-slate-600 font-semibold">{cantidad}</td>
                                                    <td className="py-2.5 text-slate-500 uppercase">{ins.unidad}</td>
                                                    <td className="py-2.5 text-right text-slate-600">$ {costoUnit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-2.5 text-right font-bold text-slate-900">$ {subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}