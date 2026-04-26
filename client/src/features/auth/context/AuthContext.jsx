import { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, logout as logoutAction, setLoading, setError } from '../../../store/slices/authSlice';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized && !user) {
      const initAuth = async () => {
        dispatch(setLoading(true));
        try {
          let token = localStorage.getItem('token');
          if (!token) {
            try {
              const data = await authService.refreshToken();
              token = data.accessToken;
              localStorage.setItem('token', token);
            } catch (err) {
              // Silent failure, no token or refresh cookie
            }
          }
          
          if (token) {
            const profileData = await authService.getProfile();
            dispatch(setUser(profileData));
          }
        } catch (err) {
          localStorage.removeItem('token');
        } finally {
          dispatch(setLoading(false));
          setIsInitialized(true);
        }
      };
      
      initAuth();
    }
  }, [dispatch, user, isInitialized]);

  const login = async (credentials) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const data = await authService.login(credentials);
      localStorage.setItem('token', data.accessToken);
      dispatch(setUser(data.user));
      return data;
    } catch (err) {
      dispatch(setError(err.message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const register = async (userData) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const data = await authService.register(userData);
      localStorage.setItem('token', data.accessToken);
      dispatch(setUser(data.user));
      return data;
    } catch (err) {
      dispatch(setError(err.message));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      dispatch(logoutAction());
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, error, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;