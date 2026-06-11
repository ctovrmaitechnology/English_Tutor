import { useState, useEffect, useRef } from 'react';
import { Send, Zap } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './SynonymStorm.css';

const TIME_LIMIT = 30;

export default function SynonymStorm({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [targetWord, setTargetWord] = useState('');
  const [input, setInput]         = useState('');
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // ── Timer countdown ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true); // auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Start game ───────────────────────────────────────────────
  const startGame = async () => {
    setPhase('loading');
    setError('');
    setInput('');
    setResult(null);
    setTimeLeft(TIME_LIMIT);

    try {
      const res = await gamesService.vocabulary.startSynonymStorm({
        gameType: 'SYNONYM_STORM',
        category: 'VOCABULARY',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setTargetWord(res.data.word);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  // ── Submit synonyms ──────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    if (isSubmitting) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const res = await gamesService.vocabulary.submitSynonymStorm(
        session.id,
        { answer: input, timeMs: (TIME_LIMIT - timeLeft) * 1000 }
      );

      setResult(res.data);
      setPhase('result');

      if (res.data.score >= 50) {
        CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
      } else {
        CompanionEvents.emit('CHALLENGE_COMPLETED');
      }
    } catch {
      setError('Failed to submit. Please try again.');
      setPhase('playing');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="synonym-storm">
        <GameHeader title="Synonym Storm" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">⚡</div>
          <h2>Synonym Storm</h2>
          <p>Find as many synonyms as possible for the given word!</p>
          <div className="game-intro-rules">
            <div className="rule">📝 Type synonyms separated by <b>commas</b></div>
            <div className="rule">⏰ You have <b>30 seconds</b></div>
            <div className="rule">✅ Each valid synonym = <b>+10 points</b></div>
            <div className="rule">🤖 AI validates every word you submit</div>
            <div className="rule">💡 Example: <b>assist, support, aid, help</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="synonym-storm">
        <GameHeader title="Synonym Storm" score={0} onBack={onBack} />
        <GameLoading message="AI is picking a word for you..." />
      </div>
    );
  }

  // ── Submitting ───────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className="synonym-storm">
        <GameHeader title="Synonym Storm" score={0} onBack={onBack} />
        <GameLoading message="AI is checking your synonyms..." />
      </div>
    );
  }

  // ── Result ───────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div className="synonym-storm">
        <GameHeader title="Synonym Storm" score={result.score} onBack={onBack} />
        <ScoreScreen
          score={result.score}
          maxScore={0}
          xpEarned={result.xpEarned || 0}
          feedback={`You found ${result.validSynonyms?.length || 0} valid synonyms!`}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="ss-result-grid">

            {/* Valid synonyms */}
            {result.validSynonyms?.length > 0 && (
              <div className="ss-result-section">
                <h4 className="ss-result-label ss-result-label--valid">
                  ✅ Valid ({result.validSynonyms.length})
                </h4>
                <div className="ss-chips">
                  {result.validSynonyms.map((word, i) => (
                    <span key={i} className="ss-chip ss-chip--valid">{word}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Invalid words */}
            {result.invalidWords?.length > 0 && (
              <div className="ss-result-section">
                <h4 className="ss-result-label ss-result-label--invalid">
                  ❌ Not synonyms ({result.invalidWords.length})
                </h4>
                <div className="ss-chips">
                  {result.invalidWords.map((word, i) => (
                    <span key={i} className="ss-chip ss-chip--invalid">{word}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Missed synonyms */}
            {result.missedSynonyms?.length > 0 && (
              <div className="ss-result-section">
                <h4 className="ss-result-label ss-result-label--missed">
                  💡 You could have said ({result.missedSynonyms.length})
                </h4>
                <div className="ss-chips">
                  {result.missedSynonyms.map((word, i) => (
                    <span key={i} className="ss-chip ss-chip--missed">{word}</span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </ScoreScreen>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  const timerPercent = (timeLeft / TIME_LIMIT) * 100;
  const timerUrgent  = timeLeft <= 10;

  return (
    <div className="synonym-storm">
      <GameHeader title="Synonym Storm" score={0} onBack={onBack} />

      <div className="ss-game">

        {/* Timer */}
        <div className="ss-timer">
          <div className="ss-timer-track">
            <div
              className={`ss-timer-bar ${timerUrgent ? 'ss-timer-bar--urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span className={`ss-timer-num ${timerUrgent ? 'ss-timer-num--urgent' : ''}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Target word */}
        <div className="ss-word-box">
          <p className="ss-word-label">Find synonyms for:</p>
          <div className="ss-word">{targetWord}</div>
          <p className="ss-word-hint">
            Type as many synonyms as you can, separated by commas
          </p>
        </div>

        {/* Input */}
        <div className="ss-input-area">
          <textarea
            ref={inputRef}
            className="ss-textarea"
            placeholder={`e.g. help, support, aid, assist...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            rows={3}
          />

          {/* Live word count */}
          <div className="ss-word-count">
            {input.split(',').filter(w => w.trim()).length} words typed
          </div>

          <button
            className="ss-submit-btn"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !input.trim()}
          >
            <Send size={18} />
            Submit Synonyms
          </button>
        </div>

        {/* Example chips */}
        <div className="ss-example-box">
          <p className="ss-example-label">💡 Keep going — more = higher score!</p>
        </div>

      </div>
    </div>
  );
}