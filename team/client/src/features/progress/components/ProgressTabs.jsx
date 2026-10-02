import { useRef } from 'react';
import { PROGRESS_TABS } from './progressMeta';

/**
 * Tablist Tren / Riwayat. Mengikuti pola aktivasi otomatis:
 * panah kiri/kanan, Home, dan End langsung memindahkan fokus + seleksi.
 */
export default function ProgressTabs({ value, onChange }) {
  const tabRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % PROGRESS_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + PROGRESS_TABS.length) % PROGRESS_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = PROGRESS_TABS.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    onChange(PROGRESS_TABS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Bagian halaman Progres"
      className="mb-6 flex gap-1 rounded-2xl border border-primary-100 bg-primary-50 p-1"
    >
      {PROGRESS_TABS.map((tab, index) => {
        const selected = value === tab.key;
        return (
          <button
            key={tab.key}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            id={tab.tabId}
            aria-selected={selected}
            aria-controls={tab.panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              sm:flex-none sm:px-7
              ${selected
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:bg-white/60 hover:text-primary-900'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
