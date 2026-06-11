import { useState } from 'react';
import './Practice.css';
import { 
  Award, 
  Clock, 
  Sparkles, 
  X, 
  Check, 
  ArrowRight,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

export default function Practice() {
  const [drillCompleted, setDrillCompleted] = useState({
    pronunciation: false,
    grammar: false,
    fluency: false
  });

  const handleStartDrill = (drillKey) => {
    alert(`Starting your practice drill: ${drillKey.toUpperCase()}! Preparing personalized voice/interactive session...`);
    setDrillCompleted(prev => ({ ...prev, [drillKey]: true }));
  };

  return (
    <div className="practice-container animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header className="practice-header">
        <div className="practice-header-text">
          <h2 className="practice-title">Your Personalized Improvement Plan</h2>
          <p className="practice-subtitle">Based on your assessment performance</p>
        </div>
        <div className="practice-header-illustration">
          <div className="clipboard-icon-box">
            <ClipboardList size={32} className="text-blue-600" />
            <span className="badge-pencil">✏️</span>
          </div>
        </div>
      </header>

      {/* ── Priority Improvement Cards Stack ────────────────────────────── */}
      <div className="priority-cards-stack">
        
        {/* Priority 1 Card: Pronunciation */}
        <section className="priority-card border-red">
          <div className="priority-card-header">
            <span className="priority-badge bg-red-light text-red-dark">Priority #1</span>
            <div className="priority-title-row">
              <h3>Pronunciation</h3>
              <span className="priority-level-tag bg-red text-white">High Priority</span>
            </div>
          </div>

          <div className="priority-card-body">
            <div className="issue-section">
              <span className="section-label">Issue Identified</span>
              <ul className="issue-list">
                <li>
                  <X size={16} className="icon-x" />
                  <span><strong>Three</strong> <span className="arrow-sym">→</span> Tree</span>
                </li>
                <li>
                  <X size={16} className="icon-x" />
                  <span><strong>Think</strong> <span className="arrow-sym">→</span> Tink</span>
                </li>
              </ul>
            </div>

            <div className="impact-section">
              <span className="section-label">Impact</span>
              <p className="impact-desc">Affects clarity and customer understanding</p>
            </div>

            <div className="practice-assigned-section">
              <span className="section-label">Practice Assigned</span>
              <div className="assigned-meta">
                <Clock size={16} className="icon-clock-gray" />
                <span>10 mins daily | 7 days a week</span>
              </div>
            </div>
          </div>

          <div className="priority-card-footer">
            <button 
              className={`drill-btn btn-red ${drillCompleted.pronunciation ? 'completed' : ''}`}
              onClick={() => handleStartDrill('pronunciation')}
            >
              <span>{drillCompleted.pronunciation ? 'Practice Completed Today' : 'Start Pronunciation Drill'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Priority 2 Card: Grammar */}
        <section className="priority-card border-orange">
          <div className="priority-card-header">
            <span className="priority-badge bg-orange-light text-orange-dark">Priority #2</span>
            <div className="priority-title-row">
              <h3>Grammar</h3>
              <span className="priority-level-tag bg-orange text-white">Medium Priority</span>
            </div>
          </div>

          <div className="priority-card-body">
            <div className="issue-section">
              <span className="section-label">Issue Identified</span>
              <ul className="issue-list">
                <li>
                  <X size={16} className="icon-x" />
                  <span className="crossed-out">I have went</span>
                </li>
                <li>
                  <Check size={16} className="icon-check-green" />
                  <span className="corrected">I have gone</span>
                </li>
              </ul>
            </div>

            <div className="impact-section">
              <span className="section-label">Impact</span>
              <p className="impact-desc">Affects professionalism and customer trust</p>
            </div>

            <div className="practice-assigned-section">
              <span className="section-label">Practice Assigned</span>
              <div className="assigned-meta">
                <Clock size={16} className="icon-clock-gray" />
                <span>5 exercises daily | 6 days a week</span>
              </div>
            </div>
          </div>

          <div className="priority-card-footer">
            <button 
              className={`drill-btn btn-orange ${drillCompleted.grammar ? 'completed' : ''}`}
              onClick={() => handleStartDrill('grammar')}
            >
              <span>{drillCompleted.grammar ? 'Practice Completed Today' : 'Start Grammar Practice'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* Priority 3 Card: Fluency */}
        <section className="priority-card border-orange">
          <div className="priority-card-header">
            <span className="priority-badge bg-orange-light text-orange-dark">Priority #3</span>
            <div className="priority-title-row">
              <h3>Fluency</h3>
              <span className="priority-level-tag bg-orange text-white">Medium Priority</span>
            </div>
          </div>

          <div className="priority-card-body">
            <div className="issue-section">
              <span className="section-label">Issue Identified</span>
              <p className="issue-paragraph">
                Long pauses when explaining technical issues
              </p>
            </div>

            <div className="impact-section">
              <span className="section-label">Impact</span>
              <p className="impact-desc">Conversation flow gets affected</p>
            </div>

            <div className="practice-assigned-section">
              <span className="section-label">Practice Assigned</span>
              <div className="assigned-meta">
                <Clock size={16} className="icon-clock-gray" />
                <span>8 mins daily | 5 days a week</span>
              </div>
            </div>
          </div>

          <div className="priority-card-footer">
            <button 
              className={`drill-btn btn-orange ${drillCompleted.fluency ? 'completed' : ''}`}
              onClick={() => handleStartDrill('fluency')}
            >
              <span>{drillCompleted.fluency ? 'Practice Completed Today' : 'Start Fluency Practice'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

      </div>

      {/* ── Bottom Link ─────────────────────────────────────────────────── */}
      <footer className="practice-footer">
        <button className="view-all-btn">
          View All Improvement Areas <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
