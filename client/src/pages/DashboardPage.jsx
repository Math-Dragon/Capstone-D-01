import ProgressBar from '../components/ProgressBar';
import TaskItem from '../components/TaskItem';
import WeeklySummary from '../components/WeeklySummary';
import { useState } from 'react';

export default function DashboardPage() {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Belajar React Router v7', status: 'pending', planned_slot: '09:00 - 11:00', priority: 'high' },
    { id: 2, title: 'Implementasi Desain UI', status: 'done', planned_slot: '13:00 - 15:00', priority: 'medium' },
    { id: 3, title: 'Setup API Service', status: 'pending', planned_slot: '16:00 - 17:00', priority: 'low' },
  ]);

  const handleStatusChange = (id, newStatus) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const completedCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="dashboard-page">
      <section className="welcome-section" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Selamat Datang Kembali! 👋</h2>
        <p className="text-muted">Ini ringkasan progres belajarmu minggu ini.</p>
      </section>
      
      <WeeklySummary plannedHours={12} completedHours={8} rate={67} />

      <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <section className="tasks-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Tugas Mendatang</h3>
            <button className="text-primary" style={{ fontWeight: 600 }}>Lihat Semua</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onStatusChange={(status) => handleStatusChange(task.id, status)} 
              />
            ))}
          </div>
        </section>

        <section className="stats-sidebar">
          <div className="card">
            <h3>Progres Mingguan</h3>
            <div style={{ marginTop: '1.5rem' }}>
              <ProgressBar completed={completedCount} total={tasks.length} label="Total Tugas" />
            </div>
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                Tetap semangat! Kamu tinggal <strong>{tasks.length - completedCount} tugas lagi</strong> untuk mencapai target mingguanmu.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
