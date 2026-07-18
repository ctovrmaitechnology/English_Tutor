import { useState, useEffect, useRef } from 'react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './EmailRace.css';

export default function EmailRace({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [requiredPoints, setRequiredPoints] = useState([]);
  const [timeLimit, setTimeLimit] = useState(180);
  const [timeLeft, setTimeLeft]   = useState(180);
  const [reply, setReply]         = useState('');
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startGame = async () => {
    clearInterval(timerRef.current);
    setReply('');
    setResult(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.bpo.startEmailRace({
        gameType: 'EMAIL_RACE',
        category: 'BPO',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setCustomerEmail(res.data.customerEmail);
      setRequiredPoints(res.data.requiredPoints || []);
      setTimeLimit(res.data.timeLimit || 180);
      setTimeLeft(res.data.timeLimit || 180);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  const handleSubmit = async (auto = false) => {
    if (isSubmitting) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const res = await gamesService.bpo.submitEmailRace(
        session.id,
        { answer: reply, timeMs: (timeLimit - timeLeft) * 1000 }
      );
      setResult(res.data);
      setPhase('result');
      CompanionEvents.emit('CHALLENGE_COMPLETED');
    } catch {
      setError('Submission failed.');
      setPhase('playing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerUrgent = timeLeft <= 30;

  if (phase === 'idle') {
    return (
      <div className="email-race">
        <GameHeader title="Email Race" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">✉️</div>
          <h2>Email Race</h2>
          <p>Write a professional email reply before time runs out!</p>
          <div className="game-intro-rules">
            <div className="rule">📧 Read the customer complaint email</div>
            <div className="rule">✍️ Write a <b>professional reply</b></div>
            <div className="rule">☑️ Cover all required points</div>
            <div className="rule">⏰ Time limit: <b>{difficulty === 'ADVANCED' ? '90s' : difficulty === 'INTERMEDIATE' ? '120s' : '180s'}</b></div>
            <div className="rule">🤖 AI grades grammar, tone & completeness</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Email</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="email-race">
        <GameHeader title="Email Race" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading' ? 'Generating customer complaint...' : 'AI is grading your email...'} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="email-race">
        <GameHeader title="Email Race" score={result.score} onBack={onBack} />
        <ScoreScreen
          score={result.score}
          maxScore={0}
          xpEarned={result.xpEarned || 0}
          feedback={result.tooSlow ? '⚠️ Time up penalty applied' : 'Email submitted!'}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="er-result">
            <div className="er-breakdown">
              {[
                { label: 'Grammar',       value: result.breakdown?.grammar },
                { label: 'Tone',          value: result.breakdown?.tone },
                { label: 'Completeness',  value: result.breakdown?.completeness },
                { label: 'Professional',  value: result.breakdown?.professionalism },
              ].map((item, i) => (
                <div key={i} className="er-breakdown-item">
                  <span>{item.label}</span>
                  <span className="er-breakdown-score">{item.value}/25</span>
                </div>
              ))}
            </div>
            {result.missedPoints?.length > 0 && (
              <div className="er-missed">
                <p className="er-missed-label">❌ Missed points:</p>
                {result.missedPoints.map((p, i) => <p key={i} className="er-missed-item">• {p}</p>)}
              </div>
            )}
            {result.suggestions?.length > 0 && (
              <div className="er-suggestions">
                <p className="er-suggestions-label">💡 Suggestions:</p>
                {result.suggestions.map((s, i) => <p key={i} className="er-suggestion-item">• {s}</p>)}
              </div>
            )}
          </div>
        </ScoreScreen>
      </div>
    );
  }

  return (
    <div className="email-race">
      <GameHeader title="Email Race" score={0} onBack={onBack} />

      <div className="er-game">

        <div className={`er-timer ${timerUrgent ? 'er-timer--urgent' : ''}`}>
          ⏰ {mins}:{secs.toString().padStart(2, '0')}
        </div>

        <div className="er-customer-email">
          <p className="er-email-label">📥 Customer Email:</p>
          <p className="er-email-body">{customerEmail}</p>
        </div>

        <div className="er-required-points">
          <p className="er-points-label">✅ Your reply must cover:</p>
          <div className="er-points-list">
            {requiredPoints.map((point, i) => (
              <span key={i} className="er-point-chip">{point}</span>
            ))}
          </div>
        </div>

        <div className="er-reply-box">
          <p className="er-reply-label">✍️ Your Reply:</p>
          <textarea
            className="er-textarea"
            placeholder="Dear [Customer Name],&#10;&#10;Thank you for reaching out..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={8}
          />
          <div className="er-word-count">{reply.split(/\s+/).filter(Boolean).length} words</div>
        </div>

        <button
          className="game-start-btn"
          onClick={() => handleSubmit()}
          disabled={isSubmitting || !reply.trim()}
        >
          Submit Email
        </button>

      </div>
    </div>
  );
}