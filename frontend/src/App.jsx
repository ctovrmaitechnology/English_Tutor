import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Sidebar, CompanionEvents } from './components';
import { UserProvider, useUser } from './context/UserContext';
import api from './services/api';

// Lazy load page views
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/Overview'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Profile = lazy(() => import('./pages/Profile'));
const GamesPage = lazy(() => import('./pages/Games'));
const Modules = lazy(() => import('./pages/Modules'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MyProgress = lazy(() => import('./pages/MyProgress'));
const WeeklyAssessment = lazy(() => import('./pages/WeeklyAssessment'));
const PracticeSession = lazy(() => import('./pages/PracticeSession'));
const PlacementTest = lazy(() => import('./pages/PlacementTest'));

// First-time screens
const CharacterSelectScreen = lazy(() => import('./pages/CharacterSelectScreen'));

// 3D Companion
const Companion = lazy(() => import('./components/Companion/Companion'));

const GAMES_SIDEBAR_WIDTH = 220;

function PageSkeleton() {
  return (
    <div className="page-skeleton animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', opacity: 0.7 }}>
      <div style={{ height: '40px', background: 'rgba(37,99,235,0.08)', borderRadius: '10px', width: '40%' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '20px' }}>
        {[1, 2, 3, 4].map(i => <div key={i} style={{ height: '100px', background: 'rgba(37,99,235,0.05)', borderRadius: '16px' }} />)}
      </div>
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ height: '320px', background: 'rgba(37,99,235,0.05)', borderRadius: '16px', flex: '2 1 400px' }} />
        <div style={{ height: '320px', background: 'rgba(37,99,235,0.05)', borderRadius: '16px', flex: '1 1 200px' }} />
      </div>
    </div>
  );
}

