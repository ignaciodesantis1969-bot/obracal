import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

function buildHTML({ presupuesto, obra, cliente, rubros, tareas, tablaComparativa, facturas }) {
  const costoTotal = tareas.reduce((s, t) => s + (t.costo_total || 0), 0);
  const avancePromedio = tareas.length > 0
    ? tareas.reduce((s, t) => s + (t.avance_fisico || 0), 0) / tareas.length
    : 0;

  // Comparativa
  const facturadoPorInsumo = {};
  facturas.forEach(f => {
    (f.items || []).forEach(item => {
      if (item.insumo_id) facturadoPorInsumo[item.insumo_id] = (facturadoPorInsumo[item.insumo_id] || 0) + (item.precio_total || 0);
    });
  });
  const totalFacturado = facturas.reduce((s, f) => s + (f.total || 0), 0);

  const rubrosHTML = rubros.map(rub => {
    const ts = tareas.filter(t => t.rubro_id === rub.id);
    const rubTotal = ts.reduce((s, t) => s + (t.costo_total || 0), 0);
    const rubAvg = ts.length > 0 ? ts.reduce((s, t) => s + (t.avance_fisico || 0), 0) / ts.length : 0;

    const tareasRows = ts.map(t => `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${t.nombre}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${t.unidad || '—'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${t.cantidad}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(t.costo_unitario)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${fmt(t.costo_total)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
              <div style="width:${Math.min(t.avance_fisico || 0, 100)}%;background:${(t.avance_fisico||0)>=100?'#10b981':(t.avance_fisico||0)>=50?'#f59e0b':'#3b82f6'};height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-size:11px;min-width:32px;">${(t.avance_fisico || 0).toFixed(0)}%</span>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom:24px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:700;color:#1e293b;font-size:13px;">${rub.nombre}</span>
          <span style="font-weight:700;color:#1e293b;font-size:13px;">${fmt(rubTotal)}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:6px 10px;text-align:left;color:#64748b;font-size:11px;">Tarea</th>
              <th style="padding:6px 10px;text-align:center;color:#64748b;font-size:11px;">Unidad</th>
              <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;">Cant.</th>
              <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;">C. Unit.</th>
              <th style="padding:6px 10px;text-align:right;color:#64748b;font-size:11px;">C. Total</th>
              <th style="padding:6px 10px;text-align:center;color:#64748b;font-size:11px;">Avance Físico</th>
            </tr>
          </thead>
          <tbody>${tareasRows}</tbody>
        </table>
      </div>
    `;
  }).join('');

  const comparativaRows = rubros.map(rub => {
    const ts = tareas.filter(t => t.rubro_id === rub.id);
    const presupuestado = ts.reduce((s, t) => s + (t.costo_total || 0), 0);
    const insumoIds = new Set(ts.flatMap(t => (t.insumos || []).map(i => i.insumo_id)));
    const facturado = [...insumoIds].reduce((s, id) => s + (facturadoPorInsumo[id] || 0), 0);
    const dif = presupuestado - facturado;
    const pct = presupuestado > 0 ? (facturado / presupuestado) * 100 : 0;
    return `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;">${rub.nombre}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(presupuestado)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt(facturado)}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:${dif>=0?'#059669':'#dc2626'};font-weight:600;">${fmt(Math.abs(dif))}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="flex:1;background:#e2e8f0;border-radius:4px;height:8px;">
              <div style="width:${Math.min(pct,100)}%;background:${pct>=100?'#ef4444':pct>=80?'#f59e0b':'#10b981'};height:8px;border-radius:4px;"></div>
            </div>
            <span style="font-size:11px;min-width:32px;">${pct.toFixed(0)}%</span>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const fechaHoy = new Date().toLocaleDateString('es-AR');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Presupuesto ${presupuesto?.codigo || ''}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 13px; }
        h1 { font-size: 20px; margin: 0; } h2 { font-size: 14px; margin: 0 0 12px; color: #475569; border-bottom: 2px solid #f59e0b; padding-bottom: 6px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
        .kpi label { display: block; font-size: 10px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
        .kpi span { font-size: 16px; font-weight: 700; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #f1f5f9; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <!-- Encabezado -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:3px solid #f59e0b;padding-bottom:16px;">
        <div>
          <div style="background:#f59e0b;color:white;display:inline-block;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;margin-bottom:6px;">${presupuesto?.codigo || ''}</div>
          <h1>${presupuesto?.nombre || 'Presupuesto'}</h1>
          <p style="color:#64748b;margin:4px 0 0;font-size:12px;">
            Obra: <strong>${obra?.nombre || '—'}</strong> &nbsp;|&nbsp; Cliente: <strong>${cliente?.razon_social || '—'}</strong>
          </p>
        </div>
        <div style="text-align:right;font-size:11px;color:#94a3b8;">
          <p style="margin:0;font-weight:700;">ObrasManager</p>
          <p style="margin:2px 0;">Generado: ${fechaHoy}</p>
          <p style="margin:0;">Estado: <strong style="color:#1e293b;">${presupuesto?.estado || '—'}</strong></p>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi"><label>Costo Directo</label><span>${fmt(presupuesto?.costo_directo_total)}</span></div>
        <div class="kpi"><label>Precio de Venta</label><span style="color:#059669">${fmt(presupuesto?.precio_venta_total)}</span></div>
        <div class="kpi"><label>Coeficiente de Pase</label><span style="color:#2563eb">${presupuesto?.coeficiente_pase?.toFixed(4) || '—'}</span></div>
        <div class="kpi"><label>Avance Físico Promedio</label><span style="color:#d97706">${avancePromedio.toFixed(1)}%</span></div>
      </div>

      <!-- Presupuesto Detallado -->
      <h2>Presupuesto Detallado por Rubro</h2>
      ${rubrosHTML}

      <!-- Comparativa -->
      <h2 style="margin-top:32px;">Comparativa Real vs. Presupuestado</h2>
      <table style="font-size:12px;">
        <thead>
          <tr>
            <th style="padding:7px 10px;text-align:left;color:#64748b;font-size:11px;">Rubro</th>
            <th style="padding:7px 10px;text-align:right;color:#64748b;font-size:11px;">Presupuestado</th>
            <th style="padding:7px 10px;text-align:right;color:#64748b;font-size:11px;">Facturado</th>
            <th style="padding:7px 10px;text-align:right;color:#64748b;font-size:11px;">Diferencia</th>
            <th style="padding:7px 10px;text-align:center;color:#64748b;font-size:11px;">Ejecución</th>
          </tr>
        </thead>
        <tbody>${comparativaRows}</tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:700;">
            <td style="padding:8px 10px;">TOTAL</td>
            <td style="padding:8px 10px;text-align:right;color:#1d4ed8;">${fmt(costoTotal)}</td>
            <td style="padding:8px 10px;text-align:right;color:#d97706;">${fmt(totalFacturado)}</td>
            <td style="padding:8px 10px;text-align:right;color:${(costoTotal-totalFacturado)>=0?'#059669':'#dc2626'};">${fmt(Math.abs(costoTotal-totalFacturado))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top:40px;border-top:1px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
        <span>ObrasManager — Gestión Integral de Obras</span>
        <span>Generado el ${fechaHoy}</span>
      </div>
    </body>
    </html>
  `;
}

export default function ExportarPDF({ presupuesto, obra, cliente, rubros, tareas }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const facturas = await base44.entities.Factura.filter({ presupuesto_id: presupuesto?.id, tipo: 'compra' }).catch(() => []);
    const html = buildHTML({ presupuesto, obra, cliente, rubros, tareas, facturas });
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); setLoading(false); }, 600);
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      Exportar PDF
    </Button>
  );
}