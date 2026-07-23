import { useState } from 'react';
import api from '../services/api';

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
  },
  logo: {
    textAlign: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
  },
  brand: {
    fontSize: 22,
    fontWeight: 800,
    color: '#fff',
    display: 'block',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    display: 'block',
    marginTop: 4,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(99,102,241,0.25)',
    border: '1px solid rgba(99,102,241,0.5)',
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 800,
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    display: 'block',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.07)',
    color: '#fff',
    fontSize: 14,
    marginBottom: 20,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  btn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
    transition: 'opacity 0.2s',
    marginTop: 4,
  },
  error: {
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
};

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/admin/login', { username: username.trim(), password });
      const { access_token, user } = res.data;
      // Store admin token
      localStorage.setItem('vrm_admin_token', access_token);
      localStorage.setItem('vrm_admin_user', JSON.stringify(user));
      localStorage.setItem('buddy_token', access_token);
      localStorage.setItem('buddy_user', JSON.stringify(user));
      onLoginSuccess(access_token, user);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoIcon}>🛡️</div>
          <span style={S.brand}>VRM BUDDY</span>
          <span style={S.tagline}>AI Communication Platform</span>
          <span style={S.badge}>Admin Portal</span>
        </div>

        <h1 style={S.title}>Welcome Back</h1>
        <p style={S.subtitle}>Sign in to access the admin dashboard</p>

        {error && <div style={S.error}>⚠️ {error}</div>}

        <form onSubmit={handleLogin}>
          <label style={S.label}>Username</label>
          <input
            style={S.input}
            type="text"
            placeholder="Enter admin username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />

          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
          />

          <button
            type="submit"
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : '🔐 Sign In to Admin'}
          </button>
        </form>

        <div style={S.footer}>
          VRM AI Technology Pvt. Ltd. · Admin access only
        </div>
      </div>
    </div>
  );
}