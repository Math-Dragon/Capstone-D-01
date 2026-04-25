import ProgressBar from '../components/ProgressBar';
import TaskItem from '../components/TaskItem';
import WeeklySummary from '../components/WeeklySummary';
import AISuggestionPanel from '../components/AISuggestionPanel';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedTasks, fetchedGoals] = await Promise.all([
          api.get('/tasks').catch(() => []),
          api.get('/goals').catch(() => [])
        ]);
        setTasks(fetchedTasks || []);
        setGoals(fetchedGoals || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await api.put(`/tasks/${id}`, { status: newStatus });
      setTasks(tasks.map(t => t.id === id ? updated : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAiAccept = (newTasks) => {
    if (Array.isArray(newTasks)) {
      setTasks([...tasks, ...newTasks]);
    } else {
      // Re-fetch if unexpected format
      api.get('/tasks').then(fetchedTasks => setTasks(fetchedTasks || []));
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Memuat data...</div>;
  }

  const completedCount = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const activeGoal = goals.length > 0 ? goals[0] : null;

  return (
    <div className="dashboard-page">
      <section className="welcome-section" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Selamat Datang Kembali! 👋</h2>
        <p className="text-muted">Ini ringkasan progres belajarmu minggu ini.</p>
      </section>
      
      <WeeklySummary plannedHours={12} completedHours={8} rate={tasks.length > 0 ? Math.round((completedCount/tasks.length)*100) : 0} />

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <section className="tasks-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Tugas Mendatang</h3>
            <button className="text-primary" style={{ fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Lihat Semua</button>
          </div>
          
          {tasks.length === 0 ? (
            activeGoal ? (
              <AISuggestionPanel goalId={activeGoal.id} onAccept={handleAiAccept} />
            ) : (
              <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                <h3>Belum ada target belajar</h3>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Mulai dengan membuat target belajar agar AI bisa memberikan rekomendasi.</p>
                <Link to="/goals" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Buat Target Sekarang</Link>
              </div>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onStatusChange={(status) => handleStatusChange(task.id, status)} 
                />
              ))}
            </div>
          )}
        </section>

        <section className="stats-sidebar">
          <div className="card">
            <h3>Progres Mingguan</h3>
            <div style={{ marginTop: '1.5rem' }}>
              <ProgressBar completed={completedCount} total={tasks.length} label="Total Tugas" />
            </div>
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                {tasks.length > 0 ? (
                  <>Tetap semangat! Kamu tinggal <strong>{tasks.length - completedCount} tugas lagi</strong> untuk mencapai target mingguanmu.</>
                ) : (
                  <>Belum ada tugas minggu ini.</>
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
