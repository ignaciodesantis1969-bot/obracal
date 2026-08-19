import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function TablaComparativaPresupuesto({ presupuestoId, rubros, tareas }) {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Factura.filter({ presupuesto_id: presupuestoId, tipo: 'compra' })
      .then(f => { setFacturas(f); setLoading(false); });
  }, [presupuestoId]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Construir mapa insumo_id → total facturado
  const facturadoPorInsumo = {};
  facturas.forEach(f => {
    (f.items || []).forEach(item => {
      if (item.insumo_id) {
        facturadoPorInsumo[item.insumo_id] = (facturadoPorInsumo[item.insumo_id] || 0) + (item.precio_total || 0);
      }
    });
  });

  // Totales globales por factura (sin detalle de items)
  const totalFacturadoSinDetalle = facturas
    .filter(f => !f.items || f.items.length === 0)
    .reduce((s, f) => s + (f.total || 0), 0);

  // Armar filas por rubro
  const filas = rubros.map(rubro => {
    const tareasRubro = tareas.filter(t => t.rubro_id === rubro.id);
    const presupuestado = tareasRubro.reduce((s, t) => s + (t.costo_total || 0), 0);

    // Real: suma de insumos de las tareas del rubro que aparecen en facturas
    const insumoIds = new Set(tareasRubro.flatMap(t => (t.insumos || []).map(i => i.insumo_id)));
    const facturado = [...insumoIds].reduce((s, id) => s + (facturadoPorInsumo[id] || 0), 0);

    const diferencia = presupuestado - facturado;
    const porcentaje = presupuestado > 0 ? (facturado / presupuestado) * 100 : 0;

    return { rubro, presupuestado, facturado, diferencia, porcentaje, tareasRubro };
  });

  const totalPresupuestado = filas.reduce((s, f) => s + f.presupuestado, 0);
  const totalFacturado = filas.reduce((s, f) => s + f.facturado, 0) + totalFacturadoSinDetalle;
  const totalDiferencia = totalPresupuestado - totalFacturado;
  const totalPorcentaje = totalPresupuestado > 0 ? (totalFacturado / totalPresupuestado) * 100 : 0;

  const getBarColor = (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  const getDifColor = (dif) => {
    if (dif < 0) return 'text-red-600';
    if (dif === 0) return 'text-slate-500';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-xs text-blue-500 font-medium mb-1">Total Presupuestado</p>
          <p className="text-lg font-bold text-blue-700">{fmt(totalPresupuestado)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-500 font-medium mb-1">Total Facturado</p>
          <p className="text-lg font-bold text-amber-700">{fmt(totalFacturado)}</p>
          <p className="text-xs text-amber-500 mt-0.5">{totalPorcentaje.toFixed(1)}% ejecutado</p>
        </div>
        <div className={`rounded-lg p-4 text-center border ${totalDiferencia >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-medium mb-1 ${totalDiferencia >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalDiferencia >= 0 ? 'Saldo disponible' : 'Exceso de gasto'}
          </p>
          <p className={`text-lg font-bold ${getDifColor(totalDiferencia)}`}>{fmt(Math.abs(totalDiferencia))}</p>
        </div>
      </div>

      {/* Tabla por rubro */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase">Rubro</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold text-xs uppercase">Presupuestado</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold text-xs uppercase">Facturado</th>
              <th className="text-right px-4 py-3 text-slate-600 font-semibold text-xs uppercase">Diferencia</th>
              <th className="px-4 py-3 text-slate-600 font-semibold text-xs uppercase w-36">Ejecución</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map(({ rubro, presupuestado, facturado, diferencia, porcentaje }) => (
              <tr key={rubro.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{rubro.nombre}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmt(presupuestado)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{fmt(facturado)}</td>
                <td className={`px-4 py-3 text-right font-medium flex items-center justify-end gap-1 ${getDifColor(diferencia)}`}>
                  {diferencia > 0 ? <TrendingDown className="w-3.5 h-3.5" /> : diferencia < 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  {fmt(Math.abs(diferencia))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getBarColor(porcentaje)}`}
                        style={{ width: `${Math.min(porcentaje, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right tabular-nums">{porcentaje.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Fila de totales */}
            <tr className="bg-slate-50 font-semibold border-t-2 border-slate-300">
              <td className="px-4 py-3 text-slate-800">TOTAL</td>
              <td className="px-4 py-3 text-right text-blue-700">{fmt(totalPresupuestado)}</td>
              <td className="px-4 py-3 text-right text-amber-700">{fmt(totalFacturado)}</td>
              <td className={`px-4 py-3 text-right ${getDifColor(totalDiferencia)}`}>{fmt(Math.abs(totalDiferencia))}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${getBarColor(totalPorcentaje)}`} style={{ width: `${Math.min(totalPorcentaje, 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-600 w-10 text-right tabular-nums">{totalPorcentaje.toFixed(0)}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {totalFacturadoSinDetalle > 0 && (
        <p className="text-xs text-slate-400 italic">
          * {fmt(totalFacturadoSinDetalle)} en facturas sin detalle de items — incluido en total facturado pero no asignado a rubros específicos.
        </p>
      )}
    </div>
  );
}