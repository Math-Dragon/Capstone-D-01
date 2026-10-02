import { useCallback, useRef, useState } from 'react';
import ProposalOverlay from '../../coach/components/ProposalOverlay';
import proposalService from '../../coach/services/proposalService';
import { formatDateTime, PRIMARY_ACTION_CLASS, SUBTLE_ACTION_CLASS } from './progressMeta';

const ADAPTATION_LABELS = {
  pacing: 'Penyesuaian tempo',
  workload: 'Penyesuaian beban',
  schedule: 'Penyesuaian jadwal',
  difficulty: 'Penyesuaian kesulitan',
  wellbeing: 'Penyesuaian kesejahteraan',
};

function describeProposalError(error) {
  const statusCode = error?.statusCode;
  const code = error?.code;

  if (code === 'PROPOSAL_STALE' || statusCode === 409) {
    return { kind: 'reload', text: 'Rencanamu sudah berubah. Memuat ulang saran terbaru.' };
  }
  if (code === 'PROPOSAL_EXPIRED' || statusCode === 410) {
    return { kind: 'reload', text: 'Saran ini sudah kedaluwarsa.' };
  }
  if (code === 'PROPOSAL_ALREADY_RESOLVED' || statusCode === 404) {
    return { kind: 'reload', text: 'Saran ini sudah tidak tersedia. Memuat ulang daftar saran.' };
  }
  return { kind: 'error', text: error?.message || 'Gagal memuat saran. Coba lagi.' };
}

/**
 * Kartu saran penyesuaian rencana di Progress. Hanya dirender ketika
 * `overview.pending_proposal` tidak null, dan kegagalan jaringan tidak boleh
 * ditafsirkan sebagai "tidak ada saran".
 *
 * Membuka detail memakai `getById`, menerima mengirim `base_plan_version`
 * + kunci idempotensi yang dibuat sekali per keputusan (dipakai ulang saat
 * retry), menolak mengirim kunci idempotensi (ADR v3-002 §5).
 */
export default function ProposalTeaser({ pending, timezone, onResolved }) {
  const [detail, setDetail] = useState(null);
  const [opening, setOpening] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [overlayError, setOverlayError] = useState(null);
  const [notice, setNotice] = useState(null);
  const keysRef = useRef({ id: null, accept: null, reject: null });

  const ensureKeys = useCallback((id) => {
    if (keysRef.current.id !== id) {
      keysRef.current = { id, accept: null, reject: null };
    }
  }, []);

  const resolveAndReload = useCallback((text, tone = 'status') => {
    setDetail(null);
    setOverlayError(null);
    setNotice(text ? { tone, text } : null);
    onResolved?.();
  }, [onResolved]);

  const openOverlay = useCallback(async () => {
    if (!pending?.id || opening) return;
    setOpening(true);
    setOverlayError(null);
    setNotice(null);
    try {
      const data = await proposalService.getById(pending.id);
      ensureKeys(pending.id);
      setDetail(data || pending);
    } catch (err) {
      const described = describeProposalError(err);
      if (described.kind === 'reload') {
        resolveAndReload(described.text, 'alert');
      } else {
        setOverlayError(described.text);
      }
    } finally {
      setOpening(false);
    }
  }, [pending, opening, ensureKeys, resolveAndReload]);

  const accept = useCallback(async () => {
    const target = detail || pending;
    if (!target?.id || accepting || rejecting) return;
    setAccepting(true);
    setOverlayError(null);
    ensureKeys(target.id);
    if (!keysRef.current.accept) keysRef.current.accept = proposalService.newIdempotencyKey();
    try {
      await proposalService.accept(target.id, {
        basePlanVersion: target.base_plan_version ?? pending?.base_plan_version ?? null,
        idempotencyKey: keysRef.current.accept,
      });
      resolveAndReload('Rencana baru diterima. Ringkasan progres dan tugas dimuat ulang.');
    } catch (err) {
      const described = describeProposalError(err);
      if (described.kind === 'reload') resolveAndReload(described.text, 'alert');
      else setOverlayError(described.text);
    } finally {
      setAccepting(false);
    }
  }, [detail, pending, accepting, rejecting, ensureKeys, resolveAndReload]);

  const reject = useCallback(async () => {
    const target = detail || pending;
    if (!target?.id || accepting || rejecting) return;
    setRejecting(true);
    setOverlayError(null);
    ensureKeys(target.id);
    if (!keysRef.current.reject) keysRef.current.reject = proposalService.newIdempotencyKey();
    try {
      await proposalService.reject(target.id, { idempotencyKey: keysRef.current.reject });
      resolveAndReload('Proposal ditolak. Rencanamu tetap seperti sebelumnya.');
    } catch (err) {
      const described = describeProposalError(err);
      if (described.kind === 'reload') resolveAndReload(described.text, 'alert');
      else setOverlayError(described.text);
    } finally {
      setRejecting(false);
    }
  }, [detail, pending, accepting, rejecting, ensureKeys, resolveAndReload]);

  const dismiss = useCallback(() => {
    setDetail(null);
    setOverlayError(null);
  }, []);

  if (!pending) return null;

  const typeLabel = ADAPTATION_LABELS[pending.adaptation_type] || pending.adaptation_type || 'Rencana beradaptasi';

  return (
    <>
      <section
        aria-labelledby="proposal-teaser-heading"
        className="mb-6 rounded-2xl border border-warm-200 bg-warm-50 p-4 shadow-soft sm:p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-warm-700">
            {typeLabel}
          </p>
          {pending.expires_at && (
            <p className="text-xs text-primary-500">
              Berlaku sampai {formatDateTime(pending.expires_at, timezone)}
            </p>
          )}
        </div>

        <h2 id="proposal-teaser-heading" className="mt-1 text-base font-semibold text-primary-900 sm:text-lg">
          Ada saran untuk rencana belajarmu
        </h2>
        {pending.summary && (
          <p className="mt-1 text-sm leading-relaxed text-primary-700">{pending.summary}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openOverlay}
            disabled={opening}
            className={PRIMARY_ACTION_CLASS}
          >
            {opening ? 'Memuat…' : 'Lihat saran'}
          </button>
          <p className="text-xs text-primary-500">
            Kamu yang memutuskan. Menutup jendela ini tidak mengubah apa pun.
          </p>
        </div>
      </section>

      {notice && (
        <p
          role={notice.tone === 'alert' ? 'alert' : 'status'}
          className={`mb-6 rounded-xl border p-3 text-sm ${
            notice.tone === 'alert'
              ? 'border-warm-200 bg-warm-100 text-warm-800'
              : 'border-primary-100 bg-primary-50 text-primary-700'
          }`}
        >
          {notice.text}
        </p>
      )}

      {detail && (
        <ProposalOverlay
          proposal={detail}
          onAccept={accept}
          onReject={reject}
          onDismiss={dismiss}
          accepting={accepting}
          rejecting={rejecting}
          error={overlayError}
        />
      )}

      {!detail && overlayError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">{overlayError}</span>
            <button type="button" onClick={openOverlay} className={SUBTLE_ACTION_CLASS}>
              Coba lagi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
