import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFromCDN } from '../utils/cdn';
import './Profile.css';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Sliders, 
  HelpCircle,
  Bell,
  Sparkles,
  ToggleLeft
} from 'lucide-react';
import { CompanionEvents } from '../components';

export default function Profile({ user: currentUser }) {
  // Fetch user profile and preferences using React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profileData'],
    queryFn: () => fetchFromCDN('mock-data/profile.json'),
  });

  const [grammarStrict, setGrammarStrict] = useState(null);
  const [speechCoaching, setSpeechCoaching] = useState(null);
  const [speechThreshold, setSpeechThreshold] = useState(null);

  const initialPreferences = data?.preferences || {
    grammarStrict: true,
    speechCoaching: true,
    speechThreshold: 80
  };

  const currentGrammarStrict = grammarStrict !== null ? grammarStrict : initialPreferences.grammarStrict;
  const currentSpeechCoaching = speechCoaching !== null ? speechCoaching : initialPreferences.speechCoaching;
  const currentSpeechThreshold = speechThreshold !== null ? speechThreshold : initialPreferences.speechThreshold;

  const handleToggleGrammar = useCallback(() => {
    setGrammarStrict(prev => {
      const active = prev !== null ? prev : initialPreferences.grammarStrict;
      return !active;
    });
    CompanionEvents.emit('COMPANION_CLICKED');
  }, [initialPreferences.grammarStrict]);

  const handleToggleCoaching = useCallback(() => {
    setSpeechCoaching(prev => {
      const active = prev !== null ? prev : initialPreferences.speechCoaching;
      return !active;
    });
    CompanionEvents.emit('COMPANION_CLICKED');
  }, [initialPreferences.speechCoaching]);

  const handleThresholdChange = useCallback((e) => {
    setSpeechThreshold(Number(e.target.value));
    CompanionEvents.emit('COMPANION_CLICKED');
  }, []);

  if (isLoading) {
    return (
      <div className="profile-container animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: 0.7 }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ height: '300px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 1 }} />
          <div style={{ height: '300px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 2 }} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="profile-container" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '48px' }} role="img" aria-label="warning">⚠️</span>
          <h3 style={{ margin: '16px 0 8px', color: '#991b1b' }}>Failed to Load Profile</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error?.message || 'A network error occurred while reaching the cache server.'}</p>
          <button onClick={() => refetch()} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  const user = {
    name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : (data?.user?.name || "Priya Rajan"),
    title: data?.user?.title || "Voice Process Associate",
    department: data?.user?.department || "Customer Support - Inbound Telecom",
    email: currentUser?.email || data?.user?.email || "priya.rajan@company.com",
    phone: currentUser?.phone || data?.user?.phone || "+91 98765 43210",
    location: data?.user?.location || "Chennai, India"
  };

  const metrics = data?.metrics || {
    totalXp: "4,250",
    completedSessions: 42,
    averageAccuracy: "84%"
  };

  return (
    <div className="profile-container animate-fade-in">
      {/* Two Column Layout */}
      <div className="pr-layout">
        
        {/* Left Side: Profile ID Card */}
        <div className="pr-profile-card content-card">
          <div className="pr-avatar-container">
            <div className="pr-avatar-circle">
              <span>{user.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="pr-avatar-badge">
              <Sparkles size={12} fill="currentColor" /> Active
            </div>
          </div>

          <div className="pr-details">
            <h4>{user.name}</h4>
            <p className="pr-title">{user.title}</p>
            <p className="pr-dept">{user.department}</p>
          </div>

          <div className="pr-divider"></div>

          <div className="pr-info-list">
            <div className="pr-info-item">
              <Mail size={16} className="info-icon" />
              <span>{user.email}</span>
            </div>
            <div className="pr-info-item">
              <Phone size={16} className="info-icon" />
              <span>{user.phone}</span>
            </div>
            <div className="pr-info-item">
              <MapPin size={16} className="info-icon" />
              <span>{user.location}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Stats & Settings */}
        <div className="pr-main-panel">
          
          {/* Stats Grid */}
          <div className="pr-stats-card content-card">
            <h3>Learning Metrics</h3>
            <div className="pr-stats-grid">
              <div className="pr-stat-box">
                <span className="pr-stat-val">{metrics.totalXp}</span>
                <span className="pr-stat-label">Total XP Points</span>
              </div>
              <div className="pr-stat-box">
                <span className="pr-stat-val">{metrics.completedSessions}</span>
                <span className="pr-stat-label">Completed Sessions</span>
              </div>
              <div className="pr-stat-box">
                <span className="pr-stat-val">{metrics.averageAccuracy}</span>
                <span className="pr-stat-label">Average Accuracy</span>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="pr-settings-card content-card">
            <div className="pr-settings-header">
              <Sliders size={20} className="settings-icon" />
              <h3>Training Preferences</h3>
            </div>
            <p className="card-description">
              Tweak speech evaluation metrics. Changing options immediately updates your voice coach settings.
            </p>

            <div className="settings-options-list">
              
              {/* Option 1: Grammar */}
              <div className="setting-option-item">
                <div className="setting-text">
                  <span className="setting-title">Strict Grammar Evaluation</span>
                  <span className="setting-desc">Flags slight grammatical errors during simulation call review.</span>
                </div>
                <button 
                  className={`toggle-switch-btn ${currentGrammarStrict ? 'active' : ''}`}
                  onClick={handleToggleGrammar}
                >
                  <div className="toggle-handle"></div>
                </button>
              </div>

              {/* Option 2: Speech Coaching */}
              <div className="setting-option-item">
                <div className="setting-text">
                  <span className="setting-title">Real-time Vocal Coaching</span>
                  <span className="setting-desc">Displays pronunciation and pacing suggestions on-screen.</span>
                </div>
                <button 
                  className={`toggle-switch-btn ${currentSpeechCoaching ? 'active' : ''}`}
                  onClick={handleToggleCoaching}
                >
                  <div className="toggle-handle"></div>
                </button>
              </div>

              {/* Option 3: Speech Threshold slider */}
              <div className="setting-slider-item">
                <div className="setting-text">
                  <span className="setting-title">Speech Match Threshold ({currentSpeechThreshold}%)</span>
                  <span className="setting-desc">Sets the accuracy score required to pass oral assessments.</span>
                </div>
                <div className="slider-wrapper">
                  <input 
                    type="range" 
                    min="50" 
                    max="95" 
                    value={currentSpeechThreshold} 
                    onChange={handleThresholdChange}
                    className="threshold-slider"
                  />
                  <span className="slider-value">{currentSpeechThreshold}%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
