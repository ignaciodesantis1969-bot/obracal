import React, { useState } from 'react';
import { Plus, Search, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const MEDIOS = ['efectivo', 'transferencia', 'cheque', 'otro'];
const emptyForm = { tipo: 'egreso', concepto: '', obra_id: 'NONE', presupuesto_id: 'NONE', fecha: new Date().toISOString().slice(0, 10), monto: 0, medio_pago: 'transferencia', referencia: '', notas: '' };

export default function Tesoreria({ 
  GOOGLE_SCRIPT_URL, 
  movimientos = [], 
  facturas = [], 
  obras = [], 
  presupuestos = [], 
  clientes = [], 
  cargarDatos 
}) {
  const [search, setSearch] = useState('');
  const [obraFiltro, setObraFiltro] = useState('ALL');
  const [tab, setTab] = useState('movimientos');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Blindaje de arrays para evitar fallos si alguna prop llega indefinida
  const safeObras = Array.isArray(obras) ? obras : [];
  const safePresupuestos = Array.isArray(presupuestos) ? presupuestos : [];
  const safeMovimientos = Array.isArray(movimientos) ? movimientos : [];
  const safeFacturas = Array.isArray(facturas) ? facturas : [];

  const presupuestosPorObra = safePresupuestos.filter(p => !form.obra_id || form.obra_id === 'NONE' || String(p.obra_id) === String(form.obra_id));

  const handleSave = async () => {
    if (!form.concepto.trim() || !form.monto) {
      alert('Concepto y monto son obligatorios');
      return;
    }
    if (!GOOGLE_SCRIPT_URL) {
      alert('ERROR: GOOGLE_SCRIPT_URL no está configurada.');
      return;
    }

    setSaving(true);
    const obraIdReal = form.obra_id === 'NONE' ? '' : form.obra_id;
    const presupuestoIdReal = form.presupuesto_id === 'NONE' ? '' : form.presupuesto_id;

    const obra = safeObras.find(o => String(o.id) === String(obraIdReal));
    const pres = safePresupuestos.find(p => String(p.id) === String(presupuestoIdReal));
    
    const data = { 
      ...form, 
      obra_id: obraIdReal,
      presupuesto_id: presupuestoIdReal,
      monto: parseFloat(form.monto) || 0, 
      obra_codigo: obra?.codigo || '', 
      presupuesto_codigo: pres?.codigo || '' 
    };

    try {
      const action = selected ? 'update' : 'create';
      const payload = {
        tabla: 'Tesoreria',
        action: action,
        id: selected ? selected.id : undefined,
        data: data
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success || result.id) {
        setModalOpen(false);
        if (typeof cargarDatos === 'function') cargarDatos();
      } else {
        alert("Error al guardar: " + (result.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar movimiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!GOOGLE_SCRIPT_URL || !selected) return;
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Tesoreria',
          action: 'delete',
          id: selected.id
        })
      });
      const result = await res.json();
      if (result.success) {
        setDeleteOpen(false);
        if (typeof cargarDatos === 'function') cargarDatos();
      } else {
        alert("Error al eliminar: " + (result.error || "Desconocido"));
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al eliminar.");
    }
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  const getObraName = (id) => safeObras.find(o => String(o.id) === String(id))?.codigo || '—';

  const filtered = safeMovimientos.filter(m => {
    const ms = (m.concepto?.toLowerCase() || '').includes(search.toLowerCase()) || (m.obra_codigo?.toLowerCase() || '').includes(search.toLowerCase());
    const mo = obraFiltro === 'ALL' || !obraFiltro || String(m.obra_id) === String(obraFiltro);
    return ms && mo;
  });

  const totalIngresos = safeMovimientos.filter(m => String(m.tipo).toLowerCase() === 'ingreso').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const totalEgresos = safeMovimientos.filter(m => String(m.tipo).toLowerCase() === 'egreso').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const balance = totalIngresos - totalEgresos;

  // Cash Flow por mes
  const cashFlowData = () => {
    const byMonth = {};
    safeMovimientos.forEach(m => {
      const mes = m.fecha ? String(m.fecha).substring(0, 7) : 'N/A';
      if (!byMonth[mes]) byMonth[mes] = { mes, ingresos: 0, egresos: 0 };
      if (String(m.tipo).toLowerCase() === 'ingreso') byMonth[mes].ingresos += Number(m.monto) || 0;
      else byMonth[mes].egresos += Number(m.monto) || 0;
    });
    return Object.values(byMonth).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12).map(d => ({
      ...d, balance: d.ingresos - d.egresos
    }));
  };

  // IVA Facturas
  const ivaCompras = safeFacturas.filter(f => String(f.tipo).toLowerCase() === 'compra').reduce((s, f) => s + (Number(f.iva_21) || 0) + (Number(f.iva_10_5 || f.iva_105) || 0), 0);
  const ivaVentas = safeFacturas.filter(f => String(f.tipo).toLowerCase() === 'venta').reduce((s, f) => s + (Number(f.iva_21) || 0) + (Number(f.iva_10_5 || f.iva_105) || 0), 0);
  const posicionIVA = ivaVentas - ivaCompras;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tesorería</h1>
          <p className="text-slate-500 text-sm">Flujo de caja, IVA y movimientos</p>
        </div>
        <Button onClick={() => { setSelected(null); setForm(emptyForm); setModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-l-4 border-l-emerald-500 border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Ingresos</p>
            <p className="text-xl font-bold text-emerald-600">{fmt(totalIngresos)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border-l-4 border-l-red-500 border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ArrowDownCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Egresos</p>
            <p className="text-xl font-bold text-red-600">{fmt(totalEgresos)}</p>
          </div>
        </div>
        <div className={`bg-white rounded-xl border-l-4 ${balance >= 0 ? 'border-l-blue-500' : 'border-l-red-600'} border border-slate-200 p-4 flex items-center gap-4 shadow-sm`}>
          <div className={`w-10 h-10 ${balance >= 0 ? 'bg-blue-100' : 'bg-red-100'} rounded-xl flex items-center justify-center`}>
            <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Balance</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(balance)}</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="iva">IVA</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos" className="mt-4 space-y-4">
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar movimiento..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={obraFiltro} onValueChange={setObraFiltro}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Todas las obras" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las obras</SelectItem>
                {safeObras.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400"><Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No hay movimientos registrados</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>{['Fecha','Tipo','Concepto','Obra','Medio','Monto','Acciones'].map(h=><th key={h} className="text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(m=>(
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.fecha}</td>
                        <td className="px-4 py-3">
                          {String(m.tipo).toLowerCase() === 'ingreso'
                            ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs flex items-center gap-1 w-fit"><TrendingUp className="w-3 h-3"/>Ingreso</Badge>
                            : <Badge className="bg-red-100 text-red-700 border-0 text-xs flex items-center gap-1 w-fit"><TrendingDown className="w-3 h-3"/>Egreso</Badge>}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{m.concepto}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{m.obra_codigo || getObraName(m.obra_id)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs capitalize">{m.medio_pago}</td>
                        <td className={`px-4 py-3 font-bold ${String(m.tipo).toLowerCase() === 'ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {String(m.tipo).toLowerCase() === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                        </td>
                        <td className="px-4 py-3"><div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600" onClick={() => { 
                            setSelected(m); 
                            setForm({
                              ...emptyForm, 
                              ...m, 
                              obra_id: m.obra_id ? String(m.obra_id) : 'NONE',
                              presupuesto_id: m.presupuesto_id ? String(m.presupuesto_id) : 'NONE'
                            }); 
                            setModalOpen(true); 
                          }}><Pencil className="w-4 h-4"/></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => { setSelected(m); setDeleteOpen(true); }}><Trash2 className="w-4 h-4"/></Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-4">Cash Flow Mensual — Ingresos vs. Egresos</h3>
            {cashFlowData().length === 0 ? (
              <div className="py-16 text-center text-slate-400">No hay datos suficientes</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={cashFlowData()} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {cashFlowData().length > 0 && (() => {
            let acumIngresos = 0, acumEgresos = 0;
            const acumData = cashFlowData().map(d => {
              acumIngresos += d.ingresos;
              acumEgresos += d.egresos;
              return { mes: d.mes, ingresosAcum: acumIngresos, egresosAcum: acumEgresos, balanceAcum: acumIngresos - acumEgresos };
            });
            return (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="font-semibold text-slate-700 mb-1">Flujo de Caja Acumulado</h3>
                <p className="text-xs text-slate-400 mb-4">Ingresos y egresos acumulados mes a mes</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={acumData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="ingresosAcum" name="Ingresos Acum." stroke="#10b981" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="egresosAcum" name="Egresos Acum." stroke="#ef4444" strokeWidth={2.5} dot={false} strokeDasharray="5 3" />
                    <Line type="monotone" dataKey="balanceAcum" name="Balance Neto Acum." stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="iva" className="mt-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
            <h3 className="font-semibold text-slate-700">Posición IVA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-xs text-red-600 font-medium">IVA Compras (CF)</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{fmt(ivaCompras)}</p>
                <p className="text-xs text-slate-500 mt-1">Crédito Fiscal</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">IVA Ventas (DB)</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(ivaVentas)}</p>
                <p className="text-xs text-slate-500 mt-1">Débito Fiscal</p>
              </div>
              <div className={`rounded-lg p-4 border ${posicionIVA >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-xs font-medium ${posicionIVA >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>Posición IVA</p>
                <p className={`text-2xl font-bold mt-1 ${posicionIVA >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{fmt(Math.abs(posicionIVA))}</p>
                <p className="text-xs text-slate-500 mt-1">{posicionIVA >= 0 ? 'A pagar (DB > CF)' : 'A favor (CF > DB)'}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Movimiento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selected ? 'Editar Movimiento' : 'Nuevo Movimiento'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1"><Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v=>setForm(f=>({...f,tipo:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ingreso">Ingreso</SelectItem><SelectItem value="egreso">Egreso</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Fecha *</Label><Input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))}/></div>
            <div className="col-span-2 space-y-1"><Label>Concepto *</Label><Input value={form.concepto} onChange={e=>setForm(f=>({...f,concepto:e.target.value}))} placeholder="Descripción del movimiento"/></div>
            <div className="space-y-1"><Label>Monto ($) *</Label><Input type="number" value={form.monto} onChange={e=>setForm(f=>({...f,monto:e.target.value}))}/></div>
            <div className="space-y-1"><Label>Medio de Pago</Label>
              <Select value={form.medio_pago} onValueChange={v=>setForm(f=>({...f,medio_pago:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MEDIOS.map(m=><SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Obra</Label>
              <Select value={String(form.obra_id || 'NONE')} onValueChange={v=>setForm(f=>({...f, obra_id: v, presupuesto_id: 'NONE'}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin obra</SelectItem>
                  {safeObras.map(o=><SelectItem key={o.id} value={String(o.id)}>{o.codigo} - {o.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Presupuesto</Label>
              <Select value={String(form.presupuesto_id || 'NONE')} onValueChange={v=>setForm(f=>({...f, presupuesto_id: v}))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sin presupuesto</SelectItem>
                  {presupuestosPorObra.map(p=><SelectItem key={p.id} value={String(p.id)}>{p.codigo} - {p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1"><Label>Referencia</Label><Input value={form.referencia} onChange={e=>setForm(f=>({...f,referencia:e.target.value}))} placeholder="N° cheque, transferencia..."/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">{saving?'Guardando...':selected?'Guardar':'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Movimiento</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">¿Eliminar el movimiento <strong>{selected?.concepto}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}