import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiModulePath = '../../../../src/services/api.js';
const constantsModulePath = '../../../../src/utils/constants.js';

function createAxiosMock() {
  let requestHandler;
  let responseSuccessHandler;
  let responseErrorHandler;

  const instance = {
    defaults: { headers: { common: {} } },
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          requestHandler = handler;
          return 0;
        }),
      },
      response: {
        use: vi.fn((successHandler, errorHandler) => {
          responseSuccessHandler = successHandler;
          responseErrorHandler = errorHandler;
          return 0;
        }),
      },
    },
  };

  const axiosMock = vi.fn();
  axiosMock.create = vi.fn(() => instance);
  axiosMock.post = vi.fn();

  return {
    axiosMock,
    instance,
    getHandlers() {
      return {
        requestHandler,
        responseSuccessHandler,
        responseErrorHandler,
      };
    },
  };
}

async function importConstantsModule() {
  return import(constantsModulePath);
}

async function importApiModule() {
  return import(apiModulePath);
}

describe('API production config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('uses configured production base url', async () => {
    vi.stubEnv('VITE_API_URL', 'https://stepup-api.onrender.com/api');

    const mod = await importConstantsModule();

    expect(mod.API_BASE_URL).toBe('https://stepup-api.onrender.com/api');
  });

  it('warns when production api url is missing and falls back to localhost', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const mod = await importConstantsModule();

    expect(mod.API_BASE_URL).toBe('http://localhost:3000/api');
    expect(warnSpy).toHaveBeenCalledWith('VITE_API_URL is not set for production build');
  });

  it('retries once after refresh on 401 for protected requests', async () => {
    vi.stubEnv('VITE_API_URL', 'https://stepup-api.onrender.com/api');
    window.history.pushState({}, '', '/goals');

    const { axiosMock, getHandlers } = createAxiosMock();
    const dispatch = vi.fn();

    vi.doMock('axios', () => ({ default: axiosMock }));
    vi.doMock('../../../../src/store', () => ({
      default: { dispatch },
    }));
    vi.doMock('../../../../src/store/slices/authSlice', () => ({
      logout: vi.fn(() => ({ type: 'auth/logout' })),
    }));

    await importApiModule();
    const { responseErrorHandler } = getHandlers();

    const originalRequest = { url: '/goals', headers: {} };
    axiosMock.post.mockResolvedValue({
      data: { success: true, data: { accessToken: 'fresh-token' } },
    });
    axiosMock.mockResolvedValue({
      data: { success: true, data: { id: 'goal-1' } },
    });

    const result = await responseErrorHandler({
      config: originalRequest,
      response: { status: 401, data: { message: 'Unauthorized' } },
    });

    expect(axiosMock.post).toHaveBeenCalledWith(
      'https://stepup-api.onrender.com/api/auth/refresh',
      {},
      { withCredentials: true }
    );
    expect(localStorage.getItem('token')).toBe('fresh-token');
    expect(originalRequest.headers.Authorization).toBe('Bearer fresh-token');
    expect(axiosMock).toHaveBeenCalledWith(originalRequest);
    expect(result).toEqual({ id: 'goal-1' });
  });

  it('does not attempt refresh on public routes', async () => {
    vi.stubEnv('VITE_API_URL', 'https://stepup-api.onrender.com/api');
    window.history.pushState({}, '', '/login');

    const { axiosMock, getHandlers } = createAxiosMock();

    vi.doMock('axios', () => ({ default: axiosMock }));
    vi.doMock('../../../../src/store', () => ({
      default: { dispatch: vi.fn() },
    }));
    vi.doMock('../../../../src/store/slices/authSlice', () => ({
      logout: vi.fn(() => ({ type: 'auth/logout' })),
    }));

    await importApiModule();
    const { responseErrorHandler } = getHandlers();

    await expect(
      responseErrorHandler({
        config: { url: '/goals', headers: {} },
        response: { status: 401, data: { message: 'Unauthorized' } },
      })
    ).rejects.toMatchObject({
      message: 'Unauthorized',
      statusCode: 401,
    });

    expect(axiosMock.post).not.toHaveBeenCalled();
  });
});
