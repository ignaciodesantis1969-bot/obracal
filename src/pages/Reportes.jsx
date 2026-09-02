import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Layers, ShieldCheck, Filter, List, Package, Calendar, Plus, CheckCircle2, TrendingUp, Printer, Trash2, Eye, FileText, ExternalLink, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GOOGLE_SCRIPT_URL } from '@/api';

const CONTRATO_DEFAULT = [
  {
    id: "1",
    codigo: "CM001",
    nombre: "Mantenimiento Correctivo Edilicio",
    nombre_contrato: "Mantenimiento Correctivo Edilicio",
    cliente: "LDC ARGENTINA S.A.",
    estado: "Activo",
    proveedorKey: "AT1020",
    clienteKey: "CM7030",
    proveedorCargo: "Oficial a cargo del Site",
    proveedorNombre: "Alexander Torres Lopez",
    clienteCargo: "Gerente de Planta",
    clienteNombre: "Cristian Matei",
    descripcion: "Proveer el servicio mantenimiento correctivo edilicio en la planta de logistica de algodon"
  }
];

export default function Reportes(props) {
  const { user } = useAuth();

  const userRole = String(
    props.role || props.userRole || user?.role || user?.rol || props.user?.role || ''
  ).toLowerCase();
  const esOperador = userRole.includes('operador') || userRole === 'operator';

  const obras = props.obras || props.Obras || [];
  const presupuestos = props.presupuestos || props.Presupuestos || [];
  const certificados = props.certificados || props.Certificados || [];
  const movimientos = props.movimientos || props.Movimientos || props.tesoreria || props.Tesoreria || [];
  const insumos = props.insumos || props.Insumos || [];
  const empleadosListProps = props.empleados || props.Empleados || props.personal || props.Personal || [];
  const rubros = props.rubros || props.Rubros || [];
  const facturas = props.facturas || props.Facturas || [];
  const maestroTareasRubros = props.maestroTareasRubros || props.MaestroTareasRubros || props.maestro_tareas_rubros || [];

  const [fetchedContratos, setFetchedContratos] = useState([]);
  const [fetchedReportesSice, setFetchedReportesSice] = useState([]);
  const [fetchedEmpleados, setFetchedEmpleados] = useState([]);

  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        let lista = [];
        if (Array.isArray(data)) lista = data;
        else if (data && Array.isArray(data.data)) lista = data.data;
        else if (data && Array.isArray(data.ContratosMantenimiento)) lista = data.ContratosMantenimiento;
        else if (data && typeof data === 'object') {
          const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
          if (foundKey) lista = data[foundKey];
        }
        if (lista.length > 0) setFetchedContratos(lista);
      })
      .catch(() => {});

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'ReportesSice', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        let lista = [];
        if (Array.isArray(data)) lista = data;
        else if (data && Array.isArray(data.data)) lista = data.data;
        else if (data && Array.isArray(data.ReportesSice)) lista = data.ReportesSice;
        else if (data && Array.isArray(data.reportes_sice)) lista = data.reportes_sice;
        else if (data && typeof data === 'object') {
          const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
          if (foundKey) lista = data[foundKey];
        }
        if (lista.length > 0) setFetchedReportesSice(lista);
      })
      .catch(() => {});

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Empleados', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        let lista = [];
        if (Array.isArray(data)) lista = data;
        else if (data && Array.isArray(data.data)) lista = data.data;
        else if (data && Array.isArray(data.Empleados)) lista = data.Empleados;
        else if (data && typeof data === 'object') {
          const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
          if (foundKey) lista = data[foundKey];
        }
        if (lista.length > 0) setFetchedEmpleados(lista);
      })
      .catch(() => {});
  }, []);

  const contratosList = useMemo(() => {
    const propsC = props.contratos || props.Contratos || props.contratosMantenimiento || props.ContratosMantenimiento || props.contratos_mantenimiento;
    if (Array.isArray(propsC) && propsC.length > 0) return propsC;
    if (fetchedContratos.length > 0) return fetchedContratos;
    return CONTRATO_DEFAULT;
  }, [props.contratos, props.Contratos, props.contratosMantenimiento, props.ContratosMantenimiento, props.contratos_mantenimiento, fetchedContratos]);

  const reportesSiceListProps = props.reportesSice || props.ReportesSice || props.reportes_sice || [];

  const allReportesSice = useMemo(() => {
    if (reportesSiceListProps.length > 0) return reportesSiceListProps;
    return fetchedReportesSice;
  }, [reportesSiceListProps, fetchedReportesSice]);

  const listaEmpleadosActivos = useMemo(() => {
    const fuente = empleadosListProps.length > 0 ? empleadosListProps : (fetchedEmpleados.length > 0 ? fetchedEmpleados : [
      { id: '1', nombre: 'Callapiña Wilfredo Cristian', especialidad: 'Oficial Especializado', estado: 'ACTIVO' },
      { id: '2', nombre: 'Caballero Jonatan Matias', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '3', nombre: 'Oyola Carlos Alberto', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '4', nombre: 'Oyola Cristian Damian', especialidad: 'Medio Oficial', estado: 'ACTIVO' },
      { id: '5', nombre: 'Torres Lopez John Alexander', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '6', nombre: 'Palacio Sanchez Joderson', especialidad: 'Medio Oficial', estado: 'ACTIVO' }
    ]);

    return fuente.filter(emp => {
      const estadoVal = String(emp.estado || emp.Estado || emp.status || 'ACTIVO').trim().toUpperCase();
      return estadoVal === 'ACTIVO';
    });
  }, [empleadosListProps, fetchedEmpleados]);

  const [obraFiltro, setObraFiltro] = useState('todas');
  const [activeTab, setActiveTab] = useState(esOperador ? 'Reportes Diarios' : 'Certificaciones');

  useEffect(() => {
    if (esOperador) {
      setActiveTab('Reportes Diarios');
    }
  }, [esOperador]);

  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false);

  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));
  const [siceParteNro, setSiceParteNro] = useState('00001');
  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
  ]);

  const calcularTotalHorasSice = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFin, mFin] = fin.split(':').map(Number);
    let diffMinutos = (hFin * 60 + mFin) - (hIni * 60 + mIni);
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return 0;
    const horasConProporcional = horasEfectivas * (11 / 9);
    return Number(horasConProporcional.toFixed(2));
  };

  const totalHorasDefaultCalculado = useMemo(() => {
    return siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it.horaComienzo, it.horaFin), 0);
  }, [siceItems]);

  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);

  useEffect(() => {
    if (listaEmpleadosActivos.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = listaEmpleadosActivos.slice(0, 1).map(emp => {
        const nombreEmp = emp.nombre || emp.Nombre || emp.empleado || emp.apellido || 'Operario';
        const isCallapina = nombreEmp.toLowerCase().includes('callapiña') || nombreEmp.toLowerCase().includes('callapina');
        const abrevEmp = isCallapina ? 'S' : 'OE';

        return {
          id: emp.id || emp.ID || Math.random().toString(),
          nombre: nombreEmp,
          abreviacion: abrevEmp,
          horas: '' 
        };
      });
      setOperariosSeleccionados(iniciales);
    }
  }, [listaEmpleadosActivos]);

  const [siceRespProveedor, setSiceRespProveedor] = useState({ cargo: '', nombre: '', clave: '' });
  const [siceRespCliente, setSiceRespCliente] = useState({ cargo: '', nombre: '', clave: '' });
  const [parteVisualizando, setParteVisualizando] = useState(null);
  const [isSavingSice, setIsSavingSice] = useState(false);

  const buscarValorEnObjeto = (obj, posibleClaves, defecto = '') => {
    if (!obj) return defecto;
    for (const pk of posibleClaves) {
      const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of Object.entries(obj)) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanPk && v !== undefined && v !== null && String(v).trim() !== '') {
          return String(v).trim();
        }
      }
    }
    return defecto;
  };

  const extraerDatosContrato = (contrato) => {
    if (!contrato) return { pCargo: '', pNombre: '', pKey: 'AT1020', cCargo: '', cNombre: '', cKey: 'CM7030' };

    let objData = { ...contrato };
    ['descripcion', 'detalle', 'config', 'datos'].forEach(campo => {
      if (typeof contrato[campo] === 'string') {
        const val = contrato[campo];
        try {
          if (val.includes('{')) {
            const parts = val.split(/[{]/);
            if (parts.length > 1) {
              const jsonStr = '{' + parts.slice(1).join('{');
              const parsed = JSON.parse(jsonStr);
              objData = { ...objData, ...parsed };
            }
          }
        } catch (e) {}
      }
    });

    let pCargo = buscarValorEnObjeto(objData, ['proveedor_cargo', 'proveedorCargo', 'cargoProveedor', 'cargo_proveedor', 'puestoProveedor']) || objData.proveedor?.cargo || '';
    let pNombre = buscarValorEnObjeto(objData, ['proveedor_nombre', 'proveedorNombre', 'nombreProveedor', 'nombre_proveedor', 'responsableProveedor']) || objData.proveedor?.nombre || '';
    let pKey = buscarValorEnObjeto(objData, ['proveedor_key', 'proveedorKey', 'claveProveedor', 'clave_proveedor', 'proveedor_clave']) || objData.proveedor?.key || 'AT1020';

    let cCargo = buscarValorEnObjeto(objData, ['cliente_cargo', 'clienteCargo', 'cargoCliente', 'cargo_cliente', 'puestoCliente']) || objData.cliente?.cargo || '';
    let cNombre = buscarValorEnObjeto(objData, ['cliente_nombre', 'clienteNombre', 'nombreCliente', 'nombre_cliente', 'responsableCliente']) || objData.cliente?.nombre || '';
    let cKey = buscarValorEnObjeto(objData, ['cliente_key', 'clienteKey', 'claveCliente', 'clave_cliente', 'cliente_clave']) || objData.cliente?.key || 'CM7030';

    return { pCargo, pNombre, pKey, cCargo, cNombre, cKey };
  };

  const clavesContratoActual = useMemo(() => {
    const contratoActivo = contratosList.find(c => {
      const cId = String(c.id || c.ID || c.codigo || c.Codigo || '').trim();
      return cId === String(contratoSeleccionadoId).trim();
    });

    if (contratoActivo) {
      const extracted = extraerDatosContrato(contratoActivo);
      return { proveedorKey: extracted.pKey, clienteKey: extracted.cKey };
    }
    return { proveedorKey: 'AT1020', clienteKey: 'CM7030' };
  }, [contratosList, contratoSeleccionadoId]);

  // Efecto para actualizar cargos y nombres del contrato seleccionado SIN borrar las contraseñas
  useEffect(() => {
    if (contratoSeleccionadoId) {
      const contrato = contratosList.find(c => {
        const cId = String(c.id || c.ID || c.codigo || c.Codigo || '').trim();
        return cId === String(contratoSeleccionadoId).trim();
      });

      if (contrato) {
        const { pCargo, pNombre, cCargo, cNombre } = extraerDatosContrato(contrato);
        setSiceRespProveedor(prev => ({
          cargo: pCargo,
          nombre: pNombre,
          clave: prev.clave || ''
        }));
        setSiceRespCliente(prev => ({
          cargo: cCargo,
          nombre: cNombre,
          clave: prev.clave || ''
        }));
      }
    }
  }, [contratoSeleccionadoId, contratosList]);

  // Historial de partes dinámico (muestra todos si no hay contrato seleccionado, o los filtra si hay uno seleccionado)
  const sicePartesAprobados = useMemo(() => {
    let lista = allReportesSice;
    if (contratoSeleccionadoId) {
      lista = allReportesSice.filter(r => {
        if (!r) return false;
        const rContratoId = String(
          r.contratoid || r.contratoId || r.contrato_id || r.ContratoId || 
          r.id_contrato || r.IdContrato || ''
        ).trim();

        if (rContratoId === String(contratoSeleccionadoId).trim()) return true;

        const valores = Object.values(r).map(v => String(v).trim());
        return valores.includes(String(contratoSeleccionadoId).trim());
      });
    }

    return lista.map(r => {
      let itemsParsed = r.items;
      if (typeof itemsParsed === 'string') {
        try { itemsParsed = JSON.parse(itemsParsed); } catch { itemsParsed = []; }
      }
      let operariosParsed = r.operarios || r.operariosPresentes || [];
      if (typeof operariosParsed === 'string') {
        try { operariosParsed = JSON.parse(operariosParsed); } catch { operariosParsed = []; }
      }
      let provParsed = r.proveedor;
      if (typeof provParsed === 'string') {
        try { provParsed = JSON.parse(provParsed); } catch { provParsed = { nombre: '', cargo: '' }; }
      }
      let cliParsed = r.cliente;
      if (typeof cliParsed === 'string') {
        try { cliParsed = JSON.parse(cliParsed); } catch { cliParsed = { nombre: '', cargo: '' }; }
      }
      return {
        id: r.id || r.ID || `sice-${Math.random()}`,
        nro: r.nro || r.numero || '00001',
        fecha: r.fecha || '',
        contratoid: r.contratoid || r.contratoId || '',
        items: Array.isArray(itemsParsed) ? itemsParsed : [],
        operarios: Array.isArray(operariosParsed) ? operariosParsed : [],
        proveedor: provParsed,
        cliente: cliParsed,
        totalHorasSuma: Number(r.totalhorassuma || r.totalHorasSuma || 0),
        pdfUrl: r.pdf_url || r.pdfUrl || ''
      };
    });
  }, [contratoSeleccionadoId, allReportesSice]);

  const agregarOperarioFila = () => {
    setOperariosSeleccionados([
      ...operariosSeleccionados,
      { id: Math.random().toString(), nombre: '', abreviacion: 'OE', horas: '' }
    ]);
  };

  const actualizarOperarioFila = (index, campo, valor) => {
    const actualizados = [...operariosSeleccionados];
    actualizados[index][campo] = valor;
    setOperariosSeleccionados(actualizados);
  };

  const eliminarOperarioFila = (index) => {
    setOperariosSeleccionados(operariosSeleccionados.filter((_, i) => i !== index));
  };

  const eliminarParteServidor = async (idParte) => {
    if (!window.confirm("¿Está seguro de eliminar este parte diario?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'ReportesSice',
          action: 'delete',
          id: idParte
        })
      });
      setFetchedReportesSice(prev => prev.filter(p => String(p.id) !== String(idParte)));
      alert("Parte diario eliminado exitosamente.");
    } catch (err) {
      console.error("Error al eliminar parte:", err);
      alert("Ocurrió un error al intentar eliminar el parte.");
    }
  };

  const agregarFilaSice = () => {
    if (siceItems.length >= 10) {
      alert("El parte diario SICE permite un máximo de 10 ítems por documento.");
      return;
    }
    setSiceItems([
      ...siceItems,
      { id: siceItems.length + 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
    ]);
  };

  const actualizarItemSice = (index, campo, valor) => {
    const actualizados = [...siceItems];
    actualizados[index][campo] = valor;
    setSiceItems(actualizados);
  };

  const aprobarYArchivarParteSice = async (e) => {
    e.preventDefault();
    if (!contratoSeleccionadoId) {
      alert("Por favor seleccione un Contrato de Mantenimiento asociado para corroborar las claves y guardar el parte.");
      return;
    }

    const regexClave = /^[A-Za-z]{2}\d{4}$/;
    if (!regexClave.test(siceRespProveedor.clave)) {
      alert("La clave del Responsable Proveedor debe tener exactamente 2 letras y 4 números (Ej: AB1234).");
      return;
    }
    if (!regexClave.test(siceRespCliente.clave)) {
      alert("La clave del Responsable Cliente debe tener exactamente 2 letras y 4 números (Ej: CD5678).");
      return;
    }

    if (siceRespProveedor.clave.toUpperCase() !== clavesContratoActual.proveedorKey.toUpperCase()) {
      alert("La clave ingresada para el Responsable Proveedor no coincide con la registrada en el contrato.");
      return;
    }
    if (siceRespCliente.clave.toUpperCase() !== clavesContratoActual.clienteKey.toUpperCase()) {
      alert("La clave ingresada para el Responsable Cliente no coincide con la registrada en el contrato.");
      return;
    }

    const totalHsSuma = siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it.horaComienzo, it.horaFin), 0);

    const operariosFinales = operariosSeleccionados.map(op => ({
      nombre: op.nombre,
      abreviacion: op.abreviacion,
      horas: op.horas !== '' ? Number(op.horas) : totalHsSuma
    }));

    setIsSavingSice(true);

    try {
      const payloadPdf = {
        action: 'guardarYGenerarPDF',
        tabla: 'ReportesSice',
        contratoId: contratoSeleccionadoId,
        fecha: siceFecha,
        nro: siceParteNro,
        items: siceItems,
        operarios: operariosFinales,
        proveedor: { cargo: siceRespProveedor.cargo, nombre: siceRespProveedor.nombre },
        cliente: { cargo: siceRespCliente.cargo, nombre: siceRespCliente.nombre },
        totalHorasSuma: totalHsSuma
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadPdf)
      });
      const resultado = await res.json();

      if (!resultado.success) {
        alert("Error al generar el PDF en Google Drive: " + (resultado.error || 'Desconocido'));
        setIsSavingSice(false);
        return;
      }

      const nuevoParte = {
        id: `sice-${Date.now()}`,
        nro: siceParteNro,
        fecha: siceFecha,
        contratoid: contratoSeleccionadoId,
        items: [...siceItems],
        operarios: operariosFinales,
        proveedor: { cargo: siceRespProveedor.cargo, nombre: siceRespProveedor.nombre },
        cliente: { cargo: siceRespCliente.cargo, nombre: siceRespCliente.nombre },
        totalHorasSuma: totalHsSuma,
        pdfUrl: resultado.pdfUrl 
      };

      setFetchedReportesSice(prev => [nuevoParte, ...prev]);

      const siguienteNro = String(Number(siceParteNro) + 1).padStart(5, '0');
      setSiceParteNro(siguienteNro);
      setSiceItems([{ id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }]);
      setSiceRespProveedor(prev => ({ ...prev, clave: '' }));
      setSiceRespCliente(prev => ({ ...prev, clave: '' }));

      alert("¡Parte Diario aprobado, PDF generado en Drive y guardado con éxito!");

    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Ocurrió un error de conexión al generar el PDF.");
    } finally {
      setIsSavingSice(false);
    }
  };

  const presupuestosFiltrados = obraFiltro === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(obraFiltro));

  const certificadosFiltrados = obraFiltro === 'todas' 
    ? certificados 
    : certificados.filter(c => String(c.obra_id || c.Obra_id || c.obraId) === String(obraFiltro));

  const movimientosFiltrados = obraFiltro === 'todas' 
    ? movimientos 
    : movimientos.filter(m => String(m.obra_id || m.Obra_id || m.obraId) === String(obraFiltro));

  const presupuestosCompFiltrados = (compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p.obra_id || p.Obra_id || p.obraId) === String(compObraId))
  ).filter(p => {
    const estadoBruto = p.estado_presupuesto || p.Estado_presupuesto || p.estado || p.Estado || '';
    const estadoLimpio = String(estadoBruto).toLowerCase().trim();
    return estadoLimpio === 'aprobado' || estadoLimpio === 'aprobada';
  });

  const presupuestoSeleccionado = presupuestos.find(p => String(p.id || p.ID) === String(compPresupuestoId));
  
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

  const limpiarTexto = (txt) => String(txt || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();

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

  const facturasPresupuesto = facturas.filter(f => String(f.presupuesto_id || f.Presupuesto_id) === String(compPresupuestoId));
  
  let totalRealGGEspecifico = 0;
  let totalRealImprevistos = 0;
  const facturasAsignadasGG = new Set();

  const gastosGeneralesDetalle = gastosGeneralesBase.map(ggItem => {
    let realAsignado = 0;
    const cLower = ggItem.concepto.toLowerCase();
    const cClean = limpiarTexto(ggItem.concepto);

    if (!ggItem.esImprevistos) {
      facturasPresupuesto.forEach((fac, fIdx) => {
        if (facturasAsignadasGG.has(fIdx)) return;

        const tipoInsumoFac = String(
          fac.tipo_insumo || fac.Tipo_insumo || 
          fac.renglon || fac.Renglon || 
          fac.concepto || fac.Concepto || 
          fac.descripcion || fac.Descripcion || 
          fac.detalle_gasto || fac.Detalle_gasto || ''
        ).toLowerCase();

        const limpioFac = limpiarTexto(tipoInsumoFac);
        const rubroFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || fac.Rubro || '').toLowerCase();
        const montoFac = Number(fac.subtotal || fac.Subtotal || 0);

        let match = false;

        if (cLower.includes('programa') || cLower.includes('licenciado')) {
          match = limpioFac.includes('programa') || limpioFac.includes('licenciado') || (limpioFac.includes('seguridad') && !limpioFac.includes('visita') && !limpioFac.includes('tecnico'));
        } else if (cLower.includes('visita')) {
          match = limpioFac.includes('visita') || limpioFac.includes('obligatoria');
        } else if (cLower.includes('tecnico') || cLower.includes('técnico')) {
          match = limpioFac.includes('tecnico') || limpioFac.includes('técnico');
        } else if (cLower.includes('ropa')) {
          match = limpioFac.includes('ropa') || limpioFac.includes('pantalon') || limpioFac.includes('camisa') || limpioFac.includes('botines');
        } else if (cLower.includes('epp')) {
          match = limpioFac.includes('epp') || limpioFac.includes('casco') || limpioFac.includes('guantes') || limpioFac.includes('gafas') || limpioFac.includes('copa');
        } else if (cLower.includes('examen') || cLower.includes('medico') || cLower.includes('médico')) {
          match = limpioFac.includes('examen') || limpioFac.includes('medico') || limpioFac.includes('médico') || limpioFac.includes('aptitud');
        } else if (cLower.includes('revision') || cLower.includes('ypf') || cLower.includes('gas')) {
          match = limpioFac.includes('revision') || limpioFac.includes('ypf') || limpioFac.includes('gas');
        } else {
          match = limpioFac.includes(cClean) || cClean.includes(limpioFac) || rubroFac.includes(cClean);
        }

        if (match) {
          realAsignado += montoFac;
          facturasAsignadasGG.add(fIdx);
        }
      });
      totalRealGGEspecifico += realAsignado;
    }

    return {
      ...ggItem,
      real: realAsignado,
      desvio: ggItem.total - realAsignado
    };
  });

  const imprevistoItemIndex = gastosGeneralesDetalle.findIndex(g => g.esImprevistos);
  if (imprevistoItemIndex !== -1) {
    let realImprevistosCalc = 0;
    facturasPresupuesto.forEach((fac, fIdx) => {
      if (facturasAsignadasGG.has(fIdx)) return;

      const rubroFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || fac.Rubro || '').toLowerCase();
      const tipoInsFac = String(
        fac.tipo_insumo || fac.Tipo_insumo || fac.renglon || fac.Renglon || fac.detalle_gasto || fac.Detalle_gasto || ''
      ).toLowerCase();
      const montoFac = Number(fac.subtotal || fac.Subtotal || 0);

      const esDeGG = rubroFac.includes('gastos generales') || tipoInsFac.includes('gasto general') || tipoInsFac.includes('imprevisto');
      if (esDeGG) {
        realImprevistosCalc += montoFac;
        facturasAsignadasGG.add(fIdx);
      }
    });

    totalRealImprevistos = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].real = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].desvio = gastosGeneralesDetalle[imprevistoItemIndex].total - realImprevistosCalc;
  }

  const granTotalPresupuestado = totalPresupuestoRubros + totalPresupuestoGG;

  const obtenerFacturasParaComponente = (rubroObj, compNombre, facturasRubroTotal) => {
    const compNorm = limpiarTexto(compNombre);
    if (compNorm.includes('mano') || compNorm.includes('obra')) {
      return 0;
    }

    const matchingFacturas = facturasRubroTotal.filter(fac => {
      const tipoFac = limpiarTexto(
        fac.tipo_insumo || fac.Tipo_insumo || 
        fac.renglon || fac.Renglon || 
        fac.concepto || fac.Concepto || 
        fac.descripcion || fac.Descripcion || 
        fac.detalle_gasto || fac.Detalle_gasto || ''
      );

      if (tipoFac.includes('mano') || tipoFac.includes('salario')) {
        return false;
      }

      if (compNorm.includes('subcontrato')) {
        return tipoFac.includes('subcontrato') || tipoFac.includes('georadar') || tipoFac.includes('alquiler') || tipoFac.includes('flete') || tipoFac.includes('servicio');
      }
      if (compNorm.includes('equipo') || tipoFac.includes('maquinaria')) {
        return tipoFac.includes('equipo') || tipoFac.includes('maquinaria') || tipoFac.includes('andamio');
      }
      if (compNorm.includes('material')) {
        return tipoFac.includes('material') || tipoFac.includes('cemento') || tipoFac.includes('ladrillo') || tipoFac.includes('ferreteria') ||
               (!tipoFac.includes('subcontrato') && !tipoFac.includes('equipo') && !tipoFac.includes('maquinaria'));
      }
      return false;
    });

    return matchingFacturas.reduce((sum, f) => sum + Number(f.subtotal || f.Subtotal || 0), 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm print:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">(Certificacion - Reportes - Listado de Insumos - Comparativas)</p>
      </div>

      {!esOperador && (
        <div className="flex gap-2 bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex-wrap print:hidden">
          {['Certificaciones', 'Reportes Diarios', 'Listado de Insumos', 'Comparativo'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {!esOperador && activeTab === 'Certificaciones' && (
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

      {activeTab === 'Reportes Diarios' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" /> Parte Diario de Actividades (SICE S.A.)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Asocie un contrato, complete los operarios activos, los ítems y corrobore las claves.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={contratoSeleccionadoId}
                  onChange={(e) => setContratoSeleccionadoId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Seleccionar Contrato ({contratosList.length} disponibles) --</option>
                  {contratosList.map((c, i) => {
                    const cId = String(c.id || c.ID || c.codigo || c.Codigo || i);
                    const cCod = c.codigo || c.Codigo || 'S/C';
                    const cNom = c.nombre || c.nombre_contrato || c.Nombre_contrato || c.nombreContrato || c.cliente || c.Cliente || 'Contrato';
                    const cEst = c.estado || c.Estado || 'Activo';
                    return (
                      <option key={cId} value={cId}>
                        [{cCod}] {cNom} ({cEst})
                      </option>
                    );
                  })}
                </select>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-400 space-y-6 text-slate-900">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <img src="/logo-07.png" alt="SICE S.A." className="h-24 object-contain" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-wide">PARTE DIARIO DE ACTIVIDADES</h2>
              </div>

              <div className="text-xs space-y-1 border-b border-slate-300 pb-4">
                <p className="font-extrabold text-blue-900 text-sm">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div><span className="text-slate-500 font-semibold">C.U.I.T. Nro.:</span> <span className="font-bold">30-71573431-8</span></div>
                  <div><span className="text-slate-500 font-semibold">Cliente:</span> <span className="font-bold">LDC Argentina S.A.</span></div>
                  <div>
                    <span className="text-slate-500 font-semibold">Fecha:</span>{' '}
                    <input 
                      type="date" 
                      value={siceFecha} 
                      onChange={(e) => setSiceFecha(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 font-bold text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div><span className="text-slate-500 font-semibold">Número de Proveedor Nro.:</span> <span className="font-bold">1490175</span></div>
                  <div><span className="text-slate-500 font-semibold">Contrato Nro.:</span> <span className="font-bold">5000002190</span></div>
                  <div>
                    <span className="text-slate-500 font-semibold">Parte Nro.:</span> <span className="font-black text-amber-600 font-mono text-sm">{siceParteNro}</span>
                  </div>
                </div>
              </div>

              {/* 👷 SECCIÓN DE OPERARIOS PRESENTES (Sin especialidad entre paréntesis) */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" /> Operarios Presentes ({listaEmpleadosActivos.length} activos disponibles)
                  </h3>
                  <button
                    type="button"
                    onClick={agregarOperarioFila}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[11px] transition-colors flex items-center gap-1 shadow-sm cursor-pointer print:hidden"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Operario
                  </button>
                </div>

                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50/50 p-3 space-y-2">
                  {operariosSeleccionados.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No hay operarios añadidos. Haga clic en "Agregar Operario".</p>
                  ) : (
                    operariosSeleccionados.map((op, idx) => (
                      <div key={op.id || idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:hidden">Empleado (RRHH Activos)</label>
                          <select
                            value={op.nombre}
                            onChange={(e) => {
                              const nombreVal = e.target.value;
                              const isCallapina = nombreVal.toLowerCase().includes('callapiña') || nombreVal.toLowerCase().includes('callapina');
                              const abrevVal = isCallapina ? 'S' : 'OE';

                              const actualizados = [...operariosSeleccionados];
                              actualizados[idx] = { ...actualizados[idx], nombre: nombreVal, abreviacion: abrevVal };
                              setOperariosSeleccionados(actualizados);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="">-- Seleccionar Operario (RRHH Activos) --</option>
                            {listaEmpleadosActivos.map((emp, eIdx) => {
                              const empNom = emp.nombre || emp.Nombre || emp.empleado || emp.apellido || `Operario ${eIdx + 1}`;
                              const isSelectedElsewhere = operariosSeleccionados.some((oItem, oIdx) => oIdx !== idx && oItem.nombre === empNom);

                              return (
                                <option key={eIdx} value={empNom} disabled={isSelectedElsewhere}>
                                  {empNom} {isSelectedElsewhere ? '(Ya seleccionado)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="w-24 text-center">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:hidden">Abrev.</label>
                          <input
                            type="text"
                            value={op.abreviacion}
                            onChange={(e) => actualizarOperarioFila(idx, 'abreviacion', e.target.value.toUpperCase())}
                            title="Abreviación de categoría (S para Callapiña, OE para el resto)"
                            className="w-full bg-amber-100/70 border border-slate-300 rounded px-2 py-1.5 text-xs font-black text-amber-950 text-center uppercase focus:bg-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:hidden">Horas</label>
                          <input
                            type="number"
                            step="0.01"
                            value={op.horas}
                            onChange={(e) => actualizarOperarioFila(idx, 'horas', e.target.value)}
                            placeholder={`${totalHorasDefaultCalculado} hs (Def.)`}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-black text-slate-900 text-center outline-none focus:border-amber-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => eliminarOperarioFila(idx)}
                          className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors cursor-pointer print:hidden"
                          title="Eliminar operario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-400 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                      <th className="py-2.5 px-2 border-r border-slate-700 w-12 text-center">Item</th>
                      <th className="py-2.5 px-3 border-r border-slate-700">Descripción del Servicio</th>
                      <th className="py-2.5 px-2 border-r border-slate-700 text-center w-28">Hora Comienzo</th>
                      <th className="py-2.5 px-2 border-r border-slate-700 text-center w-28">Hora Fin</th>
                      <th className="py-2.5 px-2 border-r border-slate-700 text-center w-24">Total Horas</th>
                      <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                      <th className="py-2.5 px-2 text-center w-28">Terminó Tarea</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {siceItems.map((row, index) => {
                      const totalHs = calcularTotalHorasSice(row.horaComienzo, row.horaFin);
                      return (
                        <tr key={index} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                          <td className="py-2 px-2 text-center font-bold border-r border-slate-300 text-slate-700">{row.id}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300">
                            <input 
                              type="text" 
                              value={row.descripcion}
                              onChange={(e) => actualizarItemSice(index, 'descripcion', e.target.value)}
                              placeholder="Descripción de labores..."
                              className="w-full bg-amber-100/50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                            <input 
                              type="time" 
                              value={row.horaComienzo}
                              onChange={(e) => actualizarItemSice(index, 'horaComienzo', e.target.value)}
                              className="bg-amber-100/50 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-center"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                            <input 
                              type="time" 
                              value={row.horaFin}
                              onChange={(e) => actualizarItemSice(index, 'horaFin', e.target.value)}
                              className="bg-amber-100/50 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-center"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 text-center font-extrabold text-amber-900 bg-amber-100/80">
                            {totalHs} hs
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300">
                            <input 
                              type="text" 
                              value={row.observaciones}
                              onChange={(e) => actualizarItemSice(index, 'observaciones', e.target.value)}
                              placeholder="Observaciones..."
                              className="w-full bg-amber-100/50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => actualizarItemSice(index, 'terminoTarea', 'SI')}
                                className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row.terminoTarea === 'SI' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
                              >
                                SI
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarItemSice(index, 'terminoTarea', 'NO')}
                                className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row.terminoTarea === 'NO' ? 'bg-rose-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
                              >
                                NO
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center print:hidden">
                <button 
                  type="button" 
                  onClick={agregarFilaSice}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Agregar Ítem (Fila)
                </button>
                <span className="text-xs text-slate-500 font-semibold">Total filas: {siceItems.length} / 10</span>
              </div>

              <form onSubmit={aprobarYArchivarParteSice} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  <div className="p-4 space-y-3">
                    <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE PROVEEDOR</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">CARGO:</label>
                        <input 
                          type="text" 
                          required
                          value={siceRespProveedor.cargo}
                          onChange={(e) => setSiceRespProveedor({...siceRespProveedor, cargo: e.target.value})}
                          placeholder="Ej: Jefe de Obra / Supervisor"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO:</label>
                        <input 
                          type="text" 
                          required
                          value={siceRespProveedor.nombre}
                          onChange={(e) => setSiceRespProveedor({...siceRespProveedor, nombre: e.target.value})}
                          placeholder="Ej: Juan Pérez"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: AB1234):</label>
                        <input 
                          type="password" 
                          required
                          maxLength={6}
                          placeholder="Ej: AB1234"
                          value={siceRespProveedor.clave}
                          onChange={(e) => setSiceRespProveedor({...siceRespProveedor, clave: e.target.value.toUpperCase()})}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <h4 className="font-black text-xs text-slate-900 uppercase bg-slate-200 p-2 rounded">RESPONSABLE CLIENTE</h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">CARGO:</label>
                        <input 
                          type="text" 
                          required
                          value={siceRespCliente.cargo}
                          onChange={(e) => setSiceRespCliente({...siceRespCliente, cargo: e.target.value})}
                          placeholder="Ej: Gerente de Planta"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">NOMBRE Y APELLIDO:</label>
                        <input 
                          type="text" 
                          required
                          value={siceRespCliente.nombre}
                          onChange={(e) => setSiceRespCliente({...siceRespCliente, nombre: e.target.value})}
                          placeholder="Ej: Cristian Matei"
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres, Ej: CD5678):</label>
                        <input 
                          type="password" 
                          required
                          maxLength={6}
                          placeholder="Ej: CD5678"
                          value={siceRespCliente.clave}
                          onChange={(e) => setSiceRespCliente({...siceRespCliente, clave: e.target.value.toUpperCase()})}
                          className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-emerald-700 tracking-widest uppercase focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-100 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
                  <p className="text-xs text-slate-500">Ingrese sus claves para firmar y validar el parte diario.</p>
                  <button 
                    type="submit"
                    disabled={isSavingSice}
                    className={`px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2 ${isSavingSice ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSavingSice ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Procesando...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4" /> Aprobar, Firmar y Guardar Reporte</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase">Historial de Partes Diarios SICE Aprobados</h3>
            {sicePartesAprobados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                No hay partes diarios aprobados ni archivados en el sistema.
              </div>
            ) : (
              <div className="space-y-3">
                {sicePartesAprobados.map((parte, idx) => {
                  const parteId = parte.id || parte.nro || idx;
                  return (
                    <div key={parteId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-full">Parte Nro: {parte.nro}</span>
                          <span className="text-xs font-medium text-slate-500">Fecha: {parte.fecha}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Total Horas: {parte.totalHorasSuma} hs</span>
                        </div>
                        <p className="text-slate-700 text-xs mt-2">
                          Proveedor: <strong>{parte.proveedor?.nombre}</strong> ({parte.proveedor?.cargo}) | Cliente: <strong>{parte.cliente?.nombre}</strong> ({parte.cliente?.cargo})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {parte.pdfUrl ? (
                          <a 
                            href={parte.pdfUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4" /> Ver PDF en Drive
                          </a>
                        ) : (
                          <button 
                            onClick={() => setParteVisualizando(parte)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" /> Visualizar
                          </button>
                        )}
                        {!esOperador && (
                          <button 
                            onClick={() => eliminarParteServidor(parteId)}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Eliminar reporte"
                          >
                            <Trash2 className="w-4 h-4" /> Borrar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!esOperador && activeTab === 'Listado de Insumos' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Listado de Insumos por Presupuesto
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Selecciona un presupuesto para ver el desglose de insumos.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <select
                className="w-full sm:w-80 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                value={insumoPresupuestoId}
                onChange={(e) => setInsumoPresupuestoId(e.target.value)}
              >
                <option value="">-- Seleccionar Presupuesto --</option>
                {presupuestos.map(p => (
                  <option key={p.id || p.ID} value={String(p.id || p.ID)}>
                    [{p.codigo || 'S/C'}] {p.nombre || p.Nombre} — Estado: {p.estado_presupuesto || p.estado || 'borrador'}
                  </option>
                ))}
              </select>

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
                <div className="p-8 text-center text-slate-500 text-xs">Este presupuesto no contiene tareas ni insumos cargados.</div>
              ) : (
                Object.entries(insumosPorRubro).map(([nombreRubro, categorias]) => (
                  <div key={nombreRubro} className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-800 text-white px-6 py-3 font-extrabold text-xs uppercase tracking-wide">
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
                              <h5 className="text-xs font-black text-amber-600 uppercase tracking-wider">{cat}</h5>
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

      {!esOperador && activeTab === 'Comparativo' && (
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
                    {rubrosPresupuestoDetalle.map((rubro) => {
                      const componentesEntradas = Object.entries(rubro.componentes);

                      const realFacturasRubroTotal = facturasPresupuesto
                        .filter(fac => {
                          const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || fac.Rubro || '').trim();
                          if (rFac.toLowerCase().includes('gastos generales')) return false;
                          const limpioRubroFac = limpiarTexto(rFac);
                          const limpioRubroPres = limpiarTexto(rubro.nombre);
                          return limpioRubroFac === limpioRubroPres || limpioRubroFac.includes(limpioRubroPres) || limpioRubroPres.includes(limpioRubroFac);
                        });

                      const realSalariosRubro = obtenerSalariosPorRubro(rubro.nombre);

                      return (
                        <React.Fragment key={`rub-${rubro.id}`}>
                          <tr className="bg-slate-50 font-extrabold text-slate-900 border-t border-slate-200">
                            <td className="px-4 py-3 uppercase text-amber-600 flex items-center gap-2" colSpan={5}>
                              <Layers className="w-4 h-4 text-amber-500" />
                              {rubro.nombre}
                            </td>
                          </tr>

                          {componentesEntradas.map(([compNombre, montoComp], cIdx) => {
                            const realFacComp = obtenerFacturasParaComponente(rubro, compNombre, realFacturasRubroTotal);
                            const esManoDeObra = limpiarTexto(compNombre).includes('mano') || limpiarTexto(compNombre).includes('obra');
                            const realSalariosComp = esManoDeObra ? realSalariosRubro : 0;
                            const totalRealComp = realFacComp + realSalariosComp;
                            totalRealRubrosCalculado += totalRealComp;
                            const desvioComp = montoComp - totalRealComp;

                            return (
                              <tr key={cIdx} className="hover:bg-slate-50/80">
                                <td className="px-4 py-2.5 pl-8 text-slate-600 font-medium flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  {compNombre}
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                                  $ {montoComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-700">
                                  $ {realFacComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-2.5 text-right font-semibold text-amber-600">
                                  $ {realSalariosComp.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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

                    <tr className="bg-amber-200 text-amber-950 font-extrabold">
                      <td className="px-4 py-3 uppercase">TOTAL RUBROS</td>
                      <td className="px-4 py-3 text-right">$ {totalPresupuestoRubros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        $ {rubrosPresupuestoDetalle.reduce((acc, r) => {
                          const fRubro = facturasPresupuesto
                            .filter(fac => {
                              const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || fac.Rubro || '').trim();
                              if (rFac.toLowerCase().includes('gastos generales')) return false;
                              const limpioRubroFac = limpiarTexto(rFac);
                              const limpioRubroPres = limpiarTexto(r.nombre);
                              if (!(limpioRubroFac === limpioRubroPres || limpioRubroFac.includes(limpioRubroPres) || limpioRubroPres.includes(limpioRubroFac))) {
                                return false;
                              }
                              const tipoFac = limpiarTexto(fac.tipo_insumo || fac.renglon || fac.concepto || '');
                              if (tipoFac.includes('mano') || tipoFac.includes('salario')) return false;
                              return true;
                            })
                            .reduce((sum, fac) => sum + Number(fac.subtotal || fac.Subtotal || 0), 0);
                          return acc + fRubro;
                        }, 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right">$ {movimientosRrhhPresupuesto.reduce((acc, m) => acc + Number(m.monto || m.Monto || 0), 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">$ {(totalPresupuestoRubros - totalRealRubrosCalculado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    </tr>

                    {gastosGeneralesDetalle.length > 0 && (
                      <React.Fragment>
                        <tr className="bg-amber-50 font-extrabold text-slate-900 border-t-2 border-amber-200">
                          <td className="px-4 py-3 uppercase text-amber-800 flex items-center gap-2" colSpan={5}>
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            GASTOS GENERALES (SEGURIDAD E HIGIENE / EPP / ROPA / IMPREVISTOS)
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
                            const rFac = String(fac.rubro_presupuesto || fac.Rubro_presupuesto || fac.rubro || fac.Rubro || '').trim();
                            if (rFac.toLowerCase().includes('gastos generales')) return false;
                            const limpioRubroFac = limpiarTexto(rFac);
                            const limpioRubroPres = limpiarTexto(r.nombre);
                            if (!(limpioRubroFac === limpioRubroPres || limpioRubroFac.includes(limpioRubroPres) || limpioRubroPres.includes(limpioRubroFac))) {
                              return false;
                            }
                            const tipoFac = limpiarTexto(fac.tipo_insumo || fac.renglon || fac.concepto || '');
                            if (tipoFac.includes('mano') || tipoFac.includes('salario')) return false;
                            return true;
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