import api from '../../../services/api';

const APP_VERSION = '1.0.0';
let _sessionId = null;

export function setSessionId(id) {
  _sessionId = id;
}

function enrichPayload(payload) {
  return { ...payload, client_timestamp: Date.now(), app_version: APP_VERSION, session_id: _sessionId };
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

  decideTask: async (recId, taskId, decision, overrides) => {
    const body = { decision, session_id: _sessionId };
    if (overrides) {
      body.overrides = overrides;
    }
    const data = await api.post(`/coach/recommendations/${recId}/tasks/${taskId}/decide`, body);
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

  requestAdjustment: async (type, message, goalId) => {
    const data = await api.post('/coach', {
      action: 'REQUEST_ADJUSTMENT',
      payload: { type, message, ...(goalId ? { goal_id: goalId } : {}) },
    });
    return data;
  },

  undoPlan: async () => {
    const data = await api.post('/coach/undo');
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
