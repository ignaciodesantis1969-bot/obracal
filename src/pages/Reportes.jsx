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
  render() {
    if (this.state.hasError) {
      return <div className="p-8 bg-rose-50 border rounded-2xl text-center text-xs text-rose-900">Ocurrió un error en Reportes.</div>;
    }
    return this.props.children;
  }
}

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

  const [fetchedContratos, setFetchedContratos] = useState([]);
  const [fetchedReportesSice, setFetchedReportesSice] = useState([]);
  const [fetchedCertificados, setFetchedCertificados] = useState([]);
  const [fetchedProveedores, setFetchedProveedores] = useState([]);
  
  const [activeTab, setActiveTab] = useState(esOperador ? 'Reportes Diarios' : 'Certificaciones');

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'get' }) })
      .then(res => res.json()).then(data => Array.isArray(data) && setFetchedContratos(data)).catch(() => {});
    
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Certificaciones', action: 'get' }) })
      .then(res => res.json()).then(data => Array.isArray(data) && setFetchedCertificados(data)).catch(() => {});
    
    fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ tabla: 'Proveedores', action: 'get' }) })
      .then(res => res.json()).then(data => Array.isArray(data) && setFetchedProveedores(data)).catch(() => {});
  }, []);

  const contratosList = useMemo(() => fetchedContratos.length > 0 ? fetchedContratos : CONTRATO_DEFAULT, [fetchedContratos]);
  const proveedoresList = fetchedProveedores;

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
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes <span className="text-xs text-amber-600 font-mono">(Modular Activo)</span></h1>
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
          contratosList={contratosList} allReportesSice={fetchedReportesSice} setFetchedReportesSice={setFetchedReportesSice}
          listaEmpleadosActivos={empleadosListProps} esOperador={esOperador} buscarValorEnObjeto={buscarValorEnObjeto}
        />
      )}

      {activeTab === 'Listado de Insumos' && (
        <ListadoInsumosTab
          presupuestos={presupuestos} insumos={[]} proveedorNombreMap={proveedorNombreMap}
          obtenerClienteDePresupuesto={obtenerClienteDePresupuesto}
        />
      )}

      {activeTab === 'Comparativo' && (
        <ComparativoTab
          presupuestos={presupuestos} obras={obras} facturas={facturas} movimientos={movimientos} limpiarTexto={limpiarTexto}
        />
      )}
    </div>
  );
}

export default function Reportes(props) {
  return <ErrorBoundary><ReportesContent {...props} /></ErrorBoundary>;
}