import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFromCDN } from '../utils/cdn';
import api from '../services/api';
import './Overview.css';
import './Assessment.css';
import { 
  Clock, 
  BookOpen, 
  CheckCircle, 
  Flame, 
  Play, 
  Square, 
  Sparkles, 
  ChevronRight, 
  Volume2, 
  Mic,
  Award,
  TrendingUp,
  Target,
  FileText,
  Activity,
  Sliders,
  ChevronDown,
  UserCheck,
  X,
  Printer,
  Loader2
} from 'lucide-react';
import { CompanionEvents } from '../components';

export default function Overview({ user: currentUser, onNavigate }) {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'assessment', 'progress'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Placement Report modal states
  const [showPlacementReportModal, setShowPlacementReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // original simulator states
  const [roleplayState, setRoleplayState] = useState('idle'); // 'idle', 'recording', 'feedback'
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const timerRef = useRef(null);

  // Fetch dashboard overview data with TanStack Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['overviewData'],
    queryFn: () => fetchFromCDN('mock-data/overview.json'),
  });

  // Fetch real assessment status
  const { data: assessmentStatus } = useQuery({
    queryKey: ['assessmentStatus'],
    queryFn: async () => {
      const res = await api.get('/assessment/status');
      return res.data;
    }
  });

  // Fetch real latest placement result from backend (cache is primed & invalidated on assessment completion)
  const { data: latestPlacement } = useQuery({
    queryKey: ['latestPlacement', currentUser?.id],
    queryFn: async () => {
      const res = await api.get('/placement/my-latest-result');
      return res.data;
    },
    enabled: !!currentUser?.id,
  });

  // Check if initial placement exists (pick whichever is newer between server and local storage)
  const localPlacementStr = localStorage.getItem('placementResult');
  const localPlacementObj = localPlacementStr ? JSON.parse(localPlacementStr) : null;
  const validLocalPlacement = (localPlacementObj && localPlacementObj.userId === currentUser?.id) ? localPlacementObj : null;
  const placementData = (() => {
    if (!latestPlacement && !validLocalPlacement) return null;
    if (!latestPlacement) return validLocalPlacement;
    if (!validLocalPlacement) return latestPlacement;
    const serverTime = new Date(latestPlacement.completedAt || 0).getTime();
    const localTime = new Date(validLocalPlacement.completedAt || 0).getTime();
    return localTime > serverTime ? validLocalPlacement : latestPlacement;
  })();

  let overallScore = '--';
  let isRealScore = false;
  let progressVal = 0;
  let currentBandLetter = '-';
  let assessmentDateStr = 'Not Taken';
  let nextAssessmentStr = 'Take your initial placement test';

  if (assessmentStatus) {
    const hasSpCert = !!assessmentStatus.speakingCertificate;
    const hasWrCert = !!assessmentStatus.writingCertificate;
    const spCertScore = assessmentStatus.speakingCertificate?.score || 0;
    const wrCertScore = assessmentStatus.writingCertificate?.score || 0;
    
    if (hasSpCert && hasWrCert) {
      overallScore = Math.round((spCertScore + wrCertScore) / 2);
      isRealScore = true;
      currentBandLetter = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : 'C';
      assessmentDateStr = new Date(assessmentStatus.speakingCertificate.createdAt).toLocaleDateString();
      nextAssessmentStr = 'Certified overall score';
    } else if (hasSpCert) {
      overallScore = spCertScore;
      isRealScore = true;
      currentBandLetter = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : 'C';
      assessmentDateStr = new Date(assessmentStatus.speakingCertificate.createdAt).toLocaleDateString();
      nextAssessmentStr = 'Speaking certified';
    } else if (hasWrCert) {
      overallScore = wrCertScore;
      isRealScore = true;
      currentBandLetter = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : 'C';
      assessmentDateStr = new Date(assessmentStatus.writingCertificate.createdAt).toLocaleDateString();
      nextAssessmentStr = 'Writing certified';
    } else {
      // Average of attempt scores
      const sp = assessmentStatus.speaking?.scores || {};
      const wr = assessmentStatus.writing?.scores || {};
      const attempts = [
        sp.beginner, sp.intermediate, sp.advanced,
        wr.beginner, wr.intermediate, wr.advanced
      ].filter(s => s !== null && s !== undefined);
      
      if (attempts.length > 0) {
        overallScore = Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length);
        isRealScore = true;
        currentBandLetter = overallScore >= 85 ? 'A' : overallScore >= 70 ? 'B' : 'C';
        assessmentDateStr = new Date().toLocaleDateString();
        nextAssessmentStr = 'Real-time assessment average';
      }
    }

    if (assessmentStatus.overallProgress !== undefined && assessmentStatus.overallProgress > 0) {
      progressVal = assessmentStatus.overallProgress;
    }
  }

  // Fallback to placement result if no assessment certificates yet
  if (!isRealScore && placementData && placementData.totalScore !== undefined) {
    overallScore = placementData.totalScore;
    isRealScore = true;
    progressVal = placementData.totalScore;
    currentBandLetter = placementData.finalLevel ? placementData.finalLevel[0] : 'B';
    assessmentDateStr = new Date().toLocaleDateString();
    nextAssessmentStr = `Placed at ${placementData.finalLevel}`;
  }

  // Calculate real Speaking and Writing percentages
  const realSpeakingScore = assessmentStatus?.speaking?.passingScore || 
    (assessmentStatus?.speaking?.scores ? 
      (Object.values(assessmentStatus.speaking.scores).filter(s => s !== null).length > 0 ?
        Math.round(Object.values(assessmentStatus.speaking.scores).filter(s => s !== null).reduce((a, b) => a + b, 0) / 
        Object.values(assessmentStatus.speaking.scores).filter(s => s !== null).length) 
        : 0)
      : 0);

  const realWritingScore = assessmentStatus?.writing?.passingScore || 
    (assessmentStatus?.writing?.scores ? 
      (Object.values(assessmentStatus.writing.scores).filter(s => s !== null).length > 0 ?
        Math.round(Object.values(assessmentStatus.writing.scores).filter(s => s !== null).reduce((a, b) => a + b, 0) / 
        Object.values(assessmentStatus.writing.scores).filter(s => s !== null).length) 
        : 0)
      : 0);

  const speakingPercentage = Math.min(Math.max(
    realSpeakingScore || assessmentStatus?.speakingCertificate?.score || (placementData?.skillScores?.speaking || 0), 0), 100);

  const writingPercentage = Math.min(Math.max(
    realWritingScore || assessmentStatus?.writingCertificate?.score || assessmentStatus?.writing?.passingScore || (placementData?.skillScores?.writing || Math.round(overallScore * 0.95)), 0), 100);

  const handleViewPlacementReport = async () => {
    setShowPlacementReportModal(true);
    if (placementData && placementData.responses && placementData.responses.length > 0) {
      setReportData(placementData);
    } else {
      setReportLoading(true);
      try {
        const res = await api.get('/placement/report/latest');
        setReportData(res.data || placementData);
      } catch (e) {
        console.error('Failed to fetch report analysis:', e);
        setReportData(placementData);
      } finally {
        setReportLoading(false);
      }
    }
  };

  const formatPlacementLevel = (lvl) => {
    if (!lvl || lvl === 'BEGINNER' || lvl === 'ELEMENTARY') return 'BEGINNER';
    return 'INTERMEDIATE';
  };

  const simulatedSpeeches = data?.simulatedSpeeches || [
    "Thank you for calling Customer Care. My name is Priya...",
    "I understand you are calling about an unexpected charge on your bill...",
    "Let me check your billing statement details for this month...",
    "I have identified the charge. It seems to be a pro-rated subscription fee...",
    "I will be happy to credit this back to your account as a gesture of goodwill..."
  ];

  useEffect(() => {
    if (roleplayState === 'recording') {
      setSecondsElapsed(0);
      setActiveSpeechText('Listening... Start speaking your greeting.');
      
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => {
          const nextSec = prev + 1;
          const index = Math.floor(nextSec / 4);
          if (index < simulatedSpeeches.length) {
            setActiveSpeechText(simulatedSpeeches[index]);
          } else {
            setActiveSpeechText("Excellent progress. Keep speaking to finish the scenario.");
          }
          return nextSec;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roleplayState, simulatedSpeeches]);

  // Click outside listener for custom dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRoleplay = useCallback(() => {
    setRoleplayState('recording');
    CompanionEvents.emit('AI_SPEAKING_START');   // Companion starts talking animation
  }, []);

  const handleFinishRoleplay = useCallback(() => {
    setRoleplayState('feedback');
    const scores = [88, 86, 90];
    const allHigh = scores.every(s => s >= 85);
    if (allHigh) {
      CompanionEvents.emit('HIGH_SCORE_ACHIEVED'); // Companion plays Happy animation
    } else {
      CompanionEvents.emit('AI_RESPONSE_END');     // Return to Idle
    }
  }, []);

  const handleResetRoleplay = useCallback(() => {
    setRoleplayState('idle');
    CompanionEvents.emit('AI_RESPONSE_END');       // Ensure companion returns to Idle
  }, []);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, []);

  if (isLoading) {
    return (
      <div className="overview-container animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: 0.7 }}>
        <div style={{ height: '50px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px' }} />
        <div style={{ height: '140px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
          <div style={{ height: '100px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="overview-container" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '48px' }} role="img" aria-label="warning">⚠️</span>
          <h3 style={{ margin: '16px 0 8px', color: '#991b1b' }}>Failed to Load Dashboard Data</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error?.message || 'A network error occurred.'}</p>
          <button onClick={() => refetch()} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  const user = data?.user || { name: 'Priya', level: 'B2 Level', streak: 4, dailyGoal: { completed: 20, target: 30, percentage: 66.7 } };
  const name = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : user.name;
  const stats = data?.stats || [];
  const skills = data?.skills || [];
  const dailyInsight = data?.dailyInsight || '';

  // Get active view title
  const getViewTitle = () => {
    switch (activeView) {
      case 'overview': return '👨‍💼 Overview';
      case 'assessment': return '📋 Assessment Results';
      case 'progress': return '📈 Progress Tracking';
      default: return '👨‍💼 Overview';
    }
  };

  return (
    <div className="overview-container animate-fade-in">
      {/* ── Dashboard Header with Selector Dropdown ─────────────────────────── */}
      <div className="dashboard-header-bar">
        <div className="db-title-area">
          <h2 className="db-page-main-title">Training Dashboard</h2>
          <p className="db-page-sub-title">Monitor your BPO communication progress and practice calls</p>
        </div>

        {/* Custom Premium Dropdown */}
        <div className="db-view-dropdown-container" ref={dropdownRef}>
          <button 
            className="db-view-select-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <Sliders size={16} />
            <span>{getViewTitle()}</span>
            <ChevronDown size={16} className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="db-dropdown-menu-floating animate-scale-up">
              <button 
                className={`db-dropdown-item ${activeView === 'overview' ? 'active' : ''}`}
                onClick={() => { setActiveView('overview'); setDropdownOpen(false); }}
              >
                <span className="item-icon">👨‍💼</span>
                <div className="item-meta">
                  <span className="item-label">Overview</span>
                  <span className="item-sub">{name} overall score & status</span>
                </div>
              </button>

              <button 
                className={`db-dropdown-item ${activeView === 'assessment' ? 'active' : ''}`}
                onClick={() => { setActiveView('assessment'); setDropdownOpen(false); }}
              >
                <span className="item-icon">📋</span>
                <div className="item-meta">
                  <span className="item-label">Assessment Results</span>
                  <span className="item-sub">Speaking, listening, writing scores</span>
                </div>
              </button>

              <button 
                className={`db-dropdown-item ${activeView === 'progress' ? 'active' : ''}`}
                onClick={() => { setActiveView('progress'); setDropdownOpen(false); }}
              >
                <span className="item-icon">📈</span>
                <div className="item-meta">
                  <span className="item-label">Progress Tracking</span>
                  <span className="item-sub">Cycles progress chart & metrics</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── View Content Renderer ────────────────────────────────────────────── */}
      {activeView === 'overview' && (
        <div className="tab-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Welcome Profile Bar */}
          <section className="ov-welcome-banner-new">
            <div className="ov-profile-brief">
              <div className="ov-avatar-wrap">
                <span className="ov-avatar-emoji">👨‍💼</span>
              </div>
              <div className="ov-profile-info">
                <span className="ov-welcome-tag">👋 Welcome back,</span>
                <h2>{name}</h2>
                <p className="ov-designation">Customer Support Associate</p>
              </div>
            </div>
            
            <div className="ov-band-card">
              <div className="ov-band-circle">
                <span className="ov-band-letter">{currentBandLetter}</span>
              </div>
              <div className="ov-band-details">
                <span className="ov-band-label">Current Band</span>
                <button className="ov-band-btn" onClick={() => !isRealScore ? onNavigate('placement') : null}>
                  {!isRealScore ? 'Take Placement Test' : 'View Band Guide'}
                </button>
              </div>
            </div>
          </section>

          {/* Core Score Cards */}
          <section className="ov-summary-cards">
            <div className="summary-card">
              <span className="card-label-gray">Overall Score</span>
              <div className="score-main-row">
                <span className="score-big">{overallScore}</span>
                {isRealScore && <span className="score-denominator">/100</span>}
              </div>
              <span className="score-trend-up">
                {isRealScore ? (assessmentStatus?.speakingCertificate || assessmentStatus?.writingCertificate ? '✅ Certified Overall Score' : nextAssessmentStr) : '⚠️ No placement score yet'}
              </span>
            </div>

            <div className="summary-card">
              <span className="card-label-gray">Assessment Date</span>
              <div className="score-main-row">
                <span className="date-main">{assessmentDateStr}</span>
              </div>
              <span className="score-trend-neutral">{nextAssessmentStr}</span>
            </div>

            <div className="summary-card">
              <span className="card-label-gray">Progress</span>
              <div className="score-main-row">
                <span className="score-big">{progressVal}%</span>
              </div>
              <div className="db-progress-bar-wrap">
                <div className="db-progress-bar-fill" style={{ width: `${progressVal}%` }} />
              </div>
            </div>
          </section>

          {/* Certificate Banner Section */}
          {assessmentStatus && (assessmentStatus.speakingCertificate || assessmentStatus.writingCertificate) && (
            <section className="ov-certificates-section" style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px dashed #22c55e',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🏆</span>
                <div>
                  <h3 style={{ margin: 0, color: '#14532d', fontSize: '18px', fontWeight: 700 }}>
                    Earned Certificates
                  </h3>
                  <p style={{ margin: '2px 0 0', color: '#166534', fontSize: '14px' }}>
                    Congratulations! You have successfully certified in the following communication modules.
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                {assessmentStatus.speakingCertificate && (
                  <div 
                    onClick={() => onNavigate('modules')}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(34, 197, 94, 0.12)';
                      e.currentTarget.style.borderColor = '#4ade80';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = '#bbf7d0';
                    }}
                    style={{
                      background: '#fff',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flex: '1 1 280px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#1f2937', fontWeight: 600 }}>
                        🎙️ Speaking Certificate
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Score: <strong style={{ color: '#166534' }}>{assessmentStatus.speakingCertificate.score}%</strong> • {new Date(assessmentStatus.speakingCertificate.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('modules');
                      }}
                      style={{
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
                      onMouseOut={e => e.currentTarget.style.background = '#22c55e'}
                    >
                      View 🎓
                    </button>
                  </div>
                )}
                
                {assessmentStatus.writingCertificate && (
                  <div 
                    onClick={() => onNavigate('modules')}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 12px rgba(34, 197, 94, 0.12)';
                      e.currentTarget.style.borderColor = '#4ade80';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                      e.currentTarget.style.borderColor = '#bbf7d0';
                    }}
                    style={{
                      background: '#fff',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flex: '1 1 280px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#1f2937', fontWeight: 600 }}>
                        ✍️ Writing Certificate
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Score: <strong style={{ color: '#166534' }}>{assessmentStatus.writingCertificate.score}%</strong> • {new Date(assessmentStatus.writingCertificate.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('modules');
                      }}
                      style={{
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
                      onMouseOut={e => e.currentTarget.style.background = '#22c55e'}
                    >
                      View 🎓
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Strengths & Let's Improve Grid */}
          <div className="ov-split-section">
            {/* Strengths and Focus Card */}
            <div className="ov-skills-card content-card">
              {!isRealScore ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <h4 className="card-sub-header" style={{ color: '#1e293b', marginBottom: '8px' }}>No Assessment Data Yet</h4>
                  <p style={{ color: '#64748b', fontSize: '14.5px', marginBottom: '18px' }}>
                    You haven't completed your Initial Placement Assessment. Take the test now to analyze your strengths across Grammar, Vocabulary, Reading, and Listening!
                  </p>
                  <button 
                    onClick={() => onNavigate('placement')}
                    style={{
                      background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Take Placement Test 🚀
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 className="card-sub-header" style={{ margin: 0 }}>Baseline Skills & Analysis</h4>
                    <button
                      onClick={handleViewPlacementReport}
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>View Report</span>
                      <span>📊</span>
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                      <h4 className="card-sub-header text-emerald" style={{ fontSize: '14px' }}>Top Strengths</h4>
                      <ul className="strength-list">
                        {placementData?.skillScores ? Object.entries(placementData.skillScores).filter(([_, s]) => s >= 75).map(([skill]) => (
                          <li key={skill} style={{ textTransform: 'capitalize' }}><CheckCircle size={16} className="text-emerald" /> {skill}</li>
                        )) : (
                          <>
                            <li><CheckCircle size={16} className="text-emerald" /> Empathy</li>
                            <li><CheckCircle size={16} className="text-emerald" /> Greeting Skills</li>
                            <li><CheckCircle size={16} className="text-emerald" /> Listening</li>
                          </>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="card-sub-header text-red" style={{ fontSize: '14px' }}>Focus Areas</h4>
                      <ul className="focus-list">
                        {placementData?.skillScores ? Object.entries(placementData.skillScores).filter(([_, s]) => s < 75).map(([skill]) => (
                          <li key={skill} style={{ textTransform: 'capitalize' }}><span className="focus-bullet-red">!</span> {skill}</li>
                        )) : (
                          <>
                            <li><span className="focus-bullet-red">!</span> Pronunciation</li>
                            <li><span className="focus-bullet-red">!</span> Grammar</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Let's Improve Card */}
            <div className="ov-improve-card">
              <div className="improve-card-inner">
                <div className="improve-target-wrap">
                  <div className="target-bullseye">🎯</div>
                </div>
                <h3>Let's improve together!</h3>
                <button className="improve-start-btn" onClick={() => !isRealScore ? onNavigate('placement') : onNavigate('modules')}>
                  {!isRealScore ? 'Start Placement' : 'Start Practice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'assessment' && (
        <div className="tab-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── 1. INITIAL PLACEMENT ASSESSMENT SECTION ────────────────────── */}
          <div className="content-card assessment-results-layout" style={{ borderLeft: '4px solid #2563eb' }}>
            <div className="ar-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>🎯</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                    Initial Placement Assessment Results
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                    Your baseline communication & CEFR band evaluation
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {placementData?.finalLevel && (
                  <span className="ar-cycle-badge" style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '13px' }}>
                    CEFR Band: {formatPlacementLevel(placementData.finalLevel)}
                  </span>
                )}
                <button
                  className="placement-view-report-btn"
                  onClick={handleViewPlacementReport}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: 600,
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>View Report</span>
                  <span style={{ fontSize: '16px' }}>📊</span>
                </button>
              </div>
            </div>

            {!placementData ? (
              <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', marginTop: '16px' }}>
                <h4 style={{ color: '#334155', marginBottom: '8px' }}>Assessment Not Yet Completed</h4>
                <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 18px' }}>
                  Take your baseline placement evaluation to unlock your exact CEFR communication band and detailed question analysis.
                </p>
                <button
                  onClick={() => onNavigate('placement')}
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 22px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Take Placement Test Now 🚀
                </button>
              </div>
            ) : (
              <div className="ar-grid-container" style={{ marginTop: '20px' }}>
                <div className="ar-progress-column">
                  {Object.entries(placementData.skillScores || { grammar: 80, vocabulary: 75, reading: 85, listening: 80 }).map(([skill, score]) => {
                    const icons = { grammar: '📖', vocabulary: '💡', reading: '📄', listening: '🎧' };
                    const colors = { grammar: 'purple', vocabulary: 'blue', reading: 'emerald', listening: 'amber' };
                    const cName = colors[skill] || 'blue';
                    return (
                      <div className="ar-row" key={skill}>
                        <div className="ar-row-meta">
                          <span className={`ar-icon-box bg-${cName}`}>{icons[skill] || '📌'}</span>
                          <span className="ar-row-label" style={{ textTransform: 'capitalize' }}>{skill}</span>
                        </div>
                        <div className="ar-bar-container">
                          <div className={`ar-bar-fill fill-${cName}`} style={{ width: `${score}%` }} />
                          <span className="ar-score-text">{score} / 100</span>
                          <span className="ar-percentage-text">{score}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ar-summary-column">
                  <div className="ar-total-score-box" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbafea11 100%)', borderColor: '#bfdbfe' }}>
                    <span className="ar-total-label" style={{ color: '#1e40af' }}>Overall Baseline Score</span>
                    <div className="ar-band-row">
                      <span className="ar-band-display" style={{ color: '#1e3a8a' }}>
                        {placementData.totalScore || 80}%
                      </span>
                      <span className="ar-band-letter-badge" style={{ background: '#2563eb' }}>
                        {formatPlacementLevel(placementData.finalLevel)[0]}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#1d4ed8', fontWeight: 600 }}>
                      CEFR Band: {formatPlacementLevel(placementData.finalLevel)}
                    </p>
                  </div>
                  <div className="ar-encouragement-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <span className="star-icon">💡</span>
                    <div>
                      <h4 style={{ color: '#166534' }}>Baseline Verified</h4>
                      <p style={{ color: '#15803d' }}>Click "View Report" above for question breakdown</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 2. CYCLE ASSESSMENT RESULTS (Cycle 4) ────────────────────── */}
          <div className="content-card assessment-results-layout">
            <div className="ar-header">
              <h3>Cycle Assessment Results</h3>
              <span className="ar-cycle-badge">Cycle 4</span>
            </div>

            <div className="ar-grid-container">
              <div className="ar-progress-column">
                <div className="ar-row">
                  <div className="ar-row-meta">
                    <span className="ar-icon-box bg-purple">🎙️</span>
                    <span className="ar-row-label">Speaking</span>
                  </div>
                  <div className="ar-bar-container">
                    <div className="ar-bar-fill fill-purple" style={{ width: `${speakingPercentage}%` }} />
                    <span className="ar-score-text">{Math.round(speakingPercentage * 0.5)} / 50</span>
                    <span className="ar-percentage-text">{speakingPercentage}%</span>
                  </div>
                </div>

                <div className="ar-row">
                  <div className="ar-row-meta">
                    <span className="ar-icon-box bg-blue">🎧</span>
                    <span className="ar-row-label">Listening</span>
                  </div>
                  <div className="ar-bar-container">
                    <div className="ar-bar-fill fill-blue" style={{ width: `${speakingPercentage}%` }} />
                    <span className="ar-score-text">{Math.round(speakingPercentage * 0.25)} / 25</span>
                    <span className="ar-percentage-text">{speakingPercentage}%</span>
                  </div>
                </div>

                <div className="ar-row">
                  <div className="ar-row-meta">
                    <span className="ar-icon-box bg-emerald">✍️</span>
                    <span className="ar-row-label">Writing</span>
                  </div>
                  <div className="ar-bar-container">
                    <div className="ar-bar-fill fill-emerald" style={{ width: `${writingPercentage}%` }} />
                    <span className="ar-score-text">{Math.round(writingPercentage * 0.25)} / 25</span>
                    <span className="ar-percentage-text">{writingPercentage}%</span>
                  </div>
                </div>

                <div className="ar-row">
                  <div className="ar-row-meta">
                    <span className="ar-icon-box bg-amber">🧩</span>
                    <span className="ar-row-label">Bonus MCQ</span>
                  </div>
                  <div className="ar-bar-container">
                    <div className="ar-bar-fill fill-amber" style={{ width: '80%' }} />
                    <span className="ar-score-text">8 / 10</span>
                    <span className="ar-percentage-text">80%</span>
                  </div>
                </div>
              </div>

              <div className="ar-summary-column">
                <div className="ar-total-score-box">
                  <span className="ar-total-label">Total Score</span>
                  <div className="ar-band-row">
                    <span className="ar-band-display">Band B</span>
                    <span className="ar-band-letter-badge">B</span>
                  </div>
                </div>
                <div className="ar-encouragement-card">
                  <span className="star-icon">⭐</span>
                  <div>
                    <h4>You are doing great!</h4>
                    <p>Keep improving</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ar-chart-section">
              <h4>Section-wise Performance</h4>
              <div className="ar-chart-bar-container">
                <div className="ar-chart-bar-item">
                  <div className="ar-chart-bar-track">
                    <div className="ar-chart-bar-fill chart-fill-purple" style={{ height: `${speakingPercentage}%` }}>
                      <span className="chart-val">{speakingPercentage}%</span>
                    </div>
                  </div>
                  <span className="ar-chart-label">Speaking</span>
                </div>

                <div className="ar-chart-bar-item">
                  <div className="ar-chart-bar-track">
                    <div className="ar-chart-bar-fill chart-fill-blue" style={{ height: `${speakingPercentage}%` }}>
                      <span className="chart-val">{speakingPercentage}%</span>
                    </div>
                  </div>
                  <span className="ar-chart-label">Listening</span>
                </div>

                <div className="ar-chart-bar-item">
                  <div className="ar-chart-bar-track">
                    <div className="ar-chart-bar-fill chart-fill-emerald" style={{ height: `${writingPercentage}%` }}>
                      <span className="chart-val">{writingPercentage}%</span>
                    </div>
                  </div>
                  <span className="ar-chart-label">Writing</span>
                </div>

                <div className="ar-chart-bar-item">
                  <div className="ar-chart-bar-track">
                    <div className="ar-chart-bar-fill chart-fill-amber" style={{ height: '80%' }}>
                      <span className="chart-val">80%</span>
                    </div>
                  </div>
                  <span className="ar-chart-label">MCQ</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'progress' && (
        <div className="tab-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Progress Tracking Section */}
          <div className="progress-tracking-layout">
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
              <div className="content-card progress-chart-card">
                <div className="ar-header">
                  <div>
                    <h3>Your Progress Over Time</h3>
                    <p className="card-subtitle-small">Track your improvement every 15 days</p>
                  </div>
                  <select className="cycle-select-dropdown">
                    <option>All Cycles</option>
                  </select>
                </div>

                <div className="svg-chart-container">
                  <svg viewBox="0 0 500 220" className="progress-svg-line-chart">
                    <line x1="50" y1="40" x2="450" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="90" x2="450" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="140" x2="450" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4" />
                    <line x1="50" y1="190" x2="450" y2="190" stroke="#e2e8f0" strokeWidth="1.5" />

                    <path 
                      d="M 80 160 L 180 135 L 280 110 L 380 88" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="3.5" 
                      strokeLinecap="round"
                      strokeLinejoin="round" 
                    />

                    <circle cx="80" cy="160" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x="80" y="145" textAnchor="middle" className="chart-point-text">52</text>
                    <text x="80" y="210" textAnchor="middle" className="chart-axis-text">Cycle 1</text>
                    <text x="80" y="222" textAnchor="middle" className="chart-axis-subtext">15 May</text>

                    <circle cx="180" cy="135" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x="180" y="120" textAnchor="middle" className="chart-point-text">61</text>
                    <text x="180" y="210" textAnchor="middle" className="chart-axis-text">Cycle 2</text>
                    <text x="180" y="222" textAnchor="middle" className="chart-axis-subtext">30 May</text>

                    <circle cx="280" cy="110" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x="280" y="95" textAnchor="middle" className="chart-point-text">70</text>
                    <text x="280" y="210" textAnchor="middle" className="chart-axis-text">Cycle 3</text>
                    <text x="280" y="222" textAnchor="middle" className="chart-axis-subtext">15 Jun</text>

                    <circle cx="380" cy="88" r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                    <text x="380" y="73" textAnchor="middle" className="chart-point-text" style={{ fontWeight: 800 }}>78</text>
                    <text x="380" y="210" textAnchor="middle" className="chart-axis-text">Cycle 4</text>
                    <text x="380" y="222" textAnchor="middle" className="chart-axis-subtext">15 Aug</text>
                  </svg>
                </div>
              </div>

              <div className="progress-stats-column">
                <div className="content-card progress-meta-card">
                  <span className="card-label-gray">Band Progress</span>
                  <div className="progress-steps-row">
                    <span className="step-badge done">E</span>
                    <span className="step-arrow">→</span>
                    <span className="step-badge done">D</span>
                    <span className="step-arrow">→</span>
                    <span className="step-badge done">C</span>
                    <span className="step-arrow">→</span>
                    <span className="step-badge active">B</span>
                  </div>
                  <span className="step-date-indicator">15 May • 30 May • 15 Jun • 15 Aug</span>
                </div>

                <div className="content-card progress-meta-card text-center-wrap">
                  <span className="card-label-gray">Total Improvement</span>
                  <div className="improvement-points-row">
                    <span className="points-accent">+26</span>
                    <span className="points-label">Points</span>
                  </div>
                  <span className="sub-detail-text">(Cycle 1 to Cycle 4)</span>
                </div>
              </div>
            </div>

            <div className="progress-highlights-row">
              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Average Score</span>
                <span className="highlight-val-large">65</span>
                <span className="sub-detail-text">First 3 Cycles</span>
              </div>

              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Average Score</span>
                <span className="highlight-val-large-active">78</span>
                <span className="sub-detail-text">Latest Cycle</span>
              </div>

              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Improvement</span>
                <span className="highlight-val-large-gain">+13</span>
                <span className="sub-detail-text">vs Last 3 Cycles</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Initial Placement Assessment Detailed Analysis Modal ── */}
      {showPlacementReportModal && (
        <div className="db-modal-overlay animate-fade-in" onClick={() => setShowPlacementReportModal(false)}>
          <div className="db-modal-content placement-report-modal animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '26px' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '19px', color: '#0f172a', fontWeight: 700 }}>
                    Initial Placement Assessment Analysis
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                    Detailed review of your question-by-question performance & correct answers
                  </p>
                </div>
              </div>
              <button className="db-modal-close-btn" onClick={() => setShowPlacementReportModal(false)}>✕</button>
            </div>

            <div className="db-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
              {reportLoading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}>
                  <Loader2 className="placement-spin" size={40} color="#2563eb" />
                  <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 500 }}>Loading detailed assessment responses...</p>
                </div>
              ) : !reportData || !reportData.responses || reportData.responses.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px' }}>
                  <h4 style={{ color: '#334155', marginBottom: '8px' }}>No Detailed Question Records Found</h4>
                  <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto 18px' }}>
                    We found your overall baseline score ({reportData?.totalScore || placementData?.totalScore || '--'}%), but individual question choices were recorded prior to detailed tracking.
                  </p>
                  <button
                    onClick={() => { setShowPlacementReportModal(false); onNavigate('placement'); }}
                    className="placement-btn placement-btn--primary"
                    style={{ padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Retake Assessment for Full Report 🚀
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Summary Banner inside Modal */}
                  <div className="placement-report-summary-bar">
                    <div className="report-summary-stat">
                      <span className="stat-label">Total Score</span>
                      <span className="stat-val text-blue">{reportData.totalScore}%</span>
                    </div>
                    <div className="report-summary-stat">
                      <span className="stat-label">CEFR Level</span>
                      <span className="stat-val text-emerald">{formatPlacementLevel(reportData.finalLevel)}</span>
                    </div>
                    <div className="report-summary-stat">
                      <span className="stat-label">Questions Correct</span>
                      <span className="stat-val text-purple">
                        {reportData.responses.filter(r => r.isCorrect).length} / {reportData.responses.length}
                      </span>
                    </div>
                    <div className="report-summary-stat">
                      <span className="stat-label">Confidence Score</span>
                      <span className="stat-val">{reportData.confidenceScore || 85}%</span>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="placement-question-list">
                    {reportData.responses.map((resp, idx) => {
                      return (
                        <div key={idx} className={`report-q-card ${resp.isCorrect ? 'q-card-correct' : 'q-card-wrong'}`}>
                          <div className="report-q-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="q-number-badge">Q{resp.questionNumber || idx + 1}</span>
                              <span className="placement-skill-chip" style={{ textTransform: 'capitalize' }}>
                                {resp.skill || 'Grammar'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {!resp.isScored ? (
                                <span className="status-badge-wrong" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                                  ⏳ Recorded (Unscored)
                                </span>
                              ) : resp.isCorrect ? (
                                <span className="status-badge-correct">
                                  <CheckCircle size={15} /> Correct (+1)
                                </span>
                              ) : (
                                <span className="status-badge-wrong">
                                  ✕ Incorrect (0)
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="report-q-text">{resp.questionText}</h4>

                          {resp.options && resp.options.length > 0 ? (
                            <div className="report-options-grid">
                              {resp.options.map((opt, optIdx) => {
                                const isSelected = optIdx === resp.selectedOptionIndex;
                                const isCorrectOpt = optIdx === resp.correctOptionIndex;
                                let optClass = 'report-opt-card';
                                if (isSelected && resp.isCorrect) optClass += ' opt-selected-correct';
                                else if (isSelected && !resp.isCorrect) optClass += ' opt-selected-wrong';
                                else if (isCorrectOpt && !resp.isCorrect) optClass += ' opt-correct-answer';

                                return (
                                  <div key={optIdx} className={optClass}>
                                    <span className="opt-letter">{['A', 'B', 'C', 'D'][optIdx] || optIdx + 1}</span>
                                    <span className="opt-text">{opt}</span>
                                    {isSelected && resp.isCorrect && <span className="opt-tag tag-correct">Your Answer ✅</span>}
                                    {isSelected && !resp.isCorrect && <span className="opt-tag tag-wrong">Your Choice ❌</span>}
                                    {isCorrectOpt && !resp.isCorrect && <span className="opt-tag tag-correct-ans">Correct Answer ✅</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                              <div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Your Response:</span>
                                <span style={{ fontSize: '14.5px', color: '#1e293b', fontWeight: 600 }}>{resp.textResponse || '(No response recorded)'}</span>
                              </div>
                              {resp.correctAnswer && (
                                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Model / Expected Answer:</span>
                                  <span style={{ fontSize: '14px', color: '#047857' }}>{resp.correctAnswer}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {resp.explanation && (
                            <div className="report-explanation-box">
                              <span className="exp-icon">💡</span>
                              <div>
                                <strong style={{ color: '#1e293b', fontSize: '13px', display: 'block', marginBottom: '2px' }}>Why this is correct:</strong>
                                <span style={{ color: '#475569', fontSize: '13px', lineHeight: '1.4' }}>{resp.explanation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="db-modal-footer" style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowPlacementReportModal(false)}
                className="placement-btn placement-btn--primary"
                style={{ padding: '10px 24px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
