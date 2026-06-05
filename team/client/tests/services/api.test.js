import { describe, it, expect, vi, beforeEach } from 'vitest';

let capturedRequestFulfilled;
let capturedRequestRejected;
let capturedResponseFulfilled;
let capturedResponseRejected;

const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  interceptors: {
    request: {
      use: vi.fn((fulfilled, rejected) => {
        capturedRequestFulfilled = fulfilled;
        capturedRequestRejected = rejected;
      }),
    },
    response: {
      use: vi.fn((fulfilled, rejected) => {
        capturedResponseFulfilled = fulfilled;
        capturedResponseRejected = rejected;
      }),
    },
  },
  post: vi.fn(),
  get: vi.fn(),
};

vi.mock('axios', () => {
  const mockAxios = vi.fn();
  mockAxios.create = vi.fn(() => mockAxiosInstance);
  return { default: mockAxios };
});

vi.mock('../../src/utils/constants', () => ({
  API_BASE_URL: 'http://test/api',
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('api request interceptor', () => {
  it('adds Authorization header when token exists', async () => {
    localStorage.setItem('token', 'test-token');
    await import('../../src/services/api');

    const config = { headers: {}, metadata: {} };
    const result = capturedRequestFulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer test-token');
    expect(result.metadata.startTime).toBeDefined();
  });

  it('does not add Authorization header when no token', async () => {
    await import('../../src/services/api');

    const config = { headers: {}, metadata: {} };
    const result = capturedRequestFulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('rejects on request error', async () => {
    await import('../../src/services/api');

    const error = new Error('Request failed');
    await expect(capturedRequestRejected(error)).rejects.toThrow('Request failed');
  });
});

describe('api response interceptor', () => {
  it('extracts data and adds _clientDurationMs', async () => {
    await import('../../src/services/api');

    const response = {
      data: { success: true, data: { id: '1' }, meta: {} },
      config: { metadata: { startTime: performance.now() - 100 } },
    };

    const result = capturedResponseFulfilled(response);

    expect(result.id).toBe('1');
    expect(result._clientDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns response.data directly when no success/data shape', async () => {
    await import('../../src/services/api');

    const response = {
      data: { message: 'not wrapped' },
      config: {},
    };

    const result = capturedResponseFulfilled(response);
    expect(result).toEqual({ message: 'not wrapped' });
  });

  it('rejects on network error (no response)', async () => {
    await import('../../src/services/api');

    const error = { config: {} };
    await expect(capturedResponseRejected(error)).rejects.toBe(error);
  });

  it('rejects with parsed error message for API errors', async () => {
    await import('../../src/services/api');

    const error = {
      config: {},
      response: {
        status: 400,
        data: { message: 'Bad request', error: { code: 'VALIDATION' } },
      },
    };
    await expect(capturedResponseRejected(error)).rejects.toMatchObject({
      message: 'Bad request',
      statusCode: 400,
      code: 'VALIDATION',
    });
  });

  it('rejects with fallback error message', async () => {
    await import('../../src/services/api');

    const error = {
      config: {},
      response: { status: 500, data: {} },
    };
    await expect(capturedResponseRejected(error)).rejects.toMatchObject({
      message: 'Something went wrong',
      statusCode: 500,
    });
  });
});
