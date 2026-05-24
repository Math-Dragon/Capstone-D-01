import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

import api from '../../../src/services/api';
import observabilityReducer, {
  fetchAuditTrail,
  fetchStudentMetrics,
  fetchObservabilityData,
  setPipelineTrace,
  setRequestId,
  resetObservability,
} from '../../../src/store/slices/observabilitySlice';

describe('observabilitySlice', () => {
  const initialState = {
    auditLogs: [],
    actionCounts: null,
    studentMetrics: null,
    recommendationMetrics: null,
    pipelineTrace: null,
    loading: false,
    error: null,
    requestId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    expect(observabilityReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('reducers', () => {
    it('should handle setPipelineTrace', () => {
      const trace = { step: 1 };
      const actual = observabilityReducer(initialState, setPipelineTrace(trace));
      expect(actual.pipelineTrace).toEqual(trace);
    });

    it('should handle setRequestId', () => {
      const actual = observabilityReducer(initialState, setRequestId('req-123'));
      expect(actual.requestId).toBe('req-123');
    });

    it('should handle resetObservability', () => {
      const state = { ...initialState, auditLogs: ['log1'], loading: true };
      const actual = observabilityReducer(state, resetObservability());
      expect(actual).toEqual(initialState);
    });
  });

  describe('fetchAuditTrail', () => {
    it('should set loading on pending', () => {
      const actual = observabilityReducer(initialState, { type: fetchAuditTrail.pending });
      expect(actual.loading).toBe(true);
      expect(actual.error).toBeNull();
    });

    it('should set auditLogs on fulfilled', () => {
      const payload = { logs: [{ id: 1, action: 'test' }], actionCounts: { total: 1 } };
      const actual = observabilityReducer(
        { ...initialState, loading: true },
        { type: fetchAuditTrail.fulfilled, payload },
      );
      expect(actual.loading).toBe(false);
      expect(actual.auditLogs).toEqual(payload.logs);
      expect(actual.actionCounts).toEqual(payload.actionCounts);
    });

    it('should set requestId from meta on fulfilled', () => {
      const payload = { logs: [], _meta: { request_id: 'meta-req-1' } };
      const actual = observabilityReducer(
        { ...initialState, loading: true },
        { type: fetchAuditTrail.fulfilled, payload },
      );
      expect(actual.requestId).toBe('meta-req-1');
    });

    it('should set error on rejected', () => {
      const actual = observabilityReducer(
        { ...initialState, loading: true },
        { type: fetchAuditTrail.rejected, error: { message: 'Network error' } },
      );
      expect(actual.loading).toBe(false);
      expect(actual.error).toBe('Network error');
    });

    it('should set default error on rejected with no message', () => {
      const actual = observabilityReducer(
        { ...initialState, loading: true },
        { type: fetchAuditTrail.rejected, error: {} },
      );
      expect(actual.error).toBe('Failed to fetch audit trail');
    });
  });

  describe('fetchStudentMetrics', () => {
    it('should set studentMetrics on fulfilled', () => {
      const payload = { student: { streak_days: 5 }, recommendations: { total: 3 } };
      const actual = observabilityReducer(initialState, {
        type: fetchStudentMetrics.fulfilled, payload,
      });
      expect(actual.studentMetrics).toEqual(payload.student);
      expect(actual.recommendationMetrics).toEqual(payload.recommendations);
    });

    it('should set requestId from meta on fulfilled', () => {
      const payload = { student: null, _meta: { request_id: 'metrics-req-1' } };
      const actual = observabilityReducer(initialState, {
        type: fetchStudentMetrics.fulfilled, payload,
      });
      expect(actual.requestId).toBe('metrics-req-1');
    });

    it('should set error on rejected', () => {
      const actual = observabilityReducer(initialState, {
        type: fetchStudentMetrics.rejected,
        error: { message: 'API failed' },
      });
      expect(actual.error).toBe('API failed');
    });
  });
});
