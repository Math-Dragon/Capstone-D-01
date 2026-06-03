import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { AuthProvider } from './features/auth/context/AuthContext';
import { CoachProvider } from './features/coach/context/CoachContext';
import Layout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import CheckInGateway from './components/CheckInGateway';
import { SkeletonList } from './components/ui/Skeleton';
import { GoalsProvider } from './features/goals/context/GoalsContext';
import { ToastProvider } from './components/ui/Toast';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./features/auth/components/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/components/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GoalsPage = lazy(() => import('./features/goals/components/GoalsPage'));
const GoalDetailPage = lazy(() => import('./pages/GoalDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const CoachPage = lazy(() => import('./features/coach/components/CoachPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function RootPage() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <CheckInGateway><DashboardPage /></CheckInGateway> : <HomePage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <GoalsProvider>
            <ToastProvider>
              <CoachProvider>
                <Suspense fallback={<SkeletonList count={5} />}>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<RootPage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                      <Route path="goals" element={<ProtectedRoute><CheckInGateway><GoalsPage /></CheckInGateway></ProtectedRoute>} />
                      <Route path="goals/:id" element={<ProtectedRoute><CheckInGateway><GoalDetailPage /></CheckInGateway></ProtectedRoute>} />
                      <Route path="calendar" element={<ProtectedRoute><CheckInGateway><CalendarPage /></CheckInGateway></ProtectedRoute>} />
                      <Route path="progress" element={<ProtectedRoute><CheckInGateway><ProgressPage /></CheckInGateway></ProtectedRoute>} />
                      <Route path="coach" element={<ProtectedRoute><CheckInGateway><CoachPage /></CheckInGateway></ProtectedRoute>} />
                      <Route path="admin" element={<ProtectedRoute><CheckInGateway><AdminPage /></CheckInGateway></ProtectedRoute>} />
                    </Route>
                  </Routes>
                </Suspense>
              </CoachProvider>
            </ToastProvider>
          </GoalsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}