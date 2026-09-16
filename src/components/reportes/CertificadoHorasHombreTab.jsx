// src/components/reportes/CertificadoHorasHombreTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Clock, Trash2, ShieldCheck, Loader2, FileText, ExternalLink } from 'lucide-react';
import { GOOGLE_SCRIPT_URL } from '@/api';
// 🔑 FIX: lectura de Firestore (en vez de useObraData)
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
// 🔑 FIX: escritura directa a Firestore
import { crearDoc, eliminarDoc } from '@/lib/firestoreHelpers';

export default function CertificadoHorasHombreTab({ 
  contratosList: propContratos = [], 
  allReportesSice: propReportes = [],
  currentUser
}) {
  // 🔑 FIX: lectura directa de Firestore
  const { data: contratosFs } = useFirestoreCollection('contratos');
  const { data: reportesFs } = useFirestoreCollection('reportes_diarios');
  const { data: certificacionesRealizadas } = useFirestoreCollection('certificaciones_horas');

  const rolStr = String(currentUser?.role || currentUser?.rol || '').trim().toLowerCase();
  const esAdminOGerencia = rolStr === 'administrador' || rolStr === 'admin' || rolStr === 'gerencia' || rolStr === 'gerente';

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

  // 🔑 FIX: sin window.globalData
  const contratosList = useMemo(() => {
    const c1 = extraerArrayDatos(propContratos);
    const c2 = extraerArrayDatos(contratosFs);
    const combinados = [...c1, ...c2];
    const unicosMap = new Map();
    combinados.forEach((item, index) => {
      if (!item) return;
      const key = String(item?.id || item?.ID || item?.codigo || index);
      if (!unicosMap.has(key)) unicosMap.set(key, item);
    });
    return Array.from(unicosMap.values());
  }, [propContratos, contratosFs]);

  // 🔑 FIX: sin localStorage de eliminados ni window.globalData
  const allReportesSice = useMemo(() => {
    const p1 = extraerArrayDatos(propReportes);
    const p2 = extraerArrayDatos(reportesFs);
    const combinados = [...p1, ...p2];
    const unicosMap = new Map();
    combinados.forEach((item, index) => {
      if (!item) return;
      const key = String(item?.id || item?.ID || item?.nro || index);
      if (!unicosMap.has(key)) unicosMap.set(key, item);
    });
    return Array.from(unicosMap.values());
  }, [propReportes, reportesFs]);

  const historialCertificados = useMemo(() => {
    const raw = extraerArrayDatos(certificacionesRealizadas);
    return raw.filter(c => c && typeof c === 'object' && Object.keys(c).length > 2);
  }, [certificacionesRealizadas]);

  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState('');
  const [certificadoNro, setCertificadoNro] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');

  const [partesSeleccionados, setPartesSeleccionados] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [respProveedor, setRespProveedor] = useState({ cargo: 'JEFE DE OBRA', nombre: 'Alexander Torres Lopez', firma: '' });
  const [respCliente, setRespCliente] = useState({ cargo: '', nombre: '', firma: '' });

  const contratosDisponibles = useMemo(() => Array.isArray(contratosList) ? contratosList : [], [contratosList]);

  const contratoActual = useMemo(() => {
    if (!contratoIdSeleccionado) return null;
    return contratosDisponibles.find(c => {
      const cId = String(c?.id || c?.ID || c?.codigo || c?.Codigo || '').trim();
      return cId === String(contratoIdSeleccionado).trim();
    });
  }, [contratosDisponibles, contratoIdSeleccionado]);

  const nroContratoClienteReal = useMemo(() => {
    if (!contratoActual) return '---';
    return contratoActual.nro_contrato_cliente || 
           contratoActual.contrato_nro_cliente || 
           contratoActual.nrocontratocliente || 
           contratoActual.contratocliente || 
           '---';
  }, [contratoActual]);

  const codigoSICEReal = useMemo(() => {
    if (!contratoActual) return '---';
    return contratoActual.codigo || contratoActual.Codigo || contratoActual.contrato_codigo || '---';
  }, [contratoActual]);

  const clavesContratoActual = useMemo(() => {
    if (!contratoActual) return { proveedorKey: 'AT1020', clienteKey: 'CM7030' };
    const pKey = contratoActual.proveedor_key || contratoActual.proveedorKey || contratoActual.claveProveedor || contratoActual?.proveedor?.key || 'AT1020';
    const cKey = contratoActual.cliente_key || contratoActual.clienteKey || contratoActual.claveCliente || contratoActual?.cliente?.key || 'CM7030';
    return { proveedorKey: String(pKey), clienteKey: String(cKey) };
  }, [contratoActual]);

  // 🔑 FIX: numeración correlativa desde Firestore (solo para preview; el .gs reasigna)
  useEffect(() => {
    if (contratoActual) {
      const idContratoStr = String(contratoActual.id || '').trim();
      const codContratoStr = String(codigoSICEReal).trim();

      const certificadosDelContrato = historialCertificados.filter(c => {
        const cIdRef = String(c.contrato_id || c.contratoid || '').trim();
        const cCodRef = String(c.contrato_codigo || c.contratocodigo || '').trim();
        return (idContratoStr && cIdRef === idContratoStr) || (codContratoStr !== '---' && cCodRef === codContratoStr);
      });
      
      const nuevoNumero = certificadosDelContrato.length + 1;
      const numeroFormateado = nuevoNumero.toString().padStart(4, '0');
      setCertificadoNro(numeroFormateado);

      setRespCliente({
        nombre: contratoActual.cliente_nombre || contratoActual.cliente || 'Responsable Cliente',
        cargo: contratoActual.cliente_cargo || 'Gerente de Planta',
        firma: ''
      });

      setRespProveedor({
        nombre: contratoActual.proveedor_nombre || 'Alexander Torres Lopez',
        cargo: contratoActual.proveedor_cargo || 'Oficial a cargo del Site',
        firma: ''
      });
    } else {
      setCertificadoNro('');
    }
  }, [contratoActual, historialCertificados, codigoSICEReal]);

  // 🔑 FIX: doble chequeo (partes_usados + detalle_filas) para evitar reusar partes
  const partesUsadosEnHistorial = useMemo(() => {
    const usados = new Set();
    historialCertificados.forEach(cert => {
      // (A) array plano partes_usados (nuevo)
      if (Array.isArray(cert.partes_usados)) {
        cert.partes_usados.forEach(n => n && usados.add(String(n)));
      }
      // (B) fallback: parsear detalle_filas (viejo)
      const rawFilas = cert.detalle_filas ?? cert.detalleFilas ?? cert.filas ?? cert.detallefilas;
      let filas = [];
      if (typeof rawFilas === 'string') {
        try { filas = JSON.parse(rawFilas); } catch (e) {}
      } else if (Array.isArray(rawFilas)) {
        filas = rawFilas;
      }
      filas.forEach(f => {
        if (f.nroParte) usados.add(String(f.nroParte));
      });
    });
    return usados;
  }, [historialCertificados]);

  const partesDisponiblesParaAgregar = useMemo(() => {
    const seleccionadosActuales = partesSeleccionados.map(p => String(p.nroParte));
    if (!contratoIdSeleccionado) return [];

    const contratoIdStr = String(contratoIdSeleccionado).trim();
    const codigoSICEStr = String(codigoSICEReal || '').trim();
    const idContratoRealStr = String(contratoActual?.id || contratoActual?.ID || '').trim();

    return allReportesSice.filter(p => {
      const idNro = String(p?.nro || p?.id || '').trim();
      if (!idNro || idNro === 'undefined' || idNro === 'null') return false; 
      if (partesUsadosEnHistorial.has(idNro)) return false; 
      if (seleccionadosActuales.includes(idNro)) return false;

      const pContratoId = String(
        p?.contratoid || p?.contratoId || p?.contrato_id || p?.ContratoId || ''
      ).trim();
      if (!pContratoId) return false;

      const matchPorId = pContratoId === contratoIdStr;
      const matchPorIdReal = idContratoRealStr && pContratoId === idContratoRealStr;
      const matchPorCodigo = codigoSICEStr && codigoSICEStr !== '---' && pContratoId === codigoSICEStr;
      const matchParcial = codigoSICEStr && codigoSICEStr !== '---' &&
        (pContratoId.includes(codigoSICEStr) || codigoSICEStr.includes(pContratoId));

      return matchPorId || matchPorIdReal || matchPorCodigo || matchParcial;
    });
  }, [allReportesSice, partesUsadosEnHistorial, partesSeleccionados, contratoIdSeleccionado, codigoSICEReal, contratoActual]);

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return '';
    const str = String(fechaISO).trim();
    if (str.includes('/')) return str; 
    
    let cleanStr = str;
    if (cleanStr.includes('T')) cleanStr = cleanStr.split('T')[0];
    
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`; 
      }
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
    return str;
  };

  const obtenerValoresPolinomica = (contrato) => {
    return {
      "S": contrato?.valor_s || 36714.21,
      "T-EHS": contrato?.valor_tehs || 20819.69,
      "OE": contrato?.valor_oe || 27195.44,
      "MO": contrato?.valor_mo || 23950.67,
      "TOT": contrato?.valor_tot || 42235.51,
      "DEFAULT": 15000
    };
  };

  const agregarParteFila = (parteObj) => {
    const tablaValores = obtenerValoresPolinomica(contratoActual);
    const fechaParte = parteObj?.fecha || fechaEmision;
    const nroParte = parteObj?.nro || parteObj?.id || '001';

    const categoriasBase = [
      { id: 'S', keys: ['horas_S', 'horasS', 'S'] },
      { id: 'T-EHS', keys: ['horas_TEHS', 'horasTEHS', 'T_EHS', 'T-EHS'] },
      { id: 'OE', keys: ['horas_OE', 'horasOE', 'OE'] },
      { id: 'MO', keys: ['horas_MO', 'horasMO', 'MO'] },
      { id: 'TOT', keys: ['horas_TOT', 'horasTOT', 'TOT'] }
    ];

    let seAgregoAlgunaCategoria = false;
    const nuevasFilas = [];

    let desgloseArray = parteObj?.desgloseCategorias || parteObj?.desglose_categorias;
    if (typeof desgloseArray === 'string') {
      try { desgloseArray = JSON.parse(desgloseArray); } catch(e) { desgloseArray = []; }
    }

    let detalleCategorias = typeof parteObj?.categorias_hh === 'string' 
      ? JSON.parse(parteObj.categorias_hh || '{}') 
      : (parteObj?.categorias_hh || {});

    categoriasBase.forEach(cat => {
      let horas = 0;

      if (Array.isArray(desgloseArray)) {
        const catEncontrada = desgloseArray.find(d => String(d.categoria).toUpperCase() === cat.id);
        if (catEncontrada) horas = Number(catEncontrada.totalHoras) || 0;
      }

      if (horas === 0) {
        horas = Number(detalleCategorias[cat.id]) || 0;
      }

      if (horas === 0) {
        for (const k of cat.keys) {
          if (Number(parteObj[k]) > 0) {
            horas = Number(parteObj[k]);
            break;
          }
        }
      }

      if (horas > 0) {
        const valorHora = tablaValores[cat.id] || tablaValores['DEFAULT'];
        nuevasFilas.push({
          id: `parte-${nroParte}-${cat.id}-${Date.now()}`,
          nroParte,
          fecha: fechaParte,
          totalHoras: horas,
          valorHora,
          valorTotal: horas * valorHora,
          clasificacion: cat.id
        });
        seAgregoAlgunaCategoria = true;
      }
    });

    if (!seAgregoAlgunaCategoria) {
      const horasTotales = Number(parteObj?.totalhorassuma || parteObj?.total_horas_suma || parteObj?.horas || 8);
      if (horasTotales > 0) {
        const catDefault = 'OE';
        const valorHora = tablaValores[catDefault] || tablaValores['DEFAULT'];
        nuevasFilas.push({
          id: `parte-${nroParte}-DEFAULT-${Date.now()}`,
          nroParte,
          fecha: fechaParte,
          totalHoras: horasTotales,
          valorHora,
          valorTotal: horasTotales * valorHora,
          clasificacion: catDefault
        });
      }
    }

    setPartesSeleccionados(prev => [...prev, ...nuevasFilas]);
  };

  const eliminarFila = (id) => {
    setPartesSeleccionados(prev => prev.filter(item => item.id !== id));
  };

  const actualizarFila = (id, campo, valor) => {
    setPartesSeleccionados(prev => prev.map(item => {
      if (item.id === id) {
        const actualizado = { ...item, [campo]: valor };
        if (campo === 'totalHoras' || campo === 'valorHora') {
          const h = campo === 'totalHoras' ? Number(valor) || 0 : item.totalHoras;
          const v = campo === 'valorHora' ? Number(valor) || 0 : item.valorHora;
          actualizado.valorTotal = h * v;
        }
        return actualizado;
      }
      return item;
    }));
  };

  const totalGeneralMonto = useMemo(() => {
    return partesSeleccionados.reduce((acc, curr) => acc + (Number(curr.valorTotal) || 0), 0);
  }, [partesSeleccionados]);

  // 🔑 FIX: guardar certificado → (a) .gs solo PDF + correlativo, (b) Firestore doc
  const guardarCertificadoHoras = async (e) => {
    e.preventDefault();
    if (!contratoActual) return alert("Seleccione un contrato válido.");
    if (partesSeleccionados.length === 0) return alert("Agregue al menos un parte diario al certificado.");
    
    const regexClave = /^[A-Za-z]{2}\d{4}$/;
    if (!regexClave.test(respProveedor.firma)) return alert("La clave del Responsable Proveedor debe tener 2 letras y 4 números (Ej: AB1234).");
    if (!regexClave.test(respCliente.firma)) return alert("La clave del Responsable Cliente debe tener 2 letras y 4 números (Ej: CD5678).");

    if (respProveedor.firma.toUpperCase() !== clavesContratoActual.proveedorKey.toUpperCase()) {
      return alert("La clave del Responsable Proveedor no coincide con el contrato.");
    }
    if (respCliente.firma.toUpperCase() !== clavesContratoActual.clienteKey.toUpperCase()) {
      return alert("La clave del Responsable Cliente no coincide con el contrato.");
    }

    setIsSaving(true);
    try {
      // (a) fetch al .gs SOLO para generar PDF + obtener correlativo real
      const payloadGs = {
        tabla: 'CertificacionesHoras',
        action: 'guardar_certificado_horas',
        contrato_id: String(contratoIdSeleccionado),
        contrato_codigo: codigoSICEReal === '---' ? '' : codigoSICEReal,
        nro_contrato_cliente: nroContratoClienteReal === '---' ? '' : nroContratoClienteReal,
        certificado_nro: certificadoNro,
        fecha_emision: formatearFecha(fechaEmision),
        periodo_desde: formatearFecha(periodoDesde),
        periodo_hasta: formatearFecha(periodoHasta),
        cliente: contratoActual?.cliente || contratoActual?.Cliente || 'Cliente',
        filas: partesSeleccionados,
        total_general: totalGeneralMonto,
        responsable_proveedor: respProveedor,
        responsable_cliente: respCliente,
        generarPDF: true,
        carpetaDestino: 'Certificados Horas'
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadGs)
      });
      const resultado = await res.json();

      if (resultado?.success === false) {
        alert("Error del servidor: " + (resultado.error || 'Desconocido'));
        return;
      }

      const pdfUrlFinal = resultado?.pdf_url || resultado?.pdfUrl || resultado?.url || '';
      const certificadoNroFinal = resultado?.certificado_nro || certificadoNro;

      // (b) crear doc en Firestore
      const partesUsados = Array.from(new Set(partesSeleccionados.map(f => String(f.nroParte))));

      await crearDoc('certificaciones_horas', {
        contrato_id: String(contratoIdSeleccionado),
        contrato_codigo: codigoSICEReal === '---' ? '' : codigoSICEReal,
        nro_contrato_cliente: nroContratoClienteReal === '---' ? '' : nroContratoClienteReal,
        certificado_nro: certificadoNroFinal,
        fecha_emision: formatearFecha(fechaEmision),
        periodo_desde: formatearFecha(periodoDesde),
        periodo_hasta: formatearFecha(periodoHasta),
        cliente: contratoActual?.cliente || contratoActual?.Cliente || 'Cliente',
        detalle_filas: partesSeleccionados,
        partes_usados: partesUsados,
        total_general: totalGeneralMonto,
        responsable_proveedor: respProveedor,
        responsable_cliente: respCliente,
        pdf_url: pdfUrlFinal
      });

      if (String(certificadoNroFinal) !== String(certificadoNro)) {
        alert("¡Certificado guardado con éxito! Nro. asignado: " + certificadoNroFinal + " (otro usuario generó uno mientras completabas el formulario). Se generó el PDF en Drive.");
      } else {
        alert("¡Certificado guardado con éxito! Se ha generado el PDF en Google Drive.");
      }

      setPartesSeleccionados([]);
      setRespCliente(prev => ({...prev, firma: ''}));
      setRespProveedor(prev => ({...prev, firma: ''}));
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  // 🔑 FIX: eliminar certificado directo de Firestore
  const handleEliminarCertificado = async (idCertificado) => {
    if (!idCertificado) {
      alert("No se puede eliminar: falta el ID del certificado.");
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas eliminar este certificado del historial?")) return;
    try {
      await eliminarDoc('certificaciones_horas', idCertificado);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el certificado: " + (err.message || ''));
    }
  };

  return (
    <div className="space-y-8">
      {/* FORMULARIO PRINCIPAL */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-6 text-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
          <div>
            <img src="/logo-07.png" alt="SICE S.A." className="h-16 object-contain mb-2" />
            <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 tracking-wide uppercase">CERTIFICADO MENSUAL DE HORAS HOMBRE</h2>
            <div className="mt-2 flex items-center justify-end gap-2">
              <label className="text-xs font-bold text-slate-600">Certificado Nro.:</label>
              <input
                type="text"
                value={certificadoNro}
                readOnly
                className="w-24 bg-slate-100 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-amber-600 text-right outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs border-b border-slate-300 pb-4 bg-slate-50 p-4 rounded-xl">
          <div className="sm:col-span-2 space-y-1">
            <span className="text-slate-500 font-semibold block">Seleccionar Contrato ({contratosDisponibles.length} disponibles):</span>
            <select
              value={contratoIdSeleccionado}
              onChange={(e) => setContratoIdSeleccionado(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">-- Seleccionar Contrato / Mantenimiento --</option>
              {contratosDisponibles.map((c, idx) => {
                const cId = String(c?.id || c?.ID || c?.codigo || c?.Codigo || idx);
                const cNombre = c?.nombre_contrato || c?.nombre || c?.descripcion || `Contrato #${idx + 1}`;
                const cCodigo = c?.codigo || c?.Codigo || '';
                return (
                  <option key={cId} value={cId}>
                    {cCodigo ? `[${cCodigo}] ` : ''}{cNombre}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">C.U.I.T. Nro.:</span>
            <strong className="text-slate-900 block mt-1">30-71573431-8</strong>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Cliente:</span>
            <strong className="text-slate-900 block mt-1">
              {contratoActual?.cliente || contratoActual?.Cliente || '---'}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Código SICE:</span>
            <strong className="text-slate-900 block mt-1 font-mono">
              {codigoSICEReal}
            </strong>
          </div>
          <div>
            <span className="text-slate-500 font-semibold block">Nro. Contrato Cliente:</span>
            <strong className="text-slate-900 block mt-1 font-mono">
              {nroContratoClienteReal}
            </strong>
          </div>

          <div>
            <span className="text-slate-500 font-semibold block">Fecha Emisión (DD/MM/AAAA):</span>
            <div className="flex items-center gap-1 mt-1">
              <input
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono">({formatearFecha(fechaEmision)})</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl flex flex-wrap items-center gap-4">
          <span className="font-black text-xs text-slate-800 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> PERÍODO:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">DESDE</label>
            <input
              type="date"
              value={periodoDesde}
              onChange={(e) => setPeriodoDesde(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none"
            />
            <span className="text-[10px] text-slate-500 font-mono">{formatearFecha(periodoDesde)}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">HASTA</label>
            <input
              type="date"
              value={periodoHasta}
              onChange={(e) => setPeriodoHasta(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 outline-none"
            />
            <span className="text-[10px] text-slate-500 font-mono">{formatearFecha(periodoHasta)}</span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-300">
          <span className="text-xs font-bold text-slate-700">
            Partes Diarios Disponibles ({partesDisponiblesParaAgregar.length} disp.):
          </span>
          <select
            onChange={(e) => {
              const parteId = e.target.value;
              if (!parteId) return;
              const parteEncontrado = partesDisponiblesParaAgregar.find(p => String(p?.id || p?.nro) === String(parteId));
              if (parteEncontrado) {
                agregarParteFila(parteEncontrado);
              }
              e.target.value = '';
            }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer w-72"
          >
            <option value="">
              {contratoIdSeleccionado ? '+ Seleccionar parte diario aprobado...' : 'Primero seleccione un contrato...'}
            </option>
            {partesDisponiblesParaAgregar.map((p, idx) => (
              <option key={idx} value={p?.id || p?.nro}>
                Parte #{p?.nro || idx + 1} ({formatearFecha(p?.fecha)})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-400 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-700">ÍTEM</th>
                <th className="py-3 px-3 border-r border-slate-700">FECHA (DD/MM/AAAA)</th>
                <th className="py-3 px-3 border-r border-slate-700">NRO PARTE</th>
                <th className="py-3 px-3 border-r border-slate-700 text-center">CATEGORÍA HH</th>
                <th className="py-3 px-3 text-center border-r border-slate-700">TOTAL HORAS</th>
                <th className="py-3 px-3 text-right border-r border-slate-700">VALOR HORA ($)</th>
                <th className="py-3 px-3 text-right border-r border-slate-700">VALOR TOTAL ($)</th>
                <th className="py-3 px-3 text-center w-16">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {partesSeleccionados.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                    No hay partes diarios incorporados en este certificado. Seleccione uno arriba para comenzar.
                  </td>
                </tr>
              ) : (
                partesSeleccionados.map((item, index) => (
                  <tr key={item.id} className="hover:bg-amber-50/40">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r border-slate-300">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-medium font-mono">
                      {formatearFecha(item.fecha)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold">
                      Parte #{item.nroParte}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-center">
                      <select 
                        value={item.clasificacion}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          const tablaValores = obtenerValoresPolinomica(contratoActual);
                          const newVal = tablaValores[newCat] || tablaValores['DEFAULT'];
                          setPartesSeleccionados(prev => prev.map(fila => {
                            if (fila.id === item.id) {
                              return { ...fila, clasificacion: newCat, valorHora: newVal, valorTotal: newVal * fila.totalHoras };
                            }
                            return fila;
                          }));
                        }}
                        className="bg-transparent text-center font-bold outline-none cursor-pointer text-amber-700"
                      >
                        <option value="S">S (Supervisor)</option>
                        <option value="T-EHS">T-EHS (Tec. Seguridad)</option>
                        <option value="OE">OE (Oficial Esp.)</option>
                        <option value="MO">MO (Medio Oficial)</option>
                        <option value="TOT">TOT (Tec. Oficina)</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-300">
                      <input
                        type="number"
                        value={item.totalHoras}
                        onChange={(e) => actualizarFila(item.id, 'totalHoras', e.target.value)}
                        className="w-16 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-center font-bold text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300">
                      <input
                        type="number"
                        value={item.valorHora}
                        onChange={(e) => actualizarFila(item.id, 'valorHora', e.target.value)}
                        className="w-24 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-right font-bold text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300 font-black text-slate-900 font-mono">
                      $ {Number(item.valorTotal).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => eliminarFila(item.id)}
                        className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {partesSeleccionados.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-black">
                  <td colSpan="6" className="py-3 px-4 text-right uppercase text-xs">TOTAL GENERAL A CERTIFICAR:</td>
                  <td className="py-3 px-4 text-right text-amber-400 font-mono text-sm" colSpan="2">
                    $ {totalGeneralMonto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-200 border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-xs uppercase tracking-wider">
              RESPONSABLE PROVEEDOR
            </div>
            <div className="p-4 space-y-3 text-xs font-bold">
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">CARGO:</span>
                <input 
                  type="text" 
                  value={respProveedor.cargo} 
                  onChange={(e) => setRespProveedor({...respProveedor, cargo: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800" 
                />
              </div>
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
                <input 
                  type="text" 
                  value={respProveedor.nombre} 
                  onChange={(e) => setRespProveedor({...respProveedor, nombre: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-950 font-black" 
                />
              </div>
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">FIRMA (Clave de 6 caracteres):</span>
                <input 
                  type="password"
                  maxLength={6}
                  value={respProveedor.firma} 
                  onChange={(e) => setRespProveedor({...respProveedor, firma: e.target.value.toUpperCase()})} 
                  placeholder="••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono uppercase text-emerald-700 font-bold tracking-[0.3em]" 
                />
              </div>
            </div>
          </div>

          <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-200 border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-xs uppercase tracking-wider">
              RESPONSABLE CLIENTE
            </div>
            <div className="p-4 space-y-3 text-xs font-bold">
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">CARGO:</span>
                <input 
                  type="text" 
                  value={respCliente.cargo} 
                  onChange={(e) => setRespCliente({...respCliente, cargo: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800" 
                />
              </div>
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
                <input 
                  type="text" 
                  value={respCliente.nombre} 
                  onChange={(e) => setRespCliente({...respCliente, nombre: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-950 font-black" 
                />
              </div>
              <div>
                <span className="block text-slate-500 mb-1 text-[10px]">FIRMA (Clave de 6 caracteres):</span>
                <input 
                  type="password"
                  maxLength={6}
                  value={respCliente.firma} 
                  onChange={(e) => setRespCliente({...respCliente, firma: e.target.value.toUpperCase()})} 
                  placeholder="••••••"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono uppercase text-emerald-700 font-bold tracking-[0.3em]" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-300 gap-4">
          <span className="text-xs text-slate-500 font-medium">
            Ingrese sus claves para firmar y validar el certificado de horas hombre.
          </span>
          <button
            type="button"
            onClick={guardarCertificadoHoras}
            disabled={isSaving}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isSaving ? 'Guardando Certificado...' : 'Aprobar, Firmar y Guardar Certificado'}
          </button>
        </div>
      </div>

      {/* HISTORIAL */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" /> Historial de Certificados de Horas Hombre Emitidos
          </h3>
          <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
            Total: {historialCertificados.length}
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] border-b border-slate-300">
                <th className="py-2.5 px-3 text-center w-16">NRO CERT.</th>
                <th className="py-2.5 px-3">CONTRATO / CLIENTE</th>
                <th className="py-2.5 px-3 text-center">FECHA EMISIÓN</th>
                <th className="py-2.5 px-3 text-center">PERÍODO</th>
                <th className="py-2.5 px-3 text-right">TOTAL GENERAL ($)</th>
                <th className="py-2.5 px-3 text-center w-28">DOCUMENTO PDF</th>
                {esAdminOGerencia && <th className="py-2.5 px-3 text-center w-12">ELIMINAR</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {historialCertificados.length === 0 ? (
                <tr>
                  <td colSpan={esAdminOGerencia ? "7" : "6"} className="py-8 text-center text-slate-400 italic">
                    No hay certificados de horas hombre registrados en el sistema todavía.
                  </td>
                </tr>
              ) : (
                historialCertificados.map((cert, idx) => {
                  const certId = cert.id || `fallback-${idx}`;
                  const certNro = cert.certificado_nro || cert.certificadonro || 'S/N';
                  const clienteText = cert.cliente || '---';
                  
                  const codigoSice = cert.contrato_codigo || cert.contratocodigo || '---';
                  const codigoCliente = cert.nro_contrato_cliente || cert.nrocontratocliente || '---';
                  
                  const fechaEm = formatearFecha(cert.fecha_emision || cert.fechaemision);
                  const pDesde = formatearFecha(cert.periodo_desde || cert.periododesde);
                  const pHasta = formatearFecha(cert.periodo_hasta || cert.periodohasta);
                  const totalGen = Number(cert.total_general || cert.totalgeneral || 0);
                  const pdfLink = cert.pdf_url || cert.pdfurl || cert.url;

                  return (
                    <tr key={certId} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">
                        #{certNro}
                      </td>
                      <td className="py-2.5 px-3 font-medium">
                        <div className="font-bold text-slate-900">{clienteText}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex gap-2">
                          <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">SICE: <b>{codigoSice}</b></span>
                          <span className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">CLI: <b>{codigoCliente}</b></span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {fechaEm}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] text-slate-600 font-mono">
                        {pDesde && pHasta ? `${pDesde} al ${pHasta}` : '---'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                        $ {totalGen.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {pdfLink ? (
                          <a
                            href={pdfLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[10px] border border-blue-200 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Ver PDF
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No disponible</span>
                        )}
                      </td>
                      {esAdminOGerencia && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminarCertificado(cert.id)}
                            className="p-1.5 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white cursor-pointer transition-colors shadow-sm"
                            title="Eliminar Certificado"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}