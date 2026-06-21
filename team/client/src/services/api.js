import axios from 'axios';
import store from '../store';
import { logout } from '../store/slices/authSlice';
import { API_BASE_URL, isPublicAppPath } from '../utils/constants';

let lastRequestId = localStorage.getItem('lastRequestId') || null;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const REFRESH_EXCLUDED_URLS = new Set(['/auth/login', '/auth/refresh', '/auth/register', '/auth/google']);

function getCurrentPathname() {
  if (typeof window === 'undefined' || !window.location) {
    return '/';
  }
  return window.location.pathname || '/';
}

function shouldAttemptRefresh(originalRequest) {
  if (!originalRequest || originalRequest._retry || REFRESH_EXCLUDED_URLS.has(originalRequest.url)) {
    return false;
  }

  return !isPublicAppPath(getCurrentPathname());
}

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: performance.now() };
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (lastRequestId) {
      config.headers['X-Request-Id'] = lastRequestId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const durationMs = response.config.metadata
      ? Math.round(performance.now() - response.config.metadata.startTime)
      : null;

    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      const result = response.data.data;
      if (result && typeof result === 'object' && response.data.meta && Object.keys(response.data.meta).length > 0) {
        result._meta = response.data.meta;
        if (response.data.meta.request_id) {
          lastRequestId = response.data.meta.request_id;
          localStorage.setItem('lastRequestId', lastRequestId);
        }
      }
      if (result && typeof result === 'object' && durationMs != null) {
        result._clientDurationMs = durationMs;
      }
      return result;
    }
    if (response.data && response.data.meta?.request_id) {
      lastRequestId = response.data.meta.request_id;
      localStorage.setItem('lastRequestId', lastRequestId);
    }
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401 && shouldAttemptRefresh(originalRequest)) {
      if (isRefreshing) {
        try {
          const token = await new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axios(originalRequest).then(res => {
            if (res.data && res.data.success !== undefined && res.data.data !== undefined) {
              return res.data.data;
            }
            return res.data;
          });
        } catch (err) {
          return Promise.reject(err);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const data = res.data;
        const newAccessToken = data.data ? data.data.accessToken : data.accessToken;
        
        localStorage.setItem('token', newAccessToken);
        api.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        
        processQueue(null, newAccessToken);
        
        // Retry original request via axios to avoid duplicate interceptor unwrapping
        // or we use axios and handle unwrapping here.
        const retryRes = await axios(originalRequest);
        isRefreshing = false;
        
        if (retryRes.data && retryRes.data.success !== undefined && retryRes.data.data !== undefined) {
          return retryRes.data.data;
        }
        return retryRes.data;
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('token');
        store.dispatch(logout());
        if (!isPublicAppPath(getCurrentPathname())) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    const data = error.response?.data;
    const message = data?.message || data?.error?.message || data?.error || error.message || 'Something went wrong';
    const apiError = new Error(message);
    apiError.statusCode = error.response?.status;
    apiError.code = data?.error?.code || data?.code;
    
    return Promise.reject(apiError);
  }
);

export async function downloadCalendarExport() {
  return api.get('/calendar/export.ics', {
    responseType: 'blob',
  });
}

api.downloadCalendarExport = downloadCalendarExport;

export default api;
