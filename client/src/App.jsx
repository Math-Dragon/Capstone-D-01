import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { GoalsProvider } from './features/goals/context/GoalsContext';
import { AIProvider } from './features/ai/context/AIContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './features/goals/components/GoalsPage';
import CalendarPage from './pages/CalendarPage';
import ProgressPage from './pages/ProgressPage';

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AuthProvider>
                  <GoalsProvider>
                    <AIProvider>
                      <MainLayout />
                    </AIProvider>
                  </GoalsProvider>
                </AuthProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="progress" element={<ProgressPage />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}