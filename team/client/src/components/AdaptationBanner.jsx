import { useNavigate } from 'react-router-dom';
import { useCoach } from '../features/coach/hooks/useCoach';
import coachService from '../features/coach/services/coachService';

export default function AdaptationBanner() {
  const { banner, dismissBanner } = useCoach();
  const navigate = useNavigate();

  if (!banner) return null;

  const isCrisis = banner.type === 'crisis';
  const isMilestone = banner.type === 'milestone';

  const handleUndo = async () => {
    try {
      await coachService.undoPlan();
      dismissBanner();
    } catch {
      // undo failed silently
    }
  };

  const handleViewChanges = () => {
    dismissBanner();
    navigate('/calendar');
  };

  return (
    <div
      role={isCrisis ? 'alert' : 'status'}
      aria-live="polite"
      className={`px-4 py-3 rounded-xl text-sm flex items-start justify-between gap-3 animate-fade-in ${
        isCrisis
          ? 'bg-blue-50 border border-blue-200 text-blue-800'
          : 'bg-green-50 border border-green-200 text-green-800'
      }`}
    >
      <div className="flex-1">
        <p className="font-semibold text-xs uppercase tracking-wide mb-1">
          {isCrisis ? 'Perhatian' : 'Selamat!'}
        </p>
        <p>{banner.message || (isCrisis ? 'Kami perhatikan kamu sedang kesulitan. Rencana telah disesuaikan.' : 'Kamu mencapai milestone! Rencana baru telah dibuat.')}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          onClick={handleViewChanges}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isCrisis
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          Lihat perubahan →
        </button>
        {isMilestone && (
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
          >
            Urungkan
          </button>
        )}
        <button
          onClick={dismissBanner}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isCrisis
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}
