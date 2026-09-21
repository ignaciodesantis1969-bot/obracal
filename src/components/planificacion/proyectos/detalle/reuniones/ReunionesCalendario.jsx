// src/components/planificacion/proyectos/detalle/reuniones/ReunionesCalendario.jsx
import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  Users as UsersIcon,
  Plus,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const NOMBRES_DIA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function ReunionesCalendario({
  reuniones,
  mesActual,
  setMesActual,
  personal,
  onNuevaReunion,
  onEditarReunion,
  onEliminarReunion,
}) {
  const [reunionSeleccionada, setReunionSeleccionada] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS DEL MES
  // ═══════════════════════════════════════════════════════════════════════

  const { anio, mes } = useMemo(() => ({
    anio: mesActual.getFullYear(),
    mes: mesActual.getMonth(),
  }), [mesActual]);

  // Todos los días del mes en formato de grilla (incluye padding de semanas)
  const dias = useMemo(() => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);

    // Día de la semana del 1° (0=Dom, 1=Lun, ..., 6=Sáb)
    // Convertimos a lunes como primer día: 0=Lun, 6=Dom
    const diaSemanaInicio = (primerDia.getDay() + 6) % 7;

    // Días del mes anterior para rellenar
    const diasAntes = diaSemanaInicio;
    const diasTotales = ultimoDia.getDate();

    const lista = [];

    // Días del mes anterior (gris)
    for (let i = diasAntes - 1; i >= 0; i--) {
      const d = new Date(anio, mes, -i);
      lista.push({
        fecha: d,
        iso: d.toISOString().slice(0, 10),
        esDelMes: false,
      });
    }

    // Días del mes actual
    for (let i = 1; i <= diasTotales; i++) {
      const d = new Date(anio, mes, i);
      lista.push({
        fecha: d,
        iso: d.toISOString().slice(0, 10),
        esDelMes: true,
      });
    }

    // Días del mes siguiente (gris) para completar la última semana
    const resto = lista.length % 7;
    if (resto !== 0) {
      for (let i = 1; i <= 7 - resto; i++) {
        const d = new Date(anio, mes + 1, i);
        lista.push({
          fecha: d,
          iso: d.toISOString().slice(0, 10),
          esDelMes: false,
        });
      }
    }

    return lista;
  }, [anio, mes]);

  // Agrupar reuniones por fecha
  const reunionesPorDia = useMemo(() => {
    const mapa = {};
    reuniones.forEach(r => {
      const fecha = r.fecha || '';
      if (!fecha) return;
      if (!mapa[fecha]) mapa[fecha] = [];
      mapa[fecha].push(r);
    });
    return mapa;
  }, [reuniones]);

  const hoyIso = new Date().toISOString().slice(0, 10);

  // ═══════════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DE MESES
  // ═══════════════════════════════════════════════════════════════════════

  const mesAnterior = () => {
    setMesActual(new Date(anio, mes - 1, 1));
  };
  const mesSiguiente = () => {
    setMesActual(new Date(anio, mes + 1, 1));
  };
  const irAHoy = () => {
    setMesActual(new Date());
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">

      {/* Header del calendario */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black text-slate-900">
            {NOMBRES_MES[mes]} {anio}
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            ({reuniones.length} reunión{reuniones.length === 1 ? '' : 'es'})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={mesAnterior}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={irAHoy}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Hoy
          </button>
          <button
            onClick={mesSiguiente}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Cabecera de días */}
      <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
        {NOMBRES_DIA_CORTO.map(dia => (
          <div
            key={dia}
            className="py-2 text-center text-[10px] font-black text-slate-600 uppercase"
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7">
        {dias.map((dia, idx) => {
          const reunionesDelDia = reunionesPorDia[dia.iso] || [];
          const esHoy = dia.iso === hoyIso;
          const esFinde = dia.fecha.getDay() === 0 || dia.fecha.getDay() === 6;

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] border-r border-b border-slate-200 p-1.5 transition-colors relative group',
                !dia.esDelMes && 'bg-slate-50/60',
                dia.esDelMes && esFinde && 'bg-slate-50/40',
                dia.esDelMes && !esFinde && 'hover:bg-amber-50/40'
              )}
            >
              {/* Número del día */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
                    esHoy && 'bg-amber-500 text-white',
                    !esHoy && dia.esDelMes && 'text-slate-700',
                    !dia.esDelMes && 'text-slate-300'
                  )}
                >
                  {dia.fecha.getDate()}
                </span>

                {/* Botón + en hover */}
                {dia.esDelMes && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNuevaReunion(dia.iso);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-amber-100 rounded cursor-pointer"
                    title="Nueva reunión este día"
                  >
                    <Plus className="w-3 h-3 text-amber-600" />
                  </button>
                )}
              </div>

              {/* Reuniones del día */}
              <div className="space-y-1">
                {reunionesDelDia.slice(0, 3).map(reunion => (
                  <ReunionMini
                    key={reunion.id}
                    reunion={reunion}
                    onClick={() => setReunionSeleccionada(reunion)}
                  />
                ))}
                {reunionesDelDia.length > 3 && (
                  <div className="text-[9px] text-slate-500 font-bold pl-1">
                    +{reunionesDelDia.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de detalle */}
      {reunionSeleccionada && (
        <ReunionDetalleModal
          reunion={reunionSeleccionada}
          personal={personal}
          onClose={() => setReunionSeleccionada(null)}
          onEditar={() => {
            onEditarReunion(reunionSeleccionada);
            setReunionSeleccionada(null);
          }}
          onEliminar={() => {
            onEliminarReunion(reunionSeleccionada);
            setReunionSeleccionada(null);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MINI CARD DE REUNIÓN (en la celda del calendario)
// ═══════════════════════════════════════════════════════════════════════════

function ReunionMini({ reunion, onClick }) {
  const tipoColor = {
    obra: 'bg-blue-100 text-blue-800 border-blue-300',
    coordinacion: 'bg-purple-100 text-purple-800 border-purple-300',
    avance: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    otro: 'bg-slate-100 text-slate-700 border-slate-300',
  }[reunion.tipo] || 'bg-slate-100 text-slate-700 border-slate-300';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-1.5 py-1 rounded border text-[10px] font-bold truncate transition-all hover:scale-[1.02] cursor-pointer',
        tipoColor
      )}
      title={reunion.titulo}
    >
      {reunion.hora_inicio && (
        <span className="font-black mr-1">{reunion.hora_inicio}</span>
      )}
      {reunion.titulo}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL DE DETALLE (al clickear una reunión del calendario)
// ═══════════════════════════════════════════════════════════════════════════

function ReunionDetalleModal({ reunion, personal, onClose, onEditar, onEliminar }) {
  const formatearFecha = (f) => {
    if (!f) return '---';
    const partes = String(f).split('T')[0].split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return f;
  };

  // Asistentes
  const asistentesNombres = (reunion.asistentes || [])
    .map(id => {
      const p = personal.find(pp => String(pp.id || pp.ID) === String(id));
      return p?.nombre || p?.Nombre;
    })
    .filter(Boolean);

  const tipoLabel = {
    obra: '🏗️ Obra',
    coordinacion: '📋 Coordinación',
    avance: '📈 Avance',
    otro: '💬 Otro',
  }[reunion.tipo] || '💬 Otro';

  const compromisos = Array.isArray(reunion.compromisos) ? reunion.compromisos : [];
  const compromisosPendientes = compromisos.filter(c => !c.completado).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b bg-slate-50">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {tipoLabel}
            </span>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              {reunion.titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer ml-3"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Info básica */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha</p>
              <p className="font-bold text-slate-900">{formatearFecha(reunion.fecha)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Horario</p>
              <p className="font-bold text-slate-900">
                {reunion.hora_inicio || '---'} {reunion.hora_fin ? `- ${reunion.hora_fin}` : ''}
              </p>
            </div>
            {reunion.lugar && (
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Lugar
                </p>
                <p className="font-bold text-slate-900">{reunion.lugar}</p>
              </div>
            )}
          </div>

          {/* Asistentes */}
          {asistentesNombres.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <UsersIcon className="w-3 h-3" /> Asistentes ({asistentesNombres.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {asistentesNombres.map((nom, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-bold"
                  >
                    {nom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {reunion.notas && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Notas / Minuta</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                {reunion.notas}
              </p>
            </div>
          )}

          {/* Compromisos */}
          {compromisos.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase">
                Compromisos ({compromisos.length - compromisosPendientes}/{compromisos.length} completados)
              </p>
              <div className="space-y-1.5">
                {compromisos.map((c, idx) => {
                  const resp = personal.find(p => String(p.id || p.ID) === String(c.responsable_id));
                  return (
                    <div
                      key={c.id || idx}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded-lg border text-xs',
                        c.completado
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      )}
                    >
                      <span className="mt-0.5">
                        {c.completado ? '✅' : '⏳'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-bold', c.completado && 'line-through opacity-75')}>
                          {c.texto}
                        </p>
                        <p className="text-[10px] mt-0.5 opacity-75">
                          {resp?.nombre && `👤 ${resp.nombre}`}
                          {c.fecha_limite && ` · 📅 ${formatearFecha(c.fecha_limite)}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t bg-slate-50">
          <button
            onClick={onEliminar}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            Eliminar
          </button>
          <button
            onClick={onEditar}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Editar
          </button>
        </div>

      </div>
    </div>
  );
}