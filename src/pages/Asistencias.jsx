// src/pages/Asistencias.jsx
import { useState, useMemo } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, User, ShieldCheck, X } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

export default function Asistencias() {
  const { data: asistencias, loading: loadingAsistencias } = useFirestoreCollection('attendance_records');
  const { data: personal, loading: loadingPersonal } = useFirestoreCollection('personal');
  const { data: obras, loading: loadingObras } = useFirestoreCollection('obras');

  const [filtroObra, setFiltroObra] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const isLoading = loadingAsistencias || loadingPersonal || loadingObras;

  // Agrupamos los registros por Empleado y por Día
  const asistenciasAgrupadas = useMemo(() => {
    if (!asistencias || !personal) return [];

    // 1. Primero cruzamos los datos para tener nombres y obras
    let procesadas = asistencias.map(asist => {
      const empleado = personal.find(p => String(p.id) === String(asist.employeeId));
      const obra = obras?.find(o => String(o.id) === String(asist.obraId));
      
      // Extraemos solo la fecha (YYYY-MM-DD) para agrupar
      const fechaDia = asist.timestampLocal ? asist.timestampLocal.split('T')[0] : 'sin-fecha';
      const hora = asist.timestampLocal ? new Date(asist.timestampLocal).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '---';

      return {
        ...asist,
        nombreEmpleado: empleado ? empleado.nombre : `Empleado Desconocido`,
        especialidad: empleado ? empleado.especialidad : '---',
        nombreObra: obra ? obra.nombre : `Obra Desconocida`,
        fechaDia,
        hora
      };
    });

    // 2. Aplicamos filtros (Obra y Fecha)
    if (filtroObra) {
      procesadas = procesadas.filter(a => String(a.obraId) === String(filtroObra));
    }
    if (filtroFecha) {
      procesadas = procesadas.filter(a => a.fechaDia === filtroFecha);
    }

    // 3. Agrupamos por "ID del Empleado + Fecha"
    const grupos = {};

    procesadas.forEach(registro => {
      const clave = `${registro.employeeId}_${registro.fechaDia}`;
      
      if (!grupos[clave]) {
        // Si es el primer registro del día, lo inicializamos
        grupos[clave] = {
          id: clave,
          fechaDia: registro.fechaDia,
          nombreEmpleado: registro.nombreEmpleado,
          especialidad: registro.especialidad,
          nombreObra: registro.nombreObra,
          entrada: null,
          salida: null,
          rostroOk: registro.rostroDetectado, // Tomamos el estado del primer registro
          latitud: registro.latitud,
          longitud: registro.longitud
        };
      }

      // Si el registro es ENTRADA y no había una, la guardamos
      if (registro.tipo === 'ENTRADA' && !grupos[clave].entrada) {
        grupos[clave].entrada = registro.hora;
      }
      // Si el registro es SALIDA, la guardamos (si hay varias, toma la última)
      if (registro.tipo === 'SALIDA') {
        grupos[clave].salida = registro.hora;
      }
    });

    // 4. Convertimos el objeto a un array y ordenamos por fecha descendente
    return Object.values(grupos).sort((a, b) => b.fechaDia.localeCompare(a.fechaDia));

  }, [asistencias, personal, obras, filtroObra, filtroFecha]);

  const formatearFechaVisual = (fechaString) => {
    if (!fechaString || fechaString === 'sin-fecha') return '---';
    const [year, month, day] = fechaString.split('-');
    return `${day}/${month}/${year}`;
  };

  const limpiarFiltros = () => {
    setFiltroObra('');
    setFiltroFecha('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" /> Control de Asistencias
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registros agrupados por día</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar por Obra</label>
          <select
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            value={filtroObra}
            onChange={(e) => setFiltroObra(e.target.value)}
          >
            <option value="">Todas las obras</option>
            {obras?.map(obra => (
              <option key={obra.id} value={obra.id}>{obra.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtrar por Fecha</label>
          <input
            type="date"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
          />
        </div>

        {(filtroObra || filtroFecha) && (
          <button
            onClick={limpiarFiltros}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 h-[38px]"
          >
            <X className="w-4 h-4" /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-300">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Obra</th>
                <th className="px-6 py-4 text-center">Hora Entrada</th>
                <th className="px-6 py-4 text-center">Hora Salida</th>
                <th className="px-6 py-4">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500">Cargando asistencias...</td>
                </tr>
              ) : asistenciasAgrupadas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">No hay asistencias registradas.</td>
                </tr>
              ) : (
                asistenciasAgrupadas.map((asist) => (
                  <tr key={asist.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatearFechaVisual(asist.fechaDia)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-amber-500" />
                          {asist.nombreEmpleado}
                        </span>
                        <span className="text-xs text-slate-500">{asist.especialidad}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {asist.nombreObra}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {asist.entrada ? (
                        <span className="inline-flex px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-sm">
                          {asist.entrada}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin registro</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {asist.salida ? (
                        <span className="inline-flex px-3 py-1 rounded-md bg-rose-100 text-rose-800 font-bold text-sm">
                          {asist.salida}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin registro</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex flex-col gap-1">
                        {asist.rostroOk && (
                           <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                             <ShieldCheck className="w-3 h-3" /> Facial OK
                           </span>
                        )}
                        <a 
                          href={`https://maps.google.com/?q=${asist.latitud},${asist.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                        >
                          <MapPin className="w-3 h-3" /> Ver Mapa
                        </a>
                      </div>
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