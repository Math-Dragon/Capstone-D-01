import { useState, useEffect } from 'react';
import api from '../services/api';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    api.get('/goals').then(setGoals).catch(console.error);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const newGoal = await api.post('/goals', { title });
      setGoals([newGoal, ...goals]);
      setTitle('');
    } catch (err) {
      console.error(err);
      alert('Gagal membuat goal');
    }
  }

  if (!goals.length) {
    return (
      <div className="goals-page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Target Belajar</h2>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
          <h3>Belum ada target belajar</h3>
          <p className="text-muted" style={{marginBottom: '2rem'}}>Mulai dengan membuat target belajar pertamamu.</p>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Contoh: Menguasai React hooks" 
              required 
              style={{ padding: '0.5rem', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button type="submit" className="btn-primary">Buat Goal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="goals-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Target Belajar</h2>
      </div>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Goal baru..." 
            required 
            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" className="btn-primary">Tambah</button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {goals.map(g => (
          <div key={g.id} className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{g.title}</h3>
            {g.deadline && <span className="text-muted">Deadline: {g.deadline}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
