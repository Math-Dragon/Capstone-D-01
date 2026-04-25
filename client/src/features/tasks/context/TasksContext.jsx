import { createContext, useContext, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTasks, updateTask, deleteTask, addTasks } from '../../../store/slices/tasksSlice';

const TasksContext = createContext(null);

export function TasksProvider({ goalId, children }) {
  const dispatch = useDispatch();
  const { items: tasks, loading, error } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (goalId) {
      dispatch(fetchTasks(goalId));
    }
  }, [dispatch, goalId]);

  const update = useCallback(async (taskId, updates) => {
    await dispatch(updateTask({ id: taskId, ...updates })).unwrap();
  }, [dispatch]);

  const remove = useCallback(async (taskId) => {
    await dispatch(deleteTask(taskId)).unwrap();
  }, [dispatch]);

  const add = useCallback((newTasks) => {
    dispatch(addTasks(newTasks));
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch({ type: 'tasks/clearTasksError' });
  }, [dispatch]);

  return (
    <TasksContext.Provider value={{ tasks, loading, error, update, remove, add, clearError }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
}

export default TasksContext;