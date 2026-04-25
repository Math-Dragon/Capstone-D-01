import { useState, useEffect, useCallback } from 'react';
import { useAI } from '../context/AIContext';

const POLL_INTERVAL = 1000;
const MAX_ATTEMPTS = 30;

const STATUS_MESSAGES = {
  idle: '',
  polling: 'Menghubungi AI...',
  loading: 'Menghasilkan saran...',
  ready: 'Saran siap',
  error: 'Terjadi kesalahan',
};

function StreamingIndicator({ message }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-muted text-sm">{message}</span>
    </div>
  );
}

export default function AISuggestionPanel({ goalId, _goalTitle, deadline, onTasksAccepted, onError }) {
  const {
    status,
    recommendation,
    selectedTasks,
    error,
    suggest,
    accept,
    reject,
    toggleTask,
    selectAll,
    clearSelections,
    reset,
    cancel,
  } = useAI();

  const [pollAttempt, setPollAttempt] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const handleSuggest = async () => {
    try {
      await suggest(goalId);
      if (recommendation?.id) {
        startPolling(recommendation.id);
      }
    } catch (err) {
      onError?.(err);
    }
  };

  const startPolling = useCallback(async (recId) => {
    setIsPolling(true);
    setPollAttempt(0);
  }, []);

  useEffect(() => {
    if (!isPolling || !recommendation?.id) return;

    const interval = setInterval(async () => {
      setPollAttempt((prev) => {
        if (prev >= MAX_ATTEMPTS) {
          setIsPolling(false);
          return prev;
        }
        return prev + 1;
      });
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isPolling, recommendation?.id]);

  const handleAcceptAll = async () => {
    if (!recommendation?.id) return;
    try {
      const tasks = await accept(recommendation.id, []);
      onTasksAccepted?.(tasks);
      reset();
    } catch (err) {
      onError?.(err);
    }
  };

  const handleAcceptSelected = async () => {
    if (!recommendation?.id || selectedTasks.length === 0) return;
    try {
      const tasks = await accept(recommendation.id, selectedTasks);
      onTasksAccepted?.(tasks);
      reset();
    } catch (err) {
      onError?.(err);
    }
  };

  const handleReject = async () => {
    if (!recommendation?.id) return;
    try {
      await reject(recommendation.id);
      reset();
    } catch (err) {
      onError?.(err);
    }
  };

  const handleCancel = () => {
    cancel();
    setIsPolling(false);
    setPollAttempt(0);
  };

  const handleSelectAll = () => {
    if (recommendation?.tasks) {
      selectAll(recommendation.tasks.map((t) => t.id));
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 mb-4">{error.message}</p>
        {error.retryable && (
          <button onClick={handleSuggest} className="btn-primary">
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  if (status === 'polling' || status === 'loading') {
    return (
      <div className="card">
        <StreamingIndicator message={isPolling ? `Menghasilkan... (${pollAttempt}/${MAX_ATTEMPTS})` : STATUS_MESSAGES[status]} />
        <button onClick={handleCancel} className="btn-ghost text-red-500 mt-4">
          Batal
        </button>
      </div>
    );
  }

  if (status === 'ready' && recommendation) {
    const tasks = recommendation.tasks || [];
    const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;

    return (
      <div className="ai-suggestion-panel">
        {recommendation.summary && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800">{recommendation.summary}</p>
          </div>
        )}

        <div className="tasks-list space-y-3 mb-4">
          {tasks.map((task, index) => (
            <div
              key={task.id || index}
              className={`task-card card cursor-pointer transition-all ${
                selectedTasks.includes(task.id)
                  ? 'border-2 border-green-500 bg-green-50'
                  : 'border border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.includes(task.id)}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{task.title}</h4>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {task.duration_estimate} menit
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-muted text-sm mt-1">{task.description}</p>
                  )}
                  <div className="flex gap-4 mt-2 text-sm text-muted">
                    <span>📅 {task.planned_date}</span>
                    <span>🌅 {task.planned_slot}</span>
                  </div>
                  {task.rationale && (
                    <p className="text-sm bg-gray-50 p-2 rounded mt-2 italic">
                      💡 {task.rationale}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button onClick={handleCancel} className="btn-ghost text-red-500">
            Batal
          </button>
          <button onClick={handleReject} className="btn-secondary">
            Tolak Semua
          </button>
          {selectedTasks.length > 0 && selectedTasks.length < tasks.length && (
            <button onClick={handleAcceptSelected} className="btn-secondary">
              Terima Terpilih ({selectedTasks.length})
            </button>
          )}
          <button onClick={handleAcceptAll} className="btn-primary">
            {allSelected ? 'Terima Semua' : `Terima Semua (${tasks.length})`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <button onClick={handleSuggest} className="btn-primary">
        ✨ Sarankan Rencana Belajar
      </button>
    </div>
  );
}