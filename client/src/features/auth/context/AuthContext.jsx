import { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, logout as logoutAction, setLoading, setError } from '../../../store/slices/authSlice';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(setLoading(true));
      authService.getProfile()
        .then((data) => {
          dispatch(setUser(data));
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          dispatch(setLoading(false));
        });
    }
  }, [dispatch, user]);

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