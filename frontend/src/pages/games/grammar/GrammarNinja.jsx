import { useState, useEffect, useRef } from 'react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './GrammarNinja.css';

const TIME_PER_QUESTION = 8;

export default function GrammarNinja({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]           = useState('idle');
  const [session, setSession]       = useState(null);
  const [question, setQuestion]     = useState(null);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [score, setScore]           = useState(0);
  const [lives, setLives]           = useState(3);
  const [streak, setStreak]         = useState(0);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_QUESTION);
  const [selected, setSelected]     = useState(null);
  const [feedback, setFeedback]     = useState(null);
  const [finalData, setFinalData]   = useState(null);
  const [error, setError]           = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerKey, setTimerKey]     = useState(0);

  const timerRef        = useRef(null);
  const isSubmittingRef = useRef(false);
  const startTimeRef    = useRef(null);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_QUESTION);
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
  }, [timerKey, question, phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing' && !isSubmittingRef.current) {
      handleTap(-1, true); // timeout — no word selected
    }
  }, [timeLeft]);

  // ── Start game ───────────────────────────────────────────────
  const startGame = async () => {
    clearInterval(timerRef.current);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    setFeedback(null);
    setSelected(null);
    setScore(0);
    setLives(3);
    setStreak(0);
    setFinalData(null);
    setTimerKey(0);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.grammar.startGrammarNinja({
        gameType: 'GRAMMAR_NINJA',
        category: 'GRAMMAR',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setQuestion(res.data.currentQuestion);
      setQuestionNum(1);
      setTotalQuestions(res.data.totalQuestions);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  // ── Tap a word ───────────────────────────────────────────────
  const handleTap = async (wordIndex, timedOut = false) => {
    if (isSubmittingRef.current || selected !== null) return;

    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (!timedOut) setSelected(wordIndex);

    const timeTaken = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : TIME_PER_QUESTION * 1000;

    try {
      const res = await gamesService.grammar.answerGrammarNinja(
        session.id,
        {
          answer: String(timedOut ? -1 : wordIndex),
          timeMs: timeTaken,
        }
      );

      const data = res.data;

      setFeedback({
        correct: data.correct,
        errorWord: data.errorWord,
        correctWord: data.correctWord,
        explanation: data.explanation,
        timedOut,
      });

      setScore(data.score || score);
      setLives(data.lives ?? lives);
      setStreak(data.streak || 0);

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
          if ((data.finalScore || 0) >= 80) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 2000);
        return;
      }

      // Next question after delay
      setTimeout(() => {
        setQuestion(data.nextQuestion);
        setQuestionNum(data.nextQuestion?.number || questionNum + 1);
        setSelected(null);
        setFeedback(null);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setTimerKey(prev => prev + 1);
      }, 1800);

    } catch {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1);
    }
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="grammar-ninja">
        <GameHeader title="Grammar Ninja" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🥷</div>
          <h2>Grammar Ninja</h2>
          <p>Find the grammar error hiding in each sentence!</p>
          <div className="game-intro-rules">
            <div className="rule">👆 <b>Tap</b> the incorrect word in the sentence</div>
            <div className="rule">⏰ You have <b>8 seconds</b> per question</div>
            <div className="rule">⚡ Fast tap = <b>speed bonus points</b></div>
            <div className="rule">🔥 3 correct in a row = <b>streak bonus!</b></div>
            <div className="rule">❤️ 3 lives — wrong tap costs a life</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="grammar-ninja">
        <GameHeader title="Grammar Ninja" score={0} onBack={onBack} />
        <GameLoading message="AI is preparing grammar questions..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="grammar-ninja">
        <GameHeader title="Grammar Ninja" score={finalData.finalScore || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={`You completed ${totalQuestions} grammar challenges!`}
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerUrgent  = timeLeft <= 3;

  return (
    <div className="grammar-ninja">
      <GameHeader
        title="Grammar Ninja"
        score={score}
        lives={lives}
        streak={streak}
        onBack={onBack}
      />

      <div className="gn-game">

        {/* Progress */}
        <div className="gn-progress">
          <span>{questionNum} / {totalQuestions}</span>
          <div className="gn-progress-track">
            <div
              className="gn-progress-fill"
              style={{ width: `${(questionNum / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="gn-timer">
          <div className="gn-timer-track">
            <div
              className={`gn-timer-bar ${timerUrgent ? 'gn-timer-bar--urgent' : ''}`}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span className={`gn-timer-num ${timerUrgent ? 'gn-timer-num--urgent' : ''}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Instruction */}
        <div className="gn-instruction">
          🥷 Tap the <b>incorrect word</b> in the sentence
        </div>

        {/* Sentence words */}
        <div className="gn-sentence-box">
          <div className="gn-words">
            {question?.words?.map((word, index) => {
              let cls = 'gn-word';
              if (feedback) {
                if (index === question.errorIndex) {
                  cls += ' gn-word--error';
                } else if (index === selected && selected !== question.errorIndex) {
                  cls += ' gn-word--wrong-tap';
                } else {
                  cls += ' gn-word--dim';
                }
              } else if (selected === index) {
                cls += ' gn-word--selected';
              }

              return (
                <button
                  key={index}
                  className={cls}
                  onClick={() => handleTap(index)}
                  disabled={isSubmitting || !!feedback}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`gn-feedback ${feedback.correct ? 'gn-feedback--correct' : 'gn-feedback--wrong'}`}>
            <p className="gn-feedback-title">
              {feedback.timedOut
                ? '⏰ Time\'s up!'
                : feedback.correct
                ? `✅ Ninja strike! "${feedback.errorWord}" → "${feedback.correctWord}"`
                : `❌ Wrong! The error was "${feedback.errorWord}" → "${feedback.correctWord}"`}
            </p>
            {feedback.explanation && (
              <p className="gn-feedback-explanation">{feedback.explanation}</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}