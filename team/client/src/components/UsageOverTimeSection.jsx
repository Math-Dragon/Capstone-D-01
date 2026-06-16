export default function UsageOverTimeSection({ byDay, dateFrom, dateTo }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary-900">Usage Over Time</h3>
          <p className="text-sm text-primary-400 mt-0.5">Aktivitas harian berdasarkan periode.</p>
        </div>
        {(dateFrom || dateTo) && (
          <span className="text-xs text-primary-400">
            {dateFrom && `Dari ${dateFrom}`}{dateFrom && dateTo && ' '}{dateTo && `s.d. ${dateTo}`}
          </span>
        )}
      </div>
      {byDay && byDay.length > 0 ? (
        <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm" role="grid" aria-label="Tabel penggunaan harian">
            <thead>
              <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-right px-4 py-3 font-semibold">Requests</th>
                <th className="text-right px-4 py-3 font-semibold">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {byDay.map((d, i) => (
                <tr key={i} className="hover:bg-primary-50/50 transition-colors" tabIndex={0}>
                  <td className="px-4 py-3 font-medium text-primary-900">{d.date}</td>
                  <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{d.requests?.toLocaleString()}</td>
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
        <p className="text-sm text-primary-400 italic">Belum ada data harian.</p>
      )}
    </div>
  );
}
