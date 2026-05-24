const SLOT_META = {
  morning: { icon: '☀️', label: 'PAGI' },
  afternoon: { icon: '⛅', label: 'SIANG' },
  evening: { icon: '🌙', label: 'MALAM' },
};

export default function SlotDivider({ slot, first = false }) {
  const meta = SLOT_META[slot];
  if (!meta) return null;

  return (
    <div
      className={`flex items-center gap-3 ${first ? 'mt-2' : 'mt-5'} mb-3`}
      role="separator"
      aria-label={`Sesi ${meta.label}`}
    >
      <span className="text-sm text-accent-600 font-medium flex items-center gap-1.5 shrink-0">
        {meta.icon} {meta.label}
      </span>
      <hr className="flex-1 border-primary-200" />
    </div>
  );
}
