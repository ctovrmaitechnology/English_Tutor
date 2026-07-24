import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, RefreshCw, ChevronRight, CheckCircle, Check, X, PenTool, Sparkles, Trophy, Star, BookOpen, Play, Lock, AlertCircle, Send } from 'lucide-react';
import api from '../services/api';
import CompanionEvents from '../components/Companion/CompanionEvents';
import KenzaTutor from './KenzaTutor';

const WRITING_PROMPTS_FALLBACK = {
  'wr-1-1': [
    { question: "Write a short paragraph (2-3 sentences) introducing yourself and your role in a professional BPO environment." },
    { question: "Write a professional sentence using the Past Perfect tense to explain a completed task before a client call." }
  ],
  'wr-1-2': [
    { question: "Write a complex sentence using the subordinating conjunction 'although' to explain a customer situation." },
    { question: "Correct and rewrite this fragmented sentence: 'Because the customer requested a callback on Monday morning.'" }
  ],
  'wr-2-1': [
    { question: "Draft a professional email subject line and opening line for an urgent billing inquiry." },
    { question: "Write a 2-sentence polite follow-up email response regarding a delayed refund request." }
  ],
  'default': [
    { question: "Write a short, professional response acknowledging a customer's request and explaining next steps." },
    { question: "Draft a polite email sign-off and closing paragraph for a client resolution message." }
  ]
};

