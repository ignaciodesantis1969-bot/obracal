// src/components/compras/EstadoCuentaCentrosGenerales.jsx
import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Paperclip,
  Mail,
  Layers,
  Receipt,
  CheckCircle2,
  Clock,
  Filter
} from 'lucide-react';

const CENTROS_GENERALES = [
  {
    key: 'Gastos Directos',
    titulo: 'Gastos Directos',
    matchValues: ['gastos directos', 'gasto directo'],
    badgeClass: 'bg-blue-100 text-blue-800',
    accentBorder: 'border-blue-500'
  },
  {
    key: 'Gasto Corriente',
    titulo: 'Gastos Corrientes',
    matchValues: ['gasto corriente', 'gastos corrientes'],
    badgeClass: 'bg-emerald-100 text-emerald-800',
    accentBorder: 'border-emerald-500'
  },
  {
    key: 'Gasto Extra',
    titulo: 'Gastos Extra (Subcuentas)',
    matchValues: ['gasto extra', 'gastos extra'],
    badgeClass: 'bg-amber-100 text-amber-900',
    accentBorder: 'border-amber-500'
  }
];

const formatearMoneda = (valor) => {
  const num = Number(valor) || 0;
  const signo = num < 0 ? '-' : '';
  return `${signo}$ ${Math.abs(num).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export default function EstadoCuentaCentrosGenerales({
  facturasRender,
  proveedores,
  buscarValorEnObjeto,
  formatearFechaDisplay,
  handleVerArchivo,
  handleEditarFacturaClick,
  esACompletar,
  obtenerIdReal,
  onAbrirEnviarContadorFiltrado
}) {
  const [centroActivo, setCentroActivo] = useState('Gastos Directos');
  const [subcuentaSeleccionada, setSubcuentaSeleccionada] = useState('TODAS');
  const [filtroProveedorLocal, setFiltroProveedorLocal] = useState('');
  const [filtroEstadoPagoLocal, setFiltroEstadoPagoLocal] = useState('');
  const [filtroFechaDesdeLocal, setFiltroFechaDesdeLocal] = useState('');
  const [filtroFechaHastaLocal, setFiltroFechaHastaLocal] = useState('');

  // Deduplicamos igual que en Compras para evitar registros repetidos
  const facturasBaseGenerales = useMemo(() => {
    const todasMatch = CENTROS_GENERALES.flatMap((c) => c.matchValues);
    const filtradas = (facturasRender || []).filter((f) => {
      const tipoGasto = String(
        buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto', 'tipogasto']) || ''
      )
        .trim()
        .toLowerCase();
      return todasMatch.includes(tipoGasto);
    });

    const unicosMap = new Map();
    filtradas.forEach((f, idx) => {
      const nro = buscarValorEnObjeto(f, ['n_factura', 'numero_comp']);
      const tot = buscarValorEnObjeto(f, ['total']);
      const id = obtenerIdReal(f);
      const key = nro ? `${nro}-${tot}-${tipoGastoOrTipo(f, buscarValorEnObjeto)}` : id || `gen-${idx}`;
      if (!unicosMap.has(key)) {
        unicosMap.set(key, f);
      } else {
        const ext = unicosMap.get(key);
        if (
          new Date(f._actualizadoEn || f._creadoEn || 0).getTime() >
          new Date(ext._actualizadoEn || ext._creadoEn || 0).getTime()
        ) {
          unicosMap.set(key, f);
        }
      }
    });
    return Array.from(unicosMap.values());
  }, [facturasRender, buscarValorEnObjeto]);

  function tipoGastoOrTipo(f, fn) {
    return String(fn(f, ['tipo_gasto', 'Tipo_gasto']) || '').toLowerCase();
  }

  // Resumen por centro general (antes de filtrar por subcuenta)
  const resumenPorCentro = useMemo(() => {
    return CENTROS_GENERALES.map((centro) => {
      const items = facturasBaseGenerales.filter((f) => {
        const tg = String(buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto']) || '')
          .trim()
          .toLowerCase();
        return centro.matchValues.includes(tg);
      });

      const subtotal = items.reduce((acc, f) => acc + (Number(buscarValorEnObjeto(f, ['subtotal'])) || 0), 0);
      const iva21 = items.reduce((acc, f) => acc + (Number(buscarValorEnObjeto(f, ['iva_21'])) || 0), 0);
      const iva105 = items.reduce((acc, f) => acc + (Number(buscarValorEnObjeto(f, ['iva_10_5'])) || 0), 0);
      const ivaTotal = iva21 + iva105;
      const total = items.reduce((acc, f) => acc + (Number(buscarValorEnObjeto(f, ['total'])) || 0), 0);

      const pagado = items.reduce((acc, f) => {
        const ep = String(buscarValorEnObjeto(f, ['estado_pago']) || '').toLowerCase();
        const val = Number(buscarValorEnObjeto(f, ['total'])) || 0;
        return ep === 'pagado' || ep === 'contabilizado' ? acc + val : acc;
      }, 0);

      const pendiente = total - pagado;

      return {
        ...centro,
        cantidad: items.length,
        subtotal,
        iva21,
        iva105,
        ivaTotal,
        total,
        pagado,
        pendiente
      };
    });
  }, [facturasBaseGenerales, buscarValorEnObjeto]);

  const configCentroActual = useMemo(
    () => CENTROS_GENERALES.find((c) => c.key === centroActivo) || CENTROS_GENERALES[0],
    [centroActivo]
  );

  const facturasDelCentro = useMemo(() => {
    return facturasBaseGenerales.filter((f) => {
      const tg = String(buscarValorEnObjeto(f, ['tipo_gasto', 'Tipo_gasto']) || '')
        .trim()
        .toLowerCase();
      return configCentroActual.matchValues.includes(tg);
    });
  }, [facturasBaseGenerales, configCentroActual, buscarValorEnObjeto]);

  // Desglose por subcuenta para Gasto Extra
  const desgloseSubcuentasExtra = useMemo(() => {
    if (configCentroActual.key !== 'Gasto Extra') return [];

    const mapa = new Map();
    facturasDelCentro.forEach((f) => {
      const rawSub = String(buscarValorEnObjeto(f, ['subcuenta_extra', 'Subcuenta_extra']) || '').trim();
      const subKey = rawSub && !esACompletar(rawSub) ? rawSub : 'Sin subcuenta asignada';

      if (!mapa.has(subKey)) {
        mapa.set(subKey, {
          subcuenta: subKey,
          cantidad: 0,
          subtotal: 0,
          ivaTotal: 0,
          total: 0,
          pagado: 0,
          pendiente: 0
        });
      }

      const entry = mapa.get(subKey);
      const sub = Number(buscarValorEnObjeto(f, ['subtotal'])) || 0;
      const i21 = Number(buscarValorEnObjeto(f, ['iva_21'])) || 0;
      const i105 = Number(buscarValorEnObjeto(f, ['iva_10_5'])) || 0;
      const tot = Number(buscarValorEnObjeto(f, ['total'])) || 0;
      const ep = String(buscarValorEnObjeto(f, ['estado_pago']) || '').toLowerCase();
      const esContabOPagado = ep === 'pagado' || ep === 'contabilizado';

      entry.cantidad += 1;
      entry.subtotal += sub;
      entry.ivaTotal += i21 + i105;
      entry.total += tot;
      if (esContabOPagado) {
        entry.pagado += tot;
      } else {
        entry.pendiente += tot;
      }
    });

    return Array.from(mapa.values()).sort((a, b) => a.subcuenta.localeCompare(b.subcuenta, 'es'));
  }, [configCentroActual.key, facturasDelCentro, buscarValorEnObjeto]);

  const facturasFiltradasCentro = useMemo(() => {
    return facturasDelCentro.filter((f) => {
      if (configCentroActual.key === 'Gasto Extra' && subcuentaSeleccionada !== 'TODAS') {
        const rawSub = String(buscarValorEnObjeto(f, ['subcuenta_extra', 'Subcuenta_extra']) || '').trim();
        const subKey = rawSub && !esACompletar(rawSub) ? rawSub : 'Sin subcuenta asignada';
        if (subKey !== subcuentaSeleccionada) return false;
      }

      if (filtroProveedorLocal) {
        const provId = String(buscarValorEnObjeto(f, ['proveedor_id']) || '');
        if (provId !== String(filtroProveedorLocal)) return false;
      }

      if (filtroEstadoPagoLocal) {
        const ep = String(buscarValorEnObjeto(f, ['estado_pago']) || 'pendiente')
          .toLowerCase()
          .trim();
        if (ep !== filtroEstadoPagoLocal.toLowerCase()) return false;
      }

      const fFecha = String(buscarValorEnObjeto(f, ['fecha']) || '').split('T')[0];
      if (filtroFechaDesdeLocal && fFecha && fFecha < filtroFechaDesdeLocal) return false;
      if (filtroFechaHastaLocal && fFecha && fFecha > filtroFechaHastaLocal) return false;

      return true;
    });
  }, [
    facturasDelCentro,
    configCentroActual.key,
    subcuentaSeleccionada,
    filtroProveedorLocal,
    filtroEstadoPagoLocal,
    filtroFechaDesdeLocal,
    filtroFechaHastaLocal,
    buscarValorEnObjeto
  ]);

  const metricasFiltradas = useMemo(() => {
    const subtotal = facturasFiltradasCentro.reduce(
      (acc, f) => acc + (Number(buscarValorEnObjeto(f, ['subtotal'])) || 0),
      0
    );
    const iva21 = facturasFiltradasCentro.reduce(
      (acc, f) => acc + (Number(buscarValorEnObjeto(f, ['iva_21'])) || 0),
      0
    );
    const iva105 = facturasFiltradasCentro.reduce(
      (acc, f) => acc + (Number(buscarValorEnObjeto(f, ['iva_10_5'])) || 0),
      0
    );
    const ivaTotal = iva21 + iva105;
    const otrosImp = facturasFiltradasCentro.reduce(
      (acc, f) =>
        acc +
        (Number(buscarValorEnObjeto(f, ['persp_iibb_bs_as'])) || 0) +
        (Number(buscarValorEnObjeto(f, ['persp_iibb_caba'])) || 0) +
        (Number(buscarValorEnObjeto(f, ['otros_impuestos'])) || 0),
      0
    );
    const total = facturasFiltradasCentro.reduce(
      (acc, f) => acc + (Number(buscarValorEnObjeto(f, ['total'])) || 0),
      0
    );
    const pagado = facturasFiltradasCentro.reduce((acc, f) => {
      const ep = String(buscarValorEnObjeto(f, ['estado_pago']) || '').toLowerCase();
      const val = Number(buscarValorEnObjeto(f, ['total'])) || 0;
      return ep === 'pagado' || ep === 'contabilizado' ? acc + val : acc;
    }, 0);

    return {
      cantidad: facturasFiltradasCentro.length,
      subtotal,
      iva21,
      iva105,
      ivaTotal,
      otrosImp,
      total,
      pagado,
      pendiente: total - pagado
    };
  }, [facturasFiltradasCentro, buscarValorEnObjeto]);

  return (
    <div className="space-y-6">
      {/* 1. Tarjetas resumen de los 3 Centros Generales (independientes de Presupuestos) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {resumenPorCentro.map((centro) => {
          const activa = centro.key === configCentroActual.key;
          return (
            <button
              key={centro.key}
              type="button"
              onClick={() => {
                setCentroActivo(centro.key);
                setSubcuentaSeleccionada('TODAS');
              }}
              className={`text-left bg-white p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${
                activa
                  ? `${centro.accentBorder} ring-2 ring-amber-400/20`
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${centro.badgeClass}`}>
                  {centro.titulo}
                </span>
                <span className="text-xs font-bold text-slate-400">{centro.cantidad} comp.</span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2">
                {formatearMoneda(centro.total)}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Neto</span>
                  <span className="font-bold text-slate-700">{formatearMoneda(centro.subtotal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IVA Crédito</span>
                  <span className="font-bold text-blue-700">{formatearMoneda(centro.ivaTotal)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contab. / Pagado</span>
                  <span className="font-bold text-emerald-700">{formatearMoneda(centro.pagado)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Pendiente</span>
                  <span className="font-bold text-amber-700">{formatearMoneda(centro.pendiente)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Desglose por Subcuenta cuando está seleccionado Gasto Extra */}
      {configCentroActual.key === 'Gasto Extra' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Contabilidad Separada por Subcuenta — Gasto Extra
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSubcuentaSeleccionada('TODAS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                subcuentaSeleccionada === 'TODAS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Ver todas las subcuentas
            </button>
          </div>

          {desgloseSubcuentasExtra.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No hay facturas cargadas en Gasto Extra todavía.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                    <th className="px-4 py-3">Subcuenta</th>
                    <th className="px-3 py-3 text-center">Comp.</th>
                    <th className="px-4 py-3 text-right">Neto</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Contab. / Pagado</th>
                    <th className="px-4 py-3 text-right">Pendiente</th>
                    <th className="px-4 py-3 text-center">Filtrar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {desgloseSubcuentasExtra.map((sub) => {
                    const seleccionada = subcuentaSeleccionada === sub.subcuenta;
                    return (
                      <tr
                        key={sub.subcuenta}
                        className={`transition-colors ${
                          seleccionada ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-extrabold text-slate-900">{sub.subcuenta}</td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-600">{sub.cantidad}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {formatearMoneda(sub.subtotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {formatearMoneda(sub.ivaTotal)}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">
                          {formatearMoneda(sub.total)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {formatearMoneda(sub.pagado)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700">
                          {formatearMoneda(sub.pendiente)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setSubcuentaSeleccionada(seleccionada ? 'TODAS' : sub.subcuenta)
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                              seleccionada
                                ? 'bg-amber-600 text-white'
                                : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            }`}
                          >
                            {seleccionada ? 'Activa' : 'Abrir'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Barra de filtros y acción para enviar este estado de cuenta al contador */}
      <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Estado de Cuenta — {configCentroActual.titulo}
                {configCentroActual.key === 'Gasto Extra' && subcuentaSeleccionada !== 'TODAS'
                  ? ` · ${subcuentaSeleccionada}`
                  : ''}
              </h2>
              <p className="text-xs text-slate-500">
                Circuito compartido con Compras, Tesorería e IVA — separado de Presupuestos de Obra
              </p>
            </div>
          </div>

          {onAbrirEnviarContadorFiltrado && (
            <button
              type="button"
              onClick={() =>
                onAbrirEnviarContadorFiltrado(facturasFiltradasCentro, {
                  desde: filtroFechaDesdeLocal,
                  hasta: filtroFechaHastaLocal
                })
              }
              disabled={facturasFiltradasCentro.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-colors"
            >
              <Mail className="w-4 h-4" />
              Enviar Este Estado al Contador ({facturasFiltradasCentro.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              <Filter className="w-3 h-3 inline mr-1" />
              Proveedor
            </label>
            <select
              value={filtroProveedorLocal}
              onChange={(e) => setFiltroProveedorLocal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
            >
              <option value="">Todos los proveedores</option>
              {(proveedores || []).map((p) => {
                const pid = buscarValorEnObjeto(p, ['id', 'ID']);
                const pnom = buscarValorEnObjeto(p, ['razon_social', 'nombre', 'Razon_social']) || 'Proveedor';
                return (
                  <option key={pid} value={pid}>
                    {pnom}
                  </option>
                );
              })}
            </select>
          </div>

          {configCentroActual.key === 'Gasto Extra' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Subcuenta
              </label>
              <select
                value={subcuentaSeleccionada}
                onChange={(e) => setSubcuentaSeleccionada(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
              >
                <option value="TODAS">Todas las subcuentas</option>
                {desgloseSubcuentasExtra.map((s) => (
                  <option key={s.subcuenta} value={s.subcuenta}>
                    {s.subcuenta}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Estado de Pago
            </label>
            <select
              value={filtroEstadoPagoLocal}
              onChange={(e) => setFiltroEstadoPagoLocal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 uppercase outline-none focus:border-amber-500"
            >
              <option value="">Todos</option>
              <option value="a asignar">A Asignar</option>
              <option value="pendiente">Pendiente</option>
              <option value="contabilizado">Contabilizado</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={filtroFechaDesdeLocal}
              onChange={(e) => setFiltroFechaDesdeLocal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={filtroFechaHastaLocal}
              onChange={(e) => setFiltroFechaHastaLocal(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Barra de totales del filtro activo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Subtotal Neto</span>
            <span className="font-extrabold text-slate-900">{formatearMoneda(metricasFiltradas.subtotal)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase">IVA (21% + 10.5%)</span>
            <span className="font-extrabold text-blue-700">{formatearMoneda(metricasFiltradas.ivaTotal)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Total Comprobantes</span>
            <span className="font-black text-slate-900">{formatearMoneda(metricasFiltradas.total)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase">Saldo Pendiente</span>
            <span className="font-black text-amber-700">{formatearMoneda(metricasFiltradas.pendiente)}</span>
          </div>
        </div>

        {/* 4. Detalle de comprobantes del estado de cuenta */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Código / N°</th>
                <th className="px-4 py-3">Proveedor</th>
                {configCentroActual.key === 'Gasto Extra' && (
                  <th className="px-4 py-3">Subcuenta</th>
                )}
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3 text-right">Neto</th>
                <th className="px-4 py-3 text-right">IVA</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Arch.</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facturasFiltradasCentro.length === 0 ? (
                <tr>
                  <td
                    colSpan={configCentroActual.key === 'Gasto Extra' ? 11 : 10}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No hay comprobantes en este estado de cuenta con los filtros actuales.
                  </td>
                </tr>
              ) : (
                facturasFiltradasCentro.map((f, idx) => {
                  const provId = buscarValorEnObjeto(f, ['proveedor_id']);
                  const provObj = (proveedores || []).find(
                    (p) => String(buscarValorEnObjeto(p, ['id', 'ID'])) === String(provId)
                  );
                  const nombreProv =
                    provObj?.razon_social ||
                    provObj?.nombre ||
                    buscarValorEnObjeto(f, ['proveedor']) ||
                    'Proveedor';
                  const codigo = buscarValorEnObjeto(f, ['codigo']) || `FAC-${idx + 1}`;
                  const nroFact = buscarValorEnObjeto(f, ['n_factura']) || '---';
                  const detalle = buscarValorEnObjeto(f, ['detalle_gasto', 'detalle']) || '---';
                  const subcuenta =
                    buscarValorEnObjeto(f, ['subcuenta_extra', 'Subcuenta_extra']) || 'Sin subcuenta';
                  const fecha = buscarValorEnObjeto(f, ['fecha']);
                  const neto = Number(buscarValorEnObjeto(f, ['subtotal'])) || 0;
                  const iva =
                    (Number(buscarValorEnObjeto(f, ['iva_21'])) || 0) +
                    (Number(buscarValorEnObjeto(f, ['iva_10_5'])) || 0);
                  const total = Number(buscarValorEnObjeto(f, ['total'])) || 0;
                  const estadoPago = String(buscarValorEnObjeto(f, ['estado_pago']) || 'pendiente')
                    .toLowerCase()
                    .trim();
                  const archivoLink = buscarValorEnObjeto(f, ['archivo_url']) || '';

                  return (
                    <tr key={`${obtenerIdReal(f)}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatearFechaDisplay(fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-blue-600">{codigo}</div>
                        <div className="text-[11px] text-slate-700 font-semibold">{nroFact}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{nombreProv}</td>
                      {configCentroActual.key === 'Gasto Extra' && (
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                            {subcuenta}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={detalle}>
                        {esACompletar(detalle) ? '---' : detalle}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {formatearMoneda(neto)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700 whitespace-nowrap">
                        {formatearMoneda(iva)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-black whitespace-nowrap ${
                          total < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatearMoneda(total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            estadoPago === 'pagado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : estadoPago === 'contabilizado'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {estadoPago === 'pagado' || estadoPago === 'contabilizado' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {estadoPago}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {archivoLink && archivoLink !== 'Comprobante_Adjunto' ? (
                          <button
                            type="button"
                            onClick={() => handleVerArchivo(f)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded-lg cursor-pointer"
                            title="Ver comprobante"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditarFacturaClick(f)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:border-amber-500 text-slate-700 hover:text-amber-700 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
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