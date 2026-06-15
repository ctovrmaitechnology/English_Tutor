import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Sidebar, CompanionEvents } from './components';
import api from './services/api';

// Lazy load page views to minimize the initial JS chunk size
const Login      = lazy(() => import('./pages/Login'));
const Overview   = lazy(() => import('./pages/Overview'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Profile    = lazy(() => import('./pages/Profile'));
const GamesPage  = lazy(() => import('./pages/Games'));
const Modules = lazy(() => import('./pages/Modules'));

// Lazy load the interactive Companion — deferred until after dashboard layout renders
const Companion  = lazy(() => import('./components/Companion/Companion'));

// Lazy load the Chat Widget — AI tutor with text + voice

const GAMES_SIDEBAR_WIDTH = 220; // px — must match GamesSidebar.css width

/**
 * Pulsing Skeleton Loader for page transitions.
 */
function PageSkeleton() {
  return (
    <div className="page-skeleton animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', opacity: 0.7 }}>
      <div style={{ height: '40px', background: 'rgba(37, 99, 235, 0.08)', borderRadius: '10px', width: '40%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
      </div>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ height: '320px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: '2 1 400px' }} />
        <div style={{ height: '320px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: '1 1 200px' }} />
      </div>
    </div>
  );
}

/**
 * App Component — main shell of VRM Buddy AI dashboard.
 */
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('vrm_remember_me') === 'true';
  });

  const [activePage, setActivePage] = useState('overview');
  const [isAssessmentRunning, setIsAssessmentRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCurrentUser();
    } else {
      setCurrentUser(null);
    }
  }, [isLoggedIn, fetchCurrentUser]);

  // Emit greeting event once user is logged in
  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        CompanionEvents.emit('LOGIN_SUCCESS');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  // Navigate to a main page
  const handleNavigate = useCallback((page) => {
    setActivePage(page);
    setIsAssessmentRunning(false);
    if (page === 'challenges') {
      CompanionEvents.emit('CHALLENGE_OPENED');
    } else if (page === 'profile') {
      CompanionEvents.emit('PROFILE_OPENED');
    } else {
      CompanionEvents.emit('RETURNING_USER');
    }
  }, []);

  const handleLoginSuccess = useCallback((rememberMe) => {
    if (rememberMe) localStorage.setItem('vrm_remember_me', 'true');
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('vrm_remember_me');
    setIsLoggedIn(false);
  }, []);

  // ── Login screen ─────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <Suspense fallback={
        <div className="login-loading" style={{
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--gray-50)',
        }}>
          <span className="login-spin-loader" />
        </div>
      }>
        <Login onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

const renderActivePage = () => {
  switch (activePage) {
    case 'overview':   return <Overview user={currentUser} onNavigate={handleNavigate} />;
    case 'assessment': return <Assessment onNavigate={handleNavigate} onAssessmentActiveChange={setIsAssessmentRunning} />;
    case 'modules':    return <Modules onNavigate={handleNavigate} />;
    case 'games':      return <GamesPage onNavigate={handleNavigate} />;
    case 'profile':    return <Profile user={currentUser} onNavigate={handleNavigate} />;
    default:           return <Overview user={currentUser} onNavigate={handleNavigate} />;
  }
};

  

  // ── Main dashboard layout ────────────────────────────────────
  return (
    <div className="app-layout">

      {/* Primary Left Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <main className="main-content">
        <Suspense fallback={<PageSkeleton />}>
          {renderActivePage()}
        </Suspense>
      </main>

      {/* 3D Companion character — animations only, no chat */}
      <Suspense fallback={null}>
        {!isAssessmentRunning && <Companion />}
      </Suspense>

      {/* AI Chat Widget — text + voice tutor (bottom right) */}

    </div>
  );
}