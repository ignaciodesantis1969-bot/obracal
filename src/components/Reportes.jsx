import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useObraData } from '@/hooks/useObraData';
import { OBRAS_CONFIG } from '@/config/constants';
import ReportesDiariosTab from './reportes/ReportesDiariosTab';
import ListadoInsumosTab from './reportes/ListadoInsumosTab';
import ComparativoTab from './reportes/ComparativoTab';
import CertificacionesTab from './reportes/CertificacionesTab';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error en módulo de Reportes:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Algo salió mal en este panel</h2>
          <p className="text-xs text-slate-500">Ocurrió un error inesperado al renderizar los reportes.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReportesContent({
  contratosList: propContratos = [],
  allReportesSice: propReportes = [],
  setFetchedReportesSice = () => {},
  listaEmpleadosActivos = [],
  esOperador = false,
  esOperadorII = false,
  currentUser = null,
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  },
  presupuestos = [],
  facturas = [],
  setFetchedCertificados = () => {},
  certificadosList = [],
  obras = []
}) {
  const rolStr = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
  const esOperadorEstandar = esOperador || rolStr === 'operador' || rolStr === 'operator';
  const isOp2 = esOperadorII || rolStr === 'operador_ii' || rolStr === 'operadorii' || rolStr === 'operador2' || rolStr === 'operador ii';

  const { data: contratosSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento');
  const { data: reportesSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice');
  const { data: tesoreriaSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.TESORERIA || 'Tesoreria');
  const { data: certificadosSheet } = useObraData('Certificados');

  const extraerArrayDatos = (fuente) => {
    if (Array.isArray(fuente)) return fuente;
    if (fuente && typeof fuente === 'object') {
      if (Array.isArray(fuente.data)) return fuente.data;
      if (Array.isArray(fuente.items)) return fuente.items;
      if (Array.isArray(fuente.result)) return fuente.result;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  const contratosList = useMemo(() => {
    const p = extraerArrayDatos(propContratos);
    if (p.length > 0) return p;
    return extraerArrayDatos(contratosSheet);
  }, [propContratos, contratosSheet]);

  const tesoreriaList = useMemo(() => {
    return extraerArrayDatos(tesoreriaSheet);
  }, [tesoreriaSheet]);

  const allCertificadosList = useMemo(() => {
    const p = extraerArrayDatos(certificadosList);
    const s = extraerArrayDatos(certificadosSheet);
    return [...p, ...s];
  }, [certificadosList, certificadosSheet]);

  const [reportesLocalesExtra, setReportesLocalesExtra] = useState([]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('sice_partes_local_cache_v3');
      if (cached) {
        setReportesLocalesExtra(JSON.parse(cached));
      }
    } catch (e) {}
  }, []);

  const handleAgregarReporteLocal = useCallback((updater) => {
    setFetchedReportesSice(prev => {
      const actualizados = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('sice_partes_local_cache_v3', JSON.stringify(actualizados));
      } catch (e) {}
      setReportesLocalesExtra(actualizados);
      return actualizados;
    });
  }, [setFetchedReportesSice]);

  const allReportesSice = useMemo(() => {
    const p = extraerArrayDatos(propReportes);
    const s = extraerArrayDatos(reportesSheet);
    const combinados = [...p, ...s, ...reportesLocalesExtra];
    
    const unicosMap = new Map();
    combinados.forEach(item => {
      if (!item) return;
      const key = String(item.id || item.ID || item.nro || item.Nro || Math.random());
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [propReportes, reportesSheet, reportesLocalesExtra]);

  const [activeTab, setActiveTab] = useState(isOp2 ? 'Reportes Diarios' : 'Certificaciones');

  const obtenerClienteDePresupuesto = (presupuesto) => {
    if (!presupuesto) return '---';
    for (const [k, v] of Object.entries(presupuesto)) {
      if (k.toLowerCase().includes('client') || k.toLowerCase().includes('razon')) return String(v);
    }
    return presupuesto?.cliente || '---';
  };

  const obtenerOrdenDeCompra = (presupuesto) => {
    if (!presupuesto) return '---';
    return presupuesto.nro_orden_compra || presupuesto.orden_compra || presupuesto.ordenCompra || '---';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm print:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">
          {esOperadorEstandar ? "(Vista de Operador - Reportes Diarios)" : isOp2 ? "(Vista de Operador II - Reportes y Certificaciones CM)" : "(Certificaciones - Reportes - Listado de Insumos - Comparativas)"}
        </p>
      </div>

      {!esOperadorEstandar && (
        <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap print:hidden">
          {isOp2 ? (
            <>
              <button
                onClick={() => setActiveTab('Reportes Diarios')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'Reportes Diarios' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                Reportes Diarios SICE
              </button>
              <button
                onClick={() => setActiveTab('Certificaciones')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'Certificaciones' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                Certificaciones (CM)
              </button>
            </>
          ) : (
            ['Certificaciones', 'Reportes Diarios', 'Listado de Insumos', 'Comparativo'].map((tab) => (
              <button
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                {tab}
              </button>
            ))
          )}
        </div>
      )}

      {!esOperadorEstandار && activeTab === 'Certificaciones' && (
        <CertificacionesTab
          presupuestos={presupuestos}
          obras={obras}
          certificadosList={certificadosList}
          certificadosProps={allCertificadosList}
          fetchedCertificados={allCertificadosList}
          setFetchedCertificados={setFetchedCertificados}
          obtenerClienteDePresupuesto={obtenerClienteDePresupuesto}
          obtenerOrdenDeCompra={obtenerOrdenDeCompra}
          buscarValorEnObjeto={buscarValorEnObjeto}
          contratosList={contratosList}
          allReportesSice={allReportesSice}
          facturas={facturas}
          isOp2={isOp2}
        />
      )}

      {(esOperadorEstandar || activeTab === 'Reportes Diarios') && (
        <ReportesDiariosTab
          contratosList={contratosList}
          allReportesSice={allReportesSice}
          setFetchedReportesSice={handleAgregarReporteLocal}
          listaEmpleadosActivos={listaEmpleadosActivos}
          esOperador={esOperadorEstandar}
          buscarValorEnObjeto={buscarValorEnObjeto}
        />
      )}

      {!esOperadorEstandar && !isOp2 && activeTab === 'Listado de Insumos' && (
        <ListadoInsumosTab presupuestos={presupuestos} />
      )}

      {!esOperadorEstandar && !isOp2 && activeTab === 'Comparativo' && (
        <ComparativoTab
          presupuestos={presupuestos}
          facturas={facturas}
          tesoreria={tesoreriaList}
          allReportesSice={allReportesSice}
          obras={obras}
        />
      )}
    </div>
  );
}

export default function Reportes(props) {
  return (
    <ErrorBoundary>
      <ReportesContent {...props} />
    </ErrorBoundary>
  );
}