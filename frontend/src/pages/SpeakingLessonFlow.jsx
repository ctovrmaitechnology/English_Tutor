import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw, ChevronRight, CheckCircle, Check, X, Mic, Square, Sparkles, Trophy, Star, BookOpen, Play, Volume2, Lock } from 'lucide-react';
import api from '../services/api';
import CompanionEvents from '../components/Companion/CompanionEvents';
import KenzaTutor from './KenzaTutor';

export default function SpeakingLessonFlow({ sub, module, videoUrl, onBack, onComplete, onUncomplete, isCompleted }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setUsed, setSetUsed] = useState(null);

  const [partA, setPartA] = useState([]);
  const [partB, setPartB] = useState([]);

  const [videoCompleted, setVideoCompleted] = useState(!videoUrl);

  useEffect(() => {
    setVideoCompleted(!videoUrl);
  }, [sub?.id, videoUrl]);

  // 'video', 'partA', 'partA-summary', 'partB', 'partB-summary', 'tutor'
  const [step, setStep] = useState('video');
  const [retakeModalOpen, setRetakeModalOpen] = useState(false);
  const [hasStartedRetake, setHasStartedRetake] = useState(false);
  const [targetRetakeStep, setTargetRetakeStep] = useState(null);

  // Part A state
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [partACorrectCount, setPartACorrectCount] = useState(0);
  const [showExp, setShowExp] = useState(false);

  // Part B state
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, analyzing, completed
  const [seconds, setSeconds] = useState(0);
  const [partBResult, setPartBResult] = useState(null);
  const [partBIndex, setPartBIndex] = useState(0);
  const [overallPartBScore, setOverallPartBScore] = useState(0);
  const timerRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [interimSpeech, setInterimSpeech] = useState('');

  // Use refs to avoid closure issues when auto-stopping at 15s
  const transcriptRef = useRef('');
  const interimSpeechRef = useRef('');
  const hasErrorRef = useRef(false);
  const evaluateAudioRef = useRef(null);

  const recognitionRef = useRef(null);

  // TTS
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);

  // Tutor
  const [tutorOpened, setTutorOpened] = useState(false);

  useEffect(() => {
    let active = true;
    const checkIncompleteAndLoad = async () => {
      setLoading(true);
      try {
        CompanionEvents.emit('PRELOAD_TUTOR_SESSION', {
          lessonId: sub.id,
          topic: sub.title,
          moduleTitle: module.title,
          category: 'speaking',
        });

        const incRes = await api.get(`/lesson/incomplete/${sub.id}`);
        const incAttempt = incRes.data;

        if (incAttempt && incAttempt.set && incAttempt.responses?.partA) {
          const qRes = await api.get(`/speaking/questions/${sub.id}?set=${incAttempt.set}`);
          if (active) {
            setPartA(qRes.data.partA || []);
            setPartB(qRes.data.partB || []);
            setSetUsed(incAttempt.set);

            const savedPartA = incAttempt.responses.partA;
            if (savedPartA.questions) setPartAResponseList(savedPartA.questions);
            if (savedPartA.correctAnswers !== undefined) setPartACorrectCount(savedPartA.correctAnswers);

            setStep('partB');
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Could not check incomplete attempt:', e);
      }

      if (active) {
        await fetchQuestions();
      }
    };

    checkIncompleteAndLoad();

    return () => {
      active = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [sub.id]);

  const fetchQuestions = async (excludeSet = null) => {
    setLoading(true);
    try {
      let url = `/speaking/questions/${sub.id}`;
      if (excludeSet) {
        url += `?exclude=${excludeSet}`;
      }
      const res = await api.get(url);
      setPartA(res.data.partA || []);
      setPartB(res.data.partB || []);
      setSetUsed(res.data.set_used);
    } catch (err) {
      console.error(err);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === step) return;
    if (targetStep !== 'video' && !videoCompleted && !isCompleted) {
      alert('Please watch the full video lecture before advancing to the assessment.');
      return;
    }
    // If completed and trying to access tests (partA/partB)
    if (isCompleted && !hasStartedRetake && (targetStep === 'partA' || targetStep === 'partB')) {
      setTargetRetakeStep(targetStep);
      setRetakeModalOpen(true);
      return;
    }
    setStep(targetStep);
  };

  const handleConfirmRetake = async () => {
    setRetakeModalOpen(false);
    setHasStartedRetake(true);
    // Restart all states
    setQIdx(0);
    setPartACorrectCount(0);
    setSelectedOpt(null);
    setIsCorrect(null);
    setShowExp(false);
    setPartAResponseList([]);
    
    setRecordingState('idle');
    setPartBResult(null);
    setSeconds(0);
    setTranscript('');
    setInterimSpeech('');
    setPartBResponseList([]);
    setPartBIndex(0);
    setOverallPartBScore(0);
    
    // Fetch a new set of questions excluding the last used one if possible
    await fetchQuestions(setUsed);
    setStep(targetRetakeStep || 'partA');
  };

  const playPromptTTS = () => {
    if (!partB[partBIndex]) return;
    const cleanText = partB[partBIndex].question.replace(/[•\d.\-]/g, '').trim();
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 1.05; // Sped up as requested
    utterance.pitch = 1;
    utterance.onstart = () => setTtsPlaying(true);
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => setTtsPlaying(false);
    window.speechSynthesis.speak(utterance);
  };

  // Response tracking for attempt_lessons JSON
  const [partAResponseList, setPartAResponseList] = useState([]);
  const [partBResponseList, setPartBResponseList] = useState([]);

  // ---------------------------------------------------------
  // Part A Handlers
  // ---------------------------------------------------------
  const handleSelectA = (idx, optLabel) => {
    if (selectedOpt !== null) return;
    const currentQ = partA[qIdx];
    const correct = currentQ.correctOption === optLabel || currentQ.answer === currentQ[`option${optLabel}`];

    setSelectedOpt(idx);
    setIsCorrect(correct);
    setShowExp(true);
    if (correct) {
      setPartACorrectCount(prev => prev + 1);
    }

    setPartAResponseList(prev => [
      ...prev,
      {
        questionNumber: qIdx + 1,
        question: currentQ.question,
        userAnswer: currentQ[`option${optLabel}`] || optLabel,
        correctAnswer: currentQ.answer || currentQ[`option${currentQ.correctOption}`] || currentQ.correctOption,
        isCorrect: correct,
        marks: correct ? 1 : 0
      }
    ]);
  };

  const handleNextPartA = () => {
    if (qIdx < partA.length - 1) {
      setQIdx(prev => prev + 1);
      setSelectedOpt(null);
      setIsCorrect(null);
      setShowExp(false);
    } else {
      setStep('partA-summary');
    }
  };

  const getPartAPercentage = () => {
    if (partA.length === 0) return 0;
    return Math.round((partACorrectCount / partA.length) * 100);
  };

  const handleProceedToPartB = async () => {
    const score = getPartAPercentage();
    if (score >= 60) {
      setStep('partB');
      try {
        await api.post('/lesson/attempt', {
          moduleId: module.id,
          lessonId: sub.id,
          level: 'BEGINNER',
          set: setUsed,
          score,
          status: 'incomplete',
          responses: {
            partA: {
              score,
              totalQuestions: partA.length,
              correctAnswers: partACorrectCount,
              questions: partAResponseList
            }
          }
        });
      } catch (err) {
        console.error('Failed to save Part A incomplete attempt:', err);
      }
    } else {
      setQIdx(0);
      setPartACorrectCount(0);
      setSelectedOpt(null);
      setIsCorrect(null);
      setShowExp(false);
      setStep('partA');
      fetchQuestions(setUsed); // Retry with a different set!
    }
  };

  // ---------------------------------------------------------
  // Part B Handlers (Recording & Gemini Eval)
  // ---------------------------------------------------------
  useEffect(() => {
    if (recordingState === 'recording') {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  useEffect(() => {
    if (seconds >= 15 && recordingState === 'recording') {
      stopRecording();
    }
  }, [seconds, recordingState]);

  useEffect(() => {
    return () => {
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
    };
  }, [partBIndex]);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    // Safely cleanup any previous instance
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

    setRecordingState('recording');
    setPartBResult(null);
    setTranscript('');
    setInterimSpeech('');
    transcriptRef.current = '';
    interimSpeechRef.current = '';
    hasErrorRef.current = false;

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

      setInterimSpeech(interimTranscript);
      interimSpeechRef.current = interimTranscript;

      if (finalTranscript) {
        setTranscript(prev => {
          const newVal = prev + finalTranscript;
          transcriptRef.current = newVal;
          return newVal;
        });
      }
    };

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e?.error || e);
      if (e?.error === 'no-speech') {
        const textCaptured = (transcriptRef.current + ' ' + interimSpeechRef.current).trim();
        if (!textCaptured) {
          hasErrorRef.current = true;
          setRecordingState('idle');
          setInterimSpeech('');
          return;
        }
      } else {
        hasErrorRef.current = true;
        setRecordingState('idle');
        setInterimSpeech('');
      }
    };

    let hasEvaluated = false;

    const triggerEvaluation = async () => {
      if (hasEvaluated) return;
      hasEvaluated = true;

      setRecordingState('analyzing');

      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }

      const finalFullText = (transcriptRef.current + ' ' + interimSpeechRef.current).trim();

      try {
        const currentQ = partB[partBIndex];
        const evalRes = await api.post(`/speaking/evaluate-part-b`, {
          transcript: finalFullText || "No speech detected.",
          question: currentQ.question
        });

        // Map backend overallScore to score for UI
        const resultData = {
          ...evalRes.data,
          score: evalRes.data.overallScore || evalRes.data.score || 0
        };

        setPartBResult({
          ...resultData,
          transcript: finalFullText || "No speech detected."
        });

        setOverallPartBScore(prev => prev + resultData.score);
        setRecordingState('completed');

        setPartBResponseList(prev => [
          ...prev,
          {
            questionNumber: partBIndex + 1,
            question: currentQ?.question || 'Speaking Drill',
            userResponse: finalFullText || "No speech detected.",
            score: resultData.score,
            isCorrect: resultData.score >= 60,
            feedback: resultData.feedback || ''
          }
        ]);

      } catch (err) {
        console.error(err);
        setPartBResult({ score: 0, feedback: "Error evaluating audio.", transcript: finalFullText });
        setRecordingState('completed');
      }
    };

    evaluateAudioRef.current = triggerEvaluation;

    rec.onend = () => {
      setInterimSpeech('');
      if (!hasErrorRef.current) {
        triggerEvaluation();
      }
    };

    recognitionRef.current = rec;

    try {
      rec.start();
    } catch (startErr) {
      console.error('Failed to start speech recognition:', startErr);
      setRecordingState('idle');
      alert('Microphone access issue. Please check microphone permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (evaluateAudioRef.current) {
      evaluateAudioRef.current();
    }
  };

  const handleNextPartBQuestion = async () => {
    if (partBIndex < partB.length - 1) {
      setPartBIndex(prev => prev + 1);
      setRecordingState('idle');
      setPartBResult(null);
    } else {
      setStep('partB-summary');
      try {
        const pAScore = getPartAPercentage();
        const pBScore = Math.round(overallPartBScore / Math.max(1, partB.length));
        const finalOverallScore = Math.round((pAScore + pBScore) / 2);

        await api.post('/lesson/attempt', {
          moduleId: module.id,
          lessonId: sub.id,
          level: 'BEGINNER',
          set: setUsed,
          score: finalOverallScore,
          status: 'completed',
          responses: {
            partA: {
              score: pAScore,
              totalQuestions: partA.length,
              correctAnswers: partACorrectCount,
              questions: partAResponseList
            },
            partB: {
              score: pBScore,
              totalQuestions: partB.length,
              questions: partBResponseList
            }
          }
        });

        onComplete();
      } catch (err) {
        console.error("Failed to save attempt", err);
      }
    }
  };

  const handleRetryPartB = () => {
    setRecordingState('idle');
    setPartBResult(null);
    setSeconds(0);
    setTranscript('');
    setInterimSpeech('');
    transcriptRef.current = '';
    interimSpeechRef.current = '';
  };

  const handleOpenTutor = () => {
    setTutorOpened(true);
    CompanionEvents.emit('OPEN_TUTOR_SESSION', {
      lessonId: sub.id,
      topic: sub.title,
      moduleTitle: module.title,
      category: 'speaking',
    });
  };

  // ---------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="modules-page">
        <button className="modules-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {module.title}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', width: '100%' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: module?.color || '#6366f1', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const stepLabels = ['Video', 'Topic Assessment', 'AI Speaking Practice', 'AI Tutor'];
  const currentStepIdx = ['video', 'partA', 'partB', 'tutor'].findIndex(s => step.startsWith(s));

  return (
    <div className="modules-page">
      <button className="modules-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> Back to {module.title}
      </button>

      <div className="modules-submodule-card">
        <div className="modules-submodule-header" style={{ background: `linear-gradient(135deg, ${module.color}, ${module.color}bb)` }}>
          <span className="modules-submodule-emoji">{sub.icon}</span>
          <div>
            <p className="modules-submodule-module-name">Module {module.number} • Speaking Lesson</p>
            <h2 className="modules-submodule-title">{sub.title}</h2>
          </div>
        </div>

        <div className="modules-submodule-body">

          <div className="lf-step-bar">
            {['video', 'partA', 'partB', 'tutor'].map((s, i) => {
              const done = currentStepIdx > i || (s === 'tutor' && step === 'tutor');
              const active = currentStepIdx === i;
              
              let classes = `lf-step-pill ${active ? 'lf-step-active' : done ? 'lf-step-done' : 'lf-step-idle'}`;
              if (isCompleted && !active) {
                classes = 'lf-step-pill lf-step-done';
              }
              if (isCompleted && active) {
                classes = 'lf-step-pill lf-step-active';
              }

              return (
                <div 
                  key={s} 
                  className={classes}
                  onClick={() => handleStepClick(s)}
                  style={{ cursor: 'pointer', ...(isCompleted ? { borderColor: '#10b981', color: active ? '#fff' : '#10b981', backgroundColor: active ? '#10b981' : '#f0fdf4' } : {}) }}
                >
                  {(done || isCompleted) && !active ? <Check size={13} /> : <span>{i + 1}</span>}
                  {stepLabels[i]}
                </div>
              );
            })}
          </div>

          {/* ── STEP 1: VIDEO ─────────────────────────────────────── */}
          {step === 'video' && (
            <div className="lf-card">
              <div className="lf-card-header">
                <BookOpen size={20} style={{ color: module.color }} />
                <div>
                  <p className="lf-card-sub">Step 1 of 4 — Video Lecture</p>
                  <h3 className="lf-card-title">{sub.title}</h3>
                </div>
              </div>
              {videoUrl ? (
                <div className="lf-video-container" style={{ position: 'relative', width: '100%', borderRadius: '12px', background: '#000', marginBottom: '16px', overflow: 'hidden' }}>
                  <video
                    src={videoUrl}
                    controls
                    controlsList="nodownload"
                    style={{ width: '100%', display: 'block', borderRadius: '12px' }}
                    onEnded={() => setVideoCompleted(true)}
                    onTimeUpdate={(e) => {
                      if (e.target.currentTime > 0 && e.target.duration > 0 && e.target.currentTime >= e.target.duration - 1) {
                        setVideoCompleted(true);
                      }
                    }}
                  >
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
                  {!videoCompleted && !isCompleted ? (
                    <>Please watch the full video lecture to unlock the assessment.</>
                  ) : (
                    <>Watch the video lecture, then click <strong>Continue to Topic Assessment</strong> to test what you've learned.</>
                  )}
                </p>
              </div>
              <button 
                className="lf-primary-btn" 
                onClick={() => handleStepClick('partA')}
                disabled={!videoCompleted && !isCompleted}
                style={!videoCompleted && !isCompleted ? { opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8' } : {}}
              >
                {!videoCompleted && !isCompleted ? (
                  <>Watch Full Video to Unlock Next Step <Lock size={16} style={{ marginLeft: 6 }} /></>
                ) : (
                  <>{isCompleted && !hasStartedRetake ? 'Re-Take Practice Test 🔄' : 'Continue to Topic Assessment'} <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          )}

          {/* ── STEP 2: TOPIC ASSESSMENT ─────────────────────────────────────── */}
          {step === 'partA' && partA.length > 0 && (
            <div className="lf-card">
              <div className="lf-card-header">
                <Star size={20} style={{ color: module.color }} />
                <div>
                  <p className="lf-card-sub">Step 2 of 4 — Topic Assessment</p>
                  <h3 className="lf-card-title">Topic Assessment</h3>
                </div>
              </div>

              <div className="lf-quiz-progress-track">
                <div className="lf-quiz-progress-fill" style={{ width: `${(qIdx / partA.length) * 100}%`, background: module.color }} />
              </div>
              <p className="lf-quiz-counter">Question {qIdx + 1} of {partA.length}</p>

              <div className="lf-question-box">
                <p className="lf-question-text">{partA[qIdx].question}</p>
              </div>

              <div className="lf-options-grid">
                {['A', 'B', 'C', 'D'].map((optLabel, i) => {
                  const optText = partA[qIdx][`option${optLabel}`];
                  if (!optText) return null;

                  let cls = 'lf-option-btn';
                  if (selectedOpt !== null) {
                    if (partA[qIdx].correctOption === optLabel || partA[qIdx].answer === optText) cls += ' lf-option-correct';
                    else if (selectedOpt === i && !isCorrect) cls += ' lf-option-wrong';
                    else cls += ' lf-option-dim';
                  }

                  return (
                    <button key={i} className={cls} onClick={() => handleSelectA(i, optLabel)} disabled={selectedOpt !== null}>
                      <span className="lf-option-letter">{optLabel}</span>
                      <span className="lf-option-text">{optText}</span>
                      {selectedOpt !== null && (partA[qIdx].correctOption === optLabel || partA[qIdx].answer === optText) && <Check size={18} className="lf-opt-icon" />}
                      {selectedOpt !== null && selectedOpt === i && !isCorrect && <X size={18} className="lf-opt-icon" />}
                    </button>
                  );
                })}
              </div>

              {showExp && (
                <div className={`lf-explanation ${isCorrect ? 'lf-exp-correct' : 'lf-exp-wrong'}`}>
                  <span>{isCorrect ? '✅' : '❌'}</span>
                  <div>
                    <strong>{isCorrect ? 'Correct!' : 'Not quite.'}</strong>
                  </div>
                </div>
              )}

              {selectedOpt !== null && (
                <button className="lf-primary-btn" onClick={handleNextPartA} style={{ marginTop: 12 }}>
                  {qIdx < partA.length - 1 ? 'Next Question' : 'See My Score'} <ChevronRight size={18} />
                </button>
              )}
            </div>
          )}

          {step === 'partA-summary' && (
            <div className="lf-card lf-score-card">
              <Trophy size={52} style={{ color: getPartAPercentage() >= 60 ? '#10b981' : '#f59e0b', margin: '0 auto 8px' }} />
              <h3 className="lf-score-title">Topic Assessment Score</h3>
              <div className="lf-score-circle" style={{ borderColor: getPartAPercentage() >= 60 ? '#10b981' : '#f59e0b' }}>
                <span style={{ color: getPartAPercentage() >= 60 ? '#10b981' : '#f59e0b', fontSize: 32, fontWeight: 700 }}>{getPartAPercentage()}%</span>
              </div>
              <p style={{ marginTop: 12, marginBottom: 20, color: '#64748b' }}>
                {getPartAPercentage() >= 60 ? 'Great job! You have unlocked AI Speaking Practice.' : 'You need at least 60% to unlock AI Speaking Practice. Please review and try again.'}
              </p>
              <button className="lf-primary-btn" onClick={handleProceedToPartB}>
                {getPartAPercentage() >= 60 ? 'Continue to AI Speaking Practice' : 'Retry Topic Assessment'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 3: AI SPEAKING PRACTICE ─────────────────────────────────────── */}
          {step === 'partB' && partB.length > 0 && (
            <div className="lf-card">
              <div className="lf-card-header">
                <Mic size={20} style={{ color: module.color }} />
                <div>
                  <p className="lf-card-sub">Step 3 of 4 — AI Speaking Practice</p>
                  <h3 className="lf-card-title">Question {partBIndex + 1} of {partB.length}</h3>
                </div>
              </div>

              {recordingState === 'completed' && partBResult ? (
                <div className="prompt-card-compact" style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Question {partBIndex + 1}: "{partB[partBIndex].question}"</span>
                  <button
                    type="button"
                    onClick={playPromptTTS}
                    disabled={ttsLoading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16,
                      padding: '4px 12px', cursor: 'pointer', color: '#1d4ed8', fontSize: 12, fontWeight: 600, flexShrink: 0
                    }}
                    title="Click to listen to question"
                  >
                    {ttsLoading ? <Loader2 className="animate-spin" size={14} /> : <Volume2 size={14} className={ttsPlaying ? 'animate-pulse' : ''} />}
                    <span>{ttsPlaying ? 'Playing...' : 'Click to Listen 🔊'}</span>
                  </button>
                </div>
              ) : (
                <div className="prompt-card" style={{ '--theme-color': module.color }}>
                  <div className="prompt-card-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Volume2 size={18} style={{ color: module.color }} />
                    <h4 style={{ margin: 0 }}>Listen & Reply</h4>
                  </div>
                  <div className="prompt-card-text" style={{ borderLeftColor: module.color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, flex: 1, color: '#1e293b' }}>{partB[partBIndex].question}</p>
                    <button
                      type="button"
                      onClick={playPromptTTS}
                      disabled={ttsLoading}
                      className="prompt-tts-btn"
                      title="Click to listen to question audio"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#eff6ff',
                        border: '1.5px solid #bfdbfe',
                        borderRadius: 20,
                        padding: '6px 14px',
                        cursor: ttsLoading ? 'wait' : 'pointer',
                        color: '#1d4ed8',
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 6px rgba(29, 78, 216, 0.08)'
                      }}
                    >
                      {ttsLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Volume2 size={16} className={ttsPlaying ? 'animate-pulse' : ''} />
                      )}
                      <span>{ttsPlaying ? 'Playing...' : 'Click to Listen 🔊'}</span>
                    </button>
                  </div>
                  <div className="prompt-card-tip">
                    <strong>💡 Tip:</strong> Click the speaker button to listen, then speak clearly and answer naturally.
                  </div>
                </div>
              )}

              {recordingState === 'idle' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint">Click the microphone to record your answer.</p>
                  <button className="record-btn" onClick={startRecording} style={{ '--theme-color': module.color }}>
                    <Mic size={32} />
                  </button>
                </div>
              )}

              {recordingState === 'recording' && (
                <div className="speaking-action-zone">
                  <p className="speaking-action-hint recording-text">Recording... Speak clearly now.</p>
                  <div className="wave-animation">
                    <span className="wave-bar bar-1" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-2" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-3" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-4" style={{ backgroundColor: module.color }}></span>
                    <span className="wave-bar bar-5" style={{ backgroundColor: module.color }}></span>
                  </div>
                  <p className="recording-timer">0:{seconds < 10 ? `0${seconds}` : seconds} / 0:15</p>
                  {(transcript || interimSpeech) && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#334155' }}>
                      <span style={{ fontStyle: 'italic' }}>{transcript} {interimSpeech}</span>
                    </div>
                  )}
                  <button className="record-btn record-btn--recording" onClick={stopRecording}>
                    <Square size={24} fill="#fff" />
                  </button>
                </div>
              )}

              {recordingState === 'analyzing' && (
                <div className="speaking-action-zone">
                  <Loader2 className="animate-spin analysis-loader" size={48} style={{ color: module.color }} />
                  <p className="analyzing-text">AI is evaluating your response...</p>
                </div>
              )}

              {recordingState === 'completed' && partBResult && (
                <div className="speaking-results-zone">
                  <div className="score-header-box">
                    <div className="score-circle" style={{ borderColor: module.color }}>
                      <span className="score-num">{partBResult.score}%</span>
                      <span className="score-lbl">AI Score</span>
                    </div>
                    <div className="score-metrics" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>

                      {['relevance', 'fluency', 'vocabulary', 'grammar'].map(metric => {
                        if (partBResult[metric] === undefined) return null;
                        const val = partBResult[metric];
                        const isLow = val < 60;
                        const color = isLow ? '#ef4444' : module.color;
                        return (
                          <div className="metric-row" key={metric}>
                            <span style={{ color: isLow ? '#ef4444' : 'inherit', textTransform: 'capitalize' }}>{metric}:</span>
                            <div className="metric-bar-track">
                              <div className="metric-bar-fill" style={{ width: `${val}%`, background: color }}></div>
                            </div>
                            <span className="metric-val" style={{ color: isLow ? '#ef4444' : 'inherit' }}>{val}%</span>
                          </div>
                        );
                      })}

                      {/* Fallback for old metrics if relevance isn't there */}
                      {partBResult.relevance === undefined && (
                        <>
                          <div className="metric-row">
                            <span style={{ color: partBResult.fluency < 60 ? '#ef4444' : 'inherit' }}>Fluency:</span>
                            <div className="metric-bar-track">
                              <div className="metric-bar-fill" style={{ width: `${partBResult.fluency}%`, background: partBResult.fluency < 60 ? '#ef4444' : module.color }}></div>
                            </div>
                            <span className="metric-val" style={{ color: partBResult.fluency < 60 ? '#ef4444' : 'inherit' }}>{partBResult.fluency}%</span>
                          </div>
                          <div className="metric-row">
                            <span style={{ color: partBResult.pronunciation < 60 ? '#ef4444' : 'inherit' }}>Pronunciation:</span>
                            <div className="metric-bar-track">
                              <div className="metric-bar-fill" style={{ width: `${partBResult.pronunciation}%`, background: partBResult.pronunciation < 60 ? '#ef4444' : module.color }}></div>
                            </div>
                            <span className="metric-val" style={{ color: partBResult.pronunciation < 60 ? '#ef4444' : 'inherit' }}>{partBResult.pronunciation}%</span>
                          </div>
                        </>
                      )}

                    </div>
                  </div>

                  <div className="feedback-card" style={partBResult.score < 70 ? { background: '#fef2f2', border: '1px solid #fca5a5' } : {}}>
                    <Sparkles size={20} className="feedback-icon" style={{ color: partBResult.score >= 70 ? module.color : '#ef4444' }} />
                    <div className="feedback-text">
                      <h5 style={partBResult.score < 70 ? { color: '#7f1d1d' } : {}}>Gemini Feedback</h5>
                      <p style={partBResult.score < 70 ? { color: '#991b1b' } : {}}>{partBResult.feedback}</p>
                    </div>
                  </div>

                  {partBResult.transcript && (
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>What you said:</span>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#334155', fontStyle: 'italic' }}>"{partBResult.transcript}"</p>
                    </div>
                  )}

                  <div className="result-buttons">
                    <button className="retry-btn" onClick={handleRetryPartB}>
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button className="lf-primary-btn" style={{ width: 'auto', flex: 1 }} onClick={handleNextPartBQuestion}>
                      {partBIndex < partB.length - 1 ? 'Next Question' : 'Finish'} <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'partB-summary' && (
            <div className="lf-card lf-score-card">
              <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 8px' }} />
              <h3 className="lf-score-title">Lesson Completed!</h3>
              <p style={{ color: '#64748b', marginBottom: 20 }}>Your scores have been saved to your profile.</p>

              <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: module.color }}>{getPartAPercentage()}%</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Topic Assessment</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: module.color }}>{Math.round(overallPartBScore / partB.length)}%</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>AI Speaking Practice</div>
                </div>
              </div>

              <button className="lf-primary-btn" onClick={() => setStep('tutor')}>
                Meet Your AI Tutor <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 4: AI TUTOR ──────────────────────────────────── */}
          {step === 'tutor' && (
            <div className="lf-card lf-tutor-card">
              <div className="lf-card-header">
                <Star size={20} style={{ color: '#f59e0b' }} />
                <div>
                  <p className="lf-card-sub">Step 4 of 4 — AI Tutor Session</p>
                  <h3 className="lf-card-title">Learn with Kenza</h3>
                </div>
              </div>

              <div className="lf-tutor-intro">
                <div style={{ width: 160, height: 220, flexShrink: 0 }}>
                  <KenzaTutor state={tutorOpened ? 'talking' : 'hello'} size="100%" />
                </div>
                <div className="lf-tutor-bubble">
                  <p><strong>Kenza</strong> is ready to coach you on <strong>{sub.title}</strong>!</p>
                  <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                    Your AI tutor will walk you through key concepts, analyze your speaking test performance, answer questions, and help reinforce what you learned.
                  </p>
                </div>
              </div>

              <div className="lf-tutor-features">
                <div className="lf-tutor-feat"><span>💬</span> Ask any question about the lesson</div>
                <div className="lf-tutor-feat"><span>🎤</span> Practice speaking with live voice chat</div>
                <div className="lf-tutor-feat"><span>📖</span> Get personalized feedback on your test answers</div>
              </div>

              {!tutorOpened ? (
                <button className="lf-tutor-open-btn" onClick={handleOpenTutor}>
                  <span>✨</span> Open AI Tutor Session
                </button>
              ) : (
                <div className="lf-tutor-opened-note">
                  <Check size={18} style={{ color: '#10b981' }} />
                  <p>AI Tutor is open! Chat with Kenza in the overlay.</p>
                </div>
              )}

              <div className="lf-complete-section">
                <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                  After your tutor session, return to modules to unlock the next one.
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
      </div>

      {/* ── RETAKE TEST CONFIRMATION MODAL ───────────────────────── */}
      {retakeModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '32px', width: '90%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)', textAlign: 'center'
          }}>
            <RefreshCw size={48} style={{ color: module.color, margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
              Re-Take Practice Test?
            </h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              You have already completed this lesson. Would you like to attempt a new question set to improve your score?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setRetakeModalOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer'
                }}>
                Cancel
              </button>
              <button 
                onClick={handleConfirmRetake}
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: module.color, color: '#fff', fontWeight: '600', cursor: 'pointer'
                }}>
                Start Re-Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
