import { useState, useRef } from 'react';
import { Mic, MicOff, Zap } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import { startRecording, blobToFormData } from '../../../utils/audio';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './SpeedSpeak.css';

const RECORD_TIME = 30;

export default function SpeedSpeak({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [category, setCategory]   = useState('');
  const [instruction, setInstruction] = useState('');
  const [examples, setExamples]   = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(RECORD_TIME);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recorderRef = useRef(null);
  const timerRef    = useRef(null);
  const stopRef     = useRef(null);

  const startGame = async () => {
    setResult(null);
    setError('');
    setPhase('loading');

    try {
      const res = await gamesService.voice.startSpeedSpeak({
        gameType: 'SPEED_SPEAK', category: 'VOICE', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setCategory(data.category);
      setInstruction(data.instruction);
      setExamples(data.examples || []);
      setPhase('ready');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game.');
      setPhase('idle');
    }
  };

  const startRecordingHandler = async () => {
    try {
      setIsRecording(true);
      setTimeLeft(RECORD_TIME);
      recorderRef.current = await startRecording();

      // Store stop function
      stopRef.current = recorderRef.current.stop;

      // Countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            stopAndSubmitAuto();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch {
      setError('Microphone access denied. Please allow microphone access.');
      setIsRecording(false);
    }
  };

  const stopAndSubmitAuto = async () => {
    if (!stopRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const audioBlob = await stopRef.current();
      const formData  = blobToFormData(audioBlob);

      const res = await gamesService.voice.submitSpeedSpeak(session.id, formData);
      setResult(res.data);
      setPhase('result');
      CompanionEvents.emit('CHALLENGE_COMPLETED');
    } catch {
      setError('Submission failed. Please try again.');
      setPhase('ready');
    } finally {
      setIsSubmitting(false);
      stopRef.current = null;
    }
  };

  const stopEarly = () => {
    clearInterval(timerRef.current);
    stopAndSubmitAuto();
  };

  if (phase === 'idle') {
    return (
      <div className="speed-speak">
        <GameHeader title="Speed Speak" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">⚡</div>
          <h2>Speed Speak</h2>
          <p>Say as many words as possible in 30 seconds!</p>
          <div className="game-intro-rules">
            <div className="rule">🗂️ AI gives you a <b>word category</b></div>
            <div className="rule">🎙️ Speak as many words in that category as possible</div>
            <div className="rule">⏰ You have <b>30 seconds</b></div>
            <div className="rule">🤖 AI counts valid words from your recording</div>
            <div className="rule">🏆 More valid words = higher score!</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Get My Category</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="speed-speak">
        <GameHeader title="Speed Speak" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading'
          ? 'AI is picking your category...'
          : 'AI is counting your valid words...'} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="speed-speak">
        <GameHeader title="Speed Speak" score={result.score} onBack={onBack} />
        <ScoreScreen
          score={result.score}
          maxScore={0}
          xpEarned={result.xpEarned || 0}
          feedback={result.message}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="ss-result">
            <div className="ss-stat">
              <span className="ss-stat-num">{result.totalValidWords}</span>
              <span className="ss-stat-label">Valid Words</span>
            </div>
          </div>
          {result.validWords?.length > 0 && (
            <div className="ss-words-section">
              <p className="ss-words-label">✅ Words counted:</p>
              <div className="ss-word-chips">
                {result.validWords.map((w, i) => (
                  <span key={i} className="ss-word-chip">{w}</span>
                ))}
              </div>
            </div>
          )}
          {result.missedExamples?.length > 0 && (
            <div className="ss-missed-section">
              <p className="ss-missed-label">💡 You could have also said:</p>
              <div className="ss-word-chips">
                {result.missedExamples.map((w, i) => (
                  <span key={i} className="ss-word-chip ss-word-chip--missed">{w}</span>
                ))}
              </div>
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  const timerPercent = (timeLeft / RECORD_TIME) * 100;
  const timerUrgent  = timeLeft <= 10;

  return (
    <div className="speed-speak">
      <GameHeader title="Speed Speak" score={0} onBack={onBack} />

      <div className="ss-game">

        <div className="ss-category-box">
          <p className="ss-category-label">Your category:</p>
          <p className="ss-category">{category}</p>
          <p className="ss-instruction">{instruction}</p>
          <div className="ss-examples">
            <span className="ss-examples-label">Examples: </span>
            {examples.map((e, i) => (
              <span key={i} className="ss-example-word">{e}{i < examples.length - 1 ? ', ' : ''}</span>
            ))}
          </div>
        </div>

        {isRecording && (
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
        )}

        {!isRecording ? (
          <button className="ss-record-btn" onClick={startRecordingHandler} disabled={isSubmitting}>
            <Mic size={24} />
            Start Speaking!
          </button>
        ) : (
          <div className="ss-recording-state">
            <div className="ss-rec-indicator">
              <Zap size={18} fill="#ef4444" color="#ef4444" />
              Recording — keep saying words!
            </div>
            <button className="ss-stop-btn" onClick={stopEarly}>
              <MicOff size={18} />
              I'm Done
            </button>
          </div>
        )}

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}