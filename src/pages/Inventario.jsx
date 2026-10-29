// src/pages/Inventario.jsx
import { useMemo } from 'react';
import { Package, Search, MapPin, User, Calendar } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

export default function Inventario() {
  const { data: inventario, loading } = useFirestoreCollection('inventario');

  const formatearFecha = (timestamp) => {
    if (!timestamp) return '---';
    const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return fecha.toLocaleDateString('es-AR') + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" /> Inventario de Obra
          </h1>
          <p className="text-slate-500 text-sm mt-1">Herramientas y máquinas registradas en obra</p>
        </div>
      </div>

      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-300">
                <th className="px-6 py-4">Foto</th>
                <th className="px-6 py-4">Herramienta / Máquina</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Registrado por</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">Cargando inventario...</td></tr>
              ) : !inventario || inventario.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">No hay herramientas registradas aún.</td></tr>
              ) : (
                inventario.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nombre} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{item.nombre}</span>
                        <span className="text-xs text-slate-500">Cód: {item.codigo || '---'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> {item.encargado}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {formatearFecha(item.fecha_registro)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <a 
                        href={`https://maps.google.com/?q=${item.latitud},${item.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <MapPin className="w-4 h-4" /> Ver Mapa
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}