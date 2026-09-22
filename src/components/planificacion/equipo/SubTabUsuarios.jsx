// src/components/planificacion/equipo/SubTabUsuarios.jsx
import React, { useState, useMemo } from 'react';
import { Users, Search, ShieldCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import UsuarioCard from './UsuarioCard';

const ROLES_DISPONIBLES = [
  { id: 'admin',         label: 'Admin',          color: 'bg-rose-100 text-rose-800' },
  { id: 'administrador', label: 'Administrador',  color: 'bg-rose-100 text-rose-800' },
  { id: 'gestor',        label: 'Gestor',         color: 'bg-purple-100 text-purple-800' },
  { id: 'finanzas',      label: 'Finanzas',       color: 'bg-emerald-100 text-emerald-800' },
  { id: 'jefe_obra',     label: 'Jefe de Obra',   color: 'bg-blue-100 text-blue-800' },
  { id: 'operador',      label: 'Operador',       color: 'bg-slate-100 text-slate-700' },
  { id: 'operador_ii',   label: 'Operador II',    color: 'bg-slate-100 text-slate-600' },
];

export default function SubTabUsuarios() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  const { data: usuariosFs, loading } = useFirestoreCollection('usuarios');
  const usuarios = useMemo(() => (Array.isArray(usuariosFs) ? usuariosFs : []), [usuariosFs]);

  // Filtrar
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const busq = busqueda.toLowerCase().trim();
      if (busq) {
        const matchEmail = String(u.email || '').toLowerCase().includes(busq);
        const matchNombre = String(u.nombre || '').toLowerCase().includes(busq);
        if (!matchEmail && !matchNombre) return false;
      }
      if (filtroRol) {
        const rolUser = String(u.role || u.rol || '').toLowerCase();
        if (rolUser !== filtroRol) return false;
      }
      return true;
    }).sort((a, b) => {
      return String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || ''));
    });
  }, [usuarios, busqueda, filtroRol]);

  // KPIs por rol
  const kpis = useMemo(() => {
    const conteo = {};
    usuarios.forEach(u => {
      const rol = String(u.role || u.rol || 'sin-rol').toLowerCase();
      conteo[rol] = (conteo[rol] || 0) + 1;
    });
    return conteo;
  }, [usuarios]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-300 text-center">
        <p className="text-sm font-bold text-slate-500">Cargando usuarios...</p>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <Users className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">No hay usuarios cargados</p>
        <p className="text-xs text-slate-400">
          Los usuarios se crean desde Firebase Auth cuando aceptan una invitación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* KPIs por rol */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Usuarios" value={usuarios.length} icon={Users} color="slate" />
        {ROLES_DISPONIBLES.map(rol => {
          const cantidad = kpis[rol.id] || 0;
          if (cantidad === 0) return null;
          return (
            <KpiCard
              key={rol.id}
              label={rol.label}
              value={cantidad}
              icon={ShieldCheck}
              color="blue"
            />
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer md:w-56"
        >
          <option value="">Todos los roles</option>
          {ROLES_DISPONIBLES.map(rol => (
            <option key={rol.id} value={rol.id}>{rol.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {usuariosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <UserX className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Sin resultados</p>
          <p className="text-xs text-slate-400">
            Probá cambiar los filtros o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuariosFiltrados.map(u => (
            <UsuarioCard
              key={u.id}
              usuario={u}
              rolesDisponibles={ROLES_DISPONIBLES}
            />
          ))}
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, icon: Icon, color = 'slate' }) {
  const colorMap = {
    slate:   { bg: 'bg-slate-100',  text: 'text-slate-700',  accent: 'text-slate-900' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',   accent: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600',accent: 'text-emerald-700' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',  accent: 'text-amber-700' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase">{label}</p>
        <div className={cn('p-1.5 rounded-lg', c.bg, c.text)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={cn('text-2xl font-black', c.accent)}>{value}</p>
    </div>
  );
}