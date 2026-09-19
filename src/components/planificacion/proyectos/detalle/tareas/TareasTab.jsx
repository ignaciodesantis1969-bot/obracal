import React, { useMemo, useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import TareaGrupoRubro from './TareaGrupoRubro';
import TareaAsignarRecursosModal from './TareaAsignarRecursosModal';

export default function TareasTab({ plan, tareas = [], personal = [], insumos = [] }) {
  // 🔑 Leer presupuesto para obtener subcontratos de cada tarea
  const { data: presupuestosFs } = useFirestoreCollection('presupuestos');
  const presupuestos = useMemo(
    () => (Array.isArray(presupuestosFs) ? presupuestosFs : []),
    [presupuestosFs]
  );

  const presupuesto = useMemo(() => {
    if (!plan?.presupuesto_id) return null;
    return presupuestos.find(p =>
      String(p.id || p.ID || p.codigo || '') === String(plan.presupuesto_id)
    ) || null;
  }, [presupuestos, plan]);

  // 🔑 Modal de asignación
  const [tareaEditando, setTareaEditando] = useState(null);

  // 🔑 Agrupar por rubro
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

    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.rubro_idx ?? 0) - (b.rubro_idx ?? 0));

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
      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Header de la tabla */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider border-b border-slate-700">
          <div className="col-span-4">Nombre de tarea</div>
          <div className="col-span-1 text-center">Duración</div>
          <div className="col-span-2 text-center">Comienzo</div>
          <div className="col-span-2 text-center">Fin</div>
          <div className="col-span-1 text-center">%</div>
          <div className="col-span-2 text-right">Costo / Recursos</div>
        </div>

        {/* Grupos por rubro */}
        <div className="divide-y divide-slate-100">
          {rubrosAgrupados.map(rubro => (
            <TareaGrupoRubro
              key={rubro.key}
              rubro={rubro}
              personal={personal}
              insumos={insumos}
              onEditarTarea={(t) => setTareaEditando(t)}
            />
          ))}
        </div>
      </div>

      {/* Modal de asignación */}
      <TareaAsignarRecursosModal
        isOpen={!!tareaEditando}
        onClose={() => setTareaEditando(null)}
        tarea={tareaEditando}
        plan={plan}
        personal={personal}
        insumos={insumos}
        presupuesto={presupuesto}
        tareasDelPlan={tareas}
        onGuardado={() => {
          console.info('[TareasTab] Recursos guardados — onSnapshot refresca solo');
        }}
      />
    </div>
  );
}