process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/repositories', () => ({
  webhookSubscription: {
    upsertForUser: jest.fn(),
  },
}));

jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@test.com' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const repos = require('../../src/repositories');
const router = require('../../src/routes/webhooks');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', router);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  });
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/webhooks/register', () => {
  test('stores a webhook subscription', async () => {
    repos.webhookSubscription.upsertForUser.mockResolvedValue({
      id: 'w1',
      user_id: 'test-user-id',
      target_url: 'https://example.com/webhooks/stepup',
      events: ['task.completed', 'ai.recommendation.accepted'],
    });

    const res = await request(createApp())
      .post('/api/webhooks/register')
      .send({
        url: 'https://example.com/webhooks/stepup',
        events: ['task.completed', 'ai.recommendation.accepted'],
        secret: 'super-secret-key',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(repos.webhookSubscription.upsertForUser).toHaveBeenCalledWith('test-user-id', {
      url: 'https://example.com/webhooks/stepup',
      events: ['task.completed', 'ai.recommendation.accepted'],
      secret: 'super-secret-key',
    });
  });

  test('rejects non-https URLs', async () => {
    const res = await request(createApp())
      .post('/api/webhooks/register')
      .send({ url: 'http://example.com/hook', events: ['task.completed'] });

    expect(res.statusCode).toBe(400);
    expect(repos.webhookSubscription.upsertForUser).not.toHaveBeenCalled();
  });
});
