import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="p-8 text-center">
      {Icon && <Icon className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
      <p className="text-sm font-bold text-slate-500">{title}</p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}