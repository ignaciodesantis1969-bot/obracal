// src/components/planificacion/proyectos/detalle/resumen/ResumenTab.jsx
import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Ban,
  PlayCircle,
  CircleDashed,
  BarChart3,        // 🔑 FALTABA ESTE
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ResumenTab({ plan, tareas = [], personal = [], insumos = [] }) {
  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS GLOBALES
  // ═══════════════════════════════════════════════════════════════════════

  const stats = useMemo(() => {
    const total = tareas.length;

    const porEstado = {
      no_iniciado: 0,
      en_curso: 0,
      completada: 0,
      bloqueada: 0,
    };

    let totalDiasHombre = 0;
    let totalCosto = 0;
    let porcentajeAvanceAcumulado = 0;

    tareas.forEach(t => {
      const estado = String(t.estado || 'no_iniciado').toLowerCase();
      if (porEstado[estado] !== undefined) porEstado[estado]++;
      else porEstado.no_iniciado++;

      totalDiasHombre += Number(t.total_dias_hombre) || 0;
      totalCosto += Number(t.costo_total) || 0;
      porcentajeAvanceAcumulado += Number(t.porcentaje_avance) || 0;
    });

    const porcentajeAvanceGeneral = total > 0
      ? Math.round(porcentajeAvanceAcumulado / total)
      : 0;

    return {
      total,
      porEstado,
      totalDiasHombre,
      totalCosto,
      porcentajeAvanceGeneral,
    };
  }, [tareas]);

  // ═══════════════════════════════════════════════════════════════════════
  // DISTRIBUCIÓN POR RUBRO
  // ═══════════════════════════════════════════════════════════════════════

  const rubros = useMemo(() => {
    const mapa = {};

    tareas.forEach(t => {
      const rubro = t.rubro_nombre || 'Sin rubro';
      if (!mapa[rubro]) {
        mapa[rubro] = {
          nombre: rubro,
          total: 0,
          completadas: 0,
          diasHombre: 0,
          costo: 0,
          avanceAcumulado: 0,
        };
      }
      mapa[rubro].total++;
      if (String(t.estado || '').toLowerCase() === 'completada') {
        mapa[rubro].completadas++;
      }
      mapa[rubro].diasHombre += Number(t.total_dias_hombre) || 0;
      mapa[rubro].costo += Number(t.costo_total) || 0;
      mapa[rubro].avanceAcumulado += Number(t.porcentaje_avance) || 0;
    });

    return Object.values(mapa).map(r => ({
      ...r,
      porcentaje: r.total > 0 ? Math.round(r.avanceAcumulado / r.total) : 0,
    })).sort((a, b) => b.costo - a.costo);
  }, [tareas]);

  // ═══════════════════════════════════════════════════════════════════════
  // TAREAS PARA MOSTRAR
  // ═══════════════════════════════════════════════════════════════════════

  const tareasEnCurso = useMemo(() => {
    return tareas
      .filter(t => String(t.estado || '').toLowerCase() === 'en_curso')
      .slice(0, 5);
  }, [tareas]);

  const tareasSinRecursos = useMemo(() => {
    return tareas.filter(t => {
      const recursos = Array.isArray(t.recursos) ? t.recursos : [];
      const tieneOperarios = recursos.some(r => r.tipo === 'operario');
      const tieneSubcontratos = recursos.some(r => r.tipo === 'subcontrato');
      const tieneDuracionManual = Number(t.duracion_manual_dias) > 0;
      return !tieneOperarios && !tieneSubcontratos && !tieneDuracionManual;
    });
  }, [tareas]);

  const tareasBloqueadas = useMemo(() => {
    return tareas.filter(t => String(t.estado || '').toLowerCase() === 'bloqueada');
  }, [tareas]);

  // ═══════════════════════════════════════════════════════════════════════
  // TIMELINE (mini Gantt sin flechas)
  // ═══════════════════════════════════════════════════════════════════════

  const timeline = useMemo(() => {
    if (tareas.length === 0) return null;

    const fechasInicio = tareas
      .map(t => t.fecha_inicio)
      .filter(Boolean)
      .map(f => new Date(f + 'T00:00:00').getTime());

    const fechasFin = tareas
      .map(t => t.fecha_fin)
      .filter(Boolean)
      .map(f => new Date(f + 'T00:00:00').getTime());

    if (fechasInicio.length === 0) return null;

    const minFecha = Math.min(...fechasInicio);
    const maxFecha = Math.max(...fechasFin, minFecha);
    const rangoTotal = maxFecha - minFecha || 1;

    // Máximo 20 tareas en el timeline
    const tareasOrdenadas = [...tareas]
      .filter(t => t.fecha_inicio && t.fecha_fin)
      .sort((a, b) => {
        const fa = new Date(a.fecha_inicio + 'T00:00:00').getTime();
        const fb = new Date(b.fecha_inicio + 'T00:00:00').getTime();
        return fa - fb;
      })
      .slice(0, 20);

    return {
      minFecha,
      maxFecha,
      rangoTotal,
      tareas: tareasOrdenadas,
    };
  }, [tareas]);

  const calcularPosicionBarra = (tarea) => {
    if (!timeline) return { left: 0, width: 0 };
    const inicio = new Date(tarea.fecha_inicio + 'T00:00:00').getTime();
    const fin = new Date(tarea.fecha_fin + 'T00:00:00').getTime();
    const left = ((inicio - timeline.minFecha) / timeline.rangoTotal) * 100;
    const width = Math.max(((fin - inicio) / timeline.rangoTotal) * 100, 1);
    return { left: `${left}%`, width: `${width}%` };
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const getColorEstado = (estado) => {
    switch (estado) {
      case 'completada': return 'bg-emerald-500';
      case 'en_curso':   return 'bg-blue-500';
      case 'bloqueada':  return 'bg-rose-500';
      default:           return 'bg-slate-400';
    }
  };

  const formatearMoneda = (n) =>
    `$ ${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return f;
  };

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 1: KPIs PRINCIPALES
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Tareas Totales"
          value={stats.total}
          icon={CheckCircle2}
          color="slate"
          subtitle={`${stats.porEstado.completada} completadas`}
        />
        <KpiCard
          label="Avance General"
          value={`${stats.porcentajeAvanceGeneral}%`}
          icon={TrendingUp}
          color="blue"
          subtitle={`${stats.porEstado.en_curso} en curso`}
          progreso={stats.porcentajeAvanceGeneral}
        />
        <KpiCard
          label="Días-Hombre"
          value={Math.round(stats.totalDiasHombre).toLocaleString('es-AR')}
          icon={Users}
          color="amber"
          subtitle="Total planificado"
        />
        <KpiCard
          label="Costo Estimado"
          value={formatearMoneda(stats.totalCosto)}
          icon={DollarSign}
          color="emerald"
          subtitle="Suma de tareas con recursos"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 2: DISTRIBUCIÓN POR ESTADO
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-black text-slate-900 uppercase">Distribución por Estado</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <EstadoCard
            label="Sin Iniciar"
            count={stats.porEstado.no_iniciado}
            total={stats.total}
            icon={CircleDashed}
            color="slate"
          />
          <EstadoCard
            label="En Curso"
            count={stats.porEstado.en_curso}
            total={stats.total}
            icon={PlayCircle}
            color="blue"
          />
          <EstadoCard
            label="Completadas"
            count={stats.porEstado.completada}
            total={stats.total}
            icon={CheckCircle2}
            color="emerald"
          />
          <EstadoCard
            label="Bloqueadas"
            count={stats.porEstado.bloqueada}
            total={stats.total}
            icon={Ban}
            color="rose"
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 3: DISTRIBUCIÓN POR RUBRO
          ═══════════════════════════════════════════════════════════════════ */}
      {rubros.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase">Distribución por Rubro</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <th className="px-5 py-3">Rubro</th>
                <th className="px-3 py-3 text-center">Tareas</th>
                <th className="px-3 py-3 text-center">Completas</th>
                <th className="px-3 py-3">Avance</th>
                <th className="px-3 py-3 text-right">Días-Hombre</th>
                <th className="px-5 py-3 text-right">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rubros.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-bold text-slate-900 truncate max-w-xs">{r.nombre}</td>
                  <td className="px-3 py-3 text-center font-semibold text-slate-700">{r.total}</td>
                  <td className="px-3 py-3 text-center text-slate-600">{r.completadas}/{r.total}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${r.porcentaje}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{r.porcentaje}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">
                    {Math.round(r.diasHombre).toLocaleString('es-AR')}
                  </td>
                  <td className="px-5 py-3 text-right font-black text-slate-900">
                    {formatearMoneda(r.costo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 4: ALERTAS (solo si hay)
          ═══════════════════════════════════════════════════════════════════ */}
      {(tareasSinRecursos.length > 0 || tareasBloqueadas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tareasBloqueadas.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-black text-rose-900 uppercase">
                  Tareas Bloqueadas ({tareasBloqueadas.length})
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-rose-800">
                {tareasBloqueadas.slice(0, 5).map((t, idx) => (
                  <li key={idx} className="truncate">
                    • <strong>{t.tarea_nombre}</strong>
                    {t.rubro_nombre && <span className="text-rose-600"> — {t.rubro_nombre}</span>}
                  </li>
                ))}
                {tareasBloqueadas.length > 5 && (
                  <li className="italic text-rose-600">... y {tareasBloqueadas.length - 5} más</li>
                )}
              </ul>
            </div>
          )}

          {tareasSinRecursos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-amber-900 uppercase">
                  Tareas sin Recursos Asignados ({tareasSinRecursos.length})
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {tareasSinRecursos.slice(0, 5).map((t, idx) => (
                  <li key={idx} className="truncate">
                    • <strong>{t.tarea_nombre}</strong>
                    {t.rubro_nombre && <span className="text-amber-600"> — {t.rubro_nombre}</span>}
                  </li>
                ))}
                {tareasSinRecursos.length > 5 && (
                  <li className="italic text-amber-600">... y {tareasSinRecursos.length - 5} más</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 5: TIMELINE SIMPLE
          ═══════════════════════════════════════════════════════════════════ */}
      {timeline && timeline.tareas.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase">
              Timeline ({timeline.tareas.length} tareas)
            </h3>
          </div>
          <div className="space-y-1.5">
            {timeline.tareas.map((t, idx) => {
              const pos = calcularPosicionBarra(t);
              const color = getColorEstado(String(t.estado || 'no_iniciado').toLowerCase());
              return (
                <div key={idx} className="flex items-center gap-3 group">
                  <div className="w-40 shrink-0 text-[10px] font-semibold text-slate-600 truncate">
                    {t.tarea_nombre}
                  </div>
                  <div className="flex-1 h-6 bg-slate-50 rounded relative">
                    <div
                      className={cn('h-full rounded absolute top-0 transition-all', color)}
                      style={{ left: pos.left, width: pos.width }}
                      title={`${formatearFecha(t.fecha_inicio)} → ${formatearFecha(t.fecha_fin)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
            <span>{formatearFecha(new Date(timeline.minFecha).toISOString().slice(0, 10))}</span>
            <span>{formatearFecha(new Date(timeline.maxFecha).toISOString().slice(0, 10))}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FILA 6: TAREAS EN CURSO
          ═══════════════════════════════════════════════════════════════════ */}
      {tareasEnCurso.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-black text-slate-900 uppercase">Tareas en Curso</h3>
          </div>
          <div className="space-y-2">
            {tareasEnCurso.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{t.tarea_nombre}</p>
                  <p className="text-[10px] text-slate-500 truncate">{t.rubro_nombre}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-[10px] text-slate-500">{formatearFecha(t.fecha_inicio)}</p>
                  <p className="text-xs font-black text-blue-700">{Number(t.porcentaje_avance) || 0}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {stats.total === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <CircleDashed className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Este plan no tiene tareas todavía</p>
          <p className="text-xs text-slate-400">Cuando se carguen tareas del presupuesto, aparecerán acá.</p>
        </div>
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ═══════════════════════════════════════════════════════════════════════════

function KpiCard({ label, value, icon: Icon, color = 'slate', subtitle, progreso }) {
  const colorMap = {
    slate:   { bg: 'bg-slate-100',   text: 'text-slate-700',   accent: 'text-slate-900' },
    blue:    { bg: 'bg-blue-50',     text: 'text-blue-600',    accent: 'text-blue-700' },
    amber:   { bg: 'bg-amber-50',    text: 'text-amber-600',   accent: 'text-amber-700' },
    emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-600', accent: 'text-emerald-700' },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase">{label}</p>
        <div className={cn('p-1.5 rounded-lg', c.bg, c.text)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className={cn('text-xl font-black', c.accent)}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
      {typeof progreso === 'number' && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progreso}%` }} />
        </div>
      )}
    </div>
  );
}

function EstadoCard({ label, count, total, icon: Icon, color = 'slate' }) {
  const colorMap = {
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200', text: 'text-slate-700',   icon: 'text-slate-500' },
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',  text: 'text-blue-800',    icon: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',  text: 'text-rose-800',    icon: 'text-rose-600' },
  };
  const c = colorMap[color] || colorMap.slate;
  const porcentaje = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className={cn('p-3 rounded-xl border', c.bg, c.border)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-3.5 h-3.5', c.icon)} />
        <p className={cn('text-[10px] font-black uppercase', c.text)}>{label}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className={cn('text-2xl font-black', c.text)}>{count}</p>
        <p className="text-[10px] font-bold text-slate-500">{porcentaje}%</p>
      </div>
    </div>
  );
}