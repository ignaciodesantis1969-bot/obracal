import React, { useState } from 'react';
import { Package, FileText, Printer } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function ListadoInsumosTab({ presupuestos, insumos, proveedorNombreMap, obtenerClienteDePresupuesto }) {
  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false);
  const [isSavingInsumosPdf, setIsSavingInsumosPdf] = useState(false);

  const presupuestoInsumosSeleccionado = presupuestos.find(p => String(p?.id || p?.ID) === String(insumoPresupuestoId));

  return (
    <div id="printable-insumos-container" className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <h3 className="text-sm font-extrabold uppercase flex items-center gap-2"><Package className="w-4 h-4 text-amber-500" /> Listado de Insumos</h3>
        <select value={insumoPresupuestoId} onChange={(e) => setInsumoPresupuestoId(e.target.value)} className="bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold">
          <option value="">-- Seleccionar Presupuesto Aprobado --</option>
          {presupuestos.map(p => <option key={p?.id || p?.ID} value={p?.id || p?.ID}>[{p?.codigo || p?.id}] {p?.nombre || 'Presupuesto'}</option>)}
        </select>
      </div>

      {!presupuestoInsumosSeleccionado ? (
        <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed rounded-2xl">Seleccione un presupuesto aprobado.</div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-bold text-sm">Presupuesto seleccionado: {presupuestoInsumosSeleccionado?.nombre}</h4>
          <p className="text-xs text-slate-600">Cliente: {obtenerClienteDePresupuesto(presupuestoInsumosSeleccionado)}</p>
        </div>
      )}
    </div>
  );
}