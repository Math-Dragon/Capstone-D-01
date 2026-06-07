export default function RationaleDisplay({
  rationale,
  confidence,
  className = '',
  label = 'Rationale AI',
  compact = false,
  id,
}) {
  const parsed = normalizeRationale(rationale);
  if (!parsed) return null;

  const confidenceLabel = {
    low: 'rendah',
    medium: 'sedang',
    high: 'tinggi',
  }[confidence];

  const textClass = `${compact ? 'text-xs' : 'text-sm'} text-primary-500 leading-relaxed`;

  return (
    <div
      id={id}
      className={`border-l-2 border-primary-100 pl-3 ${compact ? 'py-0.5' : 'py-2'} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-2 mb-0.5">
        <p className="text-[11px] font-semibold uppercase text-primary-500">{label}</p>
        {confidenceLabel && (
          <span className="text-[10px] font-semibold rounded-full bg-primary-100 text-primary-700 px-2 py-0.5">
            Keyakinan {confidenceLabel}
          </span>
        )}
      </div>
      {parsed.type === 'text' ? (
        <p className={textClass}>{parsed.value}</p>
      ) : (
        <ul className="space-y-1.5">
          {parsed.value.map((item, index) => (
            <li key={`${item.factor}-${index}`} className={textClass}>
              <span className="font-semibold text-primary-700">{formatFactor(item.factor)}</span>
              <span aria-hidden="true"> - </span>
              <span>{item.explanation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function normalizeRationale(rationale) {
  if (Array.isArray(rationale)) {
    const factors = rationale.filter((item) => item?.factor && item?.explanation);
    return factors.length > 0 ? { type: 'factors', value: factors } : null;
  }

  if (typeof rationale !== 'string' || rationale.trim() === '') return null;

  try {
    const parsed = JSON.parse(rationale);
    if (Array.isArray(parsed)) {
      return normalizeRationale(parsed);
    }
  } catch {
    // Existing persisted tasks store rationale as plain text.
  }

  return { type: 'text', value: rationale.trim() };
}

function formatFactor(factor) {
  return String(factor).replace(/_/g, ' ');
}
