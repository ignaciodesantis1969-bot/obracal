import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '../api';

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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla, action })
      });

      const textResponse = await response.text();
      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        console.error("El servidor no devolvió un JSON válido:", textResponse);
        setData([]);
        return;
      }

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
          const posibleArray = Object.values(result).find(val => Array.isArray(val));
          setData(posibleArray || []);
        }
      } else {
        setData([]);
      }
    } catch (err) {
      setError(err);
      console.error(`Error al cargar datos de la tabla: ${tabla}`, err);
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