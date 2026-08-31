// Definición de módulos y categorías para ObrasManager
export const MODULOS = [
  { id: 'dashboard', nombre: 'Dashboard', categoria: 'General' },
  { id: 'clientes', nombre: 'Clientes', categoria: 'Comercial' },
  { id: 'obras', nombre: 'Obras', categoria: 'Operaciones' },
  { id: 'insumos', nombre: 'Insumos', categoria: 'Operaciones' },
  { id: 'presupuestos', nombre: 'Presupuestos', categoria: 'Operaciones' },
  { id: 'planificacion', nombre: 'Planificación', categoria: 'Operaciones' },
  { id: 'contratos_mantenimiento', nombre: 'Contratos de Mantenimiento', categoria: 'Operaciones' },
  { id: 'proveedores', nombre: 'Proveedores', categoria: 'Compras' },
  { id: 'compras', nombre: 'Compras', categoria: 'Compras' },
  { id: 'tesoreria', nombre: 'Tesorería', categoria: 'Finanzas' },
  { id: 'usuarios', nombre: 'Usuarios', categoria: 'Administración' },
  { id: 'reportes', nombre: 'Reportes', categoria: 'Administración' }
];

// Matriz de permisos por rol
const ROLES_PERMISOS = {
  admin: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos', 'planificacion',
    'contratos_mantenimiento', 'proveedores', 'compras', 'tesoreria', 'usuarios', 'reportes'
  ],
  administrador: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos', 'planificacion',
    'contratos_mantenimiento', 'proveedores', 'compras', 'tesoreria', 'usuarios', 'reportes'
  ],
  gestor: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos', 'planificacion',
    'contratos_mantenimiento', 'proveedores', 'compras', 'reportes'
  ],
  operador: [
    'dashboard', 'obras', 'insumos', 'compras'
  ]
};

/**
 * Valida si el usuario tiene permiso para ver un módulo.
 */
export function tienePermiso(user, moduloId) {
  if (!user) return false;
  
  const rolUsuario = String(user.role || user.rol || '').trim().toLowerCase();
  
  if (rolUsuario === 'admin' || rolUsuario === 'administrador') return true;
  
  const modulosPermitidos = ROLES_PERMISOS[rolUsuario] || [];
  return modulosPermitidos.includes(moduloId);
}