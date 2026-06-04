import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 Hari' },
  { value: 30, label: '30 Hari' },
  { value: 90, label: '90 Hari' },
];

export default function RequestTrendChart({ byDay, byDayAccept, period, onPeriodChange }) {
  const chartData = byDay ? [...byDay].reverse() : [];
  const acceptData = byDayAccept ? [...byDayAccept].reverse() : [];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-primary-900">Request & Accept Rate Trend</h3>
        <div className="flex gap-1 bg-primary-50 rounded-lg p-1" role="tablist" aria-label="Periode chart">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange(opt.value)}
              role="tab"
              aria-selected={period === opt.value}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-primary-500 hover:text-primary-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-primary-700 mb-3">Request Trend</h4>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Requests" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-primary-400 text-center py-10">Belum ada data request.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-primary-700 mb-3">Accept Rate Trend</h4>
          {acceptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={acceptData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip formatter={(v) => (v != null ? `${(v * 100).toFixed(1)}%` : '\u2014')} />
                <Line type="monotone" dataKey="recRate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Plan Accept" connectNulls />
                <Line type="monotone" dataKey="taskRate" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Task Accept" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-primary-400 text-center py-10">Belum ada data acceptance rate.</p>
          )}
        </div>
      </div>
    </div>
  );
}
