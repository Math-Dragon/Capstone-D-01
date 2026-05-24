import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAuditTrail = createAsyncThunk(
  'observability/fetchAuditTrail',
  async (limit = 50) => {
    const data = await api.get('/coach/audit', { params: { limit } });
    return data;
  }
);

export const fetchStudentMetrics = createAsyncThunk(
  'observability/fetchStudentMetrics',
  async () => {
    const data = await api.get('/coach/metrics');
    return data;
  }
);

export const fetchObservabilityData = createAsyncThunk(
  'observability/fetchObservabilityData',
  async (limit = 50, { dispatch }) => {
    const [audit, metrics] = await Promise.all([
      dispatch(fetchAuditTrail(limit)).unwrap(),
      dispatch(fetchStudentMetrics()).unwrap(),
    ]);
    return { audit, metrics };
  }
);

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

const observabilitySlice = createSlice({
  name: 'observability',
  initialState,
  reducers: {
    setPipelineTrace(state, action) {
      state.pipelineTrace = action.payload;
    },
    setRequestId(state, action) {
      state.requestId = action.payload;
    },
    resetObservability() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditTrail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditTrail.fulfilled, (state, action) => {
        state.loading = false;
        state.auditLogs = action.payload?.logs || [];
        state.actionCounts = action.payload?.actionCounts || null;
        if (action.payload?._meta?.request_id) {
          state.requestId = action.payload._meta.request_id;
        }
      })
      .addCase(fetchAuditTrail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch audit trail';
      })
      .addCase(fetchStudentMetrics.fulfilled, (state, action) => {
        state.studentMetrics = action.payload?.student || null;
        state.recommendationMetrics = action.payload?.recommendations || null;
        if (action.payload?._meta?.request_id) {
          state.requestId = action.payload._meta.request_id;
        }
      })
      .addCase(fetchStudentMetrics.rejected, (state, action) => {
        state.error = action.error?.message || 'Failed to fetch metrics';
      });
  },
});

export const { setPipelineTrace, setRequestId, resetObservability } = observabilitySlice.actions;
export default observabilitySlice.reducer;