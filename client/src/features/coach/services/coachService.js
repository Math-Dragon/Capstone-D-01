import api from '../../../services/api';

export const coachService = {
  initialPlan: async (profile) => {
    const data = await api.post('/coach', {
      action: 'INITIAL_PLAN',
      payload: profile || {},
    });
    return data;
  },

  sendMessage: async (message) => {
    const data = await api.post('/coach', {
      action: 'CHAT_MESSAGE',
      payload: { message },
    });
    return data;
  },

  checkIn: async (mood) => {
    const data = await api.post('/coach', {
      action: 'CHECK_IN',
      payload: { mood },
    });
    return data;
  },

  completeTask: async (taskId) => {
    const data = await api.post('/coach', {
      action: 'COMPLETE_TASK',
      payload: { taskId },
    });
    return data;
  },

  skipTask: async (taskId, reason) => {
    const data = await api.post('/coach', {
      action: 'SKIP_TASK',
      payload: { taskId, reason },
    });
    return data;
  },

  submitFeedback: async (taskId, difficulty, focus, notes) => {
    const data = await api.post('/coach', {
      action: 'SUBMIT_FEEDBACK',
      payload: { taskId, difficulty, focus, notes },
    });
    return data;
  },

  requestAdjustment: async (type, message) => {
    const data = await api.post('/coach', {
      action: 'REQUEST_ADJUSTMENT',
      payload: { type, message },
    });
    return data;
  },

  getHistory: async () => {
    const data = await api.get('/coach/history').catch(() => []);
    return data;
  },
};

export default coachService;
