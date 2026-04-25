import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchGoals = createAsyncThunk('goals/fetchGoals', async () => {
  const data = await api.get('/goals');
  return data;
});

export const createGoal = createAsyncThunk('goals/createGoal', async (title) => {
  const data = await api.post('/goals', { title });
  return data;
});

export const updateGoal = createAsyncThunk('goals/updateGoal', async ({ id, ...data }) => {
  const result = await api.patch(`/goals/${id}`, data);
  return result;
});

export const deleteGoal = createAsyncThunk('goals/deleteGoal', async (id) => {
  await api.delete(`/goals/${id}`);
  return id;
});

const goalsSlice = createSlice({
  name: 'goals',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGoalsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGoals.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createGoal.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateGoal.fulfilled, (state, action) => {
        const index = state.items.findIndex((g) => g.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteGoal.fulfilled, (state, action) => {
        state.items = state.items.filter((g) => g.id !== action.payload);
      });
  },
});

export const { clearGoalsError } = goalsSlice.actions;
export default goalsSlice.reducer;