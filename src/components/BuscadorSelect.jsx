// src/components/BuscadorSelect.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * BuscadorSelect — combo con búsqueda y filtrado por texto.
 *
 * Características:
 *  - Muestra TODAS las opciones al abrir (sin filtro).
 *  - Filtra a partir de `minChars` (default 3).
 *  - Ordena alfabéticamente las opciones automáticamente.
 *  - Click afuera cierra el dropdown.
 *  - Enter selecciona la primera coincidencia.
 *  - Soporta `opciones` como array de strings o array de { id, label }.
 */
export default function BuscadorSelect({
  opciones = [],
  value = '',
  onChange,
  placeholder = 'Seleccionar...',
  minChars = 3,
  disabled = false,
  className = '',
  mostrarBotonLimpiar = true,
}) {
  const [abierto, setAbierto] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalizar opciones a [{ id, label }]
  const opcionesNormalizadas = useMemo(() => {
    return (opciones || []).map((op, idx) => {
      if (typeof op === 'string') {
        return { id: op, label: op };
      }
      return {
        id: op.id !== undefined ? op.id : idx,
        label: op.label || op.nombre || op.razon_social || `Opción ${idx + 1}`
      };
    });
  }, [opciones]);

  // 🔑 Ordenar alfabéticamente
  const opcionesOrdenadas = useMemo(() => {
    return [...opcionesNormalizadas].sort((a, b) =>
      String(a.label).localeCompare(String(b.label), 'es', { sensitivity: 'base' })
    );
  }, [opcionesNormalizadas]);

  // 🔑 Opción seleccionada actualmente
  const opcionSeleccionada = useMemo(() => {
    return opcionesOrdenadas.find(op => String(op.id) === String(value));
  }, [opcionesOrdenadas, value]);

  // 🔑 Filtro: si escribió minChars o más → filtra, sino muestra todas
  const opcionesFiltradas = useMemo(() => {
    const texto = textoBusqueda.trim().toLowerCase();
    if (texto.length < minChars) return opcionesOrdenadas;
    return opcionesOrdenadas.filter(op =>
      String(op.label).toLowerCase().includes(texto)
    );
  }, [opcionesOrdenadas, textoBusqueda, minChars]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    if (!abierto) return;
    const handleClickFuera = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAbierto(false);
        setTextoBusqueda('');
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [abierto]);

  // Autofocus al abrir
  useEffect(() => {
    if (abierto && inputRef.current) {
      inputRef.current.focus();
    }
  }, [abierto]);

  const handleSeleccionar = (op) => {
    if (onChange) onChange(op.id);
    setAbierto(false);
    setTextoBusqueda('');
  };

  const handleLimpiar = (e) => {
    e.stopPropagation();
    if (onChange) onChange('');
    setTextoBusqueda('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && opcionesFiltradas.length > 0) {
      e.preventDefault();
      handleSeleccionar(opcionesFiltradas[0]);
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setTextoBusqueda('');
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setAbierto(!abierto)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm
          text-left outline-none transition-colors
          ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'hover:border-amber-400 focus:border-amber-500 cursor-pointer'}
        `}
      >
        <span className={`truncate ${opcionSeleccionada ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
          {opcionSeleccionada ? opcionSeleccionada.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {opcionSeleccionada && mostrarBotonLimpiar && !disabled && (
            <span
              onClick={handleLimpiar}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {abierto && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden">
          {/* Buscador */}
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={textoBusqueda}
                onChange={(e) => setTextoBusqueda(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Escribí ${minChars}+ letras para filtrar...`}
                className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs outline-none focus:border-amber-500"
              />
            </div>
            {textoBusqueda.trim().length > 0 && textoBusqueda.trim().length < minChars && (
              <p className="text-[10px] text-slate-400 mt-1 pl-1">
                Escribí {minChars - textoBusqueda.trim().length} letra{minChars - textoBusqueda.trim().length === 1 ? '' : 's'} más para filtrar
              </p>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-60 overflow-y-auto">
            {opcionesFiltradas.length === 0 ? (
              <div className="p-3 text-xs text-slate-400 text-center italic">
                No se encontraron coincidencias.
              </div>
            ) : (
              opcionesFiltradas.map((op) => {
                const esSeleccionada = String(op.id) === String(value);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleSeleccionar(op)}
                    className={`
                      w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2
                      ${esSeleccionada ? 'bg-amber-50 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                  >
                    <span className="truncate">{op.label}</span>
                    {esSeleccionada && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer con contador */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400">
            {opcionesFiltradas.length} de {opcionesOrdenadas.length} opciones
          </div>
        </div>
      )}
    </div>
  );
}