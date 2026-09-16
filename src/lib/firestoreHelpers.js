// src/lib/firestoreHelpers.js
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Crea un documento nuevo con ID automático.
 * @returns {string} El ID del documento creado.
 */
export async function crearDoc(nombreColeccion, datos) {
  const ref = collection(db, nombreColeccion);
  const docRef = await addDoc(ref, {
    ...datos,
    _creadoEn: serverTimestamp(),
    _actualizadoEn: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Crea o sobreescribe un documento con ID específico.
 */
export async function crearDocConId(nombreColeccion, id, datos) {
  const ref = doc(db, nombreColeccion, String(id));
  await setDoc(ref, {
    ...datos,
    _actualizadoEn: serverTimestamp()
  }, { merge: true });
  return String(id);
}

/**
 * Actualiza un documento existente (solo los campos enviados).
 */
export async function actualizarDoc(nombreColeccion, id, datos) {
  const ref = doc(db, nombreColeccion, String(id));
  await updateDoc(ref, {
    ...datos,
    _actualizadoEn: serverTimestamp()
  });
  return String(id);
}

/**
 * Elimina un documento.
 */
export async function eliminarDoc(nombreColeccion, id) {
  const ref = doc(db, nombreColeccion, String(id));
  await deleteDoc(ref);
  return String(id);
}

/**
 * Elimina todos los documentos que cumplan con un filtro local.
 */
export async function eliminarDocsFiltrados(nombreColeccion, filtroFn) {
  const ref = collection(db, nombreColeccion);
  const snapshot = await getDocs(ref);
  const aBorrar = snapshot.docs.filter(d => filtroFn({ id: d.id, ...d.data() }));
  for (const docItem of aBorrar) {
    await deleteDoc(doc(db, nombreColeccion, docItem.id));
  }
  return aBorrar.length;
}