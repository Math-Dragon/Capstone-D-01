import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import GoalCard from './GoalCard';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/goals');
      setGoals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = { title: data.title };
      if (data.description) payload.description = data.description;
      if (data.deadline) payload.deadline = data.deadline;
      const newGoal = await api.post('/goals', payload);
      setGoals([newGoal, ...goals]);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-primary-900 mb-8">Target Belajar</h2>
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchGoals} className="btn-secondary">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-primary-900">Target Belajar</h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Tambah Goal
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Judul Goal
            </label>
            <input
              placeholder="Contoh: Menguasai React hooks"
              className="input"
              {...register('title', {
                required: 'Judul harus diisi',
                maxLength: { value: 200, message: 'Judul terlalu panjang' },
              })}
            />
            {errors.title && (
              <p className="mt-2 text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Deskripsi
            </label>
            <textarea
              placeholder="Jelaskan target belajarmu secara singkat..."
              className="input min-h-[80px]"
              rows={3}
              {...register('description', {
                maxLength: { value: 1000, message: 'Deskripsi terlalu panjang' },
              })}
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-primary-700 mb-2">
              Deadline
            </label>
            <input
              type="date"
              className="input"
              {...register('deadline')}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary">
              Simpan
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-primary-500">Memuat goals...</div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold text-primary-900 mb-2">Belum ada target belajar</h3>
          <p className="text-primary-500 mb-6">Mulai dengan membuat target belajar pertamamu.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
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