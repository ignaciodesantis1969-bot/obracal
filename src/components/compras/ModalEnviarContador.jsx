// src/components/compras/ModalEnviarContador.jsx
import React from 'react';
import { X, Loader2 } from 'lucide-react';

export default function ModalEnviarContador({
  isOpen,
  onClose,
  onSubmit,
  emailContador,
  setEmailContador,
  enviandoFacturas,
  cantidadFacturas,
  filtroFechaDesde,
  filtroFechaHasta,
  formatearFechaDisplay
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900">Enviar Facturas al Contador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg">
            Se enviarán <b>{cantidadFacturas}</b> facturas en PDF y un resumen en Excel.
            {filtroFechaDesde && ` Desde: ${formatearFechaDisplay(filtroFechaDesde)}`}
            {filtroFechaHasta && ` Hasta: ${formatearFechaDisplay(filtroFechaHasta)}`}
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email del Contador *</label>
            <input 
              type="email" 
              required 
              disabled={enviandoFacturas}
              placeholder="contador@estudio.com" 
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 disabled:bg-slate-100" 
              value={emailContador} 
              onChange={(e) => setEmailContador(e.target.value)} 
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={enviandoFacturas} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={enviandoFacturas} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
              {enviandoFacturas && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviandoFacturas ? 'Enviando...' : 'Enviar Correo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}