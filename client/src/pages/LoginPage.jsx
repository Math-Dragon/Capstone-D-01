import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AuthPages.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && password) {
      try {
        const response = await api.post('/auth/login', { email, password });
        // After unwrapping by api.js, response is `{ accessToken, user }`
        const token = response?.accessToken;
        if (token) {
          localStorage.setItem('token', token);
          navigate('/');
        } else {
          setError('Login gagal: Token tidak diterima dari server');
        }
      } catch (err) {
        setError(err.message || 'Login gagal');
      }
    } else {
      setError('Email dan password harus diisi');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🚀</div>
          <h1>Selamat Datang</h1>
          <p className="text-muted">Masuk untuk melanjutkan rencana belajarmu</p>
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
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-primary auth-btn">Masuk</button>
        </form>

        <div className="auth-footer">
          <p>Belum punya akun? <Link to="/register">Daftar sekarang</Link></p>
        </div>
      </div>
    </div>
  );
}
