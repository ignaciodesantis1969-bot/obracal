// src/components/planificacion/proyectos/detalle/equipoDetalle/EquipoAlertas.jsx
import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EquipoAlertas({ alertas }) {
  if (!alertas || alertas.length === 0) return null;

  // Separar por tipo
  const sobrecargas = alertas.filter(a => a.tipo === 'sobrecarga');
  const sinAsignaciones = alertas.filter(a => a.tipo === 'sin-asignaciones');

  return (
    <div className="space-y-3">

      {/* Alertas de sobrecarga */}
      {sobrecargas.length > 0 && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <p className="text-xs font-black text-rose-900 uppercase">
              Conflictos detectados ({sobrecargas.length})
            </p>
          </div>
          <div className="space-y-2">
            {sobrecargas.map((a, idx) => (
              <div key={idx} className="bg-white border border-rose-200 rounded-xl p-3">
                <p className="text-xs font-bold text-rose-900">
                  {a.operarioNombre}
                </p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  {a.mensaje}
                </p>
                {a.detalle && (
                  <p className="text-[10px] text-rose-500 mt-1 italic">
                    {a.detalle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta de tareas sin asignaciones */}
      {sinAsignaciones.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600" />
            <p className="text-xs font-black text-amber-900 uppercase">
              Tareas sin asignar
            </p>
          </div>
          {sinAsignaciones.map((a, idx) => (
            <div key={idx} className="bg-white border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-900">
                {a.mensaje}
              </p>
              {a.detalle && (
                <p className="text-[10px] text-amber-700 mt-1 italic">
                  {a.detalle}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}