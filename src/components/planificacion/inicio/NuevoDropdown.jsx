import React, { useState, useRef, useEffect } from 'react';
import { Plus, CheckSquare, Users, FolderKanban, ChevronDown } from 'lucide-react';

export default function NuevoDropdown({ onNuevaTarea, onNuevaReunion, onNuevoPlan }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItem = (action) => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-5 py-3 rounded-xl text-sm shadow-md transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Nuevo
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-20">
          <button
            onClick={() => handleItem(onNuevaTarea)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 text-amber-500" />
            Nueva Tarea
          </button>
          <button
            onClick={() => handleItem(onNuevaReunion)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer border-t border-slate-100"
          >
            <Users className="w-4 h-4 text-amber-500" />
            Nueva Reunión
          </button>
          <button
            onClick={() => handleItem(onNuevoPlan)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer border-t border-slate-100"
          >
            <FolderKanban className="w-4 h-4 text-amber-500" />
            Nuevo Plan de Trabajo
          </button>
        </div>
      )}
    </div>
  );
}