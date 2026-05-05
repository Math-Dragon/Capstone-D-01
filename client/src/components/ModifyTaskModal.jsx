import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';

const SLOT_OPTIONS = [
  { value: 'morning', icon: '☀️', label: 'Pagi' },
  { value: 'afternoon', icon: '⛅', label: 'Siang' },
  { value: 'evening', icon: '🌙', label: 'Malam' },
];

export default function ModifyTaskModal({ task, isOpen, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [slot, setSlot] = useState('morning');
  const [date, setDate] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setDuration(task.duration_estimate || 30);
      setSlot(task.planned_slot || 'morning');
      setDate(task.planned_date ? task.planned_date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setErrors({});
    }
  }, [isOpen, task]);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Judul wajib diisi';
    const d = Number(duration);
    if (!d || d < 10 || d > 90) e.duration = 'Durasi 10–90 menit';
    if (!slot) e.slot = 'Pilih sesi';
    if (!date) e.date = 'Pilih tanggal';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      taskId: task.id,
      title: title.trim(),
      duration_estimate: Number(duration),
      planned_slot: slot,
      planned_date: date,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Modify Tugas" size="sm">
      <div className="space-y-4">
        <div>
          <label htmlFor="modify-title" className="block text-sm font-medium text-primary-700 mb-1">
            Judul
          </label>
          <input
            id="modify-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Judul tugas"
          />
          {errors.title && <p className="error-text">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="modify-duration" className="block text-sm font-medium text-primary-700 mb-1">
            Durasi (menit)
          </label>
          <input
            id="modify-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={10}
            max={90}
            step={5}
            className="input"
          />
          {errors.duration && <p className="error-text">{errors.duration}</p>}
        </div>

        <div>
          <label htmlFor="modify-date" className="block text-sm font-medium text-primary-700 mb-1">
            Tanggal
          </label>
          <input
            id="modify-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
          {errors.date && <p className="error-text">{errors.date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Sesi</label>
          <div className="grid grid-cols-3 gap-2">
            {SLOT_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSlot(s.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  slot === s.value
                    ? 'border-primary-900 bg-primary-100 text-primary-900'
                    : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          {errors.slot && <p className="error-text">{errors.slot}</p>}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} className="btn-secondary text-sm">
            Batal
          </button>
          <button onClick={handleSave} className="btn-primary text-sm">
            Simpan
          </button>
        </div>
      </div>
    </Modal>
  );
}
