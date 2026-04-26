import { useState } from 'react';

const SKIP_REASONS = [
  { value: 'too_hard', label: 'Terlalu sulit' },
  { value: 'no_time', label: 'Tidak ada waktu' },
  { value: 'not_relevant', label: 'Tidak relevan' },
  { value: 'low_energy', label: 'Energi rendah' },
  { value: 'other', label: 'Lainnya' },
];

export default function TaskActionModal({ task, mode, onConfirm, onCancel }) {
  const [skipReason, setSkipReason] = useState('');
  const [skipNote, setSkipNote] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [focus, setFocus] = useState(3);
  const [notes, setNotes] = useState('');

  if (!task || !mode) return null;

  const handleConfirm = () => {
    if (mode === 'complete') {
      onConfirm({ action: 'complete' });
    } else if (mode === 'skip') {
      onConfirm({ action: 'skip', reason: skipReason || 'unspecified', note: skipNote });
    } else if (mode === 'feedback') {
      onConfirm({ action: 'feedback', difficulty, focus, notes });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-primary-900 mb-1">
          {mode === 'complete' && 'Selesaikan Tugas'}
          {mode === 'skip' && 'Lewati Tugas'}
          {mode === 'feedback' && 'Feedback Tugas'}
        </h3>
        <p className="text-sm text-primary-500 mb-4">{task.title}</p>

        {mode === 'complete' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            Tandai tugas ini sebagai selesai? Coach akan mencatat progresmu.
          </div>
        )}

        {mode === 'skip' && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Alasan melewatkan
              </label>
              <div className="space-y-1">
                {SKIP_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="skipReason"
                      value={r.value}
                      checked={skipReason === r.value}
                      onChange={(e) => setSkipReason(e.target.value)}
                      className="accent-primary-900"
                    />
                    <span className="text-sm text-primary-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Catatan (opsional)
              </label>
              <textarea
                value={skipNote}
                onChange={(e) => setSkipNote(e.target.value)}
                placeholder="Kenapa tugas ini dilewatkan?"
                className="input min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
        )}

        {mode === 'feedback' && (
          <div className="mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Kesulitan: {difficulty}/5
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full accent-primary-900"
              />
              <div className="flex justify-between text-[10px] text-primary-400">
                <span>Mudah</span>
                <span>Sulit</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Fokus: {focus}/5
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={focus}
                onChange={(e) => setFocus(Number(e.target.value))}
                className="w-full accent-primary-900"
              />
              <div className="flex justify-between text-[10px] text-primary-400">
                <span>Tidak fokus</span>
                <span>Sangat fokus</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Catatan (opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bagaimana perasaanmu setelah tugas ini?"
                className="input min-h-[60px]"
                rows={2}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary text-sm"
          >
            Batal
          </button>
          {mode === 'complete' && (
            <button onClick={handleConfirm} className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors">
              Ya, Selesai
            </button>
          )}
          {mode === 'skip' && (
            <button
              onClick={handleConfirm}
              disabled={!skipReason}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-600 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Lewati
            </button>
          )}
          {mode === 'feedback' && (
            <button onClick={handleConfirm} className="btn-primary text-sm">
              Kirim Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