// ── Locked Overview — shown before entry test is completed ──────────────────
function LockedOverview({ onNavigate }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', padding: '32px', fontFamily: "'Inter',-apple-system,sans-serif",
    }}>
      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎯</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e1b4b', marginBottom: 12 }}>
          Welcome to VRM Buddy!
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
          Before you start your learning journey, please complete the <strong>Placement Test</strong>.
          This helps us understand your current English level and personalise your training.
          Only <strong>Beginner</strong> and <strong>Intermediate</strong> learners will have full access to modules.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
          {['Writing Modules 🔒', 'Speaking Modules 🔒', 'Games 🔒', 'Practice 🔒'].map((item, i) => (
            <div key={i} style={{ padding: '10px 18px', background: '#f1f5f9', borderRadius: 12, fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              {item}
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate('assessment')}
          style={{
            padding: '16px 40px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}
        >
          🚀 Start Placement Test
        </button>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>
          Takes approximately 5–10 minutes. Modules unlock for Beginner and Intermediate levels.
        </p>
      </div>
    </div>
  );
}

// ── Inner App — has access to UserContext ───────────────────────────────────
function InnerApp({ isLoggedIn, setIsLoggedIn }) {
  const { currentUser, character, loading, markEntryTestComplete, loadUserData } = useUser();
  const [activePage, setActivePage] = useState('overview');
  const [isAssessmentRunning, setIsAssessmentRunning] = useState(false);

  // App states for first-time flow
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [characterSelected, setCharacterSelected] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadUserData();
    }
  }, [isLoggedIn, loadUserData]);

  // Show character select only for new users who haven't selected a character yet
  useEffect(() => {
    if (!loading && currentUser && isLoggedIn) {
      const hasSeenCharSelectThisSession = sessionStorage.getItem('vrm_char_selected');
      if (!hasSeenCharSelectThisSession && !currentUser.hasSelectedCharacter && !characterSelected) {
        setShowCharacterSelect(true);
      }
    }
  }, [loading, currentUser, isLoggedIn]);

  const handleNavigate = useCallback((page) => {
    // Lock navigation if user hasn't completed placement or is not BEGINNER/INTERMEDIATE
    const lockedPages = ['modules', 'games', 'practice-session', 'weekly', 'progress'];
    const isUnlocked = currentUser?.level === 'BEGINNER' || currentUser?.level === 'INTERMEDIATE';
    if (!isUnlocked && lockedPages.includes(page)) {
      return; // silently ignore — locked
    }
    setActivePage(page);
    setIsAssessmentRunning(false);
    if (page === 'challenges') CompanionEvents.emit('CHALLENGE_OPENED');
    else if (page === 'profile') CompanionEvents.emit('PROFILE_OPENED');
    else CompanionEvents.emit('RETURNING_USER');
  }, [currentUser]);

  const handleLoginSuccess = useCallback((rememberMe) => {
    if (rememberMe) localStorage.setItem('vrm_remember_me', 'true');
    setIsLoggedIn(true);
  }, [setIsLoggedIn]);

  const handleLogout = useCallback(async () => {
    try {
      const aiTutorDuration = parseInt(sessionStorage.getItem('vrm_ai_tutor_secs') || '0');
      await api.post('/sessions/end', { aiTutorDuration });
    } catch { }
    localStorage.removeItem('buddy_token');
    localStorage.removeItem('vrm_remember_me');
    sessionStorage.removeItem('vrm_char_selected');
    sessionStorage.removeItem('vrm_ai_tutor_secs');
    setIsLoggedIn(false);
  }, [setIsLoggedIn]);

  const handleCharacterSelected = useCallback((selectedChar) => {
    sessionStorage.setItem('vrm_char_selected', '1');
    setCharacterSelected(true);
    setShowCharacterSelect(false);
  }, []);

  const handleAssessmentComplete = useCallback(async () => {
    markEntryTestComplete();
    // Feature 3 fix: auto-generate first remark immediately after entry test
    // Don't await — let it run in background so user isn't blocked
    try {
      const { default: api } = await import('./services/api');
      api.post('/remarks/me/first').catch(() => { }); // fire and forget
    } catch { }
    setActivePage('overview');
  }, [markEntryTestComplete]);

  // ── Login screen ────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--gray-50)' }}><span className="login-spin-loader" /></div>}>
        <Login onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  // ── Loading user data ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#f8fafc' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Feature 1: Character selection for new users ─────────────
  if (showCharacterSelect) {
    return (
      <Suspense fallback={null}>
        <CharacterSelectScreen onComplete={handleCharacterSelected} />
      </Suspense>
    );
  }

  // Unlock UI only if level is BEGINNER or INTERMEDIATE
  const isUnlocked = currentUser?.level === 'BEGINNER' || currentUser?.level === 'INTERMEDIATE';

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        // Show locked overview if placement not done or level not eligible
        return isUnlocked
          ? <Overview user={currentUser} onNavigate={handleNavigate} />
          : <LockedOverview onNavigate={handleNavigate} />;

      case 'assessment':
        if (!currentUser?.hasCompletedEntryTest) {
          return (
            <PlacementTest
              onNavigate={handleNavigate}
              onAssessmentActiveChange={setIsAssessmentRunning}
            />
          );
        } else {
          return (
            <Assessment
              onAssessmentActiveChange={setIsAssessmentRunning}
            />
          );
        }

      // Lock these pages unless placement level is BEGINNER or INTERMEDIATE
      case 'modules':
        return isUnlocked ? <Modules onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;
      case 'games':
        return isUnlocked ? <GamesPage onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;
      case 'practice-session':
        return isUnlocked ? <PracticeSession onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;
      case 'weekly':
        return isUnlocked ? <WeeklyAssessment user={currentUser} onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;
      case 'progress':
        return isUnlocked ? <MyProgress user={currentUser} onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;

      case 'profile': return <Profile user={currentUser} onNavigate={handleNavigate} character={character} />;
      case 'admin': return <AdminDashboard />;
      default: return isUnlocked ? <Overview user={currentUser} onNavigate={handleNavigate} /> : <LockedOverview onNavigate={handleNavigate} />;
    }
  };

  const isFullscreenTest = isAssessmentRunning && activePage === 'assessment';

  return (
    <div className="app-layout" style={isFullscreenTest ? { padding: 0, margin: 0, width: '100vw', minHeight: '100vh', background: '#f8fafc' } : {}}>
      {!isFullscreenTest && (
        <Sidebar activePage={activePage} onNavigate={handleNavigate} onLogout={handleLogout} hasCompletedEntryTest={isUnlocked} />
      )}
      <main className="main-content" style={isFullscreenTest ? { marginLeft: 0, width: '100vw', padding: 0, minHeight: '100vh', maxWidth: '100vw' } : {}}>
        <Suspense fallback={<PageSkeleton />}>
          {renderActivePage()}
        </Suspense>
      </main>
      {/* Feature 1 + 2: Companion uses selected character, locked if no entry test */}
      <Suspense fallback={null}>
        {!isFullscreenTest && activePage !== 'admin' && activePage !== 'weekly' && <Companion />}
      </Suspense>
    </div>
  );
}

// ── Root App — wraps everything in UserProvider ──────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // Keep user logged in if either they checked 'remember me' OR they have an active token
    return !!localStorage.getItem('buddy_token') || localStorage.getItem('vrm_remember_me') === 'true';
  });

  return (
    <UserProvider>
      <InnerApp isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
    </UserProvider>
  );
}