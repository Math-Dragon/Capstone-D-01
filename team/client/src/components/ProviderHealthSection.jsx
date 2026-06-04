import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { ADMIN_PIE_COLORS } from '../utils/constants';

function SortIcon({ dir }) {
  if (!dir) return <span className="text-primary-200 ml-1">&#8597;</span>;
  return <span className="text-primary-600 ml-1">{dir === 'asc' ? '\u2191' : '\u2195'}</span>;
}

export default function ProviderHealthSection({ byProvider }) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null);

  const sorted = useMemo(() => {
    if (!byProvider) return [];
    const items = [...byProvider];
    if (sortCol && sortDir) {
      items.sort((a, b) => {
        let aVal = a[sortCol];
        let bVal = b[sortCol];
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'desc' ? -cmp : cmp;
      });
    }
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((p) => p.provider.toLowerCase().includes(q) || p.model.toLowerCase().includes(q));
  }, [byProvider, sortCol, sortDir, search]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-900">Provider Health</h3>
            <p className="text-sm text-primary-400 mt-0.5">Penggunaan per provider LLM.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari provider/model..."
            className="text-sm px-3 py-1.5 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 w-48"
            aria-label="Cari provider atau model"
          />
        </div>
        {sorted.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm" role="grid" aria-label="Tabel provider">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                  {['provider', 'model', 'calls', 'tokens', 'estimatedCostUsd'].map((col) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); } }}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`text-left px-4 py-3 font-semibold cursor-pointer hover:bg-primary-100/50 select-none ${col === 'calls' || col === 'tokens' || col === 'estimatedCostUsd' ? 'text-right' : 'text-left'}`}
                    >
                      {col === 'estimatedCostUsd' ? 'Est. Cost' : col.charAt(0).toUpperCase() + col.slice(1)}
                      {sortCol === col && <SortIcon dir={sortDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {sorted.map((p, i) => (
                  <tr key={i} className="hover:bg-primary-50/50 transition-colors" tabIndex={0}>
                    <td className="px-4 py-3 font-medium text-primary-900">{p.provider}</td>
                    <td className="px-4 py-3 text-primary-500 font-mono text-xs">{p.model}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.calls}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.tokens?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">${p.estimatedCostUsd?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">Belum ada data provider.</p>
        )}
      </div>
      {sorted.length > 0 && (
        <div className="shrink-0 flex flex-col items-center justify-center">
          <h4 className="text-sm font-semibold text-primary-500 mb-2">Provider Distribution</h4>
          <ResponsiveContainer width={220} height={220}>
            <PieChart>
              <Pie data={sorted} dataKey="calls" nameKey="provider" cx="50%" cy="50%" outerRadius={80} label={({ provider, percent }) => `${provider} ${(percent * 100).toFixed(0)}%`}>
                {sorted.map((_, i) => (
                  <Cell key={i} fill={ADMIN_PIE_COLORS[i % ADMIN_PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
