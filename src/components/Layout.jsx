import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, Building2,
  Calculator, CalendarDays, ShoppingCart, Wallet,
  BarChart3, ChevronLeft, ChevronRight, Menu,
  ClipboardList, UserCog, LogOut, BookOpen, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { tienePermiso } from '@/lib/permissions';

import logoSidebar from '@/assets/LogoSolo.png';

import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/', key: null },
  { icon: Users, label: 'Clientes', path: '/clientes', key: 'clientes' },
  { icon: Truck, label: 'Proveedores', path: '/proveedores', key: 'proveedores' },
  { icon: Building2, label: 'Obras', path: '/obras', key: 'obras' },
  { icon: ClipboardList, label: 'Insumos', path: '/insumos', key: 'insumos' },
  { icon: BookOpen, label: 'Maestro de Tareas', path: '/tareas-template', key: 'presupuestos' },
  { icon: Calculator, label: 'Presupuestos', path: '/presupuestos', key: 'presupuestos' },
  { icon: ShieldCheck, label: 'Contratos de Mantenimiento', path: '/contratos-mantenimiento', key: 'contratos_mantenimiento' },
  { icon: Users, label: 'Recursos Humanos', path: '/rrhh', key: 'rrhh' },
  { icon: ShoppingCart, label: 'Compras', path: '/compras', key: 'compras' },
  { icon: Wallet, label: 'Tesorería', path: '/tesoreria', key: 'tesoreria' },
  { icon: BarChart3, label: 'Control y Reportes', path: '/reportes', key: 'reportes' },
  { icon: CalendarDays, label: 'Planificación', path: '/planificacion', key: 'planificacion' },
];

// 🔑 FIX: SidebarContent ahora es un componente ESTABLE, declarado FUERA del Layout.
function SidebarContent({
  collapsed,
  setMobileOpen,
  navItems,
  location,
  user,
  rolUsuario,
  esOperadorEstandar,
  esOperadorII,
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-white p-1 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={logoSidebar} alt="Logo Solo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight tracking-wide">GI-MO</p>
            <p className="text-slate-400 text-xs">Gestión Integral</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-150 group',
                active
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Ocultamos Usuarios si es operador */}
      {!esOperadorEstandar && !esOperadorII && (
        <div className="px-2 pb-1">
          <Link
            to="/usuarios"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150',
              location.pathname === '/usuarios'
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
            )}
          >
            <UserCog className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Usuarios</span>}
          </Link>
        </div>
      )}

      <div className="p-3 border-t border-slate-700 space-y-2">
        {!collapsed && (
          <div className="px-2 py-2 bg-slate-900/50 rounded-lg">
            <p className="text-white text-sm font-bold truncate">{user?.nombre || user?.email}</p>
            <p className="text-amber-500 text-xs font-medium truncate uppercase tracking-wide">
              {esOperadorII ? 'OPERADOR II' : (esOperadorEstandar ? 'OPERADOR' : ((rolUsuario === 'admin' || rolUsuario === 'administrador') ? 'ADMINISTRADOR' : (user?.role || user?.rol || 'USUARIO')))}
            </p>
          </div>
        )}

        <button
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const { user } = useAuth();

  const rawRoleValue = user?.role || user?.rol || user?.reloadUserInfo?.rol || user?.reloadUserInfo?.role || '';
  const rolUsuario = String(rawRoleValue).trim().toLowerCase().replace(/-/g, '_');

  const esOperadorEstandar = rolUsuario === 'operador' || rolUsuario === 'operator';
  const esOperadorII = rolUsuario === 'operador_ii' || rolUsuario === 'operadorii' || rolUsuario === 'operador2' || rolUsuario === 'operador ii' || rolUsuario.includes('operador_ii');

  // 🔑 El caso "!user" lo maneja App.jsx (muestra el <Login />).
  // Acá simplemente no renderizamos nada.
  if (!user) {
    return null;
  }

  const navItems = (esOperadorEstandar || esOperadorII)
    ? allNavItems.filter(item => item.path === '/reportes')
    : allNavItems.filter(item => item.key === null || tienePermiso(user, item.key));

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className={cn(
        'hidden lg:flex flex-col bg-slate-800 transition-all duration-300 relative flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent
          collapsed={collapsed}
          setMobileOpen={setMobileOpen}
          navItems={navItems}
          location={location}
          user={user}
          rolUsuario={rolUsuario}
          esOperadorEstandar={esOperadorEstandar}
          esOperadorII={esOperadorII}
        />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-md z-10 cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-800 flex flex-col">
            <SidebarContent
              collapsed={collapsed}
              setMobileOpen={setMobileOpen}
              navItems={navItems}
              location={location}
              user={user}
              rolUsuario={rolUsuario}
              esOperadorEstandar={esOperadorEstandar}
              esOperadorII={esOperadorII}
            />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="text-slate-600 cursor-pointer">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white p-0.5 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={logoSidebar} alt="Logo Solo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 text-sm tracking-wide">GI-MO</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}