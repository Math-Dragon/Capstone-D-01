import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPages.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    // Simulating registration for scaffolding
    localStorage.setItem('token', 'mock-token');
    navigate('/');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1>Buat Akun</h1>
          <p className="text-muted">Mulai rencanakan kesuksesan belajarmu hari ini</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-banner">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              placeholder="nama@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Minimal 8 karakter" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Konfirmasi Password</label>
            <input 
              id="confirmPassword"
              type="password" 
              placeholder="Ulangi password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-primary auth-btn">Daftar</button>
        </form>

        <div className="auth-footer">
          <p>Sudah punya akun? <Link to="/login">Masuk di sini</Link></p>
        </div>
      </div>
    </div>
  );
}
