import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

// Layout y Auth
import Layout from '@/components/Layout';
import RequirePermiso from '@/components/RequirePermiso';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Pages
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import Proveedores from '@/pages/Proveedores';
import Obras from '@/pages/Obras';
import Insumos from '@/pages/Insumos';
import Presupuestos from '@/pages/Presupuestos';
import PresupuestoDetalle from '@/pages/PresupuestoDetalle';
import Planificacion from '@/pages/Planificacion';
import Rrhh from '@/pages/Rrhh';
import Compras from '@/pages/Compras';
import Tesoreria from '@/pages/Tesoreria';
import Reportes from '@/pages/Reportes';
import Usuarios from '@/pages/Usuarios';
import TareasTemplate from '@/pages/TareasTemplate';

const AuthenticatedApp = () => {
  const { user, setUser } = useAuth();
  const [loadingSession, setLoadingSession] = useState(true);
  
  const [globalData, setGlobalData] = useState({
    facturas: [],
    facturasVenta: [],
    ordenesCompra: [],
    proveedores: [],
    obras: [],
    presupuestos: [],
    insumos: [],
    clientes: [],
    movimientos: [],
    personal: [],
    rubros: [],
    maestroTareasRubros: []
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ tabla: 'Usuarios', action: 'list' })
          });
          const data = await response.json();
          
          if (Array.isArray(data)) {
            const emailFirebase = String(firebaseUser.email || '').trim().toLowerCase();
            
            const userInfo = data.find(u => 
              String(u.email || '').trim().toLowerCase() === emailFirebase
            );
            
            const nombreFinal = userInfo?.nombre || userInfo?.Nombre || firebaseUser.email.split('@')[0];
            const rolFinal = userInfo?.role || userInfo?.rol || userInfo?.Role || 'admin';

            setUser({
              ...firebaseUser,
              nombre: nombreFinal,
              role: rolFinal,
              rol: rolFinal
            });
          } else {
            setUser({
              ...firebaseUser,
              nombre: firebaseUser.email.split('@')[0],
              role: 'admin',
              rol: 'admin'
            });
          }
        } catch (error) {
          console.error("Error al obtener perfil del usuario:", error);
          setUser({
            ...firebaseUser,
            nombre: firebaseUser.email.split('@')[0],
            role: 'admin',
            rol: 'admin'
          });
        }
      } else {
        setUser(null);
      }
      setLoadingSession(false);
    });

    return () => unsubscribe();
  }, [setUser]);

  const cargarDatos = async () => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'cargarDetalleCompleto' })
      });
      const data = await response.json();
      if (data.success) {
        setGlobalData({
          facturas: data.facturas || [],
          facturasVenta: data.facturas_venta || data.facturasVenta || [],
          ordenesCompra: data.ordenes_compra || [],
          proveedores: data.proveedores || [],
          obras: data.obras || [],
          presupuestos: data.presupuestos || [],
          insumos: data.insumos || [],
          clientes: data.clientes || [],
          movimientos: data.movimientos || [],
          personal: data.personal || [],
          rubros: data.rubros || [],
          maestroTareasRubros: data.maestro_tareas_rubros || data.maestroTareasRubros || []
        });
      }
    } catch (error) {
      console.error("Error al sincronizar datos globales:", error);
    }
  };

  useEffect(() => {
    if (GOOGLE_SCRIPT_URL && user) {
      cargarDatos();
    }
  }, [user]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#070e1b] flex items-center justify-center text-white font-medium">
        Cargando sistema GI-MO...
      </div>
    );
  }

  if (!user) {
    return <Login GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route 
          path="/" 
          element={
            <Dashboard 
              movimientos={globalData.movimientos}
              facturas={globalData.facturas}
              obras={globalData.obras}
              presupuestos={globalData.presupuestos}
              clientes={globalData.clientes}
              proveedores={globalData.proveedores}
            />
          } 
        />
        
        <Route 
          path="/clientes" 
          element={
            <RequirePermiso modulo="clientes">
              <Clientes clientesIniciales={globalData.clientes} GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL} cargarDatos={cargarDatos} />
            </RequirePermiso>
          } 
        />
        
        <Route 
          path="/proveedores" 
          element={
            <RequirePermiso modulo="proveedores">
              <Proveedores proveedoresIniciales={globalData.proveedores} GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL} cargarDatos={cargarDatos} />
            </RequirePermiso>
          } 
        />

        <Route path="/obras" element={<RequirePermiso modulo="obras"><Obras /></RequirePermiso>} />
        <Route path="/insumos" element={<RequirePermiso modulo="insumos"><Insumos /></RequirePermiso>} />
        <Route path="/presupuestos" element={<RequirePermiso modulo="presupuestos"><Presupuestos /></RequirePermiso>} />
        <Route path="/presupuestos/:id" element={<PresupuestoDetalle />} />
        <Route path="/planificacion" element={<RequirePermiso modulo="planificacion"><Planificacion /></RequirePermiso>} />
        
        <Route 
          path="/rrhh" 
          element={
            <RequirePermiso modulo="rrhh">
              <Rrhh 
                GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL}
                personalInicial={globalData.personal}
                cargarDatos={cargarDatos}
              />
            </RequirePermiso>
          } 
        />
        
        <Route 
          path="/compras" 
          element={
            <RequirePermiso modulo="compras">
              <Compras 
                GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL} 
                facturas={globalData.facturas}
                ordenesCompra={globalData.ordenesCompra}
                proveedores={globalData.proveedores}
                obras={globalData.obras}
                presupuestos={globalData.presupuestos}
                insumosList={globalData.insumos}
                rubros={globalData.rubros}
                cargarDatos={cargarDatos}
              />
            </RequirePermiso>
          } 
        />

        <Route 
          path="/tesoreria" 
          element={
            <RequirePermiso modulo="tesoreria">
              <Tesoreria 
                GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL}
                movimientos={globalData.movimientos}
                facturas={globalData.facturas}
                facturasVenta={globalData.facturasVenta}
                proveedores={globalData.proveedores}
                obras={globalData.obras}
                presupuestos={globalData.presupuestos}
                clientes={globalData.clientes}
                cargarDatos={cargarDatos}
              />
            </RequirePermiso>
          } 
        />

        <Route 
          path="/reportes" 
          element={
            <RequirePermiso modulo="reportes">
              <Reportes 
                obras={globalData.obras}
                presupuestos={globalData.presupuestos}
                movimientos={globalData.movimientos}
                insumos={globalData.insumos}
                rubros={globalData.rubros}
                facturas={globalData.facturas}
                maestroTareasRubros={globalData.maestroTareasRubros}
              />
            </RequirePermiso>
          } 
        />

        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/tareas-template" element={<RequirePermiso modulo="presupuestos"><TareasTemplate /></RequirePermiso>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}