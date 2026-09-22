// src/components/planificacion/proyectos/detalle/AsignarResponsableModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { User, Save, Loader2, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/planificacion/shared/Modal';
import { cn } from '@/lib/utils';
import { actualizarDoc } from '@/lib/firestoreHelpers';
import { usuariosResponsables, ROLES_RESPONSABLES } from '@/lib/planificacionHelpers';

export default function AsignarResponsableModal({
  isOpen,
  onClose,
  plan,
  usuarios = [],
  onGuardado,
}) {
  const [responsableId, setResponsableId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Usuarios con rol válido para ser responsables
  const responsablesDisponibles = useMemo(
    () => usuariosResponsables(usuarios),
    [usuarios]
  );

  // Resetear al abrir
  useEffect(() => {
    if (!isOpen || !plan) return;
    setResponsableId(String(plan.responsable_id || ''));
    setIsSaving(false);
  }, [isOpen, plan?.id]);

  const responsableActual = useMemo(() => {
    if (!plan?.responsable_id) return null;
    return usuarios.find(u => String(u.id) === String(plan.responsable_id));
  }, [plan, usuarios]);

  const responsableNuevo = useMemo(() => {
    if (!responsableId) return null;
    return usuarios.find(u => String(u.id) === String(responsableId));
  }, [responsableId, usuarios]);

  const handleGuardar = async () => {
    if (!plan) return;

    const nuevoIdStr = String(responsableId || '');
    const actualIdStr = String(plan.responsable_id || '');

    if (nuevoIdStr === actualIdStr) {
      toast('Sin cambios', { icon: 'ℹ️' });
      onClose();
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando responsable...');

    try {
      const payloadPlan = {
        responsable_id: nuevoIdStr,
        responsable_nombre: responsableNuevo?.nombre || '',
        responsable_email: responsableNuevo?.email || '',
        responsable_role: responsableNuevo?.role || responsableNuevo?.rol || '',
      };

      // Actualizar el plan
      await actualizarDoc('planificacion_planes', plan.id, payloadPlan);

      // Actualizar el presupuesto vinculado si existe
      if (plan.presupuesto_id) {
        try {
          await actualizarDoc('presupuestos', plan.presupuesto_id, {
            responsable_id: payloadPlan.responsable_id,
            responsable_nombre: payloadPlan.responsable_nombre,
            responsable_email: payloadPlan.responsable_email,
            responsable_role: payloadPlan.responsable_role,
          });
        } catch (errPres) {
          console.warn('[AsignarResponsable] No se pudo actualizar el presupuesto:', errPres);
        }
      }

      toast.success(
        responsableNuevo
          ? `Responsable: ${responsableNuevo.nombre || responsableNuevo.email}`
          : 'Responsable removido',
        { id: toastId }
      );

      if (typeof onGuardado === 'function') onGuardado();
      onClose();
    } catch (err) {
      console.error('[AsignarResponsableModal] Error:', err);
      toast.error('Error al guardar: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (!plan) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Asignar responsable"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">

        {/* Info del plan */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black text-slate-500 uppercase">Plan</p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {plan.nombre}
          </p>
          {plan.presupuesto_codigo && (
            <p className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">
              {plan.presupuesto_codigo}
            </p>
          )}
        </div>

        {/* Responsable actual */}
        {responsableActual && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">
              Responsable actual
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-black text-xs">
                {String(responsableActual.nombre || responsableActual.email || '?')
                  .charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {responsableActual.nombre || 'Sin nombre'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {responsableActual.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selector de nuevo responsable */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            Nuevo responsable
          </label>
          <select
            value={responsableId}
            onChange={(e) => setResponsableId(e.target.value)}
            disabled={isSaving}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 cursor-pointer disabled:bg-slate-100"
          >
            <option value="">-- Sin responsable --</option>
            {responsablesDisponibles.map(u => {
              const rolLabel = ROLES_RESPONSABLES.find(
                r => r.id === String(u.role || u.rol || '').toLowerCase()
              )?.label || '';
              return (
                <option key={u.id} value={u.id}>
                  {u.nombre || u.email} — {rolLabel}
                </option>
              );
            })}
          </select>

          {responsablesDisponibles.length === 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[10px] font-bold text-amber-900">
                No hay usuarios con rol Jefe de Obra, Admin o Administrador cargados.
              </p>
            </div>
          )}
        </div>

        {/* Info adicional */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-[10px] text-blue-800">
            El responsable también se actualiza en el presupuesto vinculado para hacer seguimiento.
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}