import { TrendBadge } from './TrendBadge';

export function KpiCard({ label, value, sub, format, trend }) {
  const display = format === 'usd' ? `$${Number(value).toFixed(4)}` : format === 'pct' ? `${value}%` : value?.toLocaleString?.() ?? value;
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-primary-900 tabular-nums">
        {display}
        <TrendBadge value={trend} />
      </p>
      {sub && <p className="text-xs text-primary-400 mt-1">{sub}</p>}
    </div>
  );
}
