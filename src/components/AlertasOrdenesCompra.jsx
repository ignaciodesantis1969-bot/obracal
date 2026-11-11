import { useMemo, useState } from 'react';
import { where, limit } from 'firebase/firestore';
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery';
import { Clock, PackageCheck, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';

export default function AlertasOrdenesCompra() {
  const [expanded, setExpanded] = useState(true);

  // 1. Traemos SOLO las OC que nos importan (pendientes o aprobadas) y limitamos a 200
  const { data: ordenes = [], loading } = useFirestoreQuery('OrdenCompra', [
    where('estado', 'in', ['pendiente', 'aprobada']),
    limit(200)
  ]);

  // 2. Procesamos las alertas en memoria (es rápido porque ya filtramos en el server)
  const alertas = useMemo(() => {
    if (!ordenes || ordenes.length === 0) return [];
    const hoy = new Date();

    return ordenes
      .filter(oc => oc.fecha_entrega) // Descartamos las que no tienen fecha
      .map(oc => {
        // Nota: Si Firebase devuelve un Timestamp, habría que usar oc.fecha_entrega.toDate(). 
        // Asumimos que es string (ISO) por el parseISO original.
        const diasRestantes = differenceInDays(parseISO(oc.fecha_entrega), hoy);
        return { ...oc, diasRestantes };
      })
      .filter(oc => oc.diasRestantes <= 7) // Próximas en 7 días o vencidas
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [ordenes]);

  if (loading || alertas.length === 0) return null;

  const vencidas = alertas.filter(a => a.diasRestantes < 0).length;
  const hoyCount = alertas.filter(a => a.diasRestantes === 0).length;
  const proximas7 = alertas.filter(a => a.diasRestantes > 0).length;

  const getDiaLabel = (dias) => {
    if (dias < 0) return `Vencida hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? 's' : ''}`;
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `Vence en ${dias} días`;
  };

  const getDiaColor = (dias) => {
    if (dias < 0) return 'bg-red-100 text-red-700';
    if (dias <= 1) return 'bg-orange-100 text-orange-700';
    return 'bg-amber-100 text-amber-700';
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

  return (
    // ... (El JSX de retorno se mantiene exactamente igual, no es necesario cambiarlo) ...
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-amber-800">
              Órdenes de Compra — Próximas entregas
              {vencidas > 0 && (
                <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {vencidas} vencida{vencidas > 1 ? 's' : ''}
                </span>
              )}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {alertas.length} OC con entrega en los próximos 7 días
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
      </button>

      {expanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          {alertas.map((oc) => (
            <div key={oc.id} className="px-4 py-3 flex items-center justify-between gap-4 bg-white/60 flex-wrap">
              {/* ... Tu JSX original ... */}
              <div className="flex items-center gap-3 min-w-0">
                <PackageCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800 truncate">{oc.codigo || 'S/N'}</span>
                    <span className="text-xs text-slate-500 truncate">{oc.proveedor_nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                    <span>Obra: {oc.obra_codigo || '—'}</span>
                    <span>Total: <strong className="text-slate-700">{fmt(oc.total)}</strong></span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${oc.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {oc.estado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${getDiaColor(oc.diasRestantes)}`}>
                  {getDiaLabel(oc.diasRestantes)}
                </span>
                <Link to="/compras" className="text-blue-600 hover:text-blue-800">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}