import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Importamos tu componente de reportes desde components
import ReportesComponente from '../components/Reportes'; 

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

function ReportesContent(props) {
  const { user } = useAuth();
  
  // 🔑 Detección robusta de roles (se mantiene igual)
  const rawRoleValue = props?.role || user?.role || user?.rol || user?.reloadUserInfo?.rol || '';
  const rolUsuario = String(rawRoleValue).trim().toLowerCase().replace(/-/g, '_');
  
  const esOperadorEstandar = rolUsuario === 'operador' || rolUsuario === 'operator';
  const isOp2 = rolUsuario === 'operador_ii' || rolUsuario === 'operadorii' || rolUsuario === 'operador2' || rolUsuario === 'operador ii' || rolUsuario.includes('operador_ii');

  // 🔑 Limpieza única de la clave vieja de localStorage (residuo de versión anterior)
  useEffect(() => {
    try {
      if (localStorage.getItem('sice_partes_local_cache_v2')) {
        localStorage.removeItem('sice_partes_local_cache_v2');
        console.info('[Reportes] Limpiada clave obsoleta sice_partes_local_cache_v2');
      }
    } catch (e) {}
  }, []);

  // 🔑 Props que vienen del App.jsx global (si existen). El hijo se encarga del resto.
  const obras = Array.isArray(props?.obras) ? props.obras : [];
  const presupuestos = Array.isArray(props?.presupuestos) ? props.presupuestos : [];
  const facturas = Array.isArray(props?.facturas) ? props.facturas : [];
  const empleadosListProps = Array.isArray(props?.empleados) ? props.empleados : [];
  const insumosProps = Array.isArray(props?.insumos) ? props.insumos : [];
  const proveedoresProps = Array.isArray(props?.proveedores) ? props.proveedores : [];

  // 🔑 NOTA IMPORTANTE:
  // Ya NO fetcheamos ContratosMantenimiento / Certificados / ReportesSice acá.
  // Eso lo hace el hijo (<ReportesComponente>) vía React Query (useObraData),
  // que deduplica requests automáticamente y respeta el cache de 5 minutos.
  //
  // Al eliminar los fetch crudos duplicados, este wrapper deja de disparar
  // 3 requests redundantes cada vez que se entra a la pantalla de Reportes.

  // Delegamos el renderizado de la UI y las pestañas al componente centralizado
  return (
    <ReportesComponente
      {...props}
      currentUser={user}
      esOperador={esOperadorEstandar}
      esOperadorII={isOp2}
      obras={obras}
      presupuestos={presupuestos}
      facturas={facturas}
      insumos={insumosProps}
      proveedores={proveedoresProps}
      listaEmpleadosActivos={empleadosListProps}
    />
  );
}

export default function Reportes(props) {
  return <ErrorBoundary><ReportesContent {...props} /></ErrorBoundary>;
}