import { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchGoals, createGoal as createGoalThunk, clearGoalsError } from '../../../store/slices/goalsSlice';

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

  const refresh = useCallback(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearGoalsError());
  }, [dispatch]);

  return (
    <GoalsContext.Provider value={{ goals, loading, error, create, refresh, clearError }}>
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