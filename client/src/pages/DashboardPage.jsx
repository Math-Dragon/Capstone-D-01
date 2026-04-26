import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedTasks, fetchedGoals] = await Promise.all([
          api.get('/tasks').catch(() => []),
          api.get('/goals').catch(() => []),
        ]);
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
        setGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-primary-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activeGoal = goals[0] || null;

  return (
    <div>
      {/* Welcome */}
      <section className="mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          Selamat Datang Kembali! 👋
        </h2>
        <p className="text-primary-400">Ini ringkasan progres belajarmu minggu ini.</p>
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Target Aktif', value: goals.length, icon: '🎯' },
          { label: 'Total Tugas', value: totalCount, icon: '📝' },
          { label: 'Selesai', value: completedCount, icon: '✅' },
          { label: 'Progres', value: `${progressPercent}%`, icon: '📈' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary-400">{stat.label}</span>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <div className="text-2xl font-bold text-primary-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="card p-6 mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-primary-900">Progres Keseluruhan</h3>
            <span className="text-sm text-primary-400">{completedCount}/{totalCount} tugas</span>
          </div>
          <div className="w-full bg-primary-100 rounded-full h-3">
            <div
              className="bg-primary-900 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-primary-400 mt-3">
            {completedCount === totalCount && totalCount > 0
              ? 'Luar biasa! Semua tugas selesai! 🎉'
              : `Tinggal ${totalCount - completedCount} tugas lagi untuk mencapai targetmu.`}
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary-900">Tugas Mendatang</h3>
            {tasks.length > 0 && (
              <Link to="/calendar" className="text-sm font-medium text-primary-400 hover:text-primary-900">
                Lihat Semua
              </Link>
            )}
          </div>

          {tasks.length === 0 ? (
            activeGoal ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-4">✨</div>
                <h4 className="text-lg font-semibold text-primary-900 mb-2">Belum ada tugas</h4>
                <p className="text-primary-400 mb-6">Minta AI untuk menyusun rencana belajar berdasarkan targetmu.</p>
                <Link to="/goals" className="btn-primary">
                  Sarankan Rencana Belajar
                </Link>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h4 className="text-lg font-semibold text-primary-900 mb-2">Belum ada target belajar</h4>
                <p className="text-primary-400 mb-6">Mulai dengan membuat target belajar agar AI bisa memberikan rekomendasi.</p>
                <Link to="/goals" className="btn-primary">
                  Buat Target Sekarang
                </Link>
              </div>
            )
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="card p-4 flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    task.status === 'done' || task.status === 'completed'
                      ? 'bg-green-500'
                      : task.status === 'in_progress'
                      ? 'bg-yellow-400'
                      : 'bg-primary-200'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${
                      task.status === 'done' || task.status === 'completed'
                        ? 'line-through text-primary-400'
                        : 'text-primary-900'
                    }`}>
                      {task.title}
                    </p>
                    {task.planned_date && (
                      <p className="text-xs text-primary-400 mt-0.5">
                        📅 {task.planned_date} · {task.planned_slot || ''}
                      </p>
                    )}
                  </div>
                  {task.duration_estimate && (
                    <span className="text-xs text-primary-400 flex-shrink-0">
                      {task.duration_estimate}m
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Goals */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary-900">Target Belajar</h3>
              <Link to="/goals" className="text-sm font-medium text-primary-400 hover:text-primary-900">
                Kelola
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-sm text-primary-400 mb-3">Belum ada target</p>
                <Link to="/goals" className="btn-secondary text-sm">
                  + Buat Target
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 3).map((goal) => (
                  <Link key={goal.id} to="/goals" className="card p-4 block hover:-translate-y-0.5 transition-all duration-200">
                    <h4 className="font-medium text-primary-900 text-sm">{goal.title}</h4>
                    {goal.deadline && (
                      <p className="text-xs text-primary-400 mt-1">
                        Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="card p-5">
            <h3 className="font-semibold text-primary-900 mb-4">Aksi Cepat</h3>
            <div className="space-y-2">
              <Link to="/goals" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors">
                🎯 Kelola Target
              </Link>
              <Link to="/calendar" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors">
                📅 Lihat Kalender
              </Link>
              <Link to="/progress" className="block px-4 py-2.5 rounded-xl text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors">
                📈 Statistik Progres
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}