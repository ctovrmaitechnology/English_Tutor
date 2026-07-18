import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';
import './PlacementTest.css';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  WifiOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Flag,
  Clock,
  Menu,
  X,
  Bookmark,
  Send,
  HelpCircle,
  CheckCircle,
  Circle,
  AlertTriangle
} from 'lucide-react';

const LEVEL_META = {
  BEGINNER: { label: 'Beginner', color: '#f97316', blurb: "You're placed in the Beginner pathway — we'll build your foundational communication and grammar step by step." },
  ELEMENTARY: { label: 'Beginner', color: '#f97316', blurb: "You're placed in the Beginner pathway — we'll build your foundational communication and grammar step by step." },
  INTERMEDIATE: { label: 'Intermediate', color: '#2563eb', blurb: "You're placed in the Intermediate pathway — we'll sharpen your professional fluency and accuracy." },
  ADVANCED: { label: 'Intermediate', color: '#2563eb', blurb: "You're placed in the Intermediate pathway — we'll sharpen your professional fluency and accuracy." },
};

const SKILL_LABEL = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  reading: 'Reading',
  listening: 'Listening',
  speaking: 'Speaking',
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function PlacementTest({ onComplete }) {
  // phase: loading | question | review_modal | finishing | result | error
  const [phase, setPhase] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> value (index for mcq, string for text)
  const [visitedSet, setVisitedSet] = useState(() => new Set([0]));
  const [reviewSet, setReviewSet] = useState(() => new Set());
  const [expandedSections, setExpandedSections] = useState({});
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | saving | retrying | error
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // for mobile drawer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(5400); // default 90 mins

  const questionStartedAtRef = useRef(Date.now());
  const pendingSavesRef = useRef(new Map());

  const currentQuestion = questions[currentIndex] || null;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.questionId] : undefined;

  // ── Load Assessment ──────────────────────────────────────────────
  const loadStart = useCallback(async () => {
    setPhase('loading');
    setErrorMessage('');
    try {
      const { data } = await api.post('/placement/start');
      setAttemptId(data.attemptId);
      setQuestions(data.questions || []);
      const startIdx = Math.min(data.resumeAtIndex || 0, Math.max(0, (data.questions || []).length - 1));
      setCurrentIndex(startIdx);
      setVisitedSet(new Set([startIdx]));
      questionStartedAtRef.current = Date.now();
      
      // Initialize timer based on questions length (approx 1 min per question, minimum 60 mins)
      const totalSecs = Math.max(3600, (data.questions || []).length * 60);
      setTimeLeftSeconds(totalSecs);
      setPhase('question');
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || 'Could not start the placement test. Please try again.'
      );
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    loadStart();
  }, [loadStart]);

  // ── Countdown Timer ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'question' && phase !== 'review_modal') return;
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Format MM:SS or HH:MM:SS
  const formatTimeLeft = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Warn before closing tab while saves in flight
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingSavesRef.current.size > 0 || phase === 'question') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // ── Section Grouping ─────────────────────────────────────────────
  const sections = useMemo(() => {
    const groups = [];
    const map = new Map();
    const skillOrder = ['grammar', 'vocabulary', 'reading', 'listening', 'speaking'];

    questions.forEach((q, idx) => {
      const key = q.skill || 'grammar';
      if (!map.has(key)) {
        const grp = {
          key,
          title: SKILL_LABEL[key] || key.charAt(0).toUpperCase() + key.slice(1),
          questions: [],
          startNumber: idx + 1,
          endNumber: idx + 1,
        };
        map.set(key, grp);
        groups.push(grp);
      }
      const grp = map.get(key);
      grp.questions.push({ ...q, originalIndex: idx });
      grp.endNumber = idx + 1;
    });

    // Sort sections by standard skill order
    groups.sort((a, b) => {
      const ia = skillOrder.indexOf(a.key);
      const ib = skillOrder.indexOf(b.key);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    return groups;
  }, [questions]);

  // Automatically expand the section that contains current index
  useEffect(() => {
    if (!currentQuestion) return;
    const currentSectionKey = currentQuestion.skill || 'grammar';
    setExpandedSections((prev) => ({
      ...prev,
      [currentSectionKey]: true,
    }));
    setVisitedSet((prev) => new Set([...prev, currentIndex]));
  }, [currentIndex, currentQuestion]);

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // ── Background Save ──────────────────────────────────────────────
  const saveAnswerInBackground = useCallback((questionId, value, isMcq, responseTimeMs, attempt = 1) => {
    setSyncStatus((s) => (s === 'error' ? 'error' : attempt > 1 ? 'retrying' : 'saving'));

    const payload = {
      attemptId,
      questionId,
      responseTimeMs,
    };
    if (isMcq) {
      payload.selectedOptionIndex = value;
    } else {
      payload.textResponse = value;
    }

    const promise = api.post('/placement/answer', payload)
      .then(() => {
        pendingSavesRef.current.delete(questionId);
        if (pendingSavesRef.current.size === 0) setSyncStatus('idle');
      })
      .catch((err) => {
        const isClientError = err?.response?.status >= 400 && err?.response?.status < 500;
        if (isClientError || attempt >= 5) {
          pendingSavesRef.current.delete(questionId);
          setSyncStatus(isClientError ? 'idle' : 'error');
          return;
        }
        const backoffMs = Math.min(600 * 2 ** attempt, 8000);
        return new Promise((resolve) => {
          setTimeout(() => {
            const retryPromise = saveAnswerInBackground(questionId, value, isMcq, responseTimeMs, attempt + 1);
            pendingSavesRef.current.set(questionId, retryPromise);
            retryPromise.then(resolve);
          }, backoffMs);
        });
      });

    pendingSavesRef.current.set(questionId, promise);
    return promise;
  }, [attemptId]);

  const handleSelectAnswer = (value) => {
    if (!currentQuestion) return;
    const isMcq = currentQuestion.questionType === 'mcq';
    setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: value }));
    const responseTimeMs = Date.now() - questionStartedAtRef.current;
    saveAnswerInBackground(currentQuestion.questionId, value, isMcq, responseTimeMs);
  };

  // ── Navigation Actions ───────────────────────────────────────────
  const handleJumpTo = (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    questionStartedAtRef.current = Date.now();
    setIsSidebarOpen(false);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      handleJumpTo(currentIndex + 1);
    } else {
      setPhase('review_modal');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleJumpTo(currentIndex - 1);
    }
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    setReviewSet((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.questionId)) {
        next.delete(currentQuestion.questionId);
      } else {
        next.add(currentQuestion.questionId);
      }
      return next;
    });
  };

  // Final submit after review modal
  const handleFinish = async () => {
    if (!attemptId) return;
    setPhase('finishing');
    try {
      await Promise.all([...pendingSavesRef.current.values()]);
      const { data } = await api.post('/placement/finish', { attemptId });
      setResult(data);
      setPhase('result');
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || 'Something went wrong finishing your assessment. Please try again.'
      );
      setPhase('error');
    }
  };

  // ── Keyboard Shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'question') return;
      const tag = e.target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleReview();
      } else if (currentQuestion && currentQuestion.questionType === 'mcq' && currentQuestion.options) {
        if (e.key >= '1' && e.key <= '4') {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQuestion.options.length) {
            handleSelectAnswer(idx);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, currentQuestion, questions]);

  // ── Progress Metrics ─────────────────────────────────────────────
  const stats = useMemo(() => {
    let answered = 0;
    let reviewed = 0;
    questions.forEach((q) => {
      const val = answers[q.questionId];
      if (val !== undefined && val !== '' && val !== null) answered++;
      if (reviewSet.has(q.questionId)) reviewed++;
    });
    return {
      answered,
      remaining: questions.length - answered,
      reviewed,
      total: questions.length,
    };
  }, [questions, answers, reviewSet]);

  const getQuestionStatus = (q, idx) => {
    const isCurrent = idx === currentIndex;
    const isReviewed = reviewSet.has(q.questionId);
    const val = answers[q.questionId];
    const isAnswered = val !== undefined && val !== '' && val !== null;
    const isVisited = visitedSet.has(idx);

    if (isCurrent) return 'current';
    if (isReviewed) return 'review';
    if (isAnswered) return 'answered';
    if (isVisited) return 'visited';
    return 'unvisited';
  };

  // ── Loading / Finishing ──────────────────────────────────────────
  if (phase === 'loading' || phase === 'finishing') {
    return (
      <div className="placement-shell placement-shell--centered">
        <div className="placement-center">
          <Loader2 className="placement-spin" size={40} />
          <h3 className="placement-loading-title">
            {phase === 'finishing' ? 'Finalizing Assessment Results…' : 'Loading Question Bank…'}
          </h3>
          <p className="placement-muted">
            {phase === 'finishing'
              ? 'We are syncing your final answers and evaluating your CEFR proficiency profile.'
              : 'Preparing your parallel fixed-form assessment environment.'}
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="placement-shell placement-shell--centered">
        <div className="placement-center">
          <AlertCircle size={44} color="#dc2626" />
          <h3 className="placement-loading-title" style={{ color: '#dc2626' }}>Assessment Error</h3>
          <p className="placement-error-text">{errorMessage}</p>
          <button className="placement-btn placement-btn--primary" onClick={loadStart}>
            Retry Assessment
          </button>
        </div>
      </div>
    );
  }

  // ── Result Screen ────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const rawLevel = result.finalLevel === 'ELEMENTARY' || result.finalLevel === 'BEGINNER' ? 'BEGINNER' : 'INTERMEDIATE';
    const meta = LEVEL_META[rawLevel] || LEVEL_META.BEGINNER;
    return (
      <div className="placement-shell placement-shell--centered">
        <div className="placement-result-card">
          <Sparkles size={44} color={meta.color} />
          <h2 className="placement-result-title">Official Placement Profile</h2>
          <div className="placement-result-level" style={{ color: meta.color }}>
            {meta.label}
          </div>
          <p className="placement-result-blurb">{meta.blurb}</p>

          <div className="placement-result-score">
            <span className="placement-result-score-number">{result.totalScore || 0}</span>
            <span className="placement-result-score-out-of">/ 100</span>
          </div>

          <div className="placement-skill-grid">
            {Object.entries(result.skillScores || {}).map(([skill, score]) => (
              <div key={skill} className="placement-skill-item">
                <div className="placement-skill-bar-track">
                  <div className="placement-skill-bar-fill" style={{ width: `${score}%` }} />
                </div>
                <div className="placement-skill-label-row">
                  <span>{SKILL_LABEL[skill] || skill}</span>
                  <span className="placement-skill-score">{score}%</span>
                </div>
              </div>
            ))}
          </div>

          <button
            className="placement-btn placement-btn--primary placement-btn--wide"
            onClick={() => onComplete && onComplete(result)}
          >
            Start Learning Curriculum →
          </button>
        </div>
      </div>
    );
  }

  // ── Review Modal Screen ──────────────────────────────────────────
  if (phase === 'review_modal') {
    const unansweredList = questions.filter((q) => {
      const val = answers[q.questionId];
      return val === undefined || val === '' || val === null;
    });
    const reviewList = questions.filter((q) => reviewSet.has(q.questionId));

    return (
      <div className="placement-shell placement-shell--centered">
        <div className="placement-review-modal">
          <div className="placement-review-modal-header">
            <h2>Assessment Review & Summary</h2>
            <p className="placement-muted">
              Please review your status before finally submitting your answers. Once submitted, you cannot return.
            </p>
          </div>

          <div className="placement-review-summary-cards">
            <div className="placement-summary-card">
              <span className="placement-summary-number">{stats.total}</span>
              <span className="placement-summary-label">Total Questions</span>
            </div>
            <div className="placement-summary-card placement-summary-card--answered">
              <span className="placement-summary-number">{stats.answered}</span>
              <span className="placement-summary-label">Answered</span>
            </div>
            <div className="placement-summary-card placement-summary-card--unanswered">
              <span className="placement-summary-number">{stats.remaining}</span>
              <span className="placement-summary-label">Not Answered</span>
            </div>
            <div className="placement-summary-card placement-summary-card--review">
              <span className="placement-summary-number">{stats.reviewed}</span>
              <span className="placement-summary-label">Marked for Review</span>
            </div>
          </div>

          {(unansweredList.length > 0 || reviewList.length > 0) && (
            <div className="placement-review-lists">
              {unansweredList.length > 0 && (
                <div className="placement-review-list-section">
                  <h4 style={{ color: '#d97706' }}>⚠️ Unanswered Questions ({unansweredList.length})</h4>
                  <div className="placement-review-pills">
                    {unansweredList.map((q) => {
                      const idx = questions.findIndex((item) => item.questionId === q.questionId);
                      return (
                        <button
                          key={q.questionId}
                          className="placement-review-pill placement-review-pill--unanswered"
                          onClick={() => {
                            setCurrentIndex(idx);
                            setPhase('question');
                          }}
                        >
                          Q{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewList.length > 0 && (
                <div className="placement-review-list-section">
                  <h4 style={{ color: '#ef4444' }}>🚩 Marked for Review ({reviewList.length})</h4>
                  <div className="placement-review-pills">
                    {reviewList.map((q) => {
                      const idx = questions.findIndex((item) => item.questionId === q.questionId);
                      return (
                        <button
                          key={q.questionId}
                          className="placement-review-pill placement-review-pill--review"
                          onClick={() => {
                            setCurrentIndex(idx);
                            setPhase('question');
                          }}
                        >
                          Q{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="placement-review-modal-actions">
            <button
              className="placement-btn placement-btn--secondary"
              onClick={() => setPhase('question')}
            >
              ← Return to Questions
            </button>
            <button
              className="placement-btn placement-btn--primary"
              onClick={handleFinish}
            >
              Submit Assessment Now ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Assessment Layout (Sticky Sidebar + Question Area) ──────
  if (!currentQuestion) return null;

  const isMcq = currentQuestion.questionType === 'mcq';
  const isReviewed = reviewSet.has(currentQuestion.questionId);

  return (
    <div className="placement-platform">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div className="placement-sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Left Sidebar (25% Sticky / Mobile Drawer) ─────────────── */}
      <aside className={`placement-sidebar ${isSidebarOpen ? 'placement-sidebar--open' : ''}`}>
        <div className="placement-sidebar-header">
          <div className="placement-sidebar-brand">
            <span className="placement-brand-icon">🎓</span>
            <span className="placement-brand-text">Assessment Palette</span>
          </div>
          <button className="placement-sidebar-close" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="placement-sidebar-content">
          <div className="placement-sections-label">SECTIONS & QUESTIONS</div>

          <div className="placement-sections-list">
            {sections.map((sec) => {
              const isExpanded = expandedSections[sec.key];
              return (
                <div key={sec.key} className="placement-section-block">
                  <button
                    className={`placement-section-header ${isExpanded ? 'placement-section-header--expanded' : ''}`}
                    onClick={() => toggleSection(sec.key)}
                  >
                    <span className="placement-section-toggle-icon">
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <span className="placement-section-title">{sec.title}</span>
                    <span className="placement-section-range">
                      ({sec.startNumber} - {sec.endNumber})
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="placement-question-grid">
                      {sec.questions.map((q) => {
                        const status = getQuestionStatus(q, q.originalIndex);
                        return (
                          <button
                            key={q.questionId}
                            onClick={() => handleJumpTo(q.originalIndex)}
                            className={`placement-grid-btn placement-grid-btn--${status}`}
                            title={`Q${q.originalIndex + 1}: ${status.toUpperCase()}`}
                          >
                            {q.originalIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="placement-sidebar-legend">
          <div className="placement-legend-title">LEGEND</div>
          <div className="placement-legend-items">
            <div className="placement-legend-item">
              <span className="placement-legend-dot placement-legend-dot--answered" />
              <span>Answered</span>
            </div>
            <div className="placement-legend-item">
              <span className="placement-legend-dot placement-legend-dot--current" />
              <span>Current</span>
            </div>
            <div className="placement-legend-item">
              <span className="placement-legend-dot placement-legend-dot--unvisited" />
              <span>Not Visited</span>
            </div>
            <div className="placement-legend-item">
              <span className="placement-legend-dot placement-legend-dot--review" />
              <span>Review</span>
            </div>
            <div className="placement-legend-item">
              <span className="placement-legend-dot placement-legend-dot--visited" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Question Area (75%) ──────────────────────────────── */}
      <main className="placement-main">
        {/* Header Bar */}
        <header className="placement-header-bar">
          <div className="placement-header-left">
            <button className="placement-mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
              <span>Questions ({stats.answered}/{stats.total})</span>
            </button>
            <div className="placement-header-title">
              Initial Proficiency Placement
              <span className="placement-header-subtitle"> • {SKILL_LABEL[currentQuestion.skill] || currentQuestion.skill}</span>
            </div>
          </div>

          <div className="placement-header-right">
            {(syncStatus === 'saving' || syncStatus === 'retrying') && (
              <span className="placement-sync-status placement-sync-status--saving" title="Saving background answer">
                <Loader2 className="placement-spin" size={14} /> Saving…
              </span>
            )}
            {syncStatus === 'error' && (
              <span className="placement-sync-status placement-sync-status--error" title="Offline or save error">
                <WifiOff size={14} /> Offline
              </span>
            )}

            <div className={`placement-timer ${timeLeftSeconds < 300 ? 'placement-timer--urgent' : ''}`}>
              <Clock size={16} />
              <span>{formatTimeLeft(timeLeftSeconds)} Left</span>
            </div>
          </div>
        </header>

        {/* Sub-header Counts Bar */}
        <div className="placement-stats-bar">
          <div className="placement-stats-item">
            <span className="placement-stats-label">Answered :</span>
            <span className="placement-stats-value">{stats.answered} / {stats.total}</span>
          </div>
          <div className="placement-stats-item">
            <span className="placement-stats-label">Remaining :</span>
            <span className="placement-stats-value">{stats.remaining}</span>
          </div>
          <div className="placement-stats-item">
            <span className="placement-stats-label">Review :</span>
            <span className="placement-stats-value" style={{ color: stats.reviewed > 0 ? '#ef4444' : 'inherit' }}>
              {stats.reviewed}
            </span>
          </div>
        </div>

        {/* Question Content Container */}
        <div className="placement-question-wrapper">
          <div className="placement-question-card">
            <div className="placement-card-top-meta">
              <span className="placement-question-number-badge">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="placement-section-badge">
                {currentQuestion.sectionTitle || SKILL_LABEL[currentQuestion.skill] || currentQuestion.skill}
              </span>
            </div>

            {/* Reading Passage if available */}
            {currentQuestion.passage && (
              <div className="placement-passage-box">
                <div className="placement-passage-header">READING PASSAGE / CONTEXT</div>
                <div className="placement-passage-content">{currentQuestion.passage}</div>
              </div>
            )}

            <h2 className="placement-question-text">{currentQuestion.questionText}</h2>

            {/* Options or Input based on Question Type */}
            {isMcq ? (
              <div className="placement-options">
                {(currentQuestion.options || []).map((opt, idx) => {
                  const isSelected = selectedAnswer === idx;
                  return (
                    <button
                      key={idx}
                      className={`placement-option ${isSelected ? 'placement-option--selected' : ''}`}
                      onClick={() => handleSelectAnswer(idx)}
                    >
                      <span className="placement-option-letter">{OPTION_LETTERS[idx] || idx + 1}</span>
                      <span className="placement-option-text">{opt}</span>
                      {isSelected && <CheckCircle2 size={18} className="placement-option-check" />}
                    </button>
                  );
                })}
              </div>
            ) : currentQuestion.questionType === 'free_text' || currentQuestion.questionType === 'long_form_writing' ? (
              <div className="placement-text-input-box">
                <textarea
                  className="placement-textarea"
                  rows={6}
                  placeholder="Type your response here clearly..."
                  value={selectedAnswer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
                <div className="placement-input-meta">
                  <span>{(selectedAnswer || '').length} characters</span>
                  <span>Answer will auto-save on blur or change</span>
                </div>
              </div>
            ) : (
              <div className="placement-text-input-box">
                <input
                  type="text"
                  className="placement-textinput"
                  placeholder="Type exact answer here..."
                  value={selectedAnswer || ''}
                  onChange={(e) => handleSelectAnswer(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <footer className="placement-action-bar">
            <div className="placement-action-left">
              <button
                className="placement-btn placement-btn--secondary"
                onClick={handlePrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={18} /> Previous
              </button>

              <button
                className={`placement-btn ${isReviewed ? 'placement-btn--reviewed' : 'placement-btn--outline'}`}
                onClick={handleToggleReview}
              >
                <Flag size={16} fill={isReviewed ? '#ef4444' : 'none'} color={isReviewed ? '#ef4444' : 'currentColor'} />
                <span>{isReviewed ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            <div className="placement-action-right">
              {currentIndex < questions.length - 1 ? (
                <button
                  className="placement-btn placement-btn--primary"
                  onClick={handleNext}
                >
                  Save & Next <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  className="placement-btn placement-btn--finish"
                  onClick={() => setPhase('review_modal')}
                >
                  Review & Submit ✓
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}