export default function StreakBadge({ streak = 0 }) {
  if (!streak) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold shadow-sm"
      aria-label={`${streak} hari streak`}
    >
      <span className="text-base">🔥</span>
      <span>{streak}</span>
      <span className="text-xs font-normal text-amber-500">hari streak</span>
      <style>{`
        @keyframes pulseAmber {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.25); }
          50% { box-shadow: 0 0 12px 4px rgba(245, 158, 11, 0.15); }
        }
      `}</style>
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ animation: 'pulseAmber 3s infinite' }}
      />
    </div>
  );
}
