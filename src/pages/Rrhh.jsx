import React, { useState } from 'react';
import { Users, Plus, Search, Trash2, Edit2, X, Calculator, DollarSign, ArrowLeft, UserPlus, RefreshCw, Calendar, Building, CheckCircle2, ShieldCheck, PieChart } from 'lucide-react';

export default function Rrhh({ GOOGLE_SCRIPT_URL, personalInicial = [], insumos = [], obras = [], cargarDatos }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'legajos' | 'salarios' | 'carga'
  const [searchTerm, setSearchTerm] = useState('');

  // Función auxiliar para limpiar y formatear correctamente los números y textos de Google Sheets
  const procesarPersonalInicial = (lista) => {
    if (!Array.isArray(lista)) return [];
    return lista.map(p => {
      let costoCrudo = p.costo_en_mano || p.Costo_en_mano || p.salario || 0;
      if (typeof costoCrudo === 'string') {
        costoCrudo = costoCrudo.replace(/[$ARS\s.]/g, '').replace(',', '.');
      }

      let mesCrudo = p.mes_acuerdo || p.Mes_acuerdo || 'Agosto 2026';
      if (typeof mesCrudo === 'string' && (mesCrudo.includes('T') || mesCrudo.includes('-01T'))) {
        mesCrudo = 'Agosto 2026';
      }

      return {
        ...p,
        costo_en_mano: Number(costoCrudo) || 0,
        mes_acuerdo: mesCrudo
      };
    });
  };

  // Estado local para los salarios y datos del personal
  const [personalSalarios, setPersonalSalarios] = useState(procesarPersonalInicial(personalInicial));

  const [multiplicadorParitaria, setMultiplicadorParitaria] = useState('');
  const [mesAcuerdoGlobal, setMesAcuerdoGlobal] = useState('Agosto 2026');

  // Estados para la gestión y edición de Cuadrillas
  const [vistaCuadrilla, setVistaCuadrilla] = useState('lista'); // 'lista' | 'editor'
  const [cuadrillaIdEditando, setCuadrillaIdEditando] = useState(null);
  const [nombreCuadrilla, setNombreCuadrilla] = useState('CUADRILLA LDC ZARATE - PROMEDIO ESTABLE');
  const [porcentajeCargas, setPorcentajeCargas] = useState(76.00);
  const [cuadrillaItems, setCuadrillaItems] = useState([]);
  const [viaticosCuadrilla, setViaticosCuadrilla] = useState({ cantidad: 1, costo: 0 });

  // ESTADOS PARA LA CARGA SEMANAL DE HORAS / VIÁTICOS Y CARGAS SOCIALES
  const [obraSeleccionadaCarga, setObraSeleccionadaCarga] = useState('');
  const [fechaCarga, setFechaCarga] = useState(new Date().toISOString().split('T')[0]);
  const [porcentajeCargasSociales, setPorcentajeCargasSociales] = useState(76.00);
  const [detalleCargaPersonal, setDetalleCargaPersonal] = useState([]);

  // Estado para la distribución por Rubros del Presupuesto
  const [distribucionRubros, setDistribucionRubros] = useState([
    { id: 1, rubro: 'Mano de Obra Estructura / Albañilería', porcentaje: 100 }
  ]);

  // Sincronizar salarios y asegurar que la carga no se sobrescriba si el usuario ya está tipeando
  React.useEffect(() => {
    if (Array.isArray(personalInicial) && personalInicial.length > 0) {
      const procesados = procesarPersonalInicial(personalInicial);
      setPersonalSalarios(procesados);
      
      setDetalleCargaPersonal(prev => {
        if (prev.length > 0) {
          return prev.map(item => {
            const match = procesados.find(p => String(p.id || p.ID) === String(item.id));
            return match ? { ...item, costoDiario: Number(match.costo_en_mano || 0) } : item;
          });
        }
        return procesados.map(p => ({
          id: p.id || p.ID || Math.random(),
          nombre: p.nombre || p.Nombre || 'Personal',
          especialidad: p.especialidad || p.Especialidad || 'Operario',
          dias: 5,
          costoDiario: Number(p.costo_en_mano || 0),
          viaticosCant: 5,
          viaticosCosto: 0,
          incluirCargas: true
        }));
      });
    }
  }, [personalInicial]);

  // Filtrar insumos que actúan como cuadrillas / mano de obra compuesta
  const cuadrillasGuardadas = Array.isArray(insumos) 
    ? insumos.filter(i => {
        const tipo = String(i.tipo || i.Tipo || '').toLowerCase();
        const nombre = String(i.nombre || i.nombre_del_articulo || '').toLowerCase();
        return tipo.includes('mano') || nombre.includes('cuadrilla');
      })
    : [];

  // Modal Nuevo / Editar Personal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    cuil: '',
    especialidad: '',
    telefono: '',
    email: '',
    direccion: '',
    costo_en_mano: 0,
    mes_acuerdo: 'Agosto 2026'
  });

  const handleOpenModal = (persona = null) => {
    if (persona) {
      setEditingId(persona.id || persona.ID);
      setFormData({
        nombre: persona.nombre || persona.Nombre || '',
        cuil: persona.cuil || persona.Cuil || persona.CUIL || '',
        especialidad: persona.especialidad || persona.Especialidad || '',
        telefono: persona.telefono || persona.Telefono || '',
        email: persona.email || persona.Email || '',
        direccion: persona.direccion || persona.Direccion || '',
        costo_en_mano: Number(persona.costo_en_mano || persona.Costo_en_mano || persona.salario || 0),
        mes_acuerdo: persona.mes_acuerdo || persona.Mes_acuerdo || 'Agosto 2026'
      });
    } else {
      setEditingId(null);
      setFormData({ nombre: '', cuil: '', especialidad: '', telefono: '', email: '', direccion: '', costo_en_mano: 0, mes_acuerdo: 'Agosto 2026' });
    }
    setIsModalOpen(true);
  };

  const handleGuardarPersonal = async (e) => {
    e.preventDefault();
    try {
      const action = editingId ? 'update' : 'create';
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Personal', action, id: editingId, data: formData })
      });
      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        setIsModalOpen(false);
        cargarDatos();
      } else {
        alert("Error al guardar personal.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEliminarPersonal = async (id) => {
    if (!id || !window.confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Personal', action: 'delete', id })
      });
      cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  // Modificación manual individual de costo o mes en la tabla de salarios y persistencia en Google Sheets
  const handleActualizarPersonalFila = async (id, campo, valor) => {
    setPersonalSalarios(prev => prev.map(p => {
      const pId = p.id || p.ID;
      if (String(pId) === String(id)) {
        return { ...p, [campo]: valor };
      }
      return p;
    }));

    const personaActual = personalSalarios.find(p => String(p.id || p.ID) === String(id));
    if (personaActual) {
      const datosActualizados = { ...personaActual, [campo]: valor };
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Personal', action: 'update', id: id, data: datosActualizados })
        });
      } catch (err) {
        console.error("Error al actualizar en servidor:", err);
      }
    }
  };

  // Aplicar multiplicador de paritaria y mes a todo el personal y guardarlo
  const handleAplicarParitariaMasiva = async () => {
    const mult = Number(multiplicadorParitaria);
    if (!mult || mult <= 0) {
      alert("Ingresa un multiplicador válido (ej: 1.05 para un 5% de aumento).");
      return;
    }

    const nuevosSalarios = personalSalarios.map(p => ({
      ...p,
      costo_en_mano: Math.round((Number(p.costo_en_mano) || 0) * mult * 100) / 100,
      mes_acuerdo: mesAcuerdoGlobal
    }));

    setPersonalSalarios(nuevosSalarios);

    try {
      for (let p of nuevosSalarios) {
        const pId = p.id || p.ID;
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ tabla: 'Personal', action: 'update', id: pId, data: p })
        });
      }
      alert("¡Paritaria y salarios actualizados y guardados correctamente para todo el personal!");
      cargarDatos();
    } catch (err) {
      console.error("Error al guardar paritaria masiva:", err);
      alert("Hubo un error al sincronizar con la base de datos.");
    }
  };

  // Agregar trabajador de la lista superior a la cuadrilla activa
  const handleAgregarPersonalAQuadrilla = (persona) => {
    const nombre = persona.nombre || persona.Nombre || 'Personal';
    const especialidad = persona.especialidad || persona.Especialidad || 'Operario';
    const categoriaTexto = `${especialidad.toUpperCase()} - ${nombre.toUpperCase()}`;
    const costoBase = Number(persona.costo_en_mano || 0);

    const nuevoItem = {
      id: Date.now() + Math.random(),
      categoria: categoriaTexto,
      cantidad: 1,
      costoEnMano: costoBase
    };

    setCuadrillaItems(prev => [...prev, nuevoItem]);
  };

  // Cálculos dinámicos de la cuadrilla actual en el editor
  const factorCargas = porcentajeCargas / 100;
  const itemsCalculados = cuadrillaItems.map(item => {
    const costoEnMano = Number(item.costoEnMano) || 0;
    const cargasSocialesUnitarias = costoEnMano * factorCargas;
    const subtotalUnitario = costoEnMano + cargasSocialesUnitarias;
    const subtotalTotal = subtotalUnitario * (Number(item.cantidad) || 0);
    return { ...item, cargasSocialesUnitarias, subtotalUnitario, subtotalTotal };
  });

  const sumaSubtotalesPersonal = itemsCalculados.reduce((acc, item) => acc + item.subtotalTotal, 0);
  const totalViaticos = (Number(viaticosCuadrilla.cantidad) || 0) * (Number(viaticosCuadrilla.costo) || 0);
  const costoDiarioCuadrilla = sumaSubtotalesPersonal + totalViaticos;

  // Guardar o Actualizar Cuadrilla como Insumo en el Maestro
  const handleGuardarCuadrillaComoInsumo = async () => {
    if (!nombreCuadrilla.trim()) {
      alert("Por favor ingresa un nombre para la cuadrilla.");
      return;
    }

    try {
      const payloadInsumo = {
        nombre_del_articulo: nombreCuadrilla,
        nombre: nombreCuadrilla,
        tipo: 'Mano de Obra',
        costo_unitario: costoDiarioCuadrilla,
        costo: costoDiarioCuadrilla,
        unidad: 'día',
        descripcion: JSON.stringify({
          porcentajeCargas,
          items: cuadrillaItems,
          viaticos: viaticosCuadrilla
        })
      };

      const action = cuadrillaIdEditando ? 'update' : 'create';
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Insumos',
          action: action,
          id: cuadrillaIdEditando,
          data: payloadInsumo
        })
      });

      const data = await res.json().catch(() => ({ success: true }));
      if (data.success !== false) {
        alert("¡Cuadrilla guardada e impactada en el Maestro de Insumos con éxito!");
        cargarDatos();
        setVistaCuadrilla('lista');
      } else {
        alert("Error al guardar la cuadrilla en Insumos.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar la cuadrilla.");
    }
  };

  const handleEditarCuadrilla = (cuadrillaIns) => {
    const cId = cuadrillaIns.id || cuadrillaIns.ID;
    const cNombre = cuadrillaIns.nombre_del_articulo || cuadrillaIns.nombre || '';
    setCuadrillaIdEditando(cId);
    setNombreCuadrilla(cNombre);

    try {
      const descParsed = JSON.parse(cuadrillaIns.descripcion || '{}');
      if (descParsed.porcentajeCargas !== undefined) setPorcentajeCargas(descParsed.porcentajeCargas);
      if (Array.isArray(descParsed.items)) setCuadrillaItems(descParsed.items);
      if (descParsed.viaticos) setViaticosCuadrilla(descParsed.viaticos);
    } catch {
      // Si la descripción es texto plano
    }

    setVistaCuadrilla('editor');
  };

  const handleNuevaCuadrilla = () => {
    setCuadrillaIdEditando(null);
    setNombreCuadrilla('NUEVA CUADRILLA');
    setPorcentajeCargas(76.00);
    setCuadrillaItems([]);
    setViaticosCuadrilla({ cantidad: 1, costo: 0 });
    setVistaCuadrilla('editor');
  };

  const handleEliminarCuadrilla = async (cId) => {
    if (!cId || !window.confirm("¿Estás seguro de eliminar esta cuadrilla del maestro de insumos?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Insumos', action: 'delete', id: cId })
      });
      cargarDatos();
    } catch (err) {
      console.error(err);
    }
  };

  // CÁLCULOS Y ACCIONES PARA LA CARGA SEMANAL DE SUELDOS / VIÁTICOS Y CARGAS SOCIALES
  const detalleCargaCalculado = detalleCargaPersonal.map(item => {
    const diasVal = item.dias === '' || isNaN(item.dias) ? 0 : Number(item.dias);
    const viatCantVal = item.viaticosCant === '' || isNaN(item.viaticosCant) ? 0 : Number(item.viaticosCant);
    const viatCostVal = item.viaticosCosto === '' || isNaN(item.viaticosCosto) ? 0 : Number(item.viaticosCosto);

    const subtotalJornales = diasVal * (Number(item.costoDiario) || 0);
    const subtotalViaticos = viatCantVal * viatCostVal;
    const totalOperario = subtotalJornales + subtotalViaticos;
    return { ...item, subtotalJornales, subtotalViaticos, totalOperario };
  });

  const totalGeneralCarga = detalleCargaCalculado.reduce((acc, curr) => acc + curr.totalOperario, 0);

  // Cálculo de Cargas Sociales (siempre calculado por 5 días para los empleados tildados)
  const factorCargasSociales = (Number(porcentajeCargasSociales) || 0) / 100;
  const totalCargasSociales = detalleCargaCalculado.reduce((acc, item) => {
    if (!item.incluirCargas) return acc;
    const costoDiario = Number(item.costoDiario) || 0;
    const cargasEmpleado = (costoDiario * 5) * factorCargasSociales;
    return acc + cargasEmpleado;
  }, 0);

  // Funciones para manejar la distribución por rubros
  const handleAgregarRubroDistribucion = () => {
    setDistribucionRubros(prev => [...prev, { id: Date.now(), rubro: '', porcentaje: 0 }]);
  };

  const handleActualizarRubro = (id, campo, valor) => {
    setDistribucionRubros(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  };

  const handleEliminarRubro = (id) => {
    if (distribucionRubros.length <= 1) {
      alert("Debe haber al menos un rubro de distribución.");
      return;
    }
    setDistribucionRubros(prev => prev.filter(r => r.id !== id));
  };

  const sumaPorcentajesRubros = distribucionRubros.reduce((acc, r) => acc + (Number(r.porcentaje) || 0), 0);

  const validarDistribucionRubros = () => {
    if (!obraSeleccionadaCarga) {
      alert("Por favor selecciona una Obra.");
      return false;
    }
    if (Math.abs(sumaPorcentajesRubros - 100) > 0.01) {
      alert(`La suma de los porcentajes de los rubros debe ser 100%. Actualmente suma ${sumaPorcentajesRubros}%.`);
      return false;
    }
    for (let r of distribucionRubros) {
      if (!r.rubro.trim()) {
        alert("Todos los rubros deben tener un nombre o descripción.");
        return false;
      }
    }
    return true;
  };

  const handleGuardarCargaSalarial = async () => {
    if (!validarDistribucionRubros()) return;

    if (totalGeneralCarga <= 0) {
      alert("El total de la carga es $0. Verifica los días o jornales ingresados.");
      return;
    }

    try {
      // Registrar un movimiento en Tesorería por cada rubro según su porcentaje
      for (let r of distribucionRubros) {
        const pct = Number(r.porcentaje) || 0;
        if (pct <= 0) continue;
        const montoRubro = Math.round((totalGeneralCarga * (pct / 100)) * 100) / 100;

        const payloadTesoreria = {
          tipo: 'Egreso',
          fecha: fechaCarga,
          concepto: `Sueldos y Viáticos - Obra: ${obraSeleccionadaCarga} [Rubro: ${r.rubro} - ${pct}%]`,
          monto: montoRubro,
          medio_pago: 'transferencia',
          referencia: 'RRHH'
        };

        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            tabla: 'Tesoreria',
            action: 'create',
            data: payloadTesoreria
          })
        });
      }

      alert("¡Carga de sueldos registrada e imputada por rubros en Tesorería con éxito!");
      cargarDatos();
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar la carga salarial.");
    }
  };

  const handleRegistrarCargasSociales = async () => {
    if (!validarDistribucionRubros()) return;

    if (totalCargasSociales <= 0) {
      alert("El total de cargas sociales es $0. Tilda al menos un operario.");
      return;
    }

    try {
      // Registrar un movimiento en Tesorería por cada rubro según su porcentaje
      for (let r of distribucionRubros) {
        const pct = Number(r.porcentaje) || 0;
        if (pct <= 0) continue;
        const montoRubro = Math.round((totalCargasSociales * (pct / 100)) * 100) / 100;

        const payloadTesoreria = {
          tipo: 'Egreso',
          fecha: fechaCarga,
          concepto: `Cargas Sociales (${porcentajeCargasSociales}%) - Obra: ${obraSeleccionadaCarga} [Rubro: ${r.rubro} - ${pct}%]`,
          monto: montoRubro,
          medio_pago: 'transferencia',
          referencia: 'RRHH - Cargas Sociales'
        };

        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            tabla: 'Tesoreria',
            action: 'create',
            data: payloadTesoreria
          })
        });
      }

      alert("¡Cargas sociales registradas e imputadas por rubros en Tesorería con éxito!");
      cargarDatos();
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar las cargas sociales.");
    }
  };

  const personalFiltrado = personalSalarios.filter(p => {
    const nombre = String(p.nombre || p.Nombre || '').toLowerCase();
    const cuil = String(p.cuil || p.Cuil || p.CUIL || '').toLowerCase();
    const especialidad = String(p.especialidad || p.Especialidad || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    return nombre.includes(query) || cuil.includes(query) || especialidad.includes(query);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Recursos Humanos</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de personal, salarios por paritarias y armado de cuadrillas</p>
        </div>
        {activeTab === 'personal' && (
          <button 
            onClick={() => handleOpenModal()} 
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nuevo Personal
          </button>
        )}
      </div>

      {/* Botones de pestañas */}
      <div className="flex gap-2 flex-wrap pb-2">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'personal' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Lista de Personal
        </button>
        <button
          onClick={() => setActiveTab('legajos')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'legajos' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Legajos
        </button>
        <button
          onClick={() => { setActiveTab('salarios'); setVistaCuadrilla('lista'); }}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'salarios' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Salarios y Cuadrillas
        </button>
        <button
          onClick={() => setActiveTab('carga')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            activeTab === 'carga' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          Carga Semanal de Horas / Viáticos
        </button>
      </div>

      {/* Contenido: Lista de Personal */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar por nombre, CUIL o especialidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            {personalFiltrado.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                <Users className="w-10 h-10 text-slate-300" />
                <span>No hay personal registrado.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-4 py-4">CUIL</th>
                    <th className="px-4 py-4">Especialidad</th>
                    <th className="px-4 py-4">Teléfono</th>
                    <th className="px-4 py-4">Dirección</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personalFiltrado.map((p, index) => {
                    const pId = p.id || p.ID;
                    return (
                      <tr key={pId || index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{p.nombre || p.Nombre || '---'}</td>
                        <td className="px-4 py-4 font-mono text-slate-600">{p.cuil || p.Cuil || p.CUIL || '---'}</td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-bold text-[10px]">
                            {p.especialidad || p.Especialidad || 'General'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{p.telefono || p.Telefono || '---'}</td>
                        <td className="px-4 py-4 text-slate-600">{p.direccion || p.Direccion || '---'}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEliminarPersonal(pId)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Contenido: Salarios y Cuadrillas */}
      {activeTab === 'salarios' && (
        <div className="space-y-6">
          {vistaCuadrilla === 'lista' ? (
            <div className="space-y-6">
              {/* PANEL SUPERIOR: MAESTRO DE SALARIOS Y PARITARIAS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase">Salarios Acordados por Personal (Base Vigente)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Modifica manualmente cada salario/mes o aplica un multiplicador general por paritaria.</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                    <span className="text-xs font-bold text-amber-900">Mes Paritaria:</span>
                    <input 
                      type="text" placeholder="Ej: Septiembre 2026"
                      value={mesAcuerdoGlobal}
                      onChange={(e) => setMesAcuerdoGlobal(e.target.value)}
                      className="w-32 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-amber-900 outline-none focus:border-amber-500 shadow-sm"
                    />
                    <span className="text-xs font-bold text-amber-900 ml-2">Multiplicador:</span>
                    <input 
                      type="number" step="0.001" placeholder="Ej: 1.05"
                      value={multiplicadorParitaria}
                      onChange={(e) => setMultiplicadorParitaria(e.target.value)}
                      className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-amber-900 text-center outline-none focus:border-amber-500 shadow-sm"
                    />
                    <button 
                      onClick={handleAplicarParitariaMasiva}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Aplicar a Todos
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0">
                      <tr>
                        <th className="px-4 py-3">Trabajador</th>
                        <th className="px-4 py-3">Especialidad</th>
                        <th className="px-4 py-3 text-right">Costo en Mano Diario ($)</th>
                        <th className="px-4 py-3">Mes de Acuerdo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {personalSalarios.map((p, idx) => {
                        const pId = p.id || p.ID || idx;
                        return (
                          <tr key={pId} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{p.nombre || p.Nombre}</td>
                            <td className="px-4 py-2.5 text-slate-600">{p.especialidad || p.Especialidad || 'General'}</td>
                            <td className="px-4 py-2.5 text-right">
                              <input 
                                type="number" step="0.01"
                                value={p.costo_en_mano}
                                onChange={(e) => handleActualizarPersonalFila(pId, 'costo_en_mano', Number(e.target.value))}
                                className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-blue-600 text-right outline-none focus:border-amber-500"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input 
                                type="text"
                                value={p.mes_acuerdo}
                                onChange={(e) => handleActualizarPersonalFila(pId, 'mes_acuerdo', e.target.value)}
                                className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* LISTADO DE CUADRILLAS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">Listado de Cuadrillas (Insumos de Mano de Obra)</h3>
                  <p className="text-xs text-slate-500 mt-1">Las cuadrillas creadas conservan el costo acordado en su momento de creación.</p>
                </div>
                <button 
                  onClick={handleNuevaCuadrilla}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Nueva Cuadrilla
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
                {cuadrillasGuardadas.length === 0 ? (
                  <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <Users className="w-10 h-10 text-slate-300" />
                    <span>No hay cuadrillas configuradas. Crea la primera para usarla en presupuestos.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                        <th className="px-6 py-4">Nombre de Cuadrilla (Insumo)</th>
                        <th className="px-4 py-4">Tipo</th>
                        <th className="px-4 py-4 text-right">Costo Diario ($)</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cuadrillasGuardadas.map((c, idx) => {
                        const cId = c.id || c.ID;
                        const cNombre = c.nombre_del_articulo || c.nombre || 'Sin nombre';
                        const cCosto = Number(c.costo_unitario || c.costo || 0);
                        return (
                          <tr key={cId || idx} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-bold text-slate-900">{cNombre}</td>
                            <td className="px-4 py-4">
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] uppercase">
                                Mano de Obra
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-black text-blue-600">
                              $ {cCosto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button onClick={() => handleEditarCuadrilla(c)} className="p-1.5 text-slate-400 hover:text-amber-600 bg-white border rounded shadow-sm cursor-pointer" title="Modificar"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleEliminarCuadrilla(cId)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b">
                <button 
                  onClick={() => setVistaCuadrilla('lista')}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver al listado
                </button>
                <button 
                  onClick={handleGuardarCuadrillaComoInsumo}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  {cuadrillaIdEditando ? 'Actualizar Cuadrilla e Insumo' : 'Guardar y Crear Insumo'}
                </button>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full max-w-md">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre de la Cuadrilla (Insumo)</label>
                  <input 
                    type="text" 
                    value={nombreCuadrilla} 
                    onChange={(e) => setNombreCuadrilla(e.target.value)}
                    className="text-lg font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-amber-500 w-full"
                  />
                </div>
                
                <div className="flex items-center gap-3 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-900">Cargas Sociales (%):</span>
                  <input 
                    type="number" step="0.01"
                    value={porcentajeCargas}
                    onChange={(e) => setPorcentajeCargas(Number(e.target.value) || 0)}
                    className="w-20 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-amber-900 text-center outline-none focus:border-amber-500 shadow-sm"
                  />
                </div>
              </div>

              {/* SECCIÓN: Listado de Personal para Agregar con un Clic */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Personal Disponible (Hacer clic en "Agregar" para sumar con el salario vigente)</h4>
                  <span className="text-[11px] text-slate-500">{personalSalarios.length} trabajadores registrados</span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Nombre</th>
                        <th className="px-4 py-2.5">Especialidad</th>
                        <th className="px-4 py-2.5 text-right">Sueldo Vigente ($)</th>
                        <th className="px-4 py-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {personalSalarios.map((p, pIdx) => (
                        <tr key={p.id || p.ID || pIdx} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-bold text-slate-900">{p.nombre || p.Nombre}</td>
                          <td className="px-4 py-2 text-slate-600">{p.especialidad || p.Especialidad || 'General'}</td>
                          <td className="px-4 py-2 text-right font-black text-blue-600">
                            $ {Number(p.costo_en_mano || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleAgregarPersonalAQuadrilla(p)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <UserPlus className="w-3 h-3" /> Agregar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA DE LA CUADRILLA */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <th className="px-4 py-3">Categoría / Rol / Personal</th>
                      <th className="px-4 py-3 text-center">Cantidad (Activa)</th>
                      <th className="px-4 py-3 text-right">Costo En Mano ($)</th>
                      <th className="px-4 py-3 text-right">Cargas Sociales ($)</th>
                      <th className="px-4 py-3 text-right">Sub-Total / Día ($)</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsCalculados.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">
                          <input 
                            type="text" 
                            value={item.categoria}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCuadrillaItems(prev => prev.map(i => i.id === item.id ? { ...i, categoria: val } : i));
                            }}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-amber-500 outline-none w-full font-bold"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="number" min="0" max="10"
                            value={item.cantidad}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCuadrillaItems(prev => prev.map(i => i.id === item.id ? { ...i, cantidad: val } : i));
                            }}
                            className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number" step="0.01"
                            value={item.costoEnMano}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCuadrillaItems(prev => prev.map(i => i.id === item.id ? { ...i, costoEnMano: val } : i));
                            }}
                            className="w-32 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-right outline-none focus:border-amber-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          $ {item.cargasSocialesUnitarias.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          $ {item.subtotalTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setCuadrillaItems(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer" title="Quitar trabajador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-amber-50/40 font-semibold">
                      <td className="px-4 py-3 text-amber-900 uppercase font-extrabold" colSpan={2}>
                        VIÁTICOS (Cantidad y Costo Diario)
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" min="0" 
                          value={viaticosCuadrilla.cantidad}
                          onChange={(e) => setViaticosCuadrilla({ ...viaticosCuadrilla, cantidad: Number(e.target.value) })}
                          className="w-16 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input 
                          type="number" step="0.01"
                          value={viaticosCuadrilla.costo}
                          onChange={(e) => setViaticosCuadrilla({ ...viaticosCuadrilla, costo: Number(e.target.value) })}
                          className="w-40 bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-semibold text-right outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-amber-900" colSpan={2}>
                        $ {totalViaticos.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">Costo resultante para insumo compuesto</p>
                  <h4 className="text-lg font-black">{nombreCuadrilla}</h4>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase font-bold block">COSTO DIARIO CUADRILLA</span>
                  <span className="text-2xl font-black text-amber-400">
                    $ {costoDiarioCuadrilla.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'legajos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-8 text-center text-slate-400 text-xs">
          Módulo de Legajos en desarrollo.
        </div>
      )}
      
      {/* MÓDULO ACTIVO: CARGA SEMANAL DE HORAS / VIÁTICOS Y CARGAS SOCIALES */}
      {activeTab === 'carga' && (
        <div className="space-y-6">
          {/* Card: Selección de Obra, Fecha y Distribución por Rubros del Presupuesto */}
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Configuración de Imputación</h3>
                <p className="text-xs text-slate-500 mt-0.5">Selecciona la obra, la fecha y define qué porcentaje del gasto se imputará a cada rubro del presupuesto.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-amber-600" /> Seleccionar Obra de Destino *
                </label>
                <select 
                  value={obraSeleccionadaCarga}
                  onChange={(e) => setObraSeleccionadaCarga(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                >
                  <option value="">-- Seleccione una Obra --</option>
                  {Array.isArray(obras) && obras.map((o, oIdx) => {
                    const nombreObra = o.nombre || o.Nombre || o.nombre_de_la_obra || `Obra #${oId}`;
                    const oId = o.id || o.ID || oIdx;
                    return <option key={oId} value={nombreObra}>{nombreObra}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Fecha de Liquidación / Parte *
                </label>
                <input 
                  type="date"
                  value={fechaCarga}
                  onChange={(e) => setFechaCarga(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Distribución por Rubros */}
            <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-amber-900 uppercase flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-amber-600" /> Distribución por Rubros del Presupuesto (Suma total debe ser 100%)
                </h4>
                <button
                  type="button"
                  onClick={handleAgregarRubroDistribucion}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar Rubro
                </button>
              </div>

              <div className="space-y-2">
                {distribucionRubros.map((r, idx) => (
                  <div key={r.id || idx} className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder="Nombre del rubro (ej: Estructura, Albañilería, Terminaciones...)"
                      value={r.rubro}
                      onChange={(e) => handleActualizarRubro(r.id, 'rubro', e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-1 w-32">
                      <input 
                        type="number" min="0" max="100" step="0.1"
                        value={r.porcentaje}
                        onChange={(e) => handleActualizarRubro(r.id, 'porcentaje', Number(e.target.value))}
                        className="w-20 bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-black text-center outline-none focus:border-amber-500"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleEliminarRubro(r.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer bg-white border border-slate-200 rounded-lg shadow-sm"
                      title="Quitar rubro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="font-bold text-slate-600">Total asignado:</span>
                <span className={`font-black ${Math.abs(sumaPorcentajesRubros - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  {sumaPorcentajesRubros}% {Math.abs(sumaPorcentajesRubros - 100) > 0.01 && '(Debe sumar 100%)'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Principal: Carga de Sueldos y Viáticos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Carga Semanal de Horas / Días y Viáticos por Obra</h3>
                <p className="text-xs text-slate-500 mt-0.5">Registra la asistencia real y viáticos del personal para imputarlo a los rubros y tesorería.</p>
              </div>
              
              <button 
                onClick={handleGuardarCargaSalarial}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Registrar Carga de Sueldos ($ {totalGeneralCarga.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
              </button>
            </div>

            {/* Tabla de Carga de Personal (Con Checkbox de Cargas Sociales) */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center" title="Tildar para incluir en Cargas Sociales">Cargas</th>
                    <th className="px-4 py-3">Trabajador</th>
                    <th className="px-4 py-3">Especialidad</th>
                    <th className="px-4 py-3 text-center">Días Trabajados</th>
                    <th className="px-4 py-3 text-right">Costo Diario ($)</th>
                    <th className="px-4 py-3 text-center">Días Viáticos</th>
                    <th className="px-4 py-3 text-right">Costo Viático Diario ($)</th>
                    <th className="px-4 py-3 text-right">Total Operario ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalleCargaCalculado.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox"
                          checked={item.incluirCargas}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDetalleCargaPersonal(prev => prev.map(i => i.id === item.id ? { ...i, incluirCargas: checked } : i));
                          }}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{item.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{item.especialidad}</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" min="0" max="7" step="0.5"
                          value={item.dias}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDetalleCargaPersonal(prev => prev.map(i => i.id === item.id ? { ...i, dias: val } : i));
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-600">
                        $ {Number(item.costoDiario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number" min="0" max="7"
                          value={item.viaticosCant}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDetalleCargaPersonal(prev => prev.map(i => i.id === item.id ? { ...i, viaticosCant: val } : i));
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input 
                          type="number" step="0.01" min="0"
                          value={item.viaticosCosto}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDetalleCargaPersonal(prev => prev.map(i => i.id === item.id ? { ...i, viaticosCosto: val } : i));
                          }}
                          className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-right outline-none focus:border-amber-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">
                        $ {item.totalOperario.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjeta de Resumen Final de Sueldos */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Resumen de Liquidación</p>
                <h4 className="text-lg font-black">{obraSeleccionadaCarga ? `Obra: ${obraSeleccionadaCarga}` : 'Seleccione una obra para liquidar'}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase font-bold block">TOTAL GENERAL A PAGAR / IMPUTAR</span>
                <span className="text-2xl font-black text-amber-400">
                  $ {totalGeneralCarga.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Card Secundaria: Cargas Sociales por Empleado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" /> Cálculo de Cargas Sociales (5 Días Base)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Se calcula aplicando el porcentaje sobre el costo diario por 5 días de los operarios tildados arriba.</p>
              </div>

              <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
                <span className="text-xs font-bold text-blue-900">% Cargas Sociales:</span>
                <input 
                  type="number" step="0.01"
                  value={porcentajeCargasSociales}
                  onChange={(e) => setPorcentajeCargasSociales(Number(e.target.value) || 0)}
                  className="w-20 bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-black text-blue-900 text-center outline-none focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs text-blue-900 font-bold block uppercase">Total Cargas Sociales a Imputar</span>
                <span className="text-xs text-slate-600">
                  ({detalleCargaCalculado.filter(i => i.incluirCargas).length} operarios seleccionados)
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black text-blue-700">
                  $ {totalCargasSociales.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <button 
                  onClick={handleRegistrarCargasSociales}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Registrar Cargas Sociales en Tesorería
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO / EDITAR PERSONAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingId ? 'Editar Personal' : 'Nuevo Personal'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleGuardarPersonal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo *</label>
                <input 
                  type="text" required placeholder="Ej: Pérez Juan Carlos"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                  value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CUIL *</label>
                  <input 
                    type="text" required placeholder="Ej: 20-30816383-1"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.cuil} onChange={(e) => setFormData({...formData, cuil: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especialidad *</label>
                  <input 
                    type="text" required placeholder="Ej: Oficial Especializado"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.especialidad} onChange={(e) => setFormData({...formData, especialidad: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Costo en Mano Diario ($) *</label>
                  <input 
                    type="number" step="0.01" required placeholder="Ej: 92550.50"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.costo_en_mano} onChange={(e) => setFormData({...formData, costo_en_mano: Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mes de Acuerdo (Paritaria)</label>
                  <input 
                    type="text" placeholder="Ej: Agosto 2026"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.mes_acuerdo} onChange={(e) => setFormData({...formData, mes_acuerdo: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono</label>
                  <input 
                    type="text" placeholder="Ej: +54 9 11..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mail</label>
                  <input 
                    type="email" placeholder="correo@ejemplo.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección</label>
                <input 
                  type="text" placeholder="Ej: Av. San Martín 1234, Benavidez"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500" 
                  value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}