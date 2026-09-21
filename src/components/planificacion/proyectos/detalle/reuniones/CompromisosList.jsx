// src/components/planificacion/proyectos/detalle/reuniones/CompromisosList.jsx
import React from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CompromisosList({
  compromisos = [],
  setCompromisos,
  personal = [],
}) {
  const agregarCompromiso = () => {
    setCompromisos([
      ...compromisos,
      {
        id: `c-${Date.now()}`,
        texto: '',
        responsable_id: '',
        fecha_limite: '',
        completado: false,
      },
    ]);
  };

  const cambiarCompromiso = (id, campo, valor) => {
    setCompromisos(
      compromisos.map(c => c.id === id ? { ...c, [campo]: valor } : c)
    );
  };

  const quitarCompromiso = (id) => {
    setCompromisos(compromisos.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-2">

      {/* Header con botón agregar */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase">
          Compromisos ({compromisos.length})
        </p>
        <button
          type="button"
          onClick={agregarCompromiso}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          Agregar
        </button>
      </div>

      {/* Lista vacía */}
      {compromisos.length === 0 && (
        <p className="text-[10px] text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          Sin compromisos. Agregá uno si tomaste decisiones en la reunión.
        </p>
      )}

      {/* Lista de compromisos */}
      <div className="space-y-2">
        {compromisos.map((c, idx) => (
          <div
            key={c.id}
            className={cn(
              'border rounded-xl p-2.5 space-y-2 transition-colors',
              c.completado
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-start gap-2">

              {/* Checkbox completado */}
              <button
                type="button"
                onClick={() => cambiarCompromiso(c.id, 'completado', !c.completado)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors',
                  c.completado
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-white border-slate-300 hover:border-emerald-400'
                )}
                title={c.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
              >
                {c.completado && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Texto del compromiso */}
              <input
                type="text"
                placeholder="Ej: Enviar planos actualizados al cliente"
                value={c.texto}
                onChange={(e) => cambiarCompromiso(c.id, 'texto', e.target.value)}
                className={cn(
                  'flex-1 bg-transparent border-0 outline-none text-xs font-semibold',
                  c.completado
                    ? 'text-emerald-800 line-through opacity-75'
                    : 'text-slate-800'
                )}
              />

              {/* Botón quitar */}
              <button
                type="button"
                onClick={() => quitarCompromiso(c.id)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 cursor-pointer"
                title="Eliminar compromiso"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fila: responsable + fecha límite */}
            <div className="grid grid-cols-2 gap-2 pl-7">
              <select
                value={c.responsable_id || ''}
                onChange={(e) => cambiarCompromiso(c.id, 'responsable_id', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Sin responsable</option>
                {personal
                  .filter(p => String(p.estado || '').toLowerCase() === 'activo')
                  .map(p => (
                    <option key={p.id || p.ID} value={p.id || p.ID}>
                      {p.nombre || p.Nombre}
                    </option>
                  ))}
              </select>

              <input
                type="date"
                value={c.fecha_limite || ''}
                onChange={(e) => cambiarCompromiso(c.id, 'fecha_limite', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold outline-none focus:border-amber-500 cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}