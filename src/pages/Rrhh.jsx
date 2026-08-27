import React, { useState } from 'react';
import { Users, Plus, Search, Trash2, Edit2, X, Calculator, DollarSign } from 'lucide-react';

export default function Rrhh({ GOOGLE_SCRIPT_URL, personalInicial = [], insumos = [], cargarDatos }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'legajos' | 'salarios' | 'carga'
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para el calculador de Cuadrillas y Salarios (basado en modelo Zárate)
  const [porcentajeCargas, setPorcentajeCargas] = useState(76.00);
  
  // Filas de trabajadores para la cuadrilla activa
  const [cuadrillaItems, setCuadrillaItems] = useState([
    { id: 1, categoria: 'OFICIAL ESPECIALIZADO', cantidad: 1, costoEnMano: 92550.50 },
    { id: 2, categoria: 'OFICIAL CABALLERO', cantidad: 1, costoEnMano: 58941.78 },
    { id: 3, categoria: 'OFICIAL OYOLA', cantidad: 0, costoEnMano: 61504.47 },
    { id: 4, categoria: 'OFICIAL TORRES', cantidad: 1, costoEnMano: 53175.74 },
    { id: 5, categoria: 'OFICIAL PALACIO', cantidad: 1, costoEnMano: 61215.00 },
    { id: 6, categoria: '1/2 OFICIAL OYOLA', cantidad: 0, costoEnMano: 55650.00 }
  ]);

  const [viaticosCuadrilla, setViaticosCuadrilla] = useState({ cantidad: 1, costo: 152436.57 });
  const [nombreCuadrilla, setNombreCuadrilla] = useState('CUADRILLA LDC ZARATE - PROMEDIO ESTABLE');

  // Modal Nuevo / Editar Personal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    cuil: '',
    especialidad: '',
    telefono: '',
    email: '',
    direccion: ''
  });

  const handleOpenModal = (persona = null) => {
    if (persona) {
      setEditingId(persona.id || persona.ID);
      setFormData({
        nombre: persona.nombre || persona.Nombre || '',
        cuil: persona.cuil || persona.Cuil || persona.CUIL || '',
        especialidad: persona.especialidad || persona.Especialidad || '',
        telefono: persona.telefono || persona.Telefono || '',
        email: persona.email || persona.Email || '',
        direccion: persona.direccion || persona.Direccion || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: '',
        cuil: '',
        especialidad: '',
        telefono: '',
        email: '',
        direccion: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleGuardarPersonal = async (e) => {
    e.preventDefault();
    try {
      const action = editingId ? 'update' : 'create';
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Personal',
          action: action,
          id: editingId,
          data: formData
        })
      });

      const textoRespuesta = await res.text();
      let data;
      try {
        data = JSON.parse(textoRespuesta);
      } catch (err) {
        alert("Error del servidor: " + textoRespuesta.substring(0, 150));
        return;
      }

      if (data.success || data.id) {
        setIsModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar personal: " + (data.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar el personal.");
    }
  };

  const handleEliminarPersonal = async (id) => {
    if (!id) return;
    if (!window.confirm("¿Estás seguro de eliminar este registro de personal?")) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Personal', action: 'delete', id: id })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        cargarDatos();
      } else {
        alert("No se pudo eliminar el registro.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cálculos dinámicos para la cuadrilla
  const factorCargas = porcentajeCargas / 100;
  
  const itemsCalculados = cuadrillaItems.map(item => {
    const costoEnMano = Number(item.costoEnMano) || 0;
    const cargasSocialesUnitarias = costoEnMano * factorCargas;
    const subtotalUnitario = costoEnMano + cargasSocialesUnitarias;
    const subtotalTotal = subtotalUnitario * (Number(item.cantidad) || 0);
    return {
      ...item,
      cargasSocialesUnitarias,
      subtotalUnitario,
      subtotalTotal
    };
  });

  const sumaSubtotalesPersonal = itemsCalculados.reduce((acc, item) => acc + item.subtotalTotal, 0);
  const totalViaticos = (Number(viaticosCuadrilla.cantidad) || 0) * (Number(viaticosCuadrilla.costo) || 0);
  const costoDiarioCuadrilla = sumaSubtotalesPersonal + totalViaticos;

  const personalFiltrado = personalInicial.filter(p => {
    const nombre = String(p.nombre || p.Nombre || '').toLowerCase();
    const cuil = String(p.cuil || p.Cuil || p.CUIL || '').toLowerCase();
    const especialidad = String(p.especialidad || p.Especialidad || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return nombre.includes(query) || cuil.includes(query) || especialidad.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Recursos Humanos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de personal, legajos, salarios y armado de cuadrillas</p>
        </div>
        {activeTab === 'personal' && (
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Personal
          </button>
        )}
      </div>

      {/* Botones de pestañas */}
      <div className="flex gap-2 flex-wrap pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Lista de Personal
        </button>
        <button
          onClick={() => setActiveTab('legajos')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'legajos'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Legajos
        </button>
        <button
          onClick={() => setActiveTab('salarios')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'salarios'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Salarios y Cuadrillas
        </button>
        <button
          onClick={() => setActiveTab('carga')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'carga'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Carga Semanal de Horas / Viáticos
        </button>
      </div>

      {/* Contenido: Lista de Personal */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar por nombre, CUIL o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            {personalFiltrado.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-slate-300" />
                <span>No hay personal registrado.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-4 py-4">CUIL</th>
                    <th className="px-4 py-4">Especialidad</th>
                    <th className="px-4 py-4">Teléfono</th>
                    <th className="px-4 py-4">Mail</th>
                    <th className="px-4 py-4">Dirección</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalFiltrado.map((p, index) => {
                    const pId = p.id || p.ID;
                    return (
                      <tr key={pId || index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{p.nombre || p.Nombre || '---'}</td>
                        <td className="px-4 py-4 font-mono text-slate-600">{p.cuil || p.Cuil || p.CUIL || '---'}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px]">
                            {p.especialidad || p.Especialidad || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{p.telefono || p.Telefono || '---'}</td>
                        <td className="px-4 py-4 text-slate-600">{p.email || p.Email || '---'}</td>
                        <td className="px-4 py-4 text-slate-600">{p.direccion || p.Direccion || '---'}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarPersonal(pId)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Contenido: Salarios y Cuadrillas (Estructura de Costos por Cuadrilla) */}
      {activeTab === 'salarios' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
              <div>
                <input 
                  type="text" 
                  value={nombreCuadrilla} 
                  onChange={(e) => setNombreCuadrilla(e.target.value)}
                  className="text-lg font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 outline-none px-1 py-0.5 w-full max-w-md"
                />
                <p className="text-xs text-slate-500 mt-1">Armado de costo diario de cuadrilla integrando salarios, cargas sociales y viáticos.</p>
              </div>
              
              <div className="flex items-center gap-3 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900">Cargas Sociales (%):</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={porcentajeCargas}
                  onChange={(e) => setPorcentajeCargas(Number(e.target.value) || 0)}
                  className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-amber-900 text-center outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <th className="px-4 py-3">Categoría / Rol / Personal</th>
                    <th className="px-4 py-3 text-center">Cantidad (Activa)</th>
                    <th className="px-4 py-3 text-right">Costo En Mano ($)</th>
                    <th className="px-4 py-3 text-right">Cargas Sociales ($)</th>
                    <th className="px-4 py-3 text-right">Sub-Total / Día ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemsCalculados.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{item.categoria}</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" 
                          min="0" 
                          max="10"
                          value={item.cantidad}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCuadrillaItems(prev => prev.map(i => i.id === item.id ? { ...i, cantidad: val } : i));
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.costoEnMano}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCuadrillaItems(prev => prev.map(i => i.id === item.id ? { ...i, costoEnMano: val } : i));
                          }}
                          className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-right outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        $ {item.cargasSocialesUnitarias.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        $ {item.subtotalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  {/* Fila de Viáticos */}
                  <tr className="bg-amber-50/40 font-semibold">
                    <td className="px-4 py-3 text-amber-900 uppercase font-extrabold">VIÁTICOS</td>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="number" 
                        min="0" 
                        value={viaticosCuadrilla.cantidad}
                        onChange={(e) => setViaticosCuadrilla({ ...viaticosCuadrilla, cantidad: Number(e.target.value) })}
                        className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right" colSpan={2}>
                      <input 
                        type="number" 
                        step="0.01"
                        value={viaticosCuadrilla.costo}
                        onChange={(e) => setViaticosCuadrilla({ ...viaticosCuadrilla, costo: Number(e.target.value) })}
                        className="w-40 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold text-right outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-900">
                      $ {totalViaticos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total final de la cuadrilla */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Costo resultante para insumo compuesto</p>
                <h4 className="text-lg font-black">{nombreCuadrilla}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase font-bold block">COSTO DIARIO CUADRILLA</span>
                <span className="text-2xl font-black text-amber-400">
                  $ {costoDiarioCuadrilla.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'legajos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center text-slate-400 text-xs">
          Módulo de Legajos en desarrollo.
        </div>
      )}
      
      {activeTab === 'carga' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-slate-700 space-y-4">
          <h3 className="text-sm font-extrabold uppercase">Carga Semanal de Horas / Días y Viáticos</h3>
          <p className="text-xs text-slate-500">Aquí podrás registrar las asistencias y viáticos reales por trabajador para contrastar con el presupuesto.</p>
          <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
            Próximamente: Registro de parte diario / semanal por obra e imputación de viáticos individuales.
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PERSONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Editar Personal' : 'Nuevo Personal'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleGuardarPersonal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Pérez Juan Carlos"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIL *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: 20-30816383-1"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.cuil} 
                    onChange={(e) => setFormData({...formData, cuil: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especialidad *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Oficial Especializado"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.especialidad} 
                    onChange={(e) => setFormData({...formData, especialidad: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej: +54 9 11..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.telefono} 
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mail</label>
                  <input 
                    type="email" 
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección</label>
                <input 
                  type="text" 
                  placeholder="Ej: Av. San Martín 1234, Benavidez"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                  value={formData.direccion} 
                  onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}