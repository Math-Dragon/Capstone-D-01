import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import StepUpLogo from '../ui/StepUpLogo';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const avatarInitial = useMemo(() => {
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  }, [user]);

  const navLinks = isAuthenticated
    ? [
        { path: '/', label: 'Dashboard' },
        { path: '/goals', label: 'Targetku' },
        { path: '/calendar', label: 'Kalender' },
        { path: '/progress', label: 'Progress' },
        { path: '/coach', label: 'Coach' },
      ]
    : [];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary-100">
      <div className="container">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <Link to="/" className="group">
            <StepUpLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-primary-600 hover:text-primary-900 hover:bg-primary-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm" title={user?.email || 'User'}>
                  {avatarInitial}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2.5 rounded-xl font-medium text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50 transition-all duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2.5 rounded-xl font-medium text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50 transition-all duration-200"
                >
                  Masuk
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-xl font-medium text-sm bg-primary-900 text-white hover:bg-primary-800 transition-all duration-200 hover:shadow-lg"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-primary-100 animate-fade-in">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    isActive(link.path)
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-primary-100">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-4 py-3 rounded-xl font-medium text-sm text-center text-red-600 hover:bg-red-50 transition-all"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-xl font-medium text-sm text-center text-primary-700 hover:bg-primary-50 transition-all"
                    >
                      Masuk
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-xl font-medium text-sm text-center bg-primary-900 text-white"
                    >
                      Daftar
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
