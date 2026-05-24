import api from '../../../services/api';

export const goalsService = {
  fetchAll: async () => {
    const data = await api.get('/goals');
    return data;
  },
  
  create: async (goalData) => {
    const data = await api.post('/goals', goalData);
    return data;
  },
  
  update: async ({ id, ...data }) => {
    const result = await api.patch(`/goals/${id}`, data);
    return result;
  },
  
  delete: async (id) => {
    await api.delete(`/goals/${id}`);
    return id;
  },
};

export default goalsService;