import { useState } from 'react';
import { authService } from '../services/auth.service';
import './Login.css';

export default function Login({ onLoginSuccess }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error,          setError]          = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading,      setIsLoading]      = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMessage('');
    if (!username || !password) { setError('Please fill in all fields.'); return; }
    setIsLoading(true);
    try {
      await authService.login(username, password);
      if (rememberMe) localStorage.setItem('vrm_remember_me', 'true');
      onLoginSuccess(rememberMe);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid username or password.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally { setIsLoading(false); }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMessage('');
    if (!firstName || !lastName || !regUsername || !email || !regPassword) {
      setError('Please fill in all required fields.'); return;
    }
    if (regUsername.length > 10) { setError('Username must be 10 characters or less.'); return; }
    setIsLoading(true);
    try {
      await authService.register({
        first_name: firstName,
        last_name:  lastName,
        username:   regUsername,
        email,
        // New users get 'warrior' as default — they will pick on first login
        character:  'warrior',
        password:   regPassword,
        phone:      phone || undefined,
      });
      setSuccessMessage('Registration successful! Please sign in.');
      setUsername(regUsername);
      setPassword('');
      setFirstName(''); setLastName(''); setRegUsername('');
      setEmail(''); setPhone(''); setRegPassword('');
      setIsRegisterMode(false);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-card">

        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="15" fill="rgba(37,99,235,0.1)" />
              <path d="M10 12h12M10 16h8M10 20h10" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="23" cy="22" r="4" fill="rgba(37,99,235,0.2)" />
              <path d="M21.5 22h3M23 20.5v3" stroke="var(--blue-600)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="login-brand-name">VRM BUDDY</span>
          </div>
          <h2>{isRegisterMode ? 'Employee Registration' : 'Employee Login'}</h2>
          <p>{isRegisterMode ? 'Create your account to start training' : 'Sign in with your corporate credentials'}</p>
        </div>

        {error          && <div className="login-alert"         role="alert"><span className="login-alert-icon">⚠️</span><span className="login-alert-text">{error}</span></div>}
        {successMessage && <div className="login-success-alert" role="alert"><span className="login-alert-icon">✅</span><span className="login-alert-text">{successMessage}</span></div>}

        {isRegisterMode ? (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div className="login-row">
              <div className="login-field">
                <label htmlFor="firstName">First Name</label>
                <div className="login-input-box">
                  <span className="login-input-icon">👤</span>
                  <input type="text" id="firstName" placeholder="Arun" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={isLoading} required />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="lastName">Last Name</label>
                <div className="login-input-box">
                  <span className="login-input-icon">👤</span>
                  <input type="text" id="lastName" placeholder="Kumar" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} disabled={isLoading} required />
                </div>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="regUsername">Username <span className="login-label-hint">(Max 10 chars)</span></label>
              <div className="login-input-box">
                <span className="login-input-icon">🆔</span>
                <input type="text" id="regUsername" placeholder="arunkumar" autoComplete="username" maxLength={10} value={regUsername} onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))} disabled={isLoading} required />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="email">Corporate Email</label>
              <div className="login-input-box">
                <span className="login-input-icon">✉️</span>
                <input type="email" id="email" placeholder="arun@company.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} required />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <div className="login-input-box">
                <span className="login-input-icon">📞</span>
                <input type="tel" id="phone" placeholder="9876543210" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="regPassword">Password</label>
              <div className="login-input-box">
                <span className="login-input-icon">🔒</span>
                <input type="password" id="regPassword" placeholder="••••••••••••" autoComplete="new-password" value={regPassword} onChange={e => setRegPassword(e.target.value)} disabled={isLoading} required />
              </div>
            </div>

            <button type="submit" className={`login-button ${isLoading ? 'login-button--loading' : ''}`} disabled={isLoading}>
              {isLoading ? <><span className="login-spin-loader" /><span>Registering...</span></> : <span>Register & Sign Up</span>}
            </button>

            <div className="login-toggle-mode">
              <span>Already have an account? </span>
              <button type="button" className="login-toggle-link" onClick={() => { setIsRegisterMode(false); setError(''); setSuccessMessage(''); }} disabled={isLoading}>Sign In</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <div className="login-input-box">
                <span className="login-input-icon">👤</span>
                <input type="text" id="username" placeholder="yourname" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading} required />
              </div>
            </div>

            <div className="login-field">
              <div className="login-field-header">
                <label htmlFor="password">Password</label>
                <a href="#forgot" className="login-link-forgot">Forgot?</a>
              </div>
              <div className="login-input-box">
                <span className="login-input-icon">🔒</span>
                <input type="password" id="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} required />
              </div>
            </div>

            <div className="login-options">
              <label className="login-checkbox">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span>Remember this device</span>
              </label>
            </div>

            <button type="submit" className={`login-button ${isLoading ? 'login-button--loading' : ''}`} disabled={isLoading}>
              {isLoading ? <><span className="login-spin-loader" /><span>Logging in...</span></> : <span>Sign In</span>}
            </button>

            <div className="login-toggle-mode">
              <span>New to VRM Buddy? </span>
              <button type="button" className="login-toggle-link" onClick={() => { setIsRegisterMode(true); setError(''); setSuccessMessage(''); }} disabled={isLoading}>Register Account</button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>For credentials or support, contact your BPO Trainer or QA lead.</p>
        </div>
      </div>
    </div>
  );
}