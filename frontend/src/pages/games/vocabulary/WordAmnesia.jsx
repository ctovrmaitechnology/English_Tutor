import { useState } from 'react';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './WordAmnesia.css';

export default function WordAmnesia({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase] = useState('idle'); // idle | loading | playing | result | gameover
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [questionNum, setQuestionNum] = useState(1);
  const [error, setError] = useState('');

  const startGame = async () => {
    setPhase('loading');
    setError('');
    try {
      const res = await gamesService.vocabulary.startWordAmnesia({
        gameType: 'WORD_AMNESIA',
        category: 'VOCABULARY',
        difficulty,
      });

      setSession({ id: res.data.sessionId, total: res.data.totalQuestions });
      setQuestion(res.data.question);
      setScore(0);
      setLives(3);
      setStreak(0);
      setQuestionNum(1);
      setSelected(null);
      setResult(null);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch (err) {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  const handleSelect = async (index) => {
    if (selected !== null || result) return;
    setSelected(index);

    try {
      const res = await gamesService.vocabulary.answerWordAmnesia(
        session.id,
        { answer: String(index), timeMs: 3000 }
      );

      setResult(res.data);
      setScore(res.data.score || score);
      setLives(res.data.lives ?? lives);
      setStreak(res.data.streak || 0);

      if (res.data.gameOver) {
        setTimeout(() => {
          setFinalData(res.data);
          setPhase('gameover');
          if (res.data.finalScore >= 70) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 1500);
      } else {
        setTimeout(() => {
          setQuestion(res.data.nextQuestion);
          setQuestionNum(res.data.nextQuestion.number);
          setSelected(null);
          setResult(null);
        }, 1500);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  // ── Idle screen ─────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="word-amnesia">
        <GameHeader title="Word Amnesia" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🧠</div>
          <h2>Word Amnesia</h2>
          <p>Complete the sentence by choosing the correct missing word.</p>
          <div className="game-intro-rules">
            <div className="rule">✅ Correct answer → <b>+10 points</b></div>
            <div className="rule">🔥 3 correct in a row → <b>Streak bonus!</b></div>
            <div className="rule">❌ Wrong answer → <b>-5 points + lose a life</b></div>
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
      <div className="word-amnesia">
        <GameHeader title="Word Amnesia" score={0} onBack={onBack} />
        <GameLoading message="Generating questions..." />
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────
  if (phase === 'gameover' && finalData) {
    return (
      <div className="word-amnesia">
        <GameHeader title="Word Amnesia" score={finalData.finalScore} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore}
          maxScore={session.total * 10}
          xpEarned={finalData.xpEarned || 0}
          feedback={finalData.finalScore >= 70
            ? 'Great job! Keep building your vocabulary!'
            : 'Keep practicing — you\'ll improve!'}
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  return (
    <div className="word-amnesia">
      <GameHeader
        title="Word Amnesia"
        score={score}
        lives={lives}
        streak={streak}
        onBack={onBack}
      />

      <div className="amnesia-game">
        {/* Progress */}
        <div className="amnesia-progress">
          <span>Question {questionNum} of {session?.total}</span>
          <div className="amnesia-progress-bar">
            <div
              className="amnesia-progress-fill"
              style={{ width: `${(questionNum / session?.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Sentence */}
        <div className="amnesia-sentence">
          {question?.sentence?.split('___').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <span className={`amnesia-blank ${
                  result
                    ? result.correct ? 'amnesia-blank--correct' : 'amnesia-blank--wrong'
                    : ''
                }`}>
                  {result
                    ? result.correctAnswer
                    : '_______'}
                </span>
              )}
            </span>
          ))}
        </div>

        {/* Options */}
        <div className="amnesia-options">
          {question?.options?.map((option, index) => {
            let cls = 'amnesia-option';
            if (selected !== null) {
              if (result && option === result.correctAnswer) cls += ' amnesia-option--correct';
              else if (index === selected && !result?.correct) cls += ' amnesia-option--wrong';
              else cls += ' amnesia-option--disabled';
            }
            return (
              <button
                key={index}
                className={cls}
                onClick={() => handleSelect(index)}
                disabled={selected !== null}
              >
                <span className="amnesia-option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
                {result && option === result.correctAnswer && (
                  <CheckCircle size={18} className="amnesia-icon-correct" />
                )}
                {result && index === selected && !result?.correct && (
                  <XCircle size={18} className="amnesia-icon-wrong" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {result && (
          <div className={`amnesia-feedback ${result.correct ? 'amnesia-feedback--correct' : 'amnesia-feedback--wrong'}`}>
            {result.correct ? '✅ Correct!' : `❌ The answer was: ${result.correctAnswer}`}
            {result.explanation && (
              <p className="amnesia-explanation">{result.explanation}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}