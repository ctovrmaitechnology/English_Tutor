import { useState, useEffect, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './WordChain.css';

const TURN_TIME = 8; // seconds per turn — 8s is more comfortable

export default function WordChain({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase] = useState('idle');
  const [session, setSession] = useState(null);
  const [aiWord, setAiWord] = useState('');
  const [nextLetter, setNextLetter] = useState('');
  const [userInput, setUserInput] = useState('');
  const [chain, setChain] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(TURN_TIME);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [error, setError] = useState('');
  const [timerKey, setTimerKey] = useState(0); // increment to restart timer

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const startTimeRef = useRef(null);
  const isSubmittingRef = useRef(false); // ref for use inside timer callbacks

  // Keep ref in sync with state
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // ── Timer ───────────────────────────────────────────────────
  // timerKey or aiWord change = restart timer
  useEffect(() => {
    if (phase !== 'playing') return;

    clearInterval(timerRef.current);
    setTimeLeft(TURN_TIME);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerKey, aiWord, phase]);

  // ── Timeout trigger ─────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing' && !isSubmittingRef.current) {
      handleTimeOut();
    }
  }, [timeLeft]);

  // ── Start Game ──────────────────────────────────────────────
  const startGame = async () => {
    // Reset all state first
    clearInterval(timerRef.current);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setFeedback(null);
    setUserInput('');
    setChain([]);
    setScore(0);
    setLives(3);
    setTimeLeft(TURN_TIME);
    setFinalData(null);
    setTimerKey(0);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.vocabulary.startWordChain({
        gameType: 'WORD_CHAIN',
        category: 'VOCABULARY',
        difficulty,
      });

      const { sessionId, aiWord: word, nextLetter: letter } = res.data;

      setSession({ id: sessionId });
      setAiWord(word);
      setNextLetter(letter);
      setChain([{ by: 'ai', word }]);
      setPhase('playing');

      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  // ── Handle Timeout ──────────────────────────────────────────
  const handleTimeOut = useCallback(async () => {
    if (isSubmittingRef.current) return;

    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const res = await gamesService.vocabulary.playWordChain(
        session?.id,
        { answer: '', timeMs: (TURN_TIME + 1) * 1000 }
      );

      const data = res.data;
      const remaining = data.lives ?? 0;

      setLives(remaining);
      setFeedback({
        type: 'error',
        message: `⏰ Too slow! -1 life. ${remaining} ❤️ left`,
      });

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
        }, 1500);
        return;
      }

      // Restart timer for next attempt on same word
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1); // ← restarts the timer
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [session]);

  // ── Submit Word ─────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const word = userInput.trim().toLowerCase();
    if (!word || isSubmittingRef.current || phase !== 'playing') return;

    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

