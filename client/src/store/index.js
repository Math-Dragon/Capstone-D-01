import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import goalsReducer from './slices/goalsSlice';
import tasksReducer from './slices/tasksSlice';
import aiReducer from './slices/aiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    goals: goalsReducer,
    tasks: tasksReducer,
    ai: aiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['ai/setAbortController'],
        ignoredPaths: ['ai.abortController'],
      },
    }),
});

export default store;