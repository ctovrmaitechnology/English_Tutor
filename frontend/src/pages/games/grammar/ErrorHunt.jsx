import { useState, useEffect, useRef } from 'react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './ErrorHunt.css';

const TIME_LIMIT = 120;

export default function ErrorHunt({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [paragraph, setParagraph] = useState('');
  const [totalErrors, setTotalErrors] = useState(3);
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT);
  const [foundErrors, setFoundErrors] = useState([]);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Each error entry: { errorWord, correction }
  const [currentError, setCurrentError] = useState({ errorWord: '', correction: '' });

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
    setFoundErrors([]);
    setResult(null);
    setCurrentError({ errorWord: '', correction: '' });
    setTimeLeft(TIME_LIMIT);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.grammar.startErrorHunt({
        gameType: 'ERROR_HUNT',
        category: 'GRAMMAR',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setParagraph(res.data.paragraph);
      setTotalErrors(res.data.totalErrors);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  const addError = () => {
    if (!currentError.errorWord.trim() || !currentError.correction.trim()) return;
    if (foundErrors.length >= totalErrors) return;

    setFoundErrors(prev => [...prev, { ...currentError }]);
    setCurrentError({ errorWord: '', correction: '' });
  };

  const removeError = (index) => {
    setFoundErrors(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (auto = false) => {
    if (isSubmitting) return;
    clearInterval(timerRef.current);
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const res = await gamesService.grammar.submitErrorHunt(
        session.id,
        { answer: JSON.stringify(foundErrors), timeMs: 0 }
      );

      setResult(res.data);
      setPhase('result');
      CompanionEvents.emit('CHALLENGE_COMPLETED');
    } catch {
      setError('Submission failed. Please try again.');
      setPhase('playing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="error-hunt">
        <GameHeader title="Error Hunt" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🔎</div>
          <h2>Error Hunt</h2>
          <p>Find the grammar errors hiding in the paragraph!</p>
          <div className="game-intro-rules">
            <div className="rule">📖 Read the paragraph carefully</div>
            <div className="rule">🔍 Find <b>{totalErrors} grammar errors</b></div>
            <div className="rule">✏️ Enter the wrong word and the correction</div>
            <div className="rule">⏰ You have <b>2 minutes</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="error-hunt">
        <GameHeader title="Error Hunt" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading' ? 'AI is writing the paragraph...' : 'AI is checking your answers...'} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="error-hunt">
        <GameHeader title="Error Hunt" score={result.score} onBack={onBack} />
        <ScoreScreen
          score={result.score}
          maxScore={0}
          xpEarned={result.xpEarned || 0}
          feedback={result.message}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="eh-result">
            {result.found?.map((f, i) => (
              <div key={i} className={`eh-result-item ${f.correct ? 'eh-result-item--correct' : 'eh-result-item--wrong'}`}>
                {f.correct ? '✅' : '❌'} "{f.errorWord}" — {f.feedback}
              </div>
            ))}
            {result.missed?.map((m, i) => (
              <div key={i} className="eh-result-item eh-result-item--missed">
                💡 Missed: "{m.errorWord}" → "{m.correctWord}" — {m.explanation}
              </div>
            ))}
          </div>
        </ScoreScreen>
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerUrgent = timeLeft <= 30;

  return (
    <div className="error-hunt">
      <GameHeader title="Error Hunt" score={0} onBack={onBack} />

      <div className="eh-game">

        {/* Timer */}
        <div className={`eh-timer ${timerUrgent ? 'eh-timer--urgent' : ''}`}>
          ⏰ {mins}:{secs.toString().padStart(2, '0')} remaining
        </div>

        {/* Paragraph */}
        <div className="eh-paragraph-box">
          <p className="eh-paragraph-label">Find {totalErrors} grammar errors:</p>
          <p className="eh-paragraph">{paragraph}</p>
        </div>

        {/* Error input */}
        <div className="eh-input-box">
          <p className="eh-input-label">
            Add an error ({foundErrors.length}/{totalErrors} found):
          </p>

          <div className="eh-input-row">
            <input
              type="text"
              className="eh-input"
              placeholder="Wrong word"
              value={currentError.errorWord}
              onChange={e => setCurrentError(prev => ({ ...prev, errorWord: e.target.value }))}
            />
            <span className="eh-arrow">→</span>
            <input
              type="text"
              className="eh-input"
              placeholder="Correction"
              value={currentError.correction}
              onChange={e => setCurrentError(prev => ({ ...prev, correction: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addError()}
            />
            <button className="eh-add-btn" onClick={addError}
              disabled={!currentError.errorWord.trim() || !currentError.correction.trim() || foundErrors.length >= totalErrors}>
              Add
            </button>
          </div>

          {/* Added errors */}
          <div className="eh-errors-list">
            {foundErrors.map((err, i) => (
              <div key={i} className="eh-error-tag">
                <span>"{err.errorWord}" → "{err.correction}"</span>
                <button onClick={() => removeError(i)} className="eh-remove-btn">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          className="game-start-btn"
          onClick={() => handleSubmit()}
          disabled={isSubmitting || foundErrors.length === 0}
        >
          Submit Errors ({foundErrors.length}/{totalErrors})
        </button>

      </div>
    </div>
  );
}