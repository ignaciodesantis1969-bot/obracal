// src/pages/Asistencias.jsx
import { useMemo } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, User, ShieldCheck } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

export default function Asistencias() {
  // Traemos los registros de asistencia y el personal
  const { data: asistencias, loading: loadingAsistencias } = useFirestoreCollection('attendance_records');
  const { data: personal, loading: loadingPersonal } = useFirestoreCollection('personal');

  const isLoading = loadingAsistencias || loadingPersonal;

  // Cruzamos los datos: buscamos el nombre del empleado en base a su employeeId
  const asistenciasProcesadas = useMemo(() => {
    if (!asistencias || !personal) return [];

    return asistencias.map(asist => {
      // Buscamos el empleado por su ID (el ID del documento de Firestore)
      const empleado = personal.find(p => String(p.id) === String(asist.employeeId));
      
      return {
        ...asist,
        nombreEmpleado: empleado ? empleado.nombre : `Empleado Desconocido (ID: ${asist.employeeId})`,
        especialidad: empleado ? empleado.especialidad : '---'
      };
    }).sort((a, b) => {
      // Ordenamos por la hora más reciente primero
      const fechaA = new Date(a.timestampLocal || a.timestamp?.toDate()).getTime() || 0;
      const fechaB = new Date(b.timestampLocal || b.timestamp?.toDate()).getTime() || 0;
      return fechaB - fechaA;
    });
  }, [asistencias, personal]);

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '---';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-AR') + ' ' + fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" /> Control de Asistencias
          </h1>
          <p className="text-slate-500 text-sm mt-1">Registros de entrada y salida desde la App Móvil</p>
        </div>
      </div>

      {/* Tabla de Datos */}
      <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-300">
                <th className="px-6 py-4">Fecha y Hora</th>
                <th className="px-6 py-4">Empleado</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Verificación</th>
                <th className="px-6 py-4">Ubicación (GPS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    Cargando asistencias...
                  </td>
                </tr>
              ) : asistenciasProcesadas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                    No hay asistencias registradas aún.
                  </td>
                </tr>
              ) : (
                asistenciasProcesadas.map((asist, idx) => {
                  const esEntrada = String(asist.tipo).toUpperCase().includes('ENTRADA');
                  
                  return (
                    <tr key={asist.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatearFecha(asist.timestampLocal)}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                          esEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {asist.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {asist.rostroDetectado ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <ShieldCheck className="w-4 h-4" /> Facial OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                            <CheckCircle2 className="w-4 h-4" /> Manual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        <a 
                          href={`https://maps.google.com/?q=${asist.latitud},${asist.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <MapPin className="w-4 h-4" /> Ver en Maps
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}