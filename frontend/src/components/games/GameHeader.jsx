import { ArrowLeft, Heart, Zap, Clock } from 'lucide-react';
import './GameHeader.css';

export default function GameHeader({
  title,
  score = 0,
  lives = null,
  timer = null,
  streak = 0,
  onBack,
}) {
  return (
    <div className="game-header">
      <button className="game-back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
      </button>

      <div className="game-title">{title}</div>

      <div className="game-header-stats">
        {lives !== null && (
          <div className="game-stat">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                size={18}
                fill={i < lives ? '#ef4444' : 'none'}
                color={i < lives ? '#ef4444' : '#d1d5db'}
              />
            ))}
          </div>
        )}

        {streak > 0 && (
          <div className="game-stat game-streak">
            <Zap size={16} fill="#f59e0b" color="#f59e0b" />
            <span>{streak}x</span>
          </div>
        )}

        {timer !== null && (
          <div className={`game-stat game-timer ${timer <= 10 ? 'game-timer--urgent' : ''}`}>
            <Clock size={16} />
            <span>{timer}s</span>
          </div>
        )}

        <div className="game-stat game-score">
          <Zap size={16} color="#6366f1" />
          <span>{score}</span>
        </div>
      </div>
    </div>
  );
}