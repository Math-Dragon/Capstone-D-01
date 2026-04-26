import { Link } from 'react-router-dom';

export default function GoalCard({ goal }) {
  return (
    <div className="card p-5 hover:-translate-y-1 transition-all duration-300">
      <Link to={`/goals/${goal.id}`}>
        <h3 className="font-semibold text-primary-900 mb-2 hover:text-primary-600 transition-colors">
          {goal.title}
        </h3>
      </Link>
      {goal.description && (
        <p className="text-sm text-primary-500 mb-3 line-clamp-2">{goal.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-primary-400">
        {goal.deadline && (
          <span>📅 {new Date(goal.deadline).toLocaleDateString('id-ID')}</span>
        )}
      </div>
    </div>
  );
}