import { useState, useEffect, useRef } from 'react';
import { Send, Zap } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './SpeedRun.css';

const TIME_PER_WORD = 10;

export default function SpeedRun({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [currentWord, setCurrentWord] = useState('');
  const [wordNumber, setWordNumber]   = useState(1);
  const [totalWords, setTotalWords]   = useState(10);
  const [input, setInput]         = useState('');
  const [timeLeft, setTimeLeft]   = useState(TIME_PER_WORD);
  const [score, setScore]         = useState(0);
  const [feedback, setFeedback]   = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerKey, setTimerKey]   = useState(0);

  const timerRef        = useRef(null);
  const inputRef        = useRef(null);
  const startTimeRef    = useRef(null);
  const isSubmittingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // ── Timer per word ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_WORD);
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
  }, [timerKey, currentWord, phase]);

  // ── Auto-submit on timeout ───────────────────────────────────
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing' && !isSubmittingRef.current) {
      handleSubmit(true);
    }
  }, [timeLeft]);

  // ── Start game ───────────────────────────────────────────────
  const startGame = async () => {
    clearInterval(timerRef.current);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setFeedback(null);
    setInput('');
    setScore(0);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.vocabulary.startSpeedRun({
        gameType: 'SPEED_RUN',
        category: 'VOCABULARY',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setCurrentWord(res.data.firstWord);
      setWordNumber(res.data.wordNumber || 1);
      setTotalWords(res.data.totalWords || 10);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  // ── Submit meaning ───────────────────────────────────────────
  const handleSubmit = async (timedOut = false) => {
    if (isSubmittingRef.current) return;

    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const answer  = timedOut ? '' : input.trim();
    const timeTaken = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : TIME_PER_WORD * 1000;

    try {
      const res = await gamesService.vocabulary.answerSpeedRun(
        session.id,
        { answer, timeMs: timeTaken }
      );

      const data = res.data;

      setFeedback({
        type: timedOut ? 'timeout' : data.correct ? 'correct' : 'wrong',
        correct: data.correct,
        correctMeaning: data.correctMeaning,
        example: data.example,
        feedback: timedOut ? `⏰ Time's up! The meaning was: "${data.correctMeaning}"` : data.feedback,
        speedBonus: !timedOut && data.correct && timeTaken < 5000,
      });

      setScore(data.score || score);

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
          if ((data.accuracy || 0) >= 70) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 2000);
        return;
      }

      // Move to next word after delay
      setTimeout(() => {
        setCurrentWord(data.nextWord);
        setWordNumber(data.wordNumber);
        setInput('');
        setFeedback(null);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setTimerKey(prev => prev + 1);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1800);

    } catch {
      setFeedback({ type: 'wrong', feedback: 'Something went wrong. Moving on...' });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="speed-run">
        <GameHeader title="Vocabulary Speed Run" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🏃</div>
          <h2>Vocabulary Speed Run</h2>
          <p>10 words. 10 seconds each. Define them all!</p>
          <div className="game-intro-rules">
            <div className="rule">📖 A word appears — type its <b>meaning</b></div>
            <div className="rule">⏰ You have <b>10 seconds</b> per word</div>
            <div className="rule">✅ Correct meaning = <b>+10 points</b></div>
            <div className="rule">⚡ Answer in under 5 seconds = <b>+5 speed bonus</b></div>
            <div className="rule">🏃 10 words total — how fast can you go?</div>
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
      <div className="speed-run">
        <GameHeader title="Vocabulary Speed Run" score={0} onBack={onBack} />
        <GameLoading message="AI is preparing 10 words for you..." />
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────
  if (phase === 'gameover' && finalData) {
    return (
      <div className="speed-run">
        <GameHeader title="Vocabulary Speed Run" score={finalData.score || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.score || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={`Accuracy: ${Math.round(finalData.accuracy || 0)}% — ${
            (finalData.accuracy || 0) >= 80
              ? 'Excellent vocabulary!'
              : (finalData.accuracy || 0) >= 50
              ? 'Good effort! Keep practicing.'
              : 'Keep building your vocabulary!'
          }`}
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  const timerPercent = (timeLeft / TIME_PER_WORD) * 100;
  const timerUrgent  = timeLeft <= 4;

  return (
    <div className="speed-run">
      <GameHeader
        title="Vocabulary Speed Run"
        score={score}
        timer={timeLeft}
        onBack={onBack}
      />

      <div className="sr-game">

        {/* Progress bar */}
        <div className="sr-progress">
          <span className="sr-progress-text">
            Word {wordNumber} of {totalWords}
          </span>
          <div className="sr-progress-track">
            <div
              className="sr-progress-fill"
              style={{ width: `${(wordNumber / totalWords) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="sr-timer">
          <div className="sr-timer-track">
            <div
              className={`sr-timer-bar ${timerUrgent ? 'sr-timer-bar--urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span className={`sr-timer-num ${timerUrgent ? 'sr-timer-num--urgent' : ''}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Word display */}
        <div className="sr-word-box">
          <p className="sr-word-label">Define this word:</p>
          <div className="sr-word">{currentWord}</div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`sr-feedback sr-feedback--${feedback.type}`}>
            <p className="sr-feedback-main">
              {feedback.type === 'correct'
                ? `✅ Correct! ${feedback.speedBonus ? '⚡ Speed bonus!' : ''}`
                : feedback.type === 'timeout'
                ? `⏰ Time's up!`
                : `❌ Not quite!`}
            </p>
            <p className="sr-feedback-meaning">
              <b>Meaning:</b> {feedback.correctMeaning}
            </p>
            {feedback.example && (
              <p className="sr-feedback-example">
                <b>Example:</b> <i>{feedback.example}</i>
              </p>
            )}
          </div>
        )}

        {/* Input */}
        {!feedback && (
          <div className="sr-input-row">
            <input
              ref={inputRef}
              type="text"
              className="sr-input"
              placeholder="Type the meaning..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <button
              className="sr-submit-btn"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        )}

        {/* Skip hint */}
        {!feedback && (
          <p className="sr-skip-hint">
            Press <b>Enter</b> to submit
          </p>
        )}

      </div>
    </div>
  );
}