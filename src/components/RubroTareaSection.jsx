import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ChevronDown, ChevronRight, Pencil, Trash2, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import TareaForm from './TareaForm';

export default function RubroTareaSection({ presupuestoId, rubros, tareas, setRubros, setTareas, onRecalcular }) {
  const [expandedRubros, setExpandedRubros] = useState({});
  const [rubroModal, setRubroModal] = useState(false);
  const [rubroEdit, setRubroEdit] = useState(null);
  const [rubroForm, setRubroForm] = useState({ nombre: '', descripcion: '' });
  const [deleteRubroOpen, setDeleteRubroOpen] = useState(false);
  const [selectedRubro, setSelectedRubro] = useState(null);
  const [tareaModal, setTareaModal] = useState(false);
  const [tareaEdit, setTareaEdit] = useState(null);
  const [tareaRubroId, setTareaRubroId] = useState(null);
  const [deleteTareaOpen, setDeleteTareaOpen] = useState(false);
  const [selectedTarea, setSelectedTarea] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleRubro = (id) => setExpandedRubros(e => ({ ...e, [id]: !e[id] }));

  const openNewRubro = () => { setRubroEdit(null); setRubroForm({ nombre:'', descripcion:'' }); setRubroModal(true); };
  const openEditRubro = (r) => { setRubroEdit(r); setRubroForm({ nombre: r.nombre, descripcion: r.descripcion || '' }); setRubroModal(true); };

  const handleSaveRubro = async () => {
    if (!rubroForm.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    if (rubroEdit) {
      const updated = await base44.entities.Rubro.update(rubroEdit.id, rubroForm);
      setRubros(prev => prev.map(r => r.id === rubroEdit.id ? { ...r, ...rubroForm } : r));
      toast.success('Rubro actualizado');
    } else {
      const orden = rubros.length;
      const created = await base44.entities.Rubro.create({ ...rubroForm, presupuesto_id: presupuestoId, orden, costo_total: 0 });
      setRubros(prev => [...prev, created]);
      setExpandedRubros(e => ({ ...e, [created.id]: true }));
      toast.success('Rubro creado');
    }
    setSaving(false);
    setRubroModal(false);
  };

  const handleDeleteRubro = async () => {
    // Eliminar tareas del rubro
    const rubTareas = tareas.filter(t => t.rubro_id === selectedRubro.id);
    for (const t of rubTareas) await base44.entities.Tarea.delete(t.id);
    await base44.entities.Rubro.delete(selectedRubro.id);
    const newTareas = tareas.filter(t => t.rubro_id !== selectedRubro.id);
    const newRubros = rubros.filter(r => r.id !== selectedRubro.id);
    setRubros(newRubros);
    setTareas(newTareas);
    onRecalcular(newRubros, newTareas);
    toast.success('Rubro eliminado');
    setDeleteRubroOpen(false);
  };

  const openNewTarea = (rubroId) => { setTareaEdit(null); setTareaRubroId(rubroId); setTareaModal(true); };
  const openEditTarea = (t) => { setTareaEdit(t); setTareaRubroId(t.rubro_id); setTareaModal(true); };

  const handleSaveTarea = async (tareaData) => {
    setSaving(true);
    if (tareaEdit) {
      await base44.entities.Tarea.update(tareaEdit.id, tareaData);
      const newTareas = tareas.map(t => t.id === tareaEdit.id ? { ...t, ...tareaData } : t);
      setTareas(newTareas);
      onRecalcular(rubros, newTareas);
      toast.success('Tarea actualizada');
    } else {
      const orden = tareas.filter(t => t.rubro_id === tareaRubroId).length;
      const created = await base44.entities.Tarea.create({ ...tareaData, presupuesto_id: presupuestoId, rubro_id: tareaRubroId, orden });
      const newTareas = [...tareas, created];
      setTareas(newTareas);
      onRecalcular(rubros, newTareas);
      // Guardar también en el Maestro de Tareas si tiene nombre y es nueva
      if (tareaData.nombre?.trim()) {
        const insumosTemplate = (tareaData.insumos || []).map(i => ({
          insumo_id: i.insumo_id,
          insumo_nombre: i.insumo_nombre,
          insumo_tipo: i.insumo_tipo,
          cantidad_por_unidad: i.cantidad || 0,
          unidad: i.unidad,
          costo_unitario: i.costo_unitario || 0
        }));
        const hsMO = insumosTemplate.filter(i => i.insumo_tipo === 'mano_de_obra').reduce((s, i) => s + (i.cantidad_por_unidad || 0), 0);
        const cu = insumosTemplate.reduce((s, i) => s + (i.cantidad_por_unidad || 0) * (i.costo_unitario || 0), 0);
        base44.entities.TareaTemplate.create({
          nombre: tareaData.nombre,
          descripcion: tareaData.descripcion || '',
          unidad: tareaData.unidad || '',
          insumos: insumosTemplate,
          costo_unitario: cu,
          horas_mo_por_unidad: hsMO
        }).catch(() => {}); // silencioso, no bloquear el flujo
      }
      toast.success('Tarea creada y guardada en Maestro de Tareas');
    }
    setSaving(false);
    setTareaModal(false);
  };

  const handleDeleteTarea = async () => {
    await base44.entities.Tarea.delete(selectedTarea.id);
    const newTareas = tareas.filter(t => t.id !== selectedTarea.id);
    setTareas(newTareas);
    onRecalcular(rubros, newTareas);
    toast.success('Tarea eliminada');
    setDeleteTareaOpen(false);
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  const costoTotal = tareas.reduce((s, t) => s + (t.costo_total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-700">Rubros y Tareas</h2>
          <span className="text-sm text-slate-400">{rubros.length} rubros · {tareas.length} tareas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">Costo Total: <span className="text-slate-900">{fmt(costoTotal)}</span></span>
          <Button onClick={openNewRubro} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
            <Plus className="w-4 h-4" /> Rubro
          </Button>
        </div>
      </div>

      {rubros.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay rubros</p>
          <p className="text-sm">Agregá el primer rubro para organizar las tareas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rubros.map(rub => {
            const rubTareas = tareas.filter(t => t.rubro_id === rub.id);
            const rubTotal = rubTareas.reduce((s, t) => s + (t.costo_total || 0), 0);
            const isOpen = expandedRubros[rub.id] !== false;
            return (
              <div key={rub.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Rubro header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleRubro(rub.id)}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800">{rub.nombre}</span>
                    <span className="ml-2 text-xs text-slate-400">({rubTareas.length} tareas)</span>
                  </div>
                  <span className="font-bold text-slate-700 text-sm">{fmt(rubTotal)}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-600" onClick={() => openEditRubro(rub)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => { setSelectedRubro(rub); setDeleteRubroOpen(true); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs" onClick={() => openNewTarea(rub.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Tarea
                    </Button>
                  </div>
                </div>

                {/* Tareas */}
                {isOpen && (
                  <div>
                    {rubTareas.length === 0 ? (
                      <div className="py-4 text-center text-sm text-slate-400 border-t border-slate-100">
                        Sin tareas — <button className="text-blue-500 hover:underline" onClick={() => openNewTarea(rub.id)}>Agregar tarea</button>
                      </div>
                    ) : (
                      <table className="w-full text-sm border-t border-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            {['Tarea','Unidad','Cant.','C. Unit.','C. Total','Hs MO','Avance Físico','Acciones'].map(h => (
                              <th key={h} className="text-left px-4 py-2 text-slate-500 font-medium text-xs">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rubTareas.map(t => {
                            const avance = t.avance_fisico || 0;
                            const avanceColor = avance >= 100 ? 'bg-emerald-500' : avance >= 50 ? 'bg-amber-400' : 'bg-blue-400';
                            return (
                            <tr key={t.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-medium text-slate-800">{t.nombre}</td>
                              <td className="px-4 py-2.5 text-slate-500 text-xs">{t.unidad || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-600">{t.cantidad}</td>
                              <td className="px-4 py-2.5 text-slate-600">{fmt(t.costo_unitario)}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{fmt(t.costo_total)}</td>
                              <td className="px-4 py-2.5 text-slate-500 text-xs">{t.horas_mano_obra ? `${t.horas_mano_obra} hs` : '—'}</td>
                              <td className="px-4 py-2.5 min-w-[140px]">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                                    <div className={`h-2 rounded-full transition-all ${avanceColor}`} style={{ width: `${Math.min(avance, 100)}%` }} />
                                  </div>
                                  <input
                                    type="number"
                                    min="0" max="100" step="1"
                                    value={avance}
                                    className="w-14 text-xs text-center border border-slate-200 rounded px-1 py-0.5 hover:border-amber-400 focus:outline-none focus:border-amber-500"
                                    onChange={async (e) => {
                                      const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                      await base44.entities.Tarea.update(t.id, { avance_fisico: val });
                                      setTareas(prev => prev.map(x => x.id === t.id ? { ...x, avance_fisico: val } : x));
                                    }}
                                  />
                                  <span className="text-xs text-slate-400">%</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-amber-600" onClick={() => openEditTarea(t)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => { setSelectedTarea(t); setDeleteTareaOpen(true); }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Rubro */}
      <Dialog open={rubroModal} onOpenChange={setRubroModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{rubroEdit ? 'Editar Rubro' : 'Nuevo Rubro'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nombre del Rubro *</Label>
              <Input value={rubroForm.nombre} onChange={e => setRubroForm(f => ({...f, nombre: e.target.value}))} placeholder="Ej: Obra Gruesa, Instalaciones, Terminaciones" />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={rubroForm.descripcion} onChange={e => setRubroForm(f => ({...f, descripcion: e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRubroModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveRubro} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {rubroEdit ? 'Guardar' : 'Crear Rubro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Tarea */}
      <Dialog open={tareaModal} onOpenChange={setTareaModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{tareaEdit ? 'Editar Tarea' : 'Nueva Tarea'}</DialogTitle></DialogHeader>
          <TareaForm
            tarea={tareaEdit}
            onSave={handleSaveTarea}
            onCancel={() => setTareaModal(false)}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Rubro */}
      <Dialog open={deleteRubroOpen} onOpenChange={setDeleteRubroOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Rubro</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">¿Eliminar <strong>{selectedRubro?.nombre}</strong> y todas sus tareas?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRubroOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteRubro}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tarea */}
      <Dialog open={deleteTareaOpen} onOpenChange={setDeleteTareaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Tarea</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">¿Eliminar la tarea <strong>{selectedTarea?.nombre}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTareaOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteTarea}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}