import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { CoachProvider } from './features/coach/context/CoachContext';
import Layout from './layouts/MainLayout';
import ErrorBoundary from './components/ErrorBoundary';

import HomePage from './pages/HomePage';
import LoginPage from './features/auth/components/LoginPage';
import RegisterPage from './features/auth/components/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './features/goals/components/GoalsPage';
import CalendarPage from './pages/CalendarPage';
import ProgressPage from './pages/ProgressPage';
import CoachPage from './features/coach/components/CoachPage';

function RootPage() {
  const token = localStorage.getItem('token');
  return token ? <DashboardPage /> : <HomePage />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CoachProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<RootPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="goals" element={<GoalsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="coach" element={<CoachPage />} />
              </Route>
            </Routes>
          </CoachProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}