import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, BookTemplate, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const TIPO_COLORS = { material:'bg-blue-100 text-blue-700', mano_de_obra:'bg-orange-100 text-orange-700', equipo:'bg-purple-100 text-purple-700', subcontrato:'bg-teal-100 text-teal-700' };
const TIPO_LABELS = { material:'Material', mano_de_obra:'Mano de Obra', equipo:'Equipo', subcontrato:'Subcontrato' };

function calcDuracion(insumosConCantidad, cantidadTarea) {
  // MO se mide en días, no en horas. Suma días por unidad * cantidad de tarea / 9 trabajadores
  const diasMO = insumosConCantidad
    .filter(i => i.insumo_tipo === 'mano_de_obra')
    .reduce((s, i) => s + ((i.cantidad || 0)), 0);
  const diasTotal = diasMO * (cantidadTarea || 1);
  return Math.max(1, Math.ceil(diasTotal));
}

export default function TareaForm({ tarea, onSave, onCancel, saving }) {
  const [insumos, setInsumos] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [insumoSearch, setInsumoSearch] = useState('');
  const [form, setForm] = useState({
    nombre: '', unidad: '', cantidad: 1, duracion_dias: 1,
    insumos: [], costo_unitario: 0, costo_total: 0, horas_mano_obra: 0
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Insumo.filter({ estado: 'activo' }),
      base44.entities.TareaTemplate.list()
    ]).then(([ins, tmpl]) => { setInsumos(ins); setTemplates(tmpl); });

    if (tarea) {
      setForm({
        nombre: tarea.nombre || '',
        unidad: tarea.unidad || '',
        cantidad: tarea.cantidad || 1,
        duracion_dias: tarea.duracion_dias || 1,
        insumos: tarea.insumos || [],
        costo_unitario: tarea.costo_unitario || 0,
        costo_total: tarea.costo_total || 0,
        horas_mano_obra: tarea.horas_mano_obra || 0
      });
    }
  }, [tarea]);

  // Recalcula totales. insumos aquí tienen `cantidad` = cantidad por unidad de tarea
  const recalcular = (nuevosInsumos, cantidad) => {
    const q = cantidad !== undefined ? cantidad : form.cantidad;
    const cu = nuevosInsumos.reduce((s, i) => s + (i.costo_total || 0), 0);
    const ct = cu * q;
    const hsMO_por_unidad = nuevosInsumos
      .filter(i => i.insumo_tipo === 'mano_de_obra')
      .reduce((s, i) => s + (i.cantidad || 0), 0);
    const horas_mano_obra = hsMO_por_unidad * q;
    const duracion_dias = calcDuracion(nuevosInsumos, q);
    setForm(prev => ({ ...prev, insumos: nuevosInsumos, costo_unitario: cu, costo_total: ct, horas_mano_obra, duracion_dias }));
  };

  const cargarDesdeTemplate = (tmpl) => {
    // Convertir insumos del template (cantidad_por_unidad) al formato de tarea (cantidad = cant_por_unidad)
    const insumosConvertidos = (tmpl.insumos || []).map(i => ({
      insumo_id: i.insumo_id,
      insumo_nombre: i.insumo_nombre,
      insumo_tipo: i.insumo_tipo,
      cantidad: i.cantidad_por_unidad || 0,
      unidad: i.unidad,
      costo_unitario: i.costo_unitario || 0,
      costo_total: (i.cantidad_por_unidad || 0) * (i.costo_unitario || 0)
    }));
    const cu = insumosConvertidos.reduce((s, i) => s + (i.costo_total || 0), 0);
    const q = form.cantidad || 1;
    const hsMO_por_unidad = insumosConvertidos.filter(i => i.insumo_tipo === 'mano_de_obra').reduce((s, i) => s + (i.cantidad || 0), 0);
    const duracion_dias = calcDuracion(insumosConvertidos, q);
    setForm(prev => ({
      ...prev,
      nombre: prev.nombre || tmpl.nombre,
      unidad: prev.unidad || tmpl.unidad || '',
      insumos: insumosConvertidos,
      costo_unitario: cu,
      costo_total: cu * q,
      horas_mano_obra: hsMO_por_unidad * q,
      duracion_dias
    }));
    setTemplateSearch('');
  };

  const agregarInsumo = (insumo) => {
    if (form.insumos.find(i => i.insumo_id === insumo.id)) return;
    const nuevo = {
      insumo_id: insumo.id,
      insumo_nombre: insumo.nombre,
      insumo_tipo: insumo.tipo,
      cantidad: 1,
      unidad: insumo.unidad_medida || insumo.unidad_comercial || '',
      costo_unitario: insumo.costo_unitario || 0,
      costo_total: insumo.costo_unitario || 0
    };
    recalcular([...form.insumos, nuevo], form.cantidad);
    setInsumoSearch('');
  };

  const updateInsumo = (idx, field, value) => {
    const nuevosInsumos = form.insumos.map((ins, i) => {
      if (i !== idx) return ins;
      const upd = { ...ins, [field]: parseFloat(value) || 0 };
      upd.costo_total = upd.cantidad * upd.costo_unitario;
      return upd;
    });
    recalcular(nuevosInsumos, form.cantidad);
  };

  const quitarInsumo = (idx) => {
    recalcular(form.insumos.filter((_, i) => i !== idx), form.cantidad);
  };

  const handleCantidadChange = (v) => {
    const q = parseFloat(v) || 0.01;
    recalcular(form.insumos, q);
    setForm(prev => ({ ...prev, cantidad: q }));
  };

  const handleSave = () => {
    if (!form.nombre.trim()) return;
    onSave({ ...form });
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n || 0);

  const templatesFiltered = templates.filter(t =>
    t.nombre?.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.unidad?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const insumosDisponibles = insumos.filter(i =>
    !form.insumos.find(f => f.insumo_id === i.id) &&
    (i.nombre?.toLowerCase().includes(insumoSearch.toLowerCase()) || i.codigo?.toLowerCase().includes(insumoSearch.toLowerCase()))
  );

  return (
    <div className="space-y-5 py-2">
      {/* Cargar desde plantilla */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <BookTemplate className="w-4 h-4 text-amber-600" />
          <Label className="text-amber-800 font-semibold text-sm">Cargar desde Maestro de Tareas</Label>
        </div>
        <Input
          placeholder="Buscar plantilla..."
          value={templateSearch}
          onChange={e => setTemplateSearch(e.target.value)}
          className="text-sm bg-white"
        />
        {templateSearch && (
          <div className="border border-slate-200 rounded-lg mt-1 max-h-40 overflow-y-auto bg-white shadow-md z-10">
            {templatesFiltered.length === 0 ? (
              <p className="text-sm text-slate-400 p-3 text-center">Sin resultados</p>
            ) : templatesFiltered.slice(0, 8).map(tmpl => (
              <button key={tmpl.id}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                onClick={() => cargarDesdeTemplate(tmpl)}
              >
                <span className="text-sm font-medium text-slate-800 flex-1">{tmpl.nombre}</span>
                {tmpl.unidad && <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">{tmpl.unidad}</Badge>}
                <span className="text-xs text-slate-400">{fmt(tmpl.costo_unitario)}/u</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1">
          <Label>Nombre de la Tarea *</Label>
          <Input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} placeholder="Ej: Colocación de cerámicos" />
        </div>
        <div className="space-y-1">
          <Label>Unidad de Medida</Label>
          <Input value={form.unidad} onChange={e => setForm(f => ({...f, unidad: e.target.value}))} placeholder="m2, m3, ml, un, gl" />
        </div>
        <div className="space-y-1">
          <Label>Cantidad ({form.unidad || 'u'})</Label>
          <Input type="number" value={form.cantidad} onChange={e => handleCantidadChange(e.target.value)} min="0.01" step="0.01" />
        </div>
        <div className="space-y-1">
          <Label>Duración Gantt (días)</Label>
          <Input
            type="number"
            value={form.duracion_dias}
            onChange={e => setForm(f => ({ ...f, duracion_dias: parseInt(e.target.value) || 1 }))}
            min="1"
          />
          {form.horas_mano_obra > 0 && (
            <p className="text-xs text-slate-400">
              Auto: {form.horas_mano_obra.toFixed(2)} días MO
            </p>
          )}
        </div>
      </div>

      {/* Insumos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">
            Insumos por {form.unidad ? `1 ${form.unidad}` : 'unidad'}
          </Label>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Las cantidades son por cada 1 {form.unidad || 'unidad'} de la tarea. El costo total se multiplica por la cantidad ({form.cantidad}).
        </p>

        <Input
          placeholder="Buscar insumo para agregar..."
          value={insumoSearch}
          onChange={e => setInsumoSearch(e.target.value)}
          className="mb-2 text-sm"
        />
        {insumoSearch && (
          <div className="border border-slate-200 rounded-lg mb-3 max-h-48 overflow-y-auto bg-white shadow-md z-10">
            {insumosDisponibles.length === 0 ? (
              <p className="text-sm text-slate-400 p-3 text-center">Sin resultados</p>
            ) : insumosDisponibles.slice(0, 10).map(ins => (
              <button key={ins.id}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                onClick={() => agregarInsumo(ins)}
              >
                <span className={`text-xs px-1.5 py-0.5 rounded ${TIPO_COLORS[ins.tipo]}`}>{TIPO_LABELS[ins.tipo]}</span>
                <span className="text-sm text-slate-800 flex-1">{ins.nombre}</span>
                <span className="text-xs text-slate-500">{fmt(ins.costo_unitario)}/{ins.unidad_medida}</span>
              </button>
            ))}
          </div>
        )}

        {form.insumos.length === 0 ? (
          <div className="text-center py-6 text-slate-400 border border-dashed border-slate-300 rounded-lg text-sm">
            Buscá una plantilla arriba o agregá insumos manualmente
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {['Tipo', 'Insumo', `Cant./1 ${form.unidad || 'u'}`, 'Unidad', 'C.Unit.', 'Subtotal/u', ''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-600 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {form.insumos.map((ins, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${TIPO_COLORS[ins.insumo_tipo]}`}>{TIPO_LABELS[ins.insumo_tipo]}</span>
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800 max-w-[140px] truncate">{ins.insumo_nombre}</td>
                    <td className="px-3 py-2">
                      <Input type="number" className="h-7 w-20 text-xs" value={ins.cantidad}
                        onChange={e => updateInsumo(idx, 'cantidad', e.target.value)} min="0" step="0.001" />
                    </td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{ins.unidad}</td>
                    <td className="px-3 py-2">
                      <Input type="number" className="h-7 w-24 text-xs" value={ins.costo_unitario}
                        onChange={e => updateInsumo(idx, 'costo_unitario', e.target.value)} min="0" />
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-800 text-xs">{fmt(ins.costo_total)}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => quitarInsumo(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totales */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-slate-500">Costo / 1 {form.unidad || 'u'}</p>
          <p className="font-bold text-slate-800">{fmt(form.costo_unitario)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Costo Total (× {form.cantidad})</p>
          <p className="font-bold text-amber-700 text-lg">{fmt(form.costo_total)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Días MO Totales</p>
          <p className="font-bold text-slate-800">{(form.horas_mano_obra || 0).toFixed(2)} días</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Duración Gantt</p>
          <p className="font-bold text-blue-700">{form.duracion_dias} días</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !form.nombre.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
          {saving ? 'Guardando...' : tarea ? 'Actualizar Tarea' : 'Crear Tarea'}
        </Button>
      </div>
    </div>
  );
}