// src/components/reportes/CertificadoMaterialesTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Package, Trash2, ShieldCheck, Loader2, FileText, ExternalLink, DollarSign, Calendar } from 'lucide-react';
import { useFirestoreCollection } from '@/hooks/useFirestoreCollection';
import { crearDoc, actualizarDoc, eliminarDoc } from '@/lib/firestoreHelpers';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function CertificadoMaterialesTab({
  contratosList: propContratos = [],
  currentUser
}) {
  const { data: contratosFs } = useFirestoreCollection('contratos');
  const { data: facturasFs } = useFirestoreCollection('facturas_compras');
  const { data: proveedoresFs } = useFirestoreCollection('proveedores');
  const { data: certificacionesMatRealizadas } = useFirestoreCollection('certificaciones_materiales');

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

  const facturasList = useMemo(() => extraerArrayDatos(facturasFs), [facturasFs]);
  const proveedoresList = useMemo(() => extraerArrayDatos(proveedoresFs), [proveedoresFs]);

  const historialCertificados = useMemo(() => {
    const raw = extraerArrayDatos(certificacionesMatRealizadas);
    return raw.filter(c => c && typeof c === 'object' && Object.keys(c).length > 2);
  }, [certificacionesMatRealizadas]);

  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState('');
  const [certificadoNro, setCertificadoNro] = useState('');
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [periodoDesde, setPeriodoDesde] = useState('');
  const [periodoHasta, setPeriodoHasta] = useState('');

  const [feeDelContrato, setFeeDelContrato] = useState(0);

  const [facturasSeleccionadas, setFacturasSeleccionadas] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const [respProveedor, setRespProveedor] = useState({ cargo: '', nombre: '', firma: '' });
  const [respCliente, setRespCliente] = useState({ cargo: '', nombre: '', firma: '' });

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

  const contratoActual = useMemo(() => {
    if (!contratoIdSeleccionado) return null;
    return contratosList.find(c => {
      const cId = String(c?.id || c?.ID || c?.codigo || c?.Codigo || '').trim();
      return cId === String(contratoIdSeleccionado).trim();
    });
  }, [contratosList, contratoIdSeleccionado]);

  const nroContratoClienteReal = useMemo(() => {
    if (!contratoActual) return '---';
    return contratoActual.nro_contrato_cliente
      || contratoActual.contrato_nro_cliente
      || contratoActual.nrocontratocliente
      || contratoActual.contratocliente
      || '---';
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

  useEffect(() => {
    if (contratoActual) {
      const fee = contratoActual.fee_materiales != null
        ? Number(contratoActual.fee_materiales)
        : 49.49;
      setFeeDelContrato(fee);
    } else {
      setFeeDelContrato(0);
    }
  }, [contratoActual]);

  useEffect(() => {
    if (contratoActual) {
      const idContratoStr = String(contratoActual.id || '').trim();
      const codContratoStr = String(codigoSICEReal).trim();

      const certificadosDelContrato = historialCertificados.filter(c => {
        const cIdRef = String(c.contrato_id || c.contratoid || '').trim();
        const cCodRef = String(c.contrato_codigo || c.contratocodigo || '').trim();
        return (idContratoStr && cIdRef === idContratoStr)
          || (codContratoStr !== '---' && cCodRef === codContratoStr);
      });

      const nuevoNumero = certificadosDelContrato.length + 1;
      setCertificadoNro(nuevoNumero.toString().padStart(4, '0'));

      setRespCliente({
        nombre: contratoActual.cliente_nombre || contratoActual.cliente || 'Responsable Cliente',
        cargo: contratoActual.cliente_cargo || 'Gerente de Planta',
        firma: ''
      });

      setRespProveedor({
        nombre: contratoActual.proveedor_nombre || 'Responsable Proveedor',
        cargo: contratoActual.proveedor_cargo || 'Jefe de Obra',
        firma: ''
      });
    } else {
      setCertificadoNro('');
    }
  }, [contratoActual, historialCertificados, codigoSICEReal]);

  const facturasUsadasEnHistorial = useMemo(() => {
    const usadas = new Set();
    historialCertificados.forEach(cert => {
      if (Array.isArray(cert.facturas_usadas)) {
        cert.facturas_usadas.forEach(n => n && usadas.add(String(n)));
      }
      const rawFilas = cert.detalle_filas ?? cert.detalleFilas ?? cert.filas;
      let filas = [];
      if (typeof rawFilas === 'string') {
        try { filas = JSON.parse(rawFilas); } catch (e) {}
      } else if (Array.isArray(rawFilas)) {
        filas = rawFilas;
      }
      filas.forEach(f => {
        if (f.nFactura) usadas.add(String(f.nFactura));
      });
    });
    return usadas;
  }, [historialCertificados]);

  const facturasEnTablaActual = useMemo(() => {
    const set = new Set();
    facturasSeleccionadas.forEach(f => f.nFactura && set.add(String(f.nFactura)));
    return set;
  }, [facturasSeleccionadas]);

  const facturasDisponibles = useMemo(() => {
    if (!contratoActual) return [];
    if (!periodoDesde || !periodoHasta) return [];

    const contratoIdStr = String(contratoActual.id || '').trim();
    const codigoSICEStr = String(codigoSICEReal || '').trim();

    const desde = new Date(periodoDesde + 'T00:00:00');
    const hasta = new Date(periodoHasta + 'T23:59:59');

    return facturasList.filter(f => {
      const fContratoId = String(f?.contrato_id || '').trim();
      if (!fContratoId) return false;

      const matchPorId = fContratoId === contratoIdStr;
      const matchPorCodigo = codigoSICEStr && codigoSICEStr !== '---' && fContratoId === codigoSICEStr;
      const matchParcial = codigoSICEStr && codigoSICEStr !== '---'
        && (fContratoId.includes(codigoSICEStr) || codigoSICEStr.includes(fContratoId));

      if (!matchPorId && !matchPorCodigo && !matchParcial) return false;

      const fFecha = f?.fecha;
      if (!fFecha) return false;

      let fFechaDate;
      if (typeof fFecha === 'string' && fFecha.includes('/')) {
        const [d, m, y] = fFecha.split('/');
        fFechaDate = new Date(`${y}-${m}-${d}T00:00:00`);
      } else {
        fFechaDate = new Date(fFecha);
      }
      if (isNaN(fFechaDate.getTime())) return false;
      if (fFechaDate < desde || fFechaDate > hasta) return false;

      const fNro = String(f?.n_factura || '').trim();
      if (fNro && facturasUsadasEnHistorial.has(fNro)) return false;
      if (fNro && facturasEnTablaActual.has(fNro)) return false;

      return true;
    }).map(f => {
      const montoSinIva = Number(f?.monto_sin_iva || f?.subtotal || 0);
      const factor = 1 + (feeDelContrato / 100);
      const montoConFactor = montoSinIva * factor;

      let proveedorNombre = f?.proveedor || '';
      if (!proveedorNombre && f?.proveedor_id) {
        const prov = proveedoresList.find(p =>
          String(p?.id || p?.ID || '').trim() === String(f.proveedor_id).trim()
        );
        proveedorNombre = prov?.nombre || prov?.razon_social || prov?.Nombre || `Proveedor #${f.proveedor_id}`;
      }

      return {
        id: String(f?.id || f?.ID || f?.n_factura || Math.random()),
        nFactura: String(f?.n_factura || 'S/N'),
        fecha: f?.fecha || '',
        proveedor: proveedorNombre || '---',
        monto_sin_iva: montoSinIva,
        factor: factor,
        monto_con_factor: montoConFactor,
        total: montoConFactor,
        _raw: f
      };
    });
  }, [contratoActual, codigoSICEReal, facturasList, proveedoresList, periodoDesde, periodoHasta, feeDelContrato, facturasUsadasEnHistorial, facturasEnTablaActual]);

  const agregarFacturaFila = (factura) => {
    const nuevaFila = {
      id: `fact-${factura.nFactura}-${Date.now()}`,
      nFactura: factura.nFactura,
      fecha: factura.fecha,
      proveedor: factura.proveedor,
      monto_sin_iva: factura.monto_sin_iva,
      factor: factura.factor,
      monto_con_factor: factura.monto_con_factor,
      total: factura.total
    };
    setFacturasSeleccionadas(prev => [...prev, nuevaFila]);
  };

  const eliminarFila = (id) => {
    setFacturasSeleccionadas(prev => prev.filter(item => item.id !== id));
  };

  const actualizarFila = (id, campo, valor) => {
    setFacturasSeleccionadas(prev => prev.map(item => {
      if (item.id !== id) return item;
      const actualizado = { ...item, [campo]: valor };
      if (campo === 'monto_sin_iva') {
        const s = Number(valor) || 0;
        actualizado.monto_con_factor = s * actualizado.factor;
        actualizado.total = actualizado.monto_con_factor;
      }
      return actualizado;
    }));
  };

  const totalGeneralMonto = useMemo(() => {
    return facturasSeleccionadas.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  }, [facturasSeleccionadas]);

  const totalGeneralSinIva = useMemo(() => {
    return facturasSeleccionadas.reduce((acc, curr) => acc + (Number(curr.monto_sin_iva) || 0), 0);
  }, [facturasSeleccionadas]);

  const totalGeneralConFactor = useMemo(() => {
    return facturasSeleccionadas.reduce((acc, curr) => acc + (Number(curr.monto_con_factor) || 0), 0);
  }, [facturasSeleccionadas]);

  useEffect(() => {
    if (feeDelContrato >= 0) {
      const factor = 1 + (feeDelContrato / 100);
      setFacturasSeleccionadas(prev => prev.map(f => {
        const s = Number(f.monto_sin_iva) || 0;
        const mcf = s * factor;
        return {
          ...f,
          factor,
          monto_con_factor: mcf,
          total: mcf
        };
      }));
    }
  }, [feeDelContrato]);

  const guardarCertificadoMateriales = async (e) => {
    e.preventDefault();
    if (!contratoActual) return toast.error("Seleccione un contrato válido.");
    if (facturasSeleccionadas.length === 0) return toast.error("Agregue al menos una factura al certificado.");

    const regexClave = /^[A-Za-z]{2}\d{4}$/;
    if (!regexClave.test(respProveedor.firma)) return toast.error("La clave del Responsable Proveedor debe tener 2 letras y 4 números (Ej: AB1234).");
    if (!regexClave.test(respCliente.firma)) return toast.error("La clave del Responsable Cliente debe tener 2 letras y 4 números (Ej: CD5678).");

    if (respProveedor.firma.toUpperCase() !== clavesContratoActual.proveedorKey.toUpperCase()) {
      return toast.error("La clave del Responsable Proveedor no coincide con el contrato.");
    }
    if (respCliente.firma.toUpperCase() !== clavesContratoActual.clienteKey.toUpperCase()) {
      return toast.error("La clave del Responsable Cliente no coincide con el contrato.");
    }

    setIsSaving(true);
    const toastId = toast.loading('Guardando certificado de materiales...');

    try {
      const facturasUsadas = Array.from(new Set(facturasSeleccionadas.map(f => String(f.nFactura))));

      const facturasLimpias = facturasSeleccionadas.map(f => {
        const { _raw, ...resto } = f;
        return resto;
      });

      const payloadFirestore = {
        contrato_id: String(contratoIdSeleccionado),
        contrato_codigo: codigoSICEReal === '---' ? '' : codigoSICEReal,
        nro_contrato_cliente: nroContratoClienteReal === '---' ? '' : nroContratoClienteReal,
        certificado_nro: certificadoNro,
        fecha_emision: formatearFecha(fechaEmision),
        periodo_desde: formatearFecha(periodoDesde),
        periodo_hasta: formatearFecha(periodoHasta),
        cliente: contratoActual?.cliente || contratoActual?.Cliente || 'Cliente',
        fee_materiales: Number(feeDelContrato),
        detalle_filas: facturasLimpias,
        facturas_usadas: facturasUsadas,
        total_sin_iva: totalGeneralSinIva,
        total_con_factor: totalGeneralConFactor,
        total_general: totalGeneralMonto,
        responsable_proveedor: respProveedor,
        responsable_cliente: respCliente,
        pdf_url: ''
      };

      const docId = await crearDoc('certificaciones_materiales', payloadFirestore);
      console.info('[CertificadoMateriales] ✅ Doc creado en Firestore:', docId);

      let pdfUrlFinal = '';
      let pdfFallo = false;
      let errorPdfMsg = '';

      try {
        const payloadGs = {
          action: 'guardar_certificado_materiales',
          contrato_id: String(contratoIdSeleccionado),
          contrato_codigo: codigoSICEReal === '---' ? '' : codigoSICEReal,
          nro_contrato_cliente: nroContratoClienteReal === '---' ? '' : nroContratoClienteReal,
          certificado_nro: certificadoNro,
          fecha_emision: formatearFecha(fechaEmision),
          periodo_desde: formatearFecha(periodoDesde),
          periodo_hasta: formatearFecha(periodoHasta),
          cliente: contratoActual?.cliente || contratoActual?.Cliente || 'Cliente',
          fee_materiales: Number(feeDelContrato),
          detalle_filas: facturasLimpias,
          total_general: totalGeneralMonto,
          responsable_proveedor: respProveedor,
          responsable_cliente: respCliente,
          carpetaDestino: 'Certificados Materiales'
        };

        const res = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payloadGs)
        });

        const textoCrudo = await res.text();
        console.info('[CertificadoMateriales] Status:', res.status, '| Primeros chars:', textoCrudo.trim().slice(0, 60));

        if (!res.ok) throw new Error(`Apps Script devolvió status ${res.status}`);
        if (textoCrudo.trim().startsWith('<')) {
          throw new Error('El servidor devolvió HTML en vez de JSON');
        }

        const resultado = JSON.parse(textoCrudo);
        if (resultado?.success === false) {
          throw new Error(resultado.error || 'Error desconocido del servidor');
        }

        pdfUrlFinal = resultado?.pdf_url || resultado?.pdfUrl || resultado?.url || '';
        console.info('[CertificadoMateriales] ✅ PDF generado:', pdfUrlFinal);

        if (pdfUrlFinal) {
          await actualizarDoc('certificaciones_materiales', docId, {
            pdf_url: pdfUrlFinal
          });
          console.info('[CertificadoMateriales] ✅ Doc actualizado con PDF');
        }
      } catch (pdfErr) {
        console.error('[CertificadoMateriales] ⚠️ Falló generación de PDF:', pdfErr);
        pdfFallo = true;
        errorPdfMsg = pdfErr?.message || 'Error desconocido';
      }

      if (pdfFallo) {
        toast.error(
          `Certificado Nro ${certificadoNro} guardado, pero el PDF no se pudo generar (${errorPdfMsg}).`,
          { id: toastId, duration: 7000 }
        );
      } else {
        toast.success(`¡Certificado Nro ${certificadoNro} guardado con PDF en Drive!`, { id: toastId });
      }

      setFacturasSeleccionadas([]);
      setRespCliente(prev => ({...prev, firma: ''}));
      setRespProveedor(prev => ({...prev, firma: ''}));
    } catch (err) {
      console.error('[CertificadoMateriales] ❌ Error crítico:', err);
      toast.error('Error al guardar: ' + (err.message || 'Desconocido'), { id: toastId, duration: 6000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarCertificado = async (idCertificado) => {
    if (!idCertificado) {
      toast.error("No se puede eliminar: falta el ID del certificado.");
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas eliminar este certificado del historial?")) return;

    const toastId = toast.loading('Eliminando certificado...');
    try {
      await eliminarDoc('certificaciones_materiales', idCertificado);
      toast.success('Certificado eliminado correctamente', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar: ' + (err.message || ''), { id: toastId });
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-6 text-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-slate-800 pb-4 gap-4">
          <div>
            <img src="/logo-07.png" alt="SICE S.A." className="h-16 object-contain mb-2" />
            <p className="font-extrabold text-blue-900 text-xs">SOLVENCIAS INTEGRALES Y CONSTRUCTIVOS EMPRESARIOS S.A.</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 tracking-wide uppercase">CERTIFICADO MENSUAL DE MATERIALES</h2>
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
            <span className="text-slate-500 font-semibold block">Seleccionar Contrato ({contratosList.length} disponibles):</span>
            <select
              value={contratoIdSeleccionado}
              onChange={(e) => setContratoIdSeleccionado(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">-- Seleccionar Contrato / Mantenimiento --</option>
              {contratosList.map((c, idx) => {
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
            <Calendar className="w-4 h-4 text-amber-600" /> PERÍODO:
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

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-emerald-600" /> FEE MATERIALES:
            </label>
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded px-3 py-1">
              <span className="text-sm font-black text-emerald-700 font-mono">
                {Number(feeDelContrato).toFixed(2)}
              </span>
              <span className="text-xs font-bold text-emerald-700">%</span>
            </div>
            <span className="text-[10px] text-slate-400 italic ml-1">
              {contratoIdSeleccionado ? '(definido en el contrato)' : '(seleccione un contrato)'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-300">
          <span className="text-xs font-bold text-slate-700">
            Facturas Disponibles ({facturasDisponibles.length} disp.):
          </span>
          <select
            onChange={(e) => {
              const factId = e.target.value;
              if (!factId) return;
              const factEncontrada = facturasDisponibles.find(f => String(f.id) === String(factId) || String(f.nFactura) === String(factId));
              if (factEncontrada) {
                agregarFacturaFila(factEncontrada);
              }
              e.target.value = '';
            }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer w-96"
          >
            <option value="">
              {!contratoIdSeleccionado
                ? 'Primero seleccione un contrato...'
                : (!periodoDesde || !periodoHasta)
                  ? 'Seleccione un rango de fechas...'
                  : '+ Seleccionar factura a certificar...'}
            </option>
            {facturasDisponibles.map((f, idx) => (
              <option key={f.id || idx} value={f.id || f.nFactura}>
                FC #{f.nFactura} ({formatearFecha(f.fecha)}) - {f.proveedor} - $ {Number(f.monto_sin_iva).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-400 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                <th className="py-3 px-3 text-center w-12 border-r border-slate-700">ÍTEM</th>
                <th className="py-3 px-3 border-r border-slate-700">FECHA</th>
                <th className="py-3 px-3 border-r border-slate-700 text-center">NRO FC</th>
                <th className="py-3 px-3 border-r border-slate-700">PROVEEDOR</th>
                <th className="py-3 px-3 text-right border-r border-slate-700">MONTO SIN IVA</th>
                <th className="py-3 px-3 text-center border-r border-slate-700">FACTOR</th>
                <th className="py-3 px-3 text-right border-r border-slate-700">MONTO CON FACTOR (= TOTAL)</th>
                <th className="py-3 px-3 text-center w-16">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 bg-white">
              {facturasSeleccionadas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 italic">
                    No hay facturas incorporadas en este certificado. Seleccione una arriba para comenzar.
                  </td>
                </tr>
              ) : (
                facturasSeleccionadas.map((item, index) => (
                  <tr key={item.id} className="hover:bg-amber-50/40">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r border-slate-300">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-medium font-mono">
                      {formatearFecha(item.fecha)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-center text-amber-700">
                      #{item.nFactura}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-300 font-semibold text-slate-800">
                      {item.proveedor}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300">
                      <input
                        type="number"
                        step="0.01"
                        autoComplete="off"
                        value={item.monto_sin_iva}
                        onChange={(e) => actualizarFila(item.id, 'monto_sin_iva', e.target.value)}
                        className="w-28 bg-slate-50 border border-slate-300 rounded px-1 py-1 text-right font-bold text-xs font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono font-bold text-emerald-700">
                      {Number(item.factor).toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-slate-300 font-black text-slate-900 font-mono">
                      $ {Number(item.monto_con_factor).toLocaleString('es-AR', { maximumFractionDigits: 2 })}
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
            {facturasSeleccionadas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 text-slate-900 font-bold text-xs border-t-2 border-slate-300">
                  <td colSpan="4" className="py-2 px-3 text-right uppercase text-[10px] text-slate-600">
                    Subtotal sin IVA:
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700" colSpan="2">
                    $ {totalGeneralSinIva.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    $ {totalGeneralConFactor.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    (con factor)
                  </td>
                </tr>
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

        {/* 🔑 FIX: un único <form> que envuelve firmas + botón */}
        <form onSubmit={guardarCertificadoMateriales} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-400 rounded-xl overflow-hidden bg-white">
              <div className="bg-slate-200 border-b border-slate-400 px-4 py-2 font-black text-slate-800 text-xs uppercase tracking-wider">
                RESPONSABLE PROVEEDOR
              </div>
              <div className="p-4 space-y-3 text-xs font-bold">
                <div>
                  <span className="block text-slate-500 mb-1 text-[10px]">CARGO:</span>
                  <input
                    type="text"
                    autoComplete="off"
                    value={respProveedor.cargo}
                    onChange={(e) => setRespProveedor({...respProveedor, cargo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800"
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
                  <input
                    type="text"
                    autoComplete="off"
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
                    autoComplete="new-password"
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
                    autoComplete="off"
                    value={respCliente.cargo}
                    onChange={(e) => setRespCliente({...respCliente, cargo: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 uppercase text-slate-800"
                  />
                </div>
                <div>
                  <span className="block text-slate-500 mb-1 text-[10px]">NOMBRE Y APELLIDO:</span>
                  <input
                    type="text"
                    autoComplete="off"
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
                    autoComplete="new-password"
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
              Ingrese sus claves para firmar y validar el certificado de materiales.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md cursor-pointer text-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isSaving ? 'Guardando Certificado...' : 'Aprobar, Firmar y Guardar Certificado'}
            </button>
          </div>
        </form>
      </div>

      {/* HISTORIAL */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-900" /> Historial de Certificados de Materiales Emitidos
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
                <th className="py-2.5 px-3 text-center">FEE</th>
                <th className="py-2.5 px-3 text-center">FACTURAS</th>
                <th className="py-2.5 px-3 text-right">TOTAL GENERAL ($)</th>
                <th className="py-2.5 px-3 text-center w-28">DOCUMENTO PDF</th>
                {esAdminOGerencia && <th className="py-2.5 px-3 text-center w-12">ELIMINAR</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {historialCertificados.length === 0 ? (
                <tr>
                  <td colSpan={esAdminOGerencia ? "9" : "8"} className="py-8 text-center text-slate-400 italic">
                    No hay certificados de materiales registrados en el sistema todavía.
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
                  const feeCert = Number(cert.fee_materiales || 0);
                  const cantFacturas = Array.isArray(cert.facturas_usadas) ? cert.facturas_usadas.length : 0;
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
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                        {feeCert.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] font-mono text-slate-600">
                        {cantFacturas} fact.
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
                          <span className="text-[10px] text-amber-600 italic font-semibold">PDF pendiente</span>
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