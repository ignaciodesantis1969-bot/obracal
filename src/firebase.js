// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD3S4VdxIiFypVHWm1vzLCMu-DAipN29js",
  authDomain: "gi-mo-sicesa.firebaseapp.com",
  projectId: "gi-mo-sicesa",
  storageBucket: "gi-mo-sicesa.firebasestorage.app",
  messagingSenderId: "690953829177",
  appId: "1:690953829177:web:ca161bdcc8313b57cf46e8"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Servicios de Firebase
export const auth = getAuth(app);          // Authentication

// 🔑 NUEVO: Firestore con cache persistente en IndexedDB.
// Beneficios:
//   - La primera visita a cada módulo descarga del server y guarda en IndexedDB.
//   - Las siguientes visitas (incluso después de recargar la página o cerrar el navegador)
//     leen directo de IndexedDB → ~50ms en lugar de ~500ms-2s.
//   - persistentMultipleTabManager permite que varias pestañas compartan la cache.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export default app;