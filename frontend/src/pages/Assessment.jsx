import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import './Assessment.css';
import { 
  Award, 
  Play, 
  CheckCircle, 
  HelpCircle, 
  AlertCircle, 
  History, 
  ChevronRight, 
  Timer, 
  Loader2,
  Lock,
  Printer,
  X,
  Database,
  ArrowLeft,
  Mic,
  PenTool,
  Clock,
  BookOpen,
  Volume2
} from 'lucide-react';
import { CompanionEvents, Confetti } from '../components';

const CATEGORY_META = {
  speaking: {
    title: "Speaking Assessment",
    focusAreas: {
      BEGINNER: "Grammar, Greetings, Word Agreement",
      INTERMEDIATE: "BPO terminology, Active Listening, Billing",
      ADVANCED: "Escalation handling, Empathy, Negotiations"
    }
  },
  writing: {
    title: "Writing Assessment",
    focusAreas: {
      BEGINNER: "Written Grammar, Greetings, Spelling",
      INTERMEDIATE: "Written BPO correspondence, Customer emails, Ticket notes",
      ADVANCED: "Written escalations, Formal emails, Complex grammar"
    }
  }
};

export default function Assessment({ onAssessmentActiveChange }) {
  // Gating & status state
  const [status, setStatus] = useState({
    isModule1SpeakingCompleted: false,
    isModule1WritingCompleted: false,
    isModule1Completed: false,
    passedSpeakingBeginner: false,
    passedSpeakingIntermediate: false,
    passedSpeakingAdvanced: false,
    passedWritingBeginner: false,
    passedWritingIntermediate: false,
    passedWritingAdvanced: false,
    isSpeakingModule2Unlocked: false,
    isWritingModule2Unlocked: false,
    isSpeakingCertified: false,
    isWritingCertified: false,
    recipientName: 'Employee Participant',
    overallProgress: 0,
    speaking: {
      passedBeginner: false,
      passedIntermediate: false,
      passedAdvanced: false,
      scores: { beginner: null, intermediate: null, advanced: null },
      passingScore: null
    },
    writing: {
      passedBeginner: false,
      passedIntermediate: false,
      passedAdvanced: false,
      scores: { beginner: null, intermediate: null, advanced: null },
      passingScore: null
    },
    scores: {
      beginner: null,
      intermediate: null,
      advanced: null,
      overallPassingScore: null
    }
  });

  // State
  const [examState, setExamState] = useState('idle'); // 'idle', 'loading_quiz', 'testing', 'submitting', 'result'
  const [activeCategory, setActiveCategory] = useState(null); // null, 'speaking', 'writing'
  const [certCategory, setCertCategory] = useState(null); // null, 'speaking', 'writing'
  const [activeLevel, setActiveLevel] = useState('BEGINNER'); // 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: selectedOptionIndex }
  const [userTranscripts, setUserTranscripts] = useState({}); // { [questionId]: transcriptString }
  const [userFeedbacks, setUserFeedbacks] = useState({}); // { [questionId]: feedbackString }
  const [gradedResult, setGradedResult] = useState(null);
  const [showCert, setShowCert] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Speaking assessment recording states
  const [speakingRecordingState, setSpeakingRecordingState] = useState('idle'); // 'idle', 'recording', 'analyzing', 'completed'
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [speakingScore, setSpeakingScore] = useState(null);
  const speakingTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const localTranscriptRef = useRef('');
  const scenarioAudioRef = useRef(null);

  // Seeding state
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingMessage, setSeedingMessage] = useState('');

  // Timer
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes = 900 seconds
  const timerRef = useRef(null);

  // Reset or load speaking score when active question changes
  useEffect(() => {
    if (examState === 'testing' && activeCategory === 'speaking' && questions[currentIdx]) {
      const existingScore = userAnswers[questions[currentIdx].id];
      if (existingScore !== undefined) {
        setSpeakingScore(existingScore);
        setSpeakingRecordingState('completed');
      } else {
        setSpeakingScore(null);
        setSpeakingRecordingState('idle');
      }
    }
  }, [currentIdx, examState, activeCategory, questions, userAnswers]);

  // Speaking assessment recording timer
  useEffect(() => {
    if (speakingRecordingState === 'recording') {
      setSpeakingSeconds(0);
      speakingTimerRef.current = setInterval(() => {
        setSpeakingSeconds(prev => {
          if (prev >= 9) {
            handleStopSpeaking();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (speakingTimerRef.current) {
        clearInterval(speakingTimerRef.current);
        speakingTimerRef.current = null;
      }
    }
    return () => {
      if (speakingTimerRef.current) clearInterval(speakingTimerRef.current);
    };
  }, [speakingRecordingState]);

  const fallbackSpeakScenario = (cleanText) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const speakScenario = async (text) => {
    // Stop any existing playing scenario audio
    if (scenarioAudioRef.current) {
      scenarioAudioRef.current.pause();
      scenarioAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cleanText = text.replace(/^Customer:\s*['"]?|['"]?$/gi, '');

    try {
      const response = await api.post('/voice/synthesize', {
        text: cleanText,
        voice: 'af_heart', // warm friendly voice
        speed: 1.1
      }, {
        responseType: 'blob'
      });

      const audioUrl = URL.createObjectURL(response.data);
      const audio = new Audio(audioUrl);
      scenarioAudioRef.current = audio;

      audio.onended = () => {
        scenarioAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        scenarioAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
        fallbackSpeakScenario(cleanText);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play scenario TTS from backend:', err);
      fallbackSpeakScenario(cleanText);
    }
  };

  useEffect(() => {
    if (examState === 'testing' && activeCategory === 'speaking' && activeLevel === 'INTERMEDIATE' && questions[currentIdx]) {
      speakScenario(questions[currentIdx].questionText);
    }
    return () => {
      if (scenarioAudioRef.current) {
        scenarioAudioRef.current.pause();
        scenarioAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIdx, examState, activeCategory, activeLevel, questions]);

  // Auto-print/download certificate when certificate view is shown
  useEffect(() => {
    if (showCert) {
      const timer = setTimeout(() => {
        window.print();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [showCert]);

  const handleStartSpeaking = async () => {
    // Stop any playing TTS audio before starting user speech recording
    if (scenarioAudioRef.current) {
      scenarioAudioRef.current.pause();
      scenarioAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingRecordingState('recording');
    setSpeakingScore(null);
    audioChunksRef.current = [];
    localTranscriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              text += event.results[i][0].transcript + ' ';
            }
          }
          localTranscriptRef.current += text;
        };
        recognitionRef.current = rec;
        rec.start();
      } catch (e) {
        console.warn('Parallel SpeechRecognition start failed:', e);
      }
    }

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
      fallbackStartSpeaking();
    }
  };

  const fallbackStartSpeaking = () => {
    if (recognitionRef.current) {
      return;
    }
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
      alert('Could not access microphone and browser SpeechRecognition is not supported.');
      setSpeakingRecordingState('idle');
    }
  };

  const handleStopSpeaking = () => {
    setSpeakingRecordingState('analyzing');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setTimeout(() => {
        evaluateSpeech(localTranscriptRef.current);
      }, 500);
    }
  };

  const sendToWhisper = async (audioBlob) => {
    setSpeakingRecordingState('analyzing');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const response = await api.post(`/assessment/speaking/transcribe/${questions[currentIdx].id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      const transcript = data.transcript || '';
      const score = data.similarityScore;
      const feedback = data.feedback || '';

      setSpeakingScore(score);
      setUserAnswers(prev => ({
        ...prev,
        [questions[currentIdx].id]: score
      }));
      setUserTranscripts(prev => ({
        ...prev,
        [questions[currentIdx].id]: transcript
      }));
      setUserFeedbacks(prev => ({
        ...prev,
        [questions[currentIdx].id]: feedback
      }));
      setSpeakingRecordingState('completed');
    } catch (err) {
      console.error('Backend STT failed, falling back to local SpeechRecognition transcript', err);
      evaluateSpeech(localTranscriptRef.current);
    }
  };

  const evaluateSpeechClientSide = (transcript, isIntermediate) => {
    if (!transcript) return 0;
    if (!isIntermediate) {
      const cleanText = (text) => {
        return text
          .toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?•]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };
      const target = cleanText(questions[currentIdx].questionText);
      const spoken = cleanText(transcript);
      const targetWords = target.split(' ');
      const spokenWords = spoken.split(' ');
      let matches = 0;
      targetWords.forEach(word => {
        if (spokenWords.includes(word)) {
          matches++;
        }
      });
      let score = Math.round((matches / targetWords.length) * 100);
      return score > 0 ? Math.min(100, Math.max(15, score)) : 0;
    } else {
      const words = transcript.trim().split(/\s+/).filter(Boolean);
      if (words.length < 5) return 40;
      let score = 60;
      score += Math.min(25, words.length * 1.5);
      const keywords = ["sorry", "apologize", "understand", "check", "help", "account", "issue", "resolve", "billing", "assist"];
      const lower = transcript.toLowerCase();
      keywords.forEach(kw => {
        if (lower.includes(kw)) score += 3;
      });
      return Math.min(100, Math.round(score));
    }
  };

  const evaluateSpeech = (transcript) => {
    setSpeakingRecordingState('analyzing');

    setTimeout(() => {
      if (!transcript) {
        setSpeakingScore(0);
        setUserAnswers(prev => ({
          ...prev,
          [questions[currentIdx].id]: 0
        }));
        setUserTranscripts(prev => ({
          ...prev,
          [questions[currentIdx].id]: ''
        }));
        setUserFeedbacks(prev => ({
          ...prev,
          [questions[currentIdx].id]: 'No speech detected.'
        }));
        setSpeakingRecordingState('completed');
        return;
      }

      const isIntermediate = activeLevel === 'INTERMEDIATE';
      const score = evaluateSpeechClientSide(transcript, isIntermediate);
      const feedback = isIntermediate
        ? `[Offline Grade] Score: ${score}%. Good attempt. Practised professional BPO scenario objection handling.`
        : `[Offline Grade] Pronunciation match: ${score}%.`;

      setSpeakingScore(score);
      setUserAnswers(prev => ({
        ...prev,
        [questions[currentIdx].id]: score
      }));
      setUserTranscripts(prev => ({
        ...prev,
        [questions[currentIdx].id]: transcript
      }));
      setUserFeedbacks(prev => ({
        ...prev,
        [questions[currentIdx].id]: feedback
      }));
      setSpeakingRecordingState('completed');
    }, 1500);
  };

  const handleRetrySpeaking = () => {
    setSpeakingRecordingState('idle');
    setSpeakingScore(null);
    setUserAnswers(prev => {
      const updated = { ...prev };
      delete updated[questions[currentIdx].id];
      return updated;
    });
    setUserTranscripts(prev => {
      const updated = { ...prev };
      delete updated[questions[currentIdx].id];
      return updated;
    });
    setUserFeedbacks(prev => {
      const updated = { ...prev };
      delete updated[questions[currentIdx].id];
      return updated;
    });
  };

  // Fetch status on load
  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/assessment/status');
      setStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch assessment status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Seeding function
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedingMessage('Seeding 300 questions from Gemini API. Please wait...');
    try {
      const res = await api.post('/assessment/seed');
      setSeedingMessage(res.data.message);
      await fetchStatus();
    } catch (err) {
      console.error('Seeding failed:', err);
      setSeedingMessage('Seeding failed. Ensure your Gemini API Key is valid and try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Submit assessment function
  const handleSubmitExam = useCallback(async (answersToSubmit = userAnswers) => {
    setExamState('submitting');
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await api.post(`/assessment/submit/${activeCategory}/${activeLevel}`, {
        answers: answersToSubmit,
        feedbacks: userFeedbacks,
        transcripts: userTranscripts,
      });
      setGradedResult(res.data);
      setExamState('result');

      // Play sound / trigger companion reaction
      if (res.data.passed) {
        CompanionEvents.emit('CHALLENGE_COMPLETED');
        if (activeLevel === 'ADVANCED') {
          CompanionEvents.emit('BADGE_UNLOCKED');
        }
      } else {
        CompanionEvents.emit('USER_IDLE');
      }

      // Refresh progress & status in app
      await fetchStatus();
      if (res.data.passed && activeLevel === 'ADVANCED') {
        setCertCategory(activeCategory);
        setShowCert(true);
      }
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit exam. Please try again.');
      setExamState('testing');
    }
  }, [activeCategory, activeLevel, userAnswers, userFeedbacks, userTranscripts, fetchStatus]);

  // Timer effect
  useEffect(() => {
    if (examState === 'testing') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            // Time out: submit answers immediately
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, handleSubmitExam]);

  // Effect to notify parent component of active assessment test session
  useEffect(() => {
    if (onAssessmentActiveChange) {
      const isTestActive = examState === 'loading_quiz' || examState === 'testing' || examState === 'submitting';
      onAssessmentActiveChange(isTestActive);
    }
    return () => {
      if (onAssessmentActiveChange) {
        onAssessmentActiveChange(false);
      }
    };
  }, [examState, onAssessmentActiveChange]);

  // Launch assessment
  const handleStartLevel = async (level) => {
    setExamState('loading_quiz');
    setActiveLevel(level);
    setUserAnswers({});
    setUserTranscripts({});
    setUserFeedbacks({});
    setCurrentIdx(0);
    setTimeLeft(900); // 15 min

    try {
      const res = await api.get(`/assessment/questions/${activeCategory}/${level}`);
      if (res.data.length === 0) {
        throw new Error('No questions returned');
      }
      setQuestions(res.data);
      setExamState('testing');
      CompanionEvents.emit('CHALLENGE_STARTED');
    } catch (err) {
      console.error('Failed to load questions:', err);
      alert('Could not start assessment. Make sure the question bank is seeded.');
      setExamState('idle');
    }
  };

  const handleRetakeAssessment = async (category) => {
    const confirmText = `Are you sure you want to retake the ${category} assessment? This will reset your current level test scores, but your earned certificate will remain saved.`;
    if (window.confirm(confirmText)) {
      try {
        await api.post(`/assessment/retake/${category}`);
        alert(`Assessment reset successfully! You can now retake the assessment starting from Beginner level.`);
        await fetchStatus();
      } catch (err) {
        console.error('Failed to reset assessment:', err);
        alert('Could not reset assessment. Please try again.');
      }
    }
  };

  // Answer selection
  const handleSelectOption = (questionId, optionIdx) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  // Navigation helpers
  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Certificate Date formatting
  const certDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const overallProgress = status.overallProgress ?? 0;

  const categoryData = activeCategory ? status[activeCategory] : null;
  const passedBeginner = categoryData ? categoryData.passedBeginner : false;
  const passedIntermediate = categoryData ? categoryData.passedIntermediate : false;
  const passedAdvanced = categoryData ? categoryData.passedAdvanced : false;
  const currentScores = categoryData ? categoryData.scores : { beginner: null, intermediate: null, advanced: null };

  const isIntermediateUnlocked = passedBeginner || (activeCategory === 'speaking' ? status.isModule2SpeakingCompleted : status.isModule2WritingCompleted);
  const isAdvancedUnlocked = passedIntermediate || (activeCategory === 'speaking' ? status.isModule4SpeakingCompleted : status.isModule4WritingCompleted);

  if (isLoadingStatus) {
    return (
      <div className="assessment-container animate-pulse" style={{ padding: '40px', textAlign: 'center' }}>
        <Loader2 className="spinner-icon" size={48} />
        <p>Loading assessment status...</p>
      </div>
    );
  }

  return (
    <div className="assessment-container animate-fade-in">
      
      {/* 2. DYNAMIC CEFR PLACEMENT BANNER */}
      {status.isCertified ? (
        <section className="certified-banner-bar animate-scale-up">
          <div className="certified-banner-text">
            <span>🎓 Certification Achieved</span>
            <h3>Certified English Communication Professional</h3>
            <p>Congratulations! You passed all Speaking and Writing assessment levels and graduated with an overall average score of <strong>{status.scores.overallPassingScore}%</strong>.</p>
          </div>
        </section>
      ) : (
        <section className="as-hero animate-fade-in">
          <div className="as-hero__left">
            <span className="as-label">Placement Metrics</span>
            <h2>CEFR Placement Pathway</h2>
            <p className="as-desc">
              Complete assessments in Speaking and Writing to determine your CEFR level. Your results will unlock personalized learning modules and help you improve faster.
            </p>
            <div className="as-status-pills">
              <span className="status-pill green"><CheckCircle size={14} /> Ready to begin your assessments</span>
            </div>
          </div>

          <div className="as-hero__center">
            <div className="as-hero__chart-container">
              <svg className="score-ring" viewBox="0 0 120 120">
                <circle className="score-ring__bg" cx="60" cy="60" r="50" />
                <circle 
                  className="score-ring__fill" 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  style={{ 
                    strokeDasharray: `${2 * Math.PI * 50}`, 
                    strokeDashoffset: `${2 * Math.PI * 50 * (1 - overallProgress / 100)}` 
                  }} 
                />
              </svg>
              <div className="chart-center-text">
                <span className="score-val">{overallProgress}</span>
                <span className="score-total">/100</span>
              </div>
            </div>
            <span className="chart-label">Overall Progress</span>
          </div>

          <div className="as-hero__right-info">
            <div className="as-hero-info-item">
              <div className="info-icon-wrapper blue-bg">
                <span>★</span>
              </div>
              <div className="info-text-wrapper">
                <h4>3 Levels</h4>
                <p>Beginner, Intermediate, Advanced</p>
              </div>
            </div>
            <div className="as-hero-info-item">
              <div className="info-icon-wrapper green-bg">
                <span>🏅</span>
              </div>
              <div className="info-text-wrapper">
                <h4>Certificate</h4>
                <p>Earn your RuralShores Completion Certificates</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. DYNAMIC EXAM STATES */}

      {/* STATE A: IDLE (Lobby or Levels dashboard list) */}
      {examState === 'idle' && activeCategory === null && (
        <div className="as-exam-dashboard-wrapper">
          
          {/* Subheader and Tip banner */}
          <div className="as-subtitle-row">
            <div className="as-subtitle-left">
              <div className="subtitle-icon-box">
                <span>📋</span>
              </div>
              <div>
                <h3>Assessment Center</h3>
                <p>Complete both assessments to get your CEFR level.</p>
              </div>
            </div>
            <div className="as-tip-box">
              <span className="tip-icon">💡</span>
              <p><strong>Tip:</strong> Take your time and do your best!</p>
            </div>
          </div>

          <div className="as-lobby-cards-container">
            {/* CARD 1: SPEAKING ASSESSMENT */}
            <div className="lobby-card speaking-theme animate-scale-up">
              <div className="lobby-card__body">
                <div className="lobby-card__icon-wrap">
                  <Mic size={36} className="lobby-card__icon" />
                </div>
                <div className="lobby-card__content">
                  <span className="lobby-card__badge-tag purple">Speaking Assessment</span>
                  <h3>Speaking</h3>
                  <p className="lobby-card__desc">
                    Master spoken English — pronunciation, fluency and professional BPO communication.
                  </p>
                  <div className="lobby-card__sub-tags">
                    <span>Pronunciation</span> • <span>BPO Calls</span> • <span>Fluency</span> • <span>Advanced Communication</span>
                  </div>
                </div>
              </div>

              <div className="lobby-card__details-row">
                <div className="detail-meta">
                  <Clock size={16} />
                  <div>
                    <span className="label">Duration</span>
                    <span className="value">45 min</span>
                  </div>
                </div>
                <div className="detail-meta">
                  <BookOpen size={16} />
                  <div>
                    <span className="label">Question Type</span>
                    <span className="value">Speaking Tasks</span>
                  </div>
                </div>
                <div className="detail-meta text-right">
                  <div>
                    <span className="label">Skills Measured</span>
                    <span className="value">Pronunciation, Fluency, Clarity, Confidence</span>
                  </div>
                </div>
              </div>

              <div className="lobby-card__footer">
                {status.isSpeakingCertified ? (
                  <div className="completed-actions-row" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <span className="passed-badge-msg" style={{ width: '100%', textAlign: 'center', fontWeight: 'bold' }}>✓ Speaking Passed & Certified</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                    <button className="lobby-card__action-btn speaking-btn" style={{ flex: 1, minWidth: '150px' }} onClick={() => setActiveCategory('speaking')}>
                      Start Speaking Assessment →
                    </button>
                    {status.speakingCertificate && (
                      <button className="lobby-card__action-btn btn--emerald" style={{ flex: 1, minWidth: '150px', background: '#10b981', color: '#fff' }} onClick={() => { setCertCategory('speaking'); setShowCert(true); }}>
                        View Stored Certificate 🎓
                      </button>
                    )}
                  </div>
                )}
                <p className="lobby-card__footer-note">You can pause and resume the assessment anytime.</p>
              </div>
            </div>

            {/* CARD 2: WRITING ASSESSMENT */}
            <div className="lobby-card writing-theme animate-scale-up">
              <div className="lobby-card__body">
                <div className="lobby-card__icon-wrap">
                  <PenTool size={36} className="lobby-card__icon" />
                </div>
                <div className="lobby-card__content">
                  <span className="lobby-card__badge-tag blue">Writing Assessment</span>
                  <h3>Writing</h3>
                  <p className="lobby-card__desc">
                    Master written English — grammar, professional emails and business writing.
                  </p>
                  <div className="lobby-card__sub-tags">
                     <span>Grammar</span> • <span>Professional Emails</span> • <span>Complaints</span> • <span>Business Writing</span>
                  </div>
                </div>
              </div>

              <div className="lobby-card__details-row">
                <div className="detail-meta">
                  <Clock size={16} />
                  <div>
                    <span className="label">Duration</span>
                    <span className="value">45 min</span>
                  </div>
                </div>
                <div className="detail-meta">
                  <BookOpen size={16} />
                  <div>
                    <span className="label">Question Type</span>
                    <span className="value">Writing Tasks</span>
                  </div>
                </div>
                <div className="detail-meta text-right">
                  <div>
                    <span className="label">Skills Measured</span>
                    <span className="value">Grammar, Vocabulary, Structure, Coherence</span>
                  </div>
                </div>
              </div>

              <div className="lobby-card__footer">
                {status.isWritingCertified ? (
                  <div className="completed-actions-row" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <span className="passed-badge-msg" style={{ width: '100%', textAlign: 'center', fontWeight: 'bold' }}>✓ Writing Passed & Certified</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                    <button className="lobby-card__action-btn writing-btn" style={{ flex: 1, minWidth: '150px' }} onClick={() => setActiveCategory('writing')}>
                      Start Writing Assessment →
                    </button>
                    {status.writingCertificate && (
                      <button className="lobby-card__action-btn btn--emerald" style={{ flex: 1, minWidth: '150px', background: '#10b981', color: '#fff' }} onClick={() => { setCertCategory('writing'); setShowCert(true); }}>
                        View Stored Certificate 🎓
                      </button>
                    )}
                  </div>
                )}
                <p className="lobby-card__footer-note">You can pause and resume the assessment anytime.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATE A2: IDLE DASHBOARD LIST FOR SPECIFIC CATEGORY */}
      {examState === 'idle' && activeCategory !== null && (
        <div className="as-exam-dashboard-wrapper">
          {/* Category header & Back button */}
          <div className="category-header-row">
            <button className="btn--back-lobby" onClick={() => setActiveCategory(null)}>
              <ArrowLeft size={16} /> Back to Assessment Center
            </button>
            <h2 className="category-title">{CATEGORY_META[activeCategory].title}</h2>
          </div>

          <div className="as-subtitle-row">
            <div className="as-subtitle-left">
              <div className="subtitle-icon-box">
                <span>📋</span>
              </div>
              <div>
                <h3>Module 1</h3>
                <p>Complete each level to progress to the next</p>
              </div>
            </div>
            <div className="as-tip-box">
              <span className="tip-icon">💡</span>
              <p><strong>Tip:</strong> Focus on weak areas to improve your score!</p>
            </div>
          </div>

          <div className="assessment-levels-grid">
            
            {/* LEVEL 1: BEGINNER */}
            <div className="level-card">
              <div className="level-card__header">
                <div className="level-card__header-left">
                  <div className="level-card__num-badge green">1</div>
                  <h4 className="level-card__title-text">Beginner Level</h4>
                </div>
                {passedBeginner ? (
                  <span className="level-card__badge green">Passed ✓</span>
                ) : (
                  <span className="level-card__badge yellow">Available</span>
                )}
              </div>
              
              <div className="level-card__focus">
                <span className="focus-label">Focus Areas</span>
                <p className="focus-text">{CATEGORY_META[activeCategory].focusAreas.BEGINNER}</p>
              </div>

              <div className="level-card__stats-grid">
                <div className="stat-col">
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{activeCategory === 'speaking' ? '5 Tasks' : '5 MCQs'}</span>
                </div>
                <div className="stat-col">
                  <span className="stat-label">Your Best Score</span>
                  <span className={`stat-value ${currentScores.beginner !== null ? 'green-text' : 'muted-text'}`}>
                    {currentScores.beginner !== null ? `${currentScores.beginner}%` : '—'}
                  </span>
                </div>
              </div>

              <div className="level-card__footer-area">
                {passedBeginner ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <div className="level-card__alert-banner">
                      <span className="alert-banner-icon">✓</span>
                      <div className="alert-banner-content">
                        <p className="alert-banner-title">Completed successfully</p>
                        <p className="alert-banner-desc">Great job! You're ready for the next level.</p>
                      </div>
                    </div>
                    <button className="level-card__action-btn" style={{ background: '#4f46e5' }} onClick={() => handleStartLevel('BEGINNER')}>
                      Retake Beginner Test 🔄
                    </button>
                  </div>
                ) : (
                  <button className="level-card__action-btn" onClick={() => handleStartLevel('BEGINNER')}>
                    Start Beginner Test →
                  </button>
                )}
              </div>
            </div>

            {/* LEVEL 2: INTERMEDIATE */}
            <div className={`level-card ${!isIntermediateUnlocked ? 'level-card--locked' : ''}`}>
              <div className="level-card__header">
                <div className="level-card__header-left">
                  <div className="level-card__num-badge orange">2</div>
                  <h4 className="level-card__title-text">Intermediate Level</h4>
                </div>
                {passedIntermediate ? (
                  <span className="level-card__badge green">Passed ✓</span>
                ) : !isIntermediateUnlocked ? (
                  <span className="level-card__badge gray">Locked 🔒</span>
                ) : (
                  <span className="level-card__badge yellow">Available</span>
                )}
              </div>
              
              <div className="level-card__focus">
                <span className="focus-label">Focus Areas</span>
                <p className="focus-text">{CATEGORY_META[activeCategory].focusAreas.INTERMEDIATE}</p>
              </div>

              <div className="level-card__stats-grid">
                <div className="stat-col">
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{activeCategory === 'speaking' ? '5 Tasks' : '5 MCQs'}</span>
                </div>
                <div className="stat-col">
                  <span className="stat-label">Best Score</span>
                  <span className={`stat-value ${currentScores.intermediate !== null ? 'orange-text' : 'muted-text'}`}>
                    {currentScores.intermediate !== null ? `${currentScores.intermediate}%` : '—'}
                  </span>
                </div>
              </div>

              <div className="level-card__footer-area">
                {!isIntermediateUnlocked ? (
                  <div className="level-card__lock-banner">
                    <span className="lock-banner-icon">🔒</span>
                    <p className="alert-desc">Pass the Beginner assessment or complete Module 2 lessons to unlock this level.</p>
                  </div>
                ) : passedIntermediate ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <div className="level-card__alert-banner">
                      <span className="alert-banner-icon">✓</span>
                      <div className="alert-banner-content">
                        <p className="alert-banner-title">Completed successfully</p>
                        <p className="alert-banner-desc">Great job! You're ready for the next level.</p>
                      </div>
                    </div>
                    <button className="level-card__action-btn" style={{ background: '#ea580c' }} onClick={() => handleStartLevel('INTERMEDIATE')}>
                      Retake Intermediate Test 🔄
                    </button>
                  </div>
                ) : (
                  <button className="level-card__action-btn" onClick={() => handleStartLevel('INTERMEDIATE')}>
                    Start Intermediate Test →
                  </button>
                )}
              </div>
            </div>

            {/* LEVEL 3: ADVANCED */}
            <div className={`level-card ${!isAdvancedUnlocked ? 'level-card--locked' : ''}`}>
              <div className="level-card__header">
                <div className="level-card__header-left">
                  <div className="level-card__num-badge gray">3</div>
                  <h4 className="level-card__title-text">Advanced Level</h4>
                </div>
                {passedAdvanced ? (
                  <span className="level-card__badge green">Passed ✓</span>
                ) : !isAdvancedUnlocked ? (
                  <span className="level-card__badge gray">Locked 🔒</span>
                ) : (
                  <span className="level-card__badge yellow">Available</span>
                )}
              </div>
              
              <div className="level-card__focus">
                <span className="focus-label">Focus Areas</span>
                <p className="focus-text">{CATEGORY_META[activeCategory].focusAreas.ADVANCED}</p>
              </div>

              <div className="level-card__stats-grid">
                <div className="stat-col">
                  <span className="stat-label">Questions</span>
                  <span className="stat-value">{activeCategory === 'speaking' ? '5 Tasks' : '5 MCQs'}</span>
                </div>
                <div className="stat-col">
                  <span className="stat-label">Best Score</span>
                  <span className={`stat-value ${currentScores.advanced !== null ? 'green-text' : 'muted-text'}`}>
                    {currentScores.advanced !== null ? `${currentScores.advanced}%` : '—'}
                  </span>
                </div>
              </div>

              <div className="level-card__footer-area">
                {!isAdvancedUnlocked ? (
                  <div className="level-card__lock-banner">
                    <span className="lock-banner-icon">🔒</span>
                    <p className="alert-desc">Pass the Intermediate assessment or complete Module 4 lessons to unlock this level.</p>
                  </div>
                ) : passedAdvanced ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    <div className="level-card__alert-banner">
                      <span className="alert-banner-icon">✓</span>
                      <div className="alert-banner-content">
                        <p className="alert-banner-title">Completed successfully</p>
                        <p className="alert-banner-desc">Congratulations! You have passed all assessment levels.</p>
                      </div>
                    </div>
                    <button className="level-card__action-btn" style={{ background: '#db2777' }} onClick={() => handleStartLevel('ADVANCED')}>
                      Retake Advanced Test 🔄
                    </button>
                  </div>
                ) : (
                  <button className="level-card__action-btn" onClick={() => handleStartLevel('ADVANCED')}>
                    Start Advanced Test →
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STATE B: LOADING QUIZ */}
      {examState === 'loading_quiz' && (
        <div className="exam-submitting content-card">
          <Loader2 className="spinner-icon" size={48} />
          <h4>Preparing your assessment questions...</h4>
          <p>We are drawing randomized, non-repeated questions from the question bank pool.</p>
        </div>
      )}

      {/* STATE C: ACTIVE TESTING */}
      {examState === 'testing' && questions.length > 0 && (
        <div className="as-exam-card content-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          
          {/* Header Timer */}
          <div className="exam-header-timer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Timer className={`timer-icon ${timeLeft < 60 ? 'timer-pulse-red' : ''}`} size={20} />
              <span className={`time-display ${timeLeft < 60 ? 'timer-pulse-red' : ''}`} style={{ fontWeight: 800 }}>
                {formatTime(timeLeft)} remaining
              </span>
            </div>
            <span className="active-cat-badge" style={{ background: '#dbeafe', color: '#1e40af', fontWeight: 800 }}>
              {activeLevel} • Question {currentIdx + 1} of {questions.length}
            </span>
          </div>

          {/* Active Question Box */}
          <div style={{ width: '100%', margin: '20px 0' }}>
            <div className="exam-prompt-box">
              <span className="prompt-label" style={{ color: activeCategory === 'speaking' ? '#8b5cf6' : '#3b82f6', fontWeight: 800 }}>
                {activeCategory === 'speaking'
                  ? (activeLevel === 'INTERMEDIATE' ? 'Customer Scenario (Listen & Reply):' : 'Text to Read Aloud:')
                  : 'Question:'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '8px' }}>
                <p className="prompt-text" style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, flex: 1 }}>
                  {questions[currentIdx].questionText}
                </p>
                {activeCategory === 'speaking' && activeLevel === 'INTERMEDIATE' && (
                  <button 
                    className="replay-tts-btn"
                    onClick={() => speakScenario(questions[currentIdx].questionText)}
                    style={{
                      background: '#ede9fe',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8b5cf6',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    title="Replay Customer Audio"
                  >
                    <Volume2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {activeCategory === 'speaking' ? (
              <div className="speaking-assessment-test-layout animate-fade-in" style={{ marginTop: '20px' }}>
                {/* Tip/explanation as a prompt cue */}
                {questions[currentIdx].explanation && (
                  <div className="as-tip-box" style={{ width: '100%', margin: '0 0 16px 0', boxSizing: 'border-box', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                    <span className="tip-icon" style={{ color: '#8b5cf6' }}>💡</span>
                    <p style={{ margin: 0, color: '#5b21b6', fontSize: '14px' }}>
                      <strong>{activeLevel === 'INTERMEDIATE' ? 'Response Guidance:' : 'Pronunciation Tip:'}</strong> {questions[currentIdx].explanation}
                    </p>
                  </div>
                )}

                {speakingRecordingState === 'idle' && (
                  <div className="speaking-action-zone" style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p className="speaking-action-hint" style={{ color: '#64748b', marginBottom: '20px' }}>
                      {activeLevel === 'INTERMEDIATE' ? 'Click the microphone to record your professional reply.' : 'Click the microphone to start reading the prompt above.'}
                    </p>
                    <button className="record-btn" onClick={handleStartSpeaking} style={{ width: '70px', height: '70px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)' }}>
                      <Mic size={28} />
                    </button>
                    {speakingScore !== null && (
                      <div className="speaking-past-attempt-badge" style={{ marginTop: '16px', color: '#10b981', fontWeight: 700, fontSize: '14px' }}>
                        ✓ Attempt recorded! {activeLevel === 'INTERMEDIATE' ? 'Scenario' : 'Pronunciation'} Score: {speakingScore}%
                      </div>
                    )}
                  </div>
                )}

                {speakingRecordingState === 'recording' && (
                  <div className="speaking-action-zone" style={{ border: '2px dashed #fca5a5', borderRadius: '16px', padding: '32px 20px', textAlign: 'center', background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p className="speaking-action-hint recording-text" style={{ color: '#ef4444', fontWeight: 600, marginBottom: '16px' }}>Recording... Speak clearly now.</p>
                    
                    {/* Bouncing Visual Soundwave */}
                    <div className="wave-animation" style={{ display: 'flex', gap: '6px', height: '35px', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="wave-bar bar-1" style={{ width: '4px', height: '15px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                      <span className="wave-bar bar-2" style={{ width: '4px', height: '25px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                      <span className="wave-bar bar-3" style={{ width: '4px', height: '35px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                      <span className="wave-bar bar-4" style={{ width: '4px', height: '20px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                      <span className="wave-bar bar-5" style={{ width: '4px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
                    </div>

                    <p className="recording-timer" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', margin: '8px 0 16px' }}>
                      0:{speakingSeconds < 10 ? `0${speakingSeconds}` : speakingSeconds} / 0:10
                    </p>
                    
                    <button className="record-btn record-btn--recording" onClick={handleStopSpeaking} style={{ width: '70px', height: '70px', borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}>
                      <span style={{ width: '20px', height: '20px', backgroundColor: '#fff', borderRadius: '4px' }}></span>
                    </button>
                  </div>
                )}

                {speakingRecordingState === 'analyzing' && (
                  <div className="speaking-action-zone" style={{ border: '2px solid #e2e8f0', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" size={40} style={{ color: '#8b5cf6', marginBottom: '12px' }} />
                    <p style={{ fontWeight: 600, color: '#475569', margin: 0 }}>AI is evaluating your response...</p>
                  </div>
                )}

                {speakingRecordingState === 'completed' && speakingScore !== null && (
                  <div className="speaking-results-zone animate-scale-up" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="speaking-score-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', background: speakingScore >= 70 ? '#f0fdf4' : '#fef2f2', border: speakingScore >= 70 ? '1px solid #bbf7d0' : '1px solid #fca5a5', borderRadius: '16px', padding: '18px 20px', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="speaking-score-circle" style={{ width: '60px', height: '60px', borderRadius: '50%', border: `4px solid ${speakingScore >= 70 ? '#10b981' : '#ef4444'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: speakingScore >= 70 ? '#065f46' : '#991b1b' }}>{speakingScore}%</span>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: speakingScore >= 70 ? '#14532d' : '#7f1d1d', fontWeight: 700, fontSize: '15px' }}>Response Evaluated</h4>
                          <p style={{ margin: '2px 0 0', fontSize: '13px', color: speakingScore >= 70 ? '#166534' : '#991b1b' }}>
                            {speakingScore >= 70 ? 'Passed! Good customer response.' : 'Score below threshold. You can retry to improve.'}
                          </p>
                        </div>
                      </div>
                      <button className="btn--retry-speaking" onClick={handleRetrySpeaking} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1.5px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <Mic size={14} /> Re-record
                      </button>
                    </div>

                    {(userTranscripts[questions[currentIdx].id] || userFeedbacks[questions[currentIdx].id]) && (
                      <div className="speaking-eval-details" style={{ padding: '16px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', textAlign: 'left' }}>
                        {userTranscripts[questions[currentIdx].id] && (
                          <div style={{ marginBottom: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>What you said:</span>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#1e293b', fontStyle: 'italic', fontWeight: 500 }}>"{userTranscripts[questions[currentIdx].id]}"</p>
                          </div>
                        )}
                        {userFeedbacks[questions[currentIdx].id] && (
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>AI Evaluation Feedback:</span>
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#4f46e5', fontWeight: 600 }}>{userFeedbacks[questions[currentIdx].id]}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="listening-options">
                {questions[currentIdx].options.map((opt, oIdx) => {
                  const isSelected = userAnswers[questions[currentIdx].id] === oIdx;
                  const letterPrefix = ['A', 'B', 'C', 'D'][oIdx];
                  return (
                    <button 
                      key={oIdx} 
                      className={`listening-option-item animate-fade-in ${isSelected ? 'listening-option-item--selected' : ''}`}
                      onClick={() => handleSelectOption(questions[currentIdx].id, oIdx)}
                    >
                      <div className="listening-option-circle">
                        {letterPrefix}
                      </div>
                      <span className="listening-option-text">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          {(() => {
            const isCurrentQuestionAnswered = userAnswers[questions[currentIdx].id] !== undefined;
            return (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '24px', gap: '16px' }}>
                <button 
                  className="btn--gray-outline" 
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  style={{ opacity: currentIdx === 0 ? 0.5 : 1, width: '120px' }}
                >
                  ← Previous
                </button>

                {currentIdx === questions.length - 1 ? (
                  <button 
                    className="exam-btn btn--emerald" 
                    onClick={() => handleSubmitExam()}
                    disabled={!isCurrentQuestionAnswered}
                    style={{ width: '180px', fontWeight: 800, opacity: isCurrentQuestionAnswered ? 1 : 0.5, cursor: isCurrentQuestionAnswered ? 'pointer' : 'not-allowed' }}
                  >
                    Submit Exam ✓
                  </button>
                ) : (
                  <button 
                    className="exam-btn btn--blue" 
                    onClick={handleNext}
                    disabled={!isCurrentQuestionAnswered}
                    style={{ width: '120px', opacity: isCurrentQuestionAnswered ? 1 : 0.5, cursor: isCurrentQuestionAnswered ? 'pointer' : 'not-allowed' }}
                  >
                    Next →
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* STATE D: SUBMITTING / EVALUATING */}
      {examState === 'submitting' && (
        <div className="exam-submitting content-card">
          <Loader2 className="spinner-icon" size={48} />
          <h4>Evaluating responses...</h4>
          <p>Checking correct indices and generating grade diagnostics. Please stand by.</p>
        </div>
      )}

      {/* STATE E: GRADED RESULTS VIEW */}
      {examState === 'result' && gradedResult && (
        <div className="as-exam-card content-card" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          {gradedResult.passed ? <Confetti /> : null}

          <div className="exam-result">
            <div className="result-header">
              <Award size={64} className="reward-icon" style={{ color: gradedResult.passed ? '#f59e0b' : '#94a3b8' }} />
              <h4>{gradedResult.passed ? 'Assessment Passed! 🎉' : 'Assessment Failed ❌'}</h4>
              <p>
                {gradedResult.passed 
                  ? `Congratulations! You cleared the ${activeLevel} assessment.`
                  : `You scored ${gradedResult.percentage}%. The pass mark for ${activeLevel} is > ${gradedResult.requiredPercentage}%. Try reviewing the explanations below and attempt again.`
                }
              </p>
            </div>

            <div className="result-stats">
              <div className="res-stat" style={{ borderColor: gradedResult.passed ? '#10b981' : '#f8b4b4' }}>
                <span className="res-stat-val" style={{ color: gradedResult.passed ? '#10b981' : '#ef4444' }}>
                  {gradedResult.score} / {gradedResult.totalQuestions}
                </span>
                <span className="res-stat-label">Correct</span>
              </div>
              <div className="res-stat">
                <span className="res-stat-val">{gradedResult.percentage}%</span>
                <span className="res-stat-label">Score</span>
              </div>
              {!gradedResult.passed && (
                <div className="res-stat">
                  <span className="res-stat-val">{gradedResult.requiredPercentage}%</span>
                  <span className="res-stat-label">Min Pass</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
              <button className="btn--gray-outline" onClick={() => setExamState('idle')} style={{ width: '180px' }}>
                Back to Dashboard
              </button>
            </div>

            {/* Itemized Question Review List */}
            <div className="quiz-review-container">
              <h4 className="quiz-review-title">Detailed Question Audit</h4>
              <div className="quiz-review-list">
                {gradedResult.details.map((review, rIdx) => {
                  const isWrong = !review.isCorrect;
                  return (
                    <div 
                      key={review.questionId} 
                      className={`review-item-box ${review.isCorrect ? 'review-item-box--correct' : 'review-item-box--incorrect'}`}
                    >
                      <div className="review-item-header">
                        <p className="review-question-text">
                          {rIdx + 1}. {review.questionText}
                        </p>
                        <span className={`review-status-tag ${review.isCorrect ? 'correct' : 'incorrect'}`}>
                          {review.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      {activeCategory === 'speaking' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', width: '100%' }}>
                          <div className="speaking-review-metrics" style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {activeLevel === 'INTERMEDIATE' ? 'Your Scenario Score' : 'Your Pronunciation Score'}
                                </span>
                                <span style={{ fontSize: '20px', fontWeight: 800, color: review.isCorrect ? '#10b981' : '#ef4444' }}>
                                  {review.selectedOption}%
                                </span>
                              </div>
                              {!review.isCorrect && (
                                <>
                                  <div style={{ height: '30px', width: '1.5px', backgroundColor: '#e2e8f0' }} />
                                  <div>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passing Threshold</span>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#475569' }}>
                                      {review.correctOption}%
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {review.transcript && (
                            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Your Spoken Answer:</span>
                              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#334155', fontStyle: 'italic', fontWeight: 500 }}>"{review.transcript}"</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="review-options-list">
                          {review.options.map((opt, oIdx) => {
                            const isCorrectOpt = oIdx === review.correctOption;
                            const isSelectedOpt = oIdx === review.selectedOption;
                            
                            let optClass = 'review-option-row';
                            if (isCorrectOpt) {
                              optClass += ' review-option-row--correct';
                            } else if (isSelectedOpt && isWrong) {
                              optClass += ' review-option-row--selected-wrong';
                            }

                            return (
                              <div key={oIdx} className={optClass}>
                                {opt} {isCorrectOpt ? ' ✓ (Correct Answer)' : ''} {isSelectedOpt && isWrong ? ' ✗ (Your Selection)' : ''}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {review.explanation && (
                        <p className="review-explanation">
                          <strong>Rationale: </strong>{review.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. RURALSHORES CERTIFICATE POPUP MODAL (styled to match user image template) */}
      {showCert && (
        <div className="certificate-modal-overlay">
          <div className="certificate-modal-container animate-scale-up">
            
            {/* Modal close */}
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

            {/* Certificate content to display */}
            <div className="certificate-frame printable-certificate">
              <div className="certificate-inner-border">
                
                {/* Header */}
                <h1 className="cert-header">CERTIFICATE OF COMPLETION</h1>
                
                {/* Sub */}
                <p className="cert-sub">This is to certify that</p>
                
                {/* Dynamic Name */}
                <h2 className="cert-name">{status.recipientName}</h2>
                
                {/* Description */}
                <p className="cert-body">
                  has successfully completed the course on <br />
                  <strong>"{certCategory === 'speaking' ? 'English Speaking Communication' : 'English Writing Communication'}"</strong> with a score of <strong>{(certCategory === 'speaking' ? (status.speakingCertificate?.score || status.speaking.passingScore) : (status.writingCertificate?.score || status.writing.passingScore)) || 100}%</strong>.
                </p>
                
                {/* Presenter */}
                <p className="cert-presenter">Presented by RuralShores</p>
                
                {/* Footer signatures */}
                <div className="cert-footer">
                  <div className="cert-footer-item">
                    <div style={{ height: '35px', content: '""' }}></div> {/* spacer */}
                    <div className="cert-footer-line">
                      {certCategory === 'speaking' && status.speakingCertificate?.createdAt
                        ? new Date(status.speakingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : certCategory === 'writing' && status.writingCertificate?.createdAt
                        ? new Date(status.writingCertificate.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : certDate}
                    </div>
                    <span style={{ fontSize: '10px', color: '#666' }}>Date</span>
                  </div>
                  
                  <div className="cert-footer-item">
                    <div className="cert-signature">RuralShores Admin</div>
                    <div className="cert-footer-line">Authorized Signature</div>
                  </div>
                </div>

              </div>

              {/* Gold Ribbon Seal Stamp */}
              <svg width="90" height="90" viewBox="0 0 100 100" style={{ position: 'absolute', bottom: '50px', right: '45px' }}>
                {/* Ribbons */}
                <path d="M40 70 L30 95 L50 85 L70 95 L60 70" fill="#b8931d" />
                <path d="M45 70 L38 95 L50 85 L62 95 L55 70" fill="#e2c15a" />
                {/* Seal */}
                <circle cx="50" cy="50" r="35" fill="url(#goldGrad)" stroke="#b8931d" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="31" fill="none" stroke="#f2db83" strokeWidth="1.5" strokeDasharray="3 2" />
                {/* Star polygon */}
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

            {/* Modal actions */}
            <div className="certificate-actions">
              <button 
                className="exam-btn btn--blue" 
                onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', width: 'auto' }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button 
                className="btn--gray-outline" 
                onClick={() => setShowCert(false)}
                style={{ padding: '10px 20px' }}
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
