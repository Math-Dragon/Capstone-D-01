import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import goalsReducer from './slices/goalsSlice';
import observabilityReducer from './slices/observabilitySlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    goals: goalsReducer,
    observability: observabilityReducer,
  },
});

export default store;