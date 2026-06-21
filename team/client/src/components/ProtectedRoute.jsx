import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isInitialized, loading } = useAuth();

  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite" aria-busy="true">
        <div className="h-8 w-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
