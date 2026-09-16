// src/hooks/useFirestoreCollection.js
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/firebase';

/**
 * Hook que lee una colección de Firestore en tiempo real.
 * 
 * Uso:
 *   const { data, loading, error } = useFirestoreCollection('presupuestos');
 * 
 * @param {string} nombreColeccion - Nombre de la colección en Firestore
 * @returns {object} { data: array, loading: boolean, error: Error|null }
 */
export function useFirestoreCollection(nombreColeccion) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!nombreColeccion) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(collection(db, nombreColeccion));

    // onSnapshot se suscribe a cambios en tiempo real
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`[useFirestoreCollection] Error en ${nombreColeccion}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup: cancelar la suscripción al desmontar
    return () => unsubscribe();
  }, [nombreColeccion]);

  return { data, loading, error };
}