import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { GOOGLE_SCRIPT_URL } from '../api';

// 🔑 Cache helper: guarda y lee del sessionStorage
const guardarCache = (key, data) => {
  try {
    if (Array.isArray(data) && data.length > 0) {
      sessionStorage.setItem(`obraData:${key}`, JSON.stringify({
        data,
        ts: Date.now()
      }));
    }
  } catch (e) {}
};

const leerCache = (key) => {
  try {
    const raw = sessionStorage.getItem(`obraData:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache válida por 30 minutos
    if (Date.now() - parsed.ts < 30 * 60 * 1000) {
      return parsed.data;
    }
  } catch (e) {}
  return null;
};

const fetchObraData = async (tabla, action) => {
  const cacheKey = `${tabla}:${action}`;
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla, action })
    });

    // 🔑 Detectar respuesta HTML (error de Google) en vez de JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('json') && response.status !== 200) {
      console.warn(`[useObraData] Respuesta no-JSON para ${tabla}. Status: ${response.status}`);
      // Intentar usar cache
      const cached = leerCache(cacheKey);
      if (cached && cached.length > 0) {
        console.info(`[useObraData] Usando cache de ${tabla} por fallo del backend`);
        return cached;
      }
      return [];
    }

    const textResponse = await response.text();
    let result;
    try {
      result = JSON.parse(textResponse);
    } catch (e) {
      console.warn(`[useObraData] JSON inválido para ${tabla}. Usando cache si existe.`);
      // Fallback a cache
      const cached = leerCache(cacheKey);
      if (cached && cached.length > 0) return cached;
      return [];
    }

    let arrayFinal = [];
    if (Array.isArray(result)) {
      arrayFinal = result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.data)) arrayFinal = result.data;
      else if (Array.isArray(result.items)) arrayFinal = result.items;
      else if (Array.isArray(result.result)) arrayFinal = result.result;
      else {
        const posibleArray = Object.values(result).find(val => Array.isArray(val));
        arrayFinal = posibleArray || [];
      }
    }

    // 🔑 Guardar en cache si obtuvimos datos válidos
    if (arrayFinal.length > 0) {
      guardarCache(cacheKey, arrayFinal);
    }

    return arrayFinal;
  } catch (err) {
    console.error(`[useObraData] Error de fetch para ${tabla}:`, err);
    const cached = leerCache(cacheKey);
    if (cached && cached.length > 0) return cached;
    return [];
  }
};

export const useObraData = (tabla, action = 'get') => {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: ['obraData', tabla, action],
    queryFn: () => fetchObraData(tabla, action),
    enabled: !!tabla,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 3000,
    // 🔑 Cache inicial desde sessionStorage para render instantáneo
    initialData: () => leerCache(`${tabla}:${action}`) || undefined,
  });

  useEffect(() => {
    if (error) {
      console.error(`Error al cargar datos de la tabla: ${tabla}`, error);
      // Solo mostrar toast si NO tenemos cache disponible
      const cached = leerCache(`${tabla}:${action}`);
      if (!cached || cached.length === 0) {
        toast.error(`Error al cargar datos de la tabla: ${tabla}`);
      }
    }
  }, [error, tabla, action]);

  return { data, isLoading, error, refetch };
};