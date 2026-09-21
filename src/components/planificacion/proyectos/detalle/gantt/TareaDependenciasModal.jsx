// src/components/planificacion/proyectos/detalle/gantt/TareaDependenciasModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Save,
  Loader2,
  ArrowLeftRight,
  Link as LinkIcon,
  AlertTriangle,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/planificacion/shared/Modal';
import { cn } from '@/lib/utils';
import {
  normalizarPredecesoras,
  obtenerIdsPredecesoras,
  detectarCiclo,
  TIPOS_DEPENDENCIA,
} from '@/lib/planificacionHelpers';
import DependenciaItem from './DependenciaItem';

export default function TareaDependenciasModal({
  isOpen,
  onClose,
  tarea,
  tareas = [],
  onGuardar,
}) {
  const [predecesoras, setPredecesoras] = useState([]);
  const [nuevaPredId, setNuevaPredId] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('FS');
  const [nuevoLag, setNuevoLag] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [conflictoNueva, setConflictoNueva] = useState(null);

  useEffect(() => {
    if (!isOpen || !tarea) return;
    const normalizadas = normalizarPredecesoras(tarea.predecesoras);
    setPredecesoras(normalizadas);
    setNuevaPredId('');
    setNuevoTipo('FS');
    setNuevoLag(0);
    setConflictoNueva(null);
    setIsSaving(false);
  }, [isOpen, tarea?.id]);

  const sucesoras = useMemo(() => {
    if (!tarea || !Array.isArray(tareas)) return [];

    return tareas
      .filter(t => String(t.id) !== String(tarea.id))
      .filter(t => {
        const predsIds = obtenerIdsPredecesoras(t.predecesoras);
        return predsIds.some(p => String(p) === String(tarea.id));
      })
      .map(t => ({
        tarea: t,
        dependencia: normalizarPredecesoras(t.predecesoras)
          .find(p => String(p.tarea_id) === String(tarea.id)),
      }));
  }, [tarea, tareas]);

  const tareasCandidatas = useMemo(() => {
    if (!tarea || !Array.isArray(tareas)) return [];

    const idsExcluidos = new Set([
      String(tarea.id),
      ...predecesoras.map(p => String(p.tarea_id)),
      ...sucesoras.map(s => String(s.tarea.id)),
    ]);

    return tareas
      .filter(t => !idsExcluidos.has(String(t.id)))
      .sort((a, b) => {
        const rA = Number(a.rubro_idx) || 0;
        const rB = Number(b.rubro_idx) || 0;
        if (rA !== rB) return rA - rB;
        return (Number(a.tarea_idx) || 0) - (Number(b.tarea_idx) || 0);
      });
  }, [tarea, tareas, predecesoras, sucesoras]);

  useEffect(() => {
    if (!nuevaPredId || !tarea) {
      setConflictoNueva(null);
      return;
    }

    const { tieneCiclo, camino } = detectarCiclo(tarea.id, nuevaPredId, tareas);
    if (tieneCiclo) {
      const nombresCamino = camino
        .map(id => tareas.find(t => String(t.id) === String(id))?.tarea_nombre || id)
        .join(' → ');
      setConflictoNueva({
        tipo: 'ciclo',
        mensaje: `Generaría un ciclo: ${nombresCamino}`,
      });
      return;
    }

    setConflictoNueva(null);
  }, [nuevaPredId, tarea, tareas]);

  const handleAgregar = () => {
    if (!nuevaPredId) return;
    if (conflictoNueva) {
      toast.error('No se puede agregar: ' + conflictoNueva.mensaje);
      return;
    }

    setPredecesoras(prev => [
      ...prev,
      {
        tarea_id: String(nuevaPredId),
        tipo: nuevoTipo,
        lag: Number(nuevoLag) || 0,
      },
    ]);
    setNuevaPredId('');
    setNuevoTipo('FS');
    setNuevoLag(0);
  };

  const handleCambiarTipo = (idx, tipo) => {
    setPredecesoras(prev =>
      prev.map((p, i) => i === idx ? { ...p, tipo } : p)
    );
  };

  const handleCambiarLag = (idx, lag) => {
    setPredecesoras(prev =>
      prev.map((p, i) => i === idx ? { ...p, lag } : p)
    );
  };

  const handleEliminar = (idx) => {
    setPredecesoras(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGuardar = async () => {
    if (!tarea) return;

    setIsSaving(true);
    const toastId = toast.loading('Guardando dependencias...');

    try {
      await onGuardar(tarea.id, predecesoras);
      toast.success('Dependencias guardadas', { id: toastId });
      onClose();
    } catch (err) {
      console.error('[TareaDependenciasModal] Error:', err);
      toast.error('Error al guardar: ' + (err.message || ''), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  if (!tarea) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dependencias de la tarea"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-[10px] font-black text-slate-500 uppercase">Tarea</p>
          <p className="text-sm font-bold text-slate-900 truncate">
            {tarea.tarea_nombre}
          </p>
          <p className="text-[10px] font-semibold text-slate-500 uppercase">
            {tarea.rubro_nombre}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-black text-slate-900 uppercase">
              Predecesoras ({predecesoras.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              (deben completarse antes)
            </span>
          </div>

          {predecesoras.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg py-2 px-3 inline-block text-left">
              <p className="text-xs text-slate-400 italic">
                Esta tarea no tiene predecesoras
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {predecesoras.map((pred, idx) => (
                <DependenciaItem
                  key={idx}
                  dependencia={pred}
                  tareas={tareas}
                  editable
                  onCambiarTipo={(tipo) => handleCambiarTipo(idx, tipo)}
                  onCambiarLag={(lag) => handleCambiarLag(idx, lag)}
                  onEliminar={() => handleEliminar(idx)}
                />
              ))}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-blue-900 uppercase">
              Agregar predecesora
            </p>

            <div className="grid grid-cols-1 gap-2">
              <select
                value={nuevaPredId}
                onChange={(e) => setNuevaPredId(e.target.value)}
                className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">-- Seleccionar tarea --</option>
                {tareasCandidatas.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.rubro_nombre}] {t.tarea_nombre}
                  </option>
                ))}
                {tareasCandidatas.length === 0 && (
                  <option value="" disabled>Sin tareas disponibles</option>
                )}
              </select>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                  className="bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                >
                  {TIPOS_DEPENDENCIA.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.label}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={nuevoLag}
                    onChange={(e) => setNuevoLag(Number(e.target.value) || 0)}
                    className="w-14 bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-800 outline-none focus:border-amber-500"
                    title="Días de espera"
                  />
                  <span className="text-[10px] text-slate-500 font-bold">d</span>
                </div>

                <button
                  type="button"
                  onClick={handleAgregar}
                  disabled={!nuevaPredId || !!conflictoNueva}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </div>

            {conflictoNueva && (
              <div className="flex items-start gap-2 bg-rose-100 border border-rose-300 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-700 mt-0.5 shrink-0" />
                <p className="text-[11px] font-bold text-rose-900">
                  {conflictoNueva.mensaje}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-black text-slate-900 uppercase">
              Sucesoras ({sucesoras.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              (dependen de esta tarea)
            </span>
          </div>

          {sucesoras.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg py-2 px-3 inline-block text-left">
              <p className="text-xs text-slate-400 italic">
                Ninguna tarea depende de esta
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sucesoras.map(({ tarea: sucTarea, dependencia }, idx) => (
                <DependenciaItem
                  key={idx}
                  dependencia={{
                    tarea_id: sucTarea.id,
                    tipo: dependencia?.tipo || 'FS',
                    lag: dependencia?.lag || 0,
                  }}
                  tareas={tareas}
                  editable={false}
                />
              ))}
            </div>
          )}

          <div className="flex items-start gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
            <p className="text-[10px] text-slate-600">
              Para editar una sucesora, abrí las dependencias de esa tarea.
            </p>
          </div>
        </div>

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
                <Save className="w-4 h-4" /> Guardar dependencias
              </>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}