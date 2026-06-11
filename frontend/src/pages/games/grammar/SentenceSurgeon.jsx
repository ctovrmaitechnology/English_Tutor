import { useState, useEffect, useRef } from 'react';
import { Lightbulb } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './SentenceSurgeon.css';

const TIME_PER_QUESTION = 30;

export default function SentenceSurgeon({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [jumbledWords, setJumbledWords] = useState([]);
  const [arranged, setArranged]   = useState([]);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(8);
  const [score, setScore]         = useState(0);
  const [timeLeft, setTimeLeft]   = useState(TIME_PER_QUESTION);
  const [feedback, setFeedback]   = useState(null);
  const [hint, setHint]           = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerKey, setTimerKey]   = useState(0);
  const [error, setError]         = useState('');

  const timerRef        = useRef(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

  // ── Timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_QUESTION);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerKey, phase]);

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
    setHint(null);
    setArranged([]);
    setScore(0);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.grammar.startSentenceSurgeon({
        gameType: 'SENTENCE_SURGEON',
        category: 'GRAMMAR',
        difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setJumbledWords(shuffleWithIds(data.currentQuestion.jumbledWords));
      setArranged([]);
      setQuestionNum(1);
      setTotalQuestions(data.totalQuestions);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game.');
      setPhase('idle');
    }
  };

  // ── Shuffle words with unique IDs ────────────────────────────
  const shuffleWithIds = (words) =>
    words.map((word, i) => ({ id: `w${i}_${word}`, word }))
      .sort(() => Math.random() - 0.5);

  // ── Click word from bank → add to arranged ───────────────────
  const addWord = (wordObj) => {
    if (isSubmitting || feedback) return;
    setJumbledWords(prev => prev.filter(w => w.id !== wordObj.id));
    setArranged(prev => [...prev, wordObj]);
  };

  // ── Click word in arranged → send back to bank ───────────────
  const removeWord = (wordObj) => {
    if (isSubmitting || feedback) return;
    setArranged(prev => prev.filter(w => w.id !== wordObj.id));
    setJumbledWords(prev => [...prev, wordObj]);
  };

  // ── Clear all arranged words ─────────────────────────────────
  const clearArranged = () => {
    if (isSubmitting || feedback) return;
    const allWords = shuffleWithIds([...arranged.map(w => w.word), ...jumbledWords.map(w => w.word)]);
    setArranged([]);
    setJumbledWords(allWords);
  };

  // ── Get hint ─────────────────────────────────────────────────
  const getHint = async () => {
    if (!session || hint || isSubmitting) return;
    try {
      const res = await gamesService.grammar.getHint(session.id);
      setHint(res.data.hint);
      setScore(prev => Math.max(0, prev - 3));
    } catch {
      setError('Could not get hint.');
    }
  };

  // ── Submit arranged sentence ─────────────────────────────────
  const handleSubmit = async (timedOut = false) => {
    if (isSubmittingRef.current) return;
    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const sentence = timedOut ? '' : arranged.map(w => w.word).join(' ');

    try {
      const res = await gamesService.grammar.answerSentenceSurgeon(
        session.id,
        { answer: sentence, timeMs: (TIME_PER_QUESTION - timeLeft) * 1000 }
      );

      const data = res.data;
      setFeedback({
        correct: data.correct,
        correctSentence: data.correctSentence,
        feedback: data.feedback,
        timedOut,
      });
      setScore(data.score || score);

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
          if ((data.finalScore || 0) >= 60) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 2500);
        return;
      }

      // Next question after delay
      setTimeout(() => {
        setJumbledWords(shuffleWithIds(data.nextQuestion.jumbledWords));
        setArranged([]);
        setQuestionNum(data.nextQuestion.number);
        setHint(null);
        setFeedback(null);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setTimerKey(prev => prev + 1);
      }, 2200);

    } catch {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1);
    }
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="sentence-surgeon">
        <GameHeader title="Sentence Surgeon" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🩺</div>
          <h2>Sentence Surgeon</h2>
          <p>Operate on jumbled words and build correct sentences!</p>
          <div className="game-intro-rules">
            <div className="rule">🔀 Words are shuffled out of order</div>
            <div className="rule">👆 <b>Tap words</b> to arrange them in the right order</div>
            <div className="rule">⏰ <b>30 seconds</b> per sentence</div>
            <div className="rule">💡 Use a hint for help <b>(-3 points)</b></div>
            <div className="rule">⚡ Faster completion = <b>speed bonus!</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Surgery!</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="sentence-surgeon">
        <GameHeader title="Sentence Surgeon" score={0} onBack={onBack} />
        <GameLoading message="AI is preparing sentences..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="sentence-surgeon">
        <GameHeader title="Sentence Surgeon" score={finalData.finalScore || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={`You completed ${totalQuestions} sentence surgeries!`}
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerUrgent  = timeLeft <= 8;

  return (
    <div className="sentence-surgeon">
      <GameHeader title="Sentence Surgeon" score={score} onBack={onBack} />

      <div className="ss-game">

        {/* Progress */}
        <div className="ss-progress">
          <span>{questionNum} / {totalQuestions}</span>
          <div className="ss-progress-track">
            <div className="ss-progress-fill"
              style={{ width: `${(questionNum / totalQuestions) * 100}%` }} />
          </div>
        </div>

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

        {/* Instruction */}
        <p className="ss-instruction">🩺 Tap words in the correct order to build the sentence</p>

        {/* Arranged area */}
        <div className="ss-arranged-box">
          <div className="ss-arranged-label">
            Your sentence:
            {arranged.length > 0 && !feedback && (
              <button className="ss-clear-btn" onClick={clearArranged}>Clear ✕</button>
            )}
          </div>
          <div className="ss-arranged-words">
            {arranged.length === 0 && (
              <span className="ss-arranged-placeholder">Tap words below to arrange them...</span>
            )}
            {arranged.map((wordObj, i) => (
              <button
                key={wordObj.id}
                className="ss-word ss-word--arranged"
                onClick={() => removeWord(wordObj)}
                disabled={!!feedback || isSubmitting}
              >
                {wordObj.word}
                <span className="ss-word-num">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`ss-feedback ${feedback.correct ? 'ss-feedback--correct' : 'ss-feedback--wrong'}`}>
            <p className="ss-feedback-title">
              {feedback.timedOut
                ? "⏰ Time's up!"
                : feedback.correct
                ? '✅ Correct! Great surgery!'
                : '❌ Not quite right.'}
            </p>
            <p className="ss-feedback-answer">
              <b>Correct:</b> {feedback.correctSentence}
            </p>
            {feedback.feedback && (
              <p className="ss-feedback-tip">💡 {feedback.feedback}</p>
            )}
          </div>
        )}

        {/* Hint */}
        {hint && (
          <div className="ss-hint">💡 Hint: {hint}</div>
        )}

        {/* Word bank */}
        {!feedback && (
          <div className="ss-word-bank">
            <div className="ss-word-bank-label">Word bank:</div>
            <div className="ss-bank-words">
              {jumbledWords.map((wordObj) => (
                <button
                  key={wordObj.id}
                  className="ss-word ss-word--bank"
                  onClick={() => addWord(wordObj)}
                  disabled={isSubmitting}
                >
                  {wordObj.word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!feedback && (
          <div className="ss-actions">
            <button
              className="ss-hint-btn"
              onClick={getHint}
              disabled={!!hint || isSubmitting}
            >
              <Lightbulb size={16} />
              Hint (-3pts)
            </button>
            <button
              className="ss-submit-btn"
              onClick={() => handleSubmit()}
              disabled={arranged.length === 0 || isSubmitting}
            >
              Submit Sentence ✓
            </button>
          </div>
        )}

      </div>
    </div>
  );
}