import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import api from '../../../../src/services/api';
import proposalService, {
  getPending,
  getById,
  accept,
  reject,
  newIdempotencyKey,
} from '../../../../src/features/coach/services/proposalService';

const PROPOSAL_ID = '22222222-3333-4444-5555-666666666666';
const PLAN_VERSION = '11111111-1111-4111-8111-111111111111';

describe('proposalService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getPending hits /adaptive/proposals/pending and unwraps null when no proposal', async () => {
    api.get.mockResolvedValue(null);
    const result = await getPending();
    expect(api.get).toHaveBeenCalledWith('/adaptive/proposals/pending', {});
    expect(result).toBeNull();
  });

  it('getPending forwards abort signal', async () => {
    api.get.mockResolvedValue({ id: PROPOSAL_ID });
    const controller = new AbortController();
    await proposalService.getPending({ signal: controller.signal });
    expect(api.get).toHaveBeenCalledWith('/adaptive/proposals/pending', {
      signal: controller.signal,
    });
  });

  it('getById hits the item url', async () => {
    api.get.mockResolvedValue({ id: PROPOSAL_ID, status: 'pending' });
    const result = await getById(PROPOSAL_ID);
    expect(api.get).toHaveBeenCalledWith(`/adaptive/proposals/${PROPOSAL_ID}`, {});
    expect(result).toEqual({ id: PROPOSAL_ID, status: 'pending' });
  });

  it('accept sends base_plan_version and idempotency_key', async () => {
    api.post.mockResolvedValue({ status: 'accepted', task_count: 8, summary: 'ok' });
    const result = await accept(PROPOSAL_ID, {
      basePlanVersion: PLAN_VERSION,
      idempotencyKey: 'idem_fixed_key_1',
    });
    expect(api.post).toHaveBeenCalledWith(`/adaptive/proposals/${PROPOSAL_ID}/accept`, {
      base_plan_version: PLAN_VERSION,
      idempotency_key: 'idem_fixed_key_1',
    });
    expect(result).toEqual({ status: 'accepted', task_count: 8, summary: 'ok' });
  });

  it('accept generates an idempotency_key (min 8 chars) when omitted', async () => {
    api.post.mockResolvedValue({ status: 'accepted' });
    await accept(PROPOSAL_ID, { basePlanVersion: PLAN_VERSION });
    const body = api.post.mock.calls[0][1];
    expect(body.base_plan_version).toBe(PLAN_VERSION);
    expect(body.idempotency_key).toEqual(expect.any(String));
    expect(body.idempotency_key.length).toBeGreaterThanOrEqual(8);
  });

  it('reject sends idempotency_key only', async () => {
    api.post.mockResolvedValue({ status: 'rejected' });
    const result = await reject(PROPOSAL_ID, { idempotencyKey: 'idem_reject_1' });
    expect(api.post).toHaveBeenCalledWith(`/adaptive/proposals/${PROPOSAL_ID}/reject`, {
      idempotency_key: 'idem_reject_1',
    });
    expect(result).toEqual({ status: 'rejected' });
  });

  it('reject generates an idempotency_key when omitted', async () => {
    api.post.mockResolvedValue({ status: 'rejected' });
    await reject(PROPOSAL_ID);
    const body = api.post.mock.calls[0][1];
    expect(Object.keys(body)).toEqual(['idempotency_key']);
    expect(body.idempotency_key.length).toBeGreaterThanOrEqual(8);
  });

  it('newIdempotencyKey returns unique keys with min length 8', () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a).not.toEqual(b);
  });

  it('propagates error code and statusCode untouched', async () => {
    const err = new Error('Proposal kedaluwarsa');
    err.statusCode = 410;
    err.code = 'PROPOSAL_EXPIRED';
    api.post.mockRejectedValue(err);
    await expect(
      accept(PROPOSAL_ID, { basePlanVersion: PLAN_VERSION })
    ).rejects.toMatchObject({ code: 'PROPOSAL_EXPIRED', statusCode: 410 });
  });
});
