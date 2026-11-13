// src/components/tesoreria/TabsTesoreria.jsx
import React from 'react';

const TABS = [
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'facturas_pagar', label: 'Facturas a pagar', countKey: 'facturasAPagar' },
  { key: 'facturas_cobrar', label: 'Facturas a cobrar', countKey: 'facturasACobrar' },
  { key: 'cashflow', label: 'Cash Flow' },
  { key: 'iva', label: 'IVA' },
  { key: 'retenciones', label: 'Retenciones', countKey: 'retenciones' },
];

export default function TabsTesoreria({ activeTab, setActiveTab, counts = {}, children }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const count = tab.countKey ? counts[tab.countKey] : null;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {count !== null && count !== undefined ? ` (${count})` : ''}
            </button>
          );
        })}
      </div>

      {children ? (
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}