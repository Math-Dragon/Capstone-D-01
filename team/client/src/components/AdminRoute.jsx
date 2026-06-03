import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isInitialized, loading } = useAuth();

  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
