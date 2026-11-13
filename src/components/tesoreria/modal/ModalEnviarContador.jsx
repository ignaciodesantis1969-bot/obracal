// src/components/tesoreria/modal/ModalEnviarContador.jsx
import React from 'react';
import { X, Mail, Loader2 } from 'lucide-react';

export default function ModalEnviarContador({
  isOpen,
  onClose,
  onSubmit,
  emailContador,
  setEmailContador,
  enviando,
  cantidadItems,
  filtroDesde,
  filtroHasta,
  formatearFechaDisplay,
  tipo = 'compras', // 'compras' | 'retenciones'
}) {
  if (!isOpen) return null;

  const esRetenciones = tipo === 'retenciones';
  const titulo = esRetenciones ? 'Enviar Retenciones al Contador' : 'Enviar Facturas al Contador';
  const entidadPlural = esRetenciones ? 'retenciones' : 'facturas';
  const colorBoton = esRetenciones ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Mail className={`w-5 h-5 ${esRetenciones ? 'text-amber-600' : 'text-blue-600'}`} />
            {titulo}
          </h3>
          <button
            onClick={onClose}
            disabled={enviando}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
            <div className="font-bold uppercase mb-1">Período seleccionado</div>
            <div>
              <b>Desde:</b> {filtroDesde ? formatearFechaDisplay(filtroDesde) : 'Inicio'} &nbsp;|&nbsp;
              <b>Hasta:</b> {filtroHasta ? formatearFechaDisplay(filtroHasta) : 'Fin'}
            </div>
            <div className="mt-1">
              <b>{cantidadItems}</b> {entidadPlural} a enviar
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email del contador *
            </label>
            <input
              type="email"
              required
              disabled={enviando}
              placeholder="contador@ejemplo.com"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100"
              value={emailContador}
              onChange={(e) => setEmailContador(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || cantidadItems === 0}
              className={`px-6 py-2.5 ${colorBoton} disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer`}
            >
              {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
              {enviando ? 'Enviando...' : 'Enviar correo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}