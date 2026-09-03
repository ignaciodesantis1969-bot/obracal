import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

export default function ComparativoTab({ presupuestos, obras, facturas, movimientos, limpiarTexto }) {
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const presupuestosCompFiltrados = (compObraId === 'todas' ? presupuestos : presupuestos.filter(p => String(p?.obra_id) === String(compObraId)));
  const presupuestoSeleccionado = presupuestos.find(p => String(p?.id || p?.ID) === String(compPresupuestoId));

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-extrabold uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo</h3>
        <select value={compPresupuestoId} onChange={(e) => setCompPresupuestoId(e.target.value)} className="bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold">
          <option value="">-- Seleccionar Presupuesto --</option>
          {presupuestosCompFiltrados.map(p => <option key={p?.id || p?.ID} value={p?.id || p?.ID}>[{p?.codigo}] {p?.nombre}</option>)}
        </select>
      </div>

      {!presupuestoSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">Seleccione un presupuesto para ver el comparativo.</div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-xl border text-xs font-semibold">Mostrando comparativo financiero para el presupuesto ID: {compPresupuestoId}</div>
      )}
    </div>
  );
}