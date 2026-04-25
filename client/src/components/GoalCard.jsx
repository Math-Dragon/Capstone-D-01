import './GoalCard.css';

export default function GoalCard({ goal, onClick }) {
  const { title, deadline, taskCount, completedCount } = goal;
  const progress = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;

  return (
    <div className="goal-card" onClick={onClick}>
      <div className="goal-header">
        <h3 className="goal-title">{title}</h3>
        <span className="goal-badge">Aktif</span>
      </div>
      
      <div className="goal-meta">
        <div className="meta-item">
          <span className="icon">📅</span>
          <span>Selesai pada {new Date(deadline).toLocaleDateString()}</span>
        </div>
        <div className="meta-item">
          <span className="icon">📋</span>
          <span>{taskCount} Tugas</span>
        </div>
      </div>

      <div className="goal-progress-mini">
        <div className="mini-track">
          <div className="mini-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="mini-text">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
