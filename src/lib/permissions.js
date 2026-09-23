// src/lib/permissions.js

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULOS
// ═══════════════════════════════════════════════════════════════════════════

export const MODULOS = [
  { id: 'dashboard',                nombre: 'Dashboard',                  categoria: 'General' },
  { id: 'clientes',                 nombre: 'Clientes',                   categoria: 'Comercial' },
  { id: 'obras',                    nombre: 'Obras',                      categoria: 'Operaciones' },
  { id: 'insumos',                  nombre: 'Insumos',                    categoria: 'Operaciones' },
  { id: 'presupuestos',             nombre: 'Presupuestos',               categoria: 'Operaciones' },
  { id: 'planificacion',            nombre: 'Planificación',              categoria: 'Operaciones' },
  { id: 'contratos_mantenimiento',  nombre: 'Contratos de Mantenimiento', categoria: 'Operaciones' },
  { id: 'proveedores',              nombre: 'Proveedores',                categoria: 'Compras' },
  { id: 'compras',                  nombre: 'Compras',                    categoria: 'Compras' },
  { id: 'tesoreria',                nombre: 'Tesorería',                  categoria: 'Finanzas' },
  { id: 'usuarios',                 nombre: 'Usuarios',                   categoria: 'Administración' },
  { id: 'reportes',                 nombre: 'Reportes',                   categoria: 'Administración' }
];

// ═══════════════════════════════════════════════════════════════════════════
// MATRIZ DE PERMISOS POR ROL
// ═══════════════════════════════════════════════════════════════════════════

const ROLES_PERMISOS = {
  // 🔑 Admin — acceso total
  admin: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos', 'planificacion',
    'contratos_mantenimiento', 'proveedores', 'compras', 'tesoreria', 'usuarios', 'reportes'
  ],
  administrador: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos', 'planificacion',
    'contratos_mantenimiento', 'proveedores', 'compras', 'tesoreria', 'usuarios', 'reportes'
  ],

  // 🔑 Gestor — sin usuarios/tesorería ni planificación
  gestor: [
    'dashboard', 'clientes', 'obras', 'insumos', 'presupuestos',
    'contratos_mantenimiento', 'proveedores', 'compras', 'reportes'
  ],

  // 🔑 Finanzas — financiero/administrativo, sin planificación
  finanzas: [
    'dashboard', 'clientes', 'proveedores', 'presupuestos',
    'compras', 'tesoreria', 'contratos_mantenimiento', 'reportes'
  ],

  // 🔑 Jefe de Obra — solo sus módulos operativos con data filtrada por responsable
  jefe_obra: [
    'planificacion',
    'presupuestos',
    'insumos',
    'contratos_mantenimiento',
    'proveedores',
    'clientes',
  ],

  // Operador estándar — módulos mínimos
  operador: [
    'dashboard', 'obras', 'insumos', 'compras'
  ],

  // 🔑 Operador II — solo reportes
  operador_ii: [
    'reportes'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE ROL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza el rol del usuario a formato estándar (minúsculas, sin guiones).
 */
export function normalizarRol(user) {
  if (!user) return '';
  return String(user.role || user.rol || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

/**
 * ¿Es admin o administrador?
 */
export function esAdmin(user) {
  const rol = normalizarRol(user);
  return rol === 'admin' || rol === 'administrador';
}

/**
 * ¿Es jefe de obra?
 */
export function esJefeObra(user) {
  return normalizarRol(user) === 'jefe_obra';
}

/**
 * ¿Es admin O jefe de obra? (los roles que ven Planificación)
 */
export function puedeVerPlanificacion(user) {
  const rol = normalizarRol(user);
  return rol === 'admin' || rol === 'administrador' || rol === 'jefe_obra';
}

/**
 * Valida si el usuario tiene permiso para ver un módulo.
 */
export function tienePermiso(user, moduloId) {
  if (!user) return false;

  const rolUsuario = normalizarRol(user);

  if (rolUsuario === 'admin' || rolUsuario === 'administrador') return true;

  const modulosPermitidos = ROLES_PERMISOS[rolUsuario] || [];
  return modulosPermitidos.includes(moduloId);
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTRADO POR RESPONSABLE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filtra un array de items según el rol del usuario.
 * 
 * - Admin / Administrador → devuelve todo
 * - Jefe de Obra → solo items donde `responsable_id === user.firestoreId`
 * - Otros roles → devuelve todo (no aplica restricción acá)
 * 
 * El `user.firestoreId` es el `id` del documento en la colección `usuarios`.
 * Se carga en App.jsx cuando se hace login.
 * 
 * @param {Array} items - Array de presupuestos, planes o contratos
 * @param {Object} user - Usuario actual
 * @returns {Array} Items filtrados
 */
export function filtrarPorResponsable(items, user) {
  if (!Array.isArray(items)) return [];
  if (!user) return items;

  const rol = normalizarRol(user);

  // Admin ve todo
  if (rol === 'admin' || rol === 'administrador') return items;

  // Jefe de obra: solo donde es responsable
  if (rol === 'jefe_obra') {
    // 🔑 Usar firestoreId (id del doc de Firestore), no el uid de Auth
    const userId = String(user.firestoreId || user.id || user.uid || '');
    if (!userId) return [];

    return items.filter(item => {
      const respId = String(item.responsable_id || '');
      return respId === userId;
    });
  }

  // Otros roles: sin filtro
  return items;
}

/**
 * Filtra tareas de planificación según el rol del usuario.
 * 
 * - Admin / Administrador → devuelve todo
 * - Jefe de Obra → solo tareas de planes donde es responsable
 * - Otros roles → devuelve todo
 * 
 * @param {Array} tareas - Array de tareas
 * @param {Array} planes - Array de planes (sin filtrar, para poder ver el responsable_id)
 * @param {Object} user - Usuario actual
 * @returns {Array} Tareas filtradas
 */
export function filtrarTareasPorResponsable(tareas, planes, user) {
  if (!Array.isArray(tareas)) return [];
  if (!Array.isArray(planes)) return [];
  if (!user) return tareas;

  const rol = normalizarRol(user);
  if (rol === 'admin' || rol === 'administrador') return tareas;

  if (rol === 'jefe_obra') {
    const userId = String(user.firestoreId || user.id || user.uid || '');
    if (!userId) return [];

    // IDs de los planes donde el jefe es responsable
    const idsPlanesDelJefe = new Set(
      planes
        .filter(p => String(p.responsable_id || '') === userId)
        .map(p => String(p.id))
    );

    // Tareas que pertenecen a esos planes
    return tareas.filter(t => idsPlanesDelJefe.has(String(t.plan_id || '')));
  }

  return tareas;
}