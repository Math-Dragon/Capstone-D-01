import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function KpiCard({ label, value, sub, format }) {
  const formatted = format === 'usd' ? `$${value}` : format === 'pct' ? `${value}%` : value;
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-primary-900 tabular-nums">{formatted}</p>
      {sub && <p className="text-xs text-primary-400 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-primary-900">{title}</h3>
        {description && <p className="text-sm text-primary-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/metrics', { signal });
      setData(res);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Gagal memuat data admin.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-live="polite" aria-busy="true">
        <p className="text-primary-400 font-medium">Memuat data admin...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="alert" aria-live="assertive">
        <p className="text-red-600 font-semibold mb-2">{error}</p>
        <button onClick={() => loadData()} className="btn-primary">Coba Lagi</button>
      </div>
    );
  }

  const { summary, byProvider, byDay, recentActivity } = data || {};
  const acceptRate = summary ? Math.round(summary.acceptRate * 100) : 0;

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          AI Usage Monitoring
        </h2>
        <p className="text-primary-400">Dashboard monitoring penggunaan AI, biaya, dan performa provider.</p>
      </div>

      <Section title="Executive Summary" description="Ringkasan penggunaan AI secara keseluruhan.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total AI Calls" value={summary?.totalCalls ?? 0} />
          <KpiCard label="Total Tokens" value={summary?.totalTokens?.total ?? 0} sub={`${summary?.totalTokens?.prompt ?? 0} prompt / ${summary?.totalTokens?.completion ?? 0} completion`} />
          <KpiCard label="Estimated Cost" value={summary?.estimatedCostUsd ?? 0} format="usd" />
          <KpiCard label="Accept Rate" value={acceptRate} format="pct" />
        </div>
      </Section>

      <Section title="Provider Health" description="Penggunaan per provider LLM.">
        {byProvider && byProvider.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Provider</th>
                  <th className="text-left px-4 py-3 font-semibold">Model</th>
                  <th className="text-right px-4 py-3 font-semibold">Calls</th>
                  <th className="text-right px-4 py-3 font-semibold">Tokens</th>
                  <th className="text-right px-4 py-3 font-semibold">Est. Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {byProvider.map((p, i) => (
                  <tr key={i} className="hover:bg-primary-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary-900">{p.provider}</td>
                    <td className="px-4 py-3 text-primary-500 font-mono text-xs">{p.model}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.calls}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.tokens}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">${p.estimatedCostUsd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">No provider data yet.</p>
        )}
      </Section>

      <Section title="Usage Over Time" description="Aktivitas harian dalam 30 hari terakhir.">
        {byDay && byDay.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-right px-4 py-3 font-semibold">Requests</th>
                  <th className="text-right px-4 py-3 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {byDay.map((d, i) => (
                  <tr key={i} className="hover:bg-primary-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-primary-900">{d.date}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{d.requests}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${d.errors > 0 ? 'text-red-600 font-semibold' : 'text-primary-400'}`}>
                        {d.errors}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">No daily data yet.</p>
        )}
      </Section>

      <Section title="Recent Activity" description="50 aktivitas terakhir dari audit logs.">
        {recentActivity && recentActivity.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                    <th className="text-left px-4 py-3 font-semibold">Action</th>
                    <th className="text-left px-4 py-3 font-semibold">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {recentActivity.map((a, i) => (
                    <tr key={i} className="hover:bg-primary-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-primary-400">
                        {new Date(a.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-primary-700 bg-primary-50 px-2 py-1 rounded">
                          {a.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-primary-500 font-mono">
                        {a.user_id ? `${a.user_id.slice(0, 8)}…` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">No recent activity.</p>
        )}
      </Section>
    </div>
  );
}
