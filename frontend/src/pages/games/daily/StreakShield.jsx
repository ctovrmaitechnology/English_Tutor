import { useState, useEffect } from 'react';
import { Shield, Zap } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import { CompanionEvents } from '../../../components';
import './StreakShield.css';

export default function StreakShield({ onBack }) {
  const [phase, setPhase]     = useState('loading');
  const [streakInfo, setStreakInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => { loadInfo(); }, []);

  const loadInfo = async () => {
    try {
      const res = await gamesService.daily.getStreakInfo();
      setStreakInfo(res.data);
      setPhase('ready');
    } catch {
      setError('Failed to load streak info.');
      setPhase('ready');
    }
  };

  const useShield = async () => {
    try {
      const res = await gamesService.daily.useShield();
      setMessage(res.data.message);
      await loadInfo();
    } catch (err) {
      setError(err?.response?.data?.message || 'No shields available!');
    }
  };

  if (phase === 'loading') {
    return (
      <div className="streak-shield">
        <GameHeader title="Streak Shield" score={0} onBack={onBack} />
        <GameLoading message="Loading your shields..." />
      </div>
    );
  }

  const shields = streakInfo?.shields || 0;

  return (
    <div className="streak-shield">
      <GameHeader title="Streak Shield" score={0} onBack={onBack} />

      <div className="ss-game">

        {/* Shield display */}
        <div className="ss-shield-display">
          <div className="ss-shields-row">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`ss-shield ${i < shields ? 'ss-shield--active' : 'ss-shield--empty'}`}>
                <Shield size={36} fill={i < shields ? '#3b82f6' : 'none'} color={i < shields ? '#3b82f6' : '#d1d5db'} />
              </div>
            ))}
          </div>
          <p className="ss-shield-count">
            {shields} / 3 shields
          </p>
        </div>

        {/* Info card */}
        <div className="ss-info-card">
          <h3 className="ss-info-title">🛡️ What are Streak Shields?</h3>
          <p className="ss-info-text">
            Streak Shields protect your daily streak if you miss a day.
            When you miss a day, a shield is automatically used to keep your streak alive.
          </p>
          <div className="ss-info-steps">
            <div className="ss-step">
              <span className="ss-step-icon">🎮</span>
              <span>Play games 7 days in a row</span>
            </div>
            <div className="ss-step">
              <span className="ss-step-icon">🛡️</span>
              <span>Earn 1 streak shield</span>
            </div>
            <div className="ss-step">
              <span className="ss-step-icon">✅</span>
              <span>Hold up to 3 shields at once</span>
            </div>
          </div>
        </div>

        {/* How to earn */}
        <div className="ss-earn-card">
          <h4 className="ss-earn-title">How to earn shields:</h4>
          <p className="ss-earn-text">Complete any game 7 days in a row to earn a shield automatically.</p>
          <div className="ss-streak-visual">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className={`ss-day ${i < 5 ? 'ss-day--done' : ''}`}>
                <div className="ss-day-circle">✓</div>
                <span className="ss-day-label">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Use shield manually */}
        {shields > 0 && (
          <button className="ss-use-btn" onClick={useShield}>
            <Shield size={18} />
            Use a Shield Now
          </button>
        )}

        {/* Messages */}
        {message && <p className="ss-success-msg">✅ {message}</p>}
        {error && <p className="game-error">{error}</p>}

        <p className="ss-tip">{streakInfo?.message}</p>

      </div>
    </div>
  );
}