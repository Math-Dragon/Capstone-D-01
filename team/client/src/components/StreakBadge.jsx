export default function StreakBadge({ streak = 0 }) {
  if (!streak) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold shadow-sm animate-pulse shadow-amber-200/50"
      aria-label={`${streak} hari streak`}
    >
      <span className="text-base">🔥</span>
      <span>{streak}</span>
      <span className="text-xs font-normal text-amber-500">hari streak</span>
    </div>
  );
}
