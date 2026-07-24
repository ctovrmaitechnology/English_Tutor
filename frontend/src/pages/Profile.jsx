import { useState, useCallback, useEffect } from 'react';
import './Profile.css';
import { Mail, Phone, MapPin, Sliders, Sparkles } from 'lucide-react';
import { useUser } from '../context/UserContext';
import api from '../services/api';

const CHARACTERS = [
  { id: 'eva', name: 'Eva', emoji: '👩', color: '#6366f1', gradient: 'linear-gradient(135deg,#4f46e5,#7c3aed)', available: true },
  { id: 'zap', name: 'Zap', emoji: '⚡', color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#ef4444)', available: true },
  { id: 'tecci', name: 'Tecci', emoji: '🤖', color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#0891b2)', available: true },
  { id: 'buffy', name: 'Buffy', emoji: '🌟', color: '#ec4899', gradient: 'linear-gradient(135deg,#db2777,#a855f7)', available: true },
];

export default function Profile({ user: currentUser, character: currentCharacter }) {
  const { updateCharacter } = useUser();
  const [selectedChar, setSelectedChar] = useState(currentCharacter || 'warrior');
  const [savingChar, setSavingChar] = useState(false);
  const [charSaved, setCharSaved] = useState(false);
  const [charError, setCharError] = useState('');

  const [grammarStrict, setGrammarStrict] = useState(true);
  const [speechCoaching, setSpeechCoaching] = useState(true);
  const [speechThreshold, setSpeechThreshold] = useState(80);

  // Sync selected character when prop changes
  useEffect(() => {
    if (currentCharacter) setSelectedChar(currentCharacter);
  }, [currentCharacter]);

  const handleToggleGrammar = useCallback(() => setGrammarStrict(prev => !prev), []);
  const handleToggleCoaching = useCallback(() => setSpeechCoaching(prev => !prev), []);
  const handleThresholdChange = useCallback((e) => setSpeechThreshold(Number(e.target.value)), []);

  const handleSaveCharacter = async () => {
    if (selectedChar === currentCharacter) return;
    setSavingChar(true); setCharError(''); setCharSaved(false);
    try {
      await updateCharacter(selectedChar);
      setCharSaved(true);
      setTimeout(() => setCharSaved(false), 3000);
    } catch {
      setCharError('Failed to save character. Please try again.');
    } finally { setSavingChar(false); }
  };

  const user = {
    name: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Agent',
    title: 'Voice Process Associate',
    department: 'Customer Support - Inbound Telecom',
    email: currentUser?.email || 'agent@company.com',
    phone: currentUser?.phone || '+91 98765 43210',
    location: 'Chennai, India',
  };

  const activeChar = CHARACTERS.find(c => c.id === selectedChar) || CHARACTERS[0];

  return (
    <div className="profile-container animate-fade-in">
      <div className="pr-layout">

        {/* Left: Profile Card */}
        <div className="pr-profile-card content-card">
          <div className="pr-avatar-container">
            <div className="pr-avatar-circle">
              <span>{user.name.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="pr-avatar-badge"><Sparkles size={12} fill="currentColor" /> Active</div>
          </div>
          <div className="pr-details">
            <h4>{user.name}</h4>
            <p className="pr-title">{user.title}</p>
            <p className="pr-dept">{user.department}</p>
          </div>
          <div className="pr-divider" />
          <div className="pr-info-list">
            <div className="pr-info-item"><Mail size={16} className="info-icon" /><span>{user.email}</span></div>
            <div className="pr-info-item"><Phone size={16} className="info-icon" /><span>{user.phone}</span></div>
            <div className="pr-info-item"><MapPin size={16} className="info-icon" /><span>{user.location}</span></div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="pr-main-panel">

          {/* Character Selection */}
          <div className="content-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>🎮</span>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Your Learning Buddy</h3>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
              Choose the 3D character that guides you through lessons, games, and practice sessions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
              {CHARACTERS.map(char => (
                <div
                  key={char.id}
                  onClick={() => char.available && setSelectedChar(char.id)}
                  style={{
                    borderRadius: 14, padding: '14px 8px', textAlign: 'center',
                    cursor: char.available ? 'pointer' : 'not-allowed',
                    opacity: char.available ? 1 : 0.45,
                    border: `2px solid ${selectedChar === char.id ? char.color : '#e2e8f0'}`,
                    background: selectedChar === char.id ? `${char.color}12` : '#f8fafc',
                    transform: selectedChar === char.id ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.15s', position: 'relative',
                  }}
                >
                  {!char.available && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: '#e2e8f0', color: '#94a3b8', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 10 }}>Soon</div>
                  )}
                  {selectedChar === char.id && char.available && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: char.color, color: '#fff', width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>✓</div>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{char.emoji}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>{char.name}</div>
                </div>
              ))}
            </div>

            {charError && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', color: '#991b1b', fontSize: 12, marginBottom: 12 }}>⚠️ {charError}</div>}
            {charSaved && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', color: '#065f46', fontSize: 12, marginBottom: 12 }}>✅ Character updated! Reload the page to see your new buddy.</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, padding: '10px 14px', background: activeChar.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{activeChar.emoji}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Currently: {activeChar.name}</div>
                </div>
              </div>
              <button
                onClick={handleSaveCharacter}
                disabled={savingChar || selectedChar === currentCharacter}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: selectedChar === currentCharacter ? '#e2e8f0' : '#6366f1',
                  color: selectedChar === currentCharacter ? '#94a3b8' : '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: selectedChar === currentCharacter ? 'default' : 'pointer',
                  opacity: savingChar ? 0.7 : 1,
                }}
              >
                {savingChar ? 'Saving...' : selectedChar === currentCharacter ? 'Current' : 'Save Change'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}