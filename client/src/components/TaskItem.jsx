import './TaskItem.css';

export default function TaskItem({ task, onStatusChange }) {
  const { title, status, planned_slot, priority } = task;

  return (
    <div className={`task-item ${status}`}>
      <div className="task-info">
        <span className={`priority-dot ${priority}`}></span>
        <div>
          <h4 className="task-title">{title}</h4>
          <span className="task-slot">{planned_slot}</span>
        </div>
      </div>
      <div className="task-actions">
        <button 
          onClick={() => onStatusChange(status === 'done' ? 'pending' : 'done')}
          className={`status-btn ${status}`}
        >
          {status === 'done' ? '✅ Done' : '⭕ Mark Done'}
        </button>
      </div>
    </div>
  );
}
