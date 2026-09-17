// src/components/Reportes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
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
  insumos = [],
  proveedores = [],
  cargasSemanales = [],
  setFetchedCertificados = () => {},
  certificadosList = [],
  obras = []
}) {
  const queryClient = useQueryClient();

  const rolStr = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
  const esOperadorEstandar = Boolean(esOperador || rolStr === 'operador' || rolStr === 'operator');
  const isOp2 = Boolean(esOperadorII || rolStr === 'operador_ii' || rolStr === 'operadorii' || rolStr === 'operador2' || rolStr === 'operador ii');

  // 🔑 MIGRACIÓN A FIRESTORE: leemos TODAS las colecciones necesarias directo de Firestore.
  // Las props viejas (que venían de App.jsx → globalData → Apps Script) ya no son confiables
  // porque el usuario puede entrar directo a /reportes sin pasar por el flujo de login,
  // y en ese caso globalData queda vacío.
  const { data: contratosSheet } = useFirestoreCollection('contratos');
  const { data: reportesSheet } = useFirestoreCollection('reportes_diarios');
  const { data: tesoreriaSheet } = useFirestoreCollection('tesoreria');
  const { data: certificadosSheet } = useFirestoreCollection('certificados');
  const { data: presupuestosSheet } = useFirestoreCollection('presupuestos');
  const { data: obrasSheet } = useFirestoreCollection('obras');
  const { data: facturasSheet } = useFirestoreCollection('facturas_compras');
  const { data: insumosSheet } = useFirestoreCollection('insumos');
  const { data: proveedoresSheet } = useFirestoreCollection('proveedores');
  const { data: cargasSemanalesSheet } = useFirestoreCollection('cargas_semanales');

  const extraerArrayDatos = (fuente) => {
    if (!fuente) return [];
    let arr = Array.isArray(fuente) ? fuente : (fuente.certificados || fuente.data || fuente.items || fuente.result || []);
    if (!Array.isArray(arr) && typeof fuente === 'object') {
      const posible = Object.values(fuente).find(val => Array.isArray(val));
      arr = posible || [];
    }
    return arr;
  };

  // 🔑 Listas unificadas: props primero, y si están vacías usamos Firestore.
  const contratosList = useMemo(() => {
    const p = extraerArrayDatos(propContratos);
    if (p.length > 0) return p;
    return extraerArrayDatos(contratosSheet);
  }, [propContratos, contratosSheet]);

  const tesoreriaList = useMemo(() => {
    return extraerArrayDatos(tesoreriaSheet);
  }, [tesoreriaSheet]);

  // 🔑 NUEVO: listas con fallback a Firestore para las tabs Certificaciones / Insumos / Comparativo
  const presupuestosList = useMemo(() => {
    const p = extraerArrayDatos(presupuestos);
    if (p.length > 0) return p;
    return extraerArrayDatos(presupuestosSheet);
  }, [presupuestos, presupuestosSheet]);

  const obrasList = useMemo(() => {
    const p = extraerArrayDatos(obras);
    if (p.length > 0) return p;
    return extraerArrayDatos(obrasSheet);
  }, [obras, obrasSheet]);

  const facturasList = useMemo(() => {
    const p = extraerArrayDatos(facturas);
    if (p.length > 0) return p;
    return extraerArrayDatos(facturasSheet);
  }, [facturas, facturasSheet]);

  const insumosList = useMemo(() => {
    const p = extraerArrayDatos(insumos);
    if (p.length > 0) return p;
    return extraerArrayDatos(insumosSheet);
  }, [insumos, insumosSheet]);

  const proveedoresList = useMemo(() => {
    const p = extraerArrayDatos(proveedores);
    if (p.length > 0) return p;
    return extraerArrayDatos(proveedoresSheet);
  }, [proveedores, proveedoresSheet]);

  const cargasSemanalesList = useMemo(() => {
    const p = extraerArrayDatos(cargasSemanales);
    if (p.length > 0) return p;
    return extraerArrayDatos(cargasSemanalesSheet);
  }, [cargasSemanales, cargasSemanalesSheet]);

  const allCertificadosList = useMemo(() => {
    const p = extraerArrayDatos(certificadosList);
    const s = extraerArrayDatos(certificadosSheet);
    const combinados = [...p, ...s];

    const unicosMap = new Map();
    combinados.forEach(item => {
      if (!item) return;
      const key = String(item.id || item.ID || item.certificadonro || item.certificadoNro || Math.random());
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });
    return Array.from(unicosMap.values());
  }, [certificadosList, certificadosSheet]);

  // 🔑 FIX: se eliminó la lista negra de localStorage.
  // Ahora los partes se guardan/eliminan en Firestore y onSnapshot refresca solo.
  const allReportesSice = useMemo(() => {
    const p = extraerArrayDatos(propReportes);
    const s = extraerArrayDatos(reportesSheet);
    const combinados = [...p, ...s];

    const unicosMap = new Map();
    combinados.forEach(item => {
      if (!item) return;

      const idItem = String(item?.id || item?.ID || '').trim();
      const nroCrud = String(item?.nro || item?.Nro || '').trim();
      const nroNormalizado = nroCrud ? parseInt(nroCrud.replace(/\D/g, ''), 10).toString() : '';

      const key = String(item.id || item.ID || item.nro || item.Nro || Math.random());
      if (!unicosMap.has(key)) {
        unicosMap.set(key, item);
      }
    });

    return Array.from(unicosMap.values());
  }, [propReportes, reportesSheet]);

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

      {!esOperadorEstandar && activeTab === 'Certificaciones' && (
        <CertificacionesTab
          currentUser={currentUser}
          presupuestos={presupuestosList}
          obras={obrasList}
          certificadosList={certificadosList}
          certificadosProps={allCertificadosList}
          fetchedCertificados={allCertificadosList}
          setFetchedCertificados={setFetchedCertificados}
          obtenerClienteDePresupuesto={obtenerClienteDePresupuesto}
          obtenerOrdenDeCompra={obtenerOrdenDeCompra}
          buscarValorEnObjeto={buscarValorEnObjeto}
          contratosList={contratosList}
          allReportesSice={allReportesSice}
          facturas={facturasList}
          isOp2={isOp2}
        />
      )}

      {(esOperadorEstandar || activeTab === 'Reportes Diarios') && (
        <ReportesDiariosTab
          contratosList={contratosList}
          allReportesSice={allReportesSice}
          setFetchedReportesSice={setFetchedReportesSice}
          listaEmpleadosActivos={listaEmpleadosActivos}
          esOperador={esOperadorEstandar}
          buscarValorEnObjeto={buscarValorEnObjeto}
          currentUser={currentUser}
        />
      )}

      {!esOperadorEstandar && !isOp2 && activeTab === 'Listado de Insumos' && (
        <ListadoInsumosTab
          presupuestos={presupuestosList}
          insumos={insumosList}
          proveedores={proveedoresList}
        />
      )}

      {!esOperadorEstandar && !isOp2 && activeTab === 'Comparativo' && (
        <ComparativoTab
          presupuestos={presupuestosList}
          facturas={facturasList}
          tesoreria={tesoreriaList}
          allReportesSice={allReportesSice}
          obras={obrasList}
          contratos={contratosList}
          contratosList={contratosList}
          cargasSemanales={cargasSemanalesList}
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