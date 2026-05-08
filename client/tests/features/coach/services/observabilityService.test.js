import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../../../src/services/api';
import { observabilityService } from '../../../../src/features/coach/services/observabilityService';

describe('observabilityService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchAuditTrail calls api.get with default limit', async () => {
    api.get.mockResolvedValue([{ id: '1' }]);
    const result = await observabilityService.fetchAuditTrail();
    expect(api.get).toHaveBeenCalledWith('/coach/audit', { params: { limit: 50 } });
    expect(result).toEqual([{ id: '1' }]);
  });

  it('fetchAuditTrail calls api.get with custom limit', async () => {
    api.get.mockResolvedValue([]);
    await observabilityService.fetchAuditTrail(10);
    expect(api.get).toHaveBeenCalledWith('/coach/audit', { params: { limit: 10 } });
  });

  it('fetchStudentMetrics calls api.get', async () => {
    api.get.mockResolvedValue({ streak_days: 5 });
    const result = await observabilityService.fetchStudentMetrics();
    expect(api.get).toHaveBeenCalledWith('/coach/metrics');
    expect(result).toEqual({ streak_days: 5 });
  });
});
