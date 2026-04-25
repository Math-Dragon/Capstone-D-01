import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  suggestPlan,
  acceptRecommendation,
  rejectRecommendation,
  pollRecommendationStatus,
  toggleTaskSelection,
  selectAllTasks,
  clearSelection,
  resetAI,
} from '../../../store/slices/aiSlice';
import aiService from '../services/aiService';

const AIContext = createContext(null);

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 1000;

export function AIProvider({ children }) {
  const dispatch = useDispatch();
  const { status, recommendation, selectedTasks, error } = useSelector((state) => state.ai);
  const pollRef = useRef(null);

  const getProgressStats = useCallback(async () => {
    try {
      return await aiService.getProgressStats();
    } catch {
      return null;
    }
  }, []);

  const suggest = useCallback(async (goalId, extraContext = {}) => {
    const context = { ...extraContext };
    
    try {
      const stats = await getProgressStats();
      if (stats) {
        context.progress_stats = stats;
      }
    } catch {
      // Continue without stats
    }
    
    await dispatch(suggestPlan({ goalId, context })).unwrap();
  }, [dispatch, getProgressStats]);

  const pollForCompletion = useCallback(async (recId) => {
    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      const result = await dispatch(pollRecommendationStatus(recId));
      if (result.payload?.status === 'completed') {
        return result.payload;
      }
      if (result.payload?.status === 'failed') {
        throw new Error('AI generation failed');
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      attempts++;
    }
    throw new Error('AI request timed out');
  }, [dispatch]);

  const accept = useCallback(async (recommendationId, taskIds = []) => {
    await dispatch(acceptRecommendation({ recommendationId, taskIds })).unwrap();
  }, [dispatch]);

  const reject = useCallback(async (recommendationId) => {
    await dispatch(rejectRecommendation(recommendationId)).unwrap();
  }, [dispatch]);

  const toggleTask = useCallback((taskId) => {
    dispatch(toggleTaskSelection(taskId));
  }, [dispatch]);

  const selectAll = useCallback((taskIds) => {
    dispatch(selectAllTasks(taskIds));
  }, [dispatch]);

  const clearSelections = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  const reset = useCallback(() => {
    dispatch(resetAI());
  }, [dispatch]);

  const cancel = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    reset();
  }, [reset]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  return (
    <AIContext.Provider
      value={{
        status,
        recommendation,
        selectedTasks,
        error,
        suggest,
        accept,
        reject,
        toggleTask,
        selectAll,
        clearSelections,
        reset,
        cancel,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}

export default AIContext;