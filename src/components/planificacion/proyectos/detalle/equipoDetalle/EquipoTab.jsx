// src/components/planificacion/proyectos/detalle/equipo/EquipoTab.jsx
import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, AlertTriangle, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import EquipoKpis from './EquipoKpis';
import EquipoFiltros from './EquipoFiltros';
import OperarioCard from './OperarioCard';
import EquipoAlertas from './EquipoAlertas';

export default function EquipoTab({ plan, tareas = [], personal = [], insumos = [] }) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');
  const [soloConAsignaciones, setSoloConAsignaciones] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════════════════════

  // 1. Agrupar tareas por operario
  const operariosConTareas = useMemo(() => {
    const mapa = new Map();

    // Inicializar con todos los operarios activos del personal
    personal
      .filter(p => String(p.estado || '').toLowerCase() === 'activo')
      .forEach(op => {
        const opId = String(op.id || op.ID);
        mapa.set(opId, {
          id: opId,
          nombre: op.nombre || op.Nombre || 'Operario',
          especialidad: op.especialidad || op.Especialidad || 'Sin especialidad',
          costo_en_mano: Number(op.costo_en_mano) || 0,
          tareas: [],
          totalDias: 0,
          totalDiasHombre: 0,
          totalCosto: 0,
        });
      });

    // Recorrer todas las tareas y sumar recursos
    tareas.forEach(t => {
      const recursos = Array.isArray(t.recursos) ? t.recursos : [];
      const recursosOperarios = recursos.filter(r => r.tipo === 'operario');

      recursosOperarios.forEach(r => {
        const opId = String(r.id);
        if (!mapa.has(opId)) {
          // Operario asignado pero no está en personal activo (raro pero posible)
          mapa.set(opId, {
            id: opId,
            nombre: r.nombre || 'Operario externo',
            especialidad: r.especialidad || 'Sin especialidad',
            costo_en_mano: Number(r.costo_diario_base) || 0,
            tareas: [],
            totalDias: 0,
            totalDiasHombre: 0,
            totalCosto: 0,
          });
        }

        const op = mapa.get(opId);
        const duracionTarea = Number(t.duracion_real_dias) || 0;
        const diasHombre = Number(t.total_dias_hombre) || 0;
        const costoDiario = Number(r.costo_diario_con_cargas) || 0;

        op.tareas.push({
          tareaId: t.id,
          tarea_nombre: t.tarea_nombre || 'Tarea',
          rubro_nombre: t.rubro_nombre || 'Sin rubro',
          fecha_inicio: t.fecha_inicio,
          fecha_fin: t.fecha_fin,
          duracion: duracionTarea,
          diasHombre,
          costo: costoDiario * duracionTarea,
        });

        op.totalDias += duracionTarea;
        op.totalDiasHombre += diasHombre;
        op.totalCosto += costoDiario * duracionTarea;
      });
    });

    return Array.from(mapa.values());
  }, [tareas, personal]);

  // 2. Filtrar operarios según búsqueda y filtros
  const operariosFiltrados = useMemo(() => {
    return operariosConTareas.filter(op => {
      // Búsqueda por nombre o especialidad
      const busq = busqueda.toLowerCase().trim();
      if (busq) {
        const matchNombre = op.nombre.toLowerCase().includes(busq);
        const matchEspecialidad = op.especialidad.toLowerCase().includes(busq);
        if (!matchNombre && !matchEspecialidad) return false;
      }

      // Filtro por especialidad
      if (filtroEspecialidad && op.especialidad !== filtroEspecialidad) {
        return false;
      }

      // Solo con asignaciones
      if (soloConAsignaciones && op.tareas.length === 0) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Ordenar: primero con más tareas, luego por nombre
      if (a.tareas.length !== b.tareas.length) {
        return b.tareas.length - a.tareas.length;
      }
      return a.nombre.localeCompare(b.nombre);
    });
  }, [operariosConTareas, busqueda, filtroEspecialidad, soloConAsignaciones]);

  // 3. Lista de especialidades únicas (para el filtro)
  const especialidades = useMemo(() => {
    const set = new Set();
    operariosConTareas.forEach(op => {
      if (op.especialidad) set.add(op.especialidad);
    });
    return Array.from(set).sort();
  }, [operariosConTareas]);

  // 4. KPIs generales
  const kpis = useMemo(() => {
    const totalOperarios = operariosConTareas.length;
    const conAsignaciones = operariosConTareas.filter(op => op.tareas.length > 0).length;
    const sinAsignaciones = totalOperarios - conAsignaciones;
    const totalAsignaciones = operariosConTareas.reduce((acc, op) => acc + op.tareas.length, 0);

    // Detectar operarios con sobrecarga:
    // Un operario tiene sobrecarga si tiene 2+ tareas con fechas superpuestas
    const conSobrecarga = operariosConTareas.filter(op => {
      if (op.tareas.length < 2) return false;

      const ordenadas = [...op.tareas].sort((a, b) =>
        (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '')
      );

      for (let i = 0; i < ordenadas.length; i++) {
        for (let j = i + 1; j < ordenadas.length; j++) {
          const a = ordenadas[i];
          const b = ordenadas[j];
          if (!a.fecha_inicio || !a.fecha_fin || !b.fecha_inicio || !b.fecha_fin) continue;

          // Solapamiento
          const solapan = !(b.fecha_inicio > a.fecha_fin || a.fecha_inicio > b.fecha_fin);
          if (solapan) return true;
        }
      }
      return false;
    }).length;

    return {
      totalOperarios,
      conAsignaciones,
      sinAsignaciones,
      totalAsignaciones,
      conSobrecarga,
    };
  }, [operariosConTareas]);

  // 5. Generar alertas
  const alertas = useMemo(() => {
    const lista = [];

    // Operarios con sobrecarga
    operariosConTareas.forEach(op => {
      if (op.tareas.length < 2) return;

      const ordenadas = [...op.tareas].sort((a, b) =>
        (a.fecha_inicio || '').localeCompare(b.fecha_inicio || '')
      );

      const tareasEnConflicto = [];
      for (let i = 0; i < ordenadas.length; i++) {
        for (let j = i + 1; j < ordenadas.length; j++) {
          const a = ordenadas[i];
          const b = ordenadas[j];
          if (!a.fecha_inicio || !a.fecha_fin || !b.fecha_inicio || !b.fecha_fin) continue;

          const solapan = !(b.fecha_inicio > a.fecha_fin || a.fecha_inicio > b.fecha_fin);
          if (solapan && !tareasEnConflicto.includes(a.tarea_nombre)) {
            tareasEnConflicto.push(a.tarea_nombre);
          }
          if (solapan && !tareasEnConflicto.includes(b.tarea_nombre)) {
            tareasEnConflicto.push(b.tarea_nombre);
          }
        }
      }

      if (tareasEnConflicto.length > 0) {
        lista.push({
          tipo: 'sobrecarga',
          operarioId: op.id,
          operarioNombre: op.nombre,
          mensaje: `Asignado a ${tareasEnConflicto.length} tareas con fechas superpuestas`,
          detalle: tareasEnConflicto.join(', '),
        });
      }
    });

    // Tareas sin operarios asignados
    const tareasSinOperarios = tareas.filter(t => {
      const recursos = Array.isArray(t.recursos) ? t.recursos : [];
      const operarios = recursos.filter(r => r.tipo === 'operario');
      return operarios.length === 0;
    });

    if (tareasSinOperarios.length > 0) {
      lista.push({
        tipo: 'sin-asignaciones',
        mensaje: `${tareasSinOperarios.length} tarea${tareasSinOperarios.length === 1 ? '' : 's'} sin operarios asignados`,
        detalle: tareasSinOperarios.slice(0, 5).map(t => t.tarea_nombre).join(', ') +
          (tareasSinOperarios.length > 5 ? ` +${tareasSinOperarios.length - 5} más` : ''),
      });
    }

    return lista;
  }, [operariosConTareas, tareas]);

  // ═══════════════════════════════════════════════════════════════════════
  // ESTADOS VACÍOS
  // ═══════════════════════════════════════════════════════════════════════

  if (!Array.isArray(personal) || personal.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <Users className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">No hay operarios cargados</p>
        <p className="text-xs text-slate-400">
          Cargá operarios en el módulo de Recursos Humanos para verlos acá.
        </p>
      </div>
    );
  }

  const personalActivo = personal.filter(p => String(p.estado || '').toLowerCase() === 'activo');
  if (personalActivo.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
        <UserX className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-sm font-bold text-slate-500">No hay operarios activos</p>
        <p className="text-xs text-slate-400">
          Activá operarios en Recursos Humanos para verlos acá.
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">

      {/* KPIs */}
      <EquipoKpis kpis={kpis} />

      {/* Filtros */}
      <EquipoFiltros
        busqueda={busqueda}
        setBusqueda={setBusqueda}
        filtroEspecialidad={filtroEspecialidad}
        setFiltroEspecialidad={setFiltroEspecialidad}
        especialidades={especialidades}
        soloConAsignaciones={soloConAsignaciones}
        setSoloConAsignaciones={setSoloConAsignaciones}
      />

      {/* Alertas */}
      {alertas.length > 0 && (
        <EquipoAlertas alertas={alertas} />
      )}

      {/* Lista de operarios */}
      {operariosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
          <UserX className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">Sin resultados</p>
          <p className="text-xs text-slate-400">
            Probá cambiar los filtros o la búsqueda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <FolderKanban className="w-4 h-4 text-amber-500" />
            <p className="text-[11px] font-black text-slate-700 uppercase">
              Operarios ({operariosFiltrados.length})
            </p>
          </div>
          {operariosFiltrados.map(op => (
            <OperarioCard key={op.id} operario={op} />
          ))}
        </div>
      )}

    </div>
  );
}