import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Truck, Building2,
  Calculator, CalendarDays, ShoppingCart, Wallet, 
  BarChart3, ChevronLeft, ChevronRight, Menu,
  ClipboardList, UserCog, LogOut, BookOpen, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { tienePermiso } from '@/lib/permissions';

import logoSidebar from '@/assets/LogoSolo.png';
import logoLogin from '@/assets/LogoSICESA.jpg';

import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

const allNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard',         path: '/',                    key: null },
  { icon: Users,           label: 'Clientes',          path: '/clientes',            key: 'clientes' },
  { icon: Truck,           label: 'Proveedores',       path: '/proveedores',         key: 'proveedores' },
  { icon: Building2,       label: 'Obras',             path: '/obras',               key: 'obras' },
  { icon: ClipboardList,   label: 'Insumos',           path: '/insumos',             key: 'insumos' },
  { icon: BookOpen,        label: 'Maestro de Tareas', path: '/tareas-template',     key: 'presupuestos' },
  { icon: Calculator,      label: 'Presupuestos',      path: '/presupuestos',        key: 'presupuestos' },
  { icon: CalendarDays,    label: 'Planificación',     path: '/planificacion',       key: 'planificacion' },
  { icon: Users,           label: 'Recursos Humanos',  path: '/rrhh',                key: 'rrhh' },
  { icon: ShoppingCart,    label: 'Compras',           path: '/compras',             key: 'compras' },
  { icon: Wallet,          label: 'Tesorería',         path: '/tesoreria',           key: 'tesoreria' },
  { icon: BarChart3,       label: 'Control y Reportes', path: '/reportes',           key: 'reportes' },
  { icon: ShieldCheck,     label: 'Contratos de Mantenimiento', path: '/contratos-mantenimiento', key: 'contratos_mantenimiento' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState('');

  const location = useLocation();
  const { user, logout, login } = useAuth();

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

  if (!user) {
    const handleLogin = async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMensaje('');

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ 
            tabla: 'Usuarios', 
            action: 'login', 
            data: { email: loginEmail, password: loginPassword } 
          })
        });
        
        const rawText = await response.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch (err) {
          throw new Error("Respuesta no válida de Google. Revisa el despliegue del script.");
        }

        if (data.success) {
          login({ 
            id: Date.now().toString(), 
            nombre: data.user.nombre,
            email: data.user.email, 
            role: data.user.role || data.user.rol || 'gestor', 
            rol: data.user.role || data.user.rol || 'gestor' 
          });
        } else {
          setErrorMensaje(data.message || data.error || 'Credenciales incorrectas');
        }
      } catch (error) {
        console.error("Error conectando con Google Sheets:", error);
        setErrorMensaje(error.message || 'Error de conexión con la planilla.');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#070e1b] text-white p-4">
        <div className="w-24 h-24 bg-white p-2.5 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-amber-500/20 overflow-hidden">
          <img src={logoLogin} alt="SICE S.A. Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-black tracking-widest mb-1">GI-MO</h1>
        <p className="text-slate-400 text-xs tracking-wider mb-8">Gestión Integral de Obras</p>
        
        <form onSubmit={handleLogin} className="bg-[#0f1932] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-1">Iniciar sesión</h2>
          <p className="text-slate-400 text-sm mb-6">Ingresa tus credenciales para acceder al sistema.</p>
          
          {errorMensaje && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center">
              {errorMensaje}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo electrónico</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-[#162242] border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                placeholder="ejemplo@correo.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-[#162242] border border-slate-700/60 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold py-3 rounded-xl transition-colors mt-2 text-sm shadow-lg cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </div>
        </form>
        <p className="text-slate-500 text-xs mt-6">v1.0.0 © 2026 ObrasManager</p>
      </div>
    );
  }

  const navItems = allNavItems.filter(item => item.key === null || tienePermiso(user, item.key));

  const SidebarContent = () => (
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

      {(user?.role === 'admin' || user?.rol === 'admin' || true) && (
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
              {(user?.role === 'admin' || user?.rol === 'admin') ? 'Administrador' : (user?.role || user?.rol || 'Usuario')}
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

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className={cn(
        'hidden lg:flex flex-col bg-slate-800 transition-all duration-300 relative flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
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
            <SidebarContent />
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