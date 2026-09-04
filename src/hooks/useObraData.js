import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '../api'; // Ajusta la ruta si es necesario (puede ser '@/api')

export const useObraData = (tabla, action = 'get') => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!tabla) return;
    setIsLoading(true);
    try {
      // CORRECCIÓN CRÍTICA: Se añaden los headers de texto plano requeridos por Google Apps Script
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla, action })
      });
      
      const result = await response.json();

      // Procesador universal para extraer el array sin importar cómo venga envuelto
      if (Array.isArray(result)) {
        setData(result);
      } else if (result && typeof result === 'object') {
        if (Array.isArray(result.data)) {
          setData(result.data);
        } else if (Array.isArray(result.items)) {
          setData(result.items);
        } else if (Array.isArray(result.result)) {
          setData(result.result);
        } else {
          // Busca el primer valor que sea un array dentro del objeto de respuesta
          const posibleArray = Object.values(result).find(val => Array.isArray(val));
          if (posibleArray) {
            setData(posibleArray);
          } else {
            setData([]);
          }
        }
      } else {
        setData([]);
      }
    } catch (err) {
      setError(err);
      console.error(`Error al cargar datos de la tabla ${tabla}:`, err);
      toast.error(`Error al cargar datos de la tabla: ${tabla}`);
    } finally {
      setIsLoading(false);
    }
  }, [tabla, action]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, setData, isLoading, error, refetch: fetchData };
};