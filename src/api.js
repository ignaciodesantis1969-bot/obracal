// src/config/api.js
export const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxrmSw-MnqFj39m1XDYHtixpKPmmDTbumI1SWfCoNYNX-kmWWiieOL0gzJevaJVsGq9dQ/exec";

export const OBRAS_CONFIG = {
  determinarCategoriaEmpleado: (nombre) => {
    if (!nombre) return 'OE';
    return nombre.toLowerCase().includes('callapiña') ? 'S' : 'OE';
  },
  
  TABLAS: {
    REPORTES_SICE: 'ReportesDiariosSice',
    INSUMOS: 'Insumos',
    CONTRATOS: 'ContratosMantenimiento',
    USUARIOS: 'Usuarios',
    // 🔑 Agregadas para evitar fallbacks implícitos
    TESORERIA: 'Tesoreria',
    CARGAS_SEMANALES: 'CargasSemanales',
    CERTIFICACIONES_HORAS: 'CertificacionesHoras',
    CERTIFICADOS: 'Certificados',
    PRESUPUESTOS: 'Presupuestos',
    OBRAS: 'Obras',
    PERSONAL: 'Personal',
    PROVEEDORES: 'Proveedores',
    CLIENTES: 'Clientes'
  }
};