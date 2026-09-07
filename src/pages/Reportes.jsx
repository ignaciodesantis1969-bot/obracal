import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { GOOGLE_SCRIPT_URL } from '@/api';

import CertificacionesTab from '../components/reportes/CertificacionesTab';
import ReportesDiariosTab from '../components/reportes/ReportesDiariosTab';
import ListadoInsumosTab from '../components/reportes/ListadoInsumosTab';
import ComparativoTab from '../components/reportes/ComparativoTab';

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
  const userRole = String(props?.role || user?.role || '').toLowerCase();
  const esOperador = userRole.includes('operador');

  const obras = Array.isArray(props?.obras) ? props.obras : [];
  const presupuestos = Array.isArray(props?.presupuestos) ? props.presupuestos : [];
  const certificadosProps = Array.isArray(props?.certificados) ? props.certificados : [];
  const movimientos = Array.isArray(props?.movimientos) ? props.movimientos : [];
  const facturas = Array.isArray(props?.facturas) ? props.facturas : [];
  const empleadosListProps = Array.isArray(props?.empleados) ? props.empleados : [];
  const reportesProps = Array.isArray(props?.allReportesSice) ? props.allReportesSice : [];
  const insumosProps = Array.isArray(props?.insumos) ? props.insumos : [];

  const [fetchedContratos, setFetchedContratos] = useState([]);
  const [fetchedReportesSice, setFetchedReportesSice] = useState([]);
  const [fetchedCertificados, setFetchedCertificados] = useState([]);
  const [fetchedProveedores, setFetchedProveedores] = useState([]);
  const [fetchedInsumos, setFetchedInsumos] = useState([]);
  
  const [activeTab, setActiveTab] = useState(esOperador ? 'Reportes Diarios' : 'Certificaciones');

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedContratos(extraerArrayDatos(data))).catch(() => {});
    
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Certificaciones', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedCertificados(extraerArrayDatos(data))).catch(() => {});
    
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Proveedores', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedProveedores(extraerArrayDatos(data))).catch(() => {});

    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Insumos', action: 'get' }) })
      .then(res => res.json()).then(data => setFetchedInsumos(extraerArrayDatos(data))).catch(() => {});

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

  const proveedoresList = useMemo(() => {
    return extraerArrayDatos(fetchedProveedores);
  }, [fetchedProveedores]);

  const insumosList = useMemo(() => {
    return [...insumosProps, ...extraerArrayDatos(fetchedInsumos)];
  }, [insumosProps, fetchedInsumos]);

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

  const proveedorNombreMap = useMemo(() => {
    const map = {};
    proveedoresList.forEach(prov => {
      const pRazon = prov?.razon_social || prov?.nombre || '';
      if (pRazon) map[pRazon.toLowerCase()] = pRazon;
    });
    return map;
  }, [proveedoresList]);

  const buscarValorEnObjeto = (obj, posibleClaves, defecto = '') => {
    if (!obj || typeof obj !== 'object') return defecto;
    for (const pk of posibleClaves) {
      for (const [k, v] of Object.entries(obj)) {
        if (String(k).toLowerCase() === String(pk).toLowerCase() && v != null) return v;
      }
    }
    return defecto;
  };

  const obtenerClienteDePresupuesto = (presupuesto) => {
    if (!presupuesto) return '---';
    for (const [k, v] of Object.entries(presupuesto)) {
      if (k.toLowerCase().includes('client') || k.toLowerCase().includes('razon')) return String(v);
    }
    return '---';
  };

  const obtenerOrdenDeCompra = (presupuesto) => {
    if (!presupuesto) return '---';
    return presupuesto.nro_orden_compra || presupuesto.orden_compra || '---';
  };

  const limpiarTexto = (txt) => String(txt || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border shadow-sm print:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes </h1>
      </div>

      {!esOperador && (
        <div className="flex gap-2 bg-white p-3 rounded-2xl border shadow-sm flex-wrap print:hidden">
          {['Certificaciones', 'Reportes Diarios', 'Listado de Insumos', 'Comparativo'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border hover:bg-slate-100'}`}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'Certificaciones' && (
        <CertificacionesTab
          presupuestos={presupuestos} obras={obras} certificadosProps={certificadosProps}
          fetchedCertificados={fetchedCertificados} setFetchedCertificados={setFetchedCertificados}
          obtenerClienteDePresupuesto={obtenerClienteDePresupuesto} obtenerOrdenDeCompra={obtenerOrdenDeCompra}
          buscarValorEnObjeto={buscarValorEnObjeto}
        />
      )}

      {activeTab === 'Reportes Diarios' && (
        <ReportesDiariosTab
          contratosList={contratosList} 
          allReportesSice={allReportesSiceConsolidados} 
          setFetchedReportesSice={setFetchedReportesSice}
          listaEmpleadosActivos={empleadosListProps} 
          esOperador={esOperador} 
          buscarValorEnObjeto={buscarValorEnObjeto}
        />
      )}

      {activeTab === 'Listado de Insumos' && (
        <ListadoInsumosTab
          presupuestos={presupuestos} 
          insumos={insumosList} 
          proveedores={proveedoresList}
          proveedorNombreMap={proveedorNombreMap}
          obtenerClienteDePresupuesto={obtenerClienteDePresupuesto}
        />
      )}

      {activeTab === 'Comparativo' && (
        <ComparativoTab
          presupuestos={presupuestos} obras={obras} facturas={facturas} tesoreria={movimientos} contratos={contratosList} limpiarTexto={limpiarTexto}
        />
      )}
    </div>
  );
}

export default function Reportes(props) {
  return <ErrorBoundary><ReportesContent {...props} /></ErrorBoundary>;
}