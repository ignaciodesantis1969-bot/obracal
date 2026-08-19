// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3S4VdxIiFypVHWm1vzLCMu-DAipN29js",
  authDomain: "gi-mo-sicesa.firebaseapp.com",
  projectId: "gi-mo-sicesa",
  storageBucket: "gi-mo-sicesa.firebasestorage.app",
  messagingSenderId: "690953829177",
  appId: "1:690953829177:web:ca161bdcc8313b57cf46e8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);