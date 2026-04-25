import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component
 * Redirects to /login if no token is found in localStorage.
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
