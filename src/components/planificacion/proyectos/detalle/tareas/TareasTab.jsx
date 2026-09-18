import React, { useMemo, useState } from 'react';
import { CheckSquare, AlertCircle } from 'lucide-react';
import TareaGrupoRubro from './TareaGrupoRubro';

export default function TareasTab({ plan, tareas = [], personal = [], insumos = [] }) {
  // Agrupar por rubro
  const rubrosAgrupados = useMemo(() => {
    const map = new Map();

    tareas.forEach(t => {
      const key = `${t.rubro_idx ?? 0}-${t.rubro_nombre || 'Sin rubro'}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          rubro_idx: t.rubro_idx ?? 0,
          rubro_nombre: t.rubro_nombre || 'Sin rubro',
          tareas: [],
        });
      }
      map.get(key).tareas.push(t);
    });

    // Ordenar por rubro_idx
    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.rubro_idx ?? 0) - (b.rubro_idx ?? 0));

    // Ordenar tareas dentro de cada rubro por tarea_idx
    arr.forEach(r => {
      r.tareas.sort((a, b) => (a.tarea_idx ?? 0) - (b.tarea_idx ?? 0));
    });

    return arr;
  }, [tareas]);

  if (tareas.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-2">
        <CheckSquare className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">Este plan no tiene tareas</p>
        <p className="text-xs text-slate-400">
          Las tareas se copian automáticamente al crear el plan desde un presupuesto
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          <strong>Paso 5A:</strong> por ahora podés ver las tareas agrupadas por rubro. La asignación de recursos y la edición de fechas se habilitan en el <strong>Paso 5B</strong>.
        </p>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Header de la tabla */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-slate-700">
          <div className="col-span-4">Nombre de tarea</div>
          <div className="col-span-1 text-center">Duración</div>
          <div className="col-span-2 text-center">Comienzo</div>
          <div className="col-span-2 text-center">Fin</div>
          <div className="col-span-1 text-center">%</div>
          <div className="col-span-2 text-right">Costo</div>
        </div>

        {/* Grupos por rubro */}
        <div className="divide-y divide-slate-100">
          {rubrosAgrupados.map(rubro => (
            <TareaGrupoRubro
              key={rubro.key}
              rubro={rubro}
              personal={personal}
              insumos={insumos}
            />
          ))}
        </div>
      </div>
    </div>
  );
}