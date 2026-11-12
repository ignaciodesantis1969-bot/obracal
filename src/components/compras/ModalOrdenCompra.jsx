// src/components/compras/ModalOrdenCompra.jsx
import React from 'react';
import { Plus, X, Trash2, Loader2 } from 'lucide-react';
import BuscadorSelect from '@/components/BuscadorSelect';

export default function ModalOrdenCompra({
  isOpen,
  onClose,
  onSubmit,
  formDataOc,
  setFormDataOc,
  isSaving,
  editingOcId,
  obras,
  opcionesProveedores,
  handleAgregarInsumoOc,
  handleCambiarInsumoOc,
  handleQuitarInsumoOc,
  buscarValorEnObjeto
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-8">
        <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
          <h3 className="font-bold text-slate-900">{editingOcId ? 'Modificar Orden de Compra' : 'Nueva Orden de Compra'}</h3>
          <button onClick={onClose} disabled={isSaving} className="text-slate-400 hover:text-slate-700 disabled:opacity-50 cursor-pointer"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra *</label>
              <select required disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 cursor-pointer" value={formDataOc.obra_id} onChange={(e) => setFormDataOc({...formDataOc, obra_id: e.target.value})}>
                <option value="">Seleccionar...</option>
                {obras.map(o => <option key={buscarValorEnObjeto(o, ['id', 'ID'])} value={buscarValorEnObjeto(o, ['id', 'ID'])}>{o.codigo} - {o.nombre || o.nombre_obra}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proveedor *</label>
              <BuscadorSelect
                opciones={opcionesProveedores}
                value={formDataOc.proveedor_id}
                onChange={(id) => setFormDataOc({ ...formDataOc, proveedor_id: id })}
                placeholder="Seleccionar..."
                minChars={3}
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
              <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.fecha} onChange={(e) => setFormDataOc({...formDataOc, fecha: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de Entrega</label>
              <input type="date" disabled={isSaving} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.fecha_entrega} onChange={(e) => setFormDataOc({...formDataOc, fecha_entrega: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-extrabold text-xs uppercase text-slate-800">Condiciones Comerciales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Condiciones de Pago</label>
                <input type="text" disabled={isSaving} placeholder="Ej: 30 días fecha factura" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.condiciones_pago} onChange={(e) => setFormDataOc({...formDataOc, condiciones_pago: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Plazo de Entrega</label>
                <input type="text" disabled={isSaving} placeholder="Ej: 15 días corridos" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.plazo_entrega} onChange={(e) => setFormDataOc({...formDataOc, plazo_entrega: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lugar de Entrega</label>
                <input type="text" disabled={isSaving} placeholder="Ej: Obra Planta San Lorenzo" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.lugar_entrega} onChange={(e) => setFormDataOc({...formDataOc, lugar_entrega: e.target.value})} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones</label>
                <textarea
                  disabled={isSaving}
                  rows={2}
                  placeholder="Observaciones adicionales..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100 resize-y"
                  value={formDataOc.observaciones}
                  onChange={(e) => setFormDataOc({...formDataOc, observaciones: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-extrabold text-xs uppercase text-slate-800">Firmas (aparecen en el PDF)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma SICE</label>
                <input type="text" disabled={isSaving} placeholder="Nombre del responsable SICE" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.firma_sice} onChange={(e) => setFormDataOc({...formDataOc, firma_sice: e.target.value})} />
                <p className="text-[10px] text-slate-500 mt-1">Debajo de la firma aparecerá "p/ SICE S.A."</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Firma Proveedor</label>
                <input type="text" disabled={isSaving} placeholder="Nombre del responsable del proveedor" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={formDataOc.firma_proveedor} onChange={(e) => setFormDataOc({...formDataOc, firma_proveedor: e.target.value})} />
                <p className="text-[10px] text-slate-500 mt-1">Podés dejarlo en blanco para firmar a mano</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h4 className="font-extrabold text-xs uppercase text-slate-800">Items</h4>
              <button type="button" onClick={handleAgregarInsumoOc} disabled={isSaving} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-3 py-2.5">Descripción</th>
                    <th className="px-3 py-2.5 w-24 text-center">Cant.</th>
                    <th className="px-3 py-2.5 w-28">Unidad</th>
                    <th className="px-3 py-2.5 w-32 text-right">P.Unit.</th>
                    <th className="px-3 py-2.5 w-32 text-right">Total</th>
                    <th className="px-3 py-2.5 w-12 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Array.isArray(formDataOc.insumos_oc) && formDataOc.insumos_oc.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2"><input type="text" disabled={isSaving} placeholder="Descripción..." className="w-full bg-white border rounded-lg px-2 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.descripcion || ''} onChange={(e) => handleCambiarInsumoOc(item.id, 'descripcion', e.target.value)} /></td>
                      <td className="px-3 py-2 text-center"><input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-center font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.cantidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'cantidad', e.target.value)} /></td>
                      <td className="px-3 py-2"><input type="text" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-xs uppercase font-semibold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.unidad} onChange={(e) => handleCambiarInsumoOc(item.id, 'unidad', e.target.value)} /></td>
                      <td className="px-3 py-2 text-right"><input type="number" step="0.01" disabled={isSaving} className="w-full bg-white border rounded-lg px-2 py-1.5 text-right font-bold outline-none focus:border-amber-500 disabled:bg-slate-100" value={item.p_unitario} onChange={(e) => handleCambiarInsumoOc(item.id, 'p_unitario', e.target.value)} /></td>
                      <td className="px-3 py-2 text-right font-black text-slate-900">$ {Number(item.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-center"><button type="button" onClick={() => handleQuitarInsumoOc(item.id)} disabled={isSaving} className="text-slate-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50 cursor-pointer">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? 'Guardando...' : (editingOcId ? 'Actualizar OC' : 'Crear OC')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}