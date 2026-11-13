// src/components/tesoreria/TablaRetenciones.jsx
import React from 'react';
import { FileText, Paperclip, Upload, Loader2 } from 'lucide-react';
import { formatearFechaDisplay } from '@/utils/tesoreriaHelpers';

export default function TablaRetenciones({
  retenciones,
  proveedores,
  clientes,
  obras,
  presupuestos,
  subiendoCertificadoId,
  onSubirCertificado,
}) {
  if (retenciones.length === 0) {
    return (
      <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
        <FileText className="w-10 h-10 text-slate-300" />
        <span>No hay retenciones registradas.</span>
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
          <th className="px-4 py-4">Fecha</th>
          <th className="px-4 py-4">Tipo</th>
          <th className="px-6 py-4">Cliente / Proveedor</th>
          <th className="px-4 py-4">Comprobante</th>
          <th className="px-4 py-4">Obra</th>
          <th className="px-4 py-4">Presupuesto</th>
          <th className="px-4 py-4 text-right">Monto</th>
          <th className="px-6 py-4 text-center">Certificado</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {retenciones.map(r => {
          const provId = r.proveedor_id || '';
          const cliId = r.cliente_id || '';
          const prov = proveedores.find(p => String(p.id || p.ID) === String(provId));
          const cli = clientes.find(c => String(c.id || c.ID) === String(cliId));
          const terceroNombre = prov?.razon_social || prov?.nombre || cli?.razon_social || cli?.nombre || '---';

          const obraId = r.obra_id || '';
          const obra = obras.find(o => String(o.id || o.ID) === String(obraId));
          const presId = r.presupuesto_id || '';
          const presu = presupuestos.find(p => String(p.id || p.ID) === String(presId));
          const rId = r.id || r.ID;
          const tieneCertificado = r.certificado_url && r.certificado_url.startsWith('http');
          const subiendo = String(subiendoCertificadoId) === String(rId);

          let badgeClase = 'bg-slate-100 text-slate-800';
          if (r.tipo === 'SUSS') badgeClase = 'bg-blue-100 text-blue-800';
          else if (r.tipo === 'IVA') badgeClase = 'bg-amber-100 text-amber-800';
          else if (r.tipo === 'Ganancias') badgeClase = 'bg-rose-100 text-rose-800';
          else if (r.tipo === 'IIBB PBA') badgeClase = 'bg-emerald-100 text-emerald-800';
          else if (r.tipo === 'IIBB CABA') badgeClase = 'bg-cyan-100 text-cyan-800';

          return (
            <tr key={rId} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600">{formatearFechaDisplay(r.fecha)}</td>
              <td className="px-4 py-3">
                <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${badgeClase}`}>
                  {r.tipo}
                </span>
                {r.es_manual && <span className="ml-1 text-[9px] text-slate-400 italic">manual</span>}
              </td>
              <td className="px-6 py-3 font-bold text-slate-900">{terceroNombre}</td>
              <td className="px-4 py-3 text-slate-600 truncate">{r.comprobante_asociado || '---'}</td>
              <td className="px-4 py-3 text-slate-600 truncate">
                {obra?.codigo ? `${obra.codigo} - ${obra.nombre || obra.nombre_obra}` : '---'}
              </td>
              <td className="px-4 py-3 text-slate-600 truncate">{presu?.codigo || '---'}</td>
              <td className="px-4 py-3 text-right font-black text-slate-900">
                $ {Number(r.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-3 text-center">
                {tieneCertificado ? (
                  <a
                    href={r.certificado_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-200 hover:bg-emerald-100"
                  >
                    <Paperclip className="w-3 h-3" /> Ver
                  </a>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      id={`cert-file-${rId}`}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) onSubirCertificado(r, file);
                      }}
                    />
                    <label
                      htmlFor={`cert-file-${rId}`}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer inline-flex items-center gap-1 transition-colors ${
                        subiendo
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      {subiendo ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</>
                      ) : (
                        <><Upload className="w-3 h-3" /> Subir PDF</>
                      )}
                    </label>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}