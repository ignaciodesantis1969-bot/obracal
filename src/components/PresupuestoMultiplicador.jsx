import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, Calculator } from 'lucide-react';

const DEFAULT_CONFIG = {
  gastos_generales_items: [
    { nombre: 'Programa de Seguridad', cantidad: 1, unitario: 0, total: 0 },
    { nombre: 'Visita Lic. Seguridad e Higiene', cantidad: 1, unitario: 0, total: 0 },
    { nombre: 'Técnico Perm. Seg. e Higiene', cantidad: 1, unitario: 0, total: 0 },
    { nombre: 'Ropa de Trabajo', cantidad: 1, unitario: 0, total: 0 },
    { nombre: 'Comisión de Venta', cantidad: 1, unitario: 0, total: 0 },
    { nombre: 'Imprevistos', cantidad: 1, unitario: 0, total: 0 },
  ],
  iibb: 0.045,
  gastos_financieros: 0.02,
  ganancias: 0.054,
  sellados: 0,
  debitos_creditos: 0.012,
  beneficio: 0.22,
};

export default function PresupuestoMultiplicador({ presupuesto, onSave }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (presupuesto?.multiplicador_config) {
      setConfig({ ...DEFAULT_CONFIG, ...presupuesto.multiplicador_config });
    }
  }, [presupuesto]);

  const costoDirecto = presupuesto?.costo_directo_total || 0;

  const calcular = () => {
    const ggTotal = config.gastos_generales_items.reduce((s, i) => s + (i.total || 0), 0);
    // débitos y créditos = 0.06% sobre PV + 0.06% sobre CD => total = 0.0006 + 0.0006 * (CD/PV)
    // Se resuelve iterativamente: se incluye en la suma de porcentajes el 0.06% sobre PV
    // y adicionalmente se suma el equivalente del 0.06% sobre CD expresado sobre PV
    // Simplificación: debitosCreditos = 0.0006 (sobre PV) + 0.0006 * costoDirecto/precioVenta
    // Para el cálculo del coeficiente usamos la fórmula directa:
    // PV = (CD + GG + 0.0006*CD) / (1 - sumPorcentajes_sin_dc - 0.0006)
    const dcPorc = 0.0006; // 0.06% sobre PV
    const sumaSinDC = (config.iibb || 0) + (config.gastos_financieros || 0) + (config.ganancias || 0) + (config.sellados || 0) + (config.beneficio || 0);
    const ggPorc = costoDirecto > 0 ? ggTotal / costoDirecto : 0;
    // PV * (1 - sumaSinDC - dcPorc) = CD + GG + 0.0006*CD
    const numerador = costoDirecto + ggTotal + dcPorc * costoDirecto;
    const denominador = 1 - sumaSinDC - dcPorc;
    const precioVenta = denominador > 0 ? numerador / denominador : 0;
    const coeficientePase = costoDirecto > 0 ? precioVenta / costoDirecto : 0;
    const sumaPorcentajes = sumaSinDC + dcPorc + (precioVenta > 0 ? dcPorc * costoDirecto / precioVenta : 0);
    const coefPrimario = 1 - ggPorc - (sumaSinDC + dcPorc);
    return { ggTotal, ggPorc, sumaPorcentajes, coefPrimario, precioVenta, coeficientePase };
  };

  const { ggTotal, ggPorc, sumaPorcentajes, coefPrimario, precioVenta, coeficientePase } = calcular();

  const updateGG = (idx, field, value) => {
    const items = config.gastos_generales_items.map((item, i) => {
      if (i !== idx) return item;
      const upd = { ...item, [field]: parseFloat(value) || 0 };
      if (field === 'cantidad' || field === 'unitario') {
        upd.total = upd.cantidad * upd.unitario;
      }
      return upd;
    });
    setConfig(c => ({ ...c, gastos_generales_items: items }));
  };

  const addGG = () => {
    setConfig(c => ({ ...c, gastos_generales_items: [...c.gastos_generales_items, { nombre: '', cantidad: 1, unitario: 0, total: 0 }] }));
  };

  const removeGG = (idx) => {
    setConfig(c => ({ ...c, gastos_generales_items: c.gastos_generales_items.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { coeficientePase } = calcular();
    await onSave({ ...config, gastos_generales_total: ggTotal, coeficiente_primario: coefPrimario, coeficiente_pase: coeficientePase });
    setSaving(false);
  };

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
  const fmtPorc = (n) => `${((n || 0) * 100).toFixed(3)}%`;

  const impuestosItems = [
    { key: 'iibb', label: 'Imp. a los Ingresos Brutos (IIBB)' },
    { key: 'gastos_financieros', label: 'Gastos Financieros' },
    { key: 'ganancias', label: 'Impuesto a las Ganancias' },
    { key: 'sellados', label: 'Sellados' },
    { key: 'beneficio', label: 'Beneficio' },
  ];
  // Impuesto débitos y créditos calculado aparte
  const dcMontoPV = precioVenta * 0.0006;
  const dcMontoCD = costoDirecto * 0.0006;
  const dcTotal = dcMontoPV + dcMontoCD;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-500" /> Multiplicador — Cálculo del Coeficiente de Pase
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Costo Directo base: <span className="font-bold text-slate-700">{fmt(costoDirecto)}</span>
          {costoDirecto === 0 && <span className="text-amber-600 ml-2">⚠ Cargá tareas en el presupuesto de costos primero</span>}
        </p>

        {/* Gastos Generales */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-slate-600 text-sm">Gastos Generales (valores fijos $)</h4>
            <Button size="sm" variant="ghost" onClick={addGG} className="h-7 text-xs gap-1 text-blue-600">
              <Plus className="w-3 h-3" /> Agregar
            </Button>
          </div>
          <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {['Concepto','Cantidad','Unitario ($)','Total ($)',''].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-slate-600 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {config.gastos_generales_items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-1.5">
                      <Input className="h-7 text-xs" value={item.nombre} onChange={e => updateGG(idx, 'nombre', e.target.value)} />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" className="h-7 w-20 text-xs" value={item.cantidad} onChange={e => updateGG(idx, 'cantidad', e.target.value)} min="0" />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input type="number" className="h-7 w-28 text-xs" value={item.unitario} onChange={e => updateGG(idx, 'unitario', e.target.value)} min="0" />
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-slate-800 text-xs">{fmt(item.total)}</td>
                    <td className="px-3 py-1.5">
                      <button onClick={() => removeGG(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-amber-50">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700 text-xs">TOTAL Gastos Generales</td>
                  <td className="px-3 py-2 font-bold text-amber-700">{fmt(ggTotal)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Impuestos y Porcentuales */}
        <div className="mb-5">
          <h4 className="font-medium text-slate-600 text-sm mb-2">Impuestos y Porcentajes (% sobre precio de venta)</h4>
          <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {['Concepto','Porcentaje (%)','Monto calculado'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-slate-600 font-medium text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {impuestosItems.map(({ key, label }) => {
                  const monto = precioVenta * (config[key] || 0);
                  return (
                    <tr key={key} className={key === 'beneficio' ? 'bg-emerald-50' : ''}>
                      <td className="px-4 py-2 text-slate-700 text-sm">{label}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" step="0.001" min="0" max="1"
                            className="h-7 w-24 text-xs"
                            value={(config[key] * 100).toFixed(3)}
                            onChange={e => setConfig(c => ({ ...c, [key]: parseFloat(e.target.value) / 100 || 0 }))}
                          />
                          <span className="text-xs text-slate-400">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-800 text-xs">{fmt(monto)}</td>
                    </tr>
                  );
                })}
                {/* Débitos y Créditos: 0.06% sobre PV + 0.06% sobre CD */}
                <tr className="bg-slate-50">
                  <td className="px-4 py-2 text-slate-700 text-sm">
                    Imp. Débitos y Créditos
                    <span className="ml-1 text-xs text-slate-400">(0,06% s/PV + 0,06% s/CD)</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-slate-500">
                      <div>{fmt(dcMontoPV)} (PV)</div>
                      <div>{fmt(dcMontoCD)} (CD)</div>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-semibold text-slate-800 text-xs">{fmt(dcTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Resultado */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">Suma % porcentuales</p>
            <p className="font-bold text-slate-800">{fmtPorc(sumaPorcentajes)}</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-3">
            <p className="text-xs text-slate-500">% Gastos Generales</p>
            <p className="font-bold text-slate-800">{fmtPorc(ggPorc)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">Coeficiente Primario</p>
            <p className="font-bold text-blue-800 text-lg">{coefPrimario.toFixed(5)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-xs text-emerald-600 font-medium">Precio de Venta</p>
            <p className="font-bold text-emerald-800 text-lg">{fmt(precioVenta)}</p>
          </div>
        </div>

        <div className="mt-3 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Coeficiente de Pase</p>
            <p className="text-3xl font-black text-amber-700">{coeficientePase.toFixed(4)}</p>
            <p className="text-xs text-slate-500">Precio de Venta = Costo Directo × {coeficientePase.toFixed(4)}</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Aplicar al Presupuesto'}
          </Button>
        </div>
      </div>
    </div>
  );
}