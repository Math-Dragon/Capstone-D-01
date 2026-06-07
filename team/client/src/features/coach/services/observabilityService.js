import api from '../../../services/api';

export const observabilityService = {
  fetchAuditTrail: async (limit = 50) => {
    const data = await api.get('/coach/audit', { params: { limit } });
    return data;
  },

  fetchStudentMetrics: async () => {
    const data = await api.get('/coach/metrics');
    return data;
  },
};

export default observabilityService;
