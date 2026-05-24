import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';

const DIFFICULTY_LABELS = [
  { value: 1, label: 'Terlalu Mudah' },
  { value: 2, label: 'Mudah' },
  { value: 3, label: 'Pas' },
  { value: 4, label: 'Sulit' },
  { value: 5, label: 'Terlalu Sulit' },
];

export default function FeedbackModal({ task, isOpen, onConfirm, onCancel }) {
  const [difficulty, setDifficulty] = useState(3);
  const [focus, setFocus] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDifficulty(3);
      setFocus(3);
      setNotes('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm({ action: 'feedback', difficulty, focus, notes: notes.trim() || undefined });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Feedback Tugas" size="sm">
      <div className="space-y-5">
        {task && (
          <p className="text-sm text-primary-500">{task.title}</p>
        )}

        {/* Difficulty buttons */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            Kesulitan
          </label>
          <div className="flex gap-1.5">
            {DIFFICULTY_LABELS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                  difficulty === d.value
                    ? 'border-primary-900 bg-primary-900 text-white'
                    : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus stars */}
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            Fokus
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFocus(star)}
                className={`text-2xl transition-transform hover:scale-110 ${
                  star <= focus ? 'text-amber-400' : 'text-primary-200'
                }`}
                aria-label={`Rating ${star}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-primary-400 mt-1">
            <span>Tidak fokus</span>
            <span>Sangat fokus</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="feedback-notes" className="block text-sm font-medium text-primary-700 mb-1">
            Catatan evaluasi (opsional)
          </label>
          <textarea
            id="feedback-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bagaimana perasaanmu setelah tugas ini?"
            className="input min-h-[60px] resize-y"
            rows={2}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary text-sm">
            Batal
          </button>
          <button onClick={handleConfirm} className="btn-primary text-sm">
            Kirim Feedback
          </button>
        </div>
      </div>
    </Modal>
  );
}
