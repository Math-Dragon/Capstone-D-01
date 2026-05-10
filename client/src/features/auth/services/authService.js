import api from '../../../services/api';

export const authService = {
  login: async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    return data;
  },
  
  loginWithGoogle: async () => {
    const { signInWithPopup } = await import('firebase/auth');
    const { auth, googleProvider } = await import('../../../config/firebase');
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const data = await api.post('/auth/google', { idToken });
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