import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Layers, ShieldCheck, Filter, List, Package, Calendar, Plus, CheckCircle2, TrendingUp, Printer, Trash2, Eye, FileText, ExternalLink, Users, X, Clock, FileSpreadsheet } from 'lucide-react';
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Error capturado en Reportes:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-4 max-w-xl mx-auto mt-10 shadow-sm">
          <h2 className="text-sm font-black text-rose-900 uppercase">Ocurrió un error al renderizar esta sección</h2>
          <p className="text-xs text-rose-700 font-mono bg-rose-100 p-3 rounded-xl overflow-x-auto text-left">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer shadow"
          >
            Recargar aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReportesContent(props) {
  const { user } = useAuth();

  const userRole = String(
    props?.role || props?.userRole || user?.role || user?.rol || user?.user_role || user?.tipo || user?.perfil || user?.user_metadata?.role || ''
  ).toLowerCase();
  
  const esOperador = userRole.includes('operador') || userRole.includes('operator') || userRole.includes('operat');

  const obras = Array.isArray(props?.obras || props?.Obras) ? (props.obras || props.Obras) : [];
  const presupuestos = Array.isArray(props?.presupuestos || props?.Presupuestos) ? (props.presupuestos || props.Presupuestos) : [];
  const certificadosProps = Array.isArray(props?.certificados || props?.Certificados) ? (props.certificados || props.Certificados) : [];
  const movimientos = Array.isArray(props?.movimientos || props?.Movimientos || props?.tesoreria || props?.Tesoreria) ? (props.movimientos || props.Movimientos || props.tesoreria || props.Tesoreria) : [];
  const insumos = Array.isArray(props?.insumos || props?.Insumos) ? (props.insumos || props.Insumos) : [];
  const empleadosListProps = Array.isArray(props?.empleados || props?.Empleados || props?.personal || props?.Personal) ? (props.empleados || props.Empleados || props.personal || props.Personal) : [];
  const facturas = Array.isArray(props?.facturas || props?.Facturas) ? (props.facturas || props.Facturas) : [];
  const maestroTareasRubros = Array.isArray(props?.maestroTareasRubros || props?.MaestroTareasRubros || props?.maestro_tareas_rubros) ? (props.maestroTareasRubros || props.MaestroTareasRubros || props.maestro_tareas_rubros) : [];

  const propsContratos = props?.contratos || props?.Contratos || props?.contratosMantenimiento || props?.ContratosMantenimiento || props?.contratos_mantenimiento;
  const propsReportesSice = props?.reportesSice || props?.ReportesSice || props?.reportes_sice;
  const propsEmpleados = empleadosListProps;

  const [fetchedContratos, setFetchedContratos] = useState([]);
  const [fetchedReportesSice, setFetchedReportesSice] = useState([]);
  const [fetchedEmpleados, setFetchedEmpleados] = useState([]);
  const [fetchedCertificados, setFetchedCertificados] = useState([]);

  useEffect(() => {
    if (!propsContratos || (Array.isArray(propsContratos) && propsContratos.length === 0)) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ContratosMantenimiento', action: 'get' })
      })
        .then(res => res.json())
        .then(data => {
          let lista = [];
          if (Array.isArray(data)) lista = data;
          else if (data && typeof data === 'object') {
            const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
            if (foundKey) lista = data[foundKey];
          }
          if (lista.length > 0) setFetchedContratos(lista);
        })
        .catch(() => {});
    }

    if (!propsReportesSice || (Array.isArray(propsReportesSice) && propsReportesSice.length === 0)) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'ReportesSice', action: 'get' })
      })
        .then(res => res.json())
        .then(data => {
          let lista = [];
          if (Array.isArray(data)) {
            lista = data;
          } else if (data && typeof data === 'object') {
            const possibleArray = data.ReportesSice || data.reportesSice || data.data || data.records || data.items || data.result || data.rows;
            if (Array.isArray(possibleArray)) {
              lista = possibleArray;
            } else {
              lista = Object.values(data).filter(v => v && typeof v === 'object' && !Array.isArray(v));
            }
          }
          if (lista.length > 0) {
            setFetchedReportesSice(lista);
          }
        })
        .catch((err) => console.error("Error al obtener ReportesSice:", err));
    }

    fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tabla: 'Certificaciones', action: 'get' })
    })
      .then(res => res.json())
      .then(data => {
        let lista = [];
        if (Array.isArray(data)) lista = data;
        else if (data && typeof data === 'object') {
          const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
          if (foundKey) lista = data[foundKey];
        }
        if (lista.length > 0) setFetchedCertificados(lista);
      })
      .catch(() => {});

    if (!propsEmpleados || (Array.isArray(propsEmpleados) && propsEmpleados.length === 0)) {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Empleados', action: 'get' })
      })
        .then(res => res.json())
        .then(data => {
          let lista = [];
          if (Array.isArray(data)) lista = data;
          else if (data && typeof data === 'object') {
            const foundKey = Object.keys(data).find(k => Array.isArray(data[k]));
            if (foundKey) lista = data[foundKey];
          }
          if (lista.length > 0) setFetchedEmpleados(lista);
        })
        .catch(() => {});
    }
  }, [propsContratos, propsReportesSice, propsEmpleados]);

  const contratosList = useMemo(() => {
    if (Array.isArray(propsContratos) && propsContratos.length > 0) return propsContratos;
    if (fetchedContratos.length > 0) return fetchedContratos;
    return CONTRATO_DEFAULT;
  }, [propsContratos, fetchedContratos]);

  const reportesSiceListProps = Array.isArray(props?.reportesSice || props?.ReportesSice || props?.reportes_sice) ? (props.reportesSice || props.ReportesSice || props.reportes_sice) : [];

  const buscarValorEnObjeto = (obj, posibleClaves, defecto = '') => {
    if (!obj || typeof obj !== 'object') return defecto;
    for (const pk of posibleClaves) {
      const cleanPk = String(pk).toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [k, v] of Object.entries(obj)) {
        const cleanK = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanK === cleanPk && v !== undefined && v !== null && String(v).trim() !== '') {
          return v;
        }
      }
    }
    return defecto;
  };

  const obtenerClienteDePresupuesto = (presupuesto) => {
    if (!presupuesto) return '---';
    const rawCliente = buscarValorEnObjeto(presupuesto, [
      'cliente', 'Cliente', 'cliente_nombre', 'clienteNombre', 'nombre_cliente', 'nombreCliente', 'razon_social', 'razonSocial', 'empresa', 'Empresa'
    ]);
    if (rawCliente) {
      if (typeof rawCliente === 'object') {
        return rawCliente.nombre || rawCliente.razon_social || rawCliente.empresa || '---';
      }
      return String(rawCliente);
    }

    const obraId = presupuesto?.obra_id || presupuesto?.Obra_id || presupuesto?.obraId || presupuesto?.id_obra;
    if (obraId && obras.length > 0) {
      const obraEncontrada = obras.find(o => String(o?.id || o?.ID) === String(obraId));
      if (obraEncontrada) {
        const clienteObra = buscarValorEnObjeto(obraEncontrada, ['cliente', 'Cliente', 'cliente_nombre', 'clienteNombre', 'razon_social', 'razonSocial']);
        if (clienteObra) {
          if (typeof clienteObra === 'object') {
            return clienteObra.nombre || clienteObra.razon_social || clienteObra.empresa || '---';
          }
          return String(clienteObra);
        }
      }
    }
    return '---';
  };

  const allCertificados = useMemo(() => {
    const cProps = Array.isArray(certificadosProps) ? certificadosProps : [];
    const fCert = Array.isArray(fetchedCertificados) ? fetchedCertificados : [];
    return [...cProps, ...fCert];
  }, [certificadosProps, fetchedCertificados]);

  const allReportesSice = useMemo(() => {
    let base = fetchedReportesSice.length > 0 ? fetchedReportesSice : reportesSiceListProps;
    return Array.isArray(base) ? base : [];
  }, [fetchedReportesSice, reportesSiceListProps]);

  const listaEmpleadosActivos = useMemo(() => {
    const fuente = empleadosListProps.length > 0 ? empleadosListProps : (fetchedEmpleados.length > 0 ? fetchedEmpleados : [
      { id: '1', nombre: 'Callapiña Wilfredo Cristian', especialidad: 'Oficial Especializado', estado: 'ACTIVO' },
      { id: '2', nombre: 'Caballero Jonatan Matias', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '3', nombre: 'Oyola Carlos Alberto', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '4', nombre: 'Oyola Cristian Damian', especialidad: 'Medio Oficial', estado: 'ACTIVO' },
      { id: '5', nombre: 'Torres Lopez John Alexander', especialidad: 'Oficial', estado: 'ACTIVO' },
      { id: '6', nombre: 'Palacio Sanchez Joderson', especialidad: 'Medio Oficial', estado: 'ACTIVO' }
    ]);

    return Array.isArray(fuente) ? fuente.filter(emp => {
      const estadoVal = String(emp?.estado || emp?.Estado || emp?.status || 'ACTIVO').trim().toUpperCase();
      return estadoVal === 'ACTIVO';
    }) : [];
  }, [empleadosListProps, fetchedEmpleados]);

  const [activeTab, setActiveTab] = useState('Reportes Diarios');
  const [tipoCertificadoSubTab, setTipoCertificadoSubTab] = useState('avance_obra');
  const [certPresupuestoId, setCertPresupuestoId] = useState('');

  const [avanceActualMap, setAvanceActualMap] = useState({});
  const [adicionalesMonto, setAdicionalesMonto] = useState(0);
  
  const [certificadoNro, setCertificadoNro] = useState('0');
  const [certFecha, setCertFecha] = useState(new Date().toISOString().slice(0, 10));
  const [adelantoPct, setAdelantoPct] = useState(10);
  const [adelantoMonto, setAdelantoMonto] = useState(0);
  const [redeterminacionPct, setRedeterminacionPct] = useState(0);
  const [redeterminacionMonto, setRedeterminacionMonto] = useState(0);

  const [certRespProveedor, setCertRespProveedor] = useState({ nombre: '', cargo: 'Jefe de Obra' });
  const [certRespCliente, setCertRespCliente] = useState({ nombre: '', cargo: 'Gerente de Proyecto' });
  const [isSavingCert, setIsSavingCert] = useState(false);

  useEffect(() => {
    if (esOperador) {
      setActiveTab('Reportes Diarios');
    }
  }, [esOperador]);

  const certificadosGuardadosSet = useMemo(() => {
    const set = new Set();
    allCertificados.forEach(c => {
      const pId = String(c?.presupuestoId || c?.presupuesto_id || '').trim();
      const nro = String(c?.certificadoNro || c?.certificado_nro || '').trim();
      if (pId && nro !== '') {
        set.add(`${pId}_${nro}`);
      }
    });
    return set;
  }, [allCertificados]);

  const presupuestosDisponiblesCert = useMemo(() => {
    return presupuestos.filter(p => {
      const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
      if (est !== 'aprobado' && est !== 'aprobada') return false;
      
      const pId = String(p?.id || p?.ID || '').trim();
      const yaGrabado = certificadosGuardadosSet.has(`${pId}_${certificadoNro}`);
      return !yaGrabado;
    });
  }, [presupuestos, certificadosGuardadosSet, certificadoNro]);

  const [compObraId, setCompObraId] = useState('todas');
  const [compPresupuestoId, setCompPresupuestoId] = useState('');

  const [insumoPresupuestoId, setInsumoPresupuestoId] = useState('');
  const [vistaGeneralInsumos, setVistaGeneralInsumos] = useState(false);

  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));
  const [siceParteNro, setSiceParteNro] = useState('00005');
  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', terminoTarea: 'SI' }
  ]);

  const calcularTotalHorasSice = (inicio, fin) => {
    if (!inicio || !fin) return 0;
    const [hIni, mIni] = String(inicio).split(':').map(Number);
    const [hFin, mFin] = String(fin).split(':').map(Number);
    let diffMinutos = ((hFin || 0) * 60 + (mFin || 0)) - ((hIni || 0) * 60 + (mIni || 0));
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return 0;
    const horasConProporcional = horasEfectivas * (11 / 9);
    return Number(horasConProporcional.toFixed(2));
  };

  const totalHorasDefaultCalculado = useMemo(() => {
    return siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it?.horaComienzo, it?.horaFin), 0);
  }, [siceItems]);

  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);

  useEffect(() => {
    if (listaEmpleadosActivos.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = listaEmpleadosActivos.slice(0, 1).map(emp => {
        const nombreEmp = buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido']) || 'Operario';
        const isCallapina = nombreEmp.toLowerCase().includes('callapiña') || nombreEmp.toLowerCase().includes('callapina');
        const abrevEmp = isCallapina ? 'S' : 'OE';

        return {
          id: buscarValorEnObjeto(emp, ['id', 'ID']) || Math.random().toString(),
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

    let pCargo = buscarValorEnObjeto(objData, ['proveedor_cargo', 'proveedorCargo', 'cargoProveedor', 'cargo_proveedor', 'puestoProveedor']) || objData?.proveedor?.cargo || '';
    let pNombre = buscarValorEnObjeto(objData, ['proveedor_nombre', 'proveedorNombre', 'nombreProveedor', 'nombre_proveedor', 'responsableProveedor']) || objData?.proveedor?.nombre || '';
    let pKey = buscarValorEnObjeto(objData, ['proveedor_key', 'proveedorKey', 'claveProveedor', 'clave_proveedor', 'proveedor_clave']) || objData?.proveedor?.key || 'AT1020';

    let cCargo = buscarValorEnObjeto(objData, ['cliente_cargo', 'clienteCargo', 'cargoCliente', 'cargo_cliente', 'puestoCliente']) || objData?.cliente?.cargo || '';
    let cNombre = buscarValorEnObjeto(objData, ['cliente_nombre', 'clienteNombre', 'nombreCliente', 'nombre_cliente', 'responsableCliente']) || objData?.cliente?.nombre || '';
    let cKey = buscarValorEnObjeto(objData, ['cliente_key', 'clienteKey', 'claveCliente', 'clave_cliente', 'cliente_clave']) || objData?.cliente?.key || 'CM7030';

    return { pCargo, pNombre, pKey, cCargo, cNombre, cKey };
  };

  const clavesContratoActual = useMemo(() => {
    const contratoActivo = contratosList.find(c => {
      const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo'])).trim();
      return cId === String(contratoSeleccionadoId).trim();
    });

    if (contratoActivo) {
      const extracted = extraerDatosContrato(contratoActivo);
      return { proveedorKey: extracted.pKey, clienteKey: extracted.cKey };
    }
    return { proveedorKey: 'AT1020', clienteKey: 'CM7030' };
  }, [contratosList, contratoSeleccionadoId]);

  useEffect(() => {
    if (contratoSeleccionadoId) {
      const contrato = contratosList.find(c => {
        const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo'])).trim();
        return cId === String(contratoSeleccionadoId).trim();
      });

      if (contrato) {
        const { pCargo, pNombre, cCargo, cNombre } = extraerDatosContrato(contrato);
        setSiceRespProveedor(prev => ({
          cargo: pCargo,
          nombre: pNombre,
          clave: prev?.clave || ''
        }));
        setSiceRespCliente(prev => ({
          cargo: cCargo,
          nombre: cNombre,
          clave: prev?.clave || ''
        }));
      }
    }
  }, [contratoSeleccionadoId, contratosList]);

  const sicePartesAprobados = useMemo(() => {
    let lista = allReportesSice;
    if (contratoSeleccionadoId) {
      lista = allReportesSice.filter(r => {
        if (!r) return false;
        const rContratoId = String(buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id', 'ContratoId', 'id_contrato', 'IdContrato'])).trim();
        if (rContratoId === String(contratoSeleccionadoId).trim()) return true;
        const valores = Object.values(r).map(v => String(v).trim());
        return valores.includes(String(contratoSeleccionadoId).trim());
      });
    }

    return lista.map(r => {
      let rawItems = buscarValorEnObjeto(r, ['items', 'Item', 'Items']);
      let itemsParsed = rawItems;
      if (typeof itemsParsed === 'string' && itemsParsed.trim()) {
        try { itemsParsed = JSON.parse(itemsParsed); } catch { itemsParsed = []; }
      }

      let rawOps = buscarValorEnObjeto(r, ['operarios', 'operariosPresentes', 'Operarios', 'OperariosPresentes']);
      let operariosParsed = rawOps;
      if (typeof operariosParsed === 'string' && operariosParsed.trim()) {
        try { operariosParsed = JSON.parse(operariosParsed); } catch { operariosParsed = []; }
      }

      let rawProv = buscarValorEnObjeto(r, ['proveedor', 'Proveedor']);
      let provParsed = rawProv;
      if (typeof provParsed === 'string' && provParsed.trim()) {
        try { provParsed = JSON.parse(provParsed); } catch { provParsed = { nombre: String(rawProv), cargo: '' }; }
      }
      if (!provParsed || typeof provParsed !== 'object') provParsed = { nombre: '', cargo: '' };

      let rawCli = buscarValorEnObjeto(r, ['cliente', 'Cliente']);
      let cliParsed = rawCli;
      if (typeof cliParsed === 'string' && cliParsed.trim()) {
        try { cliParsed = JSON.parse(cliParsed); } catch { cliParsed = { nombre: String(rawCli), cargo: '' }; }
      }
      if (!cliParsed || typeof cliParsed !== 'object') cliParsed = { nombre: '', cargo: '' };

      const idVal = buscarValorEnObjeto(r, ['id', 'ID', 'Id']);
      const nroVal = buscarValorEnObjeto(r, ['nro', 'Nro', 'numero', 'Numero']);
      const fechaVal = buscarValorEnObjeto(r, ['fecha', 'Fecha']);
      const contratoIdVal = buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id', 'ContratoId']);
      const totalHsVal = buscarValorEnObjeto(r, ['totalhorassuma', 'totalHorasSuma', 'TotalHorasSuma', 'total_horas_suma']);
      const pdfUrlVal = buscarValorEnObjeto(r, ['pdf_url', 'pdfUrl', 'PdfUrl', 'urlPdf', 'pdfurl']);

      return {
        id: idVal || nroVal || `sice-${Math.random()}`,
        nro: nroVal || '00001',
        fecha: fechaVal || '',
        contratoid: contratoIdVal || '',
        items: Array.isArray(itemsParsed) ? itemsParsed : [],
        operarios: Array.isArray(operariosParsed) ? operariosParsed : [],
        proveedor: provParsed,
        cliente: cliParsed,
        totalHorasSuma: Number(totalHsVal || 0),
        pdfUrl: pdfUrlVal || ''
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
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      setOperariosSeleccionados(actualizados);
    }
  };

  const eliminarOperarioFila = (index) => {
    setOperariosSeleccionados(operariosSeleccionados.filter((_, i) => i !== index));
  };

  const eliminarParteServidor = async (idParte) => {
    if (esOperador) return;
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
      setFetchedReportesSice(prev => prev.filter(p => String(buscarValorEnObjeto(p, ['id', 'ID', 'nro'])) !== String(idParte)));
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
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      setSiceItems(actualizados);
    }
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

    const totalHsSuma = siceItems.reduce((acc, it) => acc + calcularTotalHorasSice(it?.horaComienzo, it?.horaFin), 0);

    const operariosFinales = operariosSeleccionados.map(op => ({
      nombre: op?.nombre,
      abreviacion: op?.abreviacion,
      horas: op?.horas !== '' ? Number(op?.horas) : totalHsSuma
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

      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || resultado?.link || '';
      if (resultado?.success === false || (resultado?.error && !pdfUrlFinal)) {
        alert("Error al generar el PDF en Google Drive: " + (resultado?.error || 'Desconocido'));
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
        pdfUrl: pdfUrlFinal 
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

  const presupuestosCompFiltrados = (compObraId === 'todas' 
    ? presupuestos 
    : presupuestos.filter(p => String(p?.obra_id || p?.Obra_id || p?.obraId) === String(compObraId))
  ).filter(p => {
    const estadoBruto = p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || p?.Estado || '';
    const estadoLimpio = String(estadoBruto).toLowerCase().trim();
    return estadoLimpio === 'aprobado' || estadoLimpio === 'aprobada';
  });

  const presupuestoSeleccionado = presupuestos.find(p => String(p?.id || p?.ID) === String(compPresupuestoId));
  const certificadoPresupuestoObj = presupuestos.find(p => String(p?.id || p?.ID) === String(certPresupuestoId));
  
  const insumosOficialMap = {};
  if (Array.isArray(insumos)) {
    insumos.forEach(insGlobal => {
      const gId = String(insGlobal?.id || insGlobal?.ID || insGlobal?.insumo_id || '').trim();
      const tipoOriginal = String(insGlobal?.tipo || insGlobal?.Tipo || insGlobal?.tipo_insumo || 'Material').trim().toLowerCase();
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
      const tareaRaw = itemMaestro?.tarea || itemMaestro?.nombre || itemMaestro?.Tarea || '';
      const tareaKey = limpiarTexto(tareaRaw);
      let insumosDetalleParsed = itemMaestro?.insumos_detalle || itemMaestro?.Insumos_detalle || itemMaestro?.insumos || [];
      
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
    const insId = String(insumoItem?.id || insumoItem?.ID || insumoItem?.insumo_id || '').trim();
    if (insId && insumosOficialMap[insId]) {
      return insumosOficialMap[insId];
    }

    const t = String(insumoItem?.tipo || insumoItem?.Tipo || '').toLowerCase();
    if (t.includes('mano')) return 'Mano de Obra';
    if (t.includes('subcontrato')) return 'Subcontrato';
    if (t.includes('equipo') || t.includes('maquinaria')) return 'Equipo/Maquinaria';

    const nombreIns = String(insumoItem?.nombre || insumoItem?.nombre_del_articulo || insumoItem?.concepto || '').toLowerCase();
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

  const presupuestoInsumosSeleccionado = presupuestos.find(p => String(p?.id || p?.ID) === String(insumoPresupuestoId));

  const { insumosPorRubro, insumosGenerales } = useMemo(() => {
    if (!presupuestoInsumosSeleccionado) return { insumosPorRubro: {}, insumosGenerales: {} };

    let itemsDetalle = [];
    try {
      const parsed = typeof presupuestoInsumosSeleccionado?.items_detalle === 'string' 
        ? JSON.parse(presupuestoInsumosSeleccionado.items_detalle) 
        : presupuestoInsumosSeleccionado?.items_detalle;
      
      if (Array.isArray(parsed)) itemsDetalle = parsed;
      else if (parsed?.rubros && Array.isArray(parsed.rubros)) itemsDetalle = parsed.rubros;
      else itemsDetalle = [];
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
      const nombreRubro = rubroObj?.rubro || 'SIN RUBRO';
      if (!porRubro[nombreRubro]) {
        porRubro[nombreRubro] = {
          'MANO DE OBRA': [],
          'MATERIALES': [],
          'SUBCONTRATOS': [],
          'EQUIPOS / HERRAMIENTAS': [],
          'OTROS': []
        };
      }

      const tareasRubro = Array.isArray(rubroObj?.tareas) ? rubroObj.tareas : [];
      tareasRubro.forEach(tarea => {
        let insumosTarea = tarea?.insumos;
        const cantTarea = Number(tarea?.cantidad) || 1;
        const costoTarea = Number(tarea?.costo_unitario) || 0;

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
          const maestroInsumosEncontrados = buscarInsumosMaestro(tarea?.tarea);
          if (Array.isArray(maestroInsumosEncontrados) && maestroInsumosEncontrados.length > 0) {
            insumosTarea = maestroInsumosEncontrados;
          }
        }

        if (Array.isArray(insumosTarea) && insumosTarea.length > 0) {
          insumosTarea.forEach(ins => {
            const tipoResuelto = obtenerTipoInsumoInfalible(ins);
            const categoriaOriginal = String(ins?.tipo || ins?.categoria || tipoResuelto).trim().toUpperCase();
            
            let catNormalizada = 'MATERIALES';
            if (categoriaOriginal.includes('MANO') || categoriaOriginal.includes('OBRA')) catNormalizada = 'MANO DE OBRA';
            else if (categoriaOriginal.includes('MAT')) catNormalizada = 'MATERIALES';
            else if (categoriaOriginal.includes('SUB')) catNormalizada = 'SUBCONTRATOS';
            else if (categoriaOriginal.includes('EQ') || categoriaOriginal.includes('HERR') || categoriaOriginal.includes('MAQUINARIA')) catNormalizada = 'EQUIPOS / HERRAMIENTAS';

            const cantIns = Number(ins?.cantidad) || 1;
            const cUnitIns = Number(ins?.costo_unitario) || Number(ins?.costo) || costoTarea;
            const cantidadTotal = cantIns * cantTarea;
            const totalInsumo = cantidadTotal * cUnitIns;

            const itemProcesado = {
              rubro: nombreRubro,
              tarea: tarea?.tarea || 'Sin tarea',
              nombre: ins?.nombre || ins?.nombre_del_articulo || ins?.concepto || 'Insumo sin nombre',
              unidad: ins?.unidad || 'un',
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
            tarea: tarea?.tarea || 'Sin tarea',
            nombre: tarea?.tarea || 'Índice general',
            unidad: tarea?.unidad || 'gl',
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
      const tipo = String(m?.tipo || m?.Tipo || '').toLowerCase();
      if (tipo !== 'egreso') return false;

      const concepto = String(m?.concepto || m?.Concepto || '');
      const referencia = String(m?.referencia || m?.Referencia || '');
      const mPresupuestoId = String(m?.presupuesto_id || m?.Presupuesto_id || '');

      const matchIdDirecto = mPresupuestoId && mPresupuestoId === String(compPresupuestoId);
      const matchTextoPresupuesto = concepto.includes(`Presupuesto: ${compPresupuestoId}`);
      const esRrhh = referencia.toUpperCase().includes('RRHH') || concepto.includes('Sueldos') || concepto.includes('Cargas Sociales');

      return (matchIdDirecto || matchTextoPresupuesto) && esRrhh;
    });
  }, [movimientos, compPresupuestoId]);

  const obtenerSalariosPorRubro = (nombreRubro) => {
    let totalRubroRrhh = 0;
    movimientosRrhhPresupuesto.forEach(m => {
      const concepto = String(m?.concepto || m?.Concepto || '');
      const monto = Number(m?.monto || m?.Monto || 0);
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

  if (presupuestoSeleccionado && presupuestoSeleccionado?.items_detalle) {
    try {
      const parsedDetalle = typeof presupuestoSeleccionado.items_detalle === 'string' 
        ? JSON.parse(presupuestoSeleccionado.items_detalle) 
        : presupuestoSeleccionado.items_detalle;
      
      const rubrosArray = Array.isArray(parsedDetalle) ? parsedDetalle : (Array.isArray(parsedDetalle?.rubros) ? parsedDetalle.rubros : []);

      if (rubrosArray.length > 0) {
        rubrosPresupuestoDetalle = rubrosArray.map((rubroItem, rIdx) => {
          const tareasList = Array.isArray(rubroItem?.tareas) ? rubroItem.tareas : [];
          let totalRubro = 0;
          
          let acumuladorComponentes = {
            'Material': 0,
            'Mano de Obra': 0,
            'Subcontrato': 0,
            'Equipo/Maquinaria': 0
          };

          tareasList.forEach(tareaItem => {
            const costoTareaTotal = (Number(tareaItem?.cantidad) || 1) * (Number(tareaItem?.costo_unitario) || 0);
            totalRubro += costoTareaTotal;

            let insumosDeLaTarea = tareaItem?.insumos;
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
              listaInsumosParsed = buscarInsumosMaestro(tareaItem?.tarea);
              if (Array.isArray(listaInsumosParsed) && listaInsumosParsed.length > 0) {
                esEstructuradoValido = true;
              }
            }

            if (esEstructuradoValido) {
              let subtotalesIns = [];
              let sumaInsCosto = 0;

              listaInsumosParsed.forEach(insumo => {
                const tipoNorm = obtenerTipoInsumoInfalible(insumo);
                const costoIns = (Number(insumo?.cantidad) || 1) * (Number(insumo?.costo_unitario) || Number(insumo?.costo) || 0);
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
              const textoPlano = typeof tareaItem?.insumos === 'string' ? tareaItem.insumos : '';
              const textoEvaluacion = (String(tareaItem?.tarea || '') + " " + textoPlano).toLowerCase();
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
            nombre: rubroItem?.rubro || `Rubro #${rIdx + 1}`,
            total: totalRubro,
            componentes: componentesActivos,
            tareas: tareasList
          };
        });
      }

      if (parsedDetalle && parsedDetalle?.comercial) {
        if (Array.isArray(parsedDetalle.comercial.gastos_generales_insumos)) {
          parsedDetalle.comercial.gastos_generales_insumos.forEach((gg, ggIdx) => {
            const cant = Number(gg?.cantidad) || 1;
            const unit = Number(gg?.unitario) || 0;
            const subtotalGG = cant * unit;
            totalPresupuestoGG += subtotalGG;
            gastosGeneralesBase.push({
              id: `gg-${ggIdx}`,
              concepto: gg?.concepto || `Gasto General #${ggIdx + 1}`,
              cantidad: cant,
              unitario: unit,
              total: subtotalGG,
              esImprevistos: false
            });
          });
        }

        const porcentajeImprevistos = Number(parsedDetalle.comercial.porcentaje_imprevistos) || 0;
        const costoDirectoBase = Number(presupuestoSeleccionado?.costo_directo) || totalPresupuestoRubros;
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

  const facturasPresupuesto = facturas.filter(f => String(f?.presupuesto_id || f?.Presupuesto_id) === String(compPresupuestoId));
  
  let totalRealGGEspecifico = 0;
  let totalRealImprevistos = 0;
  const facturasAsignadasGG = new Set();

  const gastosGeneralesDetalle = gastosGeneralesBase.map(ggItem => {
    let realAsignado = 0;
    const cLower = String(ggItem?.concepto || '').toLowerCase();
    const cClean = limpiarTexto(ggItem?.concepto);

    if (!ggItem?.esImprevistos) {
      facturasPresupuesto.forEach((fac, fIdx) => {
        if (facturasAsignadasGG.has(fIdx)) return;

        const tipoInsumoFac = String(
          fac?.tipo_insumo || fac?.Tipo_insumo || 
          fac?.renglon || fac?.Renglon || 
          fac?.concepto || fac?.Concepto || 
          fac?.descripcion || fac?.Descripcion || 
          fac?.detalle_gasto || fac?.Detalle_gasto || ''
        ).toLowerCase();

        const limpioFac = limpiarTexto(tipoInsumoFac);
        const rubroFac = String(fac?.rubro_presupuesto || fac?.Rubro_presupuesto || fac?.rubro || fac?.Rubro || '').toLowerCase();
        const montoFac = Number(fac?.subtotal || fac?.Subtotal || 0);

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
      desvio: (ggItem?.total || 0) - realAsignado
    };
  });

  const imprevistoItemIndex = gastosGeneralesDetalle.findIndex(g => g?.esImprevistos);
  if (imprevistoItemIndex !== -1) {
    let realImprevistosCalc = 0;
    facturasPresupuesto.forEach((fac, fIdx) => {
      if (facturasAsignadasGG.has(fIdx)) return;

      const rubroFac = String(fac?.rubro_presupuesto || fac?.Rubro_presupuesto || fac?.rubro || fac?.Rubro || '').toLowerCase();
      const tipoInsFac = String(
        fac?.tipo_insumo || fac?.Tipo_insumo || fac?.renglon || fac?.Renglon || fac?.detalle_gasto || fac?.Detalle_gasto || ''
      ).toLowerCase();
      const montoFac = Number(fac?.subtotal || fac?.Subtotal || 0);

      const esDeGG = rubroFac.includes('gastos generales') || tipoInsFac.includes('gasto general') || tipoInsFac.includes('imprevisto');
      if (esDeGG) {
        realImprevistosCalc += montoFac;
        facturasAsignadasGG.add(fIdx);
      }
    });

    totalRealImprevistos = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].real = realImprevistosCalc;
    gastosGeneralesDetalle[imprevistoItemIndex].desvio = (gastosGeneralesDetalle[imprevistoItemIndex]?.total || 0) - realImprevistosCalc;
  }

  const granTotalPresupuestado = totalPresupuestoRubros + totalPresupuestoGG;

  const certificadoCalculos = useMemo(() => {
    if (!certificadoPresupuestoObj) return { filasRender: [], sumaTotalPresupuesto: 0, sumaTotalAnterior: 0, sumaTotalActual: 0, sumaTotalAcumulado: 0, totalPresupuestoCalc: 0, totalActualCalc: 0 };

    let itemsDetalle = [];
    try {
      const parsed = typeof certificadoPresupuestoObj?.items_detalle === 'string'
        ? JSON.parse(certificadoPresupuestoObj.items_detalle)
        : certificadoPresupuestoObj?.items_detalle;
      
      if (Array.isArray(parsed)) itemsDetalle = parsed;
      else if (parsed?.rubros && Array.isArray(parsed.rubros)) itemsDetalle = parsed.rubros;
      else itemsDetalle = [];
    } catch (e) {
      itemsDetalle = [];
    }

    let sumaTotalPresupuesto = 0;
    let sumaTotalAnterior = 0;
    let sumaTotalActual = 0;
    let sumaTotalAcumulado = 0;
    let totalPresupuestoCalc = 0;
    let totalActualCalc = 0;

    const filasRender = itemsDetalle.map((rubro, rIdx) => {
      let totalRubro = 0;
      let rubroAnterior = 0;
      let rubroActual = 0;

      const tareasRubro = Array.isArray(rubro?.tareas) ? rubro.tareas : [];
      const tareasFilas = tareasRubro.map((t, tIdx) => {
        const cant = Number(t?.cantidad) || 1;
        const pUnit = Number(t?.costo_unitario) || Number(t?.precio_unitario) || 0;
        const totalItem = cant * pUnit;
        totalRubro += totalItem;

        const pctAnterior = 50;
        const impAnterior = totalItem * (pctAnterior / 100);
        rubroAnterior += impAnterior;

        const keyMap = `${rIdx}-${tIdx}`;
        const pctActual = avanceActualMap[keyMap] !== undefined ? Number(avanceActualMap[keyMap]) : 30;
        const impActual = totalItem * (pctActual / 100);
        rubroActual += impActual;

        const pctAcumulado = Math.min(100, pctAnterior + pctActual);
        const impAcumulado = impAnterior + impActual;

        sumaTotalPresupuesto += totalItem;
        sumaTotalAnterior += impAnterior;
        sumaTotalActual += impActual;
        sumaTotalAcumulado += impAcumulado;
        totalPresupuestoCalc += totalItem;
        totalActualCalc += impActual;

        return {
          rIdx,
          tIdx,
          tarea: t?.tarea || t?.descripcion || 'Índice de obra',
          unidad: t?.unidad || 'm2',
          cant,
          totalItem,
          pctAnterior,
          impAnterior,
          pctActual,
          impActual,
          pctAcumulado,
          impAcumulado,
          keyMap
        };
      });

      return {
        rIdx,
        nombre: rubro?.rubro || `Rubro #${rIdx + 1}`,
        totalRubro,
        rubroAnterior,
        rubroActual,
        tareasFilas
      };
    });

    return { filasRender, sumaTotalPresupuesto, sumaTotalAnterior, sumaTotalActual, sumaTotalAcumulado, totalPresupuestoCalc, totalActualCalc };
  }, [certificadoPresupuestoObj, avanceActualMap]);

  const aprobarYGuardarCertificado = async (e) => {
    e.preventDefault();
    if (!certificadoPresupuestoObj) {
      alert("Seleccione un presupuesto aprobado.");
      return;
    }
    if (!certRespProveedor?.nombre?.trim() || !certRespCliente?.nombre?.trim()) {
      alert("Por favor complete los nombres de los responsables.");
      return;
    }

    setIsSavingCert(true);
    try {
      const totalPresupuestoBase = certificadoCalculos?.totalPresupuestoCalc || 1;
      const totalCertificadoPeriodo = certificadoNro === '0' ? 0 : certificadoCalculos?.totalActualCalc;
      let montoAdelantoCalculado = adelantoMonto;
      if (certificadoNro === '0') {
        montoAdelantoCalculado = totalPresupuestoBase * (adelantoPct / 100);
      }
      const descuentoAdelantoCert = certificadoNro !== '0' ? totalCertificadoPeriodo * (adelantoPct / 100) : 0;
      const netoACertificar = totalCertificadoPeriodo - (certificadoNro === '0' ? 0 : descuentoAdelantoCert) + Number(adicionalesMonto);
      
      let montoRedetCalculado = redeterminacionMonto;
      if (redeterminacionPct > 0) {
        montoRedetCalculado = netoACertificar * (redeterminacionPct / 100);
      }
      const totalFinalLiquidacion = certificadoNro === '0' ? montoAdelantoCalculado : (netoACertificar + montoRedetCalculado);

      const clienteNombreFinal = obtenerClienteDePresupuesto(certificadoPresupuestoObj);

      const payloadCert = {
        action: 'guardar',
        tabla: 'Certificaciones',
        presupuesto_id: certPresupuestoId,
        certificado_nro: certificadoNro,
        fecha: certFecha,
        cliente: clienteNombreFinal,
        obra: certificadoPresupuestoObj?.nombre || certificadoPresupuestoObj?.nombre_obra || '',
        orden_compra: certificadoPresupuestoObj?.orden_compra || certificadoPresupuestoObj?.ordenCompra || certificadoPresupuestoObj?.oc || '',
        total_periodo: totalCertificadoPeriodo,
        adelanto_descuento: descuentoAdelantoCert,
        adicionales: Number(adicionalesMonto) || 0,
        redeterminacion: montoRedetCalculado,
        total_general: totalFinalLiquidacion,
        proveedor_nombre: certRespProveedor?.nombre || '',
        proveedor_cargo: certRespProveedor?.cargo || '',
        cliente_nombre: certRespCliente?.nombre || '',
        cliente_cargo: certRespCliente?.cargo || ''
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadCert)
      });
      const resultado = await res.json();

      if (resultado?.success === false) {
        alert("Error al guardar el certificado en Sheets: " + (resultado?.error || 'Desconocido'));
        setIsSavingCert(false);
        return;
      }

      setFetchedCertificados(prev => [{ ...payloadCert, id: `cert-${Date.now()}` }, ...prev]);
      alert("¡Certificado guardado con éxito en el sistema y base de datos!");
    } catch (err) {
      console.error("Error al guardar certificado:", err);
      alert("Ocurrió un error al guardar el certificado.");
    } finally {
      setIsSavingCert(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm print:hidden">
        <h1 className="text-2xl font-extrabold text-slate-900">Control y Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">
          {esOperador ? "(Vista de Operador - Reportes Diarios)" : "(Certificaciones - Reportes - Listado de Insumos - Comparativas)"}
        </p>
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
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" /> Gestión de Certificaciones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Seleccione el tipo de certificación a emitir o auditar en el sistema.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('avance_obra')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'avance_obra' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Building2 className="w-4 h-4 text-amber-600" /> Avance de Obra
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado Avance de Obra - Presupuesto</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('horas_hombre')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'horas_hombre' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Clock className="w-4 h-4 text-amber-600" /> Horas Hombre
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado de Horas Hombre - Contrato</p>
            </button>

            <button
              type="button"
              onClick={() => setTipoCertificadoSubTab('compra_materiales')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${tipoCertificadoSubTab === 'compra_materiales' ? 'bg-amber-50 border-amber-500 shadow-xs' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-1">
                <Package className="w-4 h-4 text-amber-600" /> Compra de Materiales
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">Certificado de Compra de Materiales - Contrato</p>
            </button>
          </div>

          {tipoCertificadoSubTab === 'avance_obra' && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase">Certificado Avance de Obra - Presupuesto</h4>
                    <p className="text-[11px] text-slate-500">Seleccione un presupuesto aprobado para generar o visualizar el certificado.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">Certificado N°:</label>
                    <select
                      value={certificadoNro}
                      onChange={(e) => setCertificadoNro(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="0">0 (Adelanto Financiero)</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700">Fecha Emisión:</label>
                    <input
                      type="date"
                      value={certFecha}
                      onChange={(e) => setCertFecha(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select
                    value={certPresupuestoId}
                    onChange={(e) => setCertPresupuestoId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Seleccionar Presupuesto Aprobado ({presupuestosDisponiblesCert.length} disp.) --</option>
                    {presupuestosDisponiblesCert.map(p => (
                      <option key={p?.id || p?.ID} value={p?.id || p?.ID}>
                        [{p?.codigo || p?.id}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}
                      </option>
                    ))}
                  </select>
                  {certificadoPresupuestoObj && (
                    <button 
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      <Printer className="w-4 h-4" /> Imprimir / PDF
                    </button>
                  )}
                </div>
              </div>

              {!certificadoPresupuestoObj ? (
                <div className="p-16 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                  Seleccione un presupuesto aprobado en el selector superior para desplegar el Certificado de Avance de Obra. (Los presupuestos ya certificados para el N° {certificadoNro} no aparecen en la lista).
                </div>
              ) : (
                <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-6 text-slate-900 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
                    <div>
                      <img src="/logo-07.png" alt="SICE S.A." className="h-20 object-contain mb-2" />
                      <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase">
                        CERTIFICADO POR AVANCE DE OBRA
                      </h2>
                      <p className={`text-sm font-bold mt-1 ${certificadoNro === '0' ? 'text-blue-600' : 'text-slate-700'}`}>
                        Certificado Nro.: {certificadoNro} {certificadoNro === '0' ? '(Adelanto Financiero)' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-b border-slate-300 pb-4 bg-slate-50 p-4 rounded-xl">
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block">Cliente:</span>
                      <strong className="text-slate-900">
                        {obtenerClienteDePresupuesto(certificadoPresupuestoObj)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Presupuesto Nro:</span>
                      <strong className="text-slate-900">{certificadoPresupuestoObj?.codigo || certificadoPresupuestoObj?.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Fecha Emisión:</span>
                      <strong className="text-slate-900">{certFecha}</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 font-semibold block">Obra:</span>
                      <strong className="text-slate-900 block mt-0.5">{certificadoPresupuestoObj?.nombre || certificadoPresupuestoObj?.nombre_obra || 'Obra Albañilería - Vivienda Unifamiliar'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-semibold block">Orden de Compra:</span>
                      <strong className="text-slate-900">{certificadoPresupuestoObj?.orden_compra || certificadoPresupuestoObj?.ordenCompra || certificadoPresupuestoObj?.oc || '---'}</strong>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-400 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse table-auto">
                      <thead>
                        <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                          <th className="py-2.5 px-2 border-r border-slate-700 w-10 text-center" rowSpan="2">Ítem</th>
                          <th className="py-2.5 px-3 border-r border-slate-700" rowSpan="2">Descripción del Rubro / Tarea</th>
                          <th className="py-2.5 px-1 border-r border-slate-700 text-center w-10" rowSpan="2">Und</th>
                          <th className="py-2.5 px-1 border-r border-slate-700 text-right w-12" rowSpan="2">Cant.</th>
                          <th className="py-2.5 px-3 border-r border-slate-700 text-right w-36 whitespace-nowrap" rowSpan="2">Total Cotizado</th>
                          <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ANTERIOR</th>
                          <th className="py-2.5 px-1 border-r border-slate-700 text-center bg-slate-700" colSpan="2">ACTUAL (PERÍODO)</th>
                          <th className="py-2.5 px-1 text-center bg-slate-700" colSpan="2">ACUMULADO</th>
                        </tr>
                        <tr className="bg-slate-700 text-white font-bold text-[9px]">
                          <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                          <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                          <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                          <th className="py-1 px-3 text-right w-36 border-r border-slate-600 whitespace-nowrap">Importe ($)</th>
                          <th className="py-1 px-1 text-center w-10 border-r border-slate-600">%</th>
                          <th className="py-1 px-3 text-right w-36 whitespace-nowrap">Importe ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {certificadoCalculos.filasRender.map((rubroObj) => (
                          <React.Fragment key={rubroObj.rIdx}>
                            <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                              <td className="py-2 px-2 text-center border-r border-slate-300">{rubroObj.rIdx + 1}</td>
                              <td className="py-2 px-3 uppercase border-r border-slate-300" colSpan="3">{rubroObj.nombre}</td>
                              <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.totalRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                              <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.rubroAnterior.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                              <td className="py-2 px-3 text-right border-r border-slate-300 whitespace-nowrap">$ {rubroObj.rubroActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              <td className="py-2 px-1 text-center border-r border-slate-300">-</td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">$ {(rubroObj.rubroAnterior + rubroObj.rubroActual).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            </tr>
                            {rubroObj.tareasFilas.map((t) => (
                              <tr key={t.tIdx} className="hover:bg-amber-50/40 text-xs">
                                <td className="py-2 px-2 text-center font-bold text-slate-700 border-r border-slate-300">{t.rIdx + 1}.{t.tIdx + 1}</td>
                                <td className="py-2 px-3 text-slate-800 border-r border-slate-300 font-medium">{t.tarea}</td>
                                <td className="py-2 px-1 text-center text-slate-500 border-r border-slate-300">{t.unidad}</td>
                                <td className="py-2 px-1 text-right border-r border-slate-300">{t.cant}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">$ {t.totalItem.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 px-1 text-center border-r border-slate-300 text-slate-600">{t.pctAnterior}%</td>
                                <td className="py-2 px-3 text-right border-r border-slate-300 text-slate-600 whitespace-nowrap">$ {t.impAnterior.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 px-1 text-center border-r border-slate-300 bg-amber-50/50">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={t.pctActual}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setAvanceActualMap({ ...avanceActualMap, [t.keyMap]: val });
                                    }}
                                    className="w-10 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-bold text-xs outline-none focus:border-amber-500"
                                  />
                                </td>
                                <td className="py-2 px-3 text-right border-r border-slate-300 font-semibold text-amber-900 bg-amber-50/50 whitespace-nowrap">$ {t.impActual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 px-1 text-center border-r border-slate-300 font-bold text-slate-700">{t.pctAcumulado}%</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-950 whitespace-nowrap">$ {t.impAcumulado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-300 pb-2">RESUMEN Y LIQUIDACIÓN FINANCIERA</h3>
                    
                    {(() => {
                      const totalPresupuestoBase = certificadoCalculos.totalPresupuestoCalc || 1;
                      const totalCertificadoPeriodo = certificadoNro === '0' ? 0 : certificadoCalculos.totalActualCalc;

                      let montoAdelantoCalculado = adelantoMonto;
                      if (certificadoNro === '0') {
                        montoAdelantoCalculado = totalPresupuestoBase * (adelantoPct / 100);
                      }

                      const descuentoAdelantoCert = certificadoNro !== '0' ? totalCertificadoPeriodo * (adelantoPct / 100) : 0;
                      const netoACertificar = totalCertificadoPeriodo - (certificadoNro === '0' ? 0 : descuentoAdelantoCert) + Number(adicionalesMonto);
                      
                      let montoRedetCalculado = redeterminacionMonto;
                      if (redeterminacionPct > 0) {
                        montoRedetCalculado = netoACertificar * (redeterminacionPct / 100);
                      }

                      const totalFinalLiquidacion = certificadoNro === '0' ? montoAdelantoCalculado : (netoACertificar + montoRedetCalculado);

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                              <span className="font-bold text-slate-700">Total Certificado Período (Actual):</span>
                              <span className="font-black text-slate-900 text-sm">$ {totalCertificadoPeriodo.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>

                            {certificadoNro === '0' ? (
                              <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2">
                                <span className="font-bold text-slate-700 block">Adelanto Financiero:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={adelantoPct}
                                      onChange={(e) => {
                                        const pct = parseFloat(e.target.value) || 0;
                                        setAdelantoPct(pct);
                                        setAdelantoMonto(Math.round(totalPresupuestoBase * (pct / 100)));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-amber-900 outline-none focus:border-amber-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Monto Absoluto ($)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={Math.round(adelantoMonto || montoAdelantoCalculado)}
                                      onChange={(e) => {
                                        const monto = parseFloat(e.target.value) || 0;
                                        setAdelantoMonto(monto);
                                        setAdelantoPct(totalPresupuestoBase > 0 ? Number(((monto / totalPresupuestoBase) * 100).toFixed(2)) : 0);
                                      }}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-amber-900 outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </div>
                                <div className="text-right pt-1 font-black text-amber-900 text-xs">
                                  Monto Adelanto: $ {Math.round(adelantoMonto || montoAdelantoCalculado).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                                <span className="font-bold text-slate-700">Descuento por Adelanto Financiero ({adelantoPct}%):</span>
                                <span className="font-black text-rose-700">- $ {descuentoAdelantoCert.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-300">
                              <span className="font-bold text-slate-700">Adicionales Aprobados:</span>
                              <input
                                type="number"
                                value={adicionalesMonto}
                                onChange={(e) => setAdicionalesMonto(e.target.value)}
                                className="w-32 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-emerald-700 outline-none focus:border-amber-500"
                              />
                            </div>

                            <div className="flex justify-between items-center bg-slate-900 text-white p-3.5 rounded-xl shadow">
                              <span className="font-extrabold text-xs uppercase">TOTAL NETO A CERTIFICAR:</span>
                              <span className="font-black text-base text-amber-400">$ {netoACertificar.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {certificadoNro !== '0' ? (
                              <div className="bg-white p-3 rounded-xl border border-slate-300 space-y-2">
                                <span className="font-bold text-slate-700 block">Redeterminación de Precio:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Porcentaje (%)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={redeterminacionPct}
                                      onChange={(e) => {
                                        const pct = parseFloat(e.target.value) || 0;
                                        setRedeterminacionPct(pct);
                                        setRedeterminacionMonto(Math.round(netoACertificar * (pct / 100)));
                                      }}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Monto Absoluto ($)</label>
                                    <input
                                      type="number"
                                      step="1"
                                      value={Math.round(redeterminacionMonto || montoRedetCalculado)}
                                      onChange={(e) => {
                                        const monto = parseFloat(e.target.value) || 0;
                                        setRedeterminacionMonto(monto);
                                        setRedeterminacionPct((monto / (netoACertificar || 1)) * 100);
                                      }}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-900 outline-none focus:border-amber-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white p-3 rounded-xl border border-slate-300 text-slate-400 italic text-center py-4">
                                Redeterminación no aplicable en Adelanto Financiero.
                              </div>
                            )}

                            <div className="flex justify-between items-center bg-slate-950 text-white p-4 rounded-xl shadow-md mt-6">
                              <span className="font-extrabold text-xs uppercase">TOTAL GENERAL A CERTIFICAR:</span>
                              <span className="font-black text-lg text-amber-400">$ {totalFinalLiquidacion.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <form onSubmit={aprobarYGuardarCertificado} className="border-2 border-slate-800 rounded-xl overflow-hidden mt-6 bg-slate-50 p-4 space-y-4 print:hidden">
                    <h4 className="font-black text-xs text-slate-900 uppercase">Aprobación y Firma del Certificado</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                        <p className="font-bold text-slate-800 uppercase">Responsable Proveedor</p>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-0.5">Nombre y Apellido:</label>
                          <input 
                            type="text" 
                            required
                            value={certRespProveedor.nombre}
                            onChange={(e) => setCertRespProveedor({...certRespProveedor, nombre: e.target.value})}
                            placeholder="Ej: Alexander Torres Lopez"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-0.5">Cargo:</label>
                          <input 
                            type="text" 
                            required
                            value={certRespProveedor.cargo}
                            onChange={(e) => setCertRespProveedor({...certRespProveedor, cargo: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-300">
                        <p className="font-bold text-slate-800 uppercase">Responsable Cliente</p>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-0.5">Nombre y Apellido:</label>
                          <input 
                            type="text" 
                            required
                            value={certRespCliente.nombre}
                            onChange={(e) => setCertRespCliente({...certRespCliente, nombre: e.target.value})}
                            placeholder="Ej: Cristian Matei"
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-600 mb-0.5">Cargo:</label>
                          <input 
                            type="text" 
                            required
                            value={certRespCliente.cargo}
                            onChange={(e) => setCertRespCliente({...certRespCliente, cargo: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button 
                        type="submit"
                        disabled={isSavingCert}
                        className={`px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2 ${isSavingCert ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSavingCert ? (
                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Procesando...</>
                        ) : (
                          <><ShieldCheck className="w-4 h-4" /> Guardar Certificado en Sheets</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Historial de Certificados al Pie */}
              <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-4 mt-6 print:hidden">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase">Historial de Certificados Emitidos</h3>
                {allCertificados.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                    No hay certificados guardados o emitidos previamente.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                          <th className="px-4 py-3">Certificado N°</th>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Obra</th>
                          <th className="px-4 py-3 text-right">Total General</th>
                          <th className="px-4 py-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allCertificados.map((cert, idx) => {
                          const nroCert = cert?.certificadoNro !== undefined ? cert.certificadoNro : (cert?.certificado_nro || '0');
                          const fechaCert = cert?.fecha || cert?.fecha_emision || '---';
                          
                          const rawCliente = cert?.cliente;
                          const clienteCert = (rawCliente && typeof rawCliente === 'object') 
                            ? (rawCliente.nombre || '---') 
                            : (rawCliente || '---');

                          const obraCert = cert?.obra || '---';
                          const totalGen = Number(cert?.totalGeneral || cert?.total_general || 0);
                          const pdfLink = cert?.pdfUrl || cert?.pdf_url;

                          return (
                            <tr key={cert?.id || idx} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-amber-800">
                                Certificado #{nroCert} {nroCert === '0' ? '(Adelanto)' : ''}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{fechaCert}</td>
                              <td className="px-4 py-3 text-slate-800 font-semibold">{clienteCert}</td>
                              <td className="px-4 py-3 text-slate-600">{obraCert}</td>
                              <td className="px-4 py-3 text-right font-black text-slate-950">
                                $ {totalGen.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {pdfLink ? (
                                  <a
                                    href={pdfLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Ver PDF
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">Guardado en Base de Datos</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {tipoCertificadoSubTab === 'horas_hombre' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Certificado de Horas Hombre - Contrato</h4>
                  <p className="text-[11px] text-slate-500">Consolidado de horas trabajadas y validadas a partir del historial de partes diarios SICE.</p>
                </div>
              </div>

              {allReportesSice.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                  No hay partes diarios o registros de horas hombre aprobados para certificar.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                      <th className="px-4 py-3">Parte Nro</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Contrato Asociado</th>
                      <th className="px-4 py-3 text-center">Total Horas Validadas</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allReportesSice.map((parte, idx) => {
                      const parteId = parte?.id || parte?.nro || idx;
                      const totalHs = parte?.totalHorasSuma || parte?.total_horas_suma || 0;
                      return (
                        <tr key={parteId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-amber-800">Parte #{parte?.nro || '00001'}</td>
                          <td className="px-4 py-3 text-slate-600">{parte?.fecha || '---'}</td>
                          <td className="px-4 py-3 text-800 font-semibold">{parte?.contratoid || 'Contrato SICE General'}</td>
                          <td className="px-4 py-3 text-center font-black text-emerald-700">{totalHs} hs</td>
                          <td className="px-4 py-3 text-center">
                            {parte?.pdfUrl || parte?.pdf_url ? (
                              <a
                                href={parte?.pdfUrl || parte?.pdf_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] inline-flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Ver Certificado PDF
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Generado en sistema</span>
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

          {tipoCertificadoSubTab === 'compra_materiales' && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Certificado de Compra de Materiales - Contrato</h4>
                  <p className="text-[11px] text-slate-500">Auditoría y certificación de insumos y facturas de compras imputadas a los contratos activos.</p>
                </div>
              </div>

              {facturas.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
                  No hay facturas o compras de materiales registradas para certificar.
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                      <th className="px-4 py-3">Nro. Factura / Comprobante</th>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3 text-right">Monto Total</th>
                      <th className="px-4 py-3 text-center">Estado Certificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facturas.map((fac, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold text-slate-900">{fac?.n_factura || fac?.nro_factura || `Factura #${idx + 1}`}</td>
                        <td className="px-4 py-3 text-slate-600">{fac?.proveedor || 'Proveedor General'}</td>
                        <td className="px-4 py-3 text-slate-600">{fac?.fecha || '---'}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">$ {Number(fac?.total || fac?.subtotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase bg-emerald-100 text-emerald-800">
                            Certificado
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'Reportes Diarios' || esOperador) && (
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
                    const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo']) || i);
                    const cCod = buscarValorEnObjeto(c, ['codigo', 'Codigo']) || 'S/C';
                    const cNom = buscarValorEnObjeto(c, ['nombre', 'nombre_contrato', 'Nombre_contrato', 'nombreContrato', 'cliente', 'Cliente']) || 'Contrato';
                    const cEst = buscarValorEnObjeto(c, ['estado', 'Estado']) || 'Activo';
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
                      <div key={op?.id || idx} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                        <div className="w-full sm:flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5 sm:hidden">Empleado (RRHH Activos)</label>
                          <select
                            value={op?.nombre}
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
                              const empNom = buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido']) || `Operario ${eIdx + 1}`;
                              const isSelectedElsewhere = operariosSeleccionados.some((oItem, oIdx) => oIdx !== idx && oItem?.nombre === empNom);

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
                            value={op?.abreviacion}
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
                            value={op?.horas}
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
                      const totalHs = calcularTotalHorasSice(row?.horaComienzo, row?.horaFin);
                      return (
                        <tr key={index} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
                          <td className="py-2 px-2 text-center font-bold border-r border-slate-300 text-slate-700">{row?.id}</td>
                          <td className="py-1.5 px-2 border-r border-slate-300">
                            <input 
                              type="text" 
                              value={row?.descripcion}
                              onChange={(e) => actualizarItemSice(index, 'descripcion', e.target.value)}
                              placeholder="Descripción de labores..."
                              className="w-full bg-amber-100/50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                            <input 
                              type="time" 
                              value={row?.horaComienzo}
                              onChange={(e) => actualizarItemSice(index, 'horaComienzo', e.target.value)}
                              className="bg-amber-100/50 border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold focus:bg-white focus:outline-none focus:border-amber-500 text-center"
                            />
                          </td>
                          <td className="py-1.5 px-2 border-r border-slate-300 text-center">
                            <input 
                              type="time" 
                              value={row?.horaFin}
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
                              value={row?.observaciones}
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
                                className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row?.terminoTarea === 'SI' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
                              >
                                SI
                              </button>
                              <button
                                type="button"
                                onClick={() => actualizarItemSice(index, 'terminoTarea', 'NO')}
                                className={`px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer ${row?.terminoTarea === 'NO' ? 'bg-rose-600 text-white shadow' : 'bg-slate-200 text-slate-700'}`}
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
                  const parteId = parte?.id || parte?.nro || idx;
                  
                  const pObj = parte?.proveedor;
                  const pNombre = (pObj && typeof pObj === 'object') ? (pObj.nombre || '---') : (pObj || '---');
                  const pCargo = (pObj && typeof pObj === 'object') ? (pObj.cargo || '---') : '';

                  const cObj = parte?.cliente;
                  const cNombre = (cObj && typeof cObj === 'object') ? (cObj.nombre || '---') : (cObj || '---');
                  const cCargo = (cObj && typeof cObj === 'object') ? (cObj.cargo || '---') : '';

                  return (
                    <div key={parteId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-full">Parte Nro: {parte?.nro}</span>
                          <span className="text-xs font-medium text-slate-500">Fecha: {parte?.fecha}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Total Horas: {parte?.totalHorasSuma} hs</span>
                        </div>
                        <p className="text-slate-700 text-xs mt-2">
                          Proveedor: <strong>{pNombre}</strong> ({pCargo}) | Cliente: <strong>{cNombre}</strong> ({cCargo})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {parte?.pdfUrl ? (
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Listado de Insumos por Presupuesto
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Seleccione un presupuesto aprobado para desglosar sus insumos y materiales.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={insumoPresupuestoId}
                onChange={(e) => setInsumoPresupuestoId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">-- Seleccionar Presupuesto Aprobado --</option>
                {presupuestos.filter(p => {
                  const est = String(p?.estado_presupuesto || p?.Estado_presupuesto || p?.estado || '').toLowerCase().trim();
                  return est === 'aprobado' || est === 'aprobada';
                }).map(p => (
                  <option key={p?.id || p?.ID} value={p?.id || p?.ID}>
                    [{p?.codigo || p?.id}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setVistaGeneralInsumos(!vistaGeneralInsumos)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {vistaGeneralInsumos ? 'Ver por Rubros' : 'Ver Vista General'}
              </button>
            </div>
          </div>

          {!presupuestoInsumosSeleccionado ? (
            <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Por favor, seleccione un presupuesto aprobado para visualizar sus insumos.
            </div>
          ) : vistaGeneralInsumos ? (
            <div className="space-y-6">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase">Consolidado General de Insumos</h4>
              {ordenCategorias.map(cat => {
                const itemsCat = insumosGenerales[cat] || [];
                if (itemsCat.length === 0) return null;
                const totalCat = itemsCat.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
                return (
                  <div key={cat} className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-xs text-slate-900 uppercase">{cat}</span>
                      <span className="font-black text-xs text-amber-800">$ {totalCat.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-bold uppercase text-[10px]">
                          <th className="py-2 px-2">Rubro / Tarea</th>
                          <th className="py-2 px-2">Insumo / Artículo</th>
                          <th className="py-2 px-2 text-center">Unidad</th>
                          <th className="py-2 px-2 text-right">Cant.</th>
                          <th className="py-2 px-2 text-right">C. Unit.</th>
                          <th className="py-2 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsCat.map((it, iIdx) => (
                          <tr key={iIdx} className="hover:bg-white">
                            <td className="py-2 px-2 text-slate-600 font-medium">{it?.rubro} / {it?.tarea}</td>
                            <td className="py-2 px-2 font-bold text-slate-900">{it?.nombre}</td>
                            <td className="py-2 px-2 text-center text-slate-500">{it?.unidad}</td>
                            <td className="py-2 px-2 text-right">{it?.cantidad}</td>
                            <td className="py-2 px-2 text-right">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(insumosPorRubro).length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No se encontraron rubros con insumos detallados en este presupuesto.</div>
              ) : (
                Object.entries(insumosPorRubro).map(([nombreRubro, cats]) => (
                  <div key={nombreRubro} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase border-b border-slate-200 pb-2">{nombreRubro}</h4>
                    {ordenCategorias.map(cat => {
                      const itemsCat = cats[cat] || [];
                      if (itemsCat.length === 0) return null;
                      const subCatTotal = itemsCat.reduce((acc, i) => acc + (Number(i?.total) || 0), 0);
                      return (
                        <div key={cat} className="space-y-2 pl-4 border-l-2 border-amber-500">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-700 uppercase">{cat}</span>
                            <span className="font-black text-xs text-amber-800">$ {subCatTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-500 font-bold uppercase text-[10px]">
                                <th className="py-1.5 px-2">Tarea</th>
                                <th className="py-1.5 px-2">Insumo</th>
                                <th className="py-1.5 px-2 text-center">Unidad</th>
                                <th className="py-1.5 px-2 text-right">Cant.</th>
                                <th className="py-1.5 px-2 text-right">C. Unit.</th>
                                <th className="py-1.5 px-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {itemsCat.map((it, iIdx) => (
                                <tr key={iIdx} className="hover:bg-white">
                                  <td className="py-1.5 px-2 text-slate-600">{it?.tarea}</td>
                                  <td className="py-1.5 px-2 font-bold text-slate-900">{it?.nombre}</td>
                                  <td className="py-1.5 px-2 text-center text-slate-500">{it?.unidad}</td>
                                  <td className="py-1.5 px-2 text-right">{it?.cantidad}</td>
                                  <td className="py-1.5 px-2 text-right">$ {Number(it?.costo_unitario).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                  <td className="py-1.5 px-2 text-right font-bold text-slate-900">$ {Number(it?.total).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {!esOperador && activeTab === 'Comparativo' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" /> Análisis Comparativo (Presupuesto vs. Real)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Cruce de montos presupuestados con imputaciones reales de facturas, gastos y salarios de RRHH.</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={compObraId}
                onChange={(e) => {
                  setCompObraId(e.target.value);
                  setCompPresupuestoId('');
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="todas">-- Todas las Obras --</option>
                {obras.map(o => (
                  <option key={o?.id || o?.ID} value={o?.id || o?.ID}>{o?.nombre || o?.nombre_obra || 'Obra'}</option>
                ))}
              </select>
              <select
                value={compPresupuestoId}
                onChange={(e) => setCompPresupuestoId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">-- Seleccionar Presupuesto Aprobado --</option>
                {presupuestosCompFiltrados.map(p => (
                  <option key={p?.id || p?.ID} value={p?.id || p?.ID}>[{p?.codigo || p?.id}] {p?.nombre || p?.nombre_obra || 'Presupuesto'}</option>
                ))}
              </select>
            </div>
          </div>

          {!presupuestoSeleccionado ? (
            <div className="p-12 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-2xl">
              Por favor, seleccione un presupuesto aprobado para visualizar el análisis comparativo financiero.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Total Presupuestado</span>
                  <p className="text-lg font-black text-slate-900 mt-1">$ {granTotalPresupuestado.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Total Imputado Real</span>
                  {(() => {
                    const totalRealRubros = rubrosPresupuestoDetalle.reduce((sum, r) => {
                      const salariosRubro = obtenerSalariosPorRubro(r?.nombre);
                      const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
                      return sum + salariosRubro + facturasRubro;
                    }, 0);
                    const totalRealGG = gastosGeneralesDetalle.reduce((acc, g) => acc + (g?.real || 0), 0);
                    const granTotalReal = totalRealRubros + totalRealGG;
                    return <p className="text-lg font-black text-amber-700 mt-1">$ {granTotalReal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</p>;
                  })()}
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Desvío Financiero Total</span>
                  {(() => {
                    const totalRealRubros = rubrosPresupuestoDetalle.reduce((sum, r) => {
                      const salariosRubro = obtenerSalariosPorRubro(r?.nombre);
                      const facturasRubro = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(r?.nombre)).reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
                      return sum + salariosRubro + facturasRubro;
                    }, 0);
                    const totalRealGG = gastosGeneralesDetalle.reduce((acc, g) => acc + (g?.real || 0), 0);
                    const granTotalReal = totalRealRubros + totalRealGG;
                    const desvioTotal = granTotalPresupuestado - granTotalReal;
                    return (
                      <p className={`text-lg font-black mt-1 ${desvioTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        $ {desvioTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase">Detalle por Rubro Constructivo</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                        <th className="px-4 py-3">Rubro</th>
                        <th className="px-4 py-3 text-right">Presupuestado</th>
                        <th className="px-4 py-3 text-right">Salarios RRHH</th>
                        <th className="px-4 py-3 text-right">Facturas / Materiales</th>
                        <th className="px-4 py-3 text-right">Total Real</th>
                        <th className="px-4 py-3 text-right">Desvío</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rubrosPresupuestoDetalle.map(rubro => {
                        const salariosRubro = obtenerSalariosPorRubro(rubro?.nombre);
                        const facturasRubroTotal = facturasPresupuesto.filter(f => limpiarTexto(f?.rubro_presupuesto || f?.rubro || '') === limpiarTexto(rubro?.nombre));
                        const facturasRubroSuma = facturasRubroTotal.reduce((acc, f) => acc + Number(f?.subtotal || f?.Subtotal || 0), 0);
                        const totalRealRubro = salariosRubro + facturasRubroSuma;
                        const desvioRubro = (rubro?.total || 0) - totalRealRubro;

                        return (
                          <tr key={rubro?.id} className="hover:bg-slate-50 font-medium">
                            <td className="px-4 py-3 font-bold text-slate-900">{rubro?.nombre}</td>
                            <td className="px-4 py-3 text-right font-bold">$ {(rubro?.total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-3 text-right text-slate-600">$ {salariosRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-3 text-right text-slate-600">$ {facturasRubroSuma.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className="px-4 py-3 text-right font-black text-amber-700">$ {totalRealRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                            <td className={`px-4 py-3 text-right font-black ${desvioRubro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              $ {desvioRubro.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase">Gastos Generales e Imprevistos</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200 text-[10px]">
                        <th className="px-4 py-3">Concepto</th>
                        <th className="px-4 py-3 text-right">Presupuestado</th>
                        <th className="px-4 py-3 text-right">Real Imputado</th>
                        <th className="px-4 py-3 text-right">Desvío</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastosGeneralesDetalle.map(gg => (
                        <tr key={gg?.id} className="hover:bg-slate-50 font-medium">
                          <td className="px-4 py-3 font-bold text-slate-900">{gg?.concepto}</td>
                          <td className="px-4 py-3 text-right font-bold">$ {(gg?.total || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className="px-4 py-3 text-right font-black text-amber-700">$ {(gg?.real || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</td>
                          <td className={`px-4 py-3 text-right font-black ${(gg?.desvio || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            $ {(gg?.desvio || 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {parteVisualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-300 p-6 space-y-6 text-slate-900 relative">
            <button 
              onClick={() => setParteVisualizando(null)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 pr-12">
              <img src="/logo-07.png" alt="SICE S.A." className="h-20 object-contain" />
              <h2 className="text-lg font-black text-slate-900 tracking-wide text-right">PARTE DIARIO DE ACTIVIDADES</h2>
            </div>

            <div className="text-xs space-y-2 border-b border-slate-300 pb-4">
              <p className="font-extrabold text-blue-900 text-sm">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div><span className="text-slate-500 font-semibold">C.U.I.T.:</span> <span className="font-bold">30-71573431-8</span></div>
                <div><span className="text-slate-500 font-semibold">Cliente:</span> <span className="font-bold">LDC Argentina S.A.</span></div>
                <div><span className="text-slate-500 font-semibold">Fecha:</span> <span className="font-bold">{parteVisualizando?.fecha}</span></div>
                <div><span className="text-slate-500 font-semibold">Parte Nro.:</span> <span className="font-black text-amber-600 font-mono">{parteVisualizando?.nro}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" /> Operarios Presentes
              </h4>
              <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 p-3 space-y-1">
                {Array.isArray(parteVisualizando?.operarios) && parteVisualizando.operarios.length > 0 ? (
                  parteVisualizando.operarios.map((op, oIdx) => (
                    <div key={oIdx} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-200">
                      <span className="font-bold text-slate-800">{op?.nombre}</span>
                      <div className="flex gap-4">
                        <span className="text-slate-600">Cat./Abrev: <strong>{op?.abreviacion}</strong></span>
                        <span className="text-amber-800 font-black">{op?.horas} hs</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-1">Registrado con operario principal.</p>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center">Item</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-28">Comienzo</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-28">Fin</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-24">Total</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                    <th className="py-2.5 px-3 text-center w-24">Terminó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.isArray(parteVisualizando?.items) && parteVisualizando.items.map((it, iIdx) => (
                    <tr key={iIdx} className="bg-white">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{it?.id || iIdx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{it?.descripcion || '---'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaComienzo || '08:00'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaFin || '17:00'}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-amber-900 bg-amber-50">{calcularTotalHorasSice(it?.horaComienzo, it?.horaFin)} hs</td>
                      <td className="py-2.5 px-3 text-slate-600">{it?.observaciones || '---'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it?.terminoTarea || 'SI'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-300 rounded-xl p-4 bg-slate-50 text-xs">
              <div>
                <h5 className="font-black text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Responsable Proveedor</h5>
                <p><span className="text-slate-500">Cargo:</span> <strong>{parteVisualizando?.proveedor?.cargo}</strong></p>
                <p><span className="text-slate-500">Nombre:</span> <strong>{parteVisualizando?.proveedor?.nombre}</strong></p>
                <p className="text-emerald-700 font-semibold mt-1">✔ Firmado y Validado</p>
              </div>
              <div>
                <h5 className="font-black text-slate-900 uppercase border-b border-slate-300 pb-1 mb-2">Responsable Cliente</h5>
                <p><span className="text-slate-500">Cargo:</span> <strong className="text-slate-950">{parteVisualizando?.cliente?.cargo}</strong></p>
                <p><span className="text-slate-500">Nombre:</span> <strong className="text-slate-950">{parteVisualizando?.cliente?.nombre}</strong></p>
                <p className="text-emerald-700 font-semibold mt-1">✔ Firmado y Validado</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center gap-2 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Documento
              </button>
              <button
                onClick={() => setParteVisualizando(null)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reportes(props) {
  return (
    <ErrorBoundary>
      <ReportesContent {...props} />
    </ErrorBoundary>
  );
}