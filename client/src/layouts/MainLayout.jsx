import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import './MainLayout.css';

export default function MainLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">🚀</div>
          <h2>AI Learning</h2>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/goals" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="icon">🎯</span> Goals
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="icon">📅</span> Kalender
          </NavLink>
          <NavLink to="/progress" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="icon">📈</span> Progress
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="top-header">
          <h1>{/* Page title will be handled in children or via context */}</h1>
          <div className="user-profile">
            <div className="avatar">JD</div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
