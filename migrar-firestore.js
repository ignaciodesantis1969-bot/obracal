// migrar-firestore.js
// Script para migrar datos de Google Sheets a Firestore.
// Correr UNA SOLA VEZ con: node migrar-firestore.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// 🔑 1) Cargar credenciales de Firebase (service account)
// Necesitás descargar el JSON de: Firebase Console → Configuración → Cuentas de servicio → Generar nueva clave privada
// Y guardarlo como `firebase-service-account.json` en la raíz del proyecto.
const serviceAccount = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));

// 2) Inicializar Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// 3) URL del backend de Apps Script (el que ya tenés)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyqytLavLRvYVusLAjKy9vXb_zLw1qKo9QhdIg6WhVnrNy6ZAZxrZayip1hXSIumyJI0w/exec';

// 4) Mapeo de tablas del Sheet → colecciones de Firestore
// 🔑 FIX: mapeo corregido según las claves reales que devuelve el backend.
const MAPEO_TABLAS = {
  // clave en el JSON del backend  →  nombre de la colección en Firestore
  'personal': 'personal',
  'presupuestos': 'presupuestos',
  'obras': 'obras',
  'clientes': 'clientes',
  'proveedores': 'proveedores',
  'contratos': 'contratos',                       // ← el backend usa 'contratos'
  'facturas': 'facturas_compras',
  'facturas_venta': 'facturas_ventas',            // ← con guión bajo
  'movimientos': 'tesoreria',                     // ← el backend usa 'movimientos'
  'insumos': 'insumos',
  'rubros': 'rubros',
  'legajos': 'legajos',
  'reportes_sice': 'reportes_diarios',            // ← con guión bajo
  'cargas_semanales': 'cargas_semanales',         // ← con guión bajo
  'certificados': 'certificados',
  'certificacioneshoras': 'certificaciones_horas',
  'ordenes_compra': 'ordenes_compra',             // ← bonus
  'maestro': 'maestro',                           // ← bonus
  'usuarios': 'usuarios'                          // ← bonus
};

// 5) Función para traer todos los datos del Sheet
async function traerDatosDelSheet() {
  console.log('📥 Trayendo datos del Sheet...');
  const res = await fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'cargarDetalleCompleto' })
  });
  const data = await res.json();
  console.log('✅ Datos traídos del Sheet');
  return data;
}

// 6) Función principal de migración
async function migrar() {
  console.log('🚀 Iniciando migración...');
  const data = await traerDatosDelSheet();

  for (const [claveSheet, nombreColeccion] of Object.entries(MAPEO_TABLAS)) {
    const items = data[claveSheet];
    if (!Array.isArray(items) || items.length === 0) {
      console.log(`⏭️  ${nombreColeccion}: sin datos, saltando.`);
      continue;
    }

    console.log(`📦 Migrando ${nombreColeccion} (${items.length} items)...`);
    let ok = 0, errores = 0;

    for (const item of items) {
      try {
        // Usar el `id` del Sheet como ID del documento (o uno aleatorio si no hay)
        const docId = String(item.id || item.ID || `auto_${Date.now()}_${Math.random()}`).replace(/\//g, '_');
        await db.collection(nombreColeccion).doc(docId).set(item);
        ok++;
      } catch (err) {
        console.error(`  ❌ Error migrando item:`, err.message);
        errores++;
      }
    }

    console.log(`  ✅ ${nombreColeccion}: ${ok} OK, ${errores} errores`);
  }

  console.log('\n🎉 Migración completa');
}

migrar().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});