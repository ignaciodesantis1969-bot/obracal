import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '../api';

const fetchObraData = async (tabla, action) => {
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
    return [];
  }

  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    if (Array.isArray(result.data)) return result.data;
    if (Array.isArray(result.items)) return result.items;
    if (Array.isArray(result.result)) return result.result;
    const posibleArray = Object.values(result).find(val => Array.isArray(val));
    return posibleArray || [];
  }
  return [];
};

export const useObraData = (tabla, action = 'get') => {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['obraData', tabla, action],
    queryFn: () => fetchObraData(tabla, action),
    enabled: !!tabla,
    staleTime: 1000 * 60 * 5, // Caché fresca por 5 minutos para evitar peticiones innecesarias
  });

  useEffect(() => {
    if (error) {
      console.error(`Error al cargar datos de la tabla: ${tabla}`, error);
      toast.error(`Error al cargar datos de la tabla: ${tabla}`);
    }
  }, [error, tabla]);

  return { data, isLoading, error, refetch };
};