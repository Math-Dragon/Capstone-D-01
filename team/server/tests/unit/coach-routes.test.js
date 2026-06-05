jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  aiLimiter: jest.fn((req, res, next) => next()),
  generalLimiter: jest.fn((req, res, next) => next()),
}));

const mockCoachRouter = {
  getRecommendationMetrics: jest.fn(),
  decideTask: jest.fn(),
  dispatch: jest.fn(),
};

jest.mock('../../src/services/coach', () => mockCoachRouter);

const mockRepos = {
  chatMessage: { findByUser: jest.fn() },
  audit: { findByUserId: jest.fn(), countByAction: jest.fn() },
  studentMetrics: { findByUserId: jest.fn() },
};

jest.mock('../../src/repositories', () => mockRepos);

const request = require('supertest');
const express = require('express');
const router = require('../../src/routes/coach');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/coach', router);
  app.use((err, req, res, next) => {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  });
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/coach/history', () => {
  test('returns chat messages', async () => {
    const messages = [{ id: 'm1', role: 'user', content: 'hello' }];
    mockRepos.chatMessage.findByUser.mockResolvedValue(messages);

    const res = await request(createApp()).get('/api/coach/history');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(messages);
  });

  test('returns empty array when no messages', async () => {
    mockRepos.chatMessage.findByUser.mockResolvedValue([]);

    const res = await request(createApp()).get('/api/coach/history');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('returns 500 on error', async () => {
    mockRepos.chatMessage.findByUser.mockRejectedValue(new Error('DB error'));

    const res = await request(createApp()).get('/api/coach/history');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/coach/recommendations/metrics', () => {
  test('returns metrics', async () => {
    const metrics = { suggested: 10, accepted: 5, rejected: 2, pending: 3 };
    mockCoachRouter.getRecommendationMetrics.mockResolvedValue(metrics);

    const res = await request(createApp()).get('/api/coach/recommendations/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(metrics);
  });

  test('returns empty metrics when no data', async () => {
    mockCoachRouter.getRecommendationMetrics.mockResolvedValue({ suggested: 0, accepted: 0, rejected: 0, pending: 0 });

    const res = await request(createApp()).get('/api/coach/recommendations/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.suggested).toBe(0);
  });
});

describe('POST /api/coach/recommendations/:recId/tasks/:taskId/decide', () => {
  test('accepts decision', async () => {
    mockCoachRouter.decideTask.mockResolvedValue({ status: 'accepted' });

    const res = await request(createApp())
      .post('/api/coach/recommendations/11111111-1111-1111-1111-111111111111/tasks/task1/decide')
      .send({ decision: 'accepted', session_id: 's1' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('accepted');
  });

  test('rejects decision', async () => {
    mockCoachRouter.decideTask.mockResolvedValue({ status: 'rejected' });

    const res = await request(createApp())
      .post('/api/coach/recommendations/11111111-1111-1111-1111-111111111111/tasks/task1/decide')
      .send({ decision: 'rejected', session_id: 's1' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  test('handles error with status', async () => {
    const err = new Error('Not found');
    err.status = 404;
    mockCoachRouter.decideTask.mockRejectedValue(err);

    const res = await request(createApp())
      .post('/api/coach/recommendations/11111111-1111-1111-1111-111111111111/tasks/task1/decide')
      .send({ decision: 'accepted', session_id: 's1' });
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('handles error without status', async () => {
    mockCoachRouter.decideTask.mockRejectedValue(new Error('Unexpected'));

    const res = await request(createApp())
      .post('/api/coach/recommendations/11111111-1111-1111-1111-111111111111/tasks/task1/decide')
      .send({ decision: 'accepted', session_id: 's1' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/coach/audit', () => {
  test('returns logs and action counts', async () => {
    const logs = [{ id: 'l1', action: 'AI_CALL' }];
    const actionCounts = { AI_CALL: 5 };
    mockRepos.audit.findByUserId.mockResolvedValue(logs);
    mockRepos.audit.countByAction.mockResolvedValue(actionCounts);

    const res = await request(createApp()).get('/api/coach/audit');
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toEqual(logs);
    expect(res.body.data.actionCounts).toEqual(actionCounts);
  });

  test('filters by action', async () => {
    mockRepos.audit.findByUserId.mockResolvedValue([]);
    mockRepos.audit.countByAction.mockResolvedValue({});

    await request(createApp()).get('/api/coach/audit?action=AI_CALL');
    expect(mockRepos.audit.findByUserId).toHaveBeenCalledWith('test-user-id', { limit: undefined, offset: undefined, action: 'AI_CALL' });
  });
});

describe('GET /api/coach/metrics', () => {
  test('returns student and recommendation metrics', async () => {
    const studentMetrics = { streak_days: 5, total_completed: 10 };
    const recMetrics = { suggested: 10 };
    mockRepos.studentMetrics.findByUserId.mockResolvedValue(studentMetrics);
    mockCoachRouter.getRecommendationMetrics.mockResolvedValue(recMetrics);

    const res = await request(createApp()).get('/api/coach/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.student).toEqual(studentMetrics);
    expect(res.body.data.recommendations).toEqual(recMetrics);
  });

  test('returns null fallback when studentMetrics is null', async () => {
    mockRepos.studentMetrics.findByUserId.mockResolvedValue(null);
    mockCoachRouter.getRecommendationMetrics.mockResolvedValue({});

    const res = await request(createApp()).get('/api/coach/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.student.streak_days).toBe(0);
    expect(res.body.data.student.completion_rate_7d).toBe(0);
  });
});

describe('POST /api/coach/undo', () => {
  test('undo plan successfully', async () => {
    mockCoachRouter.dispatch.mockResolvedValue({ type: 'undo', data: {}, meta: {} });

    const res = await request(createApp()).post('/api/coach/undo');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('returns 500 on error', async () => {
    mockCoachRouter.dispatch.mockRejectedValue(new Error('Undo failed'));

    const res = await request(createApp()).post('/api/coach/undo');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/coach/', () => {
  test('dispatches action', async () => {
    mockCoachRouter.dispatch.mockResolvedValue({ type: 'chat', data: { message: 'Hi' }, meta: {} });

    const res = await request(createApp())
      .post('/api/coach')
      .send({ action: 'CHAT_MESSAGE', payload: { message: 'Hello' } });
    expect(res.status).toBe(200);
    expect(res.body.type).toBe('chat');
    expect(res.body.data.message).toBe('Hi');
  });

  test('returns 500 on error', async () => {
    mockCoachRouter.dispatch.mockRejectedValue(new Error('Dispatch failed'));

    const res = await request(createApp())
      .post('/api/coach')
      .send({ action: 'CHAT_MESSAGE', payload: {} });
    expect(res.status).toBe(500);
  });
});
