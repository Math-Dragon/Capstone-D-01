import api from '../../../services/api';

export const authService = {
  login: async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    return data;
  },
  
  register: async (userData) => {
    const data = await api.post('/auth/register', userData);
    return data;
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
    }
  },
  
  refreshToken: async () => {
    const data = await api.post('/auth/refresh');
    return data;
  },
  
  getProfile: async () => {
    const data = await api.get('/auth/me');
    return data;
  },
};

export default authService;