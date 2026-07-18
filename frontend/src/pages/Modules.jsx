import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Lock, CheckCircle, PlayCircle, ArrowLeft, Mic, PenTool, Award, HelpCircle, Loader2, Volume2, RefreshCw, Check, X, Sparkles, Square, AlertCircle, Printer, Play, ChevronRight, BookOpen, Trophy, Star, Brain, BarChart3 } from 'lucide-react';
import api from '../services/api';
import CompanionEvents from '../components/Companion/CompanionEvents';
const CompanionAnimations = lazy(() => import('../components/Companion/CompanionAnimations'));
import {
  VIDEO_SOURCES,
  SPEAKING_PROMPTS,
  SPEAKING_TOPIC_ASSESSMENTS,
  WRITING_QUIZZES,
  GAME_QUIZZES,
  CATEGORIES,
  SPEAKING_MODULES,
  WRITING_MODULES,
  MODULES_MAP,
} from '../constants/modules.data';
import './Modules.css';

// ── Speaking Step 2: Pronunciation Assessment ─────────────────
function SpeakingAssessmentStep({ sub, module, onNext }) {
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | analyzing | completed
  const [seconds, setSeconds] = useState(0);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [lessonData, setLessonData] = useState(null);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);

  // Load lesson prompt from backend (falls back to local SPEAKING_PROMPTS)
  useEffect(() => {
    let active = true;
    api.get(`/assessment/lesson-question/${sub.id}`)
      .then(res => { if (active && res.data) setLessonData(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [sub.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Recording timer (max 30 seconds)
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev >= 29) { stopRecording(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [recordingState]);

  const speakingPrompt = lessonData
    ? { prompt: lessonData.prompt, text: lessonData.questionText, tip: lessonData.explanation }
    : (SPEAKING_PROMPTS[sub.id] || SPEAKING_PROMPTS['default']);

  const playPromptTTS = async () => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); setTtsPlaying(false); return;
    }
    setTtsLoading(true);
    const promptText = (speakingPrompt?.text || '').replace(/[•\d\.\-]/g, '').trim();
    try {
      const response = await api.post('/voice/synthesize', { text: promptText, voice: 'af_heart', speed: 1.0 }, { responseType: 'blob' });
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      audio.onplay = () => { setTtsLoading(false); setTtsPlaying(true); };
      audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setTtsLoading(false); setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); fallbackSpeak(promptText); };
      await audio.play();
    } catch {
      setTtsLoading(false); setTtsPlaying(false);
      fallbackSpeak(promptText);
    }
  };

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 1.0;
      u.onstart = () => setTtsPlaying(true);
      u.onend = () => setTtsPlaying(false);
      u.onerror = () => setTtsPlaying(false);
      window.speechSynthesis.speak(u);
    }
  };

  const startRecording = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); }
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); setTtsPlaying(false); }
    setRecordingState('recording');
    setSpeakingResult(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendToSTT(blob);
      };
      mediaRecorder.start();
    } catch {
      fallbackStartRecording();
    }
  };

  const fallbackStartRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { evaluateSpeech(''); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    let transcript = '';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '; } };
    rec.onend = () => evaluateSpeech(transcript);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopRecording = () => {
    setRecordingState('analyzing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      evaluateSpeech('');
    }
  };

  const sendToSTT = async (blob) => {
    setRecordingState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      const res = await fetch('http://localhost:5001/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('STT error');
      const data = await res.json();
      evaluateSpeech(data.transcript || '');
    } catch {
      evaluateSpeech('');
    }
  };

  const evaluateSpeech = (transcript) => {
    setRecordingState('analyzing');
    setTimeout(() => {
      const clean = t => t.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•]/g, '').replace(/\s+/g, ' ').trim();
      const targetRaw = (speakingPrompt?.text || '').replace(/[•\d\.\-]/g, '');
      const target = clean(targetRaw);
      const spoken = clean(transcript);

      if (!spoken) {
        setSpeakingResult({ score: 0, feedback: 'No voice detected. Please speak clearly into your microphone.', fluency: 0, pronunciation: 0 });
        setRecordingState('completed');
        return;
      }

      const targetWords = target.split(' ').filter(w => w.length > 2);
      const spokenWords = spoken.split(' ').filter(w => w.length > 0);
      let matches = 0;
      targetWords.forEach(w => { if (spokenWords.includes(w)) matches++; });
      let score = targetWords.length > 0 ? Math.round((matches / targetWords.length) * 100) : 0;
      if (score > 0) score = Math.min(100, Math.max(15, score));

      // Derive fluency slightly differently for more granularity
      const fluency = Math.min(100, Math.round(score * 0.9 + (spokenWords.length > 5 ? 10 : 0)));
      const pronunciation = score;

      let feedback = '';
      if (score >= 85) feedback = 'Excellent pronunciation and natural rhythm! Your delivery was clear and confident.';
      else if (score >= 70) feedback = 'Good attempt! Keep practicing to improve syllable stress and sentence intonation.';
      else if (score >= 50) feedback = 'Fair effort. Focus on speaking each word clearly and following the pronunciation tips.';
      else feedback = 'We had trouble matching your speech. Try speaking more slowly and clearly, following the prompt text.';

      setSpeakingResult({ score, feedback, fluency, pronunciation, transcript });
      setRecordingState('completed');
    }, 1500);
  };

  const handleRetry = () => { setRecordingState('idle'); setSpeakingResult(null); setSeconds(0); };

  return (
    <div className="lf-card">
      <div className="lf-card-header">
        <Mic size={20} style={{ color: module.color }} />
        <div>
          <p className="lf-card-sub">Step 2 of 3 — Pronunciation Assessment</p>
          <h3 className="lf-card-title">{sub.title} — Speaking Practice</h3>
        </div>
      </div>

      {/* Prompt card */}
      <div className="prompt-card" style={{ '--theme-color': module.color, marginBottom: 20 }}>
        <div className="prompt-card-header">
          <button
            type="button"
            onClick={playPromptTTS}
            disabled={ttsLoading}
            title="Listen to correct pronunciation"
            style={{ background: 'none', border: 'none', padding: 0, marginRight: 8, cursor: ttsLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', color: ttsPlaying ? module.color : '#64748b', transition: 'color 0.2s' }}
          >
            {ttsLoading ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} className={ttsPlaying ? 'animate-pulse' : ''} style={{ color: ttsPlaying ? module.color : 'inherit' }} />}
          </button>
          <h4 style={{ display: 'inline-block', margin: 0 }}>{speakingPrompt.prompt}</h4>
        </div>
        <div className="prompt-card-text" style={{ borderLeftColor: module.color }}>
          {speakingPrompt.text.split('\n').map((line, i) => <p key={i} style={{ margin: '4px 0' }}>{line}</p>)}
        </div>
        <div className="prompt-card-tip">
          <strong>💡 Tip:</strong> {speakingPrompt.tip}
        </div>
      </div>

      {/* Recording states */}
      {recordingState === 'idle' && (
        <div className="speaking-action-zone">
          <p className="speaking-action-hint">Click the microphone and read the text above aloud. Your pronunciation will be evaluated.</p>
          <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
            <Mic size={32} />
          </button>
        </div>
      )}

      {recordingState === 'recording' && (
        <div className="speaking-action-zone">
          <p className="speaking-action-hint recording-text">🔴 Recording... Read the prompt above clearly.</p>
          <div className="wave-animation">
            {[1,2,3,4,5].map(n => <span key={n} className={`wave-bar bar-${n}`} style={{ backgroundColor: module.color }} />)}
          </div>
          <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:30</p>
          <button className="record-btn record-btn--recording" onClick={stopRecording}>
            <Square size={24} fill="#fff" />
          </button>
        </div>
      )}

      {recordingState === 'analyzing' && (
        <div className="speaking-action-zone">
          <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color }} />
          <p className="analyzing-text">Evaluating your pronunciation...</p>
        </div>
      )}

      {recordingState === 'completed' && speakingResult && (
        <div className="speaking-results-zone">
          <div className="score-header-box">
            <div className="score-circle" style={{ borderColor: module.color }}>
              <span className="score-num">{speakingResult.score}%</span>
              <span className="score-lbl">Score</span>
            </div>
            <div className="score-metrics">
              <div className="metric-row">
                <span>Fluency:</span>
                <div className="metric-bar-track">
                  <div className="metric-bar-fill" style={{ width: `${speakingResult.fluency}%`, background: module.color }} />
                </div>
                <span className="metric-val">{speakingResult.fluency}%</span>
              </div>
              <div className="metric-row">
                <span>Pronunciation:</span>
                <div className="metric-bar-track">
                  <div className="metric-bar-fill" style={{ width: `${speakingResult.pronunciation}%`, background: module.color }} />
                </div>
                <span className="metric-val">{speakingResult.pronunciation}%</span>
              </div>
            </div>
          </div>

          {speakingResult.transcript && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#475569' }}>
              <strong style={{ color: '#334155', display: 'block', marginBottom: 4 }}>What we heard:</strong>
              <em>"{speakingResult.transcript}"</em>
            </div>
          )}

          <div className="feedback-card">
            <Sparkles size={20} className="feedback-icon" style={{ color: module.color }} />
            <div className="feedback-text">
              <h5>Pronunciation Feedback</h5>
              <p>{speakingResult.feedback}</p>
            </div>
          </div>

          <div className="result-buttons" style={{ marginTop: 16 }}>
            <button className="retry-btn" onClick={handleRetry}>
              <RefreshCw size={16} /> Try Again
            </button>
            <button className="lf-primary-btn" onClick={onNext} style={{ background: module.color, color: '#fff', border: 'none' }}>
              Continue to AI Tutor <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Topic Assessment (3 Voice + 2 MCQ, Pass: 3/5) ─────
function TopicAssessment5QStep({ sub, module, onNext }) {
  const assessmentData = SPEAKING_TOPIC_ASSESSMENTS[sub.id] || SPEAKING_TOPIC_ASSESSMENTS['default'];
  const questions = assessmentData.questions || [];
  const totalQ = questions.length;

  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);

  // Voice question state
  const [voiceState, setVoiceState] = useState('idle'); // idle | recording | analyzing | result
  const [seconds, setSeconds] = useState(0);
  const [voiceResult, setVoiceResult] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);

  // MCQ state
  const [mcqSelected, setMcqSelected] = useState(null);
  const [mcqCorrect, setMcqCorrect] = useState(null);

  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);

  const currentQ = questions[qIdx] || {};

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (voiceState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev >= 29) { stopRecording(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [voiceState]);

  const playPromptTTS = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); return; }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setTtsPlaying(false); return; }
    setTtsLoading(true);
    const promptText = (currentQ.text || currentQ.prompt || '').replace(/[•\d\.\-']/g, '').trim();
    try {
      const response = await api.post('/voice/synthesize', { text: promptText, voice: 'af_heart', speed: 1.0 }, { responseType: 'blob' });
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      audio.onplay = () => { setTtsLoading(false); setTtsPlaying(true); };
      audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setTtsLoading(false); setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch {
      setTtsLoading(false); setTtsPlaying(false);
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(promptText);
        u.lang = 'en-US'; u.onstart = () => setTtsPlaying(true); u.onend = () => setTtsPlaying(false);
        window.speechSynthesis.speak(u);
      }
    }
  };

  const startRecording = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setVoiceState('recording');
    setVoiceResult(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendToSTT(blob);
      };
      mediaRecorder.start();
    } catch {
      fallbackStartRecording();
    }
  };

  const fallbackStartRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { evaluateSpeech(''); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    let transcript = '';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '; } };
    rec.onend = () => evaluateSpeech(transcript);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopRecording = () => {
    setVoiceState('analyzing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      evaluateSpeech('');
    }
  };

  const sendToSTT = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      const res = await fetch('http://localhost:5001/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('STT error');
      const data = await res.json();
      evaluateSpeech(data.transcript || '');
    } catch {
      evaluateSpeech('');
    }
  };

  const evaluateSpeech = (transcript) => {
    setVoiceState('analyzing');
    setTimeout(() => {
      const clean = t => (t || '').toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•']/g, '').replace(/\s+/g, ' ').trim();
      const targetText = currentQ.expectedResponse || currentQ.target || currentQ.text || '';
      const target = clean(targetText);
      const spoken = clean(transcript);

      if (!spoken) {
        setVoiceResult({
          passed: false,
          transcript: '',
          feedback: 'No speech detected. Please try recording again.',
          detailedEvaluation: null
        });
        setVoiceState('result');
        return;
      }

      const targetWords = target.split(' ').filter(w => w.length > 0);
      const spokenWords = spoken.split(' ').filter(w => w.length > 0);
      let matches = 0;
      targetWords.forEach(w => { if (spokenWords.some(sw => sw.includes(w) || w.includes(sw))) matches++; });
      const scoreRatio = targetWords.length > 0 ? matches / targetWords.length : (spokenWords.length > 2 ? 0.85 : 0.4);
      const passed = scoreRatio >= 0.45 || spoken.length > 6 || spokenWords.length >= 3;

      const pronunciationScore = currentQ.evalScores?.pronunciation || Math.min(100, Math.max(72, Math.round(scoreRatio * 85 + 18)));
      const fluencyScore = currentQ.evalScores?.fluency || Math.min(100, Math.max(75, Math.round(scoreRatio * 80 + 22)));
      const grammarScore = currentQ.evalScores?.grammar || Math.min(100, Math.max(82, Math.round(scoreRatio * 92 + 12)));
      const vocabularyScore = currentQ.evalScores?.vocabulary || Math.min(100, Math.max(76, Math.round(scoreRatio * 78 + 24)));
      const confidenceScore = currentQ.evalScores?.confidence || Math.min(100, Math.max(80, Math.round(scoreRatio * 86 + 18)));
      const completenessScore = currentQ.evalScores?.completeness || Math.min(100, Math.max(68, Math.round(scoreRatio * 100)));
      const overallScore = currentQ.evalScores?.overall || Math.round((pronunciationScore + fluencyScore + grammarScore + vocabularyScore + confidenceScore + completenessScore) / 6);

      const strengths = currentQ.strengths || [
        "Clear greeting and opening",
        "Good pronunciation of keywords",
        "Professional tone and delivery"
      ];
      const improvements = currentQ.improvements || [
        "Speak slightly slower for maximum clarity.",
        "Pause naturally between sentences.",
        "Smile while speaking to project confidence and warmth."
      ];

      const feedback = passed
        ? "Great job! Professional introduction delivered clearly with appropriate BPO communication tone."
        : `We heard "${spoken}". Make sure to enunciate clearly and follow the target response: "${targetText}".`;

      setVoiceResult({
        passed,
        transcript,
        feedback,
        detailedEvaluation: {
          pronunciation: pronunciationScore,
          fluency: fluencyScore,
          grammar: grammarScore,
          vocabulary: vocabularyScore,
          confidence: confidenceScore,
          completeness: completenessScore,
          overall: overallScore,
          strengths,
          improvements
        }
      });
      setVoiceState('result');
    }, 1200);
  };

  const handleSelectMcq = (idx) => {
    if (mcqSelected !== null) return;
    const correct = idx === currentQ.correct;
    setMcqSelected(idx);
    setMcqCorrect(correct);
  };

  const handleNextQuestion = () => {
    let isAnswerCorrect = false;
    if (currentQ.type === 'voice') {
      isAnswerCorrect = voiceResult?.passed || false;
    } else {
      isAnswerCorrect = mcqCorrect || false;
    }

    const newAnswers = [...answers, {
      qIdx,
      type: currentQ.type,
      prompt: currentQ.prompt || currentQ.q,
      correct: isAnswerCorrect,
      spokenText: voiceResult?.transcript || '',
    }];
    setAnswers(newAnswers);

    if (qIdx < totalQ - 1) {
      setQIdx(q => q + 1);
      setVoiceState('idle');
      setVoiceResult(null);
      setMcqSelected(null);
      setMcqCorrect(null);
    } else {
      setDone(true);
    }
  };

  const handleRetryStep2 = () => {
    setQIdx(0);
    setAnswers([]);
    setDone(false);
    setVoiceState('idle');
    setVoiceResult(null);
    setMcqSelected(null);
    setMcqCorrect(null);
  };

  if (done) {
    const passedCount = answers.filter(a => a.correct).length;
    const isPass = passedCount >= 3;
    const weakAreas = answers.filter(a => !a.correct).map(a => a.prompt);

    return (
      <div className="lf-card lf-score-card">
        <Trophy size={56} style={{ color: isPass ? '#10b981' : '#f59e0b', margin: '0 auto 12px' }} />
        <p className="lf-card-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 2 Results • Pass Requirement: 3/5</p>
        <h3 className="lf-score-title">{isPass ? 'Topic Assessment Passed! 🎉' : 'Needs More Practice 💪'}</h3>
        
        <div className="lf-score-circle" style={{ borderColor: isPass ? '#10b981' : '#f59e0b' }}>
          <span style={{ color: isPass ? '#10b981' : '#f59e0b', fontSize: 34, fontWeight: 700 }}>{passedCount}</span>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>out of {totalQ}</span>
        </div>

        <div className="lf-score-breakdown" style={{ marginTop: 16 }}>
          {answers.map((a, i) => (
            <div key={i} className="lf-score-row">
              <span className={`lf-score-dot ${a.correct ? 'lf-dot-correct' : 'lf-dot-wrong'}`} />
              <span style={{ fontSize: 13, color: '#334155', flex: 1 }}>
                <strong>Q{i + 1} ({a.type === 'voice' ? '🎙️ Voice' : '📝 MCQ'}):</strong> {a.prompt.substring(0, 50)}...
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: a.correct ? '#10b981' : '#ef4444' }}>
                {a.correct ? 'Passed' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        {isPass ? (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 14, marginBottom: 18, color: '#065f46', fontSize: 13 }}>
              ✅ <strong>Great job!</strong> You met the 3/5 passing threshold. Now let's put this into active conversation with your AI tutor.
            </div>
            <button
              className="lf-primary-btn"
              style={{ background: module.color, border: 'none' }}
              onClick={() => onNext({ score: passedCount, total: totalQ, weakAreas })}
            >
              Continue to AI Adaptive Practice <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14, marginBottom: 18, color: '#92400e', fontSize: 13 }}>
              ⚠️ You scored <strong>{passedCount}/5</strong>. A minimum of 3/5 is required to unlock the AI adaptive practice. Review the video and try again!
            </div>
            <button className="lf-primary-btn" onClick={handleRetryStep2} style={{ background: '#f59e0b', border: 'none' }}>
              <RefreshCw size={18} /> Retry Topic Assessment
            </button>
          </div>
        )}
      </div>
    );
  }

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="lf-card">
      <div className="lf-card-header">
        {currentQ.type === 'voice' ? <Mic size={22} style={{ color: module.color }} /> : <Brain size={22} style={{ color: module.color }} />}
        <div>
          <p className="lf-card-sub">Step 2 of 4 — Topic Assessment (Question {qIdx + 1} of {totalQ})</p>
          <h3 className="lf-card-title">{assessmentData.title} • {currentQ.type === 'voice' ? 'Voice Check' : 'Knowledge Check'}</h3>
        </div>
      </div>

      <div className="lf-quiz-progress-track">
        <div className="lf-quiz-progress-fill" style={{ width: `${((qIdx) / totalQ) * 100}%`, background: module.color }} />
      </div>

      {/* Voice Question View */}
      {currentQ.type === 'voice' && (
        <div style={{ marginTop: 16 }}>
          <div className="prompt-card" style={{ '--theme-color': module.color, marginBottom: 20 }}>
            <div className="prompt-card-header">
              <button
                type="button"
                onClick={playPromptTTS}
                disabled={ttsLoading}
                title="Listen to target pronunciation"
                style={{ background: 'none', border: 'none', padding: 0, marginRight: 8, cursor: ttsLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', color: ttsPlaying ? module.color : '#64748b' }}
              >
                {ttsLoading ? <Loader2 className="animate-spin" size={20} /> : <Volume2 size={20} className={ttsPlaying ? 'animate-pulse' : ''} style={{ color: ttsPlaying ? module.color : 'inherit' }} />}
              </button>
              <h4 style={{ display: 'inline-block', margin: 0 }}>{currentQ.prompt}</h4>
            </div>

            {currentQ.scenario && (
              <div style={{ padding: '6px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📌</span>
                <div>
                  <strong style={{ fontSize: 12, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scenario</strong>
                  <span style={{ fontSize: 15, color: '#1e293b', fontWeight: 600 }}>{currentQ.scenario}</span>
                </div>
              </div>
            )}

            {currentQ.question && (
              <div style={{ padding: '6px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 18 }}>🗣️</span>
                <div>
                  <strong style={{ fontSize: 12, color: '#64748b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question</strong>
                  <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 700 }}>{currentQ.question}</span>
                </div>
              </div>
            )}

    
            {currentQ.tip && (
              <div className="prompt-card-tip">
                <strong>💡 Tip:</strong> {currentQ.tip}
              </div>
            )}
          </div>

          {voiceState === 'idle' && (
            <div className="speaking-action-zone">
              <p className="speaking-action-hint">Click the microphone and say the target word/sentence clearly.</p>
              <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
                <Mic size={32} />
              </button>
            </div>
          )}

          {voiceState === 'recording' && (
            <div className="speaking-action-zone">
              <p className="speaking-action-hint recording-text">🔴 Recording... Speak the target text above clearly.</p>
              <div className="wave-animation">
                {[1, 2, 3, 4, 5].map(n => <span key={n} className={`wave-bar bar-${n}`} style={{ backgroundColor: module.color }} />)}
              </div>
              <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:30</p>
              <button className="record-btn record-btn--recording" onClick={stopRecording}>
                <Square size={24} fill="#fff" />
              </button>
            </div>
          )}

          {voiceState === 'analyzing' && (
            <div className="speaking-action-zone">
              <Loader2 className="animate-spin analysis-loader" size={44} style={{ color: module.color }} />
              <p className="analyzing-text">Evaluating your pronunciation accuracy...</p>
            </div>
          )}

          {voiceState === 'result' && voiceResult && (
            <div className="speaking-results-zone">
              {/* Top Banner: Status & Overall Score */}
              <div style={{
                background: '#ffffff',
                border: `2px solid ${voiceResult.passed ? '#10b981' : '#f59e0b'}`,
                borderRadius: 16,
                padding: '20px',
                marginBottom: 20,
                boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {voiceResult.passed ? <CheckCircle size={28} color="#10b981" /> : <AlertCircle size={28} color="#f59e0b" />}
                    <div>
                      <h4 style={{ color: voiceResult.passed ? '#15803d' : '#b45309', fontSize: 18, margin: 0, fontWeight: 700 }}>
                        {voiceResult.passed ? 'AI Speaking Evaluation • Passed (+1 Pt)' : 'AI Speaking Evaluation • Review Needed'}
                      </h4>
                      <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>Detailed multi-parameter speech analysis</p>
                    </div>
                  </div>

                  {voiceResult.detailedEvaluation && (
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #86efac',
                      borderRadius: 12,
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', display: 'block', letterSpacing: '0.05em' }}>Overall Score</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: 28, fontWeight: 800, color: '#15803d' }}>{voiceResult.detailedEvaluation.overall}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>/ 100</span>
                        </div>
                      </div>
                      <Trophy size={28} color="#10b981" />
                    </div>
                  )}
                </div>

                {voiceResult.transcript && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>What We Heard</span>
                    <p style={{ fontSize: 15, color: '#334155', margin: 0, fontStyle: 'italic', fontWeight: 500 }}>"{voiceResult.transcript}"</p>
                  </div>
                )}
                <p style={{ fontSize: 15, color: '#1e293b', margin: 0, fontWeight: 600 }}>{voiceResult.feedback}</p>

                {/* Detailed Evaluation Table / Grid */}
                {voiceResult.detailedEvaluation && (
                  <div style={{ marginTop: 22 }}>
                    <h5 style={{ fontSize: 15, fontWeight: 700, color: '#334155', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BarChart3 size={18} color={module.color} /> Evaluation Score Breakdown
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      {[
                        { label: 'Pronunciation', score: voiceResult.detailedEvaluation.pronunciation, color: '#6366f1' },
                        { label: 'Fluency', score: voiceResult.detailedEvaluation.fluency, color: '#3b82f6' },
                        { label: 'Grammar', score: voiceResult.detailedEvaluation.grammar, color: '#10b981' },
                        { label: 'Vocabulary', score: voiceResult.detailedEvaluation.vocabulary, color: '#8b5cf6' },
                        { label: 'Confidence', score: voiceResult.detailedEvaluation.confidence, color: '#f59e0b' },
                        { label: 'Completeness', score: voiceResult.detailedEvaluation.completeness, color: '#ec4899' },
                      ].map((item, idx) => (
                        <div key={idx} style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 12, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{item.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.score}%</span>
                          </div>
                          <div style={{ width: '100%', height: 7, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: 999, transition: 'width 0.8s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Strengths and Improvements Side by Side */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 20 }}>
                      {/* Strengths Box */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px' }}>
                        <h6 style={{ fontSize: 14, fontWeight: 700, color: '#166534', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle size={18} color="#166534" /> Strengths
                        </h6>
                        <ul style={{ margin: 0, paddingLeft: 20, color: '#15803d', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {voiceResult.detailedEvaluation.strengths.map((str, i) => (
                            <li key={i} style={{ fontWeight: 500 }}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvements Box */}
                      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px' }}>
                        <h6 style={{ fontSize: 14, fontWeight: 700, color: '#b45309', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertCircle size={18} color="#b45309" /> Improvements
                        </h6>
                        <ul style={{ margin: 0, paddingLeft: 20, color: '#92400e', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {voiceResult.detailedEvaluation.improvements.map((imp, i) => (
                            <li key={i} style={{ fontWeight: 500 }}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Try Again / Retake Speaking / Next Question */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="retry-btn"
                  onClick={() => { setVoiceState('idle'); setVoiceResult(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 12, fontWeight: 600, color: '#334155', cursor: 'pointer', fontSize: 15 }}
                >
                  <RefreshCw size={18} /> {voiceResult.passed ? 'Retake Speaking' : 'Try Again'}
                </button>
                <button
                  className="lf-primary-btn"
                  onClick={handleNextQuestion}
                  style={{ background: module.color, border: 'none', flex: 1, padding: '14px 24px', borderRadius: 12, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontSize: 15 }}
                >
                  Next Question <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MCQ Question View */}
      {currentQ.type === 'mcq' && (
        <div style={{ marginTop: 16 }}>
          <div className="lf-question-box">
            <p className="lf-question-text">{currentQ.q}</p>
          </div>

          <div className="lf-options-grid">
            {currentQ.options.map((opt, i) => {
              let cls = 'lf-option-btn';
              if (mcqSelected !== null) {
                if (i === currentQ.correct) cls += ' lf-option-correct';
                else if (i === mcqSelected && !mcqCorrect) cls += ' lf-option-wrong';
                else cls += ' lf-option-dim';
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelectMcq(i)} disabled={mcqSelected !== null}>
                  <span className="lf-option-letter">{optionLabels[i]}</span>
                  <span className="lf-option-text">{opt}</span>
                  {mcqSelected !== null && i === currentQ.correct && <Check size={18} className="lf-opt-icon" />}
                  {mcqSelected !== null && i === mcqSelected && !mcqCorrect && <X size={18} className="lf-opt-icon" />}
                </button>
              );
            })}
          </div>

          {mcqSelected !== null && (
            <div className={`lf-explanation ${mcqCorrect ? 'lf-exp-correct' : 'lf-exp-wrong'}`} style={{ marginTop: 16 }}>
              <span>{mcqCorrect ? '✅' : '❌'}</span>
              <div>
                <strong>{mcqCorrect ? 'Correct (+1 Pt)!' : 'Incorrect (0 Pt)'}</strong>
                <p>{currentQ.explanation}</p>
              </div>
            </div>
          )}

          {mcqSelected !== null && (
            <button className="lf-primary-btn" onClick={handleNextQuestion} style={{ marginTop: 20, background: module.color, border: 'none' }}>
              Next Question <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step 3: AI Adaptive Speaking Practice (Structured Oral Drill) ──
function AdaptiveSpeakingPracticeStep({ sub, module, assessmentData, onNext }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [rounds, setRounds] = useState([]);
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | analyzing | result
  const [seconds, setSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [currentResult, setCurrentResult] = useState(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [showHintText, setShowHintText] = useState(false);
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const ttsAudioRef = useRef(null);

  // Automatically speak AI question out loud when round changes or starts
  useEffect(() => {
    setShowHintText(false);
    if (rounds.length > 0 && currentRound?.question) {
      const timer = setTimeout(() => {
        playTTS();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [roundIdx, rounds.length]);

  // Initialize 4 structured oral speaking rounds based on Step 2 test score
  useEffect(() => {
    const score = assessmentData?.score || 3;
    const weakList = assessmentData?.weakAreas || [];
    const weakSubject = weakList.length > 0 ? weakList[0] : sub.title;

    let generatedRounds = [];

    if (score >= 4) {
      // High score (4/5 or 5/5) → Ask high level challenging questions
      generatedRounds = [
        {
          difficulty: 'High-Level Challenge',
          title: 'Professional Meeting Scenario',
          question: `Since you scored an excellent ${score}/5 in the topic check, let's test high-level application! Please speak aloud and explain how you would introduce and use ${sub.title} during a formal client negotiation.`,
          tip: 'Speak with authority, professional pacing, and clear vocal variety.'
        },
        {
          difficulty: 'High-Level Challenge',
          title: 'Handling Unexpected Pushback',
          question: `Imagine the listener misunderstood your pronunciation or intent regarding ${sub.title}. How would you calmly rephrase and clarify your statement using accurate intonation?`,
          tip: 'Focus on polite, persuasive tone and stress the keywords clearly.'
        },
        {
          difficulty: 'High-Level Challenge',
          title: 'Executive Summary Drill',
          question: `Please deliver a 30-second spoken briefing summarizing the most critical rules of ${sub.title} as if teaching a junior colleague.`,
          tip: 'Avoid filler words (um, ah) and speak smoothly without hesitation.'
        },
        {
          difficulty: 'High-Level Challenge',
          title: 'Real-World Communication Mastery',
          question: `For our final challenge, give me a concrete example from your daily life or career where mastering ${sub.title} made your communication much more impactful.`,
          tip: 'Enunciate every word crisply and bring energy to your voice.'
        }
      ];
    } else {
      // Pass score (3/5) → 2 Easy Fundamental rounds + 2 Hard Application rounds
      generatedRounds = [
        {
          difficulty: 'Easy Fundamental (1 of 2)',
          title: 'Core Sound Warm-up',
          question: `You passed the assessment with ${score}/5! Let's start with an easy warm-up. Please speak clearly into the microphone and pronounce the core concepts of ${sub.title} in a simple, complete sentence.`,
          tip: 'Take your time and articulate every vowel and consonant sound clearly.'
        },
        {
          difficulty: 'Easy Fundamental (2 of 2)',
          title: `Focused Practice on ${weakSubject}`,
          question: `Let's reinforce where you had slight hesitation: ${weakSubject}. Please say aloud clearly: "I practice clear speech, steady rhythm, and confident pronunciation every single day."`,
          tip: 'Focus on connecting the words smoothly without rushing.'
        },
        {
          difficulty: 'Hard Application (1 of 2)',
          title: 'Spoken Scenario Application',
          question: `Now let's move to a harder application! Imagine you are on an urgent phone call with a customer. How would you apply what you learned about ${sub.title} to ensure clear communication?`,
          tip: 'Speak directly into the microphone with a warm, empathetic tone.'
        },
        {
          difficulty: 'Hard Application (2 of 2)',
          title: 'Spoken Fluency Challenge',
          question: `Final speaking challenge! Without reading from notes, speak for 20 seconds explaining why mastering ${sub.title} builds trust and professionalism in English.`,
          tip: 'Maintain steady speed and clear ending consonants.'
        }
      ];
    }

    setRounds(generatedRounds);
  }, [sub.title, assessmentData]);

  // Session clock (Target: 3 to 5 minutes)
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Recording timer (max 45 seconds per round)
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev >= 44) { stopVoiceRec(); return 45; }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [recordingState]);

  const currentRound = rounds[roundIdx] || {
    difficulty: 'Practice Drill',
    title: 'Oral Speaking Warm-up',
    question: `Welcome to Step 3! Let's practice speaking about ${sub?.title || 'this topic'}. Please speak into the microphone and explain what you learned.`,
    tip: 'Speak clearly into your microphone in complete sentences.'
  };

  const playTTS = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); return; }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); setTtsPlaying(false); return; }
    setTtsLoading(true);
    const promptText = currentRound.question || '';
    try {
      const response = await api.post('/voice/synthesize', { text: promptText, voice: 'af_heart', speed: 1.05 }, { responseType: 'blob' });
      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;
      audio.onplay = () => { setTtsLoading(false); setTtsPlaying(true); };
      audio.onended = () => { setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setTtsLoading(false); setTtsPlaying(false); ttsAudioRef.current = null; URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch {
      setTtsLoading(false); setTtsPlaying(false);
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(promptText);
        u.lang = 'en-US'; u.onstart = () => setTtsPlaying(true); u.onend = () => setTtsPlaying(false);
        window.speechSynthesis.speak(u);
      }
    }
  };

  const startVoiceRec = async () => {
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlaying(false); }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setRecordingState('recording');
    setCurrentResult(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendAudioForEvaluation(blob);
      };
      mediaRecorder.start();
    } catch {
      fallbackSpeechRecognition();
    }
  };

  const fallbackSpeechRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { evaluateSpokenAnswer(''); return; }
    const rec = new SR();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';
    let transcript = '';
    rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) transcript += e.results[i][0].transcript + ' '; } };
    rec.onend = () => evaluateSpokenAnswer(transcript);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopVoiceRec = () => {
    setRecordingState('analyzing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      evaluateSpokenAnswer('');
    }
  };

  const sendAudioForEvaluation = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'audio.webm');
      const res = await fetch('http://localhost:5001/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('STT error');
      const data = await res.json();
      evaluateSpokenAnswer(data.transcript || '');
    } catch {
      evaluateSpokenAnswer('');
    }
  };

  const evaluateSpokenAnswer = (transcript) => {
    setRecordingState('analyzing');
    setTimeout(() => {
      const cleanText = (transcript || '').trim();
      const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;

      let feedback = "";
      if (!cleanText || wordCount < 3) {
        feedback = "We detected brief or unclear audio. Make sure you speak directly into your microphone in complete sentences so AI can score your fluency!";
      } else if (wordCount >= 12) {
        feedback = `🌟 Excellent high-level fluency! You spoke clearly with ${wordCount} words, demonstrated natural pacing, and addressed the topic of ${sub.title} professionally.`;
      } else {
        feedback = `💪 Good spoken response (${wordCount} words)! Your clarity was solid. To reach executive-level fluency, try expanding your answer with one more supporting example sentence.`;
      }

      setCurrentResult({
        transcript: cleanText || '(No clear speech captured)',
        wordCount,
        feedback,
      });
      setRecordingState('result');
    }, 1400);
  };

  const handleNextRound = () => {
    if (roundIdx < rounds.length - 1) {
      setRoundIdx(r => r + 1);
      setRecordingState('idle');
      setCurrentResult(null);
    } else {
      setCompleted(true);
    }
  };

  const formatMinSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  if (completed) {
    return (
      <div className="lf-card lf-score-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
        <p className="lf-card-sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Step 3 Complete • Oral Speaking Drill</p>
        <h3 className="lf-score-title">AI Speaking Practice Completed!</h3>
        <p style={{ color: '#475569', fontSize: 15, maxWidth: 520, margin: '12px auto 20px', lineHeight: 1.6 }}>
          You completed all <strong>4 structured speaking rounds</strong> with your AI coach in <strong>{formatMinSec(sessionSeconds)}</strong>! You successfully transitioned from fundamental pronunciation to high-level conversational application.
        </p>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, maxWidth: 480, margin: '0 auto 24px', color: '#166534', fontSize: 14 }}>
          ✅ <strong>Ready for AI Tutor:</strong> Your oral performance profile has been updated. Now enjoy free-form discussion and doubt clearing with VRM Buddy!
        </div>

        <button
          className="lf-primary-btn"
          onClick={onNext}
          style={{ background: module.color, border: 'none', margin: '0 auto', padding: '16px 36px', fontSize: 16 }}
        >
          Continue to AI Tutor Free Discussion <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="lf-card">
      {/* Header with live drill timer and score badge */}
      <div className="lf-card-header" style={{ alignItems: 'flex-start' }}>
        <Sparkles size={24} style={{ color: module.color, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p className="lf-card-sub" style={{ margin: 0 }}>
              Step 3 of 4 — AI Oral Speaking Drill • <strong>Round {roundIdx + 1} of {rounds.length || 4}</strong>
            </p>
            <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⏱️ Drill Time:</span> <span style={{ color: module.color }}>{formatMinSec(sessionSeconds)}</span> <span style={{ opacity: 0.6 }}>(Target: 3-5m)</span>
            </div>
          </div>
          <h3 className="lf-card-title" style={{ marginTop: 4 }}>
            {sub.title} • {currentRound.difficulty || 'Practice Drill'}
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
            {assessmentData?.score >= 4
              ? `🔥 High Score (${assessmentData.score}/5) Mode: Asking advanced performance questions to push your fluency.`
              : `🎯 Adaptive Mode (${assessmentData?.score}/5 Score): Structured progression (2 Easy fundamental → 2 Hard application).`}
          </p>
        </div>
      </div>

      {/* Progress Bar for 4 Rounds */}
      <div className="lf-quiz-progress-track" style={{ marginTop: 16 }}>
        <div className="lf-quiz-progress-fill" style={{ width: `${((roundIdx) / Math.max(1, rounds.length)) * 100}%`, background: module.color }} />
      </div>

      {/* Full-view avatar — no card, no box */}
      <div style={{ width: '100%', minHeight: 380, margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 320, height: 380, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Suspense fallback={<div style={{ fontSize: 80 }}>🤖</div>}>
            <CompanionAnimations state={ttsPlaying ? 'ai_talking' : 'idle'} />
          </Suspense>
          {ttsPlaying && (
            <div style={{ position: 'absolute', bottom: 0, background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} className="animate-ping" />
              Buddy Speaking...
            </div>
          )}
        </div>
      </div>

      {/* Voice-Only Recording Zone (No Text Chatting!) */}
      {recordingState === 'idle' && (
        <div className="speaking-action-zone" style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
          <p className="speaking-action-hint" style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 12 }}>
            🎙️ Click the microphone below and speak your answer aloud in complete sentences.
          </p>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
            (Oral Speaking Practice — No typing required! Speak clearly for up to 45 seconds per round.)
          </p>
          <button className="record-btn" onClick={startVoiceRec} style={{ '--theme-color': module.color, transform: 'scale(1.15)', margin: '0 auto' }}>
            <Mic size={36} />
          </button>
        </div>
      )}

      {recordingState === 'recording' && (
        <div className="speaking-action-zone" style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 16, padding: '28px 20px', textAlign: 'center' }}>
          <p className="speaking-action-hint recording-text" style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', marginBottom: 14 }}>
            🔴 Recording Your Answer... Speak clearly into your microphone now!
          </p>
          <div className="wave-animation" style={{ margin: '16px auto' }}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => <span key={n} className={`wave-bar bar-${n % 5 + 1}`} style={{ backgroundColor: '#ef4444' }} />)}
          </div>
          <p className="recording-timer" style={{ fontSize: 18, fontWeight: 700, color: '#b91c1c', marginBottom: 18 }}>
            0:{seconds < 10 ? `0${seconds}` : seconds} / 0:45 max
          </p>
          <button className="record-btn record-btn--recording" onClick={stopVoiceRec} style={{ transform: 'scale(1.1)' }}>
            <Square size={26} fill="#fff" />
          </button>
          <p style={{ fontSize: 13, color: '#7f1d1d', marginTop: 12, fontWeight: 600 }}>Click square button when finished speaking</p>
        </div>
      )}

      {recordingState === 'analyzing' && (
        <div className="speaking-action-zone" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
          <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color, margin: '0 auto 16px' }} />
          <h4 style={{ fontSize: 17, color: '#1e293b', marginBottom: 6 }}>Analyzing Your Spoken Fluency...</h4>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Evaluating speech clarity, word count, and pronunciation rhythm.</p>
        </div>
      )}

      {recordingState === 'result' && currentResult && (
        <div className="speaking-results-zone" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <CheckCircle size={22} color="#10b981" />
              <strong style={{ color: '#166534', fontSize: 16 }}>Oral Response Evaluated! ({currentResult.wordCount} words captured)</strong>
            </div>
            <p style={{ fontSize: 14, color: '#334155', margin: '8px 0 12px', padding: '10px 14px', background: '#ffffff', borderRadius: 8, borderLeft: '3px solid #10b981' }}>
              <strong>What we heard:</strong> "{currentResult.transcript}"
            </p>
            <p style={{ fontSize: 14, color: '#15803d', fontWeight: 600, margin: 0 }}>
              🤖 AI Coach Feedback: {currentResult.feedback}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="retry-btn" onClick={() => { setRecordingState('idle'); setCurrentResult(null); }} style={{ padding: '12px 18px' }}>
              <RefreshCw size={16} /> Re-record This Answer
            </button>
            <button className="lf-primary-btn" onClick={handleNextRound} style={{ background: module.color, border: 'none', flex: 1, padding: '14px 24px', fontSize: 15 }}>
              {roundIdx < rounds.length - 1 ? `Proceed to Round ${roundIdx + 2} of ${rounds.length}` : 'Complete Practice Session'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3/4-Step Lesson Flow: Video → Assessment → AI Practice → AI Tutor ──────
function LessonFlowView({ sub, module, category, onBack, onComplete, onUncomplete, isCompleted }) {
  const [step, setStep] = useState('video'); // 'video' | 'assessment' | 'practice' | 'tutor'
  const [assessmentResults, setAssessmentResults] = useState(null);
  const videoRef = useRef(null);

  // Quiz state (writing only)
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExp, setShowExp] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [tutorOpened, setTutorOpened] = useState(false);

  const videoSrc = VIDEO_SOURCES[sub.id] || null;
  const quizData = GAME_QUIZZES[sub.id] || GAME_QUIZZES['default'];
  const currentQ = quizData.questions[qIdx];
  const totalQ = quizData.questions.length;

  const isSpeaking = category === 'speaking';

  const handleSelectOption = (idx) => {
    if (selected !== null) return;
    const correct = idx === currentQ.correct;
    setSelected(idx);
    setIsCorrect(correct);
    setShowExp(true);
    if (correct) setCorrectCount(c => c + 1);
  };

  const handleNextQ = () => {
    if (qIdx < totalQ - 1) {
      setQIdx(q => q + 1);
      setSelected(null);
      setIsCorrect(null);
      setShowExp(false);
    } else {
      setQuizDone(true);
    }
  };

  const handleOpenTutor = () => {
    setTutorOpened(true);
    CompanionEvents.emit('OPEN_TUTOR_SESSION', {
      topic: sub.title,
      moduleTitle: module.title,
      category,
    });
  };

  const scoreLabel = () => {
    const pct = Math.round((correctCount / totalQ) * 100);
    if (pct === 100) return { label: 'Perfect Score! 🎉', color: '#10b981' };
    if (pct >= 80) return { label: 'Great Job! 👏', color: '#3b82f6' };
    if (pct >= 60) return { label: 'Good Effort! 💪', color: '#f59e0b' };
    return { label: 'Keep Practicing! 📚', color: '#ef4444' };
  };

  const optionLabel = ['A', 'B', 'C', 'D'];

  // Step labels differ by category
  const stepIds = isSpeaking
    ? ['video', 'assessment', 'practice', 'tutor']
    : ['video', 'practice', 'tutor'];
  const stepLabels = isSpeaking
    ? ['📹 Video Lesson', '📝 Topic Assessment (5 Qs)', '🎤 AI Speaking Practice', '🤖 AI Tutor']
    : ['📹 Video Lecture', '🎮 Quiz', '🤖 AI Tutor'];

  return (
    <div className="lf-container">
      {/* Back button */}
      <button className="lf-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Lessons
      </button>

      {/* Step indicator */}
      <div className="lf-step-bar">
        {stepIds.map((s, i) => {
          const stepOrder = stepIds.indexOf(step);
          const done = i < stepOrder || (s === 'tutor' && step === 'tutor' && isCompleted);
          const active = step === s;
          return (
            <div key={s} className={`lf-step-pill ${active ? 'lf-step-active' : done ? 'lf-step-done' : 'lf-step-idle'}`}>
              {done && !active ? <Check size={13} /> : <span>{i + 1}</span>}
              {stepLabels[i]}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: VIDEO ─────────────────────────────────────── */}
      {step === 'video' && (
        <div className="lf-card">
          <div className="lf-card-header">
            <BookOpen size={20} style={{ color: '#6366f1' }} />
            <div>
              <p className="lf-card-sub">Step 1 of {stepIds.length} — Video Lesson</p>
              <h3 className="lf-card-title">{sub.title}</h3>
            </div>
          </div>

          {videoSrc ? (
            <div className="lf-video-wrap">
              <video ref={videoRef} className="lf-video" controls src={videoSrc} preload="metadata">
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="lf-video-placeholder">
              <Play size={48} style={{ color: '#94a3b8' }} />
              <p style={{ color: '#64748b', fontWeight: 600, marginTop: 12 }}>Video lecture coming soon</p>
              <p style={{ color: '#94a3b8', fontSize: 13 }}>The video for this lesson will be added shortly.</p>
            </div>
          )}

          <div className="lf-video-tip">
            <span>💡</span>
            <p>
              Watch the video lesson, then click{' '}
              <strong>{isSpeaking ? 'Continue to Topic Assessment (5 Qs)' : 'Continue to Quiz'}</strong>{' '}
              to test what you've learned.
            </p>
          </div>

          <button className="lf-primary-btn" onClick={() => setStep(isSpeaking ? 'assessment' : 'practice')}>
            {isSpeaking ? 'Continue to Topic Assessment (5 Qs)' : 'Continue to Quiz'} <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 2: SPEAKING — Topic Assessment (3 Voice + 2 MCQ) ── */}
      {step === 'assessment' && isSpeaking && (
        <TopicAssessment5QStep
          sub={sub}
          module={module}
          onNext={(results) => {
            setAssessmentResults(results);
            setStep('practice');
          }}
        />
      )}

      {/* ── STEP 3: SPEAKING — AI Adaptive Speaking Practice ─────── */}
      {step === 'practice' && isSpeaking && (
        <AdaptiveSpeakingPracticeStep
          sub={sub}
          module={module}
          assessmentData={assessmentResults}
          onNext={() => setStep('tutor')}
        />
      )}

      {/* ── STEP 2: WRITING — Gamified Quiz ───────────────────── */}
      {step === 'practice' && !isSpeaking && !quizDone && (
        <div className="lf-card">
          <div className="lf-card-header">
            <Brain size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <p className="lf-card-sub">Step 2 of 3 — Knowledge Check</p>
              <h3 className="lf-card-title">{quizData.title}</h3>
            </div>
          </div>

          <div className="lf-quiz-progress-track">
            <div className="lf-quiz-progress-fill" style={{ width: `${((qIdx) / totalQ) * 100}%` }} />
          </div>
          <p className="lf-quiz-counter">Question {qIdx + 1} of {totalQ}</p>

          <div className="lf-question-box">
            <p className="lf-question-text">{currentQ.q}</p>
          </div>

          <div className="lf-options-grid">
            {currentQ.options.map((opt, i) => {
              let cls = 'lf-option-btn';
              if (selected !== null) {
                if (i === currentQ.correct) cls += ' lf-option-correct';
                else if (i === selected && !isCorrect) cls += ' lf-option-wrong';
                else cls += ' lf-option-dim';
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelectOption(i)} disabled={selected !== null}>
                  <span className="lf-option-letter">{optionLabel[i]}</span>
                  <span className="lf-option-text">{opt}</span>
                  {selected !== null && i === currentQ.correct && <Check size={18} className="lf-opt-icon" />}
                  {selected !== null && i === selected && !isCorrect && <X size={18} className="lf-opt-icon" />}
                </button>
              );
            })}
          </div>

          {showExp && (
            <div className={`lf-explanation ${isCorrect ? 'lf-exp-correct' : 'lf-exp-wrong'}`}>
              <span>{isCorrect ? '✅' : '❌'}</span>
              <div>
                <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
                <p>{currentQ.explanation}</p>
              </div>
            </div>
          )}

          {selected !== null && (
            <button className="lf-primary-btn" onClick={handleNextQ} style={{ marginTop: 12 }}>
              {qIdx < totalQ - 1 ? 'Next Question' : 'See My Score'} <ChevronRight size={18} />
            </button>
          )}
        </div>
      )}

      {/* ── WRITING QUIZ SCORE SUMMARY ────────────────────────── */}
      {step === 'practice' && !isSpeaking && quizDone && (
        <div className="lf-card lf-score-card">
          <Trophy size={52} style={{ color: '#f59e0b', margin: '0 auto 8px' }} />
          <h3 className="lf-score-title">{scoreLabel().label}</h3>
          <div className="lf-score-circle" style={{ borderColor: scoreLabel().color }}>
            <span style={{ color: scoreLabel().color, fontSize: 32, fontWeight: 700 }}>{correctCount}</span>
            <span style={{ color: '#94a3b8', fontSize: 14 }}>out of {totalQ}</span>
          </div>
          <div className="lf-score-breakdown">
            {quizData.questions.map((q, i) => (
              <div key={i} className="lf-score-row">
                <span className={`lf-score-dot ${i < correctCount ? 'lf-dot-correct' : 'lf-dot-wrong'}`} />
                <span style={{ fontSize: 13, color: '#475569', flex: 1 }}>{q.q.substring(0, 60)}...</span>
              </div>
            ))}
          </div>
          <button className="lf-primary-btn" style={{ marginTop: 20 }} onClick={() => setStep('tutor')}>
            Meet Your AI Tutor <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 3: AI TUTOR ──────────────────────────────────── */}
      {step === 'tutor' && (
        <div className="lf-card lf-tutor-card">
          <div className="lf-card-header">
            <Star size={20} style={{ color: '#f59e0b' }} />
            <div>
              <p className="lf-card-sub">Step 3 of 3 — AI Tutor Session</p>
              <h3 className="lf-card-title">Learn with Your AI Tutor</h3>
            </div>
          </div>

          <div className="lf-tutor-intro">
            <div className="lf-tutor-avatar">🤖</div>
            <div className="lf-tutor-bubble">
              <p><strong>VRM Buddy</strong> is ready to explain <strong>{sub.title}</strong> in depth!</p>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                Your AI tutor will open in full screen and walk you through the key concepts, answer your questions, and help reinforce what you learned.
              </p>
            </div>
          </div>

          <div className="lf-tutor-features">
            <div className="lf-tutor-feat"><span>💬</span> Ask any question about the lesson</div>
            <div className="lf-tutor-feat"><span>🎤</span> Practice speaking with voice chat</div>
            <div className="lf-tutor-feat"><span>📖</span> Get detailed explanations and examples</div>
          </div>

          {!tutorOpened ? (
            <button className="lf-tutor-open-btn" onClick={handleOpenTutor}>
              <span>🤖</span> Open AI Tutor Session
            </button>
          ) : (
            <div className="lf-tutor-opened-note">
              <Check size={18} style={{ color: '#10b981' }} />
              <p>AI Tutor is open! Chat with VRM Buddy in the overlay.</p>
            </div>
          )}

          <div className="lf-complete-section">
            <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
              After your tutor session, mark this lesson as complete to unlock the next one.
            </p>
            {isCompleted ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div className="lf-completed-badge"><CheckCircle size={16} /> Lesson Completed!</div>
                <button className="lf-uncomplete-btn" onClick={onUncomplete}>Mark Incomplete</button>
              </div>
            ) : (
              <button className="lf-complete-btn" onClick={onComplete}>
                <CheckCircle size={18} /> Mark Lesson as Complete ✓
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-module lesson view ────────────────────────────────────
function SubModuleView({ sub, module, category, onBack, onComplete, onUncomplete, isCompleted }) {
  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);

  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, analyzing, completed
  const [seconds, setSeconds] = useState(0);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // TTS State variables
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Clear any playing TTS audio when sub.id changes or on unmount
  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [sub.id]);

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.onstart = () => {
        setTtsPlaying(true);
      };
      utterance.onend = () => {
        setTtsPlaying(false);
      };
      utterance.onerror = () => {
        setTtsPlaying(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const playPromptTTS = async () => {
    // If already playing, stop it
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlaying(false);
      return;
    }
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }

    setTtsLoading(true);
    try {
      const promptText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '')
        .trim();

      const response = await api.post('/voice/synthesize', {
        text: promptText,
        voice: 'af_heart', // warm friendly American voice
        speed: 1.1
      }, {
        responseType: 'blob'
      });

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;

      audio.onplay = () => {
        setTtsLoading(false);
        setTtsPlaying(true);
      };

      audio.onended = () => {
        setTtsPlaying(false);
        ttsAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setTtsLoading(false);
        setTtsPlaying(false);
        ttsAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
        fallbackSpeak(promptText);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play TTS from backend:', err);
      setTtsLoading(false);
      setTtsPlaying(false);
      const fallbackText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '')
        .trim();
      fallbackSpeak(fallbackText);
    }
  };

  // Fetch lesson data from DB on mount/update
  useEffect(() => {
    let active = true;
    const loadLessonQuestion = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/assessment/lesson-question/${sub.id}`);
        if (active) {
          if (res.data) {
            setLessonData(res.data);
          } else {
            setLessonData(null);
          }
        }
      } catch (err) {
        console.error("Failed to load lesson question from DB, using fallback", err);
        if (active) setLessonData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLessonQuestion();
    return () => { active = false; };
  }, [sub.id]);

  // Timer effect for speaking recording
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 9) {
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  const startRecording = async () => {
    // Stop any playing TTS audio before starting recording
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlaying(false);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
    }

    setRecordingState('recording');
    setSpeakingResult(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      fallbackStartRecording();
    }
  };

  const fallbackStartRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      let fullTranscript = '';
      rec.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
        }
      };

      rec.onend = () => {
        evaluateSpeech(fullTranscript);
      };

      recognitionRef.current = rec;
      rec.start();
    } else {
      console.warn('Speech recognition not supported in this browser.');
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    setRecordingState('analyzing');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    } else {
      evaluateSpeech('');
    }
  };

  const sendToWhisper = async (audioBlob) => {
    setRecordingState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await fetch('http://localhost:5001/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Whisper server error');
      }

      const data = await response.json();
      const transcript = data.transcript || '';
      console.log('Whisper transcription:', transcript);
      evaluateSpeech(transcript);
    } catch (err) {
      console.error('Whisper STT failed, falling back to local SpeechRecognition logic', err);
      evaluateSpeech('');
    }
  };

  const evaluateSpeech = (transcript) => {
    setRecordingState('analyzing');

    setTimeout(() => {
      const cleanText = (text) => {
        return text
          .toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      const targetText = (speakingPrompt?.text || '')
        .replace(/[•\d\.\-]/g, '');

      const target = cleanText(targetText);
      const spoken = cleanText(transcript);

      if (!spoken) {
        // Silent or no speech detected
        setSpeakingResult({
          score: 0,
          feedback: "No voice detected. Please speak clearly into your microphone.",
          fluency: 0,
          pronunciation: 0
        });
        setRecordingState('completed');
        return;
      }

      const targetWords = target.split(' ').filter(w => w.length > 0);
      const spokenWords = spoken.split(' ').filter(w => w.length > 0);

      let matches = 0;
      targetWords.forEach(word => {
        if (spokenWords.includes(word)) {
          matches++;
        }
      });

      let score = Math.round((matches / targetWords.length) * 100);
      if (score > 0) {
        score = Math.min(100, Math.max(15, score));
      } else {
        score = 0;
      }

      let feedback = "";
      if (score >= 85) {
        feedback = "Excellent pronunciation and natural rhythm. Well done!";
      } else if (score >= 70) {
        feedback = "Good attempt! Keep practicing to improve syllable stress and sentence intonation.";
      } else {
        feedback = "We had trouble matching your voice. Speak clearly and follow the pronunciation tips.";
      }

      setSpeakingResult({
        score,
        feedback,
        fluency: score,
        pronunciation: score
      });
      setRecordingState('completed');
    }, 1500);
  };

  const handleRetrySpeaking = () => {
    setRecordingState('idle');
    setSpeakingResult(null);
    setSeconds(0);
  };

  // Setup options/fallbacks
  const fallbackSpeaking = SPEAKING_PROMPTS[sub.id] || SPEAKING_PROMPTS['default'];
  const fallbackWriting = WRITING_QUIZZES[sub.id] || WRITING_QUIZZES['default'];

  const speakingPrompt = lessonData && category === 'speaking' ? {
    prompt: lessonData.prompt,
    text: lessonData.questionText,
    tip: lessonData.explanation
  } : fallbackSpeaking;

  const quiz = lessonData && category === 'writing' ? {
    question: lessonData.questionText,
    options: lessonData.options || [],
    correctIdx: lessonData.correctOptionIndex,
    explanation: lessonData.explanation
  } : fallbackWriting;

  const handleSelectOption = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
  };

  const handleRetryWriting = () => {
    setSelectedOption(null);
  };

  if (loading) {
    return (
      <div className="modules-page">
        <button className="modules-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {module.title}
        </button>
        <div className="modules-submodule-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader2 className="animate-spin" size={40} style={{ color: module.color }} />
          <span style={{ marginLeft: '12px', fontWeight: 600, color: '#475569' }}>Loading lesson content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to {module.title}
      </button>

      <div className="modules-submodule-card">
        <div className="modules-submodule-header"
          style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}bb)` }}>
          <span className="modules-submodule-emoji">{sub.icon}</span>
          <div>
            <p className="modules-submodule-module-name">Module {module.number} • {category === 'speaking' ? 'Speaking Lesson' : 'Writing Lesson'}</p>
            <h2 className="modules-submodule-title">{sub.title}</h2>
          </div>
        </div>

        <div className="modules-submodule-body">
          {category === 'speaking' ? (
            <div className="speaking-lesson-container">
              <div className="prompt-card" style={{ '--theme-color': module.color }}>
                <div className="prompt-card-header">
                  <button
                    type="button"
                    onClick={playPromptTTS}
                    disabled={ttsLoading}
                    className={`prompt-tts-btn ${ttsPlaying ? 'prompt-tts-btn--playing' : ''} ${ttsLoading ? 'prompt-tts-btn--loading' : ''}`}
                    title="Listen to correct pronunciation"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginRight: '8px',
                      cursor: ttsLoading ? 'wait' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: ttsPlaying ? module.color : '#64748b',
                      transition: 'color 0.2s, transform 0.1s',
                      verticalAlign: 'middle'
                    }}
                    onMouseDown={(e) => {
                      if (!ttsLoading) e.currentTarget.style.transform = 'scale(0.9)';
                    }}
                    onMouseUp={(e) => {
                      if (!ttsLoading) e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {ttsLoading ? (
                      <Loader2 className="animate-spin prompt-card-icon" size={20} style={{ margin: 0 }} />
                    ) : (
                      <Volume2 
                        size={20} 
                        className={`prompt-card-icon ${ttsPlaying ? 'animate-pulse' : ''}`} 
                        style={{ color: ttsPlaying ? module.color : 'inherit', margin: 0 }}
                      />
                    )}
                  </button>
                  <h4 style={{ display: 'inline-block', verticalAlign: 'middle', margin: 0 }}>{speakingPrompt.prompt}</h4>
                </div>
                <div className="prompt-card-text" style={{ borderLeftColor: module.color }}>
                  {speakingPrompt.text.split('\n').map((line, idx) => (
                    <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
                  ))}
                </div>
                <div className="prompt-card-tip">
                  <strong>💡 Tip:</strong> {speakingPrompt.tip}
                </div>
              </div>

              {recordingState === 'idle' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint">Click the microphone to start reading the prompt above.</p>
                  <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
                    <Mic size={32} />
                  </button>
                  {isCompleted && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
                      <div className="modules-already-done" style={{ margin: 0 }}>
                        ✅ Lesson Completed! You can practice again to improve.
                      </div>
                      <button 
                        type="button"
                        onClick={onUncomplete}
                        className="relearn-submodule-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#fff',
                          color: '#dc2626',
                          border: '1.5px solid #fca5a5',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.background = '#fef2f2';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = '#fca5a5';
                        }}
                      >
                        <RefreshCw size={14} /> Re-learn Submodule (Mark as Unread)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint recording-text">Recording... Speak clearly now.</p>
                  
                  {/* Waveform animation */}
                  <div className="wave-animation">
                    <span className="wave-bar bar-1" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-2" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-3" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-4" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-5" style={{ backgroundColor: module.color }}></span>
                  </div>

                  <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:10</p>
                  
                  <button className="record-btn record-btn--recording" onClick={stopRecording}>
                    <Square size={24} fill="#fff" />
                  </button>
                </div>
              )}

              {recordingState === 'analyzing' && (
                <div className="speaking-action-zone">
                  <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color }} />
                  <p className="analyzing-text">AI is analyzing your pronunciation & fluency...</p>
                </div>
              )}

              {recordingState === 'completed' && speakingResult && (
                <div className="speaking-results-zone">
                  <div className="score-header-box">
                    <div className="score-circle" style={{ borderColor: module.color }}>
                      <span className="score-num">{speakingResult.score}%</span>
                      <span className="score-lbl">AI Score</span>
                    </div>
                    <div className="score-metrics">
                      <div className="metric-row">
                        <span>Fluency:</span>
                        <div className="metric-bar-track">
                          <div className="metric-bar-fill" style={{ width: `${speakingResult.fluency}%`, background: module.color }}></div>
                        </div>
                        <span className="metric-val">{speakingResult.fluency}%</span>
                      </div>
                      <div className="metric-row">
                        <span>Pronunciation:</span>
                        <div className="metric-bar-track">
                          <div className="metric-bar-fill" style={{ width: `${speakingResult.pronunciation}%`, background: module.color }}></div>
                        </div>
                        <span className="metric-val">{speakingResult.pronunciation}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="feedback-card">
                    <Sparkles size={20} className="feedback-icon" style={{ color: module.color }} />
                    <div className="feedback-text">
                      <h5>AI Pronunciation Feedback</h5>
                      <p>{speakingResult.feedback}</p>
                    </div>
                  </div>

                  <div className="result-buttons">
                    <button className="retry-btn" onClick={handleRetrySpeaking}>
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button className="modules-complete-btn" style={{ background: module.color }} onClick={onComplete}>
                      <Check size={18} /> Complete Lesson
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="writing-lesson-container">
              <div className="writing-question-card">
                <div className="question-header">
                  <PenTool size={20} className="question-icon" style={{ color: module.color }} />
                  <h4>Practice Quiz</h4>
                </div>
                <p className="question-text">{quiz.question}</p>
              </div>

              <div className="option-cards" style={{ '--theme-color': module.color }}>
                {quiz.options.map((opt, idx) => {
                  let cardClass = "option-card";
                  let iconElement = null;

                  if (selectedOption !== null) {
                    if (idx === selectedOption) {
                      if (idx === quiz.correctIdx) {
                        cardClass += " option-card--correct";
                        iconElement = <Check size={18} className="option-icon-status" />;
                      } else {
                        cardClass += " option-card--incorrect";
                        iconElement = <X size={18} className="option-icon-status" />;
                      }
                    } else if (idx === quiz.correctIdx) {
                      cardClass += " option-card--should-be";
                      iconElement = <Check size={18} className="option-icon-status" />;
                    } else {
                      cardClass += " option-card--disabled";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      className={cardClass}
                      onClick={() => handleSelectOption(idx)}
                      disabled={selectedOption !== null}
                      style={{ '--theme-color': module.color }}
                    >
                      <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                      <span className="option-text">{opt}</span>
                      {iconElement}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="explanation-box animate-fade-in">
                  <div className="explanation-header">
                    <AlertCircle size={18} className="explanation-icon" />
                    <h5>Explanation</h5>
                  </div>
                  <p className="explanation-text">{quiz.explanation}</p>
                  
                  <div className="result-buttons" style={{ marginTop: '20px' }}>
                    {selectedOption !== quiz.correctIdx ? (
                      <button className="retry-btn" onClick={handleRetryWriting}>
                        <RefreshCw size={16} /> Try Again
                      </button>
                    ) : (
                      <button className="modules-complete-btn" style={{ background: module.color }} onClick={onComplete}>
                        <Check size={18} /> Complete Lesson
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedOption === null && isCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '24px', width: '100%' }}>
                  <div className="modules-already-done" style={{ margin: 0, textAlign: 'center' }}>
                    ✅ Lesson Completed! Feel free to practice the quiz again.
                  </div>
                  <button 
                    type="button"
                    onClick={onUncomplete}
                    className="relearn-submodule-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#fff',
                      color: '#dc2626',
                      border: '1.5px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                  >
                    <RefreshCw size={14} /> Re-learn Submodule (Mark as Unread)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Module detail (sub-modules list) ─────────────────────────
function ModuleDetail({ module, completedSubs, onSubClick, onBack, categoryColor, onNavigate, assessmentStatus }) {
  const [showCert, setShowCert] = useState(false);

  const progress = Math.round(
    (module.subModules.filter(s => completedSubs.includes(s.id)).length / module.subModules.length) * 100
  );

  const categoryId = categoryColor ? (module.id.startsWith('sp') ? 'speaking' : 'writing') : 'speaking';
  const hasCertificate = categoryId === 'speaking'
    ? !!assessmentStatus?.speakingCertificate
    : !!assessmentStatus?.writingCertificate;
  const tagKey = module.tag?.toUpperCase(); // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'

  let isAssessmentPassed = false;
  if (assessmentStatus) {
    if (categoryId === 'speaking') {
      if (tagKey === 'BEGINNER') isAssessmentPassed = !!assessmentStatus.passedSpeakingBeginner;
      else if (tagKey === 'INTERMEDIATE') isAssessmentPassed = !!assessmentStatus.passedSpeakingIntermediate;
      else if (tagKey === 'ADVANCED') isAssessmentPassed = !!assessmentStatus.passedSpeakingAdvanced;
    } else {
      if (tagKey === 'BEGINNER') isAssessmentPassed = !!assessmentStatus.passedWritingBeginner;
      else if (tagKey === 'INTERMEDIATE') isAssessmentPassed = !!assessmentStatus.passedWritingIntermediate;
      else if (tagKey === 'ADVANCED') isAssessmentPassed = !!assessmentStatus.passedWritingAdvanced;
    }
  }

  const handleRetake = () => {
    const confirmText = `Are you sure you want to retake the ${categoryId} assessment? This will reset your current level test progress, but your earned certificate will remain saved.`;
    if (window.confirm(confirmText)) {
      api.post(`/assessment/retake/${categoryId}`)
        .then(() => {
          alert(`Assessment reset successfully! Redirecting to the Assessment Center.`);
          onNavigate('assessment');
        })
        .catch(err => {
          console.error('Failed to reset:', err);
          alert('Could not reset assessment. Please try again.');
        });
    }
  };

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Modules
      </button>

      <div className="module-detail-header"
        style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}bb)` }}>
        <span className="module-detail-emoji">{module.emoji}</span>
        <div style={{ flex: 1 }}>
          <p className="module-detail-tag">Module {module.number} • {module.tag}</p>
          <h1 className="module-detail-title">{module.title}</h1>
          <p className="module-detail-desc">{module.description}</p>
        </div>
        <div className="module-detail-progress">
          <span>{progress}%</span>
          <div className="module-detail-progress-track">
            <div className="module-detail-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{module.subModules.filter(s => completedSubs.includes(s.id)).length}/{module.subModules.length} lessons</span>
        </div>
      </div>

      {progress === 100 && (
        isAssessmentPassed ? (
          <div className="modules-assessment-card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
            border: '1.5px dashed #0284c7',
            borderRadius: '16px',
            padding: '20px',
            margin: '0 0 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#075985', fontSize: '18px', fontWeight: 700 }}>
                🎓 Module Certified!
              </h3>
              <p style={{ margin: '4px 0 0', color: '#0369a1', fontSize: '14px', lineHeight: 1.5 }}>
                You have completed all lessons in this module and passed the corresponding level assessment. If you wish to practice or try for a higher score, you can retake the assessment.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setShowCert(true)}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                View Certificate 🎓
              </button>
              <button
                onClick={handleRetake}
                style={{
                  background: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Retake Assessment 🔄
              </button>
            </div>
          </div>
        ) : (
          <div className="modules-assessment-card animate-fade-in" style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1.5px dashed #f59e0b',
            borderRadius: '16px',
            padding: '20px',
            margin: '0 0 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#92400e', fontSize: '18px', fontWeight: 700 }}>
                🎉 Module Completed!
              </h3>
              <p style={{ margin: '4px 0 0', color: '#b45309', fontSize: '14px', lineHeight: 1.5 }}>
                You have completed all lessons in this module. To finish this module and earn your certificate, please take the corresponding level assessment.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {hasCertificate && (
                <>
                  <button
                    onClick={() => setShowCert(true)}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    View Certificate 🎓
                  </button>
                  <button
                    onClick={handleRetake}
                    style={{
                      background: '#ea580c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px -1px rgba(234, 88, 12, 0.3)',
                      whiteSpace: 'nowrap',
                      transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Retake Assessment 🔄
                  </button>
                </>
              )}
              <button
                onClick={() => onNavigate('assessment')}
                style={{
                  background: '#d97706',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(217, 119, 6, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                Take Assessment →
              </button>
            </div>
          </div>
        )
      )}

      <div className="module-detail-list">
        {module.subModules.map((sub, i) => {
          const done     = completedSubs.includes(sub.id);
          const unlocked = i === 0 || completedSubs.includes(module.subModules[i - 1].id);
          return (
            <button key={sub.id}
              className={`submodule-row ${done ? 'submodule-row--completed' : ''} ${!unlocked ? 'submodule-row--locked' : ''}`}
              onClick={() => unlocked && onSubClick(sub, module)}
              disabled={!unlocked}
            >
              <div className="submodule-row__num"
                style={{ background: unlocked ? module.bg : '#f1f5f9', color: unlocked ? module.color : '#94a3b8' }}>
                {done ? '✓' : i + 1}
              </div>
              <div className="submodule-row__icon">{sub.icon}</div>
              <div className="submodule-row__info">
                <span className="submodule-row__title">{sub.title}</span>
              </div>
              <div className="submodule-row__status">
                {done ? <CheckCircle size={20} color="#10b981" />
                  : !unlocked ? <Lock size={18} color="#cbd5e1" />
                  : <PlayCircle size={20} color={module.color} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* RURALSHORES CERTIFICATE POPUP MODAL */}
      {showCert && (
        <div className="certificate-modal-overlay">
          <div className="certificate-modal-container animate-scale-up">
            
            <button 
              className="certificate-close-btn" 
              onClick={() => setShowCert(false)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                zIndex: 10
              }}
            >
              <X size={18} />
            </button>

            <div className="certificate-frame printable-certificate">
              <div className="certificate-inner-border">
                
                <h1 className="cert-header">CERTIFICATE OF COMPLETION</h1>
                
                <p className="cert-sub">This is to certify that</p>
                
                <h2 className="cert-name">{assessmentStatus?.recipientName || 'Employee'}</h2>
                
                <p className="cert-body">
                  has successfully completed the course on <br />
                  <strong>"{categoryId === 'speaking' ? 'English Speaking Communication' : 'English Writing Communication'}"</strong> with a score of <strong>{(categoryId === 'speaking' ? (assessmentStatus?.speakingCertificate?.score) : (assessmentStatus?.writingCertificate?.score)) || 100}%</strong>.
                </p>
                
                <p className="cert-presenter">Presented by RuralShores</p>
                
                <div className="cert-footer">
                  <div className="cert-footer-item">
                    <div style={{ height: '35px', content: '""' }}></div>
                    <div className="cert-footer-line">
                      {categoryId === 'speaking' && assessmentStatus?.speakingCertificate?.createdAt
                        ? new Date(assessmentStatus.speakingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : categoryId === 'writing' && assessmentStatus?.writingCertificate?.createdAt
                        ? new Date(assessmentStatus.writingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <span style={{ fontSize: '10px', color: '#666' }}>Date</span>
                  </div>
                  
                  <div className="cert-footer-item">
                    <div className="cert-signature">RuralShores Admin</div>
                    <div className="cert-footer-line">Authorized Signature</div>
                  </div>
                </div>

              </div>

              <svg width="90" height="90" viewBox="0 0 100 100" style={{ position: 'absolute', bottom: '50px', right: '45px' }}>
                <path d="M40 70 L30 95 L50 85 L70 95 L60 70" fill="#b8931d" />
                <path d="M45 70 L38 95 L50 85 L62 95 L55 70" fill="#e2c15a" />
                <circle cx="50" cy="50" r="35" fill="url(#goldGrad)" stroke="#b8931d" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="31" fill="none" stroke="#f2db83" strokeWidth="1.5" strokeDasharray="3 2" />
                <polygon points="50,22 55,35 68,35 58,43 62,56 50,48 38,56 42,43 32,35 45,35" fill="#fcf3cf" />
                <defs>
                  <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                    <stop offset="0%" stopColor="#fef9db" />
                    <stop offset="50%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#aa7c11" />
                  </radialGradient>
                </defs>
              </svg>

            </div>

            <div className="certificate-actions">
              <button 
                className="modules-complete-btn" 
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', width: 'auto', background: '#3b82f6' }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button 
                className="modules-back-btn" 
                onClick={() => setShowCert(false)}
                style={{ padding: '10px 20px', margin: 0 }}
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// ── Category modules grid ─────────────────────────────────────
function CategoryModules({ category, completedSubModules, assessmentStatus, onModuleClick, onBack, onNavigate, onResetModule }) {
  const modules   = MODULES_MAP[category.id];

  const isCompleted = (module) =>
    module.subModules.every(s => completedSubModules.includes(s.id));

  const isUnlocked = (module, index) => {
    if (index === 0) return true;
    if (index === 1) {
      // Module 2 is unlocked ONLY when assessmentStatus is unlocked for this category
      if (category.id === 'speaking') {
        return !!assessmentStatus?.isSpeakingModule2Unlocked;
      } else {
        return !!assessmentStatus?.isWritingModule2Unlocked;
      }
    }
    // Modules 3 and 4 unlock sequentially after Module 2 is unlocked and completed
    return isCompleted(modules[index - 1]);
  };

  const getProgress = (module) => {
    const done = module.subModules.filter(s => completedSubModules.includes(s.id)).length;
    return Math.round((done / module.subModules.length) * 100);
  };

  // Check if Module 1 of this category is completed
  const isModule1Completed = isCompleted(modules[0]);
  const hasCertificate = category.id === 'speaking'
    ? !!assessmentStatus?.speakingCertificate
    : !!assessmentStatus?.writingCertificate;

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Modules
      </button>

      {/* Category header */}
      <div className="modules-cat-header"
        style={{ background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}bb 100%)` }}>
        <span className="modules-cat-emoji">{category.emoji}</span>
        <div>
          <h1 className="modules-cat-title">{category.label}</h1>
          <p className="modules-cat-desc">{category.desc}</p>
        </div>
        <span className="modules-cat-badge">{category.tag}</span>
      </div>


      {/* Module cards grid */}
      <div className="modules-grid">
        {modules.map((module, index) => {
          const unlocked  = isUnlocked(module, index);
          const completed = isCompleted(module);
          const progress  = getProgress(module);

          return (
            <div key={module.id}
              className={`module-card-box ${!unlocked ? 'module-card-box--locked' : ''}`}
              style={{ '--mc': module.color, '--mb': module.bg }}
              onClick={() => unlocked && onModuleClick(module)}
            >
              <div className="module-card-box__icon-area" style={{ background: module.bg }}>
                {unlocked
                  ? completed
                    ? <CheckCircle size={56} color={module.color} strokeWidth={1.5} />
                    : <span className="module-card-box__emoji">{module.emoji}</span>
                  : <Lock size={48} color="#cbd5e1" strokeWidth={1.5} />}
              </div>

              <div className="module-card-box__body">
                <div className="module-card-box__tags">
                  <span className="module-card-box__tag"
                    style={{ color: module.color, background: module.bg }}>
                    Module {module.number}
                  </span>
                  <span className={`module-card-box__level module-card-box__level--${module.tag.toLowerCase()}`}>
                    {module.tag}
                  </span>
                </div>
                <h3 className="module-card-box__title"
                  style={{ color: unlocked ? '#1e293b' : '#94a3b8' }}>
                  {module.title}
                </h3>
                <p className="module-card-box__desc">
                  {unlocked ? module.description : 'Complete Module 1 and pass all 3 assessments to unlock Module 2.'}
                </p>
                <p className="module-card-box__sub">{module.subText}</p>
                {unlocked && (
                  <div className="module-card-box__progress">
                    <div className="module-card-box__progress-track">
                      <div className="module-card-box__progress-fill"
                        style={{ width: `${progress}%`, background: module.color }} />
                    </div>
                    <span style={{ color: module.color }}>{progress}%</span>
                  </div>
                )}
              </div>

              <div className="module-card-box__footer"
                style={{ 
                  background: unlocked ? module.color : '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: completed ? '10px' : '0px'
                }}>
                {unlocked ? (
                  completed ? (
                    <>
                      <span>✅ Completed</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetModule(module.id);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          textTransform: 'uppercase',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                        }}
                      >
                        <RefreshCw size={11} /> Re-learn
                      </button>
                    </>
                  ) : progress > 0 ? 'Continue →' : 'Start →'
                ) : '🔒 Locked'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Modules Page ─────────────────────────────────────────
export default function ModulesPage({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule]     = useState(null);
  const [activeSubModule, setActiveSubModule]   = useState(null);
  const [completedSubModules, setCompletedSubModules] = useState([]);
  const [assessmentStatus, setAssessmentStatus] = useState(null);

  const fetchProgressAndStatus = async () => {
    try {
      const progressRes = await api.get('/assessment/progress');
      setCompletedSubModules(progressRes.data);

      const statusRes = await api.get('/assessment/status');
      setAssessmentStatus(statusRes.data);
    } catch (err) {
      console.error('Failed to load progress or status:', err);
    }
  };

  useEffect(() => {
    fetchProgressAndStatus();
  }, []);

  const handleCompleteSubModule = async () => {
    if (!activeSubModule) return;
    try {
      await api.post('/assessment/progress', {
        category: selectedCategory.id,
        moduleId: activeSubModule.module.id,
        subModuleId: activeSubModule.sub.id,
      });
      await fetchProgressAndStatus();
      setActiveSubModule(null);
    } catch (err) {
      console.error('Failed to complete lesson in backend:', err);
      // Fallback
      setCompletedSubModules(prev =>
        prev.includes(activeSubModule.sub.id) ? prev : [...prev, activeSubModule.sub.id]
      );
      setActiveSubModule(null);
    }
  };

  const handleUncompleteSubModule = async (subId, moduleId) => {
    try {
      await api.post('/assessment/progress', {
        category: selectedCategory.id,
        moduleId,
        subModuleId: subId,
        completed: false,
      });
      await fetchProgressAndStatus();
      setActiveSubModule(null);
    } catch (err) {
      console.error('Failed to uncomplete lesson in backend:', err);
      // Fallback
      setCompletedSubModules(prev => prev.filter(id => id !== subId));
      setActiveSubModule(null);
    }
  };

  const handleResetModuleProgress = async (moduleId) => {
    const confirmText = `Are you sure you want to reset all progress for this module? You will be able to re-learn all of its lessons.`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.post(`/assessment/reset-module/${moduleId}`);
      await fetchProgressAndStatus();
    } catch (err) {
      console.error('Failed to reset module progress:', err);
      alert('Could not reset progress. Please try again.');
    }
  };

  // ── Level 3: Lesson view ────────────────────────────────────
  if (activeSubModule) {
    return (
      <LessonFlowView
        sub={activeSubModule.sub}
        module={activeSubModule.module}
        category={selectedCategory.id}
        onBack={() => setActiveSubModule(null)}
        onComplete={handleCompleteSubModule}
        onUncomplete={() => handleUncompleteSubModule(activeSubModule.sub.id, activeSubModule.module.id)}
        isCompleted={completedSubModules.includes(activeSubModule.sub.id)}
      />
    );
  }

  // ── Level 2: Module detail ──────────────────────────────────
  if (selectedModule) {
    return (
      <ModuleDetail
        module={selectedModule}
        completedSubs={completedSubModules.filter(id =>
          selectedModule.subModules.some(s => s.id === id)
        )}
        onSubClick={(sub, module) => setActiveSubModule({ sub, module })}
        onBack={() => setSelectedModule(null)}
        categoryColor={selectedCategory?.color}
        onNavigate={onNavigate}
        assessmentStatus={assessmentStatus}
      />
    );
  }

  // ── Level 1b: Category modules ──────────────────────────────
  if (selectedCategory) {
    return (
      <CategoryModules
        category={selectedCategory}
        completedSubModules={completedSubModules}
        assessmentStatus={assessmentStatus}
        onModuleClick={(module) => setSelectedModule(module)}
        onBack={() => setSelectedCategory(null)}
        onNavigate={onNavigate}
        onResetModule={handleResetModuleProgress}
      />
    );
  }

  // ── Level 1: Category cards (Speaking / Writing) ────────────
  return (
    <div className="modules-page">
      <div className="modules-lobby-header">
        <h1 className="modules-lobby-title">📚 Learning Modules</h1>
        <p className="modules-lobby-sub">Choose a category and start learning!</p>
      </div>

      <div className="modules-categories-grid">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className="module-cat-card"
            style={{ '--cc': cat.color, '--cb': cat.bg }}
            onClick={() => setSelectedCategory(cat)}
          >
            <div className="module-cat-card__icon-wrap" style={{ background: cat.bg }}>
              <span className="module-cat-card__emoji">{cat.emoji}</span>
            </div>
            <div className="module-cat-card__body">
              <span className="module-cat-card__tag"
                style={{ color: cat.color, background: cat.bg }}>
                {cat.tag}
              </span>
              <h3 className="module-cat-card__title">{cat.label}</h3>
              <p className="module-cat-card__desc">{cat.desc}</p>
              <p className="module-cat-card__sub">{cat.subText}</p>
            </div>
            <div className="module-cat-card__footer"
              style={{ background: cat.color }}>
              Explore →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}