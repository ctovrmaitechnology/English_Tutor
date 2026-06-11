import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './TenseTransformer.css';

export default function TenseTransformer({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [question, setQuestion]   = useState(null);
  const [questionNum, setQuestionNum] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [input, setInput]         = useState('');
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [feedback, setFeedback]   = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef(null);

  const startGame = async () => {
    setIsSubmitting(false);
    setFeedback(null);
    setInput('');
    setScore(0);
    setStreak(0);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.grammar.startTenseTransformer({
        gameType: 'TENSE_TRANSFORMER',
        category: 'GRAMMAR',
        difficulty,
      });

      setSession({ id: res.data.sessionId });
      setQuestion(res.data.currentQuestion);
      setQuestionNum(1);
      setTotalQuestions(res.data.totalQuestions);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch {
      setError('Failed to start game. Please try again.');
      setPhase('idle');
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await gamesService.grammar.answerTenseTransformer(
        session.id,
        { answer: input.trim(), timeMs: 5000 }
      );

      const data = res.data;
      setFeedback(data);
      setScore(data.score || score);
      setStreak(data.streak || 0);

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
          if ((data.finalScore || 0) >= 70) {
            CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
          }
        }, 2000);
        return;
      }

      setTimeout(() => {
        setQuestion(data.nextQuestion);
        setQuestionNum(data.nextQuestion?.number || questionNum + 1);
        setInput('');
        setFeedback(null);
        setIsSubmitting(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 2000);

    } catch {
      setIsSubmitting(false);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="tense-transformer">
        <GameHeader title="Tense Transformer" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">⏳</div>
          <h2>Tense Transformer</h2>
          <p>Transform sentences from one tense to another!</p>
          <div className="game-intro-rules">
            <div className="rule">📝 Read the sentence and the tense instruction</div>
            <div className="rule">✍️ Type the transformed sentence</div>
            <div className="rule">🤖 AI checks your grammar</div>
            <div className="rule">🔥 3 correct in a row = <b>streak bonus!</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="tense-transformer">
        <GameHeader title="Tense Transformer" score={0} onBack={onBack} />
        <GameLoading message="AI is preparing tense questions..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="tense-transformer">
        <GameHeader title="Tense Transformer" score={finalData.finalScore || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback="Tense transformation complete!"
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="tense-transformer">
      <GameHeader title="Tense Transformer" score={score} streak={streak} onBack={onBack} />

      <div className="tt-game">

        {/* Progress */}
        <div className="tt-progress">
          <span>{questionNum} / {totalQuestions}</span>
          <div className="tt-progress-track">
            <div className="tt-progress-fill"
              style={{ width: `${(questionNum / totalQuestions) * 100}%` }} />
          </div>
        </div>

        {/* Instruction badge */}
        <div className="tt-instruction">
          <span className="tt-from">{question?.fromTense}</span>
          <span className="tt-arrow">→</span>
          <span className="tt-to">{question?.toTense}</span>
        </div>

        {/* Original sentence */}
        <div className="tt-sentence-box">
          <p className="tt-sentence-label">Transform this sentence:</p>
          <p className="tt-sentence">{question?.sentence}</p>
          <p className="tt-hint">{question?.instruction}</p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`tt-feedback ${feedback.correct ? 'tt-feedback--correct' : 'tt-feedback--wrong'}`}>
            <p className="tt-feedback-title">
              {feedback.correct ? `✅ ${feedback.feedback}` : `❌ ${feedback.feedback}`}
            </p>
            <p className="tt-feedback-answer">
              <b>Correct:</b> {feedback.correctAnswer}
            </p>
            {feedback.grammarNote && (
              <p className="tt-grammar-note">💡 {feedback.grammarNote}</p>
            )}
          </div>
        )}

        {/* Input */}
        {!feedback && (
          <div className="tt-input-row">
            <input
              ref={inputRef}
              type="text"
              className="tt-input"
              placeholder="Type your transformed sentence..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={isSubmitting}
            />
            <button className="tt-submit-btn" onClick={handleSubmit}
              disabled={isSubmitting || !input.trim()}>
              <Send size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}