const timeTaken = (TURN_TIME - timeLeft) * 1000 + 500;

    try {
      const res = await gamesService.vocabulary.playWordChain(session.id, {
        answer: word,
        timeMs: timeTaken,
      });

      const data = res.data;

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        if (data.reason === 'AI_STUCK') {
          CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
        }
        return;
      }

      if (data.valid) {
        // ✅ Valid — update chain, show new AI word
        setChain(prev => [
          ...prev,
          { by: 'user', word },
          { by: 'ai', word: data.aiWord },
        ]);
        setAiWord(data.aiWord);       // ← aiWord change restarts timer
        setNextLetter(data.nextLetter);
        setScore(data.score);
        setFeedback(null);            // ← clear feedback on valid answer
        setUserInput('');
      } else {
        // ❌ Invalid word
        setLives(data.lives ?? lives - 1);
        setFeedback({
          type: 'error',
          message: `❌ ${data.reason} — ${data.lives} ❤️ left`,
        });

        if (data.lives <= 0) {
          setTimeout(() => {
            setFinalData({ ...data, finalScore: score });
            setPhase('gameover');
          }, 1500);
          return;
        }

        // Restart timer for retry
        setTimerKey(prev => prev + 1);
        setUserInput('');
      }

      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);

    } catch {
      setFeedback({ type: 'error', message: 'Something went wrong. Try again.' });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1);
    }
  }, [userInput, phase, session, score, lives]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // ── Idle ────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="word-chain">
        <GameHeader title="Word Chain vs AI" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🔗</div>
          <h2>Word Chain vs AI</h2>
          <p>Beat the AI in a word chain battle. Keep the chain going!</p>
          <div className="game-intro-rules">
            <div className="rule">🔗 Say a word starting with the <b>last letter</b> of AI's word</div>
            <div className="rule">⏰ You have <b>{TURN_TIME} seconds</b> per turn</div>
            <div className="rule">❌ Wrong word or too slow = <b>lose a life</b></div>
            <div className="rule">❤️ You have <b>3 lives</b></div>
            <div className="rule">🏆 If AI runs out of words — <b>you win!</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="word-chain">
        <GameHeader title="Word Chain vs AI" score={0} onBack={onBack} />
        <GameLoading message="AI is thinking of the first word..." />
      </div>
    );
  }

  // ── Game Over ───────────────────────────────────────────────
  if (phase === 'gameover') {
    const won = finalData?.reason === 'AI_STUCK';
    return (
      <div className="word-chain">
        <GameHeader
          title="Word Chain vs AI"
          score={finalData?.finalScore || score}
          onBack={onBack}
        />
        <ScoreScreen
          score={finalData?.finalScore || score}
          maxScore={0}
          xpEarned={finalData?.xpEarned || 0}
          feedback={won
            ? '🏆 You won! The AI ran out of words!'
            : `Game over! Chain length: ${chain.length} words`}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="wc-summary">
            <div className="wc-summary-item">
              <span className="wc-summary-label">Chain Length</span>
              <span className="wc-summary-value">{chain.length}</span>
            </div>
            <div className="wc-summary-item">
              <span className="wc-summary-label">Result</span>
              <span className="wc-summary-value">{won ? '🏆 You Won' : '💀 AI Won'}</span>
            </div>
          </div>
        </ScoreScreen>
      </div>
    );
  }

  // ── Playing ─────────────────────────────────────────────────
  const timerPercent = (timeLeft / TURN_TIME) * 100;
  const timerUrgent = timeLeft <= 3;

  return (
    <div className="word-chain">
      <GameHeader
        title="Word Chain vs AI"
        score={score}
        lives={lives}
        onBack={onBack}
      />

      <div className="wc-game">

        {/* Timer bar */}
        <div className="wc-timer">
          <div className="wc-timer-track">
            <div
              className={`wc-timer-bar ${timerUrgent ? 'wc-timer-bar--urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span className={`wc-timer-num ${timerUrgent ? 'wc-timer-num--urgent' : ''}`}>
            {timeLeft}s
          </span>
        </div>

        {/* AI word */}
        <div className="wc-ai-box">
          <div className="wc-ai-label">🤖 AI SAYS</div>
          <div className="wc-ai-word">{aiWord}</div>
          <div className="wc-next-hint">
            Your word must start with
            <span className="wc-letter">{nextLetter}</span>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`wc-feedback ${
            feedback.type === 'success'
              ? 'wc-feedback--success'
              : 'wc-feedback--error'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Input */}
        <div className="wc-input-row">
          <input
            ref={inputRef}
            type="text"
            className="wc-input"
            placeholder={`Word starting with "${nextLetter}"...`}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value.toLowerCase())}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            autoComplete="off"
            spellCheck="false"
          />
          <button
            className="wc-submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || !userInput.trim()}
          >
            <Send size={18} />
          </button>
        </div>

        {/* Chain history */}
        <div className="wc-chain">
          <div className="wc-chain-header">
            <span>Chain</span>
            <span className="wc-chain-count">{chain.length} words</span>
          </div>
          <div className="wc-chain-list">
            {[...chain].reverse().slice(0, 8).map((item, i) => (
              <div
                key={i}
                className={`wc-chain-item ${
                  item.by === 'ai' ? 'wc-chain-item--ai' : 'wc-chain-item--user'
                }`}
              >
                <span className="wc-chain-avatar">
                  {item.by === 'ai' ? '🤖' : '👤'}
                </span>
                <span className="wc-chain-word">{item.word}</span>
                {i === 0 && (
                  <span className="wc-chain-latest">latest</span>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}