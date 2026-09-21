// src/components/planificacion/proyectos/detalle/equipoDetalle/OperarioCard.jsx
import React, { useState } from 'react';
import { User, ChevronDown, ChevronRight, Calendar, DollarSign, Briefcase, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OperarioCard({ operario }) {
  const [expandido, setExpandido] = useState(operario.tareas.length > 0);

  const tieneTareas = operario.tareas.length > 0;

  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
    return f;
  };

  const formatearMoneda = (n) =>
    `$ ${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

  // Detectar sobrecargas (tareas superpuestas)
  const tareasConSolapamiento = React.useMemo(() => {
    if (operario.tareas.length < 2) return new Set();

    const set = new Set();
    const ordenadas = [...operario.tareas].sort((a, b) =>
      (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '')
    );

    for (let i = 0; i < ordenadas.length; i++) {
      for (let j = i + 1; j < ordenadas.length; j++) {
        const a = ordenadas[i];
        const b = ordenadas[j];
        if (!a.fecha_inicio || !a.fecha_fin || !b.fecha_inicio || !b.fecha_fin) continue;

        const solapan = !(b.fecha_inicio > a.fecha_fin || a.fecha_inicio > b.fecha_fin);
        if (solapan) {
          set.add(a.tareaId);
          set.add(b.tareaId);
        }
      }
    }
    return set;
  }, [operario.tareas]);

  const tieneSobrecarga = tareasConSolapamiento.size > 0;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm transition-all',
        tieneSobrecarga ? 'border-rose-300' : 'border-slate-300'
      )}
    >

      {/* ═══ Header del operario ═══ */}
      <div
        onClick={() => setExpandido(!expandido)}
        className={cn(
          'px-5 py-4 flex items-center gap-3 cursor-pointer transition-colors rounded-t-2xl',
          tieneTareas ? 'hover:bg-slate-50' : ''
        )}
      >
        {/* Chevron */}
        {tieneTareas && (
          <div className="shrink-0">
            {expandido ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </div>
        )}

        {/* Avatar / ícono */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
          tieneTareas ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
        )}>
          <User className="w-5 h-5" />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              'text-sm font-black truncate',
              tieneTareas ? 'text-slate-900' : 'text-slate-500'
            )}>
              {operario.nombre}
            </p>
            {tieneSobrecarga && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[9px] font-black uppercase">
                <AlertTriangle className="w-2.5 h-2.5" />
                Sobrecarga
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-[10px] flex-wrap">
            <span className="flex items-center gap-1 text-slate-500">
              <Briefcase className="w-3 h-3" />
              {operario.especialidad}
            </span>
            {tieneTareas ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-blue-700">
                  {operario.tareas.length} tarea{operario.tareas.length === 1 ? '' : 's'}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600">
                  {Math.round(operario.totalDias * 10) / 10} días
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-bold text-emerald-700">
                  {formatearMoneda(operario.totalCosto)}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                ⚪ Disponible — sin asignaciones
              </span>
            )}
          </div>
        </div>

        {/* Costo diario (derecha) */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Costo/día</p>
          <p className="text-xs font-black text-slate-700">
            {formatearMoneda(operario.costo_en_mano)}
          </p>
        </div>
      </div>

      {/* ═══ Tareas asignadas (expandible) ═══ */}
      {tieneTareas && expandido && (
        <div className="border-t border-slate-200 px-5 py-3 space-y-2 bg-slate-50/50">
          {operario.tareas.map((t, idx) => {
            const tieneConflicto = tareasConSolapamiento.has(t.tareaId);

            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors',
                  tieneConflicto
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-white border-slate-200'
                )}
              >
                {/* Rubro */}
                <div className="w-1 h-8 rounded-full bg-blue-500 shrink-0" />

                {/* Info tarea */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {t.tarea_nombre}
                    </p>
                    {tieneConflicto && (
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {t.rubro_nombre}
                  </p>
                </div>

                {/* Fechas */}
                <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                  <Calendar className="w-3 h-3" />
                  <span>{formatearFecha(t.fecha_inicio)}</span>
                  <span>→</span>
                  <span>{formatearFecha(t.fecha_fin)}</span>
                </div>

                {/* Duración */}
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-700">
                    {Math.round(t.duracion * 10) / 10} d
                  </span>
                </div>

                {/* Costo */}
                {t.costo > 0 && (
                  <div className="hidden sm:flex items-center gap-1 shrink-0">
                    <DollarSign className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-700">
                      {formatearMoneda(t.costo)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje cuando no tiene tareas */}
      {!tieneTareas && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50/30">
          <p className="text-[11px] text-slate-400 italic text-center">
            Este operario está disponible para asignar tareas desde la pestaña del Gantt.
          </p>
        </div>
      )}

    </div>
  );
}