import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const suggestPlan = createAsyncThunk(
  'ai/suggestPlan',
  async ({ goalId, context = {} }, { rejectWithValue }) => {
    try {
      const data = await api.post('/ai/plan/suggest', { goalId, context });
      return data;
    } catch (err) {
      return rejectWithValue({
        code: err.code || 'AI_ERROR',
        message: err.message,
        statusCode: err.statusCode,
        retryable: err.statusCode !== 404 && err.statusCode !== 401 && err.statusCode !== 403,
      });
    }
  }
);

export const acceptRecommendation = createAsyncThunk(
  'ai/acceptRecommendation',
  async ({ recommendationId, taskIds = [] }, { rejectWithValue }) => {
    try {
      const data = await api.post(`/ai/recommendations/${recommendationId}/accept`, { taskIds });
      return data;
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

export const rejectRecommendation = createAsyncThunk(
  'ai/rejectRecommendation',
  async (recommendationId, { rejectWithValue }) => {
    try {
      const data = await api.post(`/ai/recommendations/${recommendationId}/reject`);
      return data;
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

export const pollRecommendationStatus = createAsyncThunk(
  'ai/pollRecommendationStatus',
  async (recommendationId, { rejectWithValue }) => {
    try {
      const data = await api.get(`/ai/recommendations/${recommendationId}`);
      return data;
    } catch (err) {
      return rejectWithValue({ message: err.message });
    }
  }
);

const initialState = {
  status: 'idle', // idle | polling | loading | ready | error
  recommendation: null,
  selectedTasks: [],
  error: null,
  abortController: null,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setAbortController: (state, action) => {
      state.abortController = action.payload;
    },
    toggleTaskSelection: (state, action) => {
      const taskId = action.payload;
      if (state.selectedTasks.includes(taskId)) {
        state.selectedTasks = state.selectedTasks.filter((id) => id !== taskId);
      } else {
        state.selectedTasks.push(taskId);
      }
    },
    selectAllTasks: (state, action) => {
      state.selectedTasks = action.payload;
    },
    clearSelection: (state) => {
      state.selectedTasks = [];
    },
    resetAI: (state) => {
      state.status = 'idle';
      state.recommendation = null;
      state.selectedTasks = [];
      state.error = null;
      state.abortController = null;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // suggestPlan
      .addCase(suggestPlan.pending, (state) => {
        state.status = 'polling';
        state.error = null;
      })
      .addCase(suggestPlan.fulfilled, (state, action) => {
        state.status = 'ready';
        state.recommendation = action.payload;
        state.selectedTasks = action.payload.tasks?.map((t) => t.id) || [];
      })
      .addCase(suggestPlan.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || { message: 'AI service failed' };
      })
      // acceptRecommendation
      .addCase(acceptRecommendation.fulfilled, (state) => {
        state.status = 'idle';
        state.recommendation = null;
        state.selectedTasks = [];
      })
      // rejectRecommendation
      .addCase(rejectRecommendation.fulfilled, (state) => {
        state.status = 'idle';
        state.recommendation = null;
        state.selectedTasks = [];
      });
  },
});

export const {
  setAbortController,
  toggleTaskSelection,
  selectAllTasks,
  clearSelection,
  resetAI,
  setStatus,
} = aiSlice.actions;

export default aiSlice.reducer;