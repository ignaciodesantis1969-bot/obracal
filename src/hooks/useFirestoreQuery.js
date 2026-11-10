import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase'; // Ajustá la ruta si tu firebase.js está en otro lado

export function useFirestoreQuery(collectionName, constraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const collRef = collection(db, collectionName);
    
    // Si hay filtros (where, orderBy, limit), armamos la query. Si no, traemos todo.
    const q = constraints.length > 0 ? query(collRef, ...constraints) : collRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error(`Error en useFirestoreQuery (${collectionName}):`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, constraints]); // ⚠️ Importante: constraints debe ser estable

  return { data, loading, error };
}