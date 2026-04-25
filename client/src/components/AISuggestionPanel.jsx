import { useState } from 'react';
import api from '../services/api';
import TaskSkeleton from './TaskSkeleton';

export default function AISuggestionPanel({ goalId, onAccept }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      // Backend expects goalId, not goal_id
      const response = await api.post('/ai/plan/suggest', {
        goalId: goalId,
        context: {} // Send empty context or populate as needed
      });
      // Assuming api wrapper returns the data object inside response
      setSuggestions(response.data || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(recommendationId) {
    try {
      // Server expects POST to /api/ai/recommendations/:id/accept
      const tasks = await api.post(`/ai/recommendations/${recommendationId}/accept`);
      onAccept(tasks);
    } catch (err) {
      console.error('Failed to accept recommendation:', err);
      alert('Gagal menerima tugas');
    }
  }

  async function handleReject(recommendationId) {
    try {
      await api.post(`/ai/recommendations/${recommendationId}/reject`);
      // Re-fetch suggestions or remove from list. For now, clear suggestions to re-evaluate.
      setSuggestions(null);
    } catch (err) {
      console.error('Failed to reject recommendation:', err);
    }
  }

  if (error) {
    return (
      <div className="error-state card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fca5a5' }}>
        <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
        <button className="btn-secondary" onClick={fetchSuggestions} style={{ marginTop: '1rem' }}>Coba lagi</button>
      </div>
    );
  }

  if (loading) return <TaskSkeleton count={3} />;

  if (!suggestions) {
    return (
      <div style={{ textAlign: 'center', margin: '2rem 0' }}>
        <button className="btn-primary" onClick={fetchSuggestions}>
          ✨ Sarankan Rencana Belajar
        </button>
      </div>
    );
  }

  // Assuming suggestions returned is a recommendation record object from AI service, 
  // and tasks are in the output or suggestions array.
  // The server aiService.suggestPlan returns the recommendation object directly.
  const tasks = suggestions.output?.tasks || suggestions.tasks || [];
  const summary = suggestions.output?.summary || suggestions.summary || 'Berikut adalah saran rencana belajar Anda.';
  const recommendationId = suggestions.id; // Important for accept/reject

  return (
    <div className="suggestion-panel">
      <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <p className="summary" style={{ margin: 0, color: '#166534' }}>{summary}</p>
      </div>
      
      {tasks.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tasks.map((task, i) => (
            <div key={i} className="suggestion-card card">
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{task.title}</h4>
              <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '1rem' }}>{task.description}</p>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
                <p className="rationale" style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
                  💡 {task.rationale}
                </p>
              </div>
              
              <div className="meta" style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                ⏱️ {task.duration_estimate} menit · 📅 Slot: {task.planned_slot}
              </div>
              
              {/* If tasks are individually accepted, we'd need a different endpoint. 
                  The server accepts the *entire recommendation* based on recommendationId. 
                  So we'll provide one accept/reject button for the whole plan at the bottom. */}
            </div>
          ))}
          
          <div className="actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={() => handleReject(recommendationId)}>
              ❌ Tolak Rencana
            </button>
            <button className="btn-primary" onClick={() => handleAccept(recommendationId)}>
              ✅ Terima Rencana
            </button>
          </div>
        </div>
      ) : (
        <p>Tidak ada tugas yang disarankan.</p>
      )}
    </div>
  );
}
