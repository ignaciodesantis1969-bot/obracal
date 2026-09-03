import React, { useState, useMemo } from 'react';
import { Calendar, Users, Plus, Trash2, ShieldCheck, Eye, Printer, ExternalLink } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function ReportesDiariosTab({
  contratosList,
  allReportesSice,
  setFetchedReportesSice,
  listaEmpleadosActivos,
  esOperador,
  buscarValorEnObjeto
}) {
  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));
  const [siceParteNro, setSiceParteNro] = useState('00005');
  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
  ]);
  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);
  const [siceRespProveedor, setSiceRespProveedor] = useState({ cargo: '', nombre: '', clave: '' });
  const [siceRespCliente, setSiceRespCliente] = useState({ cargo: '', nombre: '', clave: '' });
  const [parteVisualizando, setParteVisualizando] = useState(null);
  const [isSavingSice, setIsSavingSice] = useState(false);

  const calcularTotalHorasSice = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hIni, mIni] = String(inicio).split(':').map(Number);
    const [hFin, mFin] = String(fin).split(':').map(Number);
    let diff = ((hFin || 0) * 60 + (mFin || 0)) - ((hIni || 0) * 60 + (mIni || 0));
    if (diff < 0) diff += 24 * 60;
    return Number(((diff / 60) * (11 / 9)).toFixed(2));
  };

  const agregarOperarioFila = () => {
    setOperariosSeleccionados([...operariosSeleccionados, { id: Math.random().toString(), nombre: '', abreviacion: 'OE', horas: '' }]);
  };

  const aprobarYArchivarParteSice = async (e) => {
    e.preventDefault();
    if (!contratoSeleccionadoId) return alert("Seleccione un Contrato de Mantenimiento.");
    setIsSavingSice(true);
    try {
      const totalHsSuma = siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it?.horaComienzo, it?.horaFin), 0);
      const payloadPdf = {
        action: 'guardarYGenerarPDF', tabla: 'ReportesSice',
        contratoId: String(contratoSeleccionadoId), fecha: String(siceFecha), nro: String(siceParteNro),
        items: siceItems, operarios: operariosSeleccionados,
        proveedor: siceRespProveedor, cliente: siceRespCliente, totalHorasSuma: totalHsSuma
      };
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payloadPdf)
      });
      const resultado = await res.json();
      const nuevoParte = { ...payloadPdf, id: `sice-${Date.now()}`, pdfUrl: resultado?.pdfUrl || resultado?.url || '' };
      setFetchedReportesSice(prev => [nuevoParte, ...prev]);
      alert("¡Parte Diario aprobado y guardado con éxito!");
    } catch (err) { alert("Error al guardar parte diario."); }
    finally { setIsSavingSice(false); }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center print:hidden">
          <h3 className="text-sm font-extrabold uppercase flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-500" /> Parte Diario SICE</h3>
          <select value={contratoSeleccionadoId} onChange={(e) => setContratoSeleccionadoId(e.target.value)} className="bg-slate-50 border rounded-xl px-3 py-2 text-xs font-bold">
            <option value="">-- Seleccionar Contrato --</option>
            {contratosList.map((c, i) => (
              <option key={i} value={buscarValorEnObjeto(c, ['id', 'codigo']) || i}>[{buscarValorEnObjeto(c, ['codigo'])}] {buscarValorEnObjeto(c, ['nombre'])}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-6 border rounded-2xl space-y-6">
          <div className="flex justify-between border-b pb-4">
            <img src="/logo-07.png" alt="SICE" className="h-20 object-contain" />
            <h2 className="text-xl font-black">PARTE DIARIO DE ACTIVIDADES</h2>
          </div>
          
          <form onSubmit={aprobarYArchivarParteSice} className="space-y-4">
            <div className="flex justify-end print:hidden">
              <button type="submit" disabled={isSavingSice} className="px-6 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Aprobar y Guardar Parte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}