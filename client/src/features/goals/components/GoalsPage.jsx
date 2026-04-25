import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useGoals } from '../context/GoalsContext';
import { goalSchema } from '../schemas';
import GoalCard from './GoalCard';

export default function GoalsPage() {
  const { goals, loading, error, create, refresh } = useGoals();
  const [showForm, setShowForm] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(goalSchema),
  });

  const onSubmit = async (data) => {
    try {
      await create(data.title);
      reset();
      setShowForm(false);
    } catch {
      // Error handled by context
    }
  };

  if (error) {
    return (
      <div className="goals-page">
        <h2>Target Belajar</h2>
        <div className="error-state card">
          <p className="error">{error}</p>
          <button onClick={refresh} className="btn-secondary">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div className="flex justify-between items-center mb-8">
        <h2>Target Belajar</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Tambah Goal
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card mb-8">
          <div className="form-group">
            <label htmlFor="title">Judul Goal</label>
            <input
              id="title"
              placeholder="Contoh: Menguasai React hooks"
              {...register('title')}
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-text">{errors.title.message}</span>}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      )}

      {loading && goals.length === 0 ? (
        <div className="loading-skeleton">Memuat goals...</div>
      ) : goals.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">🎯</div>
          <h3>Belum ada target belajar</h3>
          <p className="text-muted mb-8">Mulai dengan membuat target belajar pertamamu.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Buat Goal Pertama
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}