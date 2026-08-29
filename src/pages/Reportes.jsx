import React, { useState, useMemo } from 'react';
import { Building2, Layers, ShieldCheck, Filter, List, Package } from 'lucide-react';

export default function Reportes(props) {
  // Extracción segura de props soportando múltiples variaciones de nombres y mayúsculas
  const obras = props.obras || props.Obras || [];
  const presupuestos = props.presupuestos || props.Presupuestos || [];
  const certificados = props.certificados || props.Certificados || [];
  const movimientos = props.movimientos || props.Movimientos || props.tesoreria || props.Tesoreria || [];
  const insumos = props.insumos || props.Insumos || [];
  const rubros = props.rubros || props.Rubros || [];
  const facturas = props.facturas || props.Facturas || [];
  const maestroTareasRubros = props.maestroTareasRubros || props.MaestroTareasRubros || props.maestro_tareas_rubros || [];

  const [obraFiltro, setObraFiltro] = useState('todas');
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Estados para el comparativo detallado
  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  // 📝 Estados para la nueva Pestaña de Insumos Mejorada
  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false); // false = por rubro, true = general consolidado

  // Filtrado general de métricas superiores
  const presupuestosFiltrados = obraFiltro === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(obraFiltro));

  const certificadosFiltrados = obraFiltro === 'todas' 
    ? certificados 
    : certificados.filter(c => String(c.obra_id || c.Obra_id || c.obraId) === String(obraFiltro));

  const movimientosFiltrados = obraFiltro === 'todas' 
    ? movimientos 
    : movimientos.filter(m => String(m.obra_id || m.Obra_id || m.obraId) === String(obraFiltro));

  const totalPresupuestado = presupuestosFiltrados.reduce((acc, p) => acc + (Number(p.total || p.Total || p.monto || p.precio_venta || 0) || 0), 0);
  const totalCertificado = certificadosFiltrados.reduce((acc, c) => acc + (Number(c.monto || c.Monto || c.total || 0) || 0), 0);
  const totalCobrado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'ingreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const totalGastado = movimientosFiltrados.filter(m => String(m.tipo || m.Tipo).toLowerCase() === 'egreso').reduce((acc, m) => acc + (Number(m.monto || m.Monto) || 0), 0);
  const resultadoNeto = totalCobrado - totalGastado;

  // FILTRADO ESTRICTO DE PRESUPUESTOS APROBADOS (PARA COMPARATIVO)
  const presupuestosCompFiltrados = (compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(compObraId))
  ).filter(p => {
    const estadoBruto = p.estado_presupuesto || p.Estado_presupuesto || p.estado || p.Estado || '';
    const estadoLimpio = String(estadoBruto).toLowerCase().trim();
    return estadoLimpio === 'aprobado' || estadoLimpio === 'aprobada';
  });

  // Obtener presupuesto seleccionado para el comparativo
  const presupuestoSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(compPresupuestoId));
  
  // 1. Diccionario oficial de Insumos (ID -> Tipo Normalizado)
  const insumosOficialMap = {};
  if (Array.isArray(insumos)) {
    insumos.forEach(insGlobal => {
      const gId = String(insGlobal.id || insGlobal.ID || insGlobal.insumo_id || '').trim();
      const tipoOriginal = String(insGlobal.tipo || insGlobal.Tipo || insGlobal.tipo_insumo || 'Material').trim().toLowerCase();
      if (gId) {
        let tipoNorm = 'Material';
        if (tipoOriginal.includes('mano')) tipoNorm = 'Mano de Obra';
        else if (tipoOriginal.includes('subcontrato')) tipoNorm = 'Subcontrato';
        else if (tipoOriginal.includes('equipo') || tipoOriginal.includes('maquinaria')) tipoNorm = 'Equipo/Maquinaria';
        else tipoNorm = 'Material';

        insumosOficialMap[gId] = tipoNorm;
      }
    });
  }

  // Normalizador de textos avanzado para matching
  const limpiarTexto = (txt) => String(txt || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

  // 2. Diccionario Maestro de Tareas
  const maestroTareasMap = {};
  if (Array.isArray(maestroTareasRubros)) {
    maestroTareasRubros.forEach(itemMaestro => {
      const tareaRaw = itemMaestro.tarea || itemMaestro.nombre || itemMaestro.Tarea || '';
      const tareaKey = limpiarTexto(tareaRaw);
      let insumosDetalleParsed = itemMaestro.insumos_detalle || itemMaestro.Insumos_detalle || itemMaestro.insumos || [];
      
      if (typeof insumosDetalleParsed === 'string' && insumosDetalleParsed.trim()) {
        try { insumosDetalleParsed = JSON.parse(insumosDetalleParsed); } catch { insumosDetalleParsed = []; }
      }
      
      if (tareaKey && Array.isArray(insumosDetalleParsed)) {
        maestroTareasMap[tareaKey] = insumosDetalleParsed;
      }
    });
  }

  const buscarInsumosMaestro = (nombreTareaPresupuesto) => {
    const keyPres = limpiarTexto(nombreTareaPresupuesto);
    if (!keyPres) return [];

    if (maestroTareasMap[keyPres]) {
      return maestroTareasMap[keyPres];
    }

    for (const [mKey, mArr] of Object.entries(maestroTareasMap)) {
      if (keyPres.includes(mKey) || mKey.includes(keyPres)) {
        return mArr;
      }
    }
    return [];
  };

  // Motor de resolución de tipo de insumo
  const obtenerTipoInsumoInfalible = (insumoItem) => {
    const insId = String(insumoItem.id || insumoItem.ID || insumoItem.insumo_id || '').trim();
    if (insId && insumosOficialMap[insId]) {
      return insumosOficialMap[insId];
    }

    const t = String(insumoItem.tipo || insumoItem.Tipo || '').toLowerCase();
    if (t.includes('mano')) return 'Mano de Obra';
    if (t.includes('subcontrato')) return 'Subcontrato';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'Equipo/Maquinaria';

    const nombreIns = String(insumoItem.nombre || insumoItem.nombre_del_articulo || insumoItem.concepto || '').toLowerCase();
    if (nombreIns.includes('mano de obra') || nombreIns.includes('cuadrilla') || nombreIns.includes('oficial') || nombreIns.includes('ayudante') || nombreIns.includes('sereno') || nombreIns.includes('operario')) {
      return 'Mano de Obra';
    }
    if (nombreIns.includes('volquete') || nombreIns.includes('subcontrato') || nombreIns.includes('georadar') || nombreIns.includes('flete') || nombreIns.includes('alquiler') || nombreIns.includes('servicio')) {
      return 'Subcontrato';
    }
    if (nombreIns.includes('andamio') || nombreIns.includes('maquinaria') || nombreIns.includes('equipo') || nombreIns.includes('hormigonera')) {
      return 'Equipo/Maquinaria';
    }

    return 'Material';
  };

  // 📝 PROCESAMIENTO AVANZADO PARA LA PESTAÑA DE INSUMOS
  const presupuestoInsumosSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(insumoPresupuestoId));

  const { insumosPorRubro, insumosGenerales } = useMemo(() => {
    if (!presupuestoInsumosSeleccionado) return { insumosPorRubro: {}, insumosGenerales: {} };

    let itemsDetalle = [];
    try {
      const parsed = typeof presupuestoInsumosSeleccionado.items_detalle === 'string' 
        ? JSON.parse(presupuestoInsumosSeleccionado.items_detalle) 
        : presupuestoInsumosSeleccionado.items_detalle;
      
      itemsDetalle = parsed?.rubros || parsed || [];
    } catch (e) {
      itemsDetalle = [];
    }

    const porRubro = {};
    const general = {
      'MANO DE OBRA': [],
      'MATERIALES': [],
      'SUBCONTRATOS': [],
      'EQUIPOS / HERRAMIENTAS': [],
      'OTROS': []
    };

    itemsDetalle.forEach(rubroObj => {
      const nombreRubro = rubroObj.rubro || 'SIN RUBRO';
      if (!porRubro[nombreRubro]) {
        porRubro[nombreRubro] = {
          'MANO DE OBRA': [],
          'MATERIALES': [],
          'SUBCONTRATOS': [],
          'EQUIPOS / HERRAMIENTAS': [],
          'OTROS': []
        };
      }

      (rubroObj.tareas || []).forEach(tarea => {
        let insumosTarea = tarea.insumos;
        const cantTarea = Number(tarea.cantidad) || 1;
        const costoTarea = Number(tarea.costo_unitario) || 0;

        if (typeof insumosTarea === 'string' && insumosTarea.trim().startsWith('[')) {
          try { insumosTarea = JSON.parse(insumosTarea); } catch { insumosTarea = []; }
        } else if (typeof insumosTarea === 'string' && insumosTarea.trim()) {
          insumosTarea = insumosTarea.split(',').map(nombre => ({
            nombre: nombre.trim(),
            tipo: 'MATERIALES',
            unidad: 'gl',
            cantidad: 1,
            costo_unitario: costoTarea
          }));
        }

        if (!Array.isArray(insumosTarea) || insumosTarea.length === 0) {
          const maestroInsumosEncontrados = buscarInsumosMaestro(tarea.tarea);
          if (Array.isArray(maestroInsumosEncontrados) && maestroInsumosEncontrados.length > 0) {
            insumosTarea = maestroInsumosEncontrados;
          }
        }

        if (Array.isArray(insumosTarea) && insumosTarea.length > 0) {
          insumosTarea.forEach(ins => {
            const tipoResuelto = obtenerTipoInsumoInfalible(ins);
            const categoriaOriginal = String(ins.tipo || ins.categoria || tipoResuelto).trim().toUpperCase();
            
            let catNormalizada = 'MATERIALES';
            if (categoriaOriginal.includes('MANO') || categoriaOriginal.includes('OBRA')) catNormalizada = 'MANO DE OBRA';
            else if (categoriaOriginal.includes('MAT')) catNormalizada = 'MATERIALES';
            else if (categoriaOriginal.includes('SUB')) catNormalizada = 'SUBCONTRATOS';
            else if (categoriaOriginal.includes('EQ') || categoriaOriginal.includes('HERR') || categoriaOriginal.includes('MAQUINARIA')) catNormalizada = 'EQUIPOS / HERRAMIENTAS';

            const cantIns = Number(ins.cantidad) || 1;
            const cUnitIns = Number(ins.costo_unitario) || Number(ins.costo) || costoTarea;
            const cantidadTotal = cantIns * cantTarea;
            const totalInsumo = cantidadTotal * cUnitIns;

            const itemProcesado = {
              rubro: nombreRubro,
              tarea: tarea.tarea || 'Sin tarea',
              nombre: ins.nombre || ins.nombre_del_articulo || ins.concepto || 'Insumo sin nombre',
              unidad: ins.unidad || 'un',
              cantidad: cantidadTotal,
              costo_unitario: cUnitIns,
              total: totalInsumo
            };

            porRubro[nombreRubro][catNormalizada].push(itemProcesado);
            general[catNormalizada].push(itemProcesado);
          });
        } else {
          const itemFallback = {
            rubro: nombreRubro,
            tarea: tarea.tarea || 'Sin tarea',
            nombre: tarea.tarea || 'Índice general',
            unidad: tarea.unidad || 'gl',
            cantidad: cantTarea,
            costo_unitario: costoTarea,
            total: cantTarea * costoTarea
          };
          porRubro[nombreRubro]['MATERIALES'].push(itemFallback);
          general['MATERIALES'].push(itemFallback);
        }
      });
    });

    return { insumosPorRubro: porRubro, insumosGenerales: general };
  }, [presupuestoInsumosSeleccionado]);

  const ordenCategorias = ['MANO DE OBRA', 'MATERIALES', 'SUBCONTRATOS', 'EQUIPOS / HERRAMIENTAS', 'OTROS'];

  // Filtrar movimientos de Tesorería provenientes de RRHH para el presupuesto seleccionado
  const movimientosRrhhPresupuesto = React.useMemo(() => {
    if (!compPresupuestoId) return [];
    return movimientos.filter(m => {
      const tipo = String(m.tipo || m.Tipo || '').toLowerCase();
      if (tipo !== 'egreso') return false;

      const concepto = String(m.concepto || m.Concepto || '');
      const referencia = String(m.referencia || m.Referencia || '');
      const mPresupuestoId = String(m.presupuesto_id || m.Presupuesto_id || '');

      const matchIdDirecto = mPresupuestoId && mPresupuestoId === String(compPresupuestoId);
      const matchTextoPresupuesto = concepto.includes(`Presupuesto: ${compPresupuestoId}`);
      const esRrhh = referencia.toUpperCase().includes('RRHH') || concepto.includes('Sueldos') || concepto.includes('Cargas Sociales');

      return (matchIdDirecto || matchTextoPresupuesto) && esRrhh;
    });
  }, [movimientos, compPresupuestoId]);

  // Obtener salarios acumulados por rubro desde Tesorería (RRHH)
  const obtenerSalariosPorRubro = (nombreRubro) => {
    let totalRubroRrhh = 0;
    movimientosRrhhPresupuesto.forEach(m => {
      const concepto = String(m.concepto || m.Concepto || '');
      const monto = Number(m.monto || m.Monto || 0);
      
      const regex = /\[Rubro:\s*(.*?)\s*-\s*[\d.]+%\s*\]/i;
      const match = concepto.match(regex);
      if (match && match[1]) {
        const rubroMov = match[1].trim();
        if (limpiarTexto(rubroMov) === limpiarTexto(nombreRubro)) {
          totalRubroRrhh += monto;
        }
      }
    });
    return totalRubroRrhh;
  };

  // Procesar rubros del presupuesto desde items_detalle
  let rubrosPresupuestoDetalle = [];
  let gastosGeneralesBase = [];
  let totalPresupuestoRubros = 0;
  let totalPresupuestoGG = 0;

  if (presupuestoSeleccionado && presupuestoSeleccionado.items_detalle) {
    try {
      const parsedDetalle = typeof presupuestoSeleccionado.items_detalle === 'string' 
        ? JSON.parse(presupuestoSeleccionado.items_detalle) 
        : presupuestoSeleccionado.items_detalle;
      
      if (parsedDetalle && parsedDetalle.rubros) {
        rubrosPresupuestoDetalle = parsedDetalle.rubros.map((rubroItem, rIdx) => {
          const tareasList = rubroItem.tareas || [];
          let totalRubro = 0;
          
          let acumuladorComponentes = {
            'Material': 0,
            'Mano de Obra': 0,
            'Subcontrato': 0,
            'Equipo/Maquinaria': 0
          };

          tareasList.forEach(tareaItem => {
            const costoTareaTotal = (Number(tareaItem.cantidad) || 1) * (Number(tareaItem.costo_unitario) || 0);
            totalRubro += costoTareaTotal;

            let insumosDeLaTarea = tareaItem.insumos;
            let listaInsumosParsed = [];
            let esEstructuradoValido = false;

            if (typeof insumosDeLaTarea === 'string' && insumosDeLaTarea.trim()) {
              if (insumosDeLaTarea.trim().startsWith('[')) {
                try {
                  listaInsumosParsed = JSON.parse(insumosDeLaTarea);
                  if (Array.isArray(listaInsumosParsed) && listaInsumosParsed.length > 0) {
                    esEstructuradoValido = true;
                  }
                } catch { listaInsumosParsed = []; }
              } else {
                listaInsumosParsed = [];
              }
            } else if (Array.isArray(insumosDeLaTarea) && insumosDeLaTarea.length > 0) {
              listaInsumosParsed = insumosDeLaTarea;
              esEstructuradoValido = true;
            }

            if (!esEstructuradoValido) {
              listaInsumosParsed = buscarInsumosMaestro(tareaItem.tarea);
              if (Array.isArray(listaInsumosParsed) && listaInsumosParsed.length > 0) {
                esEstructuradoValido = true;
              }
            }

            if (esEstructuradoValido) {
              let subtotalesIns = [];
              let sumaInsCosto = 0;

              listaInsumosParsed.forEach(insumo => {
                const tipoNorm = obtenerTipoInsumoInfalible(insumo);
                const costoIns = (Number(insumo.cantidad) || 1) * (Number(insumo.costo_unitario) || Number(insumo.costo) || 0);
                subtotalesIns.push({ tipo: tipoNorm, costo: costoIns });
                sumaInsCosto += costoIns;
              });

              if (sumaInsCosto > 0) {
                const ratio = costoTareaTotal / sumaInsCosto;
                subtotalesIns.forEach(item => {
                  acumuladorComponentes[item.tipo] = (acumuladorComponentes[item.tipo] || 0) + (item.costo * ratio);
                });
              } else {
                acumuladorComponentes['Material'] = (acumuladorComponentes['Material'] || 0) + costoTareaTotal;
              }
            } else {
              const textoPlano = typeof tareaItem.insumos === 'string' ? tareaItem.insumos : '';
              const textoEvaluacion = (String(tareaItem.tarea || '') + " " + textoPlano).toLowerCase();
              let tipoDef = 'Material';
              
              if (textoEvaluacion.includes('mano') || textoEvaluacion.includes('oficial') || textoEvaluacion.includes('ayudante') || textoEvaluacion.includes('demolicion') || textoEvaluacion.includes('salarios') || textoEvaluacion.includes('colocacion') || textoEvaluacion.includes('armado') || textoEvaluacion.includes('techista') || textoEvaluacion.includes('jornal')) {
                tipoDef = 'Mano de Obra';
              } else if (textoEvaluacion.includes('subcontrato') || textoEvaluacion.includes('volquete') || textoEvaluacion.includes('georadar') || textoEvaluacion.includes('flete') || textoEvaluacion.includes('alquiler') || textoEvaluacion.includes('servicio') || textoEvaluacion.includes('transporte')) {
                tipoDef = 'Subcontrato';
              } else if (textoEvaluacion.includes('equipo') || textoEvaluacion.includes('maquinaria') || textoEvaluacion.includes('andamio') || textoEvaluacion.includes('hormigonera') || textoEvaluacion.includes('herramienta')) {
                tipoDef = 'Equipo/Maquinaria';
              }

              acumuladorComponentes[tipoDef] = (acumuladorComponentes[tipoDef] || 0) + costoTareaTotal;
            }
          });

          totalPresupuestoRubros += totalRubro;

          const componentesActivos = Object.fromEntries(
            Object.entries(acumuladorComponentes).filter(([_, val]) => val > 0.01)
          );

          return {
            id: rIdx,
            nombre: rubroItem.rubro || `Rubro #${rIdx + 1}`,
            total: totalRubro,
            componentes: componentesActivos,
            tareas: tareasList
          };
        });
      }

      // Gastos Generales e Imprevistos
      if (parsedDetalle && parsedDetalle.comercial) {
        if (parsedDetalle.comercial.gastos_generales_insumos) {
          parsedDetalle.comercial.gastos_generales_insumos.forEach((gg, ggIdx) => {
            const cant = Number(gg.cantidad) || 1;
            const unit = Number(gg.unitario) || 0;
            const subtotalGG = cant * unit;
            totalPresupuestoGG += subtotalGG;
            gastosGeneralesBase.push({
              id: `gg-${ggIdx}`,
              concepto: gg.concepto || `Gasto General #${ggIdx + 1}`,
              cantidad: cant,
              unitario: unit,
              total: subtotalGG,
              esImprevistos: false
            });
          });
        }

        const porcentajeImprevistos = Number(parsedDetalle.comercial.porcentaje_imprevistos) || 0;
        const costoDirectoBase = Number(presupuestoSeleccionado.costo_directo) || totalPresupuestoRubros;
        const montoImprevistos = costoDirectoBase * (porcentajeImprevistos / 100);
        
        if (montoImprevistos > 0) {
          totalPresupuestoGG += montoImprevistos;
          gastosGeneralesBase.push({
            id: 'gg-imprevistos',
            concepto: `Imprevistos (${porcentajeImprevistos}% s/ CD)`,
            cantidad: 1,
            unitario: montoImprevistos,
            total: montoImprevistos,
            esImprevistos: true
          });
        }
      }
    } catch (e) {
      console.error("Error al procesar el presupuesto:", e);
    }
  }

  // Imputación real de facturas para este presupuesto
  const facturasPresupuesto = facturas.filter(f => String(f.presupuesto_id || f.Presupuesto_id) === String(compPresupuestoId));
  
  let totalRealGGEspecifico = 0;
  let totalRealImprevistos = 0;

  const gastosGeneralesDetalle = gastosGeneralesBase.map(ggItem => {
    let realAsignado = 0;
    const conceptoLower = ggItem.concepto.toLowerCase();
    
    facturasPresupuesto.forEach(fac => {
      const provId = String(fac.proveedor_id || fac.Proveedor_id || '');
      const tipoInsumoFac = String(fac.tipo_insumo || fac.Tipo_insumo || '').toLowerCase();
      // 🛡️ AQUÍ SE TOMA EL SUBTOTAL NETO (SIN IVA NI PERCEPCIONES)
      const montoFac = Number(fac.subtotal || fac.Subtotal || 0);

      const matchConcepto = tipoInsumoFac && (tipoInsumoFac.includes(conceptoLower) || conceptoLower.includes(tipoInsumoFac));

      if (matchConcepto || ((conceptoLower.includes('licenciado') || conceptoLower.includes('programa')) && provId === '1') || 
          (conceptoLower.includes('visita obligatoria') && provId === '2') || 
          (conceptoLower.includes('técnico') && provId === '6') || 
          (conceptoLower.includes('ropa') && provId === '11') || 
          (conceptoLower.includes('epp') && provId === '14')) {
        
        if (!ggItem.esImprevistos) {
          realAsignado += montoFac;
        }
      } else if (ggItem.esImprevistos) {
        // Imprevistos absorbe las facturas imputadas a Gastos Generales que no caen en un renglón específico exacto
        const rubroFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || '').toLowerCase();
        if (rubroFac.includes('gastos generales') && !['1', '2', '6', '11', '14'].includes(provId) && !tipoInsumoFac.includes('seguridad') && !tipoInsumoFac.includes('ropa') && !tipoInsumoFac.includes('epp')) {
          realAsignado += montoFac;
        }
      }
    });

    if (ggItem.esImprevistos) {
      totalRealImprevistos += realAsignado;
    } else {
      totalRealGGEspecifico += realAsignado;
    }

    return {
      ...ggItem,
      real: realAsignado,
      desvio: ggItem.total - realAsignado
    };
  });

  const granTotalPresupuestado = totalPresupuestoRubros + totalPresupuestoGG;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* CABECERA Y FILTRO GENERAL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
          <p className="text-slate-500 text-sm mt-1">Dashboard, certificaciones y análisis financiero</p>
        </div>
        <div className="w-full md:w-64">
          <select 
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
            value={obraFiltro}
            onChange={(e) => setObraFiltro(e.target.value)}
          >
            <option value="todas">Todas las obras</option>
            {obras.map(o => (
              <option key={o.id || o.ID} value={String(o.id || o.ID)}>{o.nombre || o.Nombre || 'Obra'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS SUPERIORES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-blue-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Presupuestado</p>
          <h3 className="text-2xl font-black text-blue-600 mt-2">$ {totalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Certificado</p>
          <h3 className="text-2xl font-black text-amber-600 mt-2">$ {totalCertificado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-emerald-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Cobrado</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">$ {totalCobrado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm border-l-4 border-l-rose-600">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Gastado</p>
          <h3 className="text-2xl font-black text-rose-600 mt-2">$ {totalGastado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap">
        {['Dashboard', 'Certificaciones', 'Avance Porcentual', 'Listado de Insumos', 'Comparativo'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* CONTENIDO: DASHBOARD */}
      {activeTab === 'Dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Estado de Obras</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-6">
                <div className="relative w-44 h-44 rounded-full bg-amber-500 flex items-center justify-center shadow-inner border-4 border-white">
                  <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center shadow">
                    <Building2 className="w-8 h-8 text-amber-500" />
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                    <span className="font-bold text-slate-700">En presupuesto: {obras.length} obras</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Resumen Financiero</h3>
              <div className="grid grid-cols-2 gap-4 py-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <h4 className="text-2xl font-black text-blue-600">{obras.length}</h4>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">Total Obras</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <h4 className={`text-2xl font-black ${resultadoNeto >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    $ {resultadoNeto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-1">Resultado Neto</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO: CERTIFICACIONES */}
      {activeTab === 'Certificaciones' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-6 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Detalle de Certificaciones</h3>
          {certificados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No hay certificados registrados.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <th className="px-4 py-3">Concepto</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certificados.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-900">{c.concepto || c.descripcion || `Certificado #${idx + 1}`}</td>
                    <td className="px-4 py-3 text-slate-600">{c.fecha || '---'}</td>
                    <td className="px-4 py-3 text-right font-black">$ {Number(c.monto || c.total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-amber-100 text-amber-800">
                        {c.estado || 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CONTENIDO: AVANCE PORCENTUAL */}
      {activeTab === 'Avance Porcentual' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase">Avance Porcentual por Obra</h3>
          <div className="space-y-6">
            {obras.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-8">No hay obras registradas.</div>
            ) : (
              obras.map((o, idx) => (
                <div key={idx} className="space-y-2 border-b pb-4 last:border-b-0">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="text-sm font-extrabold">{o.nombre || o.Nombre}</span>
                    <span className="text-amber-600 text-sm font-black">65% Completado</span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO: LISTADO DE INSUMOS */}
      {activeTab === 'Listado de Insumos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Listado de Insumos por Presupuesto
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Selecciona un presupuesto (cualquier estado) para ver el desglose o consolidado de insumos.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-amber-500 shrink-0" />
                <select
                  className="w-full sm:w-80 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                  value={insumoPresupuestoId}
                  onChange={(e) => setInsumoPresupuestoId(e.target.value)}
                >
                  <option value="">-- Seleccionar Presupuesto (cualquier estado) --</option>
                  {presupuestos.map(p => (
                    <option key={p.id || p.ID} value={String(p.id || p.ID)}>
                      [{p.codigo || 'S/C'}] {p.nombre || p.Nombre} — Estado: {p.estado_presupuesto || p.estado || 'borrador'}
                    </option>
                  ))}
                </select>
              </div>

              {presupuestoInsumosSeleccionado && (
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => setVistaGeneralInsumos(false)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!vistaGeneralInsumos ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Por Rubro
                  </button>
                  <button
                    onClick={() => setVistaGeneralInsumos(true)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${vistaGeneralInsumos ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <List className="w-3.5 h-3.5" /> General
                  </button>
                </div>
              )}
            </div>
          </div>

          {!presupuestoInsumosSeleccionado ? (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Selecciona un presupuesto arriba para desplegar el listado de insumos.
            </div>
          ) : vistaGeneralInsumos ? (
            <div className="space-y-6">
              <div className="border-b pb-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase">Listado General Consolidado de Insumos</h4>
                <p className="text-[11px] text-slate-500">Agrupado por categoría (Mano de obra, Materiales, Subcontratos, Equipos/Herramientas) en todo el presupuesto.</p>
              </div>

              <div className="space-y-6">
                {ordenCategorias.map(cat => {
                  const lista = insumosGenerales[cat];
                  if (!lista || lista.length === 0) return null;

                  const totalCat = lista.reduce((acc, item) => acc + item.total, 0);

                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                        <h5 className="text-xs font-black text-amber-600 uppercase tracking-wider">
                          {cat} ({lista.length} ítems)
                        </h5>
                        <span className="text-xs font-bold text-slate-700">
                          Total: $ {Math.round(totalCat).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                              <th className="py-2.5 px-3">Insumo / Artículo</th>
                              <th className="py-2.5 px-3">Rubro de Origen</th>
                              <th className="py-2.5 px-3">Tarea Asociada</th>
                              <th className="py-2.5 px-2 text-center">Unidad</th>
                              <th className="py-2.5 px-2 text-center">Cantidad Total</th>
                              <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                              <th className="py-2.5 px-3 text-right">Total ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {lista.map((ins, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">{ins.nombre}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-600 uppercase text-[11px]">{ins.rubro}</td>
                                <td className="py-2.5 px-3 text-slate-500">{ins.tarea}</td>
                                <td className="py-2.5 px-2 text-center uppercase text-slate-600">{ins.unidad}</td>
                                <td className="py-2.5 px-2 text-center font-bold text-slate-800">{ins.cantidad}</td>
                                <td className="py-2.5 px-3 text-right text-slate-600">$ {Math.round(ins.costo_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">$ {Math.round(ins.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(insumosPorRubro).length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Este presupuesto no contiene tareas ni insumos cargados.
                </div>
              ) : (
                Object.entries(insumosPorRubro).map(([nombreRubro, categorias]) => (
                  <div key={nombreRubro} className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800 text-white px-6 py-3 font-extrabold text-xs uppercase tracking-wide flex items-center justify-between">
                      <span>Rubro: {nombreRubro}</span>
                    </div>
                    
                    <div className="p-6 space-y-6 bg-white">
                      {ordenCategorias.map(cat => {
                        const listaInsumos = categorias[cat];
                        if (!listaInsumos || listaInsumos.length === 0) return null;

                        const totalCatRubro = listaInsumos.reduce((acc, item) => acc + item.total, 0);

                        return (
                          <div key={cat} className="space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                              <h5 className="text-xs font-black text-amber-600 uppercase tracking-wider">
                                {cat}
                              </h5>
                              <span className="text-[11px] font-bold text-slate-600">
                                Subtotal: $ {Math.round(totalCatRubro).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200">
                                    <th className="py-2 px-3">Insumo / Artículo</th>
                                    <th className="py-2 px-3">Asociado a Tarea</th>
                                    <th className="py-2 px-2 text-center">Unidad</th>
                                    <th className="py-2 px-2 text-center">Cantidad Total</th>
                                    <th className="py-2 px-3 text-right">Costo Unit.</th>
                                    <th className="py-2 px-3 text-right">Total ($)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {listaInsumos.map((ins, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                      <td className="py-2 px-3 font-bold text-slate-800">{ins.nombre}</td>
                                      <td className="py-2 px-3 text-slate-500">{ins.tarea}</td>
                                      <td className="py-2 px-2 text-center uppercase text-slate-600">{ins.unidad}</td>
                                      <td className="py-2 px-2 text-center font-bold text-slate-800">{ins.cantidad}</td>
                                      <td className="py-2 px-3 text-right text-slate-600">$ {Math.round(ins.costo_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-3 text-right font-black text-slate-900">$ {Math.round(ins.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: COMPARATIVO DETALLADO */}
      {activeTab === 'Comparativo' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase">Análisis Comparativo Detallado (Presupuesto vs Real)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Desglose por rubros, gastos generales y sueldos de RRHH</p>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <select 
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                value={compObraId}
                onChange={e => { setCompObraId(e.target.value); setCompPresupuestoId(''); }}
              >
                <option value="todas">Todas las obras</option>
                {obras.map(o => (
                  <option key={o.id || o.ID} value={String(o.id || o.ID)}>{o.nombre || o.Nombre || 'Obra'}</option>
                ))}
              </select>

              <select 
                className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-amber-500 shadow-sm cursor-pointer"
                value={compPresupuestoId}
                onChange={e => setCompPresupuestoId(e.target.value)}
              >
                <option value="">Seleccionar Presupuesto (Aprobados)...</option>
                {presupuestosCompFiltrados.map(p => (
                  <option key={p.id || p.ID} value={String(p.id || p.ID)}>{p.codigo || 'PRES'} - {p.nombre || p.Nombre || 'Presupuesto'}</option>
                ))}
              </select>
            </div>
          </div>

          {!compPresupuestoId ? (
            <div className="py-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Selecciona una obra y un presupuesto aprobado para visualizar el comparativo desglosado.
            </div>
          ) : (() => {
            let totalRealRubrosCalculado = 0;

            return (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <th className="px-4 py-3">Rubro / Componente / Gastos Generales</th>
                      <th className="px-4 py-3 text-right">Presupuestado Aprobado ($)</th>
                      <th className="px-4 py-3 text-right">Imputaciones Reales (Facturas) ($)</th>
                      <th className="px-4 py-3 text-right">Salarios Semanales (RRHH) ($)</th>
                      <th className="px-4 py-3 text-right">Variación / Desvío ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* SECCIÓN 1: RUBROS CON SUS COMPONENTES Y SALARIOS DE RRHH */}
                    {rubrosPresupuestoDetalle.map((rubro) => {
                      const componentesEntradas = Object.entries(rubro.componentes);
                      
                      // 🛡️ CÁLCULO DE FACTURAS REALES PARA EL RUBRO (USANDO SUBTOTAL NETO)
                      const realFacturasRubro = facturasPresupuesto
                        .filter(fac => {
                          const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || '').trim();
                          if (rFac.toLowerCase().includes('gastos generales')) return false;
                          return limpiarTexto(rFac) === limpiarTexto(rubro.nombre);
                        })
                        .reduce((acc, fac) => acc + Number(fac.subtotal || fac.Subtotal || 0), 0);

                      const realSalariosRubro = obtenerSalariosPorRubro(rubro.nombre);
                      const totalRealRubroActual = realFacturasRubro + realSalariosRubro;
                      totalRealRubrosCalculado += totalRealRubroActual;
                      const desvioRubro = rubro.total - totalRealRubroActual;

                      return (
                        <React.Fragment key={`rub-${rubro.id}`}>
                          <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-200">
                            <td className="px-4 py-3 uppercase text-amber-600 flex items-center gap-2">
                              <Layers className="w-4 h-4 text-amber-500" />
                              {rubro.nombre}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">
                              $ {rubro.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-700">
                              $ {realFacturasRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-amber-600">
                              $ {realSalariosRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`px-4 py-3 text-right font-black ${desvioRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              $ {desvioRubro.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {componentesEntradas.map(([compNombre, montoComp], cIdx) => {
                            const esManoDeObra = limpiarTexto(compNombre).includes('mano') || limpiarTexto(compNombre).includes('obra');
                            const realComp = esManoDeObra ? realSalariosRubro : 0;
                            const desvioComp = montoComp - realComp;

                            return (
                              <tr key={cIdx} className="hover:bg-slate-50/80">
                                <td className="px-4 py-2.5 pl-8 text-slate-600 font-medium flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  {compNombre}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                  $ {montoComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-700">$ 0,00</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-amber-600">
                                  $ {realComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-black ${desvioComp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  $ {desvioComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}

                    {/* SECCIÓN 2: GASTOS GENERALES E IMPREVISTOS */}
                    {gastosGeneralesDetalle.length > 0 && (
                      <React.Fragment>
                        <tr className="bg-amber-50 font-extrabold text-slate-900 border-t-2 border-amber-200">
                          <td className="px-4 py-3 uppercase text-amber-800 flex items-center gap-2" colSpan={1}>
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            GASTOS GENERALES (SEGURIDAD E HIGIENE / EPP / ROPA / IMPREVISTOS)
                          </td>
                          <td className="px-4 py-3 text-right font-black text-amber-900">
                            $ {totalPresupuestoGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-700">
                            $ {(totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">$ 0,00</td>
                          <td className={`px-4 py-3 text-right font-black ${totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            $ {(totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {gastosGeneralesDetalle.map((ggItem) => {
                          const realItemGG = ggItem.real || 0;
                          const desvioGG = ggItem.desvio !== undefined ? ggItem.desvio : (ggItem.total - realItemGG);

                          return (
                            <tr key={ggItem.id} className="hover:bg-amber-50/50">
                              <td className="px-4 py-2.5 pl-8 text-slate-700 font-medium flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {ggItem.concepto} {!ggItem.esImprevistos && `(Cant: ${ggItem.cantidad})`}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                $ {ggItem.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                $ {realItemGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-amber-600">$ 0,00</td>
                              <td className={`px-4 py-2.5 text-right font-black ${desvioGG >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                $ {desvioGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    )}

                    {/* FILAS DE TOTALES AL PIE */}
                    <tr className="bg-slate-200 text-slate-900 font-extrabold border-t-2 border-slate-400">
                      <td className="px-4 py-3 uppercase">SUBTOTAL RUBROS</td>
                      <td className="px-4 py-3 text-right">$ {totalPresupuestoRubros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        $ {rubrosPresupuestoDetalle.reduce((acc, r) => {
                          const fRubro = facturasPresupuesto
                            .filter(fac => {
                              const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || '').trim();
                              if (rFac.toLowerCase().includes('gastos generales')) return false;
                              return limpiarTexto(rFac) === limpiarTexto(r.nombre);
                            })
                            .reduce((sum, fac) => sum + Number(fac.subtotal || fac.Subtotal || 0), 0);
                          return acc + fRubro;
                        }, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">$ {movimientosRrhhPresupuesto.reduce((acc, m) => acc + Number(m.monto || m.Monto || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">$ {(totalPresupuestoRubros - totalRealRubrosCalculado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    <tr className="bg-amber-200 text-amber-950 font-extrabold">
                      <td className="px-4 py-3 uppercase">TOTAL GASTOS GENERALES E IMPREVISTOS</td>
                      <td className="px-4 py-3 text-right">$ {totalPresupuestoGG.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">$ {(totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">$ 0,00</td>
                      <td className="px-4 py-3 text-right">$ {(totalPresupuestoGG - (totalRealGGEspecifico + totalRealImprevistos)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {(() => {
                      const totalFacturasRubrosNeto = rubrosPresupuestoDetalle.reduce((acc, r) => {
                        const fRubro = facturasPresupuesto
                          .filter(fac => {
                            const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || '').trim();
                            if (rFac.toLowerCase().includes('gastos generales')) return false;
                            return limpiarTexto(rFac) === limpiarTexto(r.nombre);
                          })
                          .reduce((sum, fac) => sum + Number(fac.subtotal || fac.Subtotal || 0), 0);
                        return acc + fRubro;
                      }, 0);

                      const granTotalReal = totalRealRubrosCalculado + totalRealGGEspecifico + totalRealImprevistos;
                      const granTotalDesvio = granTotalPresupuestado - granTotalReal;

                      return (
                        <tr className="bg-slate-900 text-white font-black text-sm">
                          <td className="px-4 py-4 uppercase">GRAN TOTAL GENERAL</td>
                          <td className="px-4 py-4 text-right">$ {granTotalPresupuestado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right">$ {(totalFacturasRubrosNeto + totalRealGGEspecifico + totalRealImprevistos).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right">$ {movimientosRrhhPresupuesto.reduce((acc, m) => acc + Number(m.monto || m.Monto || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-4 text-right ${granTotalDesvio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            $ {granTotalDesvio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}