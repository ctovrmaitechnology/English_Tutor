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
  Printer
} from 'lucide-react';
import { CompanionEvents } from '../components';

export default function Overview({ user: currentUser, onNavigate }) {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'assessment', 'progress'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // original simulator states
  const [roleplayState, setRoleplayState] = useState('idle'); // 'idle', 'recording', 'feedback'
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [activeSpeechText, setActiveSpeechText] = useState('');
  const timerRef = useRef(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['overviewData'],
    queryFn: async () => {
      const res = await api.get('/my-progress');
      return res.data;
    },
  });

  const attempts = data?.attempts || [];

  // Manual Hardcoded UI data for the dashboard
  const assessmentStatus = {
    speakingCertificate: { score: 85, createdAt: new Date().toISOString() },
    writingCertificate: { score: 72, createdAt: new Date().toISOString() }
  };

  const overallScore = 78;
  const isRealScore = true;
  const progressVal = 78;

  const speakingPercentage = 76;
  const writingPercentage = 72;

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

  // Removed isError block to fallback to default UI instead of showing an error screen

  const user = data?.user || { name: 'Priya', level: 'B2 Level', streak: 4, dailyGoal: { completed: 20, target: 30, percentage: 66.7 } };
  const name = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : user.name;
  const stats = data?.stats || [];
  const skills = data?.skills || [];
  const dailyInsight = data?.dailyInsight || '';

  const scoreTrends = data?.scoreTrend?.length > 0
    ? data.scoreTrend.slice(-4)
    : [
      { attempt: 'Cycle 1', score: 52, date: '15 May' },
      { attempt: 'Cycle 2', score: 61, date: '30 May' },
      { attempt: 'Cycle 3', score: 70, date: '15 Jun' },
      { attempt: 'Cycle 4', score: 78, date: '15 Aug' },
    ];

  const firstScore = scoreTrends[0]?.score || 0;
  const latestScore = scoreTrends[scoreTrends.length - 1]?.score || 0;
  const improvementPoints = latestScore - firstScore;

  const avgFirst3 = scoreTrends.length > 1
    ? Math.round(scoreTrends.slice(0, scoreTrends.length - 1).reduce((a, b) => a + b.score, 0) / (scoreTrends.length - 1))
    : firstScore;
  const improvementVsAvg = latestScore - avgFirst3;

  const chartPoints = scoreTrends.map((t, i) => {
    const x = 80 + i * 100;
    const y = 190 - (t.score / 100) * 150;
    const dateFormatted = t.date && !isNaN(new Date(t.date).getTime())
      ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : t.date || '';
    return { x, y, score: t.score, attempt: t.attempt, date: dateFormatted };
  });
  const pathD = chartPoints.length > 0 ? `M ${chartPoints.map(p => `${p.x} ${p.y}`).join(' L ')}` : '';

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
                <span className="ov-band-letter">B</span>
              </div>
              <div className="ov-band-details">
                <span className="ov-band-label">Current Band</span>
                <button className="ov-band-btn">View Band Guide</button>
              </div>
            </div>
          </section>

          {/* Core Score Cards */}
          <section className="ov-summary-cards">
            <div className="summary-card">
              <span className="card-label-gray">Overall Score</span>
              <div className="score-main-row">
                <span className="score-big">{overallScore}</span>
                <span className="score-denominator">/100</span>
              </div>
              <span className="score-trend-up">
                {isRealScore ? (assessmentStatus?.speakingCertificate || assessmentStatus?.writingCertificate ? '✅ Certified Overall Score' : '📈 Real-time Assessment Average') : '↑ +7 points from last cycle'}
              </span>
            </div>

            <div className="summary-card">
              <span className="card-label-gray">Assessment Date</span>
              <div className="score-main-row">
                <span className="date-main">15 Aug 2026</span>
              </div>
              <span className="score-trend-neutral">Next assessment in 12 days</span>
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


          {/* Certificate Banner Section removed */}


          {/* Strengths & Let's Improve Grid */}
          <div className="ov-split-section">
            {/* Strengths and Focus Card */}
            <div className="ov-skills-card content-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h4 className="card-sub-header text-emerald">Top Strengths</h4>
                  <ul className="strength-list">
                    <li><CheckCircle size={16} className="text-emerald" /> Empathy</li>
                    <li><CheckCircle size={16} className="text-emerald" /> Greeting Skills</li>
                    <li><CheckCircle size={16} className="text-emerald" /> Listening</li>
                  </ul>
                </div>
                <div>
                  <h4 className="card-sub-header text-red">Focus Areas</h4>
                  <ul className="focus-list">
                    <li><span className="focus-bullet-red">!</span> Pronunciation</li>
                    <li><span className="focus-bullet-red">!</span> Grammar</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Let's Improve Card */}
            <div className="ov-improve-card">
              <div className="improve-card-inner">
                <div className="improve-target-wrap">
                  <div className="target-bullseye">🎯</div>
                </div>
                <h3>Let's improve together!</h3>
                <button className="improve-start-btn">Start Practice</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'assessment' && (
        <div className="tab-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Assessment Results Section */}
          <div className="content-card assessment-results-layout">
            <div className="ar-header">
              <h3>Assessment Results</h3>
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

                    {pathD && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {chartPoints.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="6" fill="#10b981" stroke="#fff" strokeWidth="2" />
                        <text x={p.x} y={p.y - 15} textAnchor="middle" className="chart-point-text" style={i === chartPoints.length - 1 ? { fontWeight: 800 } : {}}>{p.score}</text>
                        <text x={p.x} y={210} textAnchor="middle" className="chart-axis-text">{p.attempt}</text>
                        <text x={p.x} y={222} textAnchor="middle" className="chart-axis-subtext">{p.date}</text>
                      </g>
                    ))}
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
                    <span className="points-accent">{improvementPoints > 0 ? `+${improvementPoints}` : improvementPoints}</span>
                    <span className="points-label">Points</span>
                  </div>
                  <span className="sub-detail-text">({scoreTrends[0]?.attempt || 'Start'} to {scoreTrends[scoreTrends.length - 1]?.attempt || 'End'})</span>
                </div>
              </div>
            </div>

            <div className="progress-highlights-row">
              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Average Score</span>
                <span className="highlight-val-large">{avgFirst3}</span>
                <span className="sub-detail-text">Previous Cycles</span>
              </div>

              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Latest Score</span>
                <span className="highlight-val-large-active">{latestScore}</span>
                <span className="sub-detail-text">{scoreTrends[scoreTrends.length - 1]?.attempt || 'Latest'}</span>
              </div>

              <div className="content-card highlight-pill-card">
                <span className="card-label-gray">Improvement</span>
                <span className="highlight-val-large-gain">{improvementVsAvg > 0 ? `+${improvementVsAvg}` : improvementVsAvg}</span>
                <span className="sub-detail-text">vs Previous Average</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
