import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { padding: '24px 32px', fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif", background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', minHeight: '100vh' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' },
  sub: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: 500 },
  card: { background: '#ffffff', borderRadius: 20, padding: 24, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.02)', border: '1px solid rgba(226, 232, 240, 0.6)', marginBottom: 24 },
  heroCard: { background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)', borderRadius: 24, padding: '32px 40px', color: '#fff', marginBottom: 32, boxShadow: '0 20px 40px rgba(49, 46, 129, 0.15)', display: 'flex', alignItems: 'center', gap: 24 },
  btn: (c, outline) => ({
    background: outline ? 'transparent' : c,
    color: outline ? c : '#fff',
    border: `2px solid ${c}`,
    borderRadius: 14, padding: '12px 24px',
    fontSize: 14, fontWeight: 700, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: outline ? 'none' : `0 4px 14px ${c}40`,
  }),
  badge: (c) => ({ background: c + '15', color: c, fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 20, border: `1px solid ${c}25`, display: 'inline-block' }),
  option: (state) => ({
    padding: '16px 20px', borderRadius: 16, cursor: state === 'done' ? 'default' : 'pointer',
    border: state === 'correct' ? '2px solid #10b981'
      : state === 'wrong' ? '2px solid #ef4444'
        : state === 'selected' ? '2px solid #6366f1'
          : '2px solid #e2e8f0',
    background: state === 'correct' ? '#f0fdf4'
      : state === 'wrong' ? '#fef2f2'
        : state === 'selected' ? '#e0e7ff'
          : '#f8fafc',
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box'
  }),
  optLetter: { width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#475569', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  progressBar: { height: 8, background: '#e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 32 },
  progressFill: (p) => ({ height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', width: `${p}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: 12 }),
  spinner: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0', flexDirection: 'column', gap: 20, color: '#6366f1' },
  result: (pass) => ({ background: pass ? 'linear-gradient(135deg, #064e3b, #059669)' : 'linear-gradient(135deg, #7f1d1d, #dc2626)', borderRadius: 24, padding: '48px', color: '#fff', textAlign: 'center', marginBottom: 24, boxShadow: pass ? '0 20px 40px rgba(5, 150, 105, 0.2)' : '0 20px 40px rgba(220, 38, 38, 0.2)' }),
};

const LABELS = ['A', 'B', 'C', 'D'];

function Spinner({ text }) {
  return (
    <div style={S.spinner}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>{text}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── STATUS SCREEN ─────────────────────────────────────────────────────────────
function StatusScreen({ status, onStart, onRefresh }) {
  const { hasModulesStudied, studiedModules, hasAttemptedThisWeek, lastScore, testAvailable, message, topicsForTest } = status;

  return (
    <div>
      {/* Hero card */}
      <div style={S.heroCard}>
        <div style={{ fontSize: 64 }}>📅</div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>Weekly Assessment</div>
          <div style={{ fontSize: 15, color: '#c7d2fe', lineHeight: 1.6, maxWidth: 600 }}>
            Your personalized weekly test — based on what you studied this week.
            Every user gets a different test depending on your recent learning activity.
          </div>
        </div>
      </div>

      <div style={S.card}>
        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, padding: '24px', background: testAvailable && !hasAttemptedThisWeek ? '#f0fdf4' : '#f8fafc', borderRadius: 16, border: `1px solid ${testAvailable && !hasAttemptedThisWeek ? '#86efac' : '#e2e8f0'}` }}>
          <div style={{ fontSize: 32, background: '#fff', padding: 16, borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            {!hasModulesStudied ? '📚' : hasAttemptedThisWeek ? '✅' : status.isSunday ? '🎯' : '🔒'}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 18 }}>
              {!hasModulesStudied ? 'No Modules Studied Yet'
                : hasAttemptedThisWeek ? 'Weekly Test Completed'
                  : status.isSunday ? 'Your Weekly Test is Ready!'
                  : 'Locked Until Sunday'}
            </div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 6 }}>{message}</div>
          </div>
        </div>

        {/* Modules studied this week */}
        {studiedModules?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Modules studied this week
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {studiedModules.map((m, i) => {
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
                const c = colors[i % colors.length];
                return (
                  <span key={i} style={{ ...S.badge(c), fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.9 }}>MODULE {i + 1}</span>
                    {m}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Topics covered */}
        {topicsForTest?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Test will cover
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 16 }}>
              {topicsForTest.map((t, i) => {
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
                const c = colors[i % colors.length];
                return (
                  <div key={i} style={{ padding: '16px 20px', background: '#fff', borderRadius: 16, border: `1px solid ${c}30`, borderLeft: `4px solid ${c}`, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{t.category.toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{t.level} Level · {t.moduleId}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Last score if already attempted */}
        {hasAttemptedThisWeek && lastScore !== null && (
          <div style={{ padding: '24px', background: lastScore >= 70 ? '#f0fdf4' : '#fef9c3', borderRadius: 16, border: `1px solid ${lastScore >= 70 ? '#86efac' : '#fde68a'}`, marginBottom: 32 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>Your score this week:</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: lastScore >= 70 ? '#059669' : '#d97706', marginTop: 8, letterSpacing: '-1px' }}>{lastScore}%</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: 500 }}>
              {lastScore >= 70 ? '🎉 Great work! You passed this week\'s assessment.' : '💪 Keep practicing. You\'ll do better next week!'}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          {testAvailable && !hasAttemptedThisWeek && (
            <button style={{ ...S.btn('#6366f1'), padding: '16px 36px', fontSize: 16 }} onClick={onStart}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99, 102, 241, 0.4)'; }}
            >
              🚀 Start Weekly Test
            </button>
          )}
          {!hasModulesStudied && (
            <div style={{ fontSize: 14, color: '#64748b', padding: '12px 0' }}>
              Complete lessons in the <strong>Learning Modules</strong> section first to unlock your weekly test.
            </div>
          )}
          {hasModulesStudied && !status.isSunday && (
            <div style={{ fontSize: 14, color: '#f59e0b', padding: '12px 0', fontWeight: 'bold' }}>
              Test is currently locked. Please come back on Sunday!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TEST SCREEN ───────────────────────────────────────────────────────────────
function TestScreen({ test, onComplete, user }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});   // { questionId: selectedIndex }
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showOverview, setShowOverview] = useState(false);

  const questions = test.questions || [];
  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const progress = Math.round(((currentIdx + (submitted ? 1 : 0)) / totalQ) * 100);
  const isSpeaking = currentQ?.category === 'speaking';
  const isPartB = isSpeaking && !currentQ?.options?.length; // No options = Part B
  const selectedAns = answers[currentQ?.id];
  const isAnswered = selectedAns !== undefined;

  // TTS State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluations, setEvaluations] = useState({});

  // Mic State
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Cleanup TTS/Mic on unmount or question change
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [currentIdx]);

  const handlePlayAudio = () => {
    if (!currentQ?.questionText) return;

    // Extract what to say. E.g., from: 🎧 Audio:\nAjay says: "Hello"\nWhat did he say?
    // We try to grab just the quoted text or the whole text if no quotes.
    const match = currentQ.questionText.match(/"([^"]+)"/);
    const textToSpeak = match ? match[1] : currentQ.questionText.replace('🎧 Audio:\n', '');

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-IN'; // Or standard en-US

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStartMic = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition. Please use Chrome.');
      handleSelect(80); // Fallback to just pass
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 14) {
            recognition.stop();
            return 15;
          }
          return s + 1;
        });
      }, 1000);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('User said:', transcript);
      setIsRecording(false);
      setIsEvaluating(true);

      try {
        const res = await api.post('/weekly/evaluate-speech', {
          transcript,
          instruction: currentQ.questionText
        });
        
        if (res.data.evaluation) {
          setEvaluations(prev => ({ ...prev, [currentQ.id]: res.data.evaluation }));
        }

        if (res.data.correct) {
          handleSelect(80); // Correct
        } else {
          handleSelect(81); // Incorrect
        }
      } catch (err) {
        console.error('Speech eval error:', err);
        handleSelect(80); // Fallback to pass
      } finally {
        setIsEvaluating(false);
      }
    };

    recognition.onerror = (e) => {
      console.error('Speech recognition error', e);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      // Auto-pass on error for dummy UI
      handleSelect(80);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSelect = (idx) => {
    setAnswers(prev => ({ ...prev, [currentQ.id]: idx }));
  };

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx(i => i + 1);
      setSubmitted(false);
    }
  };

  const handleSubmitQuestion = () => {
    setSubmitted(true);
  };

  const handleFinish = async () => {
    setSubmitting(true);
    
    let partACorrect = 0;
    let partATotal = 0;
    let partBScoreSum = 0;
    let partBTotal = 0;

    for (const q of questions) {
      if (q.options && q.options.length > 0) {
        partATotal++;
        if (answers[q.id] !== undefined && answers[q.id] === q.correctOptionIndex) {
          partACorrect++;
        }
      } else {
        partBTotal++;
        if (evaluations[q.id]) {
          partBScoreSum += evaluations[q.id].overallScore;
        }
      }
    }

    const partAScore = partATotal > 0 ? Math.round((partACorrect / partATotal) * 100) : 0;
    const partBScore = partBTotal > 0 ? Math.round(partBScoreSum / partBTotal) : 0;
    
    let pct = 0;
    if (partATotal > 0 && partBTotal > 0) {
      pct = Math.round((partAScore + partBScore) / 2);
    } else if (partATotal > 0) {
      pct = partAScore;
    } else if (partBTotal > 0) {
      pct = partBScore;
    }
    const passed = pct >= 70;

    try {
      // Submit score to backend
      if (test.modulesCovered) {
        await api.post('/weekly/submit', {
          userId: user?.id,
          username: user?.username || user?.email,
          modulesCovered: test.modulesCovered,
          lessonsCovered: test.lessonsCovered || [],
          score: pct
        });
      }
    } catch (e) {
      console.error('Failed to submit assessment:', e);
      alert('Failed to save score to server, but showing your results anyway.');
    } finally {
      setResult({
        score: Math.round((pct / 100) * totalQ),
        totalQ,
        passed,
        percentage: pct,
      });
      setSubmitting(false);
    }
  };

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const pct = result.percentage ?? Math.round((result.score / (result.totalQ || totalQ)) * 100);
    const pass = result.passed ?? pct >= 70;
    return (
      <div>
        <div style={S.result(pass)}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{pass ? '🏆' : '💪'}</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{pct}%</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{pass ? 'Excellent Work!' : 'Keep Practicing!'}</div>
          <div style={{ fontSize: 14, color: pass ? '#a7f3d0' : '#fca5a5', lineHeight: 1.6 }}>
            {pass
              ? 'You passed this week\'s assessment! Your progress has been saved.'
              : 'Don\'t worry — review your modules and try again next week!'}
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Result Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Score', val: `${pct}/100`, color: '#6366f1' },
              { label: 'Accuracy', val: `${pct}%`, color: pass ? '#10b981' : '#f59e0b' },
              { label: 'Status', val: pass ? 'PASSED' : 'NEEDS WORK', color: pass ? '#10b981' : '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={S.btn('#6366f1')} onClick={onComplete}>
              Back to Weekly Tests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Overview screen ─────────────────────────────────────────────────────────
  if (showOverview) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Review Assessment</h2>
            <p style={{ fontSize: 15, color: '#64748b', marginTop: 8, fontWeight: 500 }}>Check which questions you've answered before submitting.</p>
          </div>
          <div style={{ display: 'flex', gap: 16, background: '#fff', padding: '12px 20px', borderRadius: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1' }}></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Done</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f8fafc', border: '2px solid #e2e8f0', boxSizing: 'border-box' }}></div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Not Attempted</span>
            </div>
          </div>
        </div>
        <div style={{ ...S.card, padding: 40 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
            {questions.map((q, i) => {
              const answered = answers[q.id] !== undefined;
              return (
                <div key={i}
                  onClick={() => { setCurrentIdx(i); setShowOverview(false); }}
                  style={{
                    width: 52, height: 52,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: answered ? '#6366f1' : '#f8fafc', borderRadius: 16,
                    border: answered ? 'none' : `2px solid #e2e8f0`,
                    color: answered ? '#fff' : '#475569',
                    fontWeight: 800, fontSize: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: answered ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; if (!answered) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; if (!answered) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', marginTop: 32 }}>
          <button style={S.btn('#94a3b8', true)} onClick={() => setShowOverview(false)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            ← Back to Questions
          </button>
          <button style={S.btn('#f59e0b')} onClick={handleFinish} disabled={submitting}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 158, 11, 0.4)'; }}
          >
            {submitting ? 'Submitting...' : '🏁 Submit Test'}
          </button>
        </div>
      </div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────
  const isLastQ = currentIdx === totalQ - 1;
  const allDone = Object.keys(answers).length === totalQ;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Question {currentIdx + 1} <span style={{ color: '#94a3b8', fontWeight: 500 }}>of {totalQ}</span>
        </div>
      </div>

      {/* Progress */}
      <div style={S.progressBar}>
        <div style={S.progressFill(progress)} />
      </div>

      {/* Question card */}
      <div style={{ ...S.card, minHeight: 460, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', lineHeight: 1.6, marginBottom: 24 }}>
          {isPartB && <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Speak your answer clearly:</span>}
          {currentQ?.questionText?.includes('🎧 Audio:') && (
            <button
              onClick={handlePlayAudio}
              style={{
                ...S.btn(isPlayingAudio ? '#10b981' : '#6366f1'),
                padding: '14px 24px',
                fontSize: 15,
                marginBottom: 24,
                boxShadow: isPlayingAudio ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.3)',
                transform: isPlayingAudio ? 'scale(0.97)' : 'scale(1)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                width: '100%',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => { if (!isPlayingAudio) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = isPlayingAudio ? 'scale(0.97)' : 'scale(1)'; }}
            >
              <span style={{ fontSize: 20 }}>{isPlayingAudio ? '🔊' : '▶️'}</span>
              {isPlayingAudio ? 'Playing Audio...' : 'Play Audio to Answer'}
            </button>
          )}
          <div style={{ whiteSpace: 'pre-line', fontSize: 18, color: '#0f172a' }}>
            {currentQ?.questionText?.includes('🎧 Audio:')
              ? currentQ.questionText.split('\n').pop()
              : currentQ?.questionText}
          </div>
        </div>

        {/* Options */}
        {currentQ?.options?.map((opt, i) => {
          let state = 'idle';
          if (submitted) {
            state = 'done';
          } else if (selectedAns === i) {
            state = 'selected';
          }
          return (
            <div key={i} style={S.option(state)} onClick={() => handleSelect(i)}>
              <div style={S.optLetter}>{LABELS[i]}</div>
              <span style={{ fontSize: 14, color: '#334155', flex: 1 }}>{opt}</span>
              {submitted && selectedAns === i && <span>✓</span>}
            </div>
          );
        })}

        {/* Speaking — mark as read option (Mic) */}
        {isPartB && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            {isEvaluating ? (
              <div style={{ padding: '16px', background: '#e0e7ff', borderRadius: '12px', border: '2px solid #6366f1', color: '#4338ca', fontWeight: 'bold' }}>
                <Spinner text="Evaluating pronunciation..." />
              </div>
            ) : isAnswered ? (
              <div style={{ padding: '16px', background: selectedAns === 80 ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', border: selectedAns === 80 ? '2px solid #10b981' : '2px solid #ef4444', color: selectedAns === 80 ? '#065f46' : '#991b1b', fontWeight: 'bold' }}>
                {selectedAns === 80 ? '✅ Excellent pronunciation!' : '❌ Not quite right. (Voice recorded)'}
              </div>
            ) : (
              <div>
                <button
                  style={{
                    ...S.btn(isRecording ? '#ef4444' : '#6366f1'),
                    width: '100%',
                    justifyContent: 'center',
                    padding: '16px',
                    fontSize: 16,
                    animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                  }}
                  onClick={handleStartMic}
                >
                  {isRecording ? '🛑 Stop Recording...' : '🎤 Click to Speak'}
                </button>
                {isRecording && (
                  <p style={{ margin: '12px 0 0', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
                    0:{seconds < 10 ? `0${seconds}` : seconds} / 0:15
                  </p>
                )}
              </div>
            )}
            <style>{`
              @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
              }
            `}</style>
          </div>
        )}

        {/* Explanation after submission */}
        {submitted && currentQ?.explanation && (
          <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac', marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>💡 Tip</div>
            <div style={{ fontSize: 13, color: '#14532d', marginTop: 4 }}>{currentQ.explanation}</div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', marginTop: 32 }}>
        <button
          style={{ ...S.btn('#cbd5e1', false), color: '#475569', background: '#f1f5f9', boxShadow: 'none', border: 'none' }}
          onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setSubmitted(false); }}
          disabled={currentIdx === 0}
          onMouseEnter={(e) => { if (currentIdx > 0) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
        >
          ← Previous
        </button>

        <div style={{ display: 'flex', gap: 16 }}>
          {!isLastQ ? (
            <button style={S.btn('#10b981')} onClick={handleNext}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.4)'; }}
            >
              Next Question →
            </button>
          ) : (
            <button style={S.btn('#3b82f6')} onClick={() => setShowOverview(true)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4)'; }}
            >
              Review Assessment →
            </button>
          )}
        </div>
      </div>

      {/* Question Number Navigation */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap', maxWidth: 700, margin: '40px auto 0' }}>
        {questions.map((_, i) => {
          const isCurrent = i === currentIdx;
          const isAnswered = answers[questions[i]?.id] !== undefined;
          return (
            <div
              key={i}
              onClick={() => { setCurrentIdx(i); setSubmitted(false); }}
              style={{
                width: 36, height: 36,
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                borderRadius: 10,
                fontSize: 14, fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isCurrent ? '#6366f1' : isAnswered ? '#e0e7ff' : '#f8fafc',
                color: isCurrent ? '#fff' : isAnswered ? '#4338ca' : '#64748b',
                boxShadow: isCurrent ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                border: `1px solid ${isCurrent ? '#6366f1' : isAnswered ? '#c7d2fe' : '#e2e8f0'}`
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function WeeklyAssessment({ user, onNavigate }) {
  const [status, setStatus] = useState(null);
  const [test, setTest] = useState(null);
  const [screen, setScreen] = useState('status'); // 'status' | 'test'
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const loadStatus = async () => {
    setLoading(true); setError(null);
    try {
      if (!user?.id) return;
      const res = await api.get(`/weekly/generate/${user.id}`);
      const data = res.data;
      
      const hasModules = data.modulesCovered && data.modulesCovered.length > 0;

      const moduleNamesMap = {
        'sp-1': 'Speaking & Listening Foundations',
        'sp-2': 'BPO Call Speaking',
        'sp-3': 'Fluency & Confidence',
        'sp-4': 'Advanced Communication',
        'wr-1': 'Grammar Foundations',
        'wr-2': 'Professional Emails',
        'wr-3': 'Handling Complaints',
        'wr-4': 'Advanced Business Writing'
      };

      const levelMap = { '1': 'BEGINNER', '2': 'INTERMEDIATE', '3': 'INTERMEDIATE', '4': 'ADVANCED' };

      // Extract unique parent modules (e.g., 'sp-1' from 'sp-1-1')
      const uniqueParents = [...new Set((data.modulesCovered || []).map(id => {
        const parts = id.split('-');
        return `${parts[0]}-${parts[1]}`;
      }))];

      const studiedModules = uniqueParents.map(id => moduleNamesMap[id] || id);
      const topicsForTest = uniqueParents.map(id => ({
        category: id.startsWith('wr') ? 'writing' : 'speaking',
        level: levelMap[id.split('-')[1]] || 'BEGINNER',
        moduleId: moduleNamesMap[id] || id
      }));

      const isSunday = new Date().getDay() === 0;
      let testAvailable = hasModules && isSunday;
      let message = "Complete some modules to unlock your weekly test.";
      if (hasModules) {
        if (isSunday) {
          message = "We've prepared questions based on your practice this week.";
        } else {
          message = "Your test is prepared! It will unlock this Sunday.";
        }
      }

      setStatus({
        hasModulesStudied: hasModules,
        studiedModules: studiedModules,
        hasAttemptedThisWeek: false,
        lastScore: null,
        testAvailable: testAvailable,
        message: message,
        topicsForTest: topicsForTest,
        isSunday: isSunday
      });
      setLoading(false);
    } catch (e) {
      console.error('Failed to load status:', e);
      setError('Failed to load weekly status');
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, [user?.id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const res = await api.get(`/weekly/generate/${user.id}`);
      const data = res.data;
      
      if (!data.questions || data.questions.length === 0) {
        setError('No questions found for this week. Try completing some modules first!');
        setStarting(false);
        return;
      }
      
      const combinedQuestions = data.questions.map((q, idx) => {
        let options = q.options || [];
        if (!options.length && q.optionA) {
          options = [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);
        }
        
        let correctOptionIndex = q.correctOptionIndex !== undefined ? q.correctOptionIndex : q.correctOptionIdx;
        if (correctOptionIndex === undefined && q.correctOption) {
          const map = { A: 0, B: 1, C: 2, D: 3 };
          correctOptionIndex = map[q.correctOption];
        }

        let category = q.category || 'speaking';
        if (q.moduleId?.startsWith('wr')) {
          category = 'writing';
        } else if (q.moduleId?.startsWith('sp')) {
          category = 'speaking';
        }

        return {
          id: q.id || `wk-q-${idx}`,
          questionText: q.questionText || q.question, // Fallback for various models
          options: options,
          correctOptionIndex: correctOptionIndex,
          category: category,
          level: q.level || 'BEGINNER',
          explanation: q.explanation || 'Review the module for more details.',
          part: q.part // Might be useful
        };
      });

      setTest({
        instructions: data.instructions || "Weekly Assessment",
        questions: combinedQuestions,
        modulesCovered: data.modulesCovered || [],
        lessonsCovered: data.lessonsCovered || []
      });
      setScreen('test');
    } catch (e) {
      console.error('Failed to generate weekly assessment from server:', e);
      setError('Failed to generate test from server');
    } finally { setStarting(false); }
  };

  const handleComplete = () => {
    setScreen('status');
    setTest(null);
    loadStatus();
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={S.header}>
          <h1 style={S.title}>Weekly Assessment 📅</h1>
          <p style={S.sub}>
            {screen === 'test'
              ? `Question-based test covering your modules this week`
              : 'Your personalized weekly test based on what you studied this week'}
          </p>
        </div>

        {loading || starting ? (
          <Spinner text={starting ? 'Generating your test...' : 'Loading weekly status...'} />
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 16, padding: 24, color: '#991b1b', fontSize: 15, fontWeight: 500 }}>
            ⚠️ {error}
            <button onClick={loadStatus} style={{ marginLeft: 16, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}>Retry</button>
          </div>
        ) : screen === 'status' ? (
          <StatusScreen status={status} onStart={handleStart} onRefresh={loadStatus} />
        ) : (
          <TestScreen test={test} onComplete={handleComplete} user={user} />
        )}
      </div>
    </div>
  );
}