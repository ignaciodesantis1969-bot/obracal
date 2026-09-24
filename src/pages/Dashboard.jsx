// src/pages/Dashboard.jsx
import React, { useMemo } from 'react';
import {
  Users,
  Truck,
  Building2,
  Calculator,
  Loader2,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  CheckCircle2,
  UserCheck,
  Receipt,
  AlertTriangle,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  // ═══════════════════════════════════════════════════════════════════════
  // LECTURA DE FIRESTORE
  // ═══════════════════════════════════════════════════════════════════════
  const { data: clientesFs, loading: loadingClientes } = useFirestoreCollection('clientes');
  const { data: proveedoresFs, loading: loadingProveedores } = useFirestoreCollection('proveedores');
  const { data: obrasFs, loading: loadingObras } = useFirestoreCollection('obras');
  const { data: presupuestosFs, loading: loadingPresupuestos } = useFirestoreCollection('presupuestos');
  const { data: personalFs } = useFirestoreCollection('personal');
  const { data: movimientosFs } = useFirestoreCollection('tesoreria');
  const { data: facturasComprasFs } = useFirestoreCollection('facturas_compras');
  const { data: facturasVentasFs } = useFirestoreCollection('facturas_ventas');
  const { data: planesFs } = useFirestoreCollection('planificacion_planes');
  const { data: tareasFs } = useFirestoreCollection('planificacion_tareas');
  const { data: reunionesFs } = useFirestoreCollection('planificacion_reuniones');

  const loading =
    loadingClientes ||
    loadingProveedores ||
    loadingObras ||
    loadingPresupuestos;

  // ═══════════════════════════════════════════════════════════════════════
  // BLINDAJE DE ARRAYS
  // ═══════════════════════════════════════════════════════════════════════
  const clientes = useMemo(() => (Array.isArray(clientesFs) ? clientesFs : []), [clientesFs]);
  const proveedores = useMemo(() => (Array.isArray(proveedoresFs) ? proveedoresFs : []), [proveedoresFs]);
  const obras = useMemo(() => (Array.isArray(obrasFs) ? obrasFs : []), [obrasFs]);
  const presupuestos = useMemo(() => (Array.isArray(presupuestosFs) ? presupuestosFs : []), [presupuestosFs]);
  const personal = useMemo(() => (Array.isArray(personalFs) ? personalFs : []), [personalFs]);
  const movimientos = useMemo(() => (Array.isArray(movimientosFs) ? movimientosFs : []), [movimientosFs]);
  const facturasCompras = useMemo(() => (Array.isArray(facturasComprasFs) ? facturasComprasFs : []), [facturasComprasFs]);
  const facturasVentas = useMemo(() => (Array.isArray(facturasVentasFs) ? facturasVentasFs : []), [facturasVentasFs]);
  const planes = useMemo(() => (Array.isArray(planesFs) ? planesFs : []), [planesFs]);
  const tareas = useMemo(() => (Array.isArray(tareasFs) ? tareasFs : []), [tareasFs]);
  const reuniones = useMemo(() => (Array.isArray(reunionesFs) ? reunionesFs : []), [reunionesFs]);

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════
  const fmt = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  const fmtCompacto = (n) => {
    const abs = Math.abs(Number(n) || 0);
    if (abs >= 1000000) return `$ ${(n / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `$ ${(n / 1000).toFixed(0)}k`;
    return `$ ${abs.toFixed(0)}`;
  };

  const formatearMes = (mesAnio) => {
    if (!mesAnio) return '---';
    const [anio, mes] = mesAnio.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(mes, 10) - 1] || mes} ${anio.slice(2)}`;
  };

  // 🔑 Normaliza un estado (minúsculas, sin acentos, guiones bajos → espacios)
  const normalizarEstado = (str) => {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]/g, ' ')
      .trim();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 1 — KPIs GENERALES
  // ═══════════════════════════════════════════════════════════════════════
  const totalPresupuestos = presupuestos.length;

  const presupuestosAprobados = useMemo(
    () => presupuestos.filter(p =>
      normalizarEstado(p.estado_presupuesto || p.estado) === 'aprobado'
    ).length,
    [presupuestos]
  );

  const porcentajeAprobados = totalPresupuestos > 0
    ? Math.round((presupuestosAprobados / totalPresupuestos) * 100)
    : 0;

  const personalActivo = useMemo(
    () => personal.filter(p => normalizarEstado(p.estado) === 'activo').length,
    [personal]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 2 — FACTURACIÓN
  // ═══════════════════════════════════════════════════════════════════════
  const totalFacturadoVentas = useMemo(
    () => facturasVentas.reduce((s, f) => s + (Number(f.total || 0) || 0), 0),
    [facturasVentas]
  );

  const totalIngresos = useMemo(
    () => movimientos
      .filter(m => normalizarEstado(m.tipo) === 'ingreso')
      .reduce((s, m) => s + (Number(m.monto) || 0), 0),
    [movimientos]
  );

  const totalEgresos = useMemo(
    () => movimientos
      .filter(m => normalizarEstado(m.tipo) === 'egreso')
      .reduce((s, m) => s + (Number(m.monto) || 0), 0),
    [movimientos]
  );

  const totalFacturasAPagar = useMemo(
    () => facturasCompras
      .filter(f => {
        const estado = normalizarEstado(f.estado_pago);
        return estado === 'pendiente' || estado === 'pagado parcial' || estado === '';
      })
      .reduce((s, f) => s + (Number(f.total || 0) || 0), 0),
    [facturasCompras]
  );

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 3 — IVA
  // ═══════════════════════════════════════════════════════════════════════
  const totalIvaCompras = useMemo(
    () => facturasCompras.reduce((s, f) => {
      const iva21 = Number(f.iva_21 || f.Iva_21 || 0);
      const iva105 = Number(f.iva_105 || f.Iva_105 || f.iva_10_5 || 0);
      return s + iva21 + iva105;
    }, 0),
    [facturasCompras]
  );

  const totalIvaVentas = useMemo(
    () => facturasVentas.reduce((s, f) => {
      const iva21 = Number(f.iva_21 || f.Iva_21 || 0);
      const iva105 = Number(f.iva_105 || f.Iva_105 || f.iva_10_5 || 0);
      return s + iva21 + iva105;
    }, 0),
    [facturasVentas]
  );

  const totalRetencionesIva = useMemo(
    () => movimientos.reduce((s, m) => s + Number(m.retencion_iva || 0), 0),
    [movimientos]
  );

  const saldoIva = totalIvaVentas - totalIvaCompras - totalRetencionesIva;

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 4 — ESTADO DE PRESUPUESTOS
  // ═══════════════════════════════════════════════════════════════════════
  const estadoPresupuestos = useMemo(() => {
    const conteo = {
      borrador: 0,
      entregado: 0,
      aprobado: 0,
      rechazado: 0,
      en_ejecucion: 0,
      finalizado: 0,
    };
    presupuestos.forEach(p => {
      const est = normalizarEstado(p.estado_presupuesto || p.estado);
      // "Borrador" — incluye vacío por default
      if (!est || est === 'borrador' || est === 'en revision') {
        conteo.borrador++;
      }
      // "Entregado"
      else if (est === 'entregado' || est === 'entregada') {
        conteo.entregado++;
      }
      // "Aprobado"
      else if (est === 'aprobado' || est === 'aprobada') {
        conteo.aprobado++;
      }
      // "Rechazado"
      else if (est === 'rechazado' || est === 'rechazada') {
        conteo.rechazado++;
      }
      // "En Ejecución"
      else if (est === 'en ejecucion' || est === 'ejecucion') {
        conteo.en_ejecucion++;
      }
      // "Finalizado"
      else if (est === 'finalizado' || est === 'finalizada' || est === 'finalizadas' || est === 'completado') {
        conteo.finalizado++;
      }
    });
    return conteo;
  }, [presupuestos]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 4 — TOP 5 PROVEEDORES POR COMPRAS
  // ═══════════════════════════════════════════════════════════════════════
  const top5Proveedores = useMemo(() => {
    const map = new Map();
    facturasCompras.forEach(f => {
      const provId = String(f.proveedor_id || '');
      if (!provId) return;
      const total = Number(f.total || 0) || 0;
      if (!map.has(provId)) {
        const prov = proveedores.find(p => String(p.id || p.ID) === provId);
        map.set(provId, {
          proveedor_id: provId,
          nombre: prov?.razon_social || prov?.nombre || 'Proveedor',
          total: 0,
        });
      }
      map.get(provId).total += total;
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [facturasCompras, proveedores]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 5 — PLANIFICACIÓN
  // ═══════════════════════════════════════════════════════════════════════
  const tareasCriticas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);

    return tareas
      .filter(t => {
        if (!t.fecha_fin) return false;
        const est = normalizarEstado(t.estado);
        if (est === 'completada') return false;
        const f = new Date(t.fecha_fin + 'T00:00:00');
        return f >= hoy && f <= en7dias;
      })
      .sort((a, b) => String(a.fecha_fin).localeCompare(String(b.fecha_fin)))
      .slice(0, 5);
  }, [tareas]);

  const proximasReuniones = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return reuniones
      .filter(r => {
        if (!r.fecha) return false;
        const f = new Date(r.fecha + 'T00:00:00');
        return f >= hoy;
      })
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
      .slice(0, 5);
  }, [reuniones]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILA 6 — CASH FLOW ÚLTIMOS 12 MESES
  // ═══════════════════════════════════════════════════════════════════════
  const cashFlowData = useMemo(() => {
    const byMonth = {};
    const hoy = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = { mes: key, ingresos: 0, egresos: 0 };
    }

    movimientos.forEach(m => {
      const fecha = m.fecha || m.Fecha;
      if (!fecha) return;
      const mes = String(fecha).substring(0, 7);
      if (!byMonth[mes]) return;
      if (normalizarEstado(m.tipo) === 'ingreso') {
        byMonth[mes].ingresos += Number(m.monto) || 0;
      } else {
        byMonth[mes].egresos += Number(m.monto) || 0;
      }
    });

    return Object.values(byMonth).map(item => ({
      ...item,
      mesLabel: formatearMes(item.mes),
    }));
  }, [movimientos]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" />
        <span className="text-sm text-slate-500 font-medium mt-2 block">
          Cargando resumen general...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Resumen general del sistema</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 1 — KPIs GENERALES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Clientes" value={clientes.length} icon={Users} color="blue" />
        <KpiCard label="Proveedores" value={proveedores.length} icon={Truck} color="purple" />
        <KpiCard label="Obras" value={obras.length} icon={Building2} color="amber" />
        <KpiCard label="Presupuestos" value={totalPresupuestos} icon={Calculator} color="slate" />
        <KpiCard
          label="Aprobados"
          value={presupuestosAprobados}
          icon={CheckCircle2}
          color="emerald"
          subtitle={`${porcentajeAprobados}% del total`}
          porcentaje={porcentajeAprobados}
        />
        <KpiCard label="Personal Activo" value={personalActivo} icon={UserCheck} color="cyan" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 2 — FACTURACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Facturado (Ventas)" value={fmt(totalFacturadoVentas)} icon={Receipt} color="blue" />
        <KpiCard label="Total Ingresos" value={fmt(totalIngresos)} icon={ArrowUpCircle} color="emerald" />
        <KpiCard label="Total Egresos" value={fmt(totalEgresos)} icon={ArrowDownCircle} color="rose" />
        <KpiCard label="Facturas a Pagar" value={fmt(totalFacturasAPagar)} icon={Wallet} color="amber" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 3 — IVA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="IVA Compras" value={fmt(totalIvaCompras)} icon={FileText} color="rose" subtitle="Crédito fiscal" />
        <KpiCard label="IVA Ventas" value={fmt(totalIvaVentas)} icon={FileText} color="blue" subtitle="Débito fiscal" />
        <KpiCard label="Retenciones IVA" value={fmt(totalRetencionesIva)} icon={FileText} color="amber" />
        <KpiCard
          label="Saldo IVA"
          value={fmt(Math.abs(saldoIva))}
          icon={TrendingUp}
          color={saldoIva <= 0 ? 'emerald' : 'rose'}
          subtitle={saldoIva <= 0 ? 'A favor' : 'A pagar'}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 4 — ESTADO DE PRESUPUESTOS + TOP PROVEEDORES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Presupuestos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-slate-800 text-sm uppercase">Estado de los Presupuestos</h3>
          </div>
          <div className="space-y-2 pt-2">
            <BarraEstadoObra
              label="Borrador"
              count={estadoPresupuestos.borrador}
              total={presupuestos.length}
              color="bg-slate-500"
            />
            <BarraEstadoObra
              label="Entregado"
              count={estadoPresupuestos.entregado}
              total={presupuestos.length}
              color="bg-purple-500"
            />
            <BarraEstadoObra
              label="Aprobados"
              count={estadoPresupuestos.aprobado}
              total={presupuestos.length}
              color="bg-emerald-500"
            />
            <BarraEstadoObra
              label="Rechazados"
              count={estadoPresupuestos.rechazado}
              total={presupuestos.length}
              color="bg-rose-500"
            />
            <BarraEstadoObra
              label="En Ejecución"
              count={estadoPresupuestos.en_ejecucion}
              total={presupuestos.length}
              color="bg-indigo-500"
            />
            <BarraEstadoObra
              label="Finalizados"
              count={estadoPresupuestos.finalizado}
              total={presupuestos.length}
              color="bg-teal-500"
            />
          </div>
        </div>

        {/* Top 5 Proveedores */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-500" />
            <h3 className="font-extrabold text-slate-800 text-sm uppercase">Top 5 Proveedores por Compras</h3>
          </div>
          {top5Proveedores.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs italic">
              Sin datos de compras por proveedor
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={top5Proveedores.map(p => ({
                  ...p,
                  nombreCorto: p.nombre.length > 15 ? p.nombre.substring(0, 15) + '…' : p.nombre,
                }))}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nombreCorto" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmtCompacto(v)} />
                <Tooltip
                  formatter={(v, name, props) => [fmt(v), props.payload.nombre]}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Bar dataKey="total" name="Compras" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 5 — PLANIFICACIÓN */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tareas críticas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-slate-800 text-sm uppercase">Tareas Críticas (próximos 7 días)</h3>
          </div>
          {tareasCriticas.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No hay tareas críticas para esta semana
            </div>
          ) : (
            <div className="space-y-2">
              {tareasCriticas.map((t, idx) => {
                const plan = planes.find(p => String(p.id) === String(t.plan_id));
                const diasRestantes = Math.ceil(
                  (new Date(t.fecha_fin + 'T00:00:00') - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
                );
                const urgente = diasRestantes <= 2;
                return (
                  <div
                    key={t.id || idx}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                      urgente ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div className={cn('w-1 h-8 rounded-full shrink-0', urgente ? 'bg-rose-500' : 'bg-amber-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {t.tarea_nombre}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {plan?.nombre || t.rubro_nombre || 'Sin plan'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-[10px] font-bold', urgente ? 'text-rose-600' : 'text-slate-600')}>
                        {diasRestantes === 0 ? 'Hoy' : diasRestantes === 1 ? 'Mañana' : `${diasRestantes} días`}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {String(t.fecha_fin).split('-').reverse().join('/')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas reuniones */}
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="font-extrabold text-slate-800 text-sm uppercase">Próximas Reuniones</h3>
          </div>
          {proximasReuniones.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs italic">
              No hay reuniones programadas
            </div>
          ) : (
            <div className="space-y-2">
              {proximasReuniones.map((r, idx) => {
                const plan = planes.find(p => String(p.id) === String(r.plan_id));
                return (
                  <div
                    key={r.id || idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-blue-50 border-blue-200"
                  >
                    <div className="w-1 h-8 rounded-full bg-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {r.titulo || 'Reunión'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {plan?.nombre || r.lugar || 'Sin plan'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-blue-700">
                        {String(r.fecha).split('-').reverse().join('/')}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {r.hora_inicio || ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FILA 6 — CASH FLOW */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">Cash Flow — Últimos 12 meses</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mesLabel" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtCompacto(v)} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════
function KpiCard({ label, value, icon: Icon, color = 'slate', subtitle, porcentaje }) {
  const colorMap = {
    slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'bg-slate-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'bg-blue-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'bg-purple-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'bg-amber-500' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'bg-emerald-600' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'bg-rose-600' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'bg-cyan-600' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex justify-between items-start relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', c.border)} />
      <div className="min-w-0 flex-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
          {label}
        </span>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 truncate">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
        {typeof porcentaje === 'number' && (
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
              className={cn('h-full rounded-full transition-all', c.border)}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ml-2', c.bg, c.text)}>
        <Icon className="w-4 h-4" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════
function BarraEstadoObra({ label, count, total, color }) {
  const porcentaje = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-black text-slate-900">
          {count}
          <span className="text-slate-400 font-semibold ml-1">
            ({porcentaje}%)
          </span>
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}