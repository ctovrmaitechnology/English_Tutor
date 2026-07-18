import { Trophy, Zap, Star, RotateCcw, ArrowLeft } from 'lucide-react';
import './ScoreScreen.css';

export default function ScoreScreen({
  score,
  maxScore,
  xpEarned,
  isPersonalBest = false,
  feedback = '',
  onPlayAgain,
  onBack,
  children,
}) {
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : score;
  const grade = percentage >= 90 ? 'S' : percentage >= 75 ? 'A'
    : percentage >= 60 ? 'B' : percentage >= 40 ? 'C' : 'D';

  const gradeColor = {
    S: '#f59e0b', A: '#10b981',
    B: '#3b82f6', C: '#f97316', D: '#ef4444',
  }[grade];

  return (
    <div className="score-screen">
      <div className="score-screen-card">

        {isPersonalBest && (
          <div className="score-new-record">
            🎉 New Personal Best!
          </div>
        )}

        {/* Grade circle */}
        <div className="score-grade" style={{ borderColor: gradeColor, color: gradeColor }}>
          {grade}
        </div>

        {/* Score */}
        <div className="score-points">
          <span className="score-number">{score}</span>
          {maxScore > 0 && (
            <span className="score-max"> / {maxScore}</span>
          )}
        </div>

        {/* XP earned */}
        <div className="score-xp">
          <Zap size={18} fill="#f59e0b" color="#f59e0b" />
          <span>+{xpEarned} XP earned</span>
        </div>

        {/* Feedback */}
        {feedback && (
          <p className="score-feedback">{feedback}</p>
        )}

        {/* Extra content (breakdowns etc) */}
        {children}

        {/* Actions */}
        <div className="score-actions">
          <button className="score-btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <button className="score-btn-primary" onClick={onPlayAgain}>
            <RotateCcw size={16} />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}