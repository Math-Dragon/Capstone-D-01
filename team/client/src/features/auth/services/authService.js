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
    const data = await api.post('/auth/refresh', {});
    return data;
  },
  
  getProfile: async () => {
    const data = await api.get('/auth/me');
    return data;
  },

  requestPasswordReset: async ({ identifier, channel }) => {
    const data = await api.post('/auth/forgot-password', { identifier, channel });
    return data;
  },

  verifyPasswordResetOtp: async ({ identifier, channel, otp }) => {
    const data = await api.post('/auth/forgot-password/verify-otp', { identifier, channel, otp });
    return data;
  },

  resetPassword: async ({ resetToken, password }) => {
    const data = await api.post('/auth/reset-password', { resetToken, password });
    return data;
  },

  requestPhoneVerification: async ({ phoneNumber }) => {
    const data = await api.post('/auth/phone/request-verify', { phoneNumber });
    return data;
  },

  confirmPhoneVerification: async ({ phoneNumber, otp }) => {
    const data = await api.post('/auth/phone/verify', { phoneNumber, otp });
    return data;
  },
};

export default authService;
