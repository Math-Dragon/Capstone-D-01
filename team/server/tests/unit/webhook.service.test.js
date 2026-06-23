process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
}));

jest.mock('../../src/repositories', () => ({
  webhookSubscription: {
    updateDeliveryResult: jest.fn(),
    findActiveByEvent: jest.fn(),
  },
}));

const repos = require('../../src/repositories');
const webhookService = require('../../src/services/webhook.service');
const logger = require('../../src/utils/logger');

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

describe('webhook.service', () => {
  test('buildSignature returns a deterministic sha256 signature', () => {
    const signature = webhookService.buildSignature('secret', '{"event":"task.completed"}');

    expect(signature).toBe('sha256=48b5ae165ba4c069e99ce4e600edc6834bc37a3009a71768f1f5ff653cfe85bb');
  });

  test('deliver posts json body, adds signature, and persists success status', async () => {
    repos.webhookSubscription.updateDeliveryResult.mockResolvedValue({ id: 'w1' });
    global.fetch.mockResolvedValue({ status: 202, ok: true });

    const subscription = {
      id: 'w1',
      target_url: 'https://example.com/hook',
      signing_secret: 'super-secret',
    };
    const payload = { userId: 'u1', taskId: 't1' };

    const response = await webhookService.deliver(subscription, 'task.completed', payload);

    expect(response.status).toBe(202);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-StepUp-Signature': expect.stringMatching(/^sha256=/),
        }),
        body: expect.stringContaining('"event":"task.completed"'),
      })
    );
    expect(repos.webhookSubscription.updateDeliveryResult).toHaveBeenCalledWith('w1', {
      last_delivery_status: 202,
      last_delivery_error: null,
    });
  });

  test('deliver persists non-2xx delivery errors', async () => {
    repos.webhookSubscription.updateDeliveryResult.mockResolvedValue({ id: 'w1' });
    global.fetch.mockResolvedValue({ status: 500, ok: false });

    await webhookService.deliver(
      { id: 'w1', target_url: 'https://example.com/hook', signing_secret: null },
      'task.completed',
      { userId: 'u1' }
    );

    expect(repos.webhookSubscription.updateDeliveryResult).toHaveBeenCalledWith('w1', {
      last_delivery_status: 500,
      last_delivery_error: 'HTTP 500',
    });
  });

  test('publish fans out delivery to active subscriptions for the event', async () => {
    repos.webhookSubscription.findActiveByEvent.mockResolvedValue([
      { id: 'w1', target_url: 'https://example.com/one', signing_secret: null },
      { id: 'w2', target_url: 'https://example.com/two', signing_secret: null },
    ]);
    repos.webhookSubscription.updateDeliveryResult.mockResolvedValue({});
    global.fetch.mockResolvedValue({ status: 202, ok: true });

    const responses = await webhookService.publish('task.completed', { userId: 'u1', taskId: 't1' });

    expect(repos.webhookSubscription.findActiveByEvent).toHaveBeenCalledWith('u1', 'task.completed');
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'task.completed',
        event_source: 'webhook.publish',
        user_id: 'u1',
        subscription_count: 2,
      }),
      'Domain event published'
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(responses).toHaveLength(2);
  });
});
