import './ProgressBar.css';

export default function ProgressBar({ completed, total, label }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="progress-container">
      <div className="progress-header">
        {label && <span className="progress-label">{label}</span>}
        <span className="progress-percentage">{percentage}%</span>
      </div>
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="progress-stats">
        {completed} dari {total} tugas selesai
      </div>
    </div>
  );
}
