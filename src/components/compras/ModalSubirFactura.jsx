// src/components/compras/ModalSubirFactura.jsx
import React from 'react';
import { X, Upload, Loader2 } from 'lucide-react';

export default function ModalSubirFactura({
  isOpen,
  onClose,
  onCargarSinComprobante,
  handleArchivoSubido,
  localLoading
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900">Nueva Factura — Subir comprobante</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-8 text-center space-y-6">
          <p className="text-xs text-slate-500">Sube el archivo de la factura o nota de crédito. La IA leerá automáticamente los datos.</p>
          <label className="border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors block">
            {localLoading ? <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" /> : <Upload className="w-10 h-10 text-amber-500 mb-3" />}
            <span className="font-bold text-sm text-slate-800">{localLoading ? "Procesando con IA..." : "Sube el archivo del comprobante"}</span>
            <span className="text-[11px] text-slate-500 mt-1">Extracción automática por Inteligencia Artificial</span>
            <input type="file" className="hidden" onChange={handleArchivoSubido} disabled={localLoading} />
          </label>
          <div className="flex justify-between items-center pt-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">Cancelar</button>
            <button onClick={onCargarSinComprobante} className="text-xs font-bold text-amber-600 hover:underline cursor-pointer">Cargar sin comprobante</button>
          </div>
        </div>
      </div>
    </div>
  );
}