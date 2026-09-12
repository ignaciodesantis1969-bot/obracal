import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GOOGLE_SCRIPT_URL } from '@/api';

// Importamos tu componente de reportes desde components
import ReportesComponente from '../components/Reportes'; 

const CONTRATO_DEFAULT = [{ id: "1", codigo: "CM001", nombre: "Mantenimiento Correctivo Edilicio", cliente: "LDC ARGENTINA S.A.", estado: "Activo" }];

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    console.error("Error capturado por Boundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border border-rose-300 rounded-2xl text-left text-xs text-rose-900 space-y-2">
          <p className="font-black text-sm">Ocurrió un error en Reportes:</p>
          <pre className="bg-white p-4 rounded-xl border border-rose-200 overflow-auto font-mono">
            {String(this.state.error?.stack || this.state.error?.message || JSON.stringify(this.state.error))}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const extraerArrayDatos = (fuente) => {
  if (Array.isArray(fuente)) return fuente;
  if (fuente && typeof fuente === 'object') {
    if (Array.isArray(fuente.certificados)) return fuente.certificados; // <--- BLINDAJE CERTIFICADOS
    if (Array.isArray(fuente.data)) return fuente.data;
    if (Array.isArray(fuente.items)) return fuente.items;
    if (Array.isArray(fuente.result)) return fuente.result;
    if (Array.isArray(fuente.reportes)) return fuente.reportes;
    const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
    if (posibleArray) return posibleArray;
  }
  return [];
};

function ReportesContent(props) {
  const { user } = useAuth();
  
  // Detección robusta de roles
  const rawRoleValue = props?.role || user?.role || user?.rol || user?.reloadUserInfo?.rol || '';
  const rolUsuario = String(rawRoleValue).trim().toLowerCase().replace(/-/g, '_');
  
  const esOperadorEstandar = rolUsuario === 'operador' || rolUsuario === 'operator';
  const isOp2 = rolUsuario === 'operador_ii' || rolUsuario === 'operadorii' || rolUsuario === 'operador2' || rolUsuario === 'operador ii' || rolUsuario.includes('operador_ii');

  const obras = Array.isArray(props?.obras) ? props.obras : [];
  const presupuestos = Array.isArray(props?.presupuestos) ? props.presupuestos : [];
  const facturas = Array.isArray(props?.facturas) ? props.facturas : [];
  const empleadosListProps = Array.isArray(props?.empleados) ? props.empleados : [];
  const reportesProps = Array.isArray(props?.allReportesSice) ? props.allReportesSice : [];

  const [fetchedContratos, setFetchedContratos] = useState([]);
  const [fetchedReportesSice, setFetchedReportesSice] = useState([]);
  const [fetchedCertificados, setFetchedCertificados] = useState([]);

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedContratos(extraerArrayDatos(data))).catch(() => {});
    
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Certificados', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedCertificados(extraerArrayDatos(data))).catch(() => {});

    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'ReportesSice', action: 'get' }) })
      .then(res => res.json())
      .then(data => {
        const arrayReportes = extraerArrayDatos(data);
        if (arrayReportes.length > 0) {
          setFetchedReportesSice(arrayReportes);
        } else {
          return fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'ReportesDiariosSice', action: 'get' }) })
            .then(res => res.json())
            .then(dataAlt => {
              const altReportes = extraerArrayDatos(dataAlt);
              if (altReportes.length > 0) setFetchedReportesSice(altReportes);
            });
        }
      })
      .catch(() => {});
  }, []);

  const contratosList = useMemo(() => {
    const arr = extraerArrayDatos(fetchedContratos);
    return arr.length > 0 ? arr : CONTRATO_DEFAULT;
  }, [fetchedContratos]);

  const allReportesSiceConsolidados = useMemo(() => {
    let localCache = [];
    try {
      const cached = localStorage.getItem('sice_partes_local_cache_v2');
      if (cached) localCache = JSON.parse(cached);
    } catch (e) {}

    const combinados = [
      ...extraerArrayDatos(reportesProps), 
      ...extraerArrayDatos(fetchedReportesSice), 
      ...localCache
    ];
    
    const unicosMap = new Map();
    combinados.forEach(item => {
      if (!item) return;
      const key = String(item.id || item.ID || item.nro || item.Nro || Math.random());
      if (!unicosMap.has(key)) unicosMap.set(key, item);
    });

    return Array.from(unicosMap.values());
  }, [reportesProps, fetchedReportesSice]);

  // Delegamos el renderizado de la UI y las pestañas al componente centralizado
  return (
    <ReportesComponente
      {...props}
      currentUser={user}
      esOperador={esOperadorEstandar}
      esOperadorII={isOp2}
      contratosList={contratosList}
      allReportesSice={allReportesSiceConsolidados}
      setFetchedReportesSice={setFetchedReportesSice}
      certificadosList={fetchedCertificados}
      setFetchedCertificados={setFetchedCertificados}
      obras={obras}
      presupuestos={presupuestos}
      facturas={facturas}
      listaEmpleadosActivos={empleadosListProps}
    />
  );
}

export default function Reportes(props) {
  return <ErrorBoundary><ReportesContent {...props} /></ErrorBoundary>;
}