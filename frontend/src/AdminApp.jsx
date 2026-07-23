import { useState, useEffect } from 'react';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

/**
 * AdminApp — completely separate from the user App.
 * Handles its own auth state using vrm_admin_token in localStorage.
 * Rendered only when URL is /admin.
 */
export default function AdminApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser,  setAdminUser]  = useState(null);
  const [checking,   setChecking]   = useState(true);

  useEffect(() => {
    // Check if already logged in from a previous session
    const token = localStorage.getItem('vrm_admin_token');
    const user  = localStorage.getItem('vrm_admin_user');
    if (token && user) {
      try {
        setAdminUser(JSON.parse(user));
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem('vrm_admin_token');
        localStorage.removeItem('vrm_admin_user');
      }
    }
    setChecking(false);
  }, []);

  const handleLoginSuccess = (token, user) => {
    setAdminUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('vrm_admin_token');
    localStorage.removeItem('vrm_admin_user');
    setIsLoggedIn(false);
    setAdminUser(null);
  };

  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0f0c29',
      }}>
        <div style={{ width: 36, height: 36, border: '3px solid #312e81', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <AdminDashboard adminUser={adminUser} onLogout={handleLogout} />;
}