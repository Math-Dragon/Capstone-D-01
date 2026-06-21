export function TrendBadge({ value, suffix }) {
  if (value === 0 || value == null) return null;
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ml-2 ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      <span>{isUp ? '\u2191' : '\u2193'}</span>
      {Math.abs(value)}{suffix || '%'}
    </span>
  );
}
