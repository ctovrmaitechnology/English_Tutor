import { useState, useRef } from 'react';
import { Mic, MicOff, Play } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './NewsAnchor.css';

export default function NewsAnchor({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [headline, setHeadline]   = useState('');
  const [script, setScript]       = useState('');
  const [targetWPM, setTargetWPM] = useState(120);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const timerRef         = useRef(null);

  const startGame = async () => {
    setResult(null);
    setError('');
    setIsRecording(false);
    setRecordingTime(0);
    setPhase('loading');

    try {
      const res = await gamesService.story.startNewsAnchor({
        gameType: 'NEWS_ANCHOR', category: 'STORY', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setHeadline(data.headline);
      setScript(data.script);
      setTargetWPM(data.targetWPM);
      setPhase('reading');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch {
      setError('Failed to load script. Please try again.');
      setPhase('idle');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch {
      setError('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsSubmitting(true);
    setPhase('submitting');

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
      const formData  = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Add timeMs as query param or use metadata
      const timeTakenMs = recordingTime * 1000;

      try {
        // Submit transcript — for now use Web Speech API transcript
        // or send audio to STT service
        const res = await gamesService.story.submitNewsAnchor(
          session.id,
          { answer: '(audio submitted)', timeMs: timeTakenMs }
        );
        setResult(res.data);
        setPhase('result');
        CompanionEvents.emit('CHALLENGE_COMPLETED');
      } catch {
        setError('Failed to submit recording.');
        setPhase('reading');
      } finally {
        setIsSubmitting(false);
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach(track => track.stop());
      }
    };
  };

  if (phase === 'idle') {
    return (
      <div className="news-anchor">
        <GameHeader title="News Anchor" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🎙️</div>
          <h2>News Anchor</h2>
          <p>Read a news script like a professional anchor!</p>
          <div className="game-intro-rules">
            <div className="rule">📰 AI generates a short news script</div>
            <div className="rule">🎙️ Read it aloud clearly and confidently</div>
            <div className="rule">⏱️ Target pace: <b>~120 words per minute</b></div>
            <div className="rule">🎯 AI scores fluency, pace & clarity</div>
            <div className="rule">🔒 Requires <b>microphone access</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Get My Script</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="news-anchor">
        <GameHeader title="News Anchor" score={0} onBack={onBack} />
        <GameLoading message={phase === 'loading' ? 'Generating your news script...' : 'AI is scoring your reading...'} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="news-anchor">
        <GameHeader title="News Anchor" score={result.overallScore} onBack={onBack} />
        <ScoreScreen
          score={result.overallScore}
          maxScore={0}
          xpEarned={result.xpEarned || 0}
          feedback={`${result.wordsPerMinute} WPM (target: ${targetWPM} WPM)`}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="na-breakdown">
            {[
              { label: 'Fluency',   value: result.breakdown?.fluency },
              { label: 'Accuracy',  value: result.breakdown?.accuracy },
              { label: 'Pace',      value: result.breakdown?.pace },
              { label: 'Clarity',   value: result.breakdown?.clarity },
            ].map((item, i) => (
              <div key={i} className="na-breakdown-item">
                <span className="na-breakdown-label">{item.label}</span>
                <div className="na-breakdown-bar">
                  <div className="na-breakdown-fill"
                    style={{ width: `${(item.value / 25) * 100}%` }} />
                </div>
                <span className="na-breakdown-value">{item.value}/25</span>
              </div>
            ))}
          </div>
          {result.feedback && <p className="na-feedback">{result.feedback}</p>}
        </ScoreScreen>
      </div>
    );
  }

  // Reading phase
  const recordingMins = Math.floor(recordingTime / 60);
  const recordingSecs = recordingTime % 60;

  return (
    <div className="news-anchor">
      <GameHeader title="News Anchor" score={0} onBack={onBack} />

      <div className="na-game">

        <div className="na-headline">
          🗞️ {headline}
        </div>

        <div className="na-script-box">
          <p className="na-script-label">📜 Read this script aloud:</p>
          <p className="na-script">{script}</p>
          <p className="na-wpm-hint">Target pace: {targetWPM} words per minute</p>
        </div>

        {!isRecording ? (
          <button className="na-record-btn" onClick={startRecording}>
            <Mic size={24} />
            Start Reading
          </button>
        ) : (
          <div className="na-recording">
            <div className="na-recording-indicator">
              <span className="na-rec-dot" />
              Recording — {recordingMins}:{recordingSecs.toString().padStart(2, '0')}
            </div>
            <button className="na-stop-btn" onClick={stopRecording}>
              <MicOff size={20} />
              Stop & Submit
            </button>
          </div>
        )}

        {error && <p className="game-error">{error}</p>}

      </div>
    </div>
  );
}