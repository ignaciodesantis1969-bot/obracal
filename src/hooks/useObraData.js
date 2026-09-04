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
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ tabla, action })
      });
      const result = await response.json();
      if (Array.isArray(result)) {
        setData(result);
      }
    } catch (err) {
      setError(err);
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