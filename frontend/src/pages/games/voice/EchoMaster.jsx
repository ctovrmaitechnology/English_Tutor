import { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Play } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import { playBase64Audio, startRecording, blobToFormData } from '../../../utils/audio';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './EchoMaster.css';

export default function EchoMaster({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]       = useState('idle');
  const [session, setSession]   = useState(null);
  const [sentence, setSentence] = useState(null);
  const [audioBase64, setAudioBase64] = useState('');
  const [sentenceNum, setSentenceNum] = useState(1);
  const [totalSentences, setTotalSentences] = useState(8);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [error, setError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recorderRef = useRef(null);
  const timerRef    = useRef(null);

  const startGame = async () => {
    setFeedback(null);
    setFinalData(null);
    setError('');
    setPhase('loading');

    try {
      const res = await gamesService.voice.startEchoMaster({
        gameType: 'ECHO_MASTER', category: 'VOICE', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setSentence(data.currentSentence);
      setAudioBase64(data.currentSentence.audioBase64);
      setSentenceNum(1);
      setTotalSentences(data.totalSentences);
      setPhase('ready');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to start game.');
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

      const res = await gamesService.voice.submitEchoMaster(session.id, formData);
      const data = res.data;
      setFeedback(data.evaluation);

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        return;
      }

      setSentence(data.nextSentence);
      setAudioBase64(data.nextSentence.audioBase64);
      setSentenceNum(data.nextSentence.number);
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
      <div className="echo-master">
        <GameHeader title="Echo Master" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🎧</div>
          <h2>Echo Master</h2>
          <p>Listen and repeat as closely as possible!</p>
          <div className="game-intro-rules">
            <div className="rule">🔊 AI speaks a sentence</div>
            <div className="rule">🎙️ Repeat it with the <b>same pronunciation & pace</b></div>
            <div className="rule">🤖 AI compares your echo to the original</div>
            <div className="rule">📈 Higher match = higher score</div>
            <div className="rule">🎯 8 sentences total</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="echo-master">
        <GameHeader title="Echo Master" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading' ? 'AI is preparing sentences...' : 'Comparing your echo...'} />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="echo-master">
        <GameHeader title="Echo Master" score={finalData.finalScore || 0} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || 0}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback="Echo Master complete!"
          onPlayAgain={startGame}
          onBack={onBack}
        />
      </div>
    );
  }

  return (
    <div className="echo-master">
      <GameHeader title="Echo Master" score={0} onBack={onBack} />

      <div className="em-game">

        <div className="em-progress">{sentenceNum} / {totalSentences}</div>

        <div className="em-sentence-box">
          <p className="em-focus">Focus: {sentence?.focusArea}</p>
          <p className="em-sentence">{sentence?.text}</p>
        </div>

        <div className="em-steps">
          <div className="em-step">
            <span className="em-step-num">1</span>
            <span>Listen carefully</span>
          </div>
          <div className="em-step">
            <span className="em-step-num">2</span>
            <span>Record your echo</span>
          </div>
          <div className="em-step">
            <span className="em-step-num">3</span>
            <span>Get AI feedback</span>
          </div>
        </div>

        {feedback && (
          <div className="em-feedback">
            <div className="em-score-row">
              <span>Match: {feedback.matchScore}/40</span>
              <span>Stress: {feedback.stressScore}/30</span>
              <span>Complete: {feedback.completenessScore}/30</span>
            </div>
            <p className="em-feedback-text">💡 {feedback.feedback}</p>
            {feedback.differences?.length > 0 && (
              <p className="em-differences">
                Words to work on: {feedback.differences.join(', ')}
              </p>
            )}
          </div>
        )}

        <button
          className={`em-listen-btn ${isPlaying ? 'em-listen-btn--active' : ''}`}
          onClick={playAudio}
          disabled={isPlaying || isRecording}
        >
          {isPlaying ? <Volume2 size={20} /> : <Play size={20} />}
          {isPlaying ? 'Playing...' : 'Play AI Voice'}
        </button>

        {!isRecording ? (
          <button className="em-record-btn" onClick={startRecordingHandler} disabled={isSubmitting}>
            <Mic size={20} />
            Record Your Echo
          </button>
        ) : (
          <div className="em-recording">
            <div className="em-rec-indicator">
              <span className="em-rec-dot" />
              Recording {recordingTime}s — repeat the sentence!
            </div>
            <button className="em-stop-btn" onClick={stopAndSubmit}>
              <MicOff size={18} />
              Submit Echo
            </button>
          </div>
        )}

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}