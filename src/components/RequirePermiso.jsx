import { useAuth } from '@/hooks/useAuth';
import { tienePermiso } from '@/lib/permissions';
import { ShieldOff } from 'lucide-react';

export default function RequirePermiso({ modulo, children }) {
  const { user } = useAuth();

  if (!user) return null;

  // Usuario deshabilitado
  if (user.activo === false) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <ShieldOff className="w-12 h-12" />
        <p className="text-lg font-medium">Cuenta deshabilitada</p>
        <p className="text-sm">Tu cuenta fue deshabilitada. Contactá al administrador.</p>
      </div>
    );
  }

  // Validación de permisos del módulo
  if (modulo && !tienePermiso(user, modulo)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <ShieldOff className="w-12 h-12" />
        <p className="text-lg font-medium">Acceso Restringido</p>
        <p className="text-sm">No tenés permisos para acceder a este módulo.</p>
      </div>
    );
  }

  return children;
}