export default function WritingLessonFlow({ sub, module, videoUrl, onBack, onComplete, onRefreshProgress, onUncomplete, isCompleted }) {
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
  const [warningModalMsg, setWarningModalMsg] = useState(null);
  const [hasStartedRetake, setHasStartedRetake] = useState(false);
  const [targetRetakeStep, setTargetRetakeStep] = useState(null);

  // Part A state
  const [qIdx, setQIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [partACorrectCount, setPartACorrectCount] = useState(0);
  const [showExp, setShowExp] = useState(false);

  // Part B state
  const [userWritingInput, setUserWritingInput] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [partBResult, setPartBResult] = useState(null);
  const [partBIndex, setPartBIndex] = useState(0);
  const [overallPartBScore, setOverallPartBScore] = useState(0);

  // Tutor
  const [tutorOpened, setTutorOpened] = useState(false);

  // Tracking for attempt_lessons JSON
  const [partAResponseList, setPartAResponseList] = useState([]);
  const [partBResponseList, setPartBResponseList] = useState([]);
  const [isPartACompleted, setIsPartACompleted] = useState(false);
  const [savedPartAScore, setSavedPartAScore] = useState(0);

  const fetchedSubIdRef = useRef(null);

  useEffect(() => {
    if (fetchedSubIdRef.current === sub.id) return;
    fetchedSubIdRef.current = sub.id;

    if (isCompleted) {
      CompanionEvents.emit('PRELOAD_TUTOR_SESSION', {
        lessonId: sub.id,
        topic: sub.title,
        moduleTitle: module.title,
        category: 'writing',
      });
    }

    fetchQuestions();
  }, [sub.id]);

  const fetchQuestions = async (excludeSet = null, skipAttempts = false) => {
    setLoading(true);
    try {
      let url = `/writing/questions/${sub.id}`;
      if (excludeSet) {
        url += `?exclude=${excludeSet}`;
      }
      const res = await api.get(url);
      setPartA(res.data.partA || []);
      const fallbackB = WRITING_PROMPTS_FALLBACK[sub.id] || WRITING_PROMPTS_FALLBACK['default'];
      setPartB(res.data.partB && res.data.partB.length > 0 ? res.data.partB : fallbackB);
      setSetUsed(res.data.set_used || 'SET_1');

      if (!skipAttempts) {
        // Fetch user's existing attempts for this lesson
        try {
          const attemptRes = await api.get(`/lesson/attempts/${sub.id}`);
          const attempts = Array.isArray(attemptRes.data) ? attemptRes.data : [];
          if (attempts.length > 0) {
            const latest = attempts[0];
            if (latest?.responses?.partA) {
              const pAData = latest.responses.partA;
              const score = pAData.score !== undefined ? pAData.score : (pAData.correctAnswers && pAData.totalQuestions ? Math.round((pAData.correctAnswers / pAData.totalQuestions) * 100) : 0);
              setIsPartACompleted(true);
              setSavedPartAScore(score);
              if (pAData.questions) {
                setPartAResponseList(pAData.questions);
              }
              if (pAData.correctAnswers !== undefined) {
                setPartACorrectCount(pAData.correctAnswers);
              }
            }
          }
        } catch (attErr) {
          console.warn('Failed to fetch existing lesson attempts:', attErr);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (targetStep) => {
    if (targetStep === step) return;
    if (targetStep !== 'video' && !videoCompleted && !isCompleted && !isPartACompleted) {
      setWarningModalMsg('Please watch the full video lecture before advancing to the assessment.');
      return;
    }
    const isLessonFinished = isCompleted || step === 'partB-summary' || step === 'tutor';
    if (targetStep === 'tutor' && !isLessonFinished) {
      setWarningModalMsg('Please complete the lesson assessment and writing practice before accessing the AI Tutor.');
      return;
    }
    if (targetStep === 'partB' && !isPartACompleted && !isCompleted && getPartAPercentage() < 60) {
      setWarningModalMsg('Please complete the Topic Assessment first.');
      return;
    }
    // If completed and trying to access tests (partA/partB)
    if (isCompleted && !hasStartedRetake && (targetStep === 'partA' || targetStep === 'partB')) {
      setTargetRetakeStep(targetStep);
      setRetakeModalOpen(true);
      return;
    }
    if (targetStep === 'tutor') {
      CompanionEvents.emit('PRELOAD_TUTOR_SESSION', {
        lessonId: sub.id,
        topic: sub.title,
        moduleTitle: module.title,
        category: 'writing',
      });
    }
    setStep(targetStep);
  };

  const handleConfirmRetake = async () => {
    setRetakeModalOpen(false);
    setHasStartedRetake(true);
    setIsPartACompleted(false);
    setSavedPartAScore(0);
    // Restart all states
    setQIdx(0);
    setPartACorrectCount(0);
    setSelectedOpt(null);
    setIsCorrect(null);
    setShowExp(false);
    setPartAResponseList([]);

    setUserWritingInput('');
    setPartBResult(null);
    setPartBResponseList([]);
    setPartBIndex(0);
    setOverallPartBScore(0);

    await fetchQuestions(setUsed, true);
    setStep(targetRetakeStep || 'partA');
  };

  // ---------------------------------------------------------
  // Part A Handlers (Quiz / Assessment)
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
    if (partACorrectCount === 0 && savedPartAScore > 0) return savedPartAScore;
    if (partA.length === 0) return savedPartAScore || 0;
    return Math.round((partACorrectCount / partA.length) * 100);
  };

  const handleProceedToPartB = async () => {
    const score = getPartAPercentage();
    if (score >= 60) {
      setIsPartACompleted(true);
      setSavedPartAScore(score);
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
      fetchQuestions(setUsed);
    }
  };

  const getPartBPercentage = (responseList = partBResponseList) => {
    if (!responseList || responseList.length === 0) return 0;
    const sumScore = responseList.reduce((acc, q) => acc + (q.score || 0), 0);
    return Math.min(100, Math.round(sumScore / Math.max(1, partB.length || responseList.length)));
  };

  // ---------------------------------------------------------
  // Part B Handlers (Writing Submission & Gemini Evaluation)
  // ---------------------------------------------------------
  const handleSubmitWriting = async () => {
    const text = userWritingInput.trim();
    if (!text || isEvaluating) return;

    setIsEvaluating(true);
    setPartBResult(null);

    try {
      const currentQ = partB[partBIndex];
      const evalRes = await api.post(`/writing/evaluate-part-b`, {
        transcript: text,
        question: currentQ.question
      });

      const rawScore = evalRes.data.overallScore || evalRes.data.score || 0;
      const score = Math.min(100, Math.max(0, rawScore));

      const resultData = {
        ...evalRes.data,
        score
      };

      setPartBResult({
        ...resultData,
        userSubmission: text
      });

      const newEntry = {
        questionNumber: partBIndex + 1,
        question: currentQ?.question || 'Writing Exercise',
        userResponse: text,
        score,
        isCorrect: score >= 60,
        feedback: resultData.feedback || ''
      };

      setPartBResponseList(prev => {
        const filtered = prev.filter(r => r.questionNumber !== partBIndex + 1);
        return [...filtered, newEntry].sort((a, b) => a.questionNumber - b.questionNumber);
      });

    } catch (err) {
      console.error('Writing evaluation error:', err);
      setPartBResult({ score: 0, feedback: "Error evaluating response.", userSubmission: text });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextPartBQuestion = async () => {
    if (partBIndex < partB.length - 1) {
      setPartBIndex(prev => prev + 1);
      setUserWritingInput('');
      setPartBResult(null);
    } else {
      setStep('partB-summary');
      try {
        const pAScore = Math.min(100, getPartAPercentage());
        const pBScore = Math.min(100, getPartBPercentage());
        const finalOverallScore = Math.min(100, Math.round((pAScore + pBScore) / 2));

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

        if (onRefreshProgress) {
          onRefreshProgress();
        }
      } catch (err) {
        console.error("Failed to save attempt", err);
      }
    }
  };

  const handleRetryPartB = () => {
    setPartBResult(null);
    setUserWritingInput('');
  };

  const handleOpenTutor = () => {
    setTutorOpened(true);
    CompanionEvents.emit('OPEN_TUTOR_SESSION', {
      lessonId: sub.id,
      topic: sub.title,
      moduleTitle: module.title,
      category: 'writing',
    });
  };

  if (loading) {
    return (
      <div className="modules-page">
        <button className="modules-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back to {module.title}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '380px', width: '100%' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: module?.color || '#3b82f6', animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  const stepLabels = ['Video', 'Topic Assessment', 'AI Writing Practice', 'AI Tutor'];
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
            <p className="modules-submodule-module-name">Module {module.number} • Writing Lesson</p>
            <h2 className="modules-submodule-title">{sub.title}</h2>
          </div>
        </div>

        <div className="modules-submodule-body">

          <div className="lf-step-bar">
            {['video', 'partA', 'partB', 'tutor'].map((s, i) => {
              const isPartADone = (s === 'partA' && isPartACompleted);
              const done = currentStepIdx > i || (s === 'tutor' && step === 'tutor') || isPartADone;
              const active = currentStepIdx === i;

              let classes = `lf-step-pill ${active ? 'lf-step-active' : done ? 'lf-step-done' : 'lf-step-idle'}`;
              if ((isCompleted || isPartADone) && !active) {
                classes = 'lf-step-pill lf-step-done';
              }
              if ((isCompleted || isPartADone) && active) {
                classes = 'lf-step-pill lf-step-active';
              }

              const isPartAGreen = isPartADone || (isCompleted && s === 'partA');

              return (
                <div
                  key={s}
                  className={classes}
                  onClick={() => handleStepClick(s)}
                  style={{
                    cursor: 'pointer',
                    ...(isPartAGreen ? {
                      borderColor: '#10b981',
                      color: active ? '#fff' : '#10b981',
                      backgroundColor: active ? '#10b981' : '#f0fdf4',
                      fontWeight: 600
                    } : (isCompleted ? {
                      borderColor: '#10b981',
                      color: active ? '#fff' : '#10b981',
                      backgroundColor: active ? '#10b981' : '#f0fdf4'
                    } : {}))
                  }}
                >
                  {(done || isCompleted || isPartADone) && !active ? <Check size={13} /> : <span>{i + 1}</span>}
                  {stepLabels[i]} {s === 'partA' && isPartACompleted && `(${getPartAPercentage()}%)`}
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
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>The video for this writing lesson will be added shortly.</p>
                </div>
              )}
              <div className="lf-video-tip">
                <span>💡</span>
                <p>
                  {!videoCompleted && !isCompleted && !isPartACompleted ? (
                    <>Please watch the full video lecture to unlock the assessment.</>
                  ) : (
                    <>Watch the video lecture, then click <strong>Continue to Topic Assessment</strong> to test what you've learned.</>
                  )}
                </p>
              </div>
              <button
                className="lf-primary-btn"
                onClick={() => handleStepClick('partA')}
                disabled={!videoCompleted && !isCompleted && !isPartACompleted}
                style={!videoCompleted && !isCompleted && !isPartACompleted ? { opacity: 0.6, cursor: 'not-allowed', background: '#94a3b8' } : {}}
              >
                {!videoCompleted && !isCompleted && !isPartACompleted ? (
                  <>Watch Full Video to Unlock Next Step <Lock size={16} style={{ marginLeft: 6 }} /></>
                ) : (
                  <>{isCompleted && !hasStartedRetake ? 'Re-Take Practice Test 🔄' : isPartACompleted ? 'Continue to Assessment (Completed)' : 'Continue to Topic Assessment'} <ChevronRight size={18} /></>
                )}
              </button>
            </div>
          )}

          {/* ── STEP 2: TOPIC ASSESSMENT ─────────────────────────────────────── */}
          {step === 'partA' && isPartACompleted && !hasStartedRetake ? (
            <div className="lf-card lf-score-card">
              <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 8px' }} />
              <h3 className="lf-score-title">Topic Assessment Completed!</h3>
              <div className="lf-score-circle" style={{ borderColor: '#10b981' }}>
                <span style={{ color: '#10b981', fontSize: 32, fontWeight: 700 }}>{getPartAPercentage()}%</span>
              </div>
              <p style={{ marginTop: 12, marginBottom: 20, color: '#64748b' }}>
                You have passed Part A of this lesson! Continue to Part B to finish the lesson.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                <button className="lf-primary-btn" style={{ flex: 1 }} onClick={() => setStep('partB')}>
                  Continue to AI Writing Practice <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetRetakeStep('partA');
                    setRetakeModalOpen(true);
                  }}
                  style={{
                    padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Retake Assessment 🔄
                </button>
              </div>
            </div>
          ) : step === 'partA' && partA.length > 0 && (
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
                {getPartAPercentage() >= 60 ? 'Great job! You have unlocked AI Writing Practice.' : 'You need at least 60% to unlock AI Writing Practice. Please review and try again.'}
              </p>
              <button className="lf-primary-btn" onClick={handleProceedToPartB}>
                {getPartAPercentage() >= 60 ? 'Continue to AI Writing Practice' : 'Retry Topic Assessment'} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 3: AI WRITING PRACTICE ─────────────────────────────────────── */}
          {step === 'partB' && partB.length > 0 && (
            <div className="lf-card">
              <div className="lf-card-header">
                <PenTool size={20} style={{ color: module.color }} />
                <div>
                  <p className="lf-card-sub">Step 3 of 4 — AI Writing Practice</p>
                  <h3 className="lf-card-title">Exercise {partBIndex + 1} of {partB.length}</h3>
                </div>
              </div>

              <div className="prompt-card" style={{ '--theme-color': module.color }}>
                <div className="prompt-card-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PenTool size={18} style={{ color: module.color }} />
                  <h4 style={{ margin: 0 }}>Writing Prompt</h4>
                </div>
                <div className="prompt-card-text" style={{ borderLeftColor: module.color }}>
                  <p style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#1e293b' }}>{partB[partBIndex].question}</p>
                </div>
              </div>

              {!partBResult && (
                <div style={{ marginTop: 20 }}>
                  <textarea
                    rows={5}
                    value={userWritingInput}
                    onChange={(e) => setUserWritingInput(e.target.value)}
                    placeholder="Type your written response here in clear, professional English..."
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px',
                      border: '1.5px solid #cbd5e1', fontSize: '15px', fontFamily: 'inherit',
                      outline: 'none', transition: 'border-color 0.2s', resize: 'vertical'
                    }}
                    disabled={isEvaluating}
                  />
                  <button
                    className="lf-primary-btn"
                    onClick={handleSubmitWriting}
                    disabled={!userWritingInput.trim() || isEvaluating}
                    style={{ marginTop: 14, opacity: (!userWritingInput.trim() || isEvaluating) ? 0.6 : 1 }}
                  >
                    {isEvaluating ? (
                      <>Evaluating Writing with Gemini AI... <Loader2 className="animate-spin" size={18} style={{ marginLeft: 6 }} /></>
                    ) : (
                      <>Submit Written Answer <Send size={16} style={{ marginLeft: 6 }} /></>
                    )}
                  </button>
                </div>
              )}

              {partBResult && (
                <div className="speaking-results-zone" style={{ marginTop: 20 }}>
                  <div className="score-header-box">
                    <div className="score-circle" style={{ borderColor: module.color }}>
                      <span className="score-num">{partBResult.score}%</span>
                      <span className="score-lbl">AI Score</span>
                    </div>
                    <div className="score-metrics" style={{ gridTemplateColumns: '1fr', gap: '8px' }}>
                      {['relevance', 'grammar', 'vocabulary', 'fluency'].map(metric => {
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
                    </div>
                  </div>

                  <div className="feedback-card" style={partBResult.score < 70 ? { background: '#fef2f2', border: '1px solid #fca5a5' } : {}}>
                    <Sparkles size={20} className="feedback-icon" style={{ color: partBResult.score >= 70 ? module.color : '#ef4444' }} />
                    <div className="feedback-text">
                      <h5 style={partBResult.score < 70 ? { color: '#7f1d1d' } : {}}>Gemini Writing Feedback</h5>
                      <p style={partBResult.score < 70 ? { color: '#991b1b' } : {}}>{partBResult.feedback}</p>
                    </div>
                  </div>

                  {partBResult.userSubmission && (
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginTop: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Your Response:</span>
                      <p style={{ margin: '2px 0 0', fontSize: 13, color: '#334155', fontStyle: 'italic' }}>"{partBResult.userSubmission}"</p>
                    </div>
                  )}

                  <div className="result-buttons">
                    <button className="retry-btn" onClick={handleRetryPartB}>
                      <RefreshCw size={16} /> Try Again
                    </button>
                    <button className="lf-primary-btn" style={{ width: 'auto', flex: 1 }} onClick={handleNextPartBQuestion}>
                      {partBIndex < partB.length - 1 ? 'Next Exercise' : 'Finish'} <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'partB-summary' && (
            <div className="lf-card lf-score-card">
              <CheckCircle size={52} style={{ color: '#10b981', margin: '0 auto 8px' }} />
              <h3 className="lf-score-title">Writing Lesson Completed!</h3>
              <p style={{ color: '#64748b', marginBottom: 20 }}>Your scores have been saved to your profile.</p>

              <div style={{ display: 'flex', justifyContent: 'space-around', background: '#f8fafc', padding: 20, borderRadius: 12, marginBottom: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: module.color }}>{getPartAPercentage()}%</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>Topic Assessment</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: module.color }}>{Math.round(overallPartBScore / partB.length)}%</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>AI Writing Practice</div>
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
                    Your AI tutor will walk you through key writing rules, review your quiz answers, answer questions, and help reinforce your writing skills.
                  </p>
                </div>
              </div>

              <div className="lf-tutor-features">
                <div className="lf-tutor-feat"><span>💬</span> Ask any question about grammar & writing</div>
                <div className="lf-tutor-feat"><span>✍️</span> Practice writing emails and messages with AI</div>
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
                    <div className="lf-completed-badge"><CheckCircle size={16} /> Writing Lesson Completed!</div>
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

      {/* ── CUSTOM SITE DESIGN NOTICE MODAL ───────────────────────── */}
      {warningModalMsg && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(3px)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '32px 28px', width: '90%', maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)', textAlign: 'center', position: 'relative'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', background: '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              border: '2px solid #ffedd5'
            }}>
              <AlertCircle size={32} style={{ color: '#ea580c' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>
              Notice
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
              {warningModalMsg}
            </p>
            <button
              onClick={() => setWarningModalMsg(null)}
              style={{
                width: '100%', padding: '12px 24px', borderRadius: '10px', border: 'none',
                background: module.color || '#3b82f6', color: '#fff', fontSize: '15px',
                fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              Understand & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
