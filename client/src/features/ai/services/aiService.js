import api from '../../../services/api';

export const aiService = {
  suggestPlan: async ({ goalId, context = {} }) => {
    const data = await api.post('/ai/plan/suggest', { goalId, context });
    return data;
  },
  
  acceptRecommendation: async (recommendationId, taskIds = []) => {
    const data = await api.post(`/ai/recommendations/${recommendationId}/accept`, { taskIds });
    return data;
  },
  
  rejectRecommendation: async (recommendationId) => {
    const data = await api.post(`/ai/recommendations/${recommendationId}/reject`);
    return data;
  },
  
  getRecommendation: async (recommendationId) => {
    const data = await api.get(`/ai/recommendations/${recommendationId}`);
    return data;
  },
  
  getProgressStats: async () => {
    const data = await api.get('/progress/stats');
    return data;
  },
};

export default aiService;