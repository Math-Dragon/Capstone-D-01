import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PRIORITY_COLORS = { high: '#3b82f6', medium: '#22c55e', low: '#fbbf24' };

export default function DashboardCharts({ weeklyData, priorityData, totalCount }) {
  return (
    <>
      {/* Weekly Momentum */}
      <div className="bg-white rounded-2xl border border-primary-100/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-primary-900">Weekly Momentum</h3>
          <span className="text-[10px] text-primary-400 font-semibold tracking-widest uppercase">
            Last 7 Days
          </span>
        </div>
        <p className="text-xs text-primary-400 mb-6">Tasks completed per day</p>
        {totalCount === 0 ? (
          <div className="flex items-center justify-center h-[220px] rounded-xl bg-primary-50/50" role="status">
            <div className="text-center">
              <p className="text-sm text-primary-500">No task data yet</p>
              <p className="text-xs text-primary-500 mt-1">Tambahkan task agar grafik mingguan bisa dihitung.</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12, border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
                }}
                formatter={(value) => [`${value} tasks`, 'Completed']}
                cursor={{ fill: '#f1f5f9', radius: 4 }}
              />
              <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Priority Focus */}
      <div className="bg-white rounded-2xl border border-primary-100/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-primary-900">Priority Focus</h3>
          <span className="text-[10px] text-primary-400 font-semibold tracking-widest uppercase">
            Importance Ratio
          </span>
        </div>
        <p className="text-xs text-primary-400 mb-6">Task importance ratio</p>
        {totalCount === 0 ? (
          <div className="flex items-center justify-center h-[220px] rounded-xl bg-primary-50/50" role="status">
            <div className="text-center">
              <p className="text-sm text-primary-500">No task data yet</p>
              <p className="text-xs text-primary-500 mt-1">Isi prioritas task untuk melihat distribusinya.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%" cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {priorityData.map((entry, i) => {
                    let fill = '#94a3b8';
                    if (entry.name === 'High') fill = PRIORITY_COLORS.high;
                    else if (entry.name === 'Medium') fill = PRIORITY_COLORS.medium;
                    else if (entry.name === 'Low') fill = PRIORITY_COLORS.low;
                    return <Cell key={i} fill={fill} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12, border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13,
                  }}
                  formatter={(value, name) => [`${value} tasks`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {priorityData[0]?.name === 'No priority data' ? (
              <p className="text-sm text-primary-400 -mt-2 bg-primary-50/80 px-4 py-1.5 rounded-full">
                No priority data available
              </p>
            ) : (
              <div className="flex gap-6 -mt-2">
                {[
                  { label: 'High', color: PRIORITY_COLORS.high, value: priorityData.find(d => d.name === 'High')?.value || 0 },
                  { label: 'Medium', color: PRIORITY_COLORS.medium, value: priorityData.find(d => d.name === 'Medium')?.value || 0 },
                  { label: 'Low', color: PRIORITY_COLORS.low, value: priorityData.find(d => d.name === 'Low')?.value || 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-primary-500 font-medium">{item.label}</span>
                    <span className="text-xs text-primary-900 font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
