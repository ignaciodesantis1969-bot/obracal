// src/components/planificacion/proyectos/detalle/reuniones/ReunionModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2, Users as UsersIcon, FileText, CheckSquare } from 'lucide-react';
import Modal from '@/components/planificacion/shared/Modal';
import { cn } from '@/lib/utils';
import CompromisosList from './CompromisosList';

const TIPOS_REUNION = [
  { value: 'obra',         label: '🏗️ Obra',         color: 'bg-blue-100 text-blue-800' },
  { value: 'coordinacion', label: '📋 Coordinación', color: 'bg-purple-100 text-purple-800' },
  { value: 'avance',       label: '📈 Avance',       color: 'bg-emerald-100 text-emerald-800' },
  { value: 'otro',         label: '💬 Otro',         color: 'bg-slate-100 text-slate-700' },
];

export default function ReunionModal({
  isOpen,
  onClose,
  onGuardar,
  reunion,
  fechaPreseleccionada,
  personal = [],
  tareas = [],
}) {
  const esEdicion = !!reunion;

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'obra',
    fecha: '',
    hora_inicio: '10:00',
    hora_fin: '11:00',
    lugar: '',
    asistentes: [],
    tarea_id: '',
    notas: '',
    compromisos: [],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Resetear o cargar datos al abrir
  useEffect(() => {
    if (!isOpen) return;

    if (esEdicion && reunion) {
      setFormData({
        titulo: reunion.titulo || '',
        tipo: reunion.tipo || 'obra',
        fecha: reunion.fecha || '',
        hora_inicio: reunion.hora_inicio || '10:00',
        hora_fin: reunion.hora_fin || '11:00',
        lugar: reunion.lugar || '',
        asistentes: Array.isArray(reunion.asistentes) ? reunion.asistentes : [],
        tarea_id: reunion.tarea_id || '',
        notas: reunion.notas || '',
        compromisos: Array.isArray(reunion.compromisos) ? reunion.compromisos : [],
      });
    } else {
      setFormData({
        titulo: '',
        tipo: 'obra',
        fecha: fechaPreseleccionada || new Date().toISOString().slice(0, 10),
        hora_inicio: '10:00',
        hora_fin: '11:00',
        lugar: '',
        asistentes: [],
        tarea_id: '',
        notas: '',
        compromisos: [],
      });
    }
    setIsSaving(false);
  }, [isOpen, esEdicion, reunion, fechaPreseleccionada]);

  // Personal activo
  const personalActivo = useMemo(
    () => personal.filter(p => String(p.estado || '').toLowerCase() === 'activo'),
    [personal]
  );

  // Toggle asistente
  const toggleAsistente = (id) => {
    const idStr = String(id);
    setFormData(prev => ({
      ...prev,
      asistentes: prev.asistentes.includes(idStr)
        ? prev.asistentes.filter(a => a !== idStr)
        : [...prev.asistentes, idStr],
    }));
  };

  // Guardar
  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!formData.titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }
    if (!formData.fecha) {
      alert('La fecha es obligatoria');
      return;
    }

    setIsSaving(true);
    try {
      await onGuardar(formData);
    } catch (err) {
      console.error('[ReunionModal] Error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esEdicion ? 'Editar Reunión' : 'Nueva Reunión'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleGuardar} className="space-y-5 max-h-[80vh] overflow-y-auto">

        {/* Título */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Título *
          </label>
          <input
            type="text"
            required
            disabled={isSaving}
            value={formData.titulo}
            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            placeholder="Ej: Reunión de avance semanal"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Tipo de reunión *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIPOS_REUNION.map(t => (
              <button
                key={t.value}
                type="button"
                disabled={isSaving}
                onClick={() => setFormData({ ...formData, tipo: t.value })}
                className={cn(
                  'px-3 py-2 rounded-lg text-[11px] font-bold border-2 transition-all cursor-pointer disabled:opacity-50',
                  formData.tipo === t.value
                    ? 'border-amber-500 bg-amber-50 scale-105 shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fecha + Horarios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Fecha *
            </label>
            <input
              type="date"
              required
              disabled={isSaving}
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Hora inicio
            </label>
            <input
              type="time"
              disabled={isSaving}
              value={formData.hora_inicio}
              onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Hora fin
            </label>
            <input
              type="time"
              disabled={isSaving}
              value={formData.hora_fin}
              onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
            />
          </div>
        </div>

        {/* Lugar */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Lugar
          </label>
          <input
            type="text"
            disabled={isSaving}
            value={formData.lugar}
            onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
            placeholder="Ej: Oficina central / Obra / Zoom"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
          />
        </div>

        {/* Asistentes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
            <UsersIcon className="w-3.5 h-3.5 text-blue-500" />
            Asistentes ({formData.asistentes.length})
          </label>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-1">
            {personalActivo.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-3 col-span-2">
                No hay personal activo cargado
              </p>
            )}
            {personalActivo.map(p => {
              const pId = String(p.id || p.ID);
              const seleccionado = formData.asistentes.includes(pId);
              return (
                <button
                  key={pId}
                  type="button"
                  disabled={isSaving}
                  onClick={() => toggleAsistente(pId)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer disabled:opacity-50',
                    seleccionado
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : 'bg-white border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                    seleccionado ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'
                  )}>
                    {seleccionado && <span className="text-white text-[10px] font-black">✓</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {p.nombre || p.Nombre}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate">
                      {p.especialidad || p.Especialidad || ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarea vinculada (opcional) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
            Tarea vinculada (opcional)
          </label>
          <select
            disabled={isSaving}
            value={formData.tarea_id}
            onChange={(e) => setFormData({ ...formData, tarea_id: e.target.value })}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer"
          >
            <option value="">Sin tarea vinculada</option>
            {tareas.map(t => (
              <option key={t.id} value={t.id}>
                [{t.rubro_nombre}] {t.tarea_nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Notas / Minuta */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
            Notas / Minuta
          </label>
          <textarea
            rows={4}
            disabled={isSaving}
            value={formData.notas}
            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            placeholder="Escribí los temas tratados, decisiones tomadas, etc."
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 disabled:bg-slate-100 resize-none"
          />
        </div>

        {/* Compromisos */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <CompromisosList
            compromisos={formData.compromisos}
            setCompromisos={(nuevos) => setFormData({ ...formData, compromisos: nuevos })}
            personal={personal}
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {esEdicion ? 'Guardar cambios' : 'Crear reunión'}
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
}