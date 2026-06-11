import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './JargonMaster.css';

export default function JargonMaster({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [question, setQuestion]   = useState(null);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [selected, setSelected]   = useState(null);
  const [input, setInput]         = useState('');
  const [feedback, setFeedback]   = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const inputRef = useRef(null);

  const startGame = async () => {
    setIsSubmitting(false);
    setFeedback(null);
    setSelected(null);
    setInput('');
    setScore(0);
    setStreak(0);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.bpo.startJargonMaster({
        gameType: 'JARGON_MASTER', category: 'BPO', difficulty,
      });

      setSession({ id: res.data.sessionId });
      setQuestion(res.data.firstQuestion);
      setQuestionNum(1);
      setTotalQuestions(res.data.totalQuestions);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game.');
      setPhase('idle');
    }
  };

  const handleAnswer = async (answer) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (question.type === 'DEFINITION') setSelected(answer);

    try {
      const res = await gamesService.bpo.answerJargonMaster(
        session.id, { answer, timeMs: 3000 }
      );

      const data = res.data;
      setFeedback(data);
      setScore(data.score || score);
      setStreak(data.streak || 0);

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
          if ((data.finalScore || 0) >= 100) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 2000);
        return;
      }

      setTimeout(() => {
        setQuestion(data.nextQuestion);
        setQuestionNum(data.nextQuestion?.number || questionNum + 1);
        setSelected(null);
        setInput('');
        setFeedback(null);
        setIsSubmitting(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1800);
    } catch {
      setIsSubmitting(false);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="jargon-master">
        <GameHeader title="Jargon Master" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">💬</div>
          <h2>Jargon Master</h2>
          <p>Master BPO vocabulary and professional terms!</p>
          <div className="game-intro-rules">
            <div className="rule">📚 Answer questions about BPO jargon</div>
            <div className="rule">🔤 3 types: <b>Definition, Usage, Professional Synonym</b></div>
            <div className="rule">⚡ Fast answers = <b>speed bonus!</b></div>
            <div className="rule">🔥 Streaks = <b>bonus points!</b></div>
            <div className="rule">🏆 15 questions total</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="jargon-master">
        <GameHeader title="Jargon Master" score={0} onBack={onBack} />
        <GameLoading message="Loading BPO vocabulary questions..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="jargon-master">
        <GameHeader title="Jargon Master" score={finalData.finalScore || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={`You answered ${totalQuestions} BPO vocabulary questions!`}
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="jargon-master">
      <GameHeader title="Jargon Master" score={score} streak={streak} onBack={onBack} />

      <div className="jm-game">

        <div className="jm-progress">
          <span>{questionNum} / {totalQuestions}</span>
          <div className="jm-progress-track">
            <div className="jm-progress-fill"
              style={{ width: `${(questionNum / totalQuestions) * 100}%` }} />
          </div>
        </div>

        <div className="jm-type-badge">
          {question?.type === 'DEFINITION' ? '📖 Definition' :
           question?.type === 'USAGE' ? '✍️ Usage' : '💬 Synonym'}
        </div>

        <div className="jm-question-box">
          <p className="jm-question">{question?.question}</p>
        </div>

        {feedback && (
          <div className={`jm-feedback ${feedback.correct ? 'jm-feedback--correct' : 'jm-feedback--wrong'}`}>
            <p className="jm-feedback-title">
              {feedback.correct ? `✅ Correct!` : `❌ ${feedback.feedback}`}
            </p>
            <p className="jm-feedback-answer">
              <b>Answer:</b> {feedback.correctAnswer}
            </p>
            {feedback.explanation && (
              <p className="jm-explanation">{feedback.explanation}</p>
            )}
          </div>
        )}

        {!feedback && question?.type === 'DEFINITION' && question?.options && (
          <div className="jm-options">
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`jm-option ${selected === String(i) ? 'jm-option--selected' : ''}`}
                onClick={() => handleAnswer(String(i))}
                disabled={isSubmitting}
              >
                <span className="jm-option-letter">{String.fromCharCode(65 + i)}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )}

        {!feedback && question?.type !== 'DEFINITION' && (
          <div className="jm-input-row">
            <input
              ref={inputRef}
              type="text"
              className="jm-input"
              placeholder="Type your answer..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnswer(input)}
              disabled={isSubmitting}
            />
            <button className="jm-submit-btn"
              onClick={() => handleAnswer(input)}
              disabled={isSubmitting || !input.trim()}>
              <Send size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}