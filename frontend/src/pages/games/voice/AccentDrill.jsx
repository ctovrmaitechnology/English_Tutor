import { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Play } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import { playBase64Audio, startRecording, blobToFormData } from '../../../utils/audio';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './AccentDrill.css';

export default function AccentDrill({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]       = useState('idle');
  const [session, setSession]   = useState(null);
  const [targetSounds, setTargetSounds] = useState([]);
  const [exercise, setExercise] = useState(null);
  const [audioBase64, setAudioBase64] = useState('');
  const [exerciseNum, setExerciseNum] = useState(1);
  const [totalExercises, setTotalExercises] = useState(6);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [mtiSummary, setMtiSummary] = useState(null);
  const [error, setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recorderRef = useRef(null);
  const timerRef    = useRef(null);

  const startGame = async () => {
    setFeedback(null);
    setFinalData(null);
    setMtiSummary(null);
    setError('');
    setPhase('loading');

    try {
      const res = await gamesService.voice.startAccentDrill({
        gameType: 'ACCENT_DRILL', category: 'VOICE', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setTargetSounds(data.targetSounds || []);
      setExercise(data.currentExercise);
      setAudioBase64(data.currentExercise.audioBase64);
      setExerciseNum(1);
      setTotalExercises(data.totalExercises);
      setPhase('ready');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start drill.');
      setPhase('idle');
    }
  };

  const playAudio = async () => {
    if (!audioBase64 || isPlaying) return;
    setIsPlaying(true);
    try { await playBase64Audio(audioBase64); }
    catch { setError('Could not play audio.'); }
    finally { setIsPlaying(false); }
  };

  const startRecordingHandler = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      recorderRef.current = await startRecording();
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch {
      setError('Microphone access denied.');
      setIsRecording(false);
    }
  };

  const stopAndSubmit = async () => {
    if (!recorderRef.current) return;
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsSubmitting(true);
    setPhase('submitting');

    try {
      const audioBlob = await recorderRef.current.stop();
      const formData  = blobToFormData(audioBlob);

      const res = await gamesService.voice.submitAccentDrill(session.id, formData);
      const data = res.data;
      setFeedback(data.evaluation);

      if (data.gameOver) {
        setFinalData(data);
        setMtiSummary(data.mtiSummary);
        setPhase('gameover');
        return;
      }

      setExercise(data.nextExercise);
      setAudioBase64(data.nextExercise.audioBase64);
      setExerciseNum(data.nextExercise.number);
      setPhase('ready');
    } catch {
      setError('Submission failed.');
      setPhase('ready');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="accent-drill">
        <GameHeader title="Accent Drill" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🎯</div>
          <h2>Accent Drill</h2>
          <p>Target your specific pronunciation challenges!</p>
          <div className="game-intro-rules">
            <div className="rule">🎯 Focuses on <b>common Indian English sounds</b></div>
            <div className="rule">🔊 Listen to the model pronunciation</div>
            <div className="rule">🎙️ Repeat the exercise</div>
            <div className="rule">🤖 AI detects MTI patterns and gives tips</div>
            <div className="rule">📈 Track your improvement over time</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Drill</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="accent-drill">
        <GameHeader title="Accent Drill" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading' ? 'Preparing targeted exercises...' : 'Analyzing your pronunciation...'} />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="accent-drill">
        <GameHeader title="Accent Drill" score={finalData.finalScore || 0} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || 0}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={mtiSummary?.message || 'Drill complete!'}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          {mtiSummary?.patterns?.length > 0 && (
            <div className="ad-mti-summary">
              <p className="ad-mti-label">🎯 Focus areas for practice:</p>
              <div className="ad-mti-chips">
                {mtiSummary.patterns.map((p, i) => (
                  <span key={i} className="ad-mti-chip">{p}</span>
                ))}
              </div>
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  return (
    <div className="accent-drill">
      <GameHeader title="Accent Drill" score={0} onBack={onBack} />

      <div className="ad-game">

        <div className="ad-progress">
          <span>Exercise {exerciseNum} / {totalExercises}</span>
          <div className="ad-target-sounds">
            {targetSounds.map((s, i) => (
              <span key={i} className="ad-sound-chip">{s}</span>
            ))}
          </div>
        </div>

        <div className="ad-exercise-box">
          <div className="ad-type-badge">{exercise?.type}</div>
          <p className="ad-instruction">{exercise?.instruction}</p>
          <p className="ad-text">{exercise?.text}</p>
          <p className="ad-tip">💡 {exercise?.tip}</p>
        </div>

        {feedback && (
          <div className={`ad-feedback ${feedback.mtiDetected ? 'ad-feedback--mti' : 'ad-feedback--good'}`}>
            <div className="ad-feedback-scores">
              <span>Target Sound: {feedback.targetSoundScore}/50</span>
              <span>Clarity: {feedback.clarityScore}/50</span>
            </div>
            <p className="ad-feedback-text">💡 {feedback.feedback}</p>
            {feedback.mtiDetected && feedback.mtiPatterns?.length > 0 && (
              <p className="ad-mti-warning">
                ⚠️ MTI detected: {feedback.mtiPatterns.join(', ')} — {feedback.improvement}
              </p>
            )}
          </div>
        )}

        <button
          className={`ad-listen-btn ${isPlaying ? 'ad-listen-btn--active' : ''}`}
          onClick={playAudio}
          disabled={isPlaying || isRecording}
        >
          {isPlaying ? <Volume2 size={20} /> : <Play size={20} />}
          {isPlaying ? 'Playing...' : 'Hear Model Pronunciation'}
        </button>

        {!isRecording ? (
          <button className="ad-record-btn" onClick={startRecordingHandler} disabled={isSubmitting}>
            <Mic size={20} />
            Record Your Attempt
          </button>
        ) : (
          <div className="ad-recording">
            <div className="ad-rec-indicator">
              <span className="ad-rec-dot" />
              Recording {recordingTime}s
            </div>
            <button className="ad-stop-btn" onClick={stopAndSubmit}>
              <MicOff size={18} />
              Submit
            </button>
          </div>
        )}

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}