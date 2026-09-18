import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FolderKanban, Calendar, Palette, Loader2, CheckCircle2 } from 'lucide-react';
import Modal from '../shared/Modal';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc } from '@/lib/firestoreHelpers';
import {
  COLORES_PLAN,
  ESTADOS_PLAN,
  extraerTareasDelPresupuesto,
  calcularFechaFin,
  getFeriadosDelAnio
} from '@/lib/planificacionHelpers';

export default function NuevoPlanModal({ isOpen, onClose, onPlanCreado, planId = null }) {
  // 🔑 planId param: null = crear, valor = editar
  const esModoEdicion = !!planId;

  const { data: presupuestosFs } = useFirestoreCollection('presupuestos');
  const { data: insumosFs } = useFirestoreCollection('insumos');
  const { data: clientesFs } = useFirestoreCollection('clientes');
  const { data: feriadosFs } = useFirestoreCollection('feriados');
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');

  const presupuestos = useMemo(
    () => (Array.isArray(presupuestosFs) ? presupuestosFs : []),
    [presupuestosFs]
  );
  const insumos = useMemo(
    () => (Array.isArray(insumosFs) ? insumosFs : []),
    [insumosFs]
  );
  const clientes = useMemo(
    () => (Array.isArray(clientesFs) ? clientesFs : []),
    [clientesFs]
  );
  const feriadosCustom = useMemo(
    () => (Array.isArray(feriadosFs) ? feriadosFs : []),
    [feriadosFs]
  );
  const planes = useMemo(
    () => (Array.isArray(planesFs) ? planesFs : []),
    [planesFs]
  );

  const [formData, setFormData] = useState({
    presupuesto_id: '',
    nombre: '',
    descripcion: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    color: COLORES_PLAN[0].hex,
    estado: 'activo'
  });

  const [isSaving, setIsSaving] = useState(false);

  // 🔑 Resetear o cargar datos del plan al abrir
  useEffect(() => {
    if (!isOpen) return;

    // MODO EDICIÓN: buscar el plan existente y precargar
    if (esModoEdicion && planId) {
      const planExistente = planes.find(p => p.id === planId);
      if (planExistente) {
        setFormData({
          presupuesto_id: String(planExistente.presupuesto_id || ''),
          nombre: planExistente.nombre || '',
          descripcion: planExistente.descripcion || '',
          fecha_inicio: planExistente.fecha_inicio || new Date().toISOString().slice(0, 10),
          color: planExistente.color || COLORES_PLAN[0].hex,
          estado: planExistente.estado || 'activo'
        });
        setIsSaving(false);
        return;
      }
    }

    // MODO CREACIÓN: resetear a defaults
    setFormData({
      presupuesto_id: '',
      nombre: '',
      descripcion: '',
      fecha_inicio: new Date().toISOString().slice(0, 10),
      color: COLORES_PLAN[0].hex,
      estado: 'activo'
    });
    setIsSaving(false);
  }, [isOpen, esModoEdicion, planId, planes]);

  // Presupuesto seleccionado
  const presupuestoActual = useMemo(() => {
    if (!formData.presupuesto_id) return null;
    return presupuestos.find(p => {
      const pId = String(p?.id || p?.ID || p?.codigo || '').trim();
      return pId === String(formData.presupuesto_id).trim();
    });
  }, [presupuestos, formData.presupuesto_id]);

  // Cliente resuelto a partir del código del presupuesto
  const clienteNombre = useMemo(() => {
    if (!presupuestoActual) return '';
    const codigo = String(presupuestoActual.codigo || '').trim();
    if (!codigo.includes('-')) return presupuestoActual.cliente || '';

    const codigoCliente = codigo.split('-')[0].trim();
    const cliente = clientes.find(c =>
      String(c.codigo || '').trim() === codigoCliente
    );
    return cliente?.razon_social || cliente?.nombre || presupuestoActual.cliente || '';
  }, [presupuestoActual, clientes]);

  // Tareas que se van a copiar (preview) — solo en modo creación
  const tareasPreview = useMemo(() => {
    if (!presupuestoActual) return [];
    if (esModoEdicion) return []; // no recalcula en edición
    return extraerTareasDelPresupuesto(presupuestoActual, insumos);
  }, [presupuestoActual, insumos, esModoEdicion]);

  // Total de días-hombre del plan
  const totalDiasHombre = useMemo(() => {
    return tareasPreview.reduce((acc, t) => acc + (t.dias_hombre || 0), 0);
  }, [tareasPreview]);

  // Autocompletar nombre cuando se selecciona presupuesto (solo en creación)
  useEffect(() => {
    if (!esModoEdicion && presupuestoActual && !formData.nombre) {
      const cod = presupuestoActual.codigo || presupuestoActual.id || '';
      const nom = presupuestoActual.nombre || 'Presupuesto';
      setFormData(prev => ({ ...prev, nombre: `[${cod}] ${nom}` }));
    }
  }, [presupuestoActual, formData.nombre, esModoEdicion]);

  // Guardar plan (crear o editar)
  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!esModoEdicion) {
      // MODO CREACIÓN: requiere presupuesto
      if (!presupuestoActual) {
        toast.error('Seleccione un presupuesto');
        return;
      }
    }
    if (!formData.nombre.trim()) {
      toast.error('Ingrese un nombre para el plan');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(esModoEdicion ? 'Actualizando plan...' : 'Creando plan de trabajo...');

    try {
      // ═══════════════════════════════════════════════════════════════
      // MODO EDICIÓN: solo actualiza campos del plan (NO recrea tareas)
      // ═══════════════════════════════════════════════════════════════
      if (esModoEdicion) {
        await actualizarDoc('planificacion_planes', planId, {
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim(),
          fecha_inicio: formData.fecha_inicio,
          color: formData.color,
          estado: formData.estado
        });

        toast.success('¡Plan actualizado con éxito!', { id: toastId });
        if (typeof onPlanCreado === 'function') onPlanCreado(planId);
        onClose();
        return;
      }

      // ═══════════════════════════════════════════════════════════════
      // MODO CREACIÓN: crea plan + copia todas las tareas
      // ═══════════════════════════════════════════════════════════════

      // PASO 1: crear el plan
      const payloadPlan = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim(),
        presupuesto_id: String(presupuestoActual.id || presupuestoActual.ID || '').trim(),
        presupuesto_codigo: presupuestoActual.codigo || '',
        cliente_codigo: String(presupuestoActual.codigo || '').split('-')[0] || '',
        cliente_nombre: clienteNombre,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: '',
        color: formData.color,
        estado: formData.estado,
        total_tareas: tareasPreview.length,
        total_dias_hombre: totalDiasHombre
      };

      const nuevoPlanId = await crearDoc('planificacion_planes', payloadPlan);

      // PASO 2: crear todas las tareas del plan
      const feriadosSet = getFeriadosDelAnio(
        Number(formData.fecha_inicio.slice(0, 4)),
        feriadosCustom
      );

      let fechaFinMax = formData.fecha_inicio;

      for (const t of tareasPreview) {
        const duracionInicial = t.dias_hombre || 1;
        const fechaFin = calcularFechaFin(formData.fecha_inicio, duracionInicial, feriadosSet);

        if (fechaFin > fechaFinMax) fechaFinMax = fechaFin;

        await crearDoc('planificacion_tareas', {
          plan_id: nuevoPlanId,
          rubro_nombre: t.rubro_nombre,
          rubro_idx: t.rubro_idx,
          tarea_nombre: t.tarea_nombre,
          tarea_idx: t.tarea_idx,
          unidad: t.unidad,
          cantidad: t.cantidad,
          insumo_mo_nombre: t.insumo_mo_nombre,
          cuadrilla_id: t.cuadrilla_id,
          cantidad_dias_teoricos: t.cantidad_dias,
          operarios_teoricos: t.operarios_teoricos,
          operarios_asignados: [],
          total_dias_hombre: t.dias_hombre,
          duracion_real_dias: duracionInicial,
          fecha_inicio: formData.fecha_inicio,
          fecha_fin: fechaFin,
          estado: 'no_iniciado',
          porcentaje_avance: 0,
          prioridad: 'media',
          predecesoras: [],
          subtareas: [],
          notas: ''
        });
      }

      // PASO 3: actualizar el plan con la fecha fin real
      await actualizarDoc('planificacion_planes', nuevoPlanId, {
        fecha_fin: fechaFinMax
      });

      toast.success(
        `¡Plan "${formData.nombre}" creado con ${tareasPreview.length} tareas!`,
        { id: toastId }
      );

      if (typeof onPlanCreado === 'function') onPlanCreado(nuevoPlanId);
      onClose();
    } catch (err) {
      console.error('[NuevoPlanModal] Error:', err);
      toast.error(
        'Error al ' + (esModoEdicion ? 'actualizar' : 'crear') + ' el plan: ' + (err.message || ''),
        { id: toastId }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={esModoEdicion ? 'Editar Plan de Trabajo' : 'Nuevo Plan de Trabajo'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleGuardar} className="space-y-5">

        {/* Presupuesto (solo lectura en edición) */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
            Presupuesto vinculado *
          </label>
          {esModoEdicion ? (
            <div className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700">
              {presupuestoActual?.codigo || formData.presupuesto_id || '---'}
              {presupuestoActual?.nombre && (
                <span className="block text-xs font-medium text-slate-500 mt-0.5">
                  {presupuestoActual.nombre}
                </span>
              )}
            </div>
          ) : (
            <select
              value={formData.presupuesto_id}
              onChange={(e) => setFormData(prev => ({ ...prev, presupuesto_id: e.target.value, nombre: '' }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 cursor-pointer"
              required
            >
              <option value="">-- Seleccionar presupuesto --</option>
              {presupuestos.map(p => {
                const pId = String(p.id || p.ID || p.codigo || '');
                const label = `[${p.codigo || pId}] ${p.nombre || 'Presupuesto'}`;
                return <option key={pId} value={pId}>{label}</option>;
              })}
            </select>
          )}
          {!esModoEdicion && presupuestos.length === 0 && (
            <p className="text-[10px] text-amber-700 mt-1">
              No hay presupuestos cargados. Creá uno primero desde el módulo Presupuestos.
            </p>
          )}
        </div>

        {/* Preview del presupuesto seleccionado (solo en creación) */}
        {!esModoEdicion && presupuestoActual && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Cliente:</span>
              <strong className="text-slate-900">{clienteNombre || '---'}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Tareas a copiar:</span>
              <strong className="text-slate-900">{tareasPreview.length}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Total días-hombre:</span>
              <strong className="text-slate-900">{totalDiasHombre.toLocaleString('es-AR')}</strong>
            </div>
          </div>
        )}

        {/* Nombre */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
            Nombre del plan *
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
            placeholder="Ej: Plan Base - Etapa 1"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
            Descripción (opcional)
          </label>
          <textarea
            rows={2}
            value={formData.descripcion}
            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
            placeholder="Ej: Demoliciones + Tabiques..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 resize-none"
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-600" /> Fecha de inicio *
            </label>
            <input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
              Estado inicial
            </label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 cursor-pointer"
            >
              {ESTADOS_PLAN.map(e => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color */}
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-amber-600" /> Color del plan
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORES_PLAN.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color: c.hex }))}
                className={`w-10 h-10 rounded-xl border-2 transition-all cursor-pointer ${
                  formData.color === c.hex ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.id}
              />
            ))}
          </div>
        </div>

        {/* Info en modo edición */}
        {esModoEdicion && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
            <strong>Modo edición:</strong> se van a actualizar solo los campos del plan (nombre, fechas, color, estado). Las tareas ya copiadas NO se modifican.
          </div>
        )}

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
            disabled={isSaving || (!esModoEdicion && !presupuestoActual)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {esModoEdicion ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> {esModoEdicion ? 'Guardar Cambios' : 'Crear Plan'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}