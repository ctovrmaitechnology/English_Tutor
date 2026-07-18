import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar, CompanionEvents } from './components';
import api from './services/api';

import Login from './pages/Login';
import Overview from './pages/Overview';

const Assessment    = lazy(() => import('./pages/Assessment'));
const PlacementTest = lazy(() => import('./pages/PlacementTest'));
const Profile       = lazy(() => import('./pages/Profile'));
const GamesPage     = lazy(() => import('./pages/Games'));
const Modules       = lazy(() => import('./pages/Modules'));

// Lazy load the interactive Companion — preloaded in background post-dashboard render
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
  const queryClient = useQueryClient();
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
      try {
        const placementRes = await api.get('/placement/my-latest-result');
        if (placementRes.data && placementRes.data.attemptId) {
          localStorage.setItem('hasCompletedPlacement', 'true');
          localStorage.setItem('placementResult', JSON.stringify({ ...placementRes.data, userId: response.data.id }));
        } else {
          const localStr = localStorage.getItem('placementResult');
          const localObj = localStr ? JSON.parse(localStr) : null;
          if (!localObj || localObj.userId !== response.data.id) {
            localStorage.removeItem('hasCompletedPlacement');
            localStorage.removeItem('placementResult');
          }
        }
      } catch (e) {
        console.error('Failed to sync placement status:', e);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      if (err?.response?.status === 401) {
        localStorage.removeItem('vrm_remember_me');
        localStorage.removeItem('buddy_token');
        localStorage.removeItem('buddy_user');
        localStorage.removeItem('hasCompletedPlacement');
        localStorage.removeItem('placementResult');
        localStorage.removeItem('assessmentResults');
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchCurrentUser();
    } else {
      setCurrentUser(null);
    }
  }, [isLoggedIn, fetchCurrentUser]);

  // Emit greeting event once user is logged in & start background preloading of likely next pages
  useEffect(() => {
    if (isLoggedIn) {
      const timer = setTimeout(() => {
        CompanionEvents.emit('LOGIN_SUCCESS');
      }, 400);

      // Background preload strategy: once Dashboard is ready, preload next likely pages/chunks in idle time
      if ('requestIdleCallback' in window && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          import('./pages/Modules');
          import('./pages/Profile');
          import('./components/Companion/Companion');
        });
      }

      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  const handleNavigate = useCallback((page) => {
    setActivePage(page);
    setIsAssessmentRunning(page === 'placement' || page === 'assessment');
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
    localStorage.removeItem('buddy_token');
    localStorage.removeItem('buddy_user');
    localStorage.removeItem('hasCompletedPlacement');
    localStorage.removeItem('placementResult');
    localStorage.removeItem('assessmentResults');
    setIsLoggedIn(false);
    setCurrentUser(null);
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
  const localPlacementStr = localStorage.getItem('placementResult');
  const localPlacementObj = localPlacementStr ? JSON.parse(localPlacementStr) : null;
  const hasValidPlacement = localPlacementObj && localPlacementObj.userId === currentUser?.id;
  const hasCompletedPlacement = (localStorage.getItem('hasCompletedPlacement') === 'true' && hasValidPlacement) || hasValidPlacement;

  if (!hasCompletedPlacement && activePage !== 'overview' && activePage !== 'placement' && activePage !== 'profile') {
    return (
      <div className="content-card animate-fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '440px',
        gap: '20px',
        padding: '48px 24px',
        margin: '20px auto',
        maxWidth: '680px'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          boxShadow: '0 8px 16px rgba(37,99,235,0.1)'
        }}>
          🔒
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '0 0 10px' }}>
            Please Complete Your Initial Assessment
          </h2>
          <p style={{ color: '#64748b', fontSize: '15.5px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
            To personalize your learning modules, exercises, and track your communication band accurately, please take the quick initial placement test before accessing <strong style={{ color: '#1e293b', textTransform: 'capitalize' }}>{activePage}</strong>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
          <button
            onClick={() => handleNavigate('placement')}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            Take Assessment Now 🚀
          </button>
          <button
            onClick={() => handleNavigate('overview')}
            style={{
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              padding: '12px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  switch (activePage) {
    case 'overview':   return <Overview user={currentUser} onNavigate={handleNavigate} />;
    case 'placement':  return (
      <PlacementTest 
        onComplete={(res) => {
          localStorage.setItem('hasCompletedPlacement', 'true');
          const fullResult = { ...res, completedAt: res.completedAt || new Date().toISOString(), userId: currentUser?.id };
          localStorage.setItem('placementResult', JSON.stringify(fullResult));
          queryClient.setQueryData(['latestPlacement', currentUser?.id], fullResult);
          queryClient.invalidateQueries({ queryKey: ['latestPlacement'] });
          setIsAssessmentRunning(false);
          handleNavigate('overview');
        }} 
      />
    );
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

      {/* Primary Left Sidebar — hidden during initial placement assessment */}
      {activePage !== 'placement' && (
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}

      {/* Main content area */}
      <main className="main-content" style={activePage === 'placement' ? { marginLeft: 0, padding: 0, background: 'var(--gray-50)' } : {}}>
        <Suspense fallback={<PageSkeleton />}>
          {renderActivePage()}
        </Suspense>
      </main>

      {/* 3D Companion character — animations only, no chat */}
      <Suspense fallback={null}>
        {!isAssessmentRunning && activePage !== 'placement' && <Companion />}
      </Suspense>

      {/* AI Chat Widget — text + voice tutor (bottom right) */}

    </div>
  );
}