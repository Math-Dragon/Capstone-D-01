export default function RationaleDisplay({
  rationale,
  className = '',
  label = 'Rationale AI',
  compact = false,
  id,
}) {
  if (!rationale?.trim()) return null;

  const points = rationale
    .split(/[,;]\s*/)
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div
      id={id}
      className={`border-l-2 border-primary-100 pl-3 ${compact ? 'py-0.5' : 'py-2'} ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase text-primary-500 mb-0.5">{label}</p>
      {points.length > 1 ? (
        <ul className={`list-disc list-inside ${compact ? 'text-xs' : 'text-sm'} text-primary-500 leading-relaxed space-y-0.5`}>
          {points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </ul>
      ) : (
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-primary-500 leading-relaxed`}>
          {rationale}
        </p>
      )}
    </div>
  );
}
