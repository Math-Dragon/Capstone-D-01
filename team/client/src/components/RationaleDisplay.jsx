export default function RationaleDisplay({
  rationale,
  className = '',
  label = 'Rationale AI',
  compact = false,
  id,
}) {
  if (!rationale?.trim()) return null;

  return (
    <div
      id={id}
      className={`border-l-2 border-primary-100 pl-3 ${compact ? 'py-0.5' : 'py-2'} ${className}`.trim()}
    >
      <p className="text-[11px] font-semibold uppercase text-primary-500 mb-0.5">{label}</p>
      <p className={`${compact ? 'text-xs' : 'text-sm'} text-primary-500 leading-relaxed`}>
        {rationale}
      </p>
    </div>
  );
}
