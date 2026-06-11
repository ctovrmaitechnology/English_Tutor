import { useState, useEffect } from 'react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import { CompanionEvents } from '../../../components';
import './SpinWheel.css';

const REWARDS = [
  { id: 'DOUBLE_XP',       label: 'Double XP',      emoji: '⚡', color: '#6366f1' },
  { id: 'BONUS_XP_50',     label: '+50 XP',          emoji: '🌟', color: '#f59e0b' },
  { id: 'BONUS_XP_100',    label: '+100 XP',         emoji: '💎', color: '#10b981' },
  { id: 'VOCAB_CHALLENGE', label: 'Vocab Challenge', emoji: '📚', color: '#3b82f6' },
  { id: 'STREAK_SAVE',     label: 'Streak Shield',   emoji: '🛡️', color: '#ec4899' },
  { id: 'MYSTERY_WORD',    label: 'Mystery Word',    emoji: '🔮', color: '#8b5cf6' },
];

export default function SpinWheel({ onBack }) {
  const [phase, setPhase]       = useState('checking');
  const [canSpin, setCanSpin]   = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reward, setReward]     = useState(null);
  const [activeReward, setActiveReward] = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    checkSpin();
  }, []);

  const checkSpin = async () => {
    try {
      const res = await gamesService.daily.checkSpin();
      setCanSpin(res.data.canSpin);
      setHoursLeft(res.data.hoursUntilNextSpin || 0);
      if (!res.data.canSpin && res.data.lastReward) {
        setActiveReward(res.data.lastReward);
      }
      setPhase('ready');
    } catch {
      setPhase('ready');
    }
  };

  const handleSpin = async () => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setError('');

    // Animate wheel spinning
    const spinDeg = 1440 + Math.floor(Math.random() * 360);
    setRotation(prev => prev + spinDeg);

    try {
      // Wait for animation then get result
      await new Promise(r => setTimeout(r, 3000));

      const res = await gamesService.daily.spin();
      const data = res.data;

      setReward(data.reward);
      setCanSpin(false);
      setPhase('result');
      CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
    } catch {
      setError('Failed to spin. Please try again.');
      setIsSpinning(false);
    }
  };

  if (phase === 'checking') {
    return (
      <div className="spin-wheel">
        <GameHeader title="Daily Spin Wheel" score={0} onBack={onBack} />
        <GameLoading message="Checking your daily spin..." />
      </div>
    );
  }

  return (
    <div className="spin-wheel">
      <GameHeader title="Daily Spin Wheel" score={0} onBack={onBack} />

      <div className="sw-game">

        <div className="sw-title">
          {canSpin ? '🎰 Your daily spin is ready!' : `⏰ Next spin in ${hoursLeft}h`}
        </div>

        {/* Wheel */}
        <div className="sw-wheel-container">
          <div className="sw-pointer">▼</div>
          <div
            className="sw-wheel"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {REWARDS.map((r, i) => {
              const angle = (360 / REWARDS.length) * i;
              return (
                <div
                  key={r.id}
                  className="sw-segment"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    background: `${r.color}22`,
                    borderTop: `3px solid ${r.color}`,
                  }}
                >
                  <div
                    className="sw-segment-content"
                    style={{ transform: `rotate(${360 / REWARDS.length / 2}deg)` }}
                  >
                    <span className="sw-emoji">{r.emoji}</span>
                    <span className="sw-label">{r.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Result */}
        {phase === 'result' && reward && (
          <div className="sw-reward-card">
            <div className="sw-reward-emoji">{reward.emoji}</div>
            <h3 className="sw-reward-label">{reward.label}</h3>
            <p className="sw-reward-desc">{reward.description}</p>
            {reward.mysteryWord && (
              <div className="sw-mystery-word">
                <p className="sw-mystery-label">🔮 Your mystery word:</p>
                <p className="sw-mystery-term">{reward.mysteryWord.word}</p>
                <p className="sw-mystery-meaning">{reward.mysteryWord.meaning}</p>
                <p className="sw-mystery-challenge">{reward.mysteryWord.challenge}</p>
              </div>
            )}
            {reward.xpAwarded > 0 && (
              <div className="sw-xp-earned">⚡ +{reward.xpAwarded} XP earned!</div>
            )}
          </div>
        )}

        {/* Already spun today */}
        {!canSpin && phase !== 'result' && activeReward && (
          <div className="sw-already-spun">
            <p>You already spun today!</p>
            <p className="sw-already-reward">Today's reward: <b>{activeReward}</b></p>
          </div>
        )}

        {/* Spin button */}
        {canSpin && phase !== 'result' && (
          <button
            className={`sw-spin-btn ${isSpinning ? 'sw-spin-btn--spinning' : ''}`}
            onClick={handleSpin}
            disabled={isSpinning}
          >
            {isSpinning ? '🎰 Spinning...' : '🎰 SPIN!'}
          </button>
        )}

        {/* Reward list */}
        <div className="sw-rewards-list">
          <p className="sw-rewards-title">Possible rewards:</p>
          <div className="sw-rewards-grid">
            {REWARDS.map(r => (
              <div key={r.id} className="sw-reward-item">
                <span>{r.emoji}</span>
                <span style={{ color: r.color }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="game-error">{error}</p>}

      </div>
    </div>
  );
}