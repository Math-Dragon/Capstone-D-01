import { useNavigate } from 'react-router-dom';
import { useGoals } from '../context/GoalsContext';
import GoalCard from './GoalCard';

export default function GoalsPage() {
  const { goals, loading, error, refresh } = useGoals();
  const navigate = useNavigate();

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-primary-900 mb-8">Target Belajar</h2>
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={refresh} className="btn-secondary">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-primary-900">Target Belajar</h2>
        <button onClick={() => navigate('/coach?create=true')} className="btn-primary">
          + Tambah Goal
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-primary-500">Memuat goals...</div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-primary-900 mb-2">Belum ada target belajar</h3>
          <p className="text-primary-500 mb-6">Mulai dengan membuat target belajar pertamamu.</p>
          <button onClick={() => navigate('/coach?create=true')} className="btn-primary">
            Buat Goal Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
