import EmptyState from '../../../components/ui/EmptyState';

const MAX_SIGNALS = 3;

/**
 * Catatan perkembangan dari `overview.evidence`.
 * Hanya menampilkan ringkasan yang dikirim server, tidak pernah
 * direkonstruksi dari catatan mentah, data tugas, atau log audit.
 */
export default function EvidenceLog({ evidence }) {
  if (!evidence) return null;

  const available = Boolean(evidence.available);
  const signals = (Array.isArray(evidence.signals) ? evidence.signals : []).slice(0, MAX_SIGNALS);
  const eventCount = evidence.event_count ?? 0;

  return (
    <section aria-labelledby="evidence-heading" className="card p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 id="evidence-heading" className="text-base font-semibold text-primary-900">
          Yang perlu kamu tahu
        </h3>
        <span className="text-xs text-primary-400">
          {eventCount} catatan suasana hati
        </span>
      </div>

      {!available || signals.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="Belum ada yang perlu diperhatikan"
          description="Sejauh ini tidak ada pola yang menonjol. Catatan akan muncul saat datamu sudah cukup."
        />
      ) : (
        <ul className="space-y-2">
          {signals.map((signal, index) => (
            <li
              key={signal.code || index}
              className="rounded-xl border border-primary-100 bg-primary-50/70 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {signal.code && (
                  <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-600">
                    {signal.code}
                  </span>
                )}
                {signal.window && (
                  <span className="text-xs text-primary-400">Jendela {signal.window}</span>
                )}
                {signal.count != null && (
                  <span className="text-xs text-primary-400">{signal.count}×</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-primary-700">{signal.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
