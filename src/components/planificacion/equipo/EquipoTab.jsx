// src/components/planificacion/equipo/EquipoTab.jsx
import React, { useState } from 'react';
import { Users, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import SubTabOperarios from './SubTabOperarios';
import SubTabUsuarios from './SubTabUsuarios';

const SUBTABS = [
  { id: 'operarios', label: 'Operarios de Obra', icon: Users },
  { id: 'usuarios',  label: 'Usuarios del Sistema', icon: UserCog },
];

export default function EquipoTab() {
  const [subTabActiva, setSubTabActiva] = useState('operarios');

  return (
    <div className="space-y-6">

      {/* Header del módulo */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Equipo</h1>
        <p className="text-slate-500 text-sm mt-1">
          Operarios de obra y usuarios habilitados en la aplicación
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm">
        {SUBTABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTabActiva(id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              subTabActiva === id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido del sub-tab */}
      {subTabActiva === 'operarios' && <SubTabOperarios />}
      {subTabActiva === 'usuarios' && <SubTabUsuarios />}

    </div>
  );
}