import { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Play } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import { playBase64Audio, startRecording, blobToFormData } from '../../../utils/audio';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './TongueTwister.css';

export default function TongueTwister({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [twister, setTwister]     = useState(null);
  const [audioBase64, setAudioBase64] = useState('');
  const [twisterNum, setTwisterNum]   = useState(1);
  const [totalTwisters, setTotalTwisters] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [feedback, setFeedback]   = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recorderRef  = useRef(null);
  const timerRef     = useRef(null);

  const startGame = async () => {
    setFeedback(null);
    setFinalData(null);
    setError('');
    setPhase('loading');

    try {
      const res = await gamesService.voice.startTongueTwister({
        gameType: 'TONGUE_TWISTER', category: 'VOICE', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setTwister(data.currentTwister);
      setAudioBase64(data.currentTwister.audioBase64);
      setTwisterNum(1);
      setTotalTwisters(data.totalTwisters);
      setPhase('ready');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to load tongue twister. Please try again.');
      setPhase('idle');
    }
  };

  const playAudio = async () => {
    if (!audioBase64 || isPlaying) return;
    setIsPlaying(true);
    try {
      await playBase64Audio(audioBase64);
    } catch {
      setError('Could not play audio.');
    } finally {
      setIsPlaying(false);
    }
  };

  const startRecordingHandler = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      recorderRef.current = await startRecording();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access.');
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

      const res = await gamesService.voice.submitTongueTwister(session.id, formData);
      const data = res.data;

      setFeedback(data.evaluation);

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        return;
      }

      setTwister(data.nextTwister);
      setAudioBase64(data.nextTwister.audioBase64);
      setTwisterNum(data.nextTwister.number);
      setPhase('ready');
    } catch {
      setError('Failed to submit. Please try again.');
      setPhase('ready');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="tongue-twister">
        <GameHeader title="Tongue Twister Challenge" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">👅</div>
          <h2>Tongue Twister Challenge</h2>
          <p>Can you say the tongue twister clearly?</p>
          <div className="game-intro-rules">
            <div className="rule">🔊 Listen to the AI read the tongue twister</div>
            <div className="rule">🎙️ Record yourself saying it as clearly as possible</div>
            <div className="rule">🤖 AI scores your <b>accuracy, fluency & clarity</b></div>
            <div className="rule">🎯 3 tongue twisters total</div>
            <div className="rule">🔒 Requires <b>microphone access</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Challenge</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="tongue-twister">
        <GameHeader title="Tongue Twister Challenge" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading'
          ? 'AI is generating your tongue twisters...'
          : 'AI is scoring your pronunciation...'} />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="tongue-twister">
        <GameHeader title="Tongue Twister Challenge" score={finalData.finalScore || 0} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || 0}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback="Tongue twister challenge complete!"
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  const recordingSecs = recordingTime % 60;

  return (
    <div className="tongue-twister">
      <GameHeader title="Tongue Twister Challenge" score={0} onBack={onBack} />

      <div className="tt-game">

        <div className="tt-progress-info">
          Twister {twisterNum} of {totalTwisters}
        </div>

        {/* Twister text */}
        <div className="tt-text-box">
          <p className="tt-focus-label">Focus sound: <b>{twister?.focusSound}</b></p>
          <p className="tt-text">{twister?.text}</p>
          <p className="tt-tip">💡 {twister?.tip}</p>
        </div>

        {/* Listen button */}
        <button
          className={`tt-listen-btn ${isPlaying ? 'tt-listen-btn--playing' : ''}`}
          onClick={playAudio}
          disabled={isPlaying || isRecording}
        >
          {isPlaying ? <Volume2 size={20} /> : <Play size={20} />}
          {isPlaying ? 'Playing...' : 'Listen to AI'}
        </button>

        {/* Feedback from previous attempt */}
        {feedback && (
          <div className="tt-feedback">
            <div className="tt-feedback-scores">
              <div className="tt-score-item">
                <span>Accuracy</span>
                <span className="tt-score-val">{feedback.accuracyScore}/40</span>
              </div>
              <div className="tt-score-item">
                <span>Fluency</span>
                <span className="tt-score-val">{feedback.fluencyScore}/30</span>
              </div>
              <div className="tt-score-item">
                <span>Clarity</span>
                <span className="tt-score-val">{feedback.pronunciationScore}/30</span>
              </div>
            </div>
            <p className="tt-feedback-text">💡 {feedback.feedback}</p>
          </div>
        )}

        {/* Record button */}
        {!isRecording ? (
          <button
            className="tt-record-btn"
            onClick={startRecordingHandler}
            disabled={isSubmitting}
          >
            <Mic size={22} />
            Record Your Reading
          </button>
        ) : (
          <div className="tt-recording-state">
            <div className="tt-rec-indicator">
              <span className="tt-rec-dot" />
              Recording {recordingSecs}s — say the tongue twister clearly!
            </div>
            <button className="tt-stop-btn" onClick={stopAndSubmit}>
              <MicOff size={18} />
              Stop & Submit
            </button>
          </div>
        )}

        {error && <p className="game-error">{error}</p>}

      </div>
    </div>
  );
}