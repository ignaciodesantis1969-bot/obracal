import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { BarChart3, Plus, Pencil, Trash2, CheckCircle2, Clock, AlertCircle, FileDown, Package } from 'lucide-react';
import { toast } from 'sonner';

const CERT_ESTADO_COLORS = { borrador:'bg-slate-100 text-slate-600', presentado:'bg-amber-100 text-amber-700', aprobado:'bg-blue-100 text-blue-700', cobrado:'bg-emerald-100 text-emerald-700' };

export default function Reportes() {
  const [obras, setObras] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [certificaciones, setCertificaciones] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [obraSeleccionada, setObraSeleccionada] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [certModal, setCertModal] = useState(false);
  const [certEdit, setCertEdit] = useState(null);
  const [certForm, setCertForm] = useState({ obra_id:'', presupuesto_id:'', fecha: new Date().toISOString().slice(0,10), periodo_desde:'', periodo_hasta:'', estado:'borrador', items:[], total_certificado:0, ajuste_precios:0, indice_ajuste:'', porcentaje_ajuste:0, notas:'' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    Promise.all([
      base44.entities.Obra.list(),
      base44.entities.Presupuesto.list(),
      base44.entities.Tarea.list(),
      base44.entities.Rubro.list(),
      base44.entities.MovimientoTesoreria.list('-fecha'),
      base44.entities.Factura.list(),
      base44.entities.Certificacion.list('-fecha'),
      base44.entities.Insumo.list()
    ]).then(([o, p, t, r, m, f, c, ins]) => {
      setObras(o); setPresupuestos(p); setTareas(t); setRubros(r);
      setMovimientos(m); setFacturas(f); setCertificaciones(c); setInsumos(ins); setLoading(false);
    });
  };
  useEffect(() => { load(); }, []);

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  // Dashboard stats
  const obrasFiltradas = obraSeleccionada ? obras.filter(o => o.id === obraSeleccionada) : obras;
  const presupuestosFiltrados = presupuestos.filter(p => !obraSeleccionada || p.obra_id === obraSeleccionada);
  const movsFiltrados = movimientos.filter(m => !obraSeleccionada || m.obra_id === obraSeleccionada);
  const certsFiltradas = certificaciones.filter(c => !obraSeleccionada || c.obra_id === obraSeleccionada);

  const totalPresupuestado = presupuestosFiltrados.reduce((s, p) => s + (p.precio_venta_total || 0), 0);
  const totalCertificado = certsFiltradas.reduce((s, c) => s + (c.total_certificado || 0), 0);
  const totalCobrado = movsFiltrados.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const totalGastado = movsFiltrados.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0);

  // Por rubro (si hay obra seleccionada con presupuesto)
  const presObraId = presupuestosFiltrados[0]?.id;
  const rubrosData = rubros.filter(r => !presObraId || r.presupuesto_id === presObraId).map(r => {
    const tareasR = tareas.filter(t => t.rubro_id === r.id);
    return { name: r.nombre, costo: tareasR.reduce((s, t) => s + (t.costo_total || 0), 0) };
  }).filter(r => r.costo > 0);

  // Pie estado de obras
  const estadosObra = [
    { name: 'En presupuesto', value: obras.filter(o => o.estado === 'en_presupuesto').length, color: '#94a3b8' },
    { name: 'Adjudicadas', value: obras.filter(o => o.estado === 'adjudicada').length, color: '#f59e0b' },
    { name: 'En ejecución', value: obras.filter(o => o.estado === 'en_ejecucion').length, color: '#10b981' },
    { name: 'Finalizadas', value: obras.filter(o => o.estado === 'finalizada').length, color: '#3b82f6' },
  ].filter(e => e.value > 0);

  // Handles Certificaciones
  // Panel insumos: presupuestado vs comprado
  const insumosPanel = () => {
    if (!obraSeleccionada) return [];
    const pres = presupuestos.find(p => p.obra_id === obraSeleccionada);
    if (!pres) return [];
    const tareasP = tareas.filter(t => t.presupuesto_id === pres.id);
    // Agrupa insumos presupuestados
    const mapa = {};
    tareasP.forEach(t => {
      (t.insumos || []).forEach(ins => {
        const key = ins.insumo_id;
        if (!mapa[key]) mapa[key] = { insumo_id: key, nombre: ins.insumo_nombre, unidad: ins.unidad, presupuestado: 0, comprado: 0 };
        mapa[key].presupuestado += (ins.cantidad || 0) * (t.cantidad || 1);
      });
    });
    // Suma facturas compradas para este presupuesto
    facturas.filter(f => f.presupuesto_id === pres.id).forEach(f => {
      (f.items || []).forEach(item => {
        const key = item.insumo_id;
        if (key && mapa[key]) mapa[key].comprado += (item.cantidad || 0);
        else if (key) mapa[key] = { insumo_id: key, nombre: item.insumo_nombre || key, unidad: item.unidad, presupuestado: 0, comprado: item.cantidad || 0 };
      });
    });
    return Object.values(mapa).filter(i => i.presupuestado > 0 || i.comprado > 0);
  };

  const openNewCert = () => {
    setCertEdit(null);
    setCertForm({ obra_id: obraSeleccionada, presupuesto_id:'', fecha: new Date().toISOString().slice(0,10), periodo_desde:'', periodo_hasta:'', estado:'borrador', items:[], total_certificado:0, ajuste_precios:0, indice_ajuste:'', porcentaje_ajuste:0, notas:'' });
    setCertModal(true);
  };
  const openEditCert = (c) => { setCertEdit(c); setCertForm({...c}); setCertModal(true); };

  const nextCertCodigo = (obraId) => {
    const obra = obras.find(o => o.id === obraId);
    const base = obra?.codigo || 'OB000';
    const nums = certificaciones.filter(c => c.obra_id === obraId).map(c => parseInt(c.codigo?.split('-CERT')[1] || '0'));
    return `${base}-CERT${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
  };

  const handleSaveCert = async () => {
    if (!certForm.obra_id || !certForm.fecha) { toast.error('Obra y fecha son obligatorias'); return; }
    setSaving(true);
    const obra = obras.find(o => o.id === certForm.obra_id);
    const data = { ...certForm, obra_codigo: obra?.codigo };
    if (certEdit) { await base44.entities.Certificacion.update(certEdit.id, data); toast.success('Certificación actualizada'); }
    else { await base44.entities.Certificacion.create({ ...data, codigo: nextCertCodigo(certForm.obra_id) }); toast.success('Certificación creada'); }
    setSaving(false); setCertModal(false); load();
  };

  const handleDeleteCert = async (cert) => {
    await base44.entities.Certificacion.delete(cert.id);
    toast.success('Certificación eliminada');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Control y Reportes</h1>
          <p className="text-slate-500 text-sm">Dashboard, certificaciones y análisis financiero</p>
        </div>
        <Select value={obraSeleccionada} onValueChange={setObraSeleccionada}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Todas las obras" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Todas las obras</SelectItem>
            {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Presupuestado', value: fmt(totalPresupuestado), color: 'border-l-blue-500', textColor: 'text-blue-600' },
          { label: 'Total Certificado', value: fmt(totalCertificado), color: 'border-l-amber-500', textColor: 'text-amber-600' },
          { label: 'Total Cobrado', value: fmt(totalCobrado), color: 'border-l-emerald-500', textColor: 'text-emerald-600' },
          { label: 'Total Gastado', value: fmt(totalGastado), color: 'border-l-red-500', textColor: 'text-red-600' },
        ].map(({ label, value, color, textColor }) => (
          <div key={label} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${color} p-4`}>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className={`text-lg font-bold mt-1 ${textColor}`}>{value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="certificaciones">Certificaciones</TabsTrigger>
          <TabsTrigger value="insumos">Insumos</TabsTrigger>
          <TabsTrigger value="listado_insumos">Listado por Obra</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Estado obras */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-4">Estado de Obras</h3>
              {estadosObra.length === 0 ? (
                <div className="py-12 text-center text-slate-400">No hay datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={estadosObra} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: ${value}`} labelLine={false}>
                      {estadosObra.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Costos por Rubro */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-700 mb-4">Costos por Rubro</h3>
              {rubrosData.length === 0 ? (
                <div className="py-12 text-center text-slate-400">Seleccioná una obra con presupuesto</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rubrosData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="costo" name="Costo" fill="#f59e0b" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Resumen Financiero</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-blue-600">{obras.length}</div>
                <div className="text-xs text-slate-500 mt-1">Total Obras</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">{presupuestos.filter(p=>p.estado==='aprobado').length}</div>
                <div className="text-xs text-slate-500 mt-1">Presupuestos Aprobados</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600">{certificaciones.filter(c=>c.estado==='cobrado').length}</div>
                <div className="text-xs text-slate-500 mt-1">Certificaciones Cobradas</div>
              </div>
              <div>
                <div className={`text-2xl font-black ${totalCobrado - totalGastado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalCobrado - totalGastado)}</div>
                <div className="text-xs text-slate-500 mt-1">Resultado Neto</div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certificaciones" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewCert} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Nueva Certificación
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {certsFiltradas.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay certificaciones</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Código','Obra','Presupuesto','Fecha','Total Certif.','Ajuste','Estado','Acciones'].map(h=><th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certsFiltradas.map(c=>(
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-emerald-600 font-semibold">{c.codigo}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{c.obra_codigo}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.presupuesto_codigo || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.fecha}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{fmt(c.total_certificado)}</td>
                        <td className="px-4 py-3 text-xs">{c.ajuste_precios > 0 ? <span className="text-emerald-600 font-medium">+{fmt(c.ajuste_precios)}</span> : '—'}</td>
                        <td className="px-4 py-3"><Badge className={`${CERT_ESTADO_COLORS[c.estado]||''} border-0 text-xs`}>{c.estado}</Badge></td>
                        <td className="px-4 py-3"><div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => openEditCert(c)}><Pencil className="w-4 h-4"/></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDeleteCert(c)}><Trash2 className="w-4 h-4"/></Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insumos" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {!obraSeleccionada ? (
              <div className="py-16 text-center text-slate-400">
                <p className="font-medium">Seleccioná una obra para ver el control de insumos</p>
                <p className="text-sm mt-1">Presupuestado vs Comprado (según facturas registradas)</p>
              </div>
            ) : insumosPanel().length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p>No hay insumos presupuestados o facturas con insumos para esta obra</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Insumo','Unidad','Presupuestado','Comprado','Saldo','% Avance'].map(h=><th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insumosPanel().map((ins, i) => {
                      const saldo = ins.presupuestado - ins.comprado;
                      const pct = ins.presupuestado > 0 ? Math.min(100, (ins.comprado / ins.presupuestado) * 100) : 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{ins.nombre}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{ins.unidad || '—'}</td>
                          <td className="px-4 py-3 text-blue-700 font-semibold">{ins.presupuestado.toFixed(2)}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold">{ins.comprado.toFixed(2)}</td>
                          <td className={`px-4 py-3 font-bold ${saldo < 0 ? 'text-red-600' : 'text-slate-700'}`}>{saldo.toFixed(2)}</td>
                          <td className="px-4 py-3 w-40">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="listado_insumos" className="mt-4 space-y-4">
          {/* Listado de insumos por obra — todos los presupuestos de la obra seleccionada */}
          {!obraSeleccionada ? (
            <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Seleccioná una obra para generar el listado</p>
            </div>
          ) : (() => {
            const obra = obras.find(o => o.id === obraSeleccionada);
            const presObra = presupuestos.filter(p => p.obra_id === obraSeleccionada);
            const presIds = new Set(presObra.map(p => p.id));
            const tareasObra = tareas.filter(t => presIds.has(t.presupuesto_id));

            // Agrupar insumos sumando cantidades*cantidad_tarea y costos
            const mapa = {};
            tareasObra.forEach(t => {
              (t.insumos || []).forEach(ins => {
                const key = ins.insumo_id || ins.insumo_nombre;
                if (!mapa[key]) mapa[key] = {
                  insumo_id: ins.insumo_id,
                  nombre: ins.insumo_nombre,
                  tipo: ins.insumo_tipo,
                  unidad: ins.unidad,
                  cantidad_total: 0,
                  costo_total: 0
                };
                const cantTotal = (ins.cantidad || 0) * (t.cantidad || 1);
                mapa[key].cantidad_total += cantTotal;
                mapa[key].costo_total += cantTotal * (ins.costo_unitario || 0);
              });
            });

            const filas = Object.values(mapa).sort((a, b) => {
              const orden = { material: 0, mano_de_obra: 1, equipo: 2, subcontrato: 3 };
              return (orden[a.tipo] ?? 9) - (orden[b.tipo] ?? 9) || a.nombre?.localeCompare(b.nombre);
            });

            const TIPO_COLORS = { material:'bg-blue-100 text-blue-700', mano_de_obra:'bg-orange-100 text-orange-700', equipo:'bg-purple-100 text-purple-700', subcontrato:'bg-teal-100 text-teal-700' };
            const TIPO_LABELS = { material:'Material', mano_de_obra:'Mano de Obra', equipo:'Equipo', subcontrato:'Subcontrato' };
            const totalCostoInsumos = filas.reduce((s, f) => s + f.costo_total, 0);

            const handlePrint = () => {
              const rows = filas.map(f => `
                <tr>
                  <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${f.nombre}</td>
                  <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${TIPO_LABELS[f.tipo] || f.tipo}</td>
                  <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${f.cantidad_total.toFixed(2)}</td>
                  <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${f.unidad || '—'}</td>
                  <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmt(f.costo_total)}</td>
                </tr>`).join('');
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Listado Insumos - ${obra?.nombre}</title>
                <style>body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:24px;font-size:13px;}
                table{width:100%;border-collapse:collapse;}thead tr{background:#f1f5f9;}</style></head><body>
                <div style="display:flex;justify-content:space-between;border-bottom:3px solid #f59e0b;padding-bottom:12px;margin-bottom:20px;">
                  <div><h1 style="margin:0;font-size:18px;">Listado de Insumos por Obra</h1>
                  <p style="margin:4px 0 0;color:#64748b;">Obra: <strong>${obra?.nombre}</strong> — ${obra?.codigo}</p></div>
                  <div style="text-align:right;font-size:11px;color:#94a3b8;"><p style="margin:0;font-weight:700;">ObrasManager</p>
                  <p style="margin:2px 0;">Generado: ${new Date().toLocaleDateString('es-AR')}</p></div>
                </div>
                <table>
                  <thead><tr>
                    <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;">Insumo</th>
                    <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;">Tipo</th>
                    <th style="padding:7px 10px;text-align:right;font-size:11px;color:#64748b;">Cantidad</th>
                    <th style="padding:7px 10px;text-align:center;font-size:11px;color:#64748b;">Unidad</th>
                    <th style="padding:7px 10px;text-align:right;font-size:11px;color:#64748b;">Costo Total</th>
                  </tr></thead>
                  <tbody>${rows}</tbody>
                  <tfoot><tr style="background:#f8fafc;font-weight:700;">
                    <td colspan="4" style="padding:8px 10px;">TOTAL</td>
                    <td style="padding:8px 10px;text-align:right;color:#d97706;">${fmt(totalCostoInsumos)}</td>
                  </tr></tfoot>
                </table></body></html>`;
              const win = window.open('', '_blank');
              win.document.write(html);
              win.document.close();
              setTimeout(() => win.print(), 500);
            };

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Obra: <strong>{obra?.nombre}</strong> — {filas.length} insumos distintos</p>
                    <p className="text-xs text-slate-400">Suma de todos los presupuestos de la obra ({presObra.length} presupuesto/s)</p>
                  </div>
                  <Button onClick={handlePrint} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <FileDown className="w-4 h-4" /> Exportar PDF
                  </Button>
                </div>

                {filas.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400">
                    No hay insumos en los presupuestos de esta obra
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {['Insumo','Tipo','Cantidad Total','Unidad','Costo Total'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filas.map((f, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-medium text-slate-800">{f.nombre}</td>
                              <td className="px-4 py-3">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TIPO_COLORS[f.tipo] || 'bg-slate-100 text-slate-600'}`}>
                                  {TIPO_LABELS[f.tipo] || f.tipo}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800 tabular-nums">{f.cantidad_total.toFixed(2)}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{f.unidad || '—'}</td>
                              <td className="px-4 py-3 font-bold text-amber-700">{fmt(f.costo_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                            <td colSpan={4} className="px-4 py-3 text-slate-700">TOTAL</td>
                            <td className="px-4 py-3 text-amber-700 text-base">{fmt(totalCostoInsumos)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="comparativo" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-semibold text-slate-700">Presupuestado vs Cobrado vs Gastado</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[{
                name: 'Financiero',
                Presupuestado: totalPresupuestado,
                Certificado: totalCertificado,
                Cobrado: totalCobrado,
                Gastado: totalGastado
              }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend />
                <Bar dataKey="Presupuestado" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Certificado" fill="#f59e0b" radius={[4,4,0,0]} />
                <Bar dataKey="Cobrado" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Gastado" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: '% Certificado / Presupuesto', value: totalPresupuestado > 0 ? `${((totalCertificado / totalPresupuestado) * 100).toFixed(1)}%` : '—', color: 'text-amber-600' },
                { label: '% Cobrado / Presupuesto', value: totalPresupuestado > 0 ? `${((totalCobrado / totalPresupuestado) * 100).toFixed(1)}%` : '—', color: 'text-emerald-600' },
                { label: '% Gastado / Cobrado', value: totalCobrado > 0 ? `${((totalGastado / totalCobrado) * 100).toFixed(1)}%` : '—', color: 'text-red-600' },
                { label: 'Margen Neto', value: totalPresupuestado > 0 ? `${(((totalCobrado - totalGastado) / totalPresupuestado) * 100).toFixed(1)}%` : '—', color: 'text-blue-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className={`text-2xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Certificación */}
      <Dialog open={certModal} onOpenChange={setCertModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{certEdit ? 'Editar Certificación' : 'Nueva Certificación'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1"><Label>Obra *</Label>
              <Select value={certForm.obra_id} onValueChange={v=>setCertForm(f=>({...f,obra_id:v, presupuesto_id:''}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar obra..." /></SelectTrigger>
                <SelectContent>{obras.map(o=><SelectItem key={o.id} value={o.id}>{o.codigo} - {o.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>Presupuesto</Label>
              <Select value={certForm.presupuesto_id} onValueChange={v=>setCertForm(f=>({...f,presupuesto_id:v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin presupuesto</SelectItem>
                  {presupuestos.filter(p => !certForm.obra_id || p.obra_id === certForm.obra_id).map(p=><SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={certForm.fecha} onChange={e=>setCertForm(f=>({...f,fecha:e.target.value}))}/></div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={certForm.estado} onValueChange={v=>setCertForm(f=>({...f,estado:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['borrador','presentado','aprobado','cobrado'].map(e=><SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Período Desde</Label><Input type="date" value={certForm.periodo_desde} onChange={e=>setCertForm(f=>({...f,periodo_desde:e.target.value}))}/></div>
            <div className="space-y-1"><Label>Período Hasta</Label><Input type="date" value={certForm.periodo_hasta} onChange={e=>setCertForm(f=>({...f,periodo_hasta:e.target.value}))}/></div>
            <div className="col-span-2 space-y-1"><Label>Total Certificado ($)</Label><Input type="number" value={certForm.total_certificado} onChange={e=>setCertForm(f=>({...f,total_certificado:parseFloat(e.target.value)||0}))}/></div>
            {/* Ajuste de precios */}
            <div className="col-span-2 border-t border-slate-200 pt-3 mt-1">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Ajuste de Precios</p>
            </div>
            <div className="space-y-1"><Label>Índice (CAC, IPC, etc.)</Label><Input value={certForm.indice_ajuste} onChange={e=>setCertForm(f=>({...f,indice_ajuste:e.target.value}))} placeholder="Ej: CAC"/></div>
            <div className="space-y-1"><Label>% Ajuste</Label>
              <Input type="number" value={certForm.porcentaje_ajuste} onChange={e => {
                const pct = parseFloat(e.target.value) || 0;
                const aj = (certForm.total_certificado * pct) / 100;
                setCertForm(f=>({...f, porcentaje_ajuste: pct, ajuste_precios: aj}));
              }} step="0.01" />
            </div>
            <div className="col-span-2 space-y-1"><Label>Monto Ajuste ($)</Label>
              <Input type="number" value={certForm.ajuste_precios} onChange={e=>setCertForm(f=>({...f,ajuste_precios:parseFloat(e.target.value)||0}))} />
              {certForm.ajuste_precios > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  Total con ajuste: <strong className="text-emerald-700">{new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format((certForm.total_certificado||0)+(certForm.ajuste_precios||0))}</strong>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setCertModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveCert} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">{saving?'Guardando...':certEdit?'Guardar':'Crear Certificación'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}