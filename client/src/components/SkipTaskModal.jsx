import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';

const SKIP_REASONS = [
  { value: 'too_hard', icon: '🔥', label: 'Terlalu sulit' },
  { value: 'no_time', icon: '🕐', label: 'Tidak punya waktu' },
  { value: 'not_relevant', icon: '➖', label: 'Tidak relevan' },
  { value: 'low_energy', icon: '🔋', label: 'Kurang energi' },
];

export default function SkipTaskModal({ task, isOpen, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setNote('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm({ action: 'skip', reason, note: note.trim() || undefined });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Lewati Tugas" size="sm">
      <div className="space-y-4">
        {task && (
          <p className="text-sm text-primary-500">{task.title}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-2">
            Alasan melewatkan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SKIP_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  reason === r.value
                    ? 'border-red-400 bg-red-50 text-red-700 ring-1 ring-red-200'
                    : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                <span className="text-base">{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="skip-note" className="block text-sm font-medium text-primary-700 mb-1">
            Alasan tambahan (opsional)
          </label>
          <textarea
            id="skip-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Kenapa tugas ini dilewatkan?"
            className="input min-h-[60px] resize-y"
            rows={2}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary text-sm">
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Konfirmasi Skip
          </button>
        </div>
      </div>
    </Modal>
  );
}
