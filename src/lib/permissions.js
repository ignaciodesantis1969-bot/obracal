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
 * El nombre de esta función DEBE ser 'tienePermiso' para que el Layout no falle.
 */
export function tienePermiso(user, moduloId) {
  // Si no hay usuario, bloqueamos el acceso
  if (!user) return false;
  
  // Extraemos y normalizamos el rol a minúsculas para evitar problemas de mayúsculas/minúsculas
  const rolUsuario = String(user.role || user.rol || '').trim().toLowerCase();
  
  // El admin o administrador siempre ve todo
  if (rolUsuario === 'admin' || rolUsuario === 'administrador') return true;
  
  // Verificamos en la matriz
  const modulosPermitidos = ROLES_PERMISOS[rolUsuario] || [];
  return modulosPermitidos.includes(moduloId);
}