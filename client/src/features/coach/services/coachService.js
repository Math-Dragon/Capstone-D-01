import api from '../../../services/api';

const APP_VERSION = '1.0.0';

function enrichPayload(payload) {
  const sessionId = typeof window !== 'undefined' ? window.__coachSessionId : null;
  return { ...payload, client_timestamp: Date.now(), app_version: APP_VERSION, session_id: sessionId };
}

export const coachService = {
  dispatchAction: async (action, payload) => {
    const data = await api.post('/coach', { action, payload: enrichPayload(payload) });
    return data;
  },

  initialPlan: async (payload) => {
    const data = await api.post('/coach', {
      action: 'INITIAL_PLAN',
      payload: enrichPayload(payload || {}),
    });
    return data;
  },

  decideTask: async (recId, taskId, decision) => {
    const sessionId = typeof window !== 'undefined' ? window.__coachSessionId : null;
    const data = await api.post(`/coach/recommendations/${recId}/tasks/${taskId}/decide`, { decision, session_id: sessionId });
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

  acceptProposal: async (plan) => {
    const data = await api.post('/coach', {
      action: 'ACCEPT_PROPOSAL',
      payload: { plan },
    });
    return data;
  },
};

export default coachService;
