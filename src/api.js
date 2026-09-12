// src/config/api.js
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxqqvLFvzJFvxslgkSYcVst7t9axM5THTvw-b7V0ltGa1vemmwvB-2aTidQRpCVhC_RVg/exec";

export const OBRAS_CONFIG = {
  // Categorización de empleados extraída de la lógica de negocio
  determinarCategoriaEmpleado: (nombre) => {
    if (!nombre) return 'OE';
    return nombre.toLowerCase().includes('callapiña') ? 'S' : 'OE';
  },
  
  // Nombres de tablas en Google Sheets
  TABLAS: {
    REPORTES_SICE: 'ReportesDiariosSice',
    INSUMOS: 'Insumos',
    CONTRATOS: 'ContratosMantenimiento',
    USUARIOS: 'Usuarios' // <-- Agregado aquí para que el sistema lo consulte correctamente
  }
};