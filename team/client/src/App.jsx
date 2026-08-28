import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useSelector } from 'react-redux';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import { CoachProvider } from './features/coach/context/CoachContext';
import Layout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import CheckInGateway from './components/CheckInGateway';
import { SkeletonList } from './components/ui/Skeleton';
import { GoalsProvider } from './features/goals/context/GoalsContext';
import { ToastProvider } from './components/ui/Toast';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./features/auth/components/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/components/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./features/auth/components/ForgotPasswordPage'));
const VerifyOtpPage = lazy(() => import('./features/auth/components/VerifyOtpPage'));
const ResetPasswordPage = lazy(() => import('./features/auth/components/ResetPasswordPage'));
const SettingsPage = lazy(() => import('./features/auth/components/SettingsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const GoalsPage = lazy(() => import('./features/goals/components/GoalsPage'));
const GoalDetailPage = lazy(() => import('./pages/GoalDetailPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const CoachPage = lazy(() => import('./features/coach/components/CoachPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function RootPage() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <CheckInGateway><DashboardPage /></CheckInGateway> : <HomePage />;
}

function AppContent() {
  const userId = useSelector((state) => state.auth.user?.id);

  const routes = (
    <Suspense fallback={<SkeletonList count={5} />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<RootPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="forgot-password/verify" element={<VerifyOtpPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="goals" element={<ProtectedRoute><CheckInGateway><GoalsPage /></CheckInGateway></ProtectedRoute>} />
          <Route path="goals/:id" element={<ProtectedRoute><CheckInGateway><GoalDetailPage /></CheckInGateway></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute><CheckInGateway><CalendarPage /></CheckInGateway></ProtectedRoute>} />
          <Route path="progress" element={<ProtectedRoute><CheckInGateway><ProgressPage /></CheckInGateway></ProtectedRoute>} />
          <Route path="coach" element={<ProtectedRoute><CheckInGateway><CoachPage /></CheckInGateway></ProtectedRoute>} />
          <Route path="admin" element={<AdminRoute><CheckInGateway><AdminPage /></CheckInGateway></AdminRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );

  return (
    <GoalsProvider key={userId}>
      <ToastProvider key={userId}>
        <CoachProvider key={userId}>
          {routes}
        </CoachProvider>
      </ToastProvider>
    </GoalsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
