import api from '../../../services/api';

export const tasksService = {
  fetchByGoal: async (goalId) => {
    const data = await api.get(`/tasks?goalId=${goalId}`);
    return data;
  },
  
  create: async (taskData) => {
    const data = await api.post('/tasks', taskData);
    return data;
  },
  
  update: async ({ id, ...data }) => {
    const result = await api.patch(`/tasks/${id}`, data);
    return result;
  },
  
  delete: async (id) => {
    await api.delete(`/tasks/${id}`);
    return id;
  },
};

export default tasksService;