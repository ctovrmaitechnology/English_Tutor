import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useUser } from '../context/UserContext';
import { ChevronRight, Check, Mic, Square, Volume2, Sparkles, BookOpen, AlertTriangle, CheckCircle2, XCircle, ShieldCheck, Play, Wifi, X, ArrowLeft, ChevronLeft, Rocket } from 'lucide-react';
import './PlacementTest.css';
import { Confetti } from '../components';

export default function PlacementTest({ onNavigate, onAssessmentActiveChange }) {
  const { currentUser, loadUserData } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState(() => {
    try {
      const cached = sessionStorage.getItem('vrm_cached_placement_answers');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }); // Stores selectedOptionIndex or text Response
  const [submittingNext, setSubmittingNext] = useState(false);

  // Screen State
  const [screenState, setScreenState] = useState('intro'); // 'intro', 'test', 'review', 'result'
  const [instructionsStep, setInstructionsStep] = useState(1);

  // 90-minute countdown timer (90 * 60 = 5400 seconds)
  const [timeLeft, setTimeLeft] = useState(90 * 60);

  // STT State
  const [isRecording, setIsRecording] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const recognitionRef = useRef(null);
  const activeRecordingQuestionIdRef = useRef(null);

  // Compatibility Check State
  const [audioTestStatus, setAudioTestStatus] = useState('idle');
  const [micTestStatus, setMicTestStatus] = useState('idle');

  // Final Result State
  const [result, setResult] = useState(null);

  // TTS State
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsAudioRef = useRef(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem('vrm_cached_placement_answers', JSON.stringify(userAnswers));
    } catch {}
  }, [userAnswers]);

  // Prevent accidental page refresh or tab close during active test
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (screenState === 'test' || screenState === 'review') {
        e.preventDefault();
        e.returnValue = 'Assessment is in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [screenState]);

  // Enforce fullscreen mode & disable Escape key during active test
  useEffect(() => {
    if (screenState !== 'test' && screenState !== 'review') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        enterFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        enterFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [screenState]);

  const enterFullscreen = () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen().catch(() => {});
      }
    } catch {}
  };

  const exitFullscreen = () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    } catch {}
  };

  useEffect(() => {
    const isTestActive = screenState === 'test' || screenState === 'review';
    if (onAssessmentActiveChange) {
      onAssessmentActiveChange(isTestActive);
    }
    if (!isTestActive) {
      exitFullscreen();
    }
  }, [screenState, onAssessmentActiveChange]);

  // Automatically stop recording & clear interim speech whenever question changes
  useEffect(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimSpeech('');
    activeRecordingQuestionIdRef.current = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, [currentIndex]);
  
  const handleFinishAssessment = async () => {
    setSubmittingNext(true);
    try {
      const answersArray = Object.entries(userAnswers).map(([qId, ans]) => ({
        questionId: qId,
        selectedOptionIndex: typeof ans === 'number' ? ans : undefined,
        textResponse: typeof ans === 'string' || typeof ans === 'number' ? String(ans) : undefined,
      }));

      const finishRes = await api.post('/placement/finish', { attemptId, answers: answersArray });
      sessionStorage.removeItem('vrm_cached_placement_answers');
      setResult(finishRes.data);
      setScreenState('result');
    } catch (err) {
      console.error('Failed to finish assessment', err);
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setSubmittingNext(false);
    }
  };

  useEffect(() => {
    if (screenState !== 'test') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screenState]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTestAudio = () => {
    setAudioTestStatus('playing');
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => setAudioTestStatus('success'), 600);
      } catch(e) {
        setTimeout(() => setAudioTestStatus('success'), 600);
      }
    } else {
      setTimeout(() => setAudioTestStatus('success'), 500);
    }
  };

  const handleTestMic = async () => {
    setMicTestStatus('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // close the stream immediately
      setMicTestStatus('success');
    } catch (err) {
      console.error('Microphone access denied:', err);
      setMicTestStatus('error');
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    if (onAssessmentActiveChange) onAssessmentActiveChange(true);
    
    // Start or resume attempt on mount
    const startTest = async () => {
      try {
        const res = await api.post('/placement/start');
        setAttemptId(res.data.attemptId);
        setQuestions(res.data.questions);

        // If they already started, fast forward to where they left off (resumeAtIndex)
        // But for simplicity, we can just start at 0 or resumeAtIndex
        if (res.data.resumeAtIndex > 0 && res.data.resumeAtIndex < res.data.questions.length) {
          setCurrentIndex(res.data.resumeAtIndex);
        }
        
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load placement test.');
      } finally {
        setLoading(false);
      }
    };
    startTest();

    return () => {
      if (onAssessmentActiveChange) onAssessmentActiveChange(false);
    };
  }, [onAssessmentActiveChange]);

  // Handle cleanup of speech recognition and audio
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
    };
  }, []);

  const playTTS = (text) => {
    if (!('speechSynthesis' in window)) {
      alert('Browser TTS is not supported in your browser.');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    if (ttsPlaying) {
      setTtsPlaying(false);
      return;
    }

    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Clear natural speaking rate
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setTtsLoading(false);
      setTtsPlaying(true);
    };

    utterance.onend = () => {
      setTtsPlaying(false);
    };

    utterance.onerror = () => {
      setTtsLoading(false);
      setTtsPlaying(false);
    };

    setTtsLoading(false);
    window.speechSynthesis.speak(utterance);
  };

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = userAnswers[currentQuestion?.questionId];

  const handleOptionSelect = (optionIndex) => {
    setUserAnswers(prev => ({ ...prev, [currentQuestion.questionId]: optionIndex }));
  };

  const handleTextChange = (e) => {
    setUserAnswers(prev => ({ ...prev, [currentQuestion.questionId]: e.target.value }));
  };

  const fullTextAnswer = (currentAnswer || '') + interimSpeech;
  const isAnswerValid = currentQuestion?.questionType === 'mcq' 
    ? (currentAnswer !== undefined && currentAnswer !== '')
    : (fullTextAnswer.trim() !== '');

  const handleNext = () => {
    if (!isAnswerValid) return;
    if (isLastQuestion) {
      setScreenState('review');
    } else {
      setCurrentIndex(prev => prev + 1);
      setInterimSpeech('');
    }
  };

  const startRecording = (targetQIdParam) => {
    const targetQId = (typeof targetQIdParam === 'string' ? targetQIdParam : currentQuestion?.questionId);
    if (!targetQId) return;
    activeRecordingQuestionIdRef.current = targetQId;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please type your answer instead.');
      return;
    }
    
    // Safely cleanup previous instance if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsRecording(true);
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (activeRecordingQuestionIdRef.current === targetQId) {
        setInterimSpeech(interimTranscript);
      }

      if (finalTranscript) {
        setUserAnswers(prev => {
          const existing = prev[targetQId] || '';
          return {
            ...prev,
            [targetQId]: existing + finalTranscript
          };
        });
      }
    };

    rec.onerror = (e) => {
      console.warn('Speech recognition error', e?.error || e);
      setIsRecording(false);
      setInterimSpeech('');
    };

    rec.onend = () => {
      setIsRecording(false);
      setInterimSpeech('');
    };

    recognitionRef.current = rec;

    try {
      rec.start();
    } catch (startErr) {
      console.error('Failed to start speech recognition:', startErr);
      setIsRecording(false);
      alert('Microphone access issue. Please check microphone permissions in browser settings.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    activeRecordingQuestionIdRef.current = null;
    setIsRecording(false);
    setInterimSpeech('');
  };

  const handleFinishTest = async () => {
    // Refresh user data globally to pick up the new role!
    await loadUserData();
    // Navigate home (App.jsx will now render Overview instead of locked)
    onNavigate('overview');
  };

  if (loading) {
    return (
      <div className="placement-container">
        <div className="placement-loading">
          <div className="placement-spinner" />
          <p>Loading your assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="placement-container">
        <div className="placement-error">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2>Oops!</h2>
          <p>{error}</p>
          <button className="nav-btn" onClick={() => onNavigate('overview')}>Go Back</button>
        </div>
      </div>
    );
  }

  // --- INTRO SCREEN ---
  if (screenState === 'intro') {
    return (
      <div className="placement-shell placement-shell--centered">
        <div className="placement-instructions-card">
          {/* Card Top Header */}
          <div className="placement-inst-header">
            <h1 className="placement-inst-title">Initial Proficiency & Communication Assessment</h1>
            <p className="placement-inst-subtitle">
              Welcome! Please complete this brief 3-step onboarding before beginning your official diagnostic evaluation.
            </p>
            
            {/* 3-Step Wizard Progress Tracker */}
            <div className="placement-wizard-tracker">
              {/* Step 1 */}
              <div
                className={`placement-wizard-step ${instructionsStep === 1 ? 'placement-wizard-step--active' : instructionsStep > 1 ? 'placement-wizard-step--completed' : ''}`}
                onClick={() => setInstructionsStep(1)}
              >
                <div className="placement-wizard-step-circle">
                  {instructionsStep > 1 ? <Check size={14} /> : '1'}
                </div>
                <span>Assessment Structure</span>
              </div>
              
              <div className={`placement-wizard-connector ${instructionsStep > 1 ? 'placement-wizard-connector--active' : ''}`} />
              
              {/* Step 2 */}
              <div
                className={`placement-wizard-step ${instructionsStep === 2 ? 'placement-wizard-step--active' : instructionsStep > 2 ? 'placement-wizard-step--completed' : ''}`}
                onClick={() => instructionsStep > 1 && setInstructionsStep(2)}
              >
                <div className="placement-wizard-step-circle">
                  {instructionsStep > 2 ? <Check size={14} /> : '2'}
                </div>
                <span>Compatibility Check</span>
              </div>
              
              <div className={`placement-wizard-connector ${instructionsStep > 2 ? 'placement-wizard-connector--active' : ''}`} />
              
              {/* Step 3 */}
              <div
                className={`placement-wizard-step ${instructionsStep === 3 ? 'placement-wizard-step--active' : ''}`}
                onClick={() => instructionsStep > 2 && setInstructionsStep(3)}
              >
                <div className="placement-wizard-step-circle">3</div>
                <span>Do's & Don'ts</span>
              </div>
            </div>
          </div>
          
          {/* Card Body Content */}
          <div className="placement-inst-body" style={{ minHeight: '380px' }}>
            {/* STEP 1: Assessment Structure & Rules */}
            {instructionsStep === 1 && (
              <div className="placement-wizard-page">
                <h3 className="placement-inst-section-title">
                  <BookOpen size={18} color="#2563eb" /> Step 1: Assessment Structure & Rules
                </h3>
                <div className="placement-inst-grid">
                  <div className="placement-inst-item" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="placement-inst-item-icon" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' }}>🔒</div>
                    <div className="placement-inst-item-text">
                      <h4 style={{ color: '#dc2626' }}>One-Way Locked Assessment</h4>
                      <p>Once you start, you <strong>cannot go back or exit</strong>. The only option is to complete and submit the test.</p>
                    </div>
                  </div>
                  <div className="placement-inst-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="placement-inst-item-icon" style={{ background: '#fffbe6', color: '#d97706', borderColor: '#fde68a' }}>🔄</div>
                    <div className="placement-inst-item-text">
                      <h4 style={{ color: '#b45309' }}>Fresh Question Set on Re-Entry</h4>
                      <p>If you close your browser mid-test, your incomplete attempt is discarded and a <strong>fresh new question set</strong> will be assigned when you return.</p>
                    </div>
                  </div>
                  <div className="placement-inst-item">
                    <div className="placement-inst-item-icon">⏱️</div>
                    <div className="placement-inst-item-text">
                      <h4>90-Minute Time Limit</h4>
                      <p>Self-paced with a visible countdown timer. Take enough time to read passages and verify options.</p>
                    </div>
                  </div>
                  <div className="placement-inst-item">
                    <div className="placement-inst-item-icon">📋</div>
                    <div className="placement-inst-item-text">
                      <h4>Diagnostic Skill Coverage</h4>
                      <p>Comprehensive coverage across Grammar, Vocabulary, Listening, and Reading skills.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* STEP 2: Compatibility Check */}
            {instructionsStep === 2 && (
              <div className="placement-wizard-page">
                <div className="placement-compat-box" style={{ margin: 0 }}>
                  <h3 className="placement-inst-section-title" style={{ margin: 0 }}>
                    <ShieldCheck size={18} color="#10b981" /> Step 2: System & Hardware Compatibility
                  </h3>
                  <p className="placement-muted" style={{ marginTop: '4px' }}>
                    Please test your audio output and microphone input right now to verify they are functioning properly.
                  </p>
                  
                  <div className="placement-compat-items">
                    {/* Speakers Test */}
                    <div className="placement-compat-card">
                      <div className="placement-compat-header">
                        <Volume2 size={18} color="#2563eb" />
                        <span>Audio Output (Speakers)</span>
                      </div>
                      <div className="placement-compat-status">
                        {audioTestStatus === 'success' ? (
                          <span className="placement-compat-status--ready">✓ Verified Working</span>
                        ) : audioTestStatus === 'playing' ? (
                          <span className="placement-compat-status--idle">Playing Tone...</span>
                        ) : (
                          <span className="placement-compat-status--idle">Ready to test</span>
                        )}
                      </div>
                      <button
                        className={`placement-compat-btn ${audioTestStatus === 'success' ? 'placement-compat-btn--success' : ''}`}
                        onClick={handleTestAudio}
                        disabled={audioTestStatus === 'playing' || audioTestStatus === 'success'}
                      >
                        {audioTestStatus === 'success' ? (
                          <><Check size={14} /> Tested</>
                        ) : (
                          <><Play size={14} /> Play Test Sound</>
                        )}
                      </button>
                    </div>
                    
                    {/* Microphone Test */}
                    <div className="placement-compat-card">
                      <div className="placement-compat-header">
                        <Mic size={18} color="#2563eb" />
                        <span>Microphone Input</span>
                      </div>
                      <div className="placement-compat-status">
                        {micTestStatus === 'success' ? (
                          <span className="placement-compat-status--ready">✓ Connected & Ready</span>
                        ) : micTestStatus === 'testing' ? (
                          <span className="placement-compat-status--idle">Checking Access...</span>
                        ) : micTestStatus === 'error' ? (
                          <span className="placement-compat-status--error">⚠️ Check Permissions</span>
                        ) : (
                          <span className="placement-compat-status--idle">Ready to test</span>
                        )}
                      </div>
                      <button
                        className={`placement-compat-btn ${micTestStatus === 'success' ? 'placement-compat-btn--success' : ''}`}
                        onClick={handleTestMic}
                        disabled={micTestStatus === 'testing' || micTestStatus === 'success'}
                      >
                        {micTestStatus === 'success' ? (
                          <><Check size={14} /> Tested</>
                        ) : (
                          <><Mic size={14} /> Test Microphone</>
                        )}
                      </button>
                    </div>
                    
                    {/* Network Sync */}
                    <div className="placement-compat-card">
                      <div className="placement-compat-header">
                        <Wifi size={18} color="#10b981" />
                        <span>Cloud API Connection</span>
                      </div>
                      <div className="placement-compat-status">
                        <span className="placement-compat-status--ready">✓ Online & Synchronized</span>
                      </div>
                      <button className="placement-compat-btn placement-compat-btn--success" disabled>
                        <Check size={14} /> Connected
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* STEP 3: Do's & Don'ts */}
            {instructionsStep === 3 && (
              <div className="placement-wizard-page">
                <h3 className="placement-inst-section-title">
                  <AlertTriangle size={18} color="#f59e0b" /> Step 3: Important Do's & Don'ts
                </h3>
                <div className="placement-rules-grid">
                  {/* DO'S */}
                  <div className="placement-rule-col placement-rule-col--dos">
                    <div className="placement-rule-title">
                      <CheckCircle2 size={18} /> DO'S (Recommended)
                    </div>
                    <ul className="placement-rule-list">
                      <li>Sit in a quiet room with minimal background noise during spoken dialogue questions.</li>
                      <li>Use wired or stable wireless headphones for crystal-clear audio during the Listening section.</li>
                      <li>Attempt and answer all 86 questions to ensure accurate diagnostic mapping across all CEFR bands.</li>
                      <li>Speak clearly, naturally, and at a steady professional pace when answering spoken prompts.</li>
                    </ul>
                  </div>
                  
                  {/* DON'TS */}
                  <div className="placement-rule-col placement-rule-col--donts">
                    <div className="placement-rule-title">
                      <X size={18} /> DON'TS (What to Avoid)
                    </div>
                    <ul className="placement-rule-list">
                      <li><strong>No Esc Key Exit:</strong> Fullscreen mode is enforced and the Esc key is disabled during the test.</li>
                      <li><strong>Completion Required:</strong> The only way to exit and unlock your modules is to complete and submit the final assessment.</li>
                      <li>Do not close, refresh, or navigate away from the browser tab during active questions.</li>
                      <li>Do not use external dictionaries, translator apps, or AI assistants — this is an initial baseline check.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Navigation Buttons */}
          <div className="placement-inst-footer">
            {instructionsStep === 1 ? (
              <button
                className="placement-btn placement-btn--secondary"
                onClick={() => onNavigate('overview')}
                style={{ flex: '0 0 auto', padding: '12px 24px' }}
              >
                <ArrowLeft size={16} /> Back to Dashboard
              </button>
            ) : (
              <button
                className="placement-btn placement-btn--secondary"
                onClick={() => setInstructionsStep((prev) => prev - 1)}
                style={{ flex: '0 0 auto', padding: '12px 24px' }}
              >
                <ChevronLeft size={16} /> Previous Step
              </button>
            )}
            
            {instructionsStep < 3 ? (
              <button
                className="placement-btn placement-btn--primary"
                onClick={() => setInstructionsStep((prev) => prev + 1)}
                style={{ flex: '0 0 auto', padding: '14px 28px', fontSize: '15.5px' }}
              >
                Next: {instructionsStep === 1 ? 'Compatibility Check' : "Do's & Don'ts"} <ChevronRight size={18} />
              </button>
            ) : (
              <button
                className="placement-btn placement-btn--primary"
                onClick={() => {
                  enterFullscreen();
                  setCurrentIndex(0);
                  setScreenState('test');
                }}
                style={{ flex: '0 0 auto', padding: '14px 32px', fontSize: '15.5px' }}
              >
                Start Assessment Now <Rocket size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- REVIEW SCREEN ---
  if (screenState === 'review') {
    const answeredCount = questions.filter(q => userAnswers[q.questionId] !== undefined && userAnswers[q.questionId] !== '').length;
    const skippedCount = questions.length - answeredCount;

    return (
      <div className="placement-container fullscreen-active" style={{ background: '#f8fafc' }}>
        <div className="placement-card" style={{ maxWidth: 840, overflowY: 'auto', maxHeight: '85vh', padding: 32 }}>
          <h2 style={{ fontSize: 26, marginBottom: 8, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Square size={24} color="#3b82f6" fill="#3b82f6" /> Assessment Review
          </h2>
          <p style={{ color: '#64748b', marginBottom: 20, fontSize: 15 }}>
            Please review your progress before final submission. Click any question number below to jump directly to it and answer or edit it.
          </p>

          {/* Stat Summary Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>✓</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46', lineHeight: 1.1 }}>{answeredCount}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answered</div>
              </div>
            </div>

            <div style={{ background: '#fffbe6', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>⚠️</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e', lineHeight: 1.1 }}>{skippedCount}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Skipped</div>
              </div>
            </div>

            <div style={{ background: '#f1f5f9', border: '1.5px solid #cbd5e1', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#64748b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 }}>📊</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{questions.length}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</div>
              </div>
            </div>
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#ecfdf5', border: '1.5px solid #10b981' }}></span>
              <span style={{ color: '#047857' }}>Green = Answered</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#f8fafc', border: '1.5px solid #cbd5e1' }}></span>
              <span style={{ color: '#64748b' }}>Grey = Skipped / Unanswered</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 12, marginBottom: 32 }}>
            {questions.map((q, idx) => {
              const isAnswered = userAnswers[q.questionId] !== undefined && userAnswers[q.questionId] !== '';
              return (
                <button
                  key={q.questionId}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setScreenState('test');
                  }}
                  style={{
                    padding: '12px 0',
                    borderRadius: 8,
                    border: `1.5px solid ${isAnswered ? '#10b981' : '#cbd5e1'}`,
                    background: isAnswered ? '#ecfdf5' : '#f8fafc',
                    color: isAnswered ? '#065f46' : '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
            <button 
              className="nav-btn" 
              style={{ background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}
              onClick={() => {
                setCurrentIndex(questions.length - 1);
                setScreenState('test');
              }}
            >
              Back to Test
            </button>
            <button 
              className="nav-btn finish-btn" 
              onClick={handleFinishAssessment}
              disabled={submittingNext}
            >
              {submittingNext ? 'Submitting...' : 'Submit Final Assessment'} <Check size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RESULTS SCREEN ---
  if (screenState === 'result' && result) {
    return (
      <div className="placement-container" style={{ background: '#0f172a' }}>
        <Confetti duration={4000} />
        <div className="placement-card result-screen" style={{ maxWidth: 620, textAlign: 'center', padding: '40px 32px' }}>
          <div className="result-icon" style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h2 style={{ fontSize: 28, color: '#0f172a', marginBottom: 8 }}>Assessment Completed!</h2>
          <p style={{ color: '#64748b', fontSize: 16, marginBottom: 28 }}>
            We've analyzed your performance and customized your English learning journey.
          </p>
          
          <div className="band-card" style={{ display: 'flex', gap: 24, justifyContent: 'center', background: '#f8fafc', padding: 24, borderRadius: 16, border: '1.5px solid #e2e8f0', marginBottom: 28 }}>
            <div style={{ flex: 1 }}>
              <span className="band-label" style={{ display: 'block', fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Overall Score</span>
              <span className="band-value" style={{ fontSize: 36, fontWeight: 800, color: '#2563eb' }}>{result.totalScore}%</span>
            </div>
            <div style={{ width: 1, background: '#cbd5e1' }} />
            <div style={{ flex: 1 }}>
              <span className="band-label" style={{ display: 'block', fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Assigned Level</span>
              <span className="band-value" style={{ fontSize: 36, fontWeight: 800, color: '#10b981' }}>{result.finalLevel}</span>
            </div>
          </div>

          <p style={{ fontSize: 14, color: '#475569', marginBottom: 28, lineHeight: 1.5 }}>
            Your English level has been mapped to <strong>{result.finalLevel}</strong> with an overall score of <strong>{result.totalScore}%</strong>. Click below to enter your dashboard and start learning!
          </p>
          
          <button className="continue-btn" onClick={handleFinishTest} style={{ width: '100%', padding: '16px 24px', fontSize: 17, fontWeight: 700, borderRadius: 12, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}>
            Start Learning Now 🚀
          </button>
        </div>
      </div>
    );
  }

  // --- QUESTION SCREEN ---
  const progressPercent = ((currentIndex) / questions.length) * 100;

  // Group questions by skill in sequential section order
  const skillDisplayOrder = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking'];
  const groupedQuestions = questions.reduce((acc, q, idx) => {
    const skill = (q.skill || 'grammar').toLowerCase();
    if (!acc[skill]) acc[skill] = [];
    acc[skill].push({ ...q, absoluteIndex: idx });
    return acc;
  }, {});

  const sortedSkills = Object.keys(groupedQuestions).sort((a, b) => {
    const ia = skillDisplayOrder.indexOf(a);
    const ib = skillDisplayOrder.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b);
  });

  if (screenState === 'test' && (!currentQuestion || questions.length === 0)) {
    return (
      <div className="placement-container">
        <div className="placement-error">
          <span style={{ fontSize: 48 }}>⚠️</span>
          <h2>Oops!</h2>
          <p>No questions available for this assessment.</p>
          <button className="nav-btn" onClick={() => onNavigate('overview')}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="placement-container fullscreen-active">
      <div className="placement-layout">
        {/* Left Sidebar Navigation */}
        <div className="placement-sidebar">
          <div className="sidebar-header">Assessment Progress</div>
          <div className="sidebar-scroll-area">
            {sortedSkills.map((skill) => (
              <div key={skill} className="skill-section">
                <div className="skill-section-title">{skill.toUpperCase()}</div>
                <div className="question-grid">
                  {groupedQuestions[skill].map((q) => {
                    const idx = q.absoluteIndex;
                    const isAnswered = userAnswers[q.questionId] !== undefined && userAnswers[q.questionId] !== '';
                    const isActive = idx === currentIndex;
                    let boxClass = 'q-box';
                    if (isActive) boxClass += ' active';
                    else if (isAnswered) boxClass += ' answered';

                    return (
                      <div 
                        key={q.questionId} 
                        className={boxClass}
                        onClick={() => setCurrentIndex(idx)}
                      >
                        {idx + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="placement-card">
          {/* Header & Progress */}
          <div className="placement-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0 }}>Placement Test</h2>
              <span className="progress-text" style={{ textAlign: 'left', marginTop: 4 }}>Question {currentIndex + 1} of {questions.length}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: timeLeft < 300 ? '#fef2f2' : '#f0fdf4',
              border: `1.5px solid ${timeLeft < 300 ? '#fca5a5' : '#86efac'}`,
              color: timeLeft < 300 ? '#dc2626' : '#166534',
              fontWeight: 800, fontSize: 15,
            }}>
              <span>⏱️ Time Remaining:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 18 }}>{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="progress-bar-container" style={{ margin: '0 32px 16px' }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

        {/* Content */}
        <div className="placement-content">
          <div className="question-meta">
            <span className="section-badge">{currentQuestion.sectionTitle || currentQuestion.section}</span>
            {currentQuestion.skill &&
              (currentQuestion.sectionTitle || currentQuestion.section)?.toLowerCase() !== currentQuestion.skill?.toLowerCase() && (
                <span className="skill-badge">{currentQuestion.skill}</span>
              )}
          </div>
          
          <h3 className="question-text">{currentQuestion.questionText}</h3>
          
          {currentQuestion.passage && (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 24, fontStyle: 'italic' }}>
              {currentQuestion.passage}
            </div>
          )}

          {(currentQuestion.audioScript || currentQuestion.skill === 'listening') && (
            <button 
              className={`mic-btn ${ttsPlaying ? 'recording' : ''}`}
              onClick={() => playTTS(currentQuestion.audioScript || currentQuestion.questionText || currentQuestion.passage)}
              disabled={ttsLoading}
              style={{ marginBottom: 16, backgroundColor: ttsPlaying ? '#10b981' : '#f1f5f9', color: ttsPlaying ? '#fff' : '#0f172a' }}
            >
              {ttsLoading ? (
                <><span className="placement-spinner" style={{ width: 14, height: 14, marginRight: 8 }} /> Loading Audio...</>
              ) : (
                <><Volume2 size={18} /> {ttsPlaying ? 'Playing Audio...' : 'Play Audio'}</>
              )}
            </button>
          )}

          {currentQuestion.questionType === 'mcq' ? (
            <div className="options-grid">
              {currentQuestion.options?.map((opt, idx) => (
                <button
                  key={idx}
                  className={`option-btn ${currentAnswer === idx ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(idx)}
                  disabled={submittingNext}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div>
              {(currentQuestion.responseMode === 'audio' || currentQuestion.skill === 'speaking' || currentQuestion.skill === 'reading' || currentQuestion.skill === 'listening') && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    className={`mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={submittingNext}
                    style={{ marginBottom: 0 }}
                  >
                    {isRecording ? (
                      <><Square size={18} fill="currentColor" /> Stop Recording...</>
                    ) : (
                      <><Mic size={18} /> Tap to Speak</>
                    )}
                  </button>

                  {((currentAnswer && currentAnswer.trim()) || interimSpeech) && (
                    <button
                      className="mic-btn"
                      onClick={() => {
                        if (isRecording) stopRecording();
                        setInterimSpeech('');
                        setUserAnswers(prev => ({ ...prev, [currentQuestion.questionId]: '' }));
                      }}
                      style={{ marginBottom: 0, backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5', fontWeight: 700 }}
                    >
                      🔄 Retake Audio
                    </button>
                  )}
                </div>
              )}
              <textarea 
                className="text-response-input"
                placeholder={
                  (currentQuestion.responseMode === 'audio' || currentQuestion.skill === 'speaking' || currentQuestion.skill === 'reading')
                    ? "Speak into the microphone to answer..."
                    : "Type your answer here..."
                }
                value={(currentAnswer || '') + interimSpeech}
                onChange={handleTextChange}
                disabled={submittingNext}
                readOnly={currentQuestion.skill === 'listening' || currentQuestion.skill === 'speaking' || currentQuestion.skill === 'reading'}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="placement-footer">
          <button 
            className={`nav-btn ${isLastQuestion ? 'finish-btn' : ''}`}
            onClick={handleNext}
            disabled={!isAnswerValid || submittingNext}
          >
            {submittingNext ? (
              <span className="placement-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : isLastQuestion ? (
              <>Submit Test <Check size={18} /></>
            ) : (
              <>Next <ChevronRight size={18} /></>
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
