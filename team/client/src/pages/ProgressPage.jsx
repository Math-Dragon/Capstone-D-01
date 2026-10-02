import { useState, useCallback } from 'react';
import { useProgress } from '../features/progress/hooks/useProgress';
import ProgressTabs from '../features/progress/components/ProgressTabs';
import { PROGRESS_TABS } from '../features/progress/components/progressMeta';
import TrendTab from '../features/progress/components/TrendTab';
import HistoryTab from '../features/progress/components/HistoryTab';
import ProposalTeaser from '../features/progress/components/ProposalTeaser';
import { notifyMutation } from '../utils/invalidation';

const INITIAL_VISITED = { tren: true, riwayat: false };

export default function ProgressPage() {
  const [tab, setTab] = useState('tren');
  const [period, setPeriod] = useState('7d');
  const [visited, setVisited] = useState(INITIAL_VISITED);
  const { overview, loading, error, reload } = useProgress(period);

  const changeTab = useCallback((next) => {
    setTab(next);
    setVisited((current) => (current[next] ? current : { ...current, [next]: true }));
  }, []);

  // Setiap mutasi (koreksi, hapus, terima/tolak proposal) me-refresh overview
  // di halaman ini sekaligus memberi sinyal ke permukaan lain lewat invalidation.
  const handleDataChanged = useCallback(() => {
    reload();
    notifyMutation();
  }, [reload]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-primary-900 sm:text-3xl">
          Perkembangan belajar
        </h2>
      </div>

      <ProposalTeaser
        pending={overview?.pending_proposal}
        timezone={overview?.timezone}
        onResolved={handleDataChanged}
      />

      <ProgressTabs value={tab} onChange={changeTab} />

      {PROGRESS_TABS.map((definition) => {
        const active = tab === definition.key;
        return (
          <div
            key={definition.key}
            role="tabpanel"
            id={definition.panelId}
            aria-labelledby={definition.tabId}
            hidden={!active}
            tabIndex={active ? 0 : -1}
          >
            {visited[definition.key] && definition.key === 'tren' && (
              <TrendTab
                overview={overview}
                loading={loading}
                error={error}
                onRetry={reload}
                period={period}
                onPeriodChange={setPeriod}
              />
            )}
            {visited[definition.key] && definition.key === 'riwayat' && (
              <HistoryTab
                timezone={overview?.timezone}
                onOverviewChange={handleDataChanged}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
