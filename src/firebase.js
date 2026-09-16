// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const auth = getAuth(app);          // Authentication (ya lo usabas)
export const db = getFirestore(app);       // 🔑 NUEVO: Firestore

export default app;