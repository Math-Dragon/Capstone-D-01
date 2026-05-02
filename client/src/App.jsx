import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './features/auth/context/AuthContext';
import { CoachProvider } from './features/coach/context/CoachContext';
import Layout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
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

function RootPage() {
  const token = localStorage.getItem('token');
  return token ? <DashboardPage /> : <HomePage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <GoalsProvider>
            <ToastProvider>
              <Suspense fallback={<SkeletonList count={5} />}>
                <CoachProvider>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<RootPage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                      <Route path="goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
                      <Route path="goals/:id" element={<ProtectedRoute><GoalDetailPage /></ProtectedRoute>} />
                      <Route path="calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                      <Route path="progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
                      <Route path="coach" element={<ProtectedRoute><CoachPage /></ProtectedRoute>} />
                    </Route>
                  </Routes>
                </CoachProvider>
              </Suspense>
            </ToastProvider>
          </GoalsProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}