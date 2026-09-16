import React, { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Printer, Plus, Trash2, ShieldCheck, ExternalLink, Eye, X, Users, Calendar, Calculator } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '../../api';
import { useObraData } from '../../hooks/useObraData';
import { OBRAS_CONFIG } from '../../config/constants';
import { crearDoc, eliminarDoc } from '../../lib/firestoreHelpers';

const MAX_ENTRADAS_LOCALSTORAGE = 300;

function guardarEnLocalStorageConLimite(key, arr) {
  try {
    const limitado = Array.isArray(arr) ? arr.slice(-MAX_ENTRADAS_LOCALSTORAGE) : arr;
    localStorage.setItem(key, JSON.stringify(limitado));
    return limitado;
  } catch (e) {
    return arr;
  }
}

export default function ReportesDiariosTab({
  contratosList: propContratos = [],
  allReportesSice: propReportes = [],
  setFetchedReportesSice = () => {},
  listaEmpleadosActivos: propEmpleados = [],
  personal: propPersonal = [],
  esOperador = false,
  currentUser = null,
  onEliminadosChange = () => {},
  buscarValorEnObjeto = (obj, keys) => {
    if (!obj) return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) return obj[key];
    }
    return '';
  }
}) {
  const { data: contratosSheet } = useObraData(OBRAS_CONFIG?.TABLAS?.CONTRATOS || 'ContratosMantenimiento');
  const { data: reportesSheet, refetch: refetchReportes } = useObraData(OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice');
  const { data: personalSheet } = useObraData('Personal');

  const [partesRecienModificados, setPartesRecienModificados] = useState(() => {
    try {
      const raw = localStorage.getItem('sice_partes_recien_modificados_v1');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [idsEliminadosLocales, setIdsEliminadosLocales] = useState(() => {
    try {
      const eliminados = localStorage.getItem('sice_partes_eliminados_global_v5');
      return eliminados ? JSON.parse(eliminados) : [];
    } catch {
      return [];
    }
  });

  const extraerArrayDatos = (fuente) => {
    if (Array.isArray(fuente)) return fuente;
    if (fuente && typeof fuente === 'object') {
      if (Array.isArray(fuente.data)) return fuente.data;
      if (Array.isArray(fuente.items)) return fuente.items;
      if (Array.isArray(fuente.result)) return fuente.result;
      const posibleArray = Object.values(fuente).find(val => Array.isArray(val));
      if (posibleArray) return posibleArray;
    }
    return [];
  };

  const contratosList = useMemo(() => {
    const p = extraerArrayDatos(propContratos);
    if (p.length > 0) return p;
    return extraerArrayDatos(contratosSheet);
  }, [propContratos, contratosSheet]);

  const allReportesSice = useMemo(() => {
    const s = extraerArrayDatos(reportesSheet);
    const p = extraerArrayDatos(propReportes);

    const nrosEnSheet = new Set([
      ...s.map(item => String(item?.nro || '').replace(/\D/g, '')),
      ...p.map(item => String(item?.nro || '').replace(/\D/g, ''))
    ].filter(Boolean));

    const prFiltrados = extraerArrayDatos(partesRecienModificados).filter(item => {
      const nroItem = String(item?.nro || '').replace(/\D/g, '');
      return nroItem && !nrosEnSheet.has(nroItem);
    });

    const base = [...s, ...p, ...prFiltrados];

    const unicosMap = new Map();

    const calcularScore = (item) => {
      const idNum = Number(item?.id || item?.ID || 0);
      if (idNum > 0) return idNum;
      const fecha = item?.fecha || item?.Fecha || '';
      if (fecha) {
        const ts = new Date(fecha).getTime();
        if (!isNaN(ts)) return ts;
      }
      return 0;
    };

    base.forEach(item => {
      if (!item) return;

      const idItem = String(item.id || item.ID || '').trim();
      const nroCrud = String(item.nro || item.Nro || item.numero || '').trim();
      const nroNormalizado = nroCrud ? parseInt(nroCrud.replace(/\D/g, ''), 10).toString() : '';
      const nroPadded = nroNormalizado ? nroNormalizado.padStart(5, '0') : '';

      const estaEliminadoPorId = idItem && idsEliminadosLocales.includes(idItem);
      const estaEliminadoPorNro = nroCrud && (
        idsEliminadosLocales.includes(nroCrud) ||
        idsEliminadosLocales.includes(nroNormalizado) ||
        idsEliminadosLocales.includes(nroPadded)
      );

      if (estaEliminadoPorId || estaEliminadoPorNro) return;

      const key = nroNormalizado ? `nro-${nroPadded}` : (idItem || `rand-${Math.random()}`);

      const scoreNuevo = calcularScore(item);

      if (!unicosMap.has(key)) {
        unicosMap.set(key, { item, score: scoreNuevo });
      } else {
        const existente = unicosMap.get(key);
        if (scoreNuevo > existente.score) {
          unicosMap.set(key, { item, score: scoreNuevo });
        }
      }
    });

    const resultado = Array.from(unicosMap.values()).map(entry => entry.item);

    return resultado.sort((a, b) => {
      const nA = parseInt(String(a.nro).replace(/\D/g, '') || '0', 10);
      const nB = parseInt(String(b.nro).replace(/\D/g, '') || '0', 10);
      return nB - nA;
    });
  }, [partesRecienModificados, reportesSheet, propReportes, idsEliminadosLocales]);

  const listaEmpleadosActivos = useMemo(() => {
    const p = extraerArrayDatos(propEmpleados);
    if (p.length > 0) return p;
    const s = extraerArrayDatos(personalSheet);
    if (s.length > 0) return s;
    return extraerArrayDatos(propPersonal);
  }, [propEmpleados, personalSheet, propPersonal]);

  const personal = propPersonal;

  const [contratoSeleccionadoId, setContratoSeleccionadoId] = useState('');
  const [siceFecha, setSiceFecha] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (contratoSeleccionadoId) {
      console.info('[ReportesDiarios] Contrato seleccionado:', contratoSeleccionadoId);
    }
  }, [contratoSeleccionadoId]);

  useEffect(() => {
    try {
      localStorage.setItem('sice_partes_recien_modificados_v1', JSON.stringify(partesRecienModificados));
    } catch (e) {}
  }, [partesRecienModificados]);

  const contratoActivoObj = useMemo(() => {
    if (!contratoSeleccionadoId) return null;
    return contratosList.find(c => {
      const cId = String(buscarValorEnObjeto(c, ['id', 'ID', 'codigo', 'Codigo', 'contrato_id'])).trim();
      return cId === String(contratoSeleccionadoId).trim();
    });
  }, [contratosList, contratoSeleccionadoId, buscarValorEnObjeto]);

  const nroContratoClienteDinamico = useMemo(() => {
    if (!contratoActivoObj) return '---';
    return buscarValorEnObjeto(contratoActivoObj, ['nro_contrato_cliente', 'nroContratoCliente', 'nro_contrato', 'contratoCliente']) || '---';
  }, [contratoActivoObj, buscarValorEnObjeto]);

  const siceParteNro = useMemo(() => {
    if (!allReportesSice || allReportesSice.length === 0) return '00001';
    const numeros = allReportesSice.map(item => {
      const nroStr = String(buscarValorEnObjeto(item, ['nro', 'Nro', 'numero', 'Numero']) || '0');
      return parseInt(nroStr.replace(/\D/g, ''), 10) || 0;
    });
    const maxNro = Math.max(...numeros, 0);
    return String(maxNro + 1).padStart(5, '0');
  }, [allReportesSice, buscarValorEnObjeto]);

  const [operariosSeleccionados, setOperariosSeleccionados] = useState([]);

  const [siceItems, setSiceItems] = useState([
    { id: 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', operariosIds: [], terminoTarea: 'SI' }
  ]);

  const [siceRespProveedor, setSiceRespProveedor] = useState({ cargo: '', nombre: '', clave: '' });
  const [siceRespCliente, setSiceRespCliente] = useState({ cargo: '', nombre: '', clave: '' });
  const [isSavingSice, setIsSavingSice] = useState(false);
  const [parteVisualizando, setParteVisualizando] = useState(null);

  const empleadosActivosFiltrados = useMemo(() => {
    const fuenteDatos = listaEmpleadosActivos.length > 0 ? listaEmpleadosActivos : personal;
    const arrayFuente = extraerArrayDatos(fuenteDatos);
    if (arrayFuente.length === 0) return [];

    return arrayFuente.filter(emp => {
      const estadoEmp = String(emp?.estado || emp?.Estado || buscarValorEnObjeto(emp, ['estado', 'Estado']) || '').toLowerCase().trim();
      return estadoEmp === 'activo' || estadoEmp === '' || estadoEmp === 'alta';
    });
  }, [listaEmpleadosActivos, personal, buscarValorEnObjeto]);

  const calcularTotalHorasSice = useCallback((inicio, fin) => {
    if (!inicio || !fin) return '0.00';
    const [hIni] = String(inicio).split(':').map(Number);
    const [hFin] = String(fin).split(':').map(Number);
    let diffMinutos = ((hFin || 0) * 60) - ((hIni || 0) * 60);
    if (diffMinutos < 0) diffMinutos += 24 * 60;
    const horasEfectivas = diffMinutos / 60;
    if (horasEfectivas <= 0) return '0.00';
    const horasConProporcional = horasEfectivas * (11 / 9);
    return horasConProporcional.toFixed(2);
  }, []);

  useEffect(() => {
    if (empleadosActivosFiltrados.length > 0 && operariosSeleccionados.length === 0) {
      const iniciales = empleadosActivosFiltrados.slice(0, 1).map((emp, idx) => {
        const nombreEmp = String(buscarValorEnObjeto(emp, ['nombre', 'Nombre', 'empleado', 'apellido', 'razon_social']) || 'Operario').trim();
        return {
          id: String(buscarValorEnObjeto(emp, ['id', 'ID']) || `op-${idx}`),
          nombre: nombreEmp,
          abreviacion: OBRAS_CONFIG?.determinarCategoriaEmpleado ? OBRAS_CONFIG.determinarCategoriaEmpleado(nombreEmp) : 'OE',
          horas: ''
        };
      });
      setOperariosSeleccionados(iniciales);
      setSiceItems(prev => prev.map((it, iIdx) => iIdx === 0 ? { ...it, operariosIds: [String(buscarValorEnObjeto(empleadosActivosFiltrados[0], ['id', 'ID']) || 'op-0')] } : it));
    }
  }, [empleadosActivosFiltrados, operariosSeleccionados.length, buscarValorEnObjeto]);

  const { horasPorCategoria, granTotalHorasHombre } = useMemo(() => {
    const resumen = {};
    let sumaTotalGeneral = 0;

    siceItems.forEach(item => {
      const horasItem = parseFloat(calcularTotalHorasSice(item?.horaComienzo, item?.horaFin) || 0);
      const opsAsignados = item?.operariosIds || [];

      opsAsignados.forEach(opId => {
        const opObj = operariosSeleccionados.find(o => String(o.id) === String(opId));
        if (opObj) {
          const cat = String(opObj.abreviacion || 'OE').trim().toUpperCase();
          resumen[cat] = (resumen[cat] || 0) + horasItem;
          sumaTotalGeneral += horasItem;
        }
      });
    });

    const desglose = Object.entries(resumen).map(([cat, total]) => ({
      categoria: cat,
      totalHoras: total.toFixed(2)
    }));

    return {
      horasPorCategoria: desglose,
      granTotalHorasHombre: sumaTotalGeneral.toFixed(2)
    };
  }, [siceItems, operariosSeleccionados, calcularTotalHorasSice]);

  const extraerDatosContrato = useCallback((contrato) => {
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
    let pCargo = buscarValorEnObjeto(objData, ['proveedor_cargo', 'proveedorCargo', 'cargoProveedor', 'cargo_proveedor']) || objData?.proveedor?.cargo || '';
    let pNombre = buscarValorEnObjeto(objData, ['proveedor_nombre', 'proveedorNombre', 'nombreProveedor', 'nombre_proveedor']) || objData?.proveedor?.nombre || '';
    let pKey = buscarValorEnObjeto(objData, ['proveedor_key', 'proveedorKey', 'claveProveedor']) || objData?.proveedor?.key || 'AT1020';
    let cCargo = buscarValorEnObjeto(objData, ['cliente_cargo', 'clienteCargo', 'cargoCliente', 'cargo_cliente']) || objData?.cliente?.cargo || '';
    let cNombre = buscarValorEnObjeto(objData, ['cliente_nombre', 'clienteNombre', 'nombreCliente', 'nombre_cliente']) || objData?.cliente?.nombre || '';
    let cKey = buscarValorEnObjeto(objData, ['cliente_key', 'clienteKey', 'claveCliente']) || objData?.cliente?.key || 'CM7030';
    return { pCargo, pNombre, pKey, cCargo, cNombre, cKey };
  }, [buscarValorEnObjeto]);

  const clavesContratoActual = useMemo(() => {
    if (contratoActivoObj) {
      const extracted = extraerDatosContrato(contratoActivoObj);
      return { proveedorKey: extracted.pKey, clienteKey: extracted.cKey };
    }
    return { proveedorKey: 'AT1020', clienteKey: 'CM7030' };
  }, [contratoActivoObj, extraerDatosContrato]);

  useEffect(() => {
    if (contratoActivoObj) {
      const { pCargo, pNombre, cCargo, cNombre } = extraerDatosContrato(contratoActivoObj);
      setSiceRespProveedor(prev => ({ cargo: pCargo, nombre: pNombre, clave: prev?.clave || '' }));
      setSiceRespCliente(prev => ({ cargo: cCargo, nombre: cNombre, clave: prev?.clave || '' }));
    }
  }, [contratoActivoObj, extraerDatosContrato]);

  const sicePartesAprobados = useMemo(() => {
    let lista = allReportesSice;

    if (contratoSeleccionadoId) {
      const selectedIdStr = String(contratoSeleccionadoId).trim();

      const idContratoActivo = String(
        buscarValorEnObjeto(contratoActivoObj, ['id', 'ID', 'contrato_id']) || ''
      ).trim();
      const codigoContratoActivo = String(
        buscarValorEnObjeto(contratoActivoObj, ['codigo', 'Codigo', 'nro_contrato', 'contrato_codigo']) || ''
      ).trim();
      const nroClienteActivo = String(
        buscarValorEnObjeto(contratoActivoObj, ['nro_contrato_cliente', 'nroContratoCliente', 'contrato_cliente']) || ''
      ).trim();

      const idsValidos = [selectedIdStr, idContratoActivo, codigoContratoActivo, nroClienteActivo]
        .filter(Boolean)
        .map(v => String(v).trim());

      lista = allReportesSice.filter(r => {
        if (!r) return false;

        const rContratoId = String(
          buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id', 'ContratoId']) || ''
        ).trim();

        if (!rContratoId) return true;

        if (idsValidos.includes(rContratoId)) return true;

        for (const idVal of idsValidos) {
          if (rContratoId.includes(idVal) || idVal.includes(rContratoId)) {
            return true;
          }
        }

        return false;
      });
    }

    return lista.map(r => {
      let itemsParsed = buscarValorEnObjeto(r, ['items', 'Item', 'Items']);
      if (typeof itemsParsed === 'string' && itemsParsed.trim()) {
        try { itemsParsed = JSON.parse(itemsParsed); } catch { itemsParsed = []; }
      }
      let operariosParsed = buscarValorEnObjeto(r, ['operarios', 'operariosPresentes', 'Operarios']);
      if (typeof operariosParsed === 'string' && operariosParsed.trim()) {
        try { operariosParsed = JSON.parse(operariosParsed); } catch { operariosParsed = []; }
      }
      let desgloseParsed = buscarValorEnObjeto(r, ['desgloseCategorias', 'desglose_categorias', 'desglosecategorias', 'desglosecategoria']);
      if (typeof desgloseParsed === 'string' && desgloseParsed.trim()) {
        try { desgloseParsed = JSON.parse(desgloseParsed); } catch { desgloseParsed = []; }
      }
      let provParsed = buscarValorEnObjeto(r, ['proveedor', 'Proveedor']);
      if (typeof provParsed === 'string' && provParsed.trim()) {
        try { provParsed = JSON.parse(provParsed); } catch { provParsed = { nombre: String(provParsed), cargo: '' }; }
      }
      let cliParsed = buscarValorEnObjeto(r, ['cliente', 'Cliente']);
      if (typeof cliParsed === 'string' && cliParsed.trim()) {
        try { cliParsed = JSON.parse(cliParsed); } catch { cliParsed = { nombre: String(cliParsed), cargo: '' }; }
      }

      const rawSuma = parseFloat(buscarValorEnObjeto(r, ['totalhorassuma', 'totalHorasSuma', 'TotalHorasSuma']) || 0);
      const nroCrud = String(buscarValorEnObjeto(r, ['nro', 'Nro', 'numero', 'Numero']) || '1');
      const nroLimpio = nroCrud ? parseInt(nroCrud.replace(/\D/g, ''), 10).toString().padStart(5, '0') : '00001';

      const rawGeneradoPor = String(buscarValorEnObjeto(r, ['generadopor', 'generadoPor', 'usuario', 'Usuario']) || '').trim();
      let generadoPorFinal = rawGeneradoPor;
      const rolUserLower = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();

      if (!generadoPorFinal || generadoPorFinal.toLowerCase() === 'sistema') {
        generadoPorFinal = (rolUserLower === 'administrador' || rolUserLower === 'admin') ? 'Administrador' : 'Operario';
      }

      const nroCli = buscarValorEnObjeto(r, ['nrocontratocliente', 'nroContratoCliente', 'contrato_cliente']) || '---';

      return {
        id: buscarValorEnObjeto(r, ['id', 'ID', 'nro', 'Nro']) || `sice-${Math.random()}`,
        nro: nroLimpio,
        fecha: buscarValorEnObjeto(r, ['fecha', 'Fecha']) || '',
        contratoid: buscarValorEnObjeto(r, ['contratoid', 'contratoId', 'contrato_id']) || '',
        nroContratoCliente: nroCli,
        items: Array.isArray(itemsParsed) ? itemsParsed : [],
        operarios: Array.isArray(operariosParsed) ? operariosParsed : [],
        desgloseCategorias: Array.isArray(desgloseParsed) ? desgloseParsed : [],
        proveedor: provParsed || { nombre: '', cargo: '' },
        cliente: cliParsed || { nombre: '', cargo: '' },
        totalHorasSuma: rawSuma.toFixed(2),
        generadoPor: generadoPorFinal,
        pdfUrl: buscarValorEnObjeto(r, ['pdf_url', 'pdfUrl', 'urlPdf', 'pdfURL']) || ''
      };
    });
  }, [contratoSeleccionadoId, contratoActivoObj, allReportesSice, buscarValorEnObjeto, currentUser]);

  const agregarOperarioFila = () => {
    const nuevoOpId = `op-${Math.random()}`;
    setOperariosSeleccionados([
      ...operariosSeleccionados,
      { id: nuevoOpId, nombre: '', abreviacion: 'OE', horas: '' }
    ]);
  };

  const actualizarOperarioFila = (index, campo, valor) => {
    const actualizados = [...operariosSeleccionados];
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      if (campo === 'nombre') {
        actualizados[index]['abreviacion'] = OBRAS_CONFIG?.determinarCategoriaEmpleado
          ? OBRAS_CONFIG.determinarCategoriaEmpleado(valor)
          : 'OE';
      }
      setOperariosSeleccionados(actualizados);
    }
  };

  const eliminarOperarioFila = (index) => {
    const opEliminar = operariosSeleccionados[index];
    setOperariosSeleccionados(operariosSeleccionados.filter((_, i) => i !== index));
    if (opEliminar) {
      setSiceItems(prev => prev.map(it => ({
        ...it,
        operariosIds: (it.operariosIds || []).filter(id => String(id) !== String(opEliminar.id))
      })));
    }
  };

  // 🔑 MIGRACIÓN A FIRESTORE: eliminar directo de la colección `reportes_diarios`
  const eliminarParteServidor = async (idParte, nroParte) => {
    const rolActual = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
    const esRolOperadorRestringido = esOperador || rolActual === 'operador' || rolActual === 'operador_ii' || rolActual === 'operador2';
    if (esRolOperadorRestringido) {
      toast.error('Acción no autorizada para usuarios con rol operativo.');
      return;
    }

    if (!window.confirm("¿Está seguro de eliminar este parte diario del sistema?")) return;

    // 🔑 Buscar el doc real en Firestore por nro (por si el id que llega es el viejo de Sheets)
    const nroBuscado = String(nroParte || '').replace(/\D/g, '');
    const docEncontrado = (reportesSheet || []).find(item =>
      String(item.nro || '').replace(/\D/g, '') === nroBuscado
    );
    const idFinal = docEncontrado?.id || idParte;

    if (!idFinal) {
      toast.error('No se pudo identificar el documento a eliminar.');
      return;
    }

    const toastId = toast.loading('Eliminando parte diario...');

    try {
      // 🔑 Eliminar de Firestore
      await eliminarDoc('reportes_diarios', idFinal);

      // Registrar en localStorage para evitar que reaparezca por cachés locales
      const idLimpio = String(idFinal).trim();
      const nroOriginal = String(nroParte || '').trim();
      const nroNum = nroOriginal ? parseInt(nroOriginal.replace(/\D/g, ''), 10).toString() : '';
      const nroPadded = nroNum ? nroNum.padStart(5, '0') : '';

      const nuevosEliminados = Array.from(new Set([
        ...idsEliminadosLocales,
        idLimpio,
        nroOriginal,
        nroNum,
        nroPadded
      ].filter(Boolean)));

      const nuevosEliminadosLimitados = guardarEnLocalStorageConLimite('sice_partes_eliminados_global_v5', nuevosEliminados);
      setIdsEliminadosLocales(nuevosEliminadosLimitados);
      onEliminadosChange(nuevosEliminadosLimitados);

      setPartesRecienModificados(prev => prev.filter(item => {
        const iId = String(item?.id || item?.ID || '').trim();
        const iNro = String(item?.nro || item?.Nro || '').trim();
        const iNroNum = iNro ? parseInt(iNro.replace(/\D/g, ''), 10).toString() : '';
        return iId !== idLimpio && iNro !== nroOriginal && iNroNum !== nroNum;
      }));

      if (typeof refetchReportes === 'function') refetchReportes();

      toast.success('Parte diario eliminado correctamente', { id: toastId });
    } catch (err) {
      console.error('[ReportesDiarios] Error eliminando parte:', err);
      toast.error('Ocurrió un error al intentar eliminar el parte', { id: toastId });
    }
  };

  const agregarFilaSice = () => {
    if (siceItems.length >= 10) {
      toast.error('El parte diario SICE permite un máximo de 10 ítems por documento.');
      return;
    }
    setSiceItems([
      ...siceItems,
      { id: siceItems.length + 1, descripcion: '', horaComienzo: '08:00', horaFin: '17:00', observaciones: '', operariosIds: [], terminoTarea: 'SI' }
    ]);
  };

  const actualizarItemSice = (index, campo, valor) => {
    const actualizados = [...siceItems];
    if (actualizados[index]) {
      actualizados[index][campo] = valor;
      setSiceItems(actualizados);
    }
  };

  const toggleOperarioEnItem = (itemIndex, opId) => {
    const actualizados = [...siceItems];
    if (actualizados[itemIndex]) {
      const currentOps = actualizados[itemIndex].operariosIds || [];
      if (currentOps.includes(opId)) {
        actualizados[itemIndex].operariosIds = currentOps.filter(id => String(id) !== String(opId));
      } else {
        actualizados[itemIndex].operariosIds = [...currentOps, opId];
      }
      setSiceItems(actualizados);
    }
  };

  // 🔑 MIGRACIÓN A FIRESTORE: el .gs genera el PDF, el frontend guarda en Firestore
  const aprobarYArchivarParteSice = async (e) => {
    e.preventDefault();
    if (!contratoSeleccionadoId) {
      toast.error('Por favor seleccione un Contrato de Mantenimiento asociado.');
      return;
    }

    const regexClave = /^[A-Za-z]{2}\d{4}$/;
    if (!regexClave.test(siceRespProveedor.clave)) {
      toast.error('La clave del Responsable Proveedor debe tener 2 letras y 4 números (Ej: AB1234).');
      return;
    }
    if (!regexClave.test(siceRespCliente.clave)) {
      toast.error('La clave del Responsable Cliente debe tener 2 letras y 4 números (Ej: CD5678).');
      return;
    }

    if (siceRespProveedor.clave.toUpperCase() !== clavesContratoActual.proveedorKey.toUpperCase()) {
      toast.error('La clave del Responsable Proveedor no coincide con el contrato.');
      return;
    }
    if (siceRespCliente.clave.toUpperCase() !== clavesContratoActual.clienteKey.toUpperCase()) {
      toast.error('La clave del Responsable Cliente no coincide con el contrato.');
      return;
    }

    setIsSavingSice(true);
    const toastId = toast.loading('Generando PDF en Google Drive...');
    const rolActualUsuario = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
    const nombreUsuarioGenerador = (rolActualUsuario === 'administrador' || rolActualUsuario === 'admin') ? 'Administrador' : 'Operario';

    try {
      // PASO 1: pedirle al .gs que genere el PDF en Drive
      const payloadPdf = {
        action: 'guardarYGenerarPDF',
        tabla: OBRAS_CONFIG?.TABLAS?.REPORTES_SICE || 'ReportesDiariosSice',
        contratoId: String(contratoSeleccionadoId),
        nroContratoCliente: String(nroContratoClienteDinamico),
        fecha: String(siceFecha),
        nro: String(siceParteNro),
        items: siceItems,
        operarios: operariosSeleccionados,
        desgloseCategorias: horasPorCategoria,
        proveedor: { cargo: String(siceRespProveedor.cargo || ''), nombre: String(siceRespProveedor.nombre || '') },
        cliente: { cargo: String(siceRespCliente.cargo || ''), nombre: String(siceRespCliente.nombre || '') },
        totalHorasSuma: Number(granTotalHorasHombre),
        generadoPor: nombreUsuarioGenerador
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadPdf)
      });

      let resultado = null;
      try {
        const textoCrudo = await res.text();
        try {
          resultado = JSON.parse(textoCrudo);
        } catch (jsonErr) {
          console.warn('[ReportesDiarios] Respuesta no-JSON del backend (posible 404 en redirect). Status:', res.status);
          console.warn('[ReportesDiarios] Primeros 200 chars:', textoCrudo.slice(0, 200));
        }
      } catch (readErr) {
        console.warn('[ReportesDiarios] No se pudo leer el body del response:', readErr);
      }

      if (!resultado) {
        toast.error('El servidor no devolvió una respuesta válida al generar el PDF.', { id: toastId });
        setIsSavingSice(false);
        return;
      }

      const pdfUrlFinal = resultado?.pdfUrl || resultado?.pdf_url || resultado?.url || resultado?.link || '';
      if (resultado?.success === false || (resultado?.error && !pdfUrlFinal)) {
        toast.error('Error al generar el PDF: ' + (resultado?.error || 'Desconocido'), { id: toastId });
        setIsSavingSice(false);
        return;
      }

      const nroFinalAsignado = resultado?.nro ? String(resultado.nro) : String(siceParteNro);
      if (resultado?.nro && String(resultado.nro) !== String(siceParteNro)) {
        toast('El número de parte asignado fue el ' + resultado.nro + ' (otro usuario generó un parte mientras completabas este formulario).', { icon: 'ℹ️' });
      }

      // PASO 2: guardar el parte en Firestore
      const payloadFirestore = {
        nro: nroFinalAsignado,
        fecha: String(siceFecha),
        contratoid: String(contratoSeleccionadoId),
        nroContratoCliente: String(nroContratoClienteDinamico),
        items: siceItems,
        operarios: operariosSeleccionados,
        desgloseCategorias: horasPorCategoria,
        proveedor: {
          cargo: String(siceRespProveedor.cargo || ''),
          nombre: String(siceRespProveedor.nombre || '')
        },
        cliente: {
          cargo: String(siceRespCliente.cargo || ''),
          nombre: String(siceRespCliente.nombre || '')
        },
        totalHorasSuma: Number(granTotalHorasHombre).toFixed(2),
        generadoPor: nombreUsuarioGenerador,
        pdfUrl: pdfUrlFinal
      };

      const nuevoIdFirestore = await crearDoc('reportes_diarios', payloadFirestore);

      const nuevoParte = {
        id: nuevoIdFirestore,
        ...payloadFirestore
      };

      setPartesRecienModificados(prev => [nuevoParte, ...prev]);
      setFetchedReportesSice(prev => [nuevoParte, ...prev]);

      if (typeof refetchReportes === 'function') {
        try {
          await refetchReportes({ throwOnError: false });
          console.info('[ReportesDiarios] Refetch completado tras guardar');
        } catch (e) {
          console.warn('[ReportesDiarios] refetch falló:', e);
        }
      }

      setSiceItems([{
        id: 1,
        descripcion: '',
        horaComienzo: '08:00',
        horaFin: '17:00',
        observaciones: '',
        operariosIds: [],
        terminoTarea: 'SI'
      }]);
      setSiceRespProveedor(prev => ({ ...prev, clave: '' }));
      setSiceRespCliente(prev => ({ ...prev, clave: '' }));
      setOperariosSeleccionados([]);
      setSiceFecha(new Date().toISOString().slice(0, 10));

      toast.success('¡Parte Diario aprobado, PDF en Drive y guardado con éxito!', { id: toastId });
    } catch (err) {
      console.error('[ReportesDiarios] Error:', err);
      toast.error('Ocurrió un error al generar el PDF o guardar el parte.', { id: toastId });
    } finally {
      setIsSavingSice(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 print:hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> Parte Diario de Actividades (SICE S.A.)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Asocie un contrato, complete los operarios activos, tilde su intervención por ítem y corrobore claves.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={contratoSeleccionadoId}
              onChange={(e) => setContratoSeleccionadoId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">-- Seleccionar Contrato de Mantenimiento --</option>
              {contratosList.map((c, i) => {
                const cId = String(c?.id || c?.ID || c?.codigo || c?.Codigo || c?.contrato_id || c?._id || i);
                const cCod = c?.codigo || c?.Codigo || c?.nro_contrato || 'S/C';
                const cNom = c?.nombre || c?.nombre_contrato || c?.Nombre_contrato || c?.nombreContrato || c?.cliente || c?.Cliente || 'Contrato';
                return (
                  <option key={cId} value={cId}>[{cCod}] {cNom}</option>
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
              <div><span className="text-slate-500 font-semibold">Cliente:</span> <span className="font-bold">{contratoActivoObj?.cliente || 'LDC Argentina S.A.'}</span></div>
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
              <div>
                <span className="text-slate-500 font-semibold">Nº Contrato Cliente:</span>{' '}
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {nroContratoClienteDinamico}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold">Parte Nro.:</span>
                <span className="font-black text-amber-600 font-mono text-sm ml-1">{siceParteNro}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" /> Operarios Presentes ({empleadosActivosFiltrados.length} activos disponibles)
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
                <p className="text-xs text-slate-400 text-center py-2">No hay operarios añadidos.</p>
              ) : (
                operariosSeleccionados.map((op, idx) => (
                  <div key={op?.id || `op-row-${idx}`} className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs">
                    <div className="w-full sm:flex-1">
                      <select
                        value={op?.nombre || ''}
                        onChange={(e) => actualizarOperarioFila(idx, 'nombre', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="">-- Seleccionar Operario (Personal Activo) --</option>
                        {empleadosActivosFiltrados.map((emp, eIdx) => {
                          const empNom = String(
                            emp?.nombre || emp?.Nombre || emp?.empleado || emp?.apellido || emp?.razon_social || `Operario ${eIdx + 1}`
                          ).trim();

                          const isSelectedElsewhere = operariosSeleccionados.some(
                            (oItem, oIdx) => oIdx !== idx && String(oItem?.nombre || '').trim() === empNom
                          );

                          return (
                            <option key={emp?.id || emp?.ID || `emp-${eIdx}`} value={empNom} disabled={isSelectedElsewhere}>
                              {empNom} {isSelectedElsewhere ? '(Seleccionado)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="w-28 text-center flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Cat/Abrev:</span>
                      <input
                        type="text"
                        value={op?.abreviacion}
                        onChange={(e) => actualizarOperarioFila(idx, 'abreviacion', e.target.value.toUpperCase())}
                        title="Abreviación de categoría"
                        className="w-full bg-amber-100/70 border border-slate-300 rounded px-2 py-1.5 text-xs font-black text-amber-950 text-center uppercase focus:bg-white focus:outline-none focus:border-amber-500"
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
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-24">Comienzo</th>
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-24">Fin</th>
                  <th className="py-2.5 px-2 border-r border-slate-700 text-center w-20">Total</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-center bg-slate-900 min-w-[150px]">
                    Operarios Intervinientes
                  </th>
                  <th className="py-2.5 px-2 text-center w-24">Terminó Tarea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {siceItems.map((row, index) => {
                  const totalHs = calcularTotalHorasSice(row?.horaComienzo, row?.horaFin);
                  return (
                    <tr key={`sice-item-${index}`} className="bg-amber-50/60 hover:bg-amber-50 transition-colors">
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
                      <td className="py-1.5 px-3 border-r border-slate-300 bg-white/60">
                        <div className="flex flex-col gap-1">
                          {operariosSeleccionados.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic">Sin operarios cargados</span>
                          ) : (
                            operariosSeleccionados.map(op => {
                              const isChecked = (row?.operariosIds || []).includes(String(op.id));
                              return (
                                <label key={`chk-op-${row.id}-${op.id}`} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 cursor-pointer hover:text-amber-700">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOperarioEnItem(index, String(op.id))}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                                  />
                                  <span className="truncate max-w-[120px]" title={op.nombre}>{op.nombre || 'Sin nombre'}</span>
                                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded ml-auto">[{op.abreviacion}]</span>
                                </label>
                              );
                            })
                          )}
                        </div>
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

          <div className="bg-amber-100/60 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2 shadow-sm">
            <div className="space-y-2">
              <p className="text-amber-900 font-bold text-xs flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Horas Totales por Especialidad (Categoría):
              </p>
              <div className="flex flex-wrap gap-2">
                {horasPorCategoria.length === 0 ? (
                  <span className="text-xs text-amber-800 italic">Asigne operarios en las tareas para calcular.</span>
                ) : (
                  horasPorCategoria.map((catItem, cIdx) => (
                    <div key={`cat-tot-${cIdx}`} className="bg-white border border-amber-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-900 shadow-xs flex items-center gap-2">
                      <span>Cat. <strong className="text-amber-900 font-black">{catItem.categoria}</strong>:</span>
                      <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">{catItem.totalHoras} hs</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="text-right bg-amber-500 text-slate-950 px-6 py-2 rounded-lg shadow-sm whitespace-nowrap">
              <p className="font-extrabold text-[10px] uppercase tracking-wide opacity-80">Gran Total Horas Hombre</p>
              <p className="font-black text-2xl">{granTotalHorasHombre} <span className="text-sm">hs</span></p>
            </div>
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
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres):</label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="Ej: FF9912"
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
                      className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-0.5">FIRMA (Clave de 6 caracteres):</label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      placeholder="Ej: TR2291"
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
              const uniqueKey = `parte-nro-${parte?.nro || 'x'}-id-${parte?.id || parte?.ID || 'x'}`;

              const parteId = parte?.id || parte?.nro || `parte-${idx}`;
              const pObj = parte?.proveedor;
              const pNombre = (pObj && typeof pObj === 'object') ? (pObj.nombre || '---') : (pObj || '---');
              const pCargo = (pObj && typeof pObj === 'object') ? (pObj.cargo || '---') : '';

              const cObj = parte?.cliente;
              const cNombre = (cObj && typeof cObj === 'object') ? (cObj.nombre || '---') : (cObj || '---');
              const cCargo = (cObj && typeof cObj === 'object') ? (cObj.cargo || '---') : '';

              const rolActual = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
              const esRolOperadorRestringido = esOperador || rolActual === 'operador' || rolActual === 'operador_ii' || rolActual === 'operador2';

              return (
                <div key={uniqueKey} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 bg-amber-500/10 text-amber-700 rounded-full">Parte Nro: {parte?.nro}</span>
                      <span className="text-xs font-medium text-slate-500">Fecha: {parte?.fecha}</span>
                      {parte?.nroContratoCliente && (
                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">Nº Contrato Cliente: {parte.nroContratoCliente}</span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Total Horas: {parte?.totalHorasSuma} hs</span>
                      <span className="text-[11px] font-medium text-slate-500">Generado por: <strong className="text-slate-700">{parte?.generadoPor}</strong></span>
                    </div>
                    {Array.isArray(parte?.desgloseCategorias) && parte.desgloseCategorias.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {parte.desgloseCategorias.map((dItem, dIdx) => (
                          <span key={`hist-cat-${dIdx}`} className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                            Cat. {dItem.categoria}: {dItem.totalHoras} hs
                          </span>
                        ))}
                      </div>
                    )}
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

                    {!esRolOperadorRestringido && (
                      <button
                        onClick={() => eliminarParteServidor(parteId, parte?.nro)}
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
                <div><span className="text-slate-500 font-semibold">Nº Contrato Cliente:</span> <span className="font-bold text-blue-700">{parteVisualizando?.nroContratoCliente || '---'}</span></div>
                <div><span className="text-slate-500 font-semibold">Generado por:</span> <span className="font-bold text-slate-700">{parteVisualizando?.generadoPor}</span></div>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3 border-r border-slate-700 w-12 text-center">Item</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Descripción del Servicio</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-24">Comienzo</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-24">Fin</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center w-20">Total</th>
                    <th className="py-2.5 px-3 border-r border-slate-700">Observaciones</th>
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center">Operarios Tildados</th>
                    <th className="py-2.5 px-3 text-center w-20">Terminó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Array.isArray(parteVisualizando?.items) && parteVisualizando.items.map((it, iIdx) => {
                    const opsIds = it?.operariosIds || [];
                    const opsNombres = opsIds.map(id => {
                      const found = (parteVisualizando?.operarios || []).find(o => String(o.id) === String(id));
                      return found ? `${found.nombre} [${found.abreviacion}]` : null;
                    }).filter(Boolean).join(', ');

                    return (
                      <tr key={`modal-item-${iIdx}`} className="bg-white">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">{it?.id || iIdx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{it?.descripcion || '---'}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaComienzo || '08:00'}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{it?.horaFin || '17:00'}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-amber-900 bg-amber-50">{calcularTotalHorasSice(it?.horaComienzo, it?.horaFin)} hs</td>
                        <td className="py-2.5 px-3 text-slate-600">{it?.observaciones || '---'}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium text-[11px]">{opsNombres || '---'}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it?.terminoTarea || 'SI'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-100/60 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div className="space-y-1">
                <p className="text-amber-900 font-bold text-xs">Desglose de Horas por Especialidad:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(parteVisualizando?.desgloseCategorias) && parteVisualizando.desgloseCategorias.map((dItem, dIdx) => (
                    <span key={`mod-d-${dIdx}`} className="bg-white px-2 py-1 rounded text-xs font-bold border border-amber-300">
                      Cat. {dItem.categoria}: <strong>{dItem.totalHoras} hs</strong>
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right bg-amber-500 text-slate-950 px-6 py-2 rounded-lg shadow-sm">
                <p className="font-extrabold text-[10px] uppercase tracking-wide opacity-80">Gran Total</p>
                <p className="font-black text-2xl">{parteVisualizando?.totalHorasSuma || '0.00'} <span className="text-sm">hs</span></p>
              </div>
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