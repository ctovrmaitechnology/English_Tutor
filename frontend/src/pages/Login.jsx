import { useState } from 'react';
import { authService } from '../services/auth.service';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.login(username, password);
      if (rememberMe) {
        localStorage.setItem('lingocoach_remember_me', 'true');
      }
      onLoginSuccess(rememberMe);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid username or password.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="15" fill="rgba(37,99,235,0.1)" />
              <path d="M10 12h12M10 16h8M10 20h10" stroke="var(--blue-600)"
                strokeWidth="2" strokeLinecap="round"/>
              <circle cx="23" cy="22" r="4" fill="rgba(37,99,235,0.2)" />
              <path d="M21.5 22h3M23 20.5v3" stroke="var(--blue-600)"
                strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="login-brand-name">VRM BUDDY</span>
          </div>
          <h2>Employee Login</h2>
          <p>Sign in with your corporate credentials to start training</p>
        </div>

        {/* Error */}
        {error && (
          <div className="login-alert" role="alert">
            <span className="login-alert-icon">⚠️</span>
            <span className="login-alert-text">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <div className="login-input-box">
              <span className="login-input-icon">👤</span>
              <input
                type="text"
                id="username"
                placeholder="yourname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <div className="login-field-header">
              <label htmlFor="password">Password</label>
              <a href="#forgot" className="login-link-forgot">Forgot?</a>
            </div>
            <div className="login-input-box">
              <span className="login-input-icon">🔒</span>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="login-options">
            <label className="login-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember this device</span>
            </label>
          </div>

          <button
            type="submit"
            className={`login-button ${isLoading ? 'login-button--loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="login-spin-loader" />
                <span>Logging in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>For credentials or support, contact your BPO Trainer or QA lead.</p>
        </div>
      </div>
    </div>
  );
}