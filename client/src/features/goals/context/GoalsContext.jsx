import { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGoals,
  createGoal as createGoalThunk,
  updateGoal as updateGoalThunk,
  deleteGoal as deleteGoalThunk,
  clearGoalsError,
} from '../../../store/slices/goalsSlice';

const GoalsContext = createContext(null);

export function GoalsProvider({ children }) {
  const dispatch = useDispatch();
  const { items: goals, loading, error } = useSelector((state) => state.goals);

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  const create = useCallback(async (title) => {
    await dispatch(createGoalThunk(title)).unwrap();
  }, [dispatch]);

  const update = useCallback(async (id, data) => {
    await dispatch(updateGoalThunk({ id, ...data })).unwrap();
  }, [dispatch]);

  const remove = useCallback(async (id) => {
    await dispatch(deleteGoalThunk(id)).unwrap();
  }, [dispatch]);

  const refresh = useCallback(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearGoalsError());
  }, [dispatch]);

  return (
    <GoalsContext.Provider value={{ goals, loading, error, create, update, remove, refresh, clearError }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoals must be used within GoalsProvider');
  }
  return context;
}

export default GoalsContext;