// src/components/planificacion/proyectos/detalle/reuniones/ReunionesLista.jsx
import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users as UsersIcon,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  CalendarClock,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReunionesLista({
  reuniones,
  personal,
  onNuevaReunion,
  onEditarReunion,
  onEliminarReunion,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Filtrar
  const reunionesFiltradas = useMemo(() => {
    return reuniones.filter(r => {
      if (filtroTipo && r.tipo !== filtroTipo) return false;
      if (busqueda) {
        const b = busqueda.toLowerCase();
        const match = (r.titulo || '').toLowerCase().includes(b)
          || (r.notas || '').toLowerCase().includes(b)
          || (r.lugar || '').toLowerCase().includes(b);
        if (!match) return false;
      }
      return true;
    });
  }, [reuniones, busqueda, filtroTipo]);

  // Separar en próximas y pasadas
  const hoyIso = new Date().toISOString().slice(0, 10);
  const proximas = reunionesFiltradas.filter(r => (r.fecha || '') >= hoyIso);
  const pasadas = reunionesFiltradas.filter(r => (r.fecha || '') < hoyIso).reverse();

  if (reuniones.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <CalendarClock className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">No hay reuniones registradas</p>
        <p className="text-xs text-slate-400">
          Creá la primera reunión para empezar a trackearla.
        </p>
        <button
          onClick={() => onNuevaReunion()}
          className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nueva Reunión
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por título, notas o lugar..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
        />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 cursor-pointer sm:w-56"
        >
          <option value="">Todos los tipos</option>
          <option value="obra">🏗️ Obra</option>
          <option value="coordinacion">📋 Coordinación</option>
          <option value="avance">📈 Avance</option>
          <option value="otro">💬 Otro</option>
        </select>
      </div>

      {/* Secciones */}
      {proximas.length > 0 && (
        <Seccion titulo="Próximas" count={proximas.length} color="blue">
          {proximas.map(r => (
            <ReunionItem
              key={r.id}
              reunion={r}
              personal={personal}
              onEditar={() => onEditarReunion(r)}
              onEliminar={() => onEliminarReunion(r)}
            />
          ))}
        </Seccion>
      )}

      {pasadas.length > 0 && (
        <Seccion titulo="Realizadas" count={pasadas.length} color="slate">
          {pasadas.map(r => (
            <ReunionItem
              key={r.id}
              reunion={r}
              personal={personal}
              onEditar={() => onEditarReunion(r)}
              onEliminar={() => onEliminarReunion(r)}
            />
          ))}
        </Seccion>
      )}

      {proximas.length === 0 && pasadas.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
          <p className="text-sm font-bold text-slate-500">Sin resultados</p>
          <p className="text-xs text-slate-400">Probá cambiar los filtros.</p>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SECCIÓN
// ═══════════════════════════════════════════════════════════════════════════

function Seccion({ titulo, count, color, children }) {
  const colorClass = {
    blue: 'text-blue-700',
    slate: 'text-slate-700',
  }[color] || 'text-slate-700';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <p className={cn('text-[11px] font-black uppercase', colorClass)}>
          {titulo}
        </p>
        <span className="text-[10px] font-bold text-slate-500">
          ({count})
        </span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ITEM DE REUNIÓN
// ═══════════════════════════════════════════════════════════════════════════

function ReunionItem({ reunion, personal, onEditar, onEliminar }) {
  const [expandido, setExpandido] = useState(false);

  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return f;
  };

  const tipoInfo = {
    obra:         { label: '🏗️ Obra',         color: 'bg-blue-100 text-blue-800 border-blue-300' },
    coordinacion: { label: '📋 Coordinación', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    avance:       { label: '📈 Avance',       color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    otro:         { label: '💬 Otro',         color: 'bg-slate-100 text-slate-700 border-slate-300' },
  }[reunion.tipo] || { label: '💬 Otro', color: 'bg-slate-100 text-slate-700 border-slate-300' };

  const asistentesNombres = (reunion.asistentes || [])
    .map(id => {
      const p = personal.find(pp => String(pp.id || pp.ID) === String(id));
      return p?.nombre || p?.Nombre;
    })
    .filter(Boolean);

  const compromisos = Array.isArray(reunion.compromisos) ? reunion.compromisos : [];
  const compromisosPendientes = compromisos.filter(c => !c.completado).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpandido(!expandido)}
      >
        <div className="shrink-0">
          {expandido ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-bold', tipoInfo.color)}>
              {tipoInfo.label}
            </span>
            <p className="text-sm font-black text-slate-900 truncate">
              {reunion.titulo}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Calendar className="w-3 h-3" />
              {formatearFecha(reunion.fecha)}
            </span>
            {reunion.hora_inicio && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {reunion.hora_inicio}
                {reunion.hora_fin && ` - ${reunion.hora_fin}`}
              </span>
            )}
            {reunion.lugar && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {reunion.lugar}
              </span>
            )}
            {asistentesNombres.length > 0 && (
              <span className="flex items-center gap-1">
                <UsersIcon className="w-3 h-3" />
                {asistentesNombres.length}
              </span>
            )}
            {compromisosPendientes > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                {compromisosPendientes} pendiente{compromisosPendientes === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEditar(); }}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEliminar(); }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Detalle expandido */}
      {expandido && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-3 bg-slate-50/50">

          {/* Asistentes */}
          {asistentesNombres.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Asistentes</p>
              <div className="flex flex-wrap gap-1">
                {asistentesNombres.map((nom, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold"
                  >
                    {nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {reunion.notas && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Notas / Minuta</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-slate-200">
                {reunion.notas}
              </p>
            </div>
          )}

          {/* Compromisos */}
          {compromisos.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Compromisos ({compromisos.length - compromisosPendientes}/{compromisos.length} completados)
              </p>
              <div className="space-y-1.5">
                {compromisos.map((c, idx) => {
                  const resp = personal.find(p => String(p.id || p.ID) === String(c.responsable_id));
                  return (
                    <div
                      key={c.id || idx}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg border text-xs',
                        c.completado
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      )}
                    >
                      <span className="mt-0.5">{c.completado ? '✅' : '⏳'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-bold', c.completado && 'line-through opacity-75')}>
                          {c.texto}
                        </p>
                        <p className="text-[10px] mt-0.5 opacity-75">
                          {resp?.nombre && `👤 ${resp.nombre}`}
                          {c.fecha_limite && ` · 📅 ${formatearFecha(c.fecha_limite)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}