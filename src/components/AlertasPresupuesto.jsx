import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

export default function AlertasPresupuesto() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    calcularAlertas();
  }, []);

  const calcularAlertas = async () => {
    const [rubros, tareas, facturas, presupuestos, obras] = await Promise.all([
      base44.entities.Rubro.list(),
      base44.entities.Tarea.list(),
      base44.entities.Factura.filter({ tipo: 'compra' }),
      base44.entities.Presupuesto.list(),
      base44.entities.Obra.list(),
    ]);

    const encontradas = [];

    rubros.forEach(rubro => {
      if (!rubro.costo_total || rubro.costo_total <= 0) return;

      const presupuesto = presupuestos.find(p => p.id === rubro.presupuesto_id);
      if (!presupuesto) return;

      const obra = obras.find(o => o.id === presupuesto.obra_id);

      // Tareas del rubro → usamos sus insumos para cruzar con facturas
      const tareasDelRubro = tareas.filter(t => t.rubro_id === rubro.id);
      const insumoIds = new Set(
        tareasDelRubro.flatMap(t => (t.insumos || []).map(i => i.insumo_id))
      );

      // Total facturado: facturas del mismo presupuesto, sumando items que coincidan con insumos del rubro
      // Si la factura no tiene items detallados, se proratea por rubro no es posible → usamos total por presupuesto
      let totalFacturado = 0;

      facturas
        .filter(f => f.presupuesto_id === presupuesto.id)
        .forEach(f => {
          const items = f.items || [];
          if (items.length === 0) {
            // Sin detalle de items: no podemos asignar a rubro específico, ignoramos
            return;
          }
          items.forEach(item => {
            if (insumoIds.has(item.insumo_id)) {
              totalFacturado += item.precio_total || 0;
            }
          });
        });

      if (totalFacturado <= 0) return;

      const porcentaje = (totalFacturado / rubro.costo_total) * 100;

      if (porcentaje >= 80) {
        encontradas.push({
          rubro,
          presupuesto,
          obra,
          totalFacturado,
          costo_total: rubro.costo_total,
          porcentaje,
          excedido: porcentaje >= 100,
        });
      }
    });

    // Ordenar: primero excedidos, luego por porcentaje desc
    encontradas.sort((a, b) => {
      if (a.excedido && !b.excedido) return -1;
      if (!a.excedido && b.excedido) return 1;
      return b.porcentaje - a.porcentaje;
    });

    setAlertas(encontradas);
    setLoading(false);
  };

  if (loading || alertas.length === 0) return null;

  const excedidos = alertas.filter(a => a.excedido).length;
  const enRiesgo = alertas.filter(a => !a.excedido).length;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-red-800">
              Alertas de Presupuesto
              {excedidos > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {excedidos} excedido{excedidos > 1 ? 's' : ''}
                </span>
              )}
              {enRiesgo > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {enRiesgo} en riesgo
                </span>
              )}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {alertas.length} rubro{alertas.length > 1 ? 's' : ''} con consumo ≥ 80% del presupuestado
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-red-400" /> : <ChevronDown className="w-4 h-4 text-red-400" />}
      </button>

      {/* Lista */}
      {expanded && (
        <div className="border-t border-red-200 divide-y divide-red-100">
          {alertas.map((a, idx) => {
            const isExcedido = a.excedido;
            const exceso = a.totalFacturado - a.costo_total;
            const barColor = isExcedido ? 'bg-red-500' : a.porcentaje >= 90 ? 'bg-orange-400' : 'bg-amber-400';

            return (
              <div key={idx} className={`px-4 py-3 ${isExcedido ? 'bg-red-50' : 'bg-amber-50/50'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isExcedido
                        ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      }
                      <span className={`text-sm font-semibold ${isExcedido ? 'text-red-800' : 'text-amber-800'}`}>
                        {a.rubro.nombre}
                      </span>
                      {a.obra && (
                        <span className="text-xs text-slate-500">
                          · {a.obra.nombre}
                        </span>
                      )}
                      {a.presupuesto && (
                        <Link
                          to={`/presupuestos/${a.presupuesto.id}`}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          {a.presupuesto.codigo} <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 bg-red-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${barColor}`}
                          style={{ width: `${Math.min(a.porcentaje, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${isExcedido ? 'text-red-700' : 'text-amber-700'}`}>
                        {a.porcentaje.toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span>Presupuestado: <strong className="text-slate-700">{fmt(a.costo_total)}</strong></span>
                      <span>Facturado: <strong className={isExcedido ? 'text-red-700' : 'text-amber-700'}>{fmt(a.totalFacturado)}</strong></span>
                      {isExcedido && (
                        <span className="text-red-600 font-medium">
                          Exceso: {fmt(exceso)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}