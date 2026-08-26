import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { addDays, format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const COLORES_TIPO = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-rose-400', 'bg-teal-400'];

export default function Planificacion() {
  const [obras, setObras] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [obraSeleccionada, setObraSeleccionada] = useState('todas');
  const [presupuestoSel, setPresupuestoSel] = useState('');
  const [loading, setLoading] = useState(false);
  const [editTarea, setEditTarea] = useState(null);
  const [editForm, setEditForm] = useState({ fecha_inicio_gantt: '', duracion_dias: 1 });
  const [viewStart, setViewStart] = useState(new Date());

  useEffect(() => {
    Promise.all([base44.entities.Obra.list(), base44.entities.Presupuesto.list()])
      .then(([o, p]) => { 
        setObras(o || []); 
        setPresupuestos(p || []); 
      })
      .catch(err => console.error("Error cargando obras/presupuestos:", err));
  }, []);

  useEffect(() => {
    if (!presupuestoSel) { 
      setTareas([]); 
      setRubros([]); 
      return; 
    }
    setLoading(true);
    Promise.all([
      base44.entities.Tarea.filter({ presupuesto_id: presupuestoSel }),
      base44.entities.Rubro.filter({ presupuesto_id: presupuestoSel })
    ])
      .then(([t, r]) => { 
        setTareas(t || []); 
        setRubros(r || []); 
        setLoading(false); 
      })
      .catch(err => {
        console.error("Error cargando tareas/rubros:", err);
        setLoading(false);
      });
  }, [presupuestoSel]);

  const presupuestosFiltrados = presupuestos.filter(p => 
    obraSeleccionada === 'todas' || !obraSeleccionada || String(p.obra_id) === String(obraSeleccionada)
  );

  // Generar días para el encabezado del Gantt (60 días)
  const totalDias = 60;
  const dias = Array.from({ length: totalDias }, (_, i) => addDays(viewStart, i));

  const openEditTarea = (t) => {
    setEditTarea(t);
    setEditForm({
      fecha_inicio_gantt: t.fecha_inicio_gantt ? t.fecha_inicio_gantt.split('T')[0] : format(new Date(), 'yyyy-MM-dd'),
      duracion_dias: t.duracion_dias || 1
    });
  };

  const handleSaveTarea = async () => {
    if (!editTarea) return;
    try {
      await base44.entities.Tarea.update(editTarea.id, editForm);
      setTareas(prev => prev.map(t => t.id === editTarea.id ? { ...t, ...editForm } : t));
      toast.success('Tarea actualizada con éxito');
      setEditTarea(null);
    } catch (err) {
      console.error("Error al actualizar tarea:", err);
      toast.error('No se pudo actualizar la tarea');
    }
  };

  const getTareaBar = (tarea) => {
    if (!tarea.fecha_inicio_gantt) return null;
    try {
      const inicio = parseISO(tarea.fecha_inicio_gantt);
      const startOffset = differenceInDays(inicio, viewStart);
      const duracion = Number(tarea.duracion_dias) || 1;
      if (startOffset + duracion < 0 || startOffset > totalDias) return null;
      return { left: Math.max(0, startOffset), width: duracion, overflowLeft: startOffset < 0 };
    } catch (e) {
      return null;
    }
  };

  const colWidth = 28; // px por día

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Planificación y Cronograma</h1>
        <p className="text-slate-500 text-sm">Diagrama de Gantt por presupuesto</p>
      </div>

      <div className="flex gap-3 flex-wrap items-center bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
        <Select 
          value={obraSeleccionada} 
          onValueChange={v => { 
            setObraSeleccionada(v); 
            setPresupuestoSel(''); 
          }}
        >
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por obra..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las obras</SelectItem>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo || 'OBRA'} - {o.nombre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={presupuestoSel} onValueChange={setPresupuestoSel}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Seleccionar presupuesto..." /></SelectTrigger>
          <SelectContent>
            {presupuestosFiltrados.length === 0 ? (
              <div className="p-2 text-xs text-slate-400 text-center">No hay presupuestos disponibles</div>
            ) : (
              presupuestosFiltrados.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo || 'PRES'} - {p.nombre}</SelectItem>)
            )}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="icon" onClick={() => setViewStart(d => addDays(d, -14))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-xs font-medium text-slate-600 min-w-[140px] text-center">
            {format(viewStart, 'dd MMM', { locale: es })} — {format(addDays(viewStart, totalDias - 1), 'dd MMM yyyy', { locale: es })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setViewStart(d => addDays(d, 14))}><ChevronRight className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setViewStart(new Date())}>Hoy</Button>
        </div>
      </div>

      {!presupuestoSel ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-20 text-center text-slate-400 shadow-sm">
          <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg text-slate-700">Seleccioná un presupuesto para ver el Gantt</p>
          <p className="text-sm mt-1 text-slate-500">Las tareas se organizan según su fecha de inicio y duración</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tareas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400 shadow-sm">
          <p className="text-sm">No hay tareas registradas en este presupuesto</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {/* Header días */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style={{ minWidth: `${240 + totalDias * colWidth}px` }}>
              <div className="w-60 flex-shrink-0 px-4 py-2.5 font-bold text-xs text-slate-600 uppercase tracking-wider border-r border-slate-200">
                Tarea
              </div>
              <div className="flex">
                {dias.map((d, i) => {
                  const isHoy = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const esDomingo = d.getDay() === 0;
                  const esPrimero = d.getDate() === 1;
                  return (
                    <div key={i} style={{ width: colWidth }} className={`flex-shrink-0 text-center py-2 border-r border-slate-100 relative ${isHoy ? 'bg-amber-50' : esDomingo ? 'bg-slate-100' : ''}`}>
                      {esPrimero && (
                        <span className="absolute top-0.5 left-1 text-[10px] font-bold text-slate-600">
                          {format(d, 'MMM', { locale: es })}
                        </span>
                      )}
                      <span className={`text-xs ${isHoy ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                        {format(d, 'd')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filas */}
            {rubros.map((rub, rubIdx) => {
              const rubTareas = tareas.filter(t => String(t.rubro_id) === String(rub.id));
              if (rubTareas.length === 0) return null;
              return (
                <div key={rub.id}>
                  {/* Rubro header */}
                  <div className="flex border-b border-slate-200 bg-slate-100/80" style={{ minWidth: `${240 + totalDias * colWidth}px` }}>
                    <div className="w-60 flex-shrink-0 px-4 py-2 font-extrabold text-xs text-slate-800 uppercase tracking-wide border-r border-slate-200">
                      {rub.nombre}
                    </div>
                    <div style={{ width: totalDias * colWidth }} />
                  </div>
                  {/* Tareas del rubro */}
                  {rubTareas.map((tarea, idx) => {
                    const bar = getTareaBar(tarea);
                    const colorIdx = (rubIdx * 3 + idx) % COLORES_TIPO.length;
                    return (
                      <div key={tarea.id} className="flex border-b border-slate-100 hover:bg-slate-50 group" style={{ minWidth: `${240 + totalDias * colWidth}px` }}>
                        <div className="w-60 flex-shrink-0 px-4 py-2 text-xs text-slate-700 border-r border-slate-100 flex items-center justify-between">
                          <span className="truncate flex-1 font-medium">{tarea.nombre}</span>
                          <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 ml-1 transition-opacity" onClick={() => openEditTarea(tarea)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="relative flex items-center" style={{ width: totalDias * colWidth, height: 36 }}>
                          {bar ? (
                            <div
                              className={`absolute h-6 rounded-lg ${COLORES_TIPO[colorIdx]} shadow-sm opacity-90 flex items-center px-2 text-white text-[11px] font-bold overflow-hidden cursor-pointer hover:opacity-100 transition-opacity`}
                              style={{ left: bar.left * colWidth, width: Math.max(bar.width * colWidth - 2, colWidth) }}
                              onClick={() => openEditTarea(tarea)}
                              title={`${tarea.nombre} — ${bar.width} días`}
                            >
                              {bar.width > 1 && <span className="truncate">{bar.width}d</span>}
                            </div>
                          ) : (
                            <button className="absolute left-2 text-[11px] text-slate-400 hover:text-amber-600 font-semibold" onClick={() => openEditTarea(tarea)}>
                              + Programar
                            </button>
                          )}
                          {/* Línea de hoy */}
                          <div className="absolute top-0 bottom-0 border-l-2 border-amber-500 opacity-50 z-0 pointer-events-none" style={{ left: differenceInDays(new Date(), viewStart) * colWidth }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Leyenda */}
      {presupuestoSel && tareas.length > 0 && (
        <div className="flex gap-6 text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-fit">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Hoy</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Domingo</span>
          <span className="text-slate-400">• Click en una tarea o barra para editar fecha y duración</span>
        </div>
      )}

      {/* Modal editar tarea (fecha y duración) */}
      <Dialog open={!!editTarea} onOpenChange={() => setEditTarea(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>Programar Tarea</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-800 text-sm">{editTarea?.nombre}</p>
              {editTarea?.horas_mano_obra > 0 && (
                <p className="text-xs text-slate-500 mt-1">Horas MO estimadas: {editTarea.horas_mano_obra} hs</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">Fecha de Inicio</Label>
              <Input 
                type="date" 
                value={editForm.fecha_inicio_gantt}
                onChange={e => setEditForm(f => ({...f, fecha_inicio_gantt: e.target.value}))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase">Duración (días)</Label>
              <Input 
                type="number" 
                min="1" 
                value={editForm.duracion_dias}
                onChange={e => setEditForm(f => ({...f, duracion_dias: parseInt(e.target.value) || 1}))}
                className="rounded-xl"
              />
              <p className="text-xs text-slate-500 pt-1">
                Fin estimado: {editForm.fecha_inicio_gantt
                  ? format(addDays(parseISO(editForm.fecha_inicio_gantt), editForm.duracion_dias - 1), 'dd/MM/yyyy')
                  : '—'}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditTarea(null)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleSaveTarea} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}