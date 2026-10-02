import api from '../../../services/api';

// Lapisan service untuk endpoint /adaptive/proposals/*.
// Terpisah dari coachService.acceptProposal (legacy, action ACCEPT_PROPOSAL di /coach).

export function newIdempotencyKey() {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  // BE memvalidasi idempotency_key minimal 8 karakter.
  return `idem_${random}`;
}

export const getPending = ({ signal } = {}) =>
  api.get('/adaptive/proposals/pending', signal ? { signal } : {});

export const getById = (id, { signal } = {}) =>
  api.get(`/adaptive/proposals/${id}`, signal ? { signal } : {});

// Bisa melempar PROPOSAL_STALE (409) / PROPOSAL_EXPIRED (410) /
// PROPOSAL_ALREADY_RESOLVED (409) lewat error.code.
export const accept = (id, { basePlanVersion, idempotencyKey } = {}) =>
  api.post(`/adaptive/proposals/${id}/accept`, {
    base_plan_version: basePlanVersion,
    idempotency_key: idempotencyKey || newIdempotencyKey(),
  });

export const reject = (id, { idempotencyKey } = {}) =>
  api.post(`/adaptive/proposals/${id}/reject`, {
    idempotency_key: idempotencyKey || newIdempotencyKey(),
  });

export const proposalService = {
  getPending,
  getById,
  accept,
  reject,
  newIdempotencyKey,
};

export default proposalService;
