// src/hooks/useObraData.js
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';

/**
 * 🔑 MIGRACIÓN A FIRESTORE
 * -------------------------
 * Este hook antes hacía fetch a Google Apps Script con React Query.
 * Ahora lee directo de Firestore con useFirestoreCollection (onSnapshot).
 *
 * Se mantiene la MISMA interfaz pública para no tocar los 6 subcomponentes
 * de Reportes ni ningún otro archivo que lo use:
 *
 *   const { data, isLoading, error, refetch } = useObraData('NombreDeTabla');
 *
 * `refetch` ya no hace nada real (Firestore es en vivo), pero se devuelve
 * una función no-op para que el código que lo llama no explote.
 */

// Mapeo: nombre de "tabla" en Sheets/Apps Script → nombre de colección en Firestore
const MAPA_TABLAS_A_COLECCIONES = {
  // Contratos / Mantenimiento
  'ContratosMantenimiento': 'contratos',
  'Contratos': 'contratos',
  'contratos_mantenimiento': 'contratos',
  'contratosMantenimiento': 'contratos',

  // Reportes diarios
  'ReportesDiariosSice': 'reportes_diarios',
  'ReportesSice': 'reportes_diarios',
  'ReportesDiarios': 'reportes_diarios',

  // Tesorería / movimientos
  'Tesoreria': 'tesoreria',
  'MovimientosTesoreria': 'tesoreria',

  // Certificados (avance de obra)
  'Certificados': 'certificados',
  'CertificadosEmitidos': 'certificados',

  // Certificaciones de horas (contratos)
  'CertificacionesHoras': 'certificaciones_horas',
  'Certificaciones_horas': 'certificaciones_horas',

  // Personal / RRHH
  'Personal': 'personal',
  'Legajos': 'legajos',
  'CargasSemanales': 'cargas_semanales',
  'Cargas_semanales': 'cargas_semanales',

  // Maestros
  'Insumos': 'insumos',
  'Proveedores': 'proveedores',
  'Clientes': 'clientes',
  'Obras': 'obras',
  'Presupuestos': 'presupuestos',
  'Rubros': 'rubros',
  'MaestroTareasRubros': 'maestro',
  'Maestro': 'maestro',
  'TareasTemplate': 'maestro',

  // Compras / ventas
  'Facturas': 'facturas_compras',
  'FacturasCompras': 'facturas_compras',
  'FacturasVenta': 'facturas_ventas',
  'Facturas_venta': 'facturas_ventas',
  'OrdenesCompra': 'ordenes_compra',
  'Ordenes_compra': 'ordenes_compra',

  // Usuarios
  'Usuarios': 'usuarios',
  'Usuario': 'usuarios',
};

function resolverColeccion(tabla) {
  if (!tabla) return null;
  const tablaStr = String(tabla).trim();
  if (!tablaStr) return null;

  if (MAPA_TABLAS_A_COLECCIONES[tablaStr]) {
    return MAPA_TABLAS_A_COLECCIONES[tablaStr];
  }

  const tablaLower = tablaStr.toLowerCase();
  for (const [key, value] of Object.entries(MAPA_TABLAS_A_COLECCIONES)) {
    if (key.toLowerCase() === tablaLower) {
      return value;
    }
  }

  return tablaLower;
}

export const useObraData = (tabla, action = 'get') => {
  const coleccion = resolverColeccion(tabla);
  const coleccionValida = coleccion && String(coleccion).trim() ? String(coleccion).trim() : '';

  // El hook de Firestore ya maneja '' devolviendo { data: [], loading: false, error: null }
  const { data: firestoreData, loading, error: firestoreError } = useFirestoreCollection(coleccionValida);

  const data = Array.isArray(firestoreData) ? firestoreData : [];

  // refetch no-op: Firestore ya está en vivo
  const refetch = async () => data;

  if (process.env.NODE_ENV === 'development' && !coleccionValida) {
    console.warn(`[useObraData] No se pudo resolver colección para tabla: ${tabla}`);
  }

  return {
    data,
    isLoading: loading,
    error: firestoreError || null,
    refetch,
  };
};

export default useObraData;