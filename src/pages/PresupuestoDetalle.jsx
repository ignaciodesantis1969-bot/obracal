import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Trash2, Edit2, Loader2, FolderPlus, X, BarChart3, Calculator, ArrowLeft, TrendingUp, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { exportarPresupuestoExcel, exportarPresupuestoPDF } from '../utils/exportUtils';

export default function PresupuestoDetalle() {
  const { id: presupuestoId } = useParams();

  const [presupuesto, setPresupuesto] = useState(null);
  const [obra, setObra] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [itemsDetalle, setItemsDetalle] = useState([]);
  const [maestroTareas, setMaestroTareas] = useState([]);
  const [certificados, setCertificados] = useState([]);
  const [insumosList, setInsumosList] = useState([]);
  const [rubrosList, setRubrosList] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('costos');

  const [isRubroModalOpen, setIsRubroModalOpen] = useState(false);
  const [isTareaModalOpen, setIsTareaModalOpen] = useState(false);
  const [nombreNuevoRubro, setNombreNuevoRubro] = useState('');
  const [editingTarea, setEditingTarea] = useState(null);

  const [isNuevoGGModalOpen, setIsNuevoGGModalOpen] = useState(false);
  const [isSavingGG, setIsSavingGG] = useState(false);
  const [nuevoGastoGeneral, setNuevoGastoGeneral] = useState({ concepto: '', unitario: '' });

  // 🛡️ ESTADOS DE BLOQUEO CONTRA CLICS MÚLTIPLES (DUPLICACIÓN)
  const [isSavingRubro, setIsSavingRubro] = useState(false);
  const [isSavingTarea, setIsSavingTarea] = useState(false);

  // 📥 ESTADOS PARA EL MODAL DE EXPORTACIÓN (COSTOS VS VENTA)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormato, setExportFormato] = useState('excel'); // 'excel' o 'pdf'

  const [nuevaTarea, setNuevaTarea] = useState({
    rubro: '',
    tarea: '',
    unidad: 'm2',
    cantidad: 1,
    costo_unitario: 0,
    insumos: ''
  });

  const [gastosGeneralesInsumos, setGastosGeneralesInsumos] = useState([]);

  const [porcentajeComisionVenta, setPorcentajeComisionVenta] = useState(0); 
  const [porcentajeImprevistos, setPorcentajeImprevistos] = useState(1.5); 

  const [impuestosPorcentajes, setImpuestosPorcentajes] = useState({
    iibb: 3.5,
    gastosFinancieros: 0,
    ganancias: 5.4,
    sellados: 0,
    debitosCreditos: 0,
    beneficio: 20.27
  });

  const [rubrosColapsados, setRubrosColapsados] = useState({});
  const [rubrosConOrden, setRubrosConOrden] = useState([]);

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

  const cargarDatosDetalle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'cargarDetalleCompleto' }) 
      });

      const data = await response.json();

      const presupuestosList = data.presupuestos || [];
      const obrasList = data.obras || [];
      const clientesList = data.clientes || [];
      const mtList = data.maestro || [];
      const certList = data.certificados || [];
      const insList = data.insumos || [];
      const rubList = data.rubros || [];

      const presActual = presupuestosList.find(p => String(p.id) === String(presupuestoId));
      setPresupuesto(presActual || {});

      let itemsParseados = [];
      let comercialParseado = null;

      if (presActual) {
        try {
          if (presActual.items_detalle) {
            const parsed = typeof presActual.items_detalle === 'string' ? JSON.parse(presActual.items_detalle) : presActual.items_detalle;
            if (parsed && !Array.isArray(parsed) && parsed.rubros) {
              itemsParseados = parsed.rubros;
              comercialParseado = parsed.comercial;
            } else if (Array.isArray(parsed)) {
              itemsParseados = parsed;
            }
          }
        } catch (e) {
          itemsParseados = [];
        }

        if (comercialParseado) {
          if (Array.isArray(comercialParseado.gastos_generales_insumos)) {
            setGastosGeneralesInsumos(comercialParseado.gastos_generales_insumos);
          }
          if (comercialParseado.porcentaje_comision_venta !== undefined) {
            setPorcentajeComisionVenta(Number(comercialParseado.porcentaje_comision_venta));
          }
          if (comercialParseado.porcentaje_imprevistos !== undefined) {
            setPorcentajeImprevistos(Number(comercialParseado.porcentaje_imprevistos));
          }
          if (comercialParseado.impuestos_porcentajes) {
            setImpuestosPorcentajes(prev => ({ ...prev, ...comercialParseado.impuestos_porcentajes }));
          }
        } else {
          if (presActual.gastos_generales_insumos) {
            try {
              const gg = typeof presActual.gastos_generales_insumos === 'string' 
                ? JSON.parse(presActual.gastos_generales_insumos) 
                : presActual.gastos_generales_insumos;
              if (Array.isArray(gg)) setGastosGeneralesInsumos(gg);
            } catch (e) {}
          }
          if (presActual.porcentaje_comision_venta !== undefined && presActual.porcentaje_comision_venta !== null && presActual.porcentaje_comision_venta !== '') {
            setPorcentajeComisionVenta(Number(presActual.porcentaje_comision_venta));
          }
          if (presActual.porcentaje_imprevistos !== undefined && presActual.porcentaje_imprevistos !== null && presActual.porcentaje_imprevistos !== '') {
            setPorcentajeImprevistos(Number(presActual.porcentaje_imprevistos));
          }
          if (presActual.impuestos_porcentajes) {
            try {
              const imp = typeof presActual.impuestos_porcentajes === 'string'
                ? JSON.parse(presActual.impuestos_porcentajes)
                : presActual.impuestos_porcentajes;
              if (imp && typeof imp === 'object') {
                setImpuestosPorcentajes(prev => ({ ...prev, ...imp }));
              }
            } catch (e) {}
          }
        }

        if (presActual.obra_id) {
          const obraEncontrada = obrasList.find(o => String(o.id) === String(presActual.obra_id));
          setObra(obraEncontrada || {});
          if (obraEncontrada) {
            const clienteId = obraEncontrada.cliente_id || obraEncontrada.clienteId;
            const clienteEncontrado = clientesList.find(c => String(c.id) === String(clienteId));
            setCliente(clienteEncontrado || {});
          }
        }
      }

      if (!Array.isArray(itemsParseados) || itemsParseados.length === 0) {
        itemsParseados = [
          { rubro: 'RUBRO GENERAL / PRINCIPAL', tareas: [] }
        ];
      }

      setItemsDetalle(itemsParseados);
      setMaestroTareas(Array.isArray(mtList) ? mtList : []);
      setCertificados(Array.isArray(certList) ? certList : []);
      setInsumosList(Array.isArray(insList) ? insList : []);
      setRubrosList(Array.isArray(rubList) ? rubList : []);
    } catch (err) {
      console.error("Error al cargar detalle:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    if (presupuestoId) {
      cargarDatosDetalle(); 
    } else {
      setIsLoading(false);
    }
  }, [presupuestoId]);

  useEffect(() => {
    if (itemsDetalle && itemsDetalle.length > 0) {
      const rubrosUnicos = itemsDetalle.map(r => r.rubro);
      setRubrosConOrden(prev => {
        const existentesMap = new Map(prev.map(r => [r.nombre, r.numero]));
        let maxNum = prev.reduce((max, r) => Math.max(max, r.numero), 0);
        
        return rubrosUnicos.map(nombre => ({
          nombre,
          numero: existentesMap.has(nombre) ? existentesMap.get(nombre) : ++maxNum
        })).sort((a, b) => a.numero - b.numero);
      });
    }
  }, [itemsDetalle]);

  const toggleRubro = (nombreRubro) => {
    setRubrosColapsados(prev => ({
      ...prev,
      [nombreRubro]: !prev[nombreRubro]
    }));
  };

  const handleCambiarNumeroRubro = (nombreRubro, nuevoNumeroStr) => {
    const nuevoNumero = parseInt(nuevoNumeroStr, 10);
    if (isNaN(nuevoNumero) || nuevoNumero <= 0) return;

    const yaExiste = rubrosConOrden.some(r => r.nombre !== nombreRubro && r.numero === nuevoNumero);
    if (yaExiste) {
      alert(`¡Atención! El número ${nuevoNumero} ya está asignado a otro rubro. Por favor elige uno diferente para evitar duplicados.`);
      return;
    }

    setRubrosConOrden(prev => 
      prev.map(r => r.nombre === nombreRubro ? { ...r, numero: nuevoNumero } : r)
          .sort((a, b) => a.numero - b.numero)
    );
  };

  const estadoActual = String(presupuesto?.estado_presupuesto || presupuesto?.estado || 'borrador').toLowerCase();
  const esBorrador = estadoActual === 'borrador';
  const esEntregado = estadoActual === 'entregado';
  const esAprobado = estadoActual === 'aprobado';
  const esRechazado = estadoActual === 'rechazado';

  const guardarEstructuraPresupuesto = async (nuevosItems, nuevoCoef = null) => {
    if (!esBorrador) {
      alert(`⚠️ Este presupuesto está en estado '${estadoActual}' y no puede ser modificado.`);
      return;
    }

    let costoDirectoTotal = 0;

    const itemsValidados = nuevosItems.map(rubro => ({
      ...rubro,
      tareas: (rubro.tareas || []).map(t => {
        let insListTarea = t.insumos;
        if (typeof insListTarea === 'string' && insListTarea.trim()) {
          if (insListTarea.trim().startsWith('[')) {
            try { insListTarea = JSON.parse(insListTarea); } catch { insListTarea = []; }
          } else {
            insListTarea = insListTarea.split(',').map(item => ({
              id: '',
              nombre: item.trim(),
              tipo: 'Material',
              unidad: 'gl',
              cantidad: 1,
              costo_unitario: 0
            })).filter(i => i.nombre);
          }
        }
        if (!Array.isArray(insListTarea)) insListTarea = [];

        const cantT = Number(t.cantidad) || 0;
        const cUnitT = Number(t.costo_unitario) || 0;
        costoDirectoTotal += cantT * cUnitT;

        return {
          ...t,
          cantidad: cantT,
          costo_unitario: cUnitT,
          insumos: insListTarea
        };
      })
    }));

    const coef = nuevoCoef !== null ? nuevoCoef : (Number(presupuesto?.coeficiente_pase) || 1.30);
    const precioVentaTotal = costoDirectoTotal * coef;

    const estructuraCompleta = {
      rubros: itemsValidados,
      comercial: {
        gastos_generales_insumos: gastosGeneralesInsumos,
        porcentaje_comision_venta: porcentajeComisionVenta,
        porcentaje_imprevistos: porcentajeImprevistos,
        impuestos_porcentajes: impuestosPorcentajes
      }
    };

    const datosActualizados = {
      ...presupuesto,
      costo_directo: costoDirectoTotal,
      precio_venta: precioVentaTotal,
      coeficiente_pase: coef,
      items_detalle: JSON.stringify(estructuraCompleta),
      gastos_generales_insumos: JSON.stringify(gastosGeneralesInsumos),
      porcentaje_comision_venta: porcentajeComisionVenta,
      porcentaje_imprevistos: porcentajeImprevistos,
      impuestos_porcentajes: JSON.stringify(impuestosPorcentajes)
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Presupuestos', action: 'update', id: presupuestoId, data: datosActualizados })
      });
      setPresupuesto(datosActualizados);
      setItemsDetalle(itemsValidados);
    } catch (err) {
      console.error("Error al guardar en Google Sheets:", err);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  const generarCodigoRubroAutomatico = () => {
    if (!rubrosList || rubrosList.length === 0) return 'R001';
    let maxNum = 0;
    rubrosList.forEach(r => {
      const cod = String(r.codigo || r.Codigo || '');
      if (cod.startsWith('R')) {
        const num = parseInt(cod.replace('R', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `R${String(maxNum + 1).padStart(3, '0')}`;
  };

  // 🛡️ FUNCIÓN CON PROTECCIÓN CONTRA CLICS MÚLTIPLES (RUBROS)
  const handleCrearRubro = async (e) => {
    e.preventDefault();
    if (isSavingRubro) return;

    if (!esBorrador) {
      alert(`⚠️ Presupuesto bloqueado (${estadoActual}).`);
      return;
    }
    if (!nombreNuevoRubro.trim()) return;

    setIsSavingRubro(true);
    try {
      const nombreRubroUpper = nombreNuevoRubro.trim().toUpperCase();
      
      if (itemsDetalle.some(r => r.rubro === nombreRubroUpper)) {
        alert("El rubro ya existe en este presupuesto.");
        return;
      }

      const codigoGenerado = generarCodigoRubroAutomatico();

      const nuevos = [...itemsDetalle, { rubro: nombreRubroUpper, tareas: [] }];
      setItemsDetalle(nuevos);
      await guardarEstructuraPresupuesto(nuevos);

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Rubros',
          action: 'create',
          data: {
            codigo: codigoGenerado,
            nombre: nombreRubroUpper,
            descripcion: 'Creado desde presupuesto'
          }
        })
      });
      const dataRes = await res.json();
      
      setRubrosList([
        ...rubrosList, 
        { id: dataRes.id || Date.now(), codigo: codigoGenerado, nombre: nombreRubroUpper, descripcion: 'Creado desde presupuesto' }
      ]);

      setNombreNuevoRubro('');
      setIsRubroModalOpen(false);
    } catch (err) {
      console.error("Error al guardar el rubro en la base de datos:", err);
      alert("Error al guardar el rubro.");
    } finally {
      setIsSavingRubro(false);
    }
  };

  const handleEliminarRubro = (nombreRubro) => {
    if (!esBorrador) {
      alert(`⚠️ Presupuesto bloqueado (${estadoActual}).`);
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar el rubro "${nombreRubro}" y todas sus tareas asociadas?`)) {
      const nuevos = itemsDetalle.filter(r => r.rubro !== nombreRubro);
      setItemsDetalle(nuevos);
      guardarEstructuraPresupuesto(nuevos);
    }
  };

  // 🛡️ FUNCIÓN CON PROTECCIÓN CONTRA CLICS MÚLTIPLES (TAREAS)
  const handleGuardarTarea = async (e) => {
    e.preventDefault();
    if (isSavingTarea) return;

    if (!esBorrador) {
      alert(`⚠️ Presupuesto bloqueado (${estadoActual}).`);
      return;
    }
    if (!nuevaTarea.rubro || !nuevaTarea.tarea) {
      alert("Complete el rubro y el nombre de la tarea.");
      return;
    }

    setIsSavingTarea(true);
    try {
      let nuevosItems;
      if (editingTarea) {
        nuevosItems = itemsDetalle.map(r => {
          if (r.rubro === nuevaTarea.rubro) {
            return {
              ...r,
              tareas: r.tareas.map(t => t.id === editingTarea.id ? { ...nuevaTarea, id: editingTarea.id } : t)
            };
          } else {
            return {
              ...r,
              tareas: r.tareas.filter(t => t.id !== editingTarea.id)
            };
          }
        });
        const existeEnDestino = nuevosItems.some(r => r.rubro === nuevaTarea.rubro && r.tareas.some(t => t.id === editingTarea.id));
        if (!existeEnDestino) {
          nuevosItems = nuevosItems.map(r => {
            if (r.rubro === nuevaTarea.rubro) {
              return { ...r, tareas: [...r.tareas, { ...nuevaTarea, id: editingTarea.id }] };
            }
            return r;
          });
        }
      } else {
        nuevosItems = itemsDetalle.map(r => {
          if (r.rubro === nuevaTarea.rubro) {
            return {
              ...r,
              tareas: [...r.tareas, { ...nuevaTarea, id: Date.now() }]
            };
          }
          return r;
        });
      }

      setItemsDetalle(nuevosItems);
      await guardarEstructuraPresupuesto(nuevosItems);
      setIsTareaModalOpen(false);
      setEditingTarea(null);
      setNuevaTarea({ rubro: '', tarea: '', unidad: 'm2', cantidad: 1, costo_unitario: 0, insumos: '' });
    } catch (err) {
      console.error("Error al guardar tarea:", err);
      alert("Hubo un error al guardar la tarea.");
    } finally {
      setIsSavingTarea(false);
    }
  };

  const handleEditarTareaClick = (rubroName, tarea) => {
    if (!esBorrador) {
      alert(`⚠️ Presupuesto bloqueado (${estadoActual}).`);
      return;
    }
    setNuevaTarea({
      rubro: rubroName,
      tarea: tarea.tarea || '',
      unidad: tarea.unidad || 'm2',
      cantidad: tarea.cantidad || 1,
      costo_unitario: tarea.costo_unitario || 0,
      insumos: tarea.insumos || ''
    });
    setEditingTarea(tarea);
    setIsTareaModalOpen(true);
  };

  const handleEliminarTarea = (nombreRubro, tareaId) => {
    if (!esBorrador) {
      alert(`⚠️ Presupuesto bloqueado (${estadoActual}).`);
      return;
    }
    if (window.confirm("¿Eliminar esta tarea?")) {
      const nuevos = itemsDetalle.map(r => {
        if (r.rubro === nombreRubro) {
          return {
            ...r,
            tareas: r.tareas.filter(t => t.id !== tareaId)
          };
        }
        return r;
      });
      setItemsDetalle(nuevos);
      guardarEstructuraPresupuesto(nuevos);
    }
  };

  const handleCrearGastoGeneral = async (e) => {
    e.preventDefault();
    if (!esBorrador) return;
    if (!nuevoGastoGeneral.concepto) return;
    setIsSavingGG(true);
    
    const nuevoIns = {
      codigo: 'GG-' + Date.now().toString().slice(-4),
      nombre: nuevoGastoGeneral.concepto.toUpperCase(),
      categoria: 'GASTOS GENERALES',
      tipo: 'Gastos Generales',
      unidad: 'un',
      costo_unitario: Number(nuevoGastoGeneral.unitario) || 0,
      estado: 'activo'
    };

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Insumos', action: 'create', data: nuevoIns })
      });
      const data = await res.json();
      
      const insumoCreado = { ...nuevoIns, id: data.id || Date.now() };
      
      setInsumosList([...insumosList, insumoCreado]);
      const nuevosGG = [
        ...gastosGeneralesInsumos,
        { id: insumoCreado.id, concepto: insumoCreado.nombre, cantidad: 1, unitario: insumoCreado.costo_unitario }
      ];
      setGastosGeneralesInsumos(nuevosGG);

      setIsNuevoGGModalOpen(false);
      setNuevoGastoGeneral({ concepto: '', unitario: '' });
    } catch (err) {
      alert("Error al guardar el gasto general en la base de datos.");
    } finally {
      setIsSavingGG(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" /></div>;
  }

  let costoTotalGeneral = 0;
  let totalTareasCount = 0;
  itemsDetalle.forEach(r => {
    totalTareasCount += (r.tareas || []).length;
    (r.tareas || []).forEach(t => {
      costoTotalGeneral += (Number(t.cantidad) || 0) * (Number(t.costo_unitario) || 0);
    });
  });

  const costoDirectoBase = costoTotalGeneral;

  const insumosDisponiblesGG = insumosList.filter(i => {
    const cat = String(i.categoria || i.tipo || i.rubro || '').trim().toUpperCase();
    return cat.includes('GASTOS') || cat.includes('GENERAL');
  });

  const totalInsumosGG = gastosGeneralesInsumos.reduce((acc, item) => acc + ((Number(item.cantidad) || 0) * (Number(item.unitario) || 0)), 0);
  const montoComisionVenta = costoDirectoBase * (porcentajeComisionVenta / 100);
  const montoImprevistos = costoDirectoBase * (porcentajeImprevistos / 100);
  const totalGastosGenerales = totalInsumosGG + montoComisionVenta + montoImprevistos;

  const sumaPorcentajesPV = Number(impuestosPorcentajes.iibb) + 
                            Number(impuestosPorcentajes.gastosFinancieros) + 
                            Number(impuestosPorcentajes.ganancias) + 
                            Number(impuestosPorcentajes.sellados) + 
                            Number(impuestosPorcentajes.debitosCreditos) + 
                            Number(impuestosPorcentajes.beneficio);

  const factorDivisorPV = 1 - (sumaPorcentajesPV / 100);
  const precioVentaCalculado = factorDivisorPV > 0 ? (costoDirectoBase + totalGastosGenerales) / factorDivisorPV : costoDirectoBase;
  const coeficientePaseCalculado = costoDirectoBase > 0 ? precioVentaCalculado / costoDirectoBase : 1;
  const coeficientePase = Number(presupuesto?.coeficiente_pase) || coeficientePaseCalculado;
  const precioVentaGeneral = costoDirectoBase * coeficientePase;

  const certsPresupuesto = certificados.filter(c => String(c.presupuesto_id) === String(presupuestoId) || String(c.obra_id) === String(presupuesto?.obra_id));

  let totalPresupuestadoVenta = 0;
  let totalFacturadoGeneral = 0;

  const rubrosResumen = itemsDetalle.map(rubroObj => {
    let costoRubro = 0;
    (rubroObj.tareas || []).forEach(t => {
      costoRubro += (Number(t.cantidad) || 0) * (Number(t.costo_unitario) || 0);
    });
    const presupuestadoVentaRubro = costoRubro * coeficientePase;
    totalPresupuestadoVenta += presupuestadoVentaRubro;

    let facturadoRubro = 0;
    certsPresupuesto.forEach(c => {
      let cItems = [];
      try { cItems = typeof c.items_detalle === 'string' ? JSON.parse(c.items_detalle) : (c.items_detalle || []); } catch (e) { cItems = []; }
      if (Array.isArray(cItems) && cItems.length > 0) {
        cItems.forEach(ci => {
          if (String(ci.rubro || '').trim().toUpperCase() === String(rubroObj.rubro).trim().toUpperCase()) {
            facturadoRubro += Number(ci.monto || ci.facturado || ci.total || 0);
          }
        });
      } else if (c.rubro && String(c.rubro).trim().toUpperCase() === String(rubroObj.rubro).trim().toUpperCase()) {
        facturadoRubro += Number(c.monto || c.total || 0);
      }
    });

    totalFacturadoGeneral += facturadoRubro;
    return { rubro: rubroObj.rubro, presupuestado: presupuestadoVentaRubro, facturado: facturadoRubro, diferencia: presupuestadoVentaRubro - facturadoRubro, ejecucion: presupuestadoVentaRubro > 0 ? (facturadoRubro / presupuestadoVentaRubro) * 100 : 0 };
  });

  const saldoDisponibleGeneral = totalPresupuestadoVenta - totalFacturadoGeneral;
  const porcentajeEjecucionGeneral = totalPresupuestadoVenta > 0 ? (totalFacturadoGeneral / totalPresupuestadoVenta) * 100 : 0;

  const rubrosDisponiblesMaestro = [...new Set([
    ...rubrosList.map(r => String(r.nombre || r.Nombre || '').trim().toUpperCase()),
    ...maestroTareas.map(m => String(m.rubro || m.Rubro || m.RUBRO || '').trim().toUpperCase())
  ].filter(Boolean))];

  const maestroTareasFiltradas = maestroTareas.filter(m => {
    if (!nuevaTarea.rubro) return true;
    const rubroMaestro = String(m.rubro || m.Rubro || m.RUBRO || '').trim().toUpperCase();
    const rubroSeleccionado = String(nuevaTarea.rubro || '').trim().toUpperCase();
    return rubroMaestro === rubroSeleccionado && m.tarea !== '---';
  });

  // Ítems calculados para Costos
  const itemsCostosExportacion = itemsDetalle.flatMap(r => 
    (r.tareas || []).map(t => ({
      descripcion: `[${r.rubro}] ${t.tarea}`,
      cantidad: t.cantidad,
      precio_unitario: Number(t.costo_unitario || 0),
      subtotal: Number(t.cantidad || 0) * Number(t.costo_unitario || 0)
    }))
  );

  // Ítems calculados para Venta (con Coeficiente de Pase aplicado)
  const itemsVentaExportacion = itemsDetalle.flatMap(r => 
    (r.tareas || []).map(t => {
      const pUnitVenta = Number(t.costo_unitario || 0) * coeficientePase;
      const subtotalVenta = (Number(t.cantidad || 0) * Number(t.costo_unitario || 0)) * coeficientePase;
      return {
        descripcion: `[${r.rubro}] ${t.tarea}`,
        cantidad: t.cantidad,
        precio_unitario: pUnitVenta,
        subtotal: subtotalVenta
      };
    })
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Botón de Regreso y Acciones de Exportación */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          to="/presupuestos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Presupuestos
        </Link>

        {/* 📥 BOTONES QUE ABREN EL MODAL DE ELECCIÓN */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setExportFormato('excel'); setIsExportModalOpen(true); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            📥 Descargar Excel
          </button>
          <button 
            onClick={() => { setExportFormato('pdf'); setIsExportModalOpen(true); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            📄 Descargar PDF
          </button>
        </div>
      </div>

      {/* Alerta si está Bloqueado */}
      {!esBorrador && (
        <div className={`border px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm ${
          esAprobado ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          esRechazado ? 'bg-red-50 border-red-200 text-red-900' :
          'bg-purple-50 border-purple-200 text-purple-900'
        }`}>
          <Lock className={`w-5 h-5 shrink-0 ${esAprobado ? 'text-emerald-600' : esRechazado ? 'text-red-600' : 'text-purple-600'}`} />
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wide block">Presupuesto Bloqueado ({estadoActual})</span>
            {esEntregado && "Este presupuesto se encuentra en estado Entregado. Para modificarlo, debe generar una nueva versión desde la lista principal."}
            {esAprobado && "Este presupuesto ha sido Aprobado y no puede ser modificado."}
            {esRechazado && "Este presupuesto fue Rechazado y no puede ser modificado."}
          </div>
        </div>
      )}

      {/* CABECERA SUPERIOR */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-xs">{presupuesto?.codigo || '---'}</span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-extrabold text-[11px] uppercase">{presupuesto?.version || 'v1'}</span>
            <h1 className="text-xl font-extrabold text-slate-900">{presupuesto?.nombre || 'Detalle de Presupuesto'}</h1>
            <span className={`px-2.5 py-1 rounded-full font-bold text-xs uppercase ${esBorrador ? 'bg-slate-100 text-slate-700' : esAprobado ? 'bg-emerald-100 text-emerald-800' : esRechazado ? 'bg-red-100 text-red-800' : 'bg-purple-100 text-purple-800'}`}>
              {estadoActual}
            </span>

          </div>
          <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-4">
            <span><strong>Obra:</strong> {obra?.nombre || obra?.nombre_obra || 'Sin obra asignada'}</span>
            <span>•</span>
            <span><strong>Cliente:</strong> {cliente?.razon_social || cliente?.nombre || 'Sin cliente asignado'}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            disabled={!esBorrador}
            onClick={() => setIsRubroModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm ${!esBorrador ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
          >
            <FolderPlus className="w-4 h-4" /> Nuevo Rubro
          </button>
          <button 
            disabled={!esBorrador}
            onClick={() => {
              if (itemsDetalle.length === 0) { alert("Cree un rubro primero."); return; }
              setEditingTarea(null);
              setNuevaTarea({ rubro: itemsDetalle[0].rubro, tarea: '', unidad: 'm2', cantidad: 1, costo_unitario: 0, insumos: '' });
              setIsTareaModalOpen(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm ${!esBorrador ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Costo Directo</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">$ {Math.round(costoTotalGeneral).toLocaleString('es-AR')}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Precio de Venta</span>
          <h3 className="text-2xl font-black text-amber-600 mt-1">$ {Math.round(precioVentaGeneral).toLocaleString('es-AR')}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Coeficiente de Pase</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{coeficientePase.toFixed(4)}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Rubros / Tareas</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{itemsDetalle.length} / {totalTareasCount}</h3>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-300 shadow-sm inline-flex gap-1">
        <button 
          onClick={() => setActiveTab('costos')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'costos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Presupuesto de Costos
        </button>
        <button 
          onClick={() => setActiveTab('real_vs_presupuestado')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'real_vs_presupuestado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Real vs Presupuestado
        </button>
        <button 
          onClick={() => setActiveTab('multiplicador')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'multiplicador' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Multiplicador / Comercial
        </button>
      </div>

      {/* CONTENIDO DE PESTAÑAS */}
      {activeTab === 'costos' && (
        <div className="space-y-4">
          {rubrosConOrden
            .sort((a, b) => a.numero - b.numero)
            .map((rubroOrdenObj) => {
              const nombreRubro = rubroOrdenObj.nombre;
              const numeroRubro = rubroOrdenObj.numero;
              const rubroObj = itemsDetalle.find(r => r.rubro === nombreRubro);
              if (!rubroObj) return null;

              const tareasDelRubro = rubroObj.tareas || [];
              let costoRubro = 0;
              tareasDelRubro.forEach(t => { costoRubro += (Number(t.cantidad) || 0) * (Number(t.costo_unitario) || 0); });
              const precioVentaRubro = costoRubro * coeficientePase;
              const estaColapsado = rubrosColapsados[nombreRubro];

              return (
                <div key={nombreRubro} className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                  {/* ENCABEZADO DEL RUBRO */}
                  <div className="bg-slate-800 text-white px-6 py-3.5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg">
                        <span className="text-[10px] text-amber-400 font-bold">N°</span>
                        <input 
                          type="number"
                          min="1"
                          value={numeroRubro}
                          onChange={(e) => handleCambiarNumeroRubro(nombreRubro, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-10 bg-slate-800 text-amber-400 font-black text-xs text-center rounded outline-none focus:ring-1 focus:ring-amber-400"
                          title="Edita este número para reordenar el rubro"
                        />
                      </div>

                      <div 
                        onClick={() => toggleRubro(nombreRubro)}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        {estaColapsado ? (
                          <ChevronRight className="w-4 h-4 text-amber-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-amber-400" />
                        )}
                        <span className="font-extrabold text-sm tracking-wide uppercase text-white">{nombreRubro}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="text-xs text-slate-300">Costo: <strong className="text-amber-400">$ {Math.round(costoRubro).toLocaleString('es-AR')}</strong></span>
                      <span className="text-xs text-slate-300">Venta: <strong className="text-emerald-400">$ {Math.round(precioVentaRubro).toLocaleString('es-AR')}</strong></span>
                      {esBorrador && (
                        <button 
                          onClick={() => handleEliminarRubro(nombreRubro)} 
                          className="text-red-400 hover:text-red-200 p-1 rounded transition-colors flex items-center gap-1 text-xs font-semibold bg-slate-900/40 px-2 py-1 border border-red-500/30"
                          title="Eliminar Rubro Completo"
                        >
                          <Trash2 className="w-3.5 h-3.5"/> Eliminar Rubro
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CONTENIDO DE TAREAS */}
                  {!estaColapsado && (
                    <div className="divide-y divide-slate-100">
                      {tareasDelRubro.length === 0 ? (
                        <div className="px-6 py-6 text-xs text-slate-400 italic text-center">No hay tareas cargadas en este rubro. Hacé clic en "Nueva Tarea" para agregar.</div>
                      ) : (
                        <table className="w-full text-left text-xs table-fixed">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                              <th className="w-[30%] px-6 py-3">Tarea e Insumos</th>
                              <th className="w-[8%] px-2 py-3 text-center">Unidad</th>
                              <th className="w-[9%] px-2 py-3 text-center">Cantidad</th>
                              <th className="w-[13%] px-3 py-3 text-right">Costo Unit.</th>
                              <th className="w-[13%] px-3 py-3 text-right">Costo Total</th>
                              <th className="w-[13%] px-3 py-3 text-right">Precio Venta</th>
                              <th className="w-[14%] px-4 py-3 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {tareasDelRubro.map(t => {
                              const cant = Number(t.cantidad) || 0;
                              const cUnit = Number(t.costo_unitario) || 0;
                              const cTot = cant * cUnit;
                              const pVentaItem = cTot * coeficientePase;

                              let insumosTexto = '';
                              if (Array.isArray(t.insumos)) {
                                insumosTexto = t.insumos.map(i => i.nombre || i.concepto).filter(Boolean).join(', ');
                              } else if (typeof t.insumos === 'string') {
                                insumosTexto = t.insumos;
                              }

                              return (
                                <tr key={t.id} className="hover:bg-slate-50 group">
                                  <td className="w-[30%] px-6 py-3 break-words">
                                    <div className="font-semibold text-slate-800">{t.tarea}</div>
                                    {insumosTexto && (
                                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                                        <span className="font-bold text-slate-600">Insumos:</span> {insumosTexto}
                                      </div>
                                    )}
                                  </td>
                                  <td className="w-[8%] px-2 py-3 uppercase text-slate-600 text-center">{t.unidad}</td>
                                  <td className="w-[9%] px-2 py-3 text-center font-bold text-slate-800">{cant}</td>
                                  <td className="w-[13%] px-3 py-3 text-right text-slate-600">$ {Math.round(cUnit).toLocaleString('es-AR')}</td>
                                  <td className="w-[13%] px-3 py-3 text-right font-black text-slate-900">$ {Math.round(cTot).toLocaleString('es-AR')}</td>
                                  <td className="w-[13%] px-3 py-3 text-right font-black text-amber-600">$ {Math.round(pVentaItem).toLocaleString('es-AR')}</td>
                                  <td className="w-[14%] px-4 py-3 text-right">
                                    {esBorrador && (
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditarTareaClick(nombreRubro, t)} className="p-1 text-slate-500 hover:text-amber-600 bg-white border rounded shadow-sm" title="Modificar Tarea">
                                          <Edit2 className="w-3.5 h-3.5"/>
                                        </button>
                                        <button onClick={() => handleEliminarTarea(nombreRubro, t.id)} className="p-1 text-slate-400 hover:text-red-600 bg-white border rounded shadow-sm" title="Eliminar Tarea">
                                          <Trash2 className="w-3.5 h-3.5"/>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {activeTab === 'real_vs_presupuestado' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Presupuestado</span>
              <h3 className="text-2xl font-black text-slate-900 mt-1">$ {Math.round(totalPresupuestadoVenta).toLocaleString('es-AR')}</h3>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Facturado</span>
              <h3 className="text-2xl font-black text-amber-600 mt-1">$ {Math.round(totalFacturadoGeneral).toLocaleString('es-AR')}</h3>
              <p className="text-[11px] font-semibold text-amber-600 mt-1">{porcentajeEjecucionGeneral.toFixed(1)}% ejecutado</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase">Saldo Disponible</span>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">$ {Math.round(saldoDisponibleGeneral).toLocaleString('es-AR')}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Rubro</th>
                  <th className="px-4 py-4 text-right">Presupuestado</th>
                  <th className="px-4 py-4 text-right">Facturado</th>
                  <th className="px-4 py-4 text-right">Diferencia</th>
                  <th className="px-6 py-4 text-center">Ejecución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rubrosResumen.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-extrabold text-slate-900 uppercase">{r.rubro}</td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-800">$ {Math.round(r.presupuestado).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-4 text-right font-bold text-amber-600">$ {Math.round(r.facturado).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-4 text-right font-medium text-emerald-600 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" /> $ {Math.round(r.diferencia).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(r.ejecucion, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-700 w-10 text-right">{r.ejecucion.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                  <td className="px-6 py-4 uppercase">Total</td>
                  <td className="px-4 py-4 text-right">$ {Math.round(totalPresupuestadoVenta).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-4 text-right text-amber-600">$ {Math.round(totalFacturadoGeneral).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-4 text-right text-emerald-600">$ {Math.round(saldoDisponibleGeneral).toLocaleString('es-AR')}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px]">
                      {porcentajeEjecucionGeneral.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'multiplicador' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-sm space-y-8 max-w-5xl mx-auto">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-800">Multiplicador — Cálculo del Coeficiente de Pase</h3>
            </div>
            <div className="text-sm font-semibold text-slate-500">
              Costo Directo base: <strong className="text-slate-900">$ {Math.round(costoDirectoBase).toLocaleString('es-AR')}</strong>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h4 className="font-extrabold text-sm text-slate-800 uppercase">Gastos Generales (Insumos y Valores Fijos)</h4>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  disabled={!esBorrador}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none focus:border-amber-500 flex-1 sm:flex-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                  onChange={(e) => {
                    const insId = e.target.value;
                    if (!insId) return;
                    const ins = insumosList.find(i => String(i.id) === String(insId));
                    if (ins) {
                      setGastosGeneralesInsumos([
                        ...gastosGeneralesInsumos,
                        {
                          id: Date.now(),
                          concepto: ins.nombre || ins.insumo || ins.descripcion || '',
                          cantidad: 1,
                          unitario: Number(ins.costo || ins.precio || ins.costo_unitario || 0)
                        }
                      ]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">+ Seleccionar Insumo (Gastos Generales)...</option>
                  {insumosDisponiblesGG.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre || ins.insumo || ins.descripcion} ($ {Math.round(Number(ins.costo || ins.precio || ins.costo_unitario || 0)).toLocaleString('es-AR')})
                    </option>
                  ))}
                </select>

                <button 
                  disabled={!esBorrador}
                  onClick={() => setIsNuevoGGModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors shrink-0 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear Nuevo Manual
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3 w-28 text-center">Cantidad</th>
                    <th className="px-4 py-3 w-40 text-right">Unitario ($)</th>
                    <th className="px-4 py-3 w-40 text-right">Total ($)</th>
                    <th className="px-4 py-3 w-16 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gastosGeneralesInsumos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-slate-400 italic">No hay gastos generales agregados.</td>
                    </tr>
                  ) : (
                    gastosGeneralesInsumos.map((item, index) => {
                      const subtotal = (Number(item.cantidad) || 0) * (Number(item.unitario) || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <input 
                              type="text" 
                              disabled={!esBorrador}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-semibold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                              value={item.concepto}
                              onChange={(e) => {
                                const nuevo = [...gastosGeneralesInsumos];
                                nuevo[index].concepto = e.target.value;
                                setGastosGeneralesInsumos(nuevo);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input 
                              type="number" 
                              disabled={!esBorrador}
                              step="0.01"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                              value={item.cantidad}
                              onChange={(e) => {
                                const nuevo = [...gastosGeneralesInsumos];
                                nuevo[index].cantidad = e.target.value;
                                setGastosGeneralesInsumos(nuevo);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <input 
                              type="number" 
                              disabled={!esBorrador}
                              step="0.01"
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                              value={item.unitario}
                              onChange={(e) => {
                                const nuevo = [...gastosGeneralesInsumos];
                                nuevo[index].unitario = e.target.value;
                                setGastosGeneralesInsumos(nuevo);
                              }}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900">
                            $ {Math.round(subtotal).toLocaleString('es-AR')}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {esBorrador && (
                              <button 
                                onClick={() => {
                                  setGastosGeneralesInsumos(gastosGeneralesInsumos.filter(i => i.id !== item.id));
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">Comisión de Venta</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">% s/ CD</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.01"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold text-amber-600 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={porcentajeComisionVenta}
                          onChange={(e) => setPorcentajeComisionVenta(e.target.value)}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-600">
                      $ {Math.round(montoComisionVenta).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">-</td>
                  </tr>

                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">Imprevistos</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">% s/ CD</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.01"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-right font-bold text-amber-600 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={porcentajeImprevistos}
                          onChange={(e) => setPorcentajeImprevistos(e.target.value)}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-600">
                      $ {Math.round(montoImprevistos).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">-</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-slate-100 px-6 py-3 flex justify-between items-center border-t border-slate-200 font-black text-slate-900 text-xs">
                <span>TOTAL Gastos Generales</span>
                <span className="text-amber-600">$ {Math.round(totalGastosGenerales).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-slate-800 uppercase">Impuestos y Beneficio</h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-6 py-3">Concepto</th>
                    <th className="px-6 py-3 w-40 text-center">Porcentaje (%)</th>
                    <th className="px-6 py-3 w-48 text-right">Monto calculado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">Imp. a los Ingresos Brutos (IIBB)</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.iibb}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, iibb: e.target.value})}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.iibb) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">Gastos Financieros</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.gastosFinancieros}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, gastosFinancieros: e.target.value})}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.gastosFinancieros) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">Impuesto a las Ganancias</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.ganancias}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, ganancias: e.target.value})}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.ganancias) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">Sellados</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.sellados}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, sellados: e.target.value})}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.sellados) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-semibold text-slate-800">Impuesto a los débitos y créditos</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center font-bold text-slate-800 outline-none focus:border-amber-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.debitosCreditos}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, debitosCreditos: e.target.value})}
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.debitosCreditos) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50/50 hover:bg-emerald-50">
                    <td className="px-6 py-3 font-extrabold text-emerald-800">Beneficio</td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input 
                          type="number" 
                          disabled={!esBorrador}
                          step="0.001"
                          className="w-24 bg-white border border-emerald-300 rounded-lg px-2 py-1.5 text-center font-bold text-emerald-700 outline-none focus:border-emerald-500 disabled:bg-slate-50"
                          value={impuestosPorcentajes.beneficio}
                          onChange={(e) => setImpuestosPorcentajes({...impuestosPorcentajes, beneficio: e.target.value})}
                        />
                        <span className="text-emerald-700">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-black text-emerald-700">
                      $ {Math.round(precioVentaCalculado * (Number(impuestosPorcentajes.beneficio) / 100)).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Suma % porcentuales</span>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">{sumaPorcentajesPV.toFixed(3)}%</h4>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase">% Gastos Generales</span>
              <h4 className="text-lg font-black text-slate-800 mt-0.5">
                {costoDirectoBase > 0 ? ((totalGastosGenerales / costoDirectoBase) * 100).toFixed(3) : 0}%
              </h4>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
              <span className="text-[11px] font-bold text-blue-600 uppercase">Coeficiente Primario</span>
              <h4 className="text-lg font-black text-blue-700 mt-0.5">{coeficientePaseCalculado.toFixed(5)}</h4>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Precio de Venta</span>
              <h4 className="text-lg font-black text-emerald-700 mt-0.5">$ {Math.round(precioVentaCalculado).toLocaleString('es-AR')}</h4>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-xs font-black text-amber-800 uppercase tracking-wider">COEFICIENTE DE PASE</span>
              <h2 className="text-3xl font-black text-slate-900 mt-1">{coeficientePaseCalculado.toFixed(4)}</h2>
              <p className="text-xs text-amber-900 font-medium mt-0.5">Precio de Venta = Costo Directo × {coeficientePaseCalculado.toFixed(4)}</p>
            </div>
            <button
              disabled={!esBorrador}
              onClick={() => {
                guardarEstructuraPresupuesto(itemsDetalle, coeficientePaseCalculado);
                alert("¡Coeficiente de Pase y datos comerciales aplicados y guardados con éxito!");
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2"
            >
              Aplicar al Presupuesto
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN PARA EXPORTAR (COSTOS VS VENTA) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 uppercase text-xs">
                Seleccionar Versión ({exportFormato.toUpperCase()})
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-xs text-slate-600">
              ¿Qué versión del presupuesto deseas exportar en formato <span className="font-bold uppercase">{exportFormato}</span>?
            </p>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  if (exportFormato === 'excel') {
                    exportarPresupuestoExcel(presupuesto, itemsCostosExportacion);
                  } else {
                    exportarPresupuestoPDF({ ...presupuesto, codigo: `${presupuesto?.codigo || 'DET'} (COSTOS)` }, cliente, itemsCostosExportacion);
                  }
                  setIsExportModalOpen(false);
                }}
                className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs transition-colors text-left flex justify-between items-center border border-slate-200"
              >
                <span>📊 Presupuesto de Costos</span>
                <span className="text-slate-500 font-normal">$ {Math.round(costoDirectoBase).toLocaleString('es-AR')}</span>
              </button>
              
              <button 
                onClick={() => {
                  if (exportFormato === 'excel') {
                    exportarPresupuestoExcel({ ...presupuesto, codigo: `${presupuesto?.codigo || 'DET'} (VENTA)` }, itemsVentaExportacion);
                  } else {
                    exportarPresupuestoPDF({ ...presupuesto, codigo: `${presupuesto?.codigo || 'DET'} (VENTA)` }, cliente, itemsVentaExportacion);
                  }
                  setIsExportModalOpen(false);
                }}
                className="w-full py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-xs transition-colors text-left flex justify-between items-center border border-amber-200"
              >
                <span>💰 Presupuesto de Venta</span>
                <span className="text-amber-700 font-normal">$ {Math.round(precioVentaGeneral).toLocaleString('es-AR')}</span>
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO RUBRO CON BLOQUEO DE DOBLE CLIC */}
      {isRubroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Crear Nuevo Rubro</h3>
              <button onClick={() => setIsRubroModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearRubro} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar o Escribir Rubro *</label>
                <select 
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase font-semibold outline-none focus:border-amber-500 mb-2"
                  value={nombreNuevoRubro}
                  onChange={(e) => setNombreNuevoRubro(e.target.value)}
                >
                  <option value="">Seleccionar de la lista de Rubros...</option>
                  {rubrosDisponiblesMaestro.map((rName, idx) => (
                    <option key={idx} value={rName}>{rName}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="O escribe un nuevo rubro aquí..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm uppercase font-semibold outline-none focus:border-amber-500"
                  value={nombreNuevoRubro}
                  onChange={(e) => setNombreNuevoRubro(e.target.value.toUpperCase())}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsRubroModalOpen(false)} disabled={isSavingRubro} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSavingRubro} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                  {isSavingRubro ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando...</> : 'Guardar Rubro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NUEVA / EDITAR TAREA CON BLOQUEO DE DOBLE CLIC */}
      {isTareaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">{editingTarea ? 'Modificar Tarea' : 'Agregar Nueva Tarea'}</h3>
              <button onClick={() => setIsTareaModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleGuardarTarea} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seleccionar Rubro *</label>
                <select 
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold outline-none focus:border-amber-500"
                  value={nuevaTarea.rubro}
                  onChange={(e) => setNuevaTarea({...nuevaTarea, rubro: e.target.value})}
                >
                  <option value="">Seleccione un rubro...</option>
                  {Array.isArray(itemsDetalle) && itemsDetalle.length > 0 ? (
                    itemsDetalle.map((r, i) => (
                      <option key={i} value={r.rubro}>{r.rubro}</option>
                    ))
                  ) : (
                    <option value="" disabled>No hay rubros creados</option>
                  )}
                </select>
              </div>

              {!editingTarea && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargar desde el Maestro (para el rubro seleccionado)</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                    onChange={(e) => {
                      const tareaMt = maestroTareas.find(m => String(m.id) === String(e.target.value));
                      if (tareaMt) {
                        let insDetalleParsed = tareaMt.insumos_detalle || tareaMt.Insumos_detalle || [];
                        if (typeof insDetalleParsed === 'string' && insDetalleParsed.trim()) {
                          try { insDetalleParsed = JSON.parse(insDetalleParsed); } catch { insDetalleParsed = []; }
                        }

                        const insumosEstructurados = insDetalleParsed.map(ins => {
                          const insEncontrado = insumosList.find(i => String(i.id) === String(ins.id || ins.insumo_id));
                          return {
                            id: ins.id || ins.insumo_id || '',
                            nombre: ins.nombre || ins.nombre_del_articulo || ins.concepto || '',
                            tipo: insEncontrado?.tipo || ins.tipo || 'Material',
                            unidad: ins.unidad || 'gl',
                            cantidad: Number(ins.cantidad) || 1,
                            costo_unitario: Number(ins.costo_unitario) || Number(ins.costo) || 0
                          };
                        });

                        setNuevaTarea({
                          ...nuevaTarea,
                          rubro: tareaMt.rubro || nuevaTarea.rubro,
                          tarea: tareaMt.tarea || '',
                          unidad: tareaMt.unidad || 'm2',
                          costo_unitario: Number(tareaMt.costo_estimado || tareaMt.costo_unitario) || 0,
                          insumos: insumosEstructurados
                        });
                      }
                    }}
                  >
                    <option value="">Elegir plantilla del Maestro de Tareas...</option>
                    {maestroTareasFiltradas.map(m => (
                      <option key={m.id} value={m.id}>{m.tarea} ($ {Math.round(Number(m.costo_estimado || 0)).toLocaleString('es-AR')})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Tarea *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Descripción de la tarea"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  value={nuevaTarea.tarea}
                  onChange={(e) => setNuevaTarea({...nuevaTarea, tarea: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Insumos / Materiales</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cemento, Arena, Hierro..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  value={typeof nuevaTarea.insumos === 'string' ? nuevaTarea.insumos : (Array.isArray(nuevaTarea.insumos) ? nuevaTarea.insumos.map(i => i.nombre).join(', ') : '')}
                  onChange={(e) => setNuevaTarea({...nuevaTarea, insumos: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Unidad</label>
                  <select 
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none"
                    value={nuevaTarea.unidad}
                    onChange={(e) => setNuevaTarea({...nuevaTarea, unidad: e.target.value})}
                  >
                    <option value="m2">m²</option>
                    <option value="m3">m³</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="gl">gl</option>
                    <option value="hs">hs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad / Cómputo</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none font-bold"
                    value={nuevaTarea.cantidad}
                    onChange={(e) => setNuevaTarea({...nuevaTarea, cantidad: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Costo Unit. ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none font-bold"
                    value={nuevaTarea.costo_unitario}
                    onChange={(e) => setNuevaTarea({...nuevaTarea, costo_unitario: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsTareaModalOpen(false)} disabled={isSavingTarea} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={isSavingTarea} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                  {isSavingTarea ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando...</> : (editingTarea ? 'Actualizar Tarea' : 'Guardar Tarea')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR GASTO GENERAL MANUAL */}
      {isNuevoGGModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nuevo Gasto en Base de Datos</h3>
              <button onClick={() => setIsNuevoGGModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrearGastoGeneral} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Concepto / Nombre *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Licencia Especial"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500"
                  value={nuevoGastoGeneral.concepto}
                  onChange={(e) => setNuevoGastoGeneral({...nuevoGastoGeneral, concepto: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto Unitario ($) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  placeholder="Costo total del gasto"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-bold"
                  value={nuevoGastoGeneral.unitario}
                  onChange={(e) => setNuevoGastoGeneral({...nuevoGastoGeneral, unitario: e.target.value})}
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                * Este concepto se guardará automáticamente en el Maestro de Insumos como "Gastos Generales" y se sumará a esta tabla.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                <button type="button" onClick={() => setIsNuevoGGModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button type="submit" disabled={isSavingGG} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                  {isSavingGG ? <><Loader2 className="w-4 h-4 animate-spin"/> Guardando...</> : 'Guardar y Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}