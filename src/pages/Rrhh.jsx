import React, { useState } from 'react';
import { Users, FileText, DollarSign, Calendar, Plus, Search } from 'lucide-react';

export default function Rrhh() {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'legajos' | 'salarios' | 'carga'

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Recursos Humanos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de personal, legajos, salarios y asignaciones</p>
        </div>
      </div>

      {/* Botones de pestañas idénticos al estilo de Compras / Facturas */}
      <div className="flex gap-2 flex-wrap pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            activeTab === 'personal'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Lista de Personal
        </button>
        <button
          onClick={() => setActiveTab('legajos')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            activeTab === 'legajos'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Legajos
        </button>
        <button
          onClick={() => setActiveTab('salarios')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            activeTab === 'salarios'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Salarios
        </button>
        <button
          onClick={() => setActiveTab('carga')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
            activeTab === 'carga'
              ? 'bg-amber-500 text-white'
              : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Carga Semanal
        </button>
      </div>

      {/* Contenido dinámico según la pestaña seleccionada */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 min-h-[300px]">
        {activeTab === 'personal' && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Lista de Personal</h3>
            <p className="text-xs text-slate-500">Administra los colaboradores activos de la empresa.</p>
          </div>
        )}
        {activeTab === 'legajos' && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Legajos</h3>
            <p className="text-xs text-slate-500">Documentación, antecedentes y expedientes del personal.</p>
          </div>
        )}
        {activeTab === 'salarios' && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Salarios</h3>
            <p className="text-xs text-slate-500">Control de haberes, escalas y pagos.</p>
          </div>
        )}
        {activeTab === 'carga' && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Carga Semanal</h3>
            <p className="text-xs text-slate-500">Registro de horas trabajadas y asignación por obra.</p>
          </div>
        )}
      </div>
    </div>
  );
}