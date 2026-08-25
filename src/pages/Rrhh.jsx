import React, { useState } from 'react';
import { Users, Plus, Search, Trash2, Edit2, X, Phone, Mail, MapPin } from 'lucide-react';

export default function Rrhh({ GOOGLE_SCRIPT_URL, personalInicial = [], cargarDatos }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'legajos' | 'salarios' | 'carga'
  const [searchTerm, setSearchTerm] = useState('');

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
          <p className="text-slate-500 text-sm mt-1">Gestión de personal, legajos, salarios y asignaciones</p>
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
          Salarios
        </button>
        <button
          onClick={() => setActiveTab('carga')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'carga'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Carga Semanal
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
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

      {activeTab === 'legajos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center text-slate-400 text-xs">
          Módulo de Legajos en desarrollo.
        </div>
      )}
      {activeTab === 'salarios' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center text-slate-400 text-xs">
          Módulo de Salarios en desarrollo.
        </div>
      )}
      {activeTab === 'carga' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center text-slate-400 text-xs">
          Módulo de Carga Semanal en desarrollo.
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