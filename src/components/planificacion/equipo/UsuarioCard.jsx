// src/components/planificacion/equipo/UsuarioCard.jsx
import React, { useState } from 'react';
import { Mail, Shield, X, Loader2, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { actualizarDoc } from '@/lib/firestoreHelpers';

export default function UsuarioCard({ usuario, rolesDisponibles = [] }) {
  const [editando, setEditando] = useState(false);
  const [nuevoRol, setNuevoRol] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [confirmandoDesactivar, setConfirmandoDesactivar] = useState(false);

  const rolActual = String(usuario.role || usuario.rol || 'operador').toLowerCase();
  const rolInfo = rolesDisponibles.find(r => r.id === rolActual) || rolesDisponibles[0];

  // ═══════════════════════════════════════════════════════════════════════
  // CAMBIAR ROL
  // ═══════════════════════════════════════════════════════════════════════

  const handleAbrirEdicion = () => {
    setNuevoRol(rolActual);
    setEditando(true);
  };

  const handleGuardarRol = async () => {
    if (!nuevoRol || nuevoRol === rolActual) {
      setEditando(false);
      return;
    }

    setGuardando(true);
    const toastId = toast.loading('Actualizando rol...');

    try {
      await actualizarDoc('usuarios', usuario.id, {
        role: nuevoRol,
        rol: nuevoRol,   // por compatibilidad
      });
      toast.success('Rol actualizado', { id: toastId });
      setEditando(false);
    } catch (err) {
      console.error('[UsuarioCard] Error:', err);
      toast.error('Error al actualizar: ' + (err.message || ''), { id: toastId });
    } finally {
      setGuardando(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // DESACTIVAR / ACTIVAR
  // ═══════════════════════════════════════════════════════════════════════

  const handleToggleActivo = async () => {
    const nuevoEstado = usuario.estado === 'inactivo' ? 'activo' : 'inactivo';
    setGuardando(true);
    const toastId = toast.loading(
      nuevoEstado === 'inactivo' ? 'Desactivando...' : 'Reactivando...'
    );

    try {
      await actualizarDoc('usuarios', usuario.id, { estado: nuevoEstado });
      toast.success(
        nuevoEstado === 'inactivo' ? 'Usuario desactivado' : 'Usuario reactivado',
        { id: toastId }
      );
      setConfirmandoDesactivar(false);
    } catch (err) {
      console.error('[UsuarioCard] Error:', err);
      toast.error('Error: ' + (err.message || ''), { id: toastId });
    } finally {
      setGuardando(false);
    }
  };

  const estaInactivo = usuario.estado === 'inactivo';

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm transition-all',
      estaInactivo ? 'border-slate-200 opacity-60' : 'border-slate-300'
    )}>
      <div className="px-5 py-3 flex items-center gap-3">

        {/* Avatar con inicial */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-sm',
          estaInactivo
            ? 'bg-slate-100 text-slate-400'
            : 'bg-blue-100 text-blue-700'
        )}>
          {String(usuario.nombre || usuario.email || '?').charAt(0).toUpperCase()}
        </div>

        {/* Info del usuario */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              'text-sm font-black truncate',
              estaInactivo ? 'text-slate-500' : 'text-slate-900'
            )}>
              {usuario.nombre || 'Sin nombre'}
            </p>
            {estaInactivo && (
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[9px] font-black uppercase">
                Inactivo
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
            <Mail className="w-3 h-3" />
            <span className="truncate">{usuario.email}</span>
          </div>
        </div>

        {/* Rol */}
        <div className="shrink-0">
          {editando ? (
            <div className="flex items-center gap-2">
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value)}
                disabled={guardando}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold outline-none focus:border-amber-500 cursor-pointer"
              >
                {rolesDisponibles.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={handleGuardarRol}
                disabled={guardando}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {guardando ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
              </button>
              <button
                onClick={() => setEditando(false)}
                disabled={guardando}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAbrirEdicion}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer',
                rolInfo?.color || 'bg-slate-100 text-slate-700',
                'hover:ring-2 hover:ring-amber-400'
              )}
              title="Click para editar rol"
            >
              <Shield className="w-3 h-3 inline mr-1" />
              {rolInfo?.label || rolActual}
            </button>
          )}
        </div>

        {/* Botón desactivar/activar */}
        {!editando && (
          <button
            onClick={() => setConfirmandoDesactivar(true)}
            disabled={guardando}
            className={cn(
              'p-1.5 rounded-lg transition-colors cursor-pointer shrink-0',
              estaInactivo
                ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
            )}
            title={estaInactivo ? 'Reactivar usuario' : 'Desactivar usuario'}
          >
            <UserX className="w-4 h-4" />
          </button>
        )}

      </div>

      {/* Modal inline de confirmación */}
      {confirmandoDesactivar && (
        <div className="border-t border-slate-200 px-5 py-3 bg-amber-50">
          <p className="text-xs font-bold text-amber-900 mb-2">
            {estaInactivo
              ? `¿Reactivar a ${usuario.nombre || usuario.email}?`
              : `¿Desactivar a ${usuario.nombre || usuario.email}? No podrá ingresar a la app.`}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmandoDesactivar(false)}
              disabled={guardando}
              className="px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleToggleActivo}
              disabled={guardando}
              className={cn(
                'px-3 py-1.5 text-[11px] font-bold text-white rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1',
                estaInactivo
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-rose-500 hover:bg-rose-600'
              )}
            >
              {guardando && <Loader2 className="w-3 h-3 animate-spin" />}
              {estaInactivo ? 'Reactivar' : 'Desactivar'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}