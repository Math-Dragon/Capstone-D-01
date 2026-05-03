import { useState, useEffect } from 'react';

const SLOT_LABELS = { morning: 'Pagi', afternoon: 'Siang', evening: 'Malam' };
const TYPE_COLORS = {
  acquire: '#818CF8', practice: '#F0A500', recall: '#EC4899',
  interleave: '#06B6D4', synthesize: '#A78BFA', review: '#34D399',
  assess: '#F87171', reflect: '#94A3B8',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function CollapsibleSection({ label, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-primary-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-primary-600 hover:bg-primary-50 transition-colors"
        aria-expanded={open}
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-3 py-2 text-xs text-primary-600 border-t border-primary-100">{children}</div>}
    </div>
  );
}

export default function TaskDetailModal({ task, isOpen, onClose, onSaveNotes }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setNotes(task.personal_notes || '');
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!task || saving) return;
    setSaving(true);
    try {
      await onSaveNotes(task.id, notes);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="task-detail-title">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto animate-fade-in">
          <div className="flex items-center justify-between p-4 border-b border-primary-100">
            <h2 id="task-detail-title" className="text-lg font-semibold text-primary-900">{task.title}</h2>
            <button onClick={onClose} className="text-primary-400 hover:text-primary-600 p-1" aria-label="Tutup">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {task.description && (
              <p className="text-sm text-primary-500">{task.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {task.duration_estimate && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-600">
                  {task.duration_estimate}m
                </span>
              )}
              {task.planned_date && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-100 text-primary-600">
                  {formatDate(task.planned_date)}
                </span>
              )}
              {task.planned_slot && (
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-accent-100 text-accent-700">
                  {SLOT_LABELS[task.planned_slot] || task.planned_slot}
                </span>
              )}
              {task.task_type && (
                <span
                  className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: (TYPE_COLORS[task.task_type] || '#94A3B8') + '22', color: TYPE_COLORS[task.task_type] || '#94A3B8' }}
                >
                  {task.task_type}
                </span>
              )}
              {task.priority && (
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {task.priority === 'high' ? 'Prioritas Tinggi' : task.priority === 'medium' ? 'Prioritas Sedang' : 'Prioritas Rendah'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {task.rationale && (
                <CollapsibleSection label="Alasan">
                  <p>{task.rationale}</p>
                </CollapsibleSection>
              )}
              {task.completion_criteria && (
                <CollapsibleSection label="Kriteria Penyelesaian">
                  <p>{task.completion_criteria}</p>
                </CollapsibleSection>
              )}
            </div>

            <div>
              <label htmlFor="personal-notes" className="block text-sm font-medium text-primary-700 mb-1.5">
                Catatan Pribadi
              </label>
              <textarea
                id="personal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambahkan catatan pribadi untuk tugas ini..."
                className="input min-h-[80px] resize-y"
                rows={3}
                aria-label="Catatan pribadi untuk tugas"
              />
            </div>

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={onClose} className="btn-secondary !px-4 !py-2 !rounded-xl text-sm">
                Tutup
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary !px-4 !py-2 !rounded-xl text-sm disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
