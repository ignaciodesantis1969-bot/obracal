import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { GOOGLE_SCRIPT_URL } from '@/api';

// Layout y Auth
import Layout from '@/components/Layout';
import RequirePermiso from '@/components/RequirePermiso';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Pages con Lazy Loading para optimizar el rendimiento inicial
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Clientes = lazy(() => import('@/pages/Clientes'));
const Proveedores = lazy(() => import('@/pages/Proveedores'));
const Obras = lazy(() => import('@/pages/Obras'));
const Insumos = lazy(() => import('@/pages/Insumos'));
const Presupuestos = lazy(() => import('@/pages/Presupuestos'));
const PresupuestoDetalle = lazy(() => import('@/pages/PresupuestoDetalle'));
const Planificacion = lazy(() => import('@/pages/Planificacion'));
const Rrhh = lazy(() => import('@/pages/Rrhh'));
const Compras = lazy(() => import('@/pages/Compras'));
const Tesoreria = lazy(() => import('@/pages/Tesoreria'));
const Reportes = lazy(() => import('@/pages/Reportes'));
const Usuarios = lazy(() => import('@/pages/Usuarios'));
const TareasTemplate = lazy(() => import('@/pages/TareasTemplate'));
const ContratosMantenimiento = lazy(() => import('@/pages/ContratosMantenimiento'));

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
    maestroTareasRubros: [],
    legajos: [],
    contratosMantenimiento: [],
    certificados: []
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
            
            // SEGURIDAD: Si el usuario existe en la tabla, tomamos su rol. Si no existe o hay error, cae en un rol seguro y restringido ('operador').
            const rawRol = userInfo?.role || userInfo?.rol || userInfo?.Role || '';
            const rolFinal = rawRol ? String(rawRol).toLowerCase().trim() : 'operador';

            setUser({
              ...firebaseUser,
              nombre: nombreFinal,
              role: rolFinal,
              rol: rolFinal
            });
          } else {
            // Si la API falla al devolver un array, por seguridad asignamos el rol más restrictivo
            setUser({
              ...firebaseUser,
              nombre: firebaseUser.email.split('@')[0],
              role: 'operador',
              rol: 'operador'
            });
          }
        } catch (error) {
          console.error("Error al obtener perfil del usuario:", error);
          setUser({
            ...firebaseUser,
            nombre: firebaseUser.email.split('@')[0],
            role: 'operador',
            rol: 'operador'
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
          maestroTareasRubros: data.maestro_tareas_rubros || data.maestroTareasRubros || [],
          legajos: data.legajos || [],
          contratosMantenimiento: data.contratos_mantenimiento || data.contratosMantenimiento || [],
          certificados: data.certificados || data.certificados_emitidos || [],
          cargasSemanales: data.cargas_semanales || data.cargasSemanales || data.CargasSemanales || [] 
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

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#070e1b] flex items-center justify-center text-white font-medium">
        Cargando sistema GI-MO...
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#070e1b] flex items-center justify-center text-white">Cargando login...</div>}>
        <Login GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL} onLoginSuccess={(userData) => setUser(userData)} />
      </Suspense>
    );
  }

  // Verificamos estrictamente los roles
  const userRole = String(user.role || user.rol || '').toLowerCase().trim();
  
  // Operador estándar (restringido a partes diarios)
  const esOperadorEstandar = userRole === 'operador' || userRole === 'operator';
  
  // Operador II (menú completo con solapas especiales en reportes)
  const esOperadorII = userRole === 'operador_ii' || userRole === 'operadorii' || userRole === 'operador2' || userRole === 'operador ii';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070e1b] flex items-center justify-center text-white font-medium">
        Cargando módulo...
      </div>
    }>
      <Routes>
        <Route element={<Layout />}>
          {esOperadorEstandar ? (
            <Route 
              path="*" 
              element={
                <Reportes 
                  currentUser={user}
                  userRole={userRole}
                  esOperador={true}
                  esOperadorII={false}
                  obras={globalData.obras}
                  presupuestos={globalData.presupuestos}
                  movimientos={globalData.movimientos}
                  insumos={globalData.insumos}
                  rubros={globalData.rubros}
                  facturas={globalData.facturas}
                  maestroTareasRubros={globalData.maestroTareasRubros}
                  contratosMantenimiento={globalData.contratosMantenimiento}
                  certificados={globalData.certificados}
                />
              } 
            />
          ) : (
            <>
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
                      insumos={globalData.insumos}
                      obras={globalData.obras}
                      rubros={globalData.rubros}
                      presupuestos={globalData.presupuestos}
                      contratosMantenimiento={globalData.contratosMantenimiento}
                      legajosIniciales={globalData.legajos}
                      cargasHorasIniciales={globalData.cargasSemanales}
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
                      contratosList={globalData.contratosMantenimiento}
                      contratos={globalData.contratosMantenimiento}
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
                  <Reportes 
                    currentUser={user}
                    userRole={userRole}
                    esOperador={false}
                    esOperadorII={esOperadorII} 
                    obras={globalData.obras}
                    presupuestos={globalData.presupuestos}
                    movimientos={globalData.movimientos}
                    insumos={globalData.insumos}
                    rubros={globalData.rubros}
                    facturas={globalData.facturas}
                    maestroTareasRubros={globalData.maestroTareasRubros}
                    contratosMantenimiento={globalData.contratosMantenimiento}
                    certificados={globalData.certificados}
                    setFetchedCertificados={cargarDatos}
                  />
                } 
              />

              <Route 
                path="/contratos-mantenimiento" 
                element={
                  <RequirePermiso modulo="contratos_mantenimiento">
                    <ContratosMantenimiento 
                      GOOGLE_SCRIPT_URL={GOOGLE_SCRIPT_URL}
                      contratos={globalData.contratosMantenimiento}
                      proveedores={globalData.proveedores}
                      obras={globalData.obras}
                      cargarDatos={cargarDatos}
                    />
                  </RequirePermiso>
                } 
              />

              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/tareas-template" element={<RequirePermiso modulo="presupuestos"><TareasTemplate /></RequirePermiso>} />
            </>
          )}
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
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