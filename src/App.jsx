import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
// 🔑 NUEVO: para leer el rol del usuario desde Firestore
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// Layout y Auth
import Layout from '@/components/Layout';
import RequirePermiso from '@/components/RequirePermiso';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Pages con Lazy Loading
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
const Reportes = lazy(() => import('@/pages/ReportesPage'));
const Usuarios = lazy(() => import('@/pages/Usuarios'));
const TareasTemplate = lazy(() => import('@/pages/TareasTemplate'));
const ContratosMantenimiento = lazy(() => import('@/pages/ContratosMantenimiento'));

// 🔑 NUEVO: lee el perfil (nombre + rol) del usuario desde Firestore.
// Si falla o no existe, devuelve null y se usa el fallback.
const cargarPerfilUsuario = async (emailFirebase) => {
  try {
    const emailLimpio = String(emailFirebase || '').trim().toLowerCase();
    if (!emailLimpio) return null;

    const ref = collection(db, 'usuarios');
    const q = query(ref, where('email', '==', emailLimpio));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: intentar match case-insensitive sobre todos los usuarios
      // (por si el email se guardó con mayúsculas)
      const snapshotTodos = await getDocs(ref);
      const match = snapshotTodos.docs.find(d => {
        const dEmail = String(d.data()?.email || '').trim().toLowerCase();
        return dEmail === emailLimpio;
      });
      if (match) {
        const data = match.data();
        return {
          nombre: data?.nombre || data?.Nombre || null,
          role: data?.role || data?.rol || null,
        };
      }
      return null;
    }

    const doc0 = snapshot.docs[0];
    const data = doc0.data();
    return {
      nombre: data?.nombre || data?.Nombre || null,
      role: data?.role || data?.rol || null,
    };
  } catch (error) {
    console.error('[App] Error al leer perfil de Firestore:', error);
    return null;
  }
};

const AuthenticatedApp = () => {
  const { user, setUser } = useAuth();
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let rolFinal = 'operador';
        let nombreFinal = firebaseUser.email.split('@')[0];
        const emailFirebase = String(firebaseUser.email || '').trim().toLowerCase();

        // 🔑 Resguardo directo para correos principales (evita la lectura a Firestore
        // y garantiza que siempre entren como admin/operador_ii)
        if (emailFirebase === 'ignaciodesantis@sicesa.com.ar') {
          rolFinal = 'admin';
        } else if (emailFirebase === 'roldangerman033@gmail.com') {
          rolFinal = 'operador_ii';
        }

        // 🔑 Leer el perfil desde Firestore (nombre + rol)
        const perfil = await cargarPerfilUsuario(emailFirebase);

        if (perfil) {
          if (perfil.nombre) nombreFinal = perfil.nombre;
          // El resguardo directo tiene prioridad sobre lo que dice Firestore
          if (perfil.role && emailFirebase !== 'ignaciodesantis@sicesa.com.ar' && emailFirebase !== 'roldangerman033@gmail.com') {
            rolFinal = String(perfil.role).toLowerCase().trim();
          }
        }

        setUser({
          ...firebaseUser,
          nombre: nombreFinal,
          role: rolFinal,
          rol: rolFinal
        });
      } else {
        setUser(null);
      }
      setLoadingSession(false);
    });

    return () => unsubscribe();
  }, [setUser]);

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
        <Login onLoginSuccess={(userData) => setUser(userData)} />
      </Suspense>
    );
  }

  // Normalización estricta de roles
  const userRole = String(user.role || user.rol || '').toLowerCase().trim().replace(/-/g, '_');
  const esOperadorEstandar = userRole === 'operador' || userRole === 'operator';
  const esOperadorII = userRole === 'operador_ii' || userRole === 'operadorii' || userRole === 'operador2' || userRole === 'operador ii';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070e1b] flex items-center justify-center text-white font-medium">
        Cargando módulo...
      </div>
    }>
      <Routes>
        <Route element={<Layout />}>
          {/* 1. Operador Estándar: Solo partes diarios */}
          {esOperadorEstandar ? (
            <Route
              path="*"
              element={
                <Reportes
                  currentUser={user}
                  userRole={userRole}
                  esOperador={true}
                  esOperadorII={false}
                />
              }
            />
          ) : esOperadorII ? (
            /* 2. Operador II: Menú de reportes e insumos sin dashboard */
            <>
              <Route path="/" element={<Navigate to="/reportes" replace />} />
              <Route
                path="/reportes"
                element={
                  <Reportes
                    currentUser={user}
                    userRole={userRole}
                    esOperador={false}
                    esOperadorII={true}
                  />
                }
              />
              <Route
                path="/insumos"
                element={
                  <RequirePermiso modulo="insumos">
                    <Insumos />
                  </RequirePermiso>
                }
              />
              <Route path="*" element={<Navigate to="/reportes" replace />} />
            </>
          ) : (
            /* 3. Administradores: Acceso total al sistema */
            <>
              <Route
                path="/"
                element={
                  <Dashboard />
                }
              />
              <Route
                path="/clientes"
                element={
                  <RequirePermiso modulo="clientes">
                    <Clientes />
                  </RequirePermiso>
                }
              />
              <Route
                path="/proveedores"
                element={
                  <RequirePermiso modulo="proveedores">
                    <Proveedores />
                  </RequirePermiso>
                }
              />
              <Route path="/obras" element={<RequirePermiso modulo="obras"><Obras /></RequirePermiso>} />
              <Route
                path="/insumos"
                element={
                  <RequirePermiso modulo="insumos">
                    <Insumos />
                  </RequirePermiso>
                }
              />
              <Route path="/presupuestos" element={<RequirePermiso modulo="presupuestos"><Presupuestos /></RequirePermiso>} />
              <Route path="/presupuestos/:id" element={<PresupuestoDetalle />} />
              <Route path="/planificacion" element={<RequirePermiso modulo="planificacion"><Planificacion /></RequirePermiso>} />
              <Route
                path="/rrhh"
                element={
                  <RequirePermiso modulo="rrhh">
                    <Rrhh />
                  </RequirePermiso>
                }
              />
              <Route
                path="/compras"
                element={
                  <RequirePermiso modulo="compras">
                    <Compras />
                  </RequirePermiso>
                }
              />
              <Route
                path="/tesoreria"
                element={
                  <RequirePermiso modulo="tesoreria">
                    <Tesoreria />
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
                    esOperadorII={false}
                  />
                }
              />
              <Route
                path="/contratos-mantenimiento"
                element={
                  <RequirePermiso modulo="contratos_mantenimiento">
                    <ContratosMantenimiento />
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