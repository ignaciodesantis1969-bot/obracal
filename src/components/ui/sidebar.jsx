import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { MODULOS } from '@/lib/permissions';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Calculator, 
  Truck, 
  ShoppingCart, 
  Banknote, 
  Shield, 
  BarChart3, 
  LogOut,
  Menu
} from 'lucide-react';

const iconos = {
  dashboard: LayoutDashboard,
  clientes: Users,
  obras: Building2,
  presupuestos: Calculator,
  proveedores: Truck,
  compras: ShoppingCart,
  tesoreria: Banknote,
  usuarios: Shield,
  reportes: BarChart3
};

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Barra lateral / Sidebar */}
      <aside className="w-64 bg-slate-900 text-white h-full p-4 flex flex-col justify-between border-r border-slate-800 hidden md:flex">
        <div>
          {/* Logo / Título */}
          <div className="mb-8 px-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-slate-900 shadow-sm">
              OC
            </div>
            <h2 className="text-xl font-bold text-amber-500 tracking-wide">ObraCal</h2>
          </div>

          {/* Navegación principal */}
          <nav className="space-y-1">
            {MODULOS.map((mod) => {
              const Icono = iconos[mod.id] || LayoutDashboard;
              const isActive = location.pathname === `/${mod.id}` || (mod.id === 'dashboard' && location.pathname === '/');

              return (
                <Link
                  key={mod.id}
                  to={`/${mod.id === 'dashboard' ? '' : mod.id}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                    isActive 
                      ? 'bg-amber-600 text-white shadow-md' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icono className="w-5 h-5" />
                  {mod.nombre}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sección de Usuario y Cierre de Sesión */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="px-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800/80">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.nombre || 'Administrador'}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@obracal.com'}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenedor principal de la página */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Cabecera para dispositivos móviles */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 md:hidden">
          <span className="font-bold text-amber-600">ObraCal</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Área donde se renderizan las vistas (Dashboard, Usuarios, etc.) */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}