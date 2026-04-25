import './WeeklySummary.css';

export default function WeeklySummary({ plannedHours, completedHours, rate }) {
  return (
    <div className="weekly-summary">
      <div className="summary-card">
        <span className="summary-icon">⏱️</span>
        <div className="summary-info">
          <span className="summary-label">Waktu Direncanakan</span>
          <span className="summary-value">{plannedHours} Jam</span>
        </div>
      </div>
      
      <div className="summary-card">
        <span className="summary-icon">✅</span>
        <div className="summary-info">
          <span className="summary-label">Waktu Tercapai</span>
          <span className="summary-value">{completedHours} Jam</span>
        </div>
      </div>

      <div className="summary-card highlight">
        <span className="summary-icon">⚡</span>
        <div className="summary-info">
          <span className="summary-label">Tingkat Penyelesaian</span>
          <span className="summary-value">{rate}%</span>
        </div>
      </div>
    </div>
  );
}
