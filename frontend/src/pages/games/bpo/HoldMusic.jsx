import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './HoldMusic.css';

const TIME_PER_SCENARIO = 10;

export default function HoldMusic({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]           = useState('idle');
  const [session, setSession]       = useState(null);
  const [scenario, setScenario]     = useState(null);
  const [scenarioNum, setScenarioNum] = useState(1);
  const [totalScenarios, setTotalScenarios] = useState(10);
  const [input, setInput]           = useState('');
  const [score, setScore]           = useState(0);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_SCENARIO);
  const [feedback, setFeedback]     = useState(null);
  const [finalData, setFinalData]   = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [timerKey, setTimerKey]     = useState(0);

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

  useEffect(() => {
    if (phase !== 'playing') return;
    clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_SCENARIO);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerKey, scenario, phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing' && !isSubmittingRef.current) {
      handleSubmit(true);
    }
  }, [timeLeft]);

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
      const res = await gamesService.bpo.startHoldMusic({
        gameType: 'HOLD_MUSIC', category: 'BPO', difficulty,
      });

      setSession({ id: res.data.sessionId });
      setScenario(res.data.firstScenario);
      setScenarioNum(1);
      setTotalScenarios(res.data.totalScenarios);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 200);
    } catch {
      setError('Failed to start game.');
      setPhase('idle');
    }
  };

  const handleSubmit = async (timedOut = false) => {
    if (isSubmittingRef.current) return;
    clearInterval(timerRef.current);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const answer = timedOut ? '' : input.trim();
    const timeTaken = timedOut ? 11000 : (TIME_PER_SCENARIO - timeLeft) * 1000;

    try {
      const res = await gamesService.bpo.answerHoldMusic(
        session.id, { answer, timeMs: timeTaken }
      );

      const data = res.data;
      setScore(data.score || score);
      setFeedback({
        roundScore: data.roundScore,
        fillerWords: data.fillerWords || [],
        feedback: data.feedback,
        timedOut,
      });

      if (data.gameOver) {
        setTimeout(() => {
          setFinalData(data);
          setPhase('gameover');
        }, 1800);
        return;
      }

      setTimeout(() => {
        setScenario(data.nextScenario);
        setScenarioNum(data.nextScenario?.number || scenarioNum + 1);
        setInput('');
        setFeedback(null);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        setTimerKey(prev => prev + 1);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1800);
    } catch {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setTimerKey(prev => prev + 1);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="hold-music">
        <GameHeader title="Hold Music" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🎵</div>
          <h2>Hold Music</h2>
          <p>Respond to rapid customer scenarios without hesitation!</p>
          <div className="game-intro-rules">
            <div className="rule">📞 A customer situation appears</div>
            <div className="rule">⏰ You have <b>10 seconds</b> to respond</div>
            <div className="rule">🚫 Avoid filler words: <b>um, uh, like, basically</b></div>
            <div className="rule">✅ Clean professional response = full points</div>
            <div className="rule">🎯 10 rapid scenarios total</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="hold-music">
        <GameHeader title="Hold Music" score={0} onBack={onBack} />
        <GameLoading message="Preparing customer scenarios..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="hold-music">
        <GameHeader title="Hold Music" score={finalData.score || score} onBack={onBack} />
        <ScoreScreen
          score={finalData.score || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={`Clean responses: ${finalData.stats?.cleanResponses || 0}/${finalData.stats?.outOf || 10}`}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          {finalData.stats && (
            <div className="hm-stats">
              <div className="hm-stat">
                <span>Clean Responses</span>
                <span className="hm-stat-value hm-stat-value--good">{finalData.stats.cleanResponses}</span>
              </div>
              <div className="hm-stat">
                <span>Filler Words Used</span>
                <span className="hm-stat-value hm-stat-value--bad">{finalData.stats.totalFillerWords}</span>
              </div>
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  const timerPercent = (timeLeft / TIME_PER_SCENARIO) * 100;
  const timerUrgent = timeLeft <= 4;

  return (
    <div className="hold-music">
      <GameHeader title="Hold Music" score={score} onBack={onBack} />

      <div className="hm-game">

        <div className="hm-progress">
          <span>{scenarioNum} / {totalScenarios}</span>
          <div className="hm-progress-track">
            <div className="hm-progress-fill"
              style={{ width: `${(scenarioNum / totalScenarios) * 100}%` }} />
          </div>
        </div>

        <div className="hm-timer">
          <div className="hm-timer-track">
            <div className={`hm-timer-bar ${timerUrgent ? 'hm-timer-bar--urgent' : ''}`}
              style={{ width: `${timerPercent}%` }} />
          </div>
          <span className={`hm-timer-num ${timerUrgent ? 'hm-timer-num--urgent' : ''}`}>{timeLeft}s</span>
        </div>

        <div className="hm-scenario-box">
          <p className="hm-scenario-label">📞 Customer says:</p>
          <p className="hm-scenario-text">{scenario?.situation}</p>
        </div>

        {feedback && (
          <div className={`hm-feedback ${feedback.roundScore >= 7 ? 'hm-feedback--good' : 'hm-feedback--bad'}`}>
            <p>{feedback.timedOut ? '⏰ Too slow!' : feedback.feedback}</p>
            {feedback.fillerWords?.length > 0 && (
              <p className="hm-filler-warning">⚠️ Filler words detected: {feedback.fillerWords.join(', ')}</p>
            )}
            <p className="hm-round-score">+{feedback.roundScore} points</p>
          </div>
        )}

        {!feedback && (
          <div className="hm-input-row">
            <input
              ref={inputRef}
              type="text"
              className="hm-input"
              placeholder="Type your professional response..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={isSubmitting}
            />
            <button className="hm-submit-btn" onClick={() => handleSubmit()}
              disabled={isSubmitting || !input.trim()}>
              <Send size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}