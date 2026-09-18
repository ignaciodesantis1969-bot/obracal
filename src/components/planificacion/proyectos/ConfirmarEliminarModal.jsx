import React, { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import Modal from '../shared/Modal';

export default function ConfirmarEliminarModal({ isOpen, onClose, onConfirm, plan }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!plan) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(plan.id);
      onClose();
    } catch (err) {
      console.error('[ConfirmarEliminar] Error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Eliminar Plan de Trabajo" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <div className="bg-rose-100 p-2 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <h4 className="text-xs font-black text-rose-900 uppercase mb-1">
              Esta acción no se puede deshacer
            </h4>
            <p className="text-xs text-rose-800 leading-relaxed">
              Al eliminar este plan, también se van a borrar <strong>todas sus tareas asociadas</strong> de Firestore.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Plan a eliminar:</p>
          <p className="text-sm font-bold text-slate-900">{plan.nombre}</p>
          {plan.cliente_nombre && (
            <p className="text-xs text-slate-500 mt-1">Cliente: {plan.cliente_nombre}</p>
          )}
          {plan.total_tareas > 0 && (
            <p className="text-xs text-rose-600 font-bold mt-2">
              ⚠️ Se van a borrar {plan.total_tareas} tareas
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Eliminar Plan y Tareas
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}