import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFromCDN } from '../utils/cdn';
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
  Loader2 
} from 'lucide-react';
import { CompanionEvents, Confetti } from '../components';

export default function Assessment() {
  const [examState, setExamState] = useState('idle'); // 'idle', 'selecting', 'testing', 'submitting', 'result'
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedCategory, setSelectedCategory] = useState('speaking');
  const [completedCategories, setCompletedCategories] = useState([]);
  const countdownRef = useRef(null);

  // Fetch placement metrics and call audit logs using React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['assessmentData'],
    queryFn: () => fetchFromCDN('mock-data/assessment.json'),
  });

  const placement = data?.placement || {
    level: "B2 (Upper Intermediate)",
    score: 76,
    completedPercentage: 75,
    voiceProcessEligible: true
  };

  const pastAssessments = data?.pastAssessments || [
    { id: 1, name: 'Refund Authorization Dispute', grade: 'A-', score: 88, date: 'May 28, 2026', wpm: 124, fluency: 'High' },
    { id: 2, name: 'Broadband Setup Callback', grade: 'B+', score: 81, date: 'May 22, 2026', wpm: 112, fluency: 'Moderate' },
    { id: 3, name: 'Contract Cancellation Retention', grade: 'A', score: 94, date: 'May 14, 2026', wpm: 130, fluency: 'High' }
  ];

  const handleSubmitTest = useCallback(() => {
    const categoriesSequence = ['speaking', 'listening', 'writing', 'mcq'];
    
    setCompletedCategories(prev => {
      const nextCompleted = [...prev, selectedCategory];
      
      // Find the next category in sequence that has not been completed yet
      let nextCategory = null;
      const startIndex = categoriesSequence.indexOf(selectedCategory);
      
      for (let i = 1; i <= 4; i++) {
        const checkIndex = (startIndex + i) % 4;
        const candidate = categoriesSequence[checkIndex];
        if (!nextCompleted.includes(candidate)) {
          nextCategory = candidate;
          break;
        }
      }
      
      if (nextCategory) {
        // Switch to the next category immediately
        setSelectedCategory(nextCategory);
      } else {
        // All categories completed
        setExamState('submitting');
        setTimeout(() => {
          setExamState('result');
          CompanionEvents.emit('ASSESSMENT_SUBMITTED');
        }, 2500);
      }
      
      return nextCompleted;
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (examState === 'testing') {
      setTimeLeft(60);
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [examState, selectedCategory, handleSubmitTest]);

  const handleStartTest = useCallback(() => {
    setExamState('selecting');
  }, []);

  const handleLaunchCategory = useCallback((category) => {
    setSelectedCategory(category);
    setCompletedCategories([]);
    setExamState('testing');
    CompanionEvents.emit('CHALLENGE_STARTED');
  }, []);


  const handleResetTest = useCallback(() => {
    setExamState('idle');
  }, []);

  if (isLoading) {
    return (
      <div className="assessment-container animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: 0.7 }}>
        <div style={{ height: '180px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ height: '240px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 1 }} />
          <div style={{ height: '240px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 1 }} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="assessment-container" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '48px' }} role="img" aria-label="warning">⚠️</span>
          <h3 style={{ margin: '16px 0 8px', color: '#991b1b' }}>Failed to Load Assessment Data</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error?.message || 'A network error occurred while reaching the cache server.'}</p>
          <button onClick={() => refetch()} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  // Ring stroke parameters
  const ringRadius = 50;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const scorePercent = placement.score / 100;

  return (
    <div className="assessment-container animate-fade-in">
      {/* CEFR Placement and Score Gauge */}
      <section className="as-hero">
        <div className="as-hero__text">
          <span className="as-label">Placement Status</span>
          <h2>CEFR Placement Level</h2>
          <p className="as-desc">
            Your conversational fluency, listening accuracy, and pronunciation clarity place you at <strong>{placement.level}</strong>. Score 85+ overall to qualify for C1 training.
          </p>
          <div className="as-status-pills">
            {placement.voiceProcessEligible && (
              <span className="status-pill green"><CheckCircle size={14} /> Voice Process Eligible</span>
            )}
            <span className="status-pill blue"><Award size={14} /> Level Up: {placement.completedPercentage}% Complete</span>
          </div>
        </div>

        {/* Circular SVG Score Chart */}
        <div className="as-hero__chart-container">
          <svg className="score-ring" viewBox="0 0 120 120">
            <circle className="score-ring__bg" cx="60" cy="60" r={ringRadius} />
            <circle 
              className="score-ring__fill" 
              cx="60" 
              cy="60" 
              r={ringRadius} 
              style={{ strokeDasharray: `${ringCircumference}`, strokeDashoffset: `${ringCircumference * (1 - scorePercent)}` }} 
            />
          </svg>
          <div className="chart-center-text">
            <span className="score-val">{placement.score}</span>
            <span className="score-total">/100</span>
          </div>
        </div>
      </section>

      {/* Main Split Layout */}
      <div className="as-split-layout">
        
        {/* Left Card: Timed Test Simulator */}
        <div className="as-exam-card content-card">
          <h3>Oral Placement Assessment</h3>
          
          {(examState === 'idle' || examState === 'result') && (
            <div className="exam-idle animate-fade-in">
              <p className="card-description">
                This is a timed vocal examination to evaluate your response delivery and billing terms vocabulary. Results will be audited for your official training records.
              </p>
              
              <div className="exam-details-box">
                <div className="detail-item">
                  <strong>Duration:</strong> <span>60 Seconds Max</span>
                </div>
                <div className="detail-item">
                  <strong>Focus:</strong> <span>Clarity, Tone, & Billing cycle vocabulary</span>
                </div>
                <div className="detail-item">
                  <strong>Guidelines:</strong> <span>Speak clearly without long pauses.</span>
                </div>
              </div>

              <button className="exam-btn btn--blue" onClick={handleStartTest}>
                <Play size={18} fill="currentColor" /> Start Timed Assessment
              </button>
            </div>
          )}

          {examState === 'selecting' && (
            <div className="exam-selecting animate-fade-in">
              <h4 className="select-prompt-title">Select Assessment Component</h4>
              <p className="card-description">Choose the communication skill component you want to test:</p>
              
              <div className="category-select-grid">
                <button className="category-select-card" onClick={() => handleLaunchCategory('speaking')}>
                  <span className="cat-icon bg-purple-light text-purple">🎙️</span>
                  <div className="cat-meta">
                    <span className="cat-title">Speaking Test</span>
                    <span className="cat-desc">Oral prompt reading & fluency diagnostics</span>
                  </div>
                </button>

                <button className="category-select-card" onClick={() => handleLaunchCategory('listening')}>
                  <span className="cat-icon bg-blue-light text-blue">🎧</span>
                  <div className="cat-meta">
                    <span className="cat-title">Listening Test</span>
                    <span className="cat-desc">Audio playback comprehension questions</span>
                  </div>
                </button>

                <button className="category-select-card" onClick={() => handleLaunchCategory('writing')}>
                  <span className="cat-icon bg-emerald-light text-emerald">✍️</span>
                  <div className="cat-meta">
                    <span className="cat-title">Writing Test</span>
                    <span className="cat-desc">Customer email response drafting</span>
                  </div>
                </button>

                <button className="category-select-card" onClick={() => handleLaunchCategory('mcq')}>
                  <span className="cat-icon bg-amber-light text-amber">🧩</span>
                  <div className="cat-meta">
                    <span className="cat-title">MCQ Test</span>
                    <span className="cat-desc">Core BPO terminology & grammar check</span>
                  </div>
                </button>
              </div>

              <button className="btn--gray-outline" onClick={() => setExamState('idle')} style={{ width: '100%' }}>
                Cancel
              </button>
            </div>
          )}

          {examState === 'testing' && (
            <div className="exam-testing animate-fade-in">
              <div className="exam-header-timer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Timer className="timer-icon" size={20} />
                  <span className="time-display">{timeLeft}s remaining</span>
                </div>
                <span className="active-cat-badge">{selectedCategory}</span>
              </div>

              {selectedCategory === 'speaking' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="exam-prompt-box">
                    <span className="prompt-label">Dialogue Prompt:</span>
                    <p className="prompt-text">
                      "I was promised that my first month charge would be completely waived, but I see a charge of $25 on my credit card! I want this corrected immediately."
                    </p>
                  </div>

                  {/* Pulsing visual recording wave */}
                  <div className="exam-record-wave">
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                    <div className="wave-bar active"></div>
                  </div>
                </div>
              )}

              {selectedCategory === 'listening' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="exam-prompt-box">
                    <span className="prompt-label">Dialogue Transcript:</span>
                    <p className="prompt-text">
                      <em>"My technician appointment was scheduled for today between 2 PM and 5 PM, but he just called saying he is delayed and will reschedule for Thursday morning."</em>
                    </p>
                  </div>

                  <span className="prompt-label">Question: Why is the caller contacting customer service?</span>
                  <div className="listening-options">
                    <label className="listening-option-item">
                      <input type="radio" name="listening-q" defaultChecked />
                      <span>Technician rescheduled appointment window</span>
                    </label>
                    <label className="listening-option-item">
                      <input type="radio" name="listening-q" />
                      <span>Broadband installation completed successfully</span>
                    </label>
                  </div>
                </div>
              )}

              {selectedCategory === 'writing' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="exam-prompt-box">
                    <span className="prompt-label">Writing Prompt:</span>
                    <p className="prompt-text">
                      "Draft a polite, professional reply email acknowledging a customer refund dispute. Assure them it takes 48 hours to process."
                    </p>
                  </div>

                  <textarea 
                    className="writing-textarea"
                    placeholder="Type your customer email draft here..."
                    rows={4}
                    style={{ width: '100%', padding: '12px', border: '1.5px solid var(--gray-200)', borderRadius: '10px', outline: 'none', fontFamily: 'inherit', resize: 'none', marginBottom: '16px' }}
                  />
                </div>
              )}

              {selectedCategory === 'mcq' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <div className="exam-prompt-box">
                    <span className="prompt-label">Grammar Question:</span>
                    <p className="prompt-text">
                      Choose the sentence that complies with professional customer service guidelines:
                    </p>
                  </div>

                  <div className="listening-options">
                    <label className="listening-option-item">
                      <input type="radio" name="mcq-q" />
                      <span>"If I would have known, I will call you earlier."</span>
                    </label>
                    <label className="listening-option-item">
                      <input type="radio" name="mcq-q" defaultChecked />
                      <span>"If I had known, I would have called you earlier."</span>
                    </label>
                    <label className="listening-option-item">
                      <input type="radio" name="mcq-q" />
                      <span>"If I knew, I should have call you earlier."</span>
                    </label>
                  </div>
                </div>
              )}

              <button className="exam-btn btn--emerald" onClick={handleSubmitTest} style={{ marginTop: '16px' }}>
                Submit Test Answers
              </button>
            </div>
          )}

          {examState === 'submitting' && (
            <div className="exam-submitting">
              <Loader2 className="spinner-icon" size={40} />
              <h4>Analyzing Speech Diagnostics...</h4>
              <p>Evaluating pronunciation accuracy, sentence syntax, and vocabulary markers. Please stand by.</p>
            </div>
          )}
        </div>

        {/* Right Card: Assessment Audit Log */}
        <div className="as-history-card content-card">
          <div className="history-header">
            <History size={20} className="history-icon" />
            <h3>Call Audit History</h3>
          </div>
          <p className="card-description">Previous simulation audits conducted by your training coach.</p>

          <div className="history-list">
            {pastAssessments.map(item => (
              <div key={item.id} className="history-item">
                <div className="history-item-top">
                  <span className="hist-name">{item.name}</span>
                  <span className="hist-grade">{item.grade}</span>
                </div>
                <div className="history-item-meta">
                  <span>{item.date}</span>
                  <span>•</span>
                  <span>{item.wpm} WPM</span>
                  <span>•</span>
                  <span className="hist-fluency">{item.fluency} Fluency</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CodeChef Style Fullscreen Assessment Success Overlay */}
      {examState === 'result' && (
        <>
          <Confetti />
          <div className="fullscreen-overlay animate-fade-in">
            <div className="overlay-card animate-scale-up">
              <div className="overlay-celebration-graphic">
                <Award size={40} className="reward-icon-large" />
              </div>
              <h2>Assessment Submitted!</h2>
              <p className="overlay-desc">Your oral communication placement exam has been audited and graded by our system.</p>
              
              <div className="overlay-stats">
                <div className="overlay-stat">
                  <span className="overlay-stat-val">82%</span>
                  <span className="overlay-stat-label">Pronunciation</span>
                </div>
                <div className="overlay-stat">
                  <span className="overlay-stat-val">B2+</span>
                  <span className="overlay-stat-label">CEFR Grade</span>
                </div>
                <div className="overlay-stat">
                  <span className="overlay-stat-val">+15</span>
                  <span className="overlay-stat-label">XP Earned</span>
                </div>
              </div>

              <button className="overlay-btn-continue" onClick={handleResetTest}>
                Awesome, Continue!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
