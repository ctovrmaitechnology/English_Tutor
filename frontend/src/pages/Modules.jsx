import { useState } from 'react';
import { Lock, CheckCircle, PlayCircle, ArrowLeft } from 'lucide-react';
import './Modules.css';

// ── Categories ────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'speaking',
    emoji: '🎙️',
    label: 'Speaking',
    color: '#6366f1',
    bg: '#ede9fe',
    tag: 'Speaking',
    desc: 'Master spoken English — pronunciation, fluency and professional BPO communication',
    subText: 'Pronunciation • BPO Calls • Fluency • Advanced Communication',
  },
  {
    id: 'writing',
    emoji: '✍️',
    label: 'Writing',
    color: '#3b82f6',
    bg: '#eff6ff',
    tag: 'Writing',
    desc: 'Master written English — grammar, professional emails and business writing',
    subText: 'Grammar • Professional Emails • Complaints • Business Writing',
  },
];

// ── Speaking Modules ──────────────────────────────────────────
const SPEAKING_MODULES = [
  {
    id: 'sp-1', number: 1,
    title: 'Pronunciation Basics',
    description: 'Master the fundamental sounds of English — vowels, consonants and word stress.',
    emoji: '🔤', color: '#6366f1', bg: '#ede9fe',
    duration: '2 hours', tag: 'Beginner',
    subText: 'Vowel Sounds • Consonant Sounds • Word Stress • Intonation',
    subModules: [
      { id: 'sp-1-1', title: 'Vowel Sounds',        duration: '25 min', icon: '🅰️' },
      { id: 'sp-1-2', title: 'Consonant Sounds',    duration: '25 min', icon: '🔡' },
      { id: 'sp-1-3', title: 'Word Stress',          duration: '30 min', icon: '📢' },
      { id: 'sp-1-4', title: 'Sentence Intonation',  duration: '40 min', icon: '〰️' },
    ],
  },
  {
    id: 'sp-2', number: 2,
    title: 'BPO Call Speaking',
    description: 'Professional telephone English — how to open, handle and close customer calls.',
    emoji: '📞', color: '#10b981', bg: '#d1fae5',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Call Opening • Active Listening • Handling Objections • Call Closing',
    subModules: [
      { id: 'sp-2-1', title: 'Call Opening Phrases',   duration: '30 min', icon: '👋' },
      { id: 'sp-2-2', title: 'Active Listening',        duration: '35 min', icon: '👂' },
      { id: 'sp-2-3', title: 'Handling Objections',     duration: '40 min', icon: '🤝' },
      { id: 'sp-2-4', title: 'Call Closing Techniques', duration: '35 min', icon: '✅' },
    ],
  },
  {
    id: 'sp-3', number: 3,
    title: 'Fluency & Confidence',
    description: 'Speak naturally and confidently without filler words or hesitation.',
    emoji: '🎙️', color: '#f59e0b', bg: '#fef3c7',
    duration: '3 hours', tag: 'Intermediate',
    subText: 'Natural Rhythm • No Filler Words • Speed & Clarity • Accent Tips',
    subModules: [
      { id: 'sp-3-1', title: 'Natural Speech Rhythm',    duration: '40 min', icon: '🎵' },
      { id: 'sp-3-2', title: 'Eliminating Filler Words', duration: '45 min', icon: '🚫' },
      { id: 'sp-3-3', title: 'Speed & Clarity',          duration: '45 min', icon: '⚡' },
      { id: 'sp-3-4', title: 'Accent Neutralization',    duration: '50 min', icon: '🌍' },
    ],
  },
  {
    id: 'sp-4', number: 4,
    title: 'Advanced Communication',
    description: 'Persuasion, negotiation and handling escalations like a professional.',
    emoji: '🏆', color: '#ec4899', bg: '#fdf2f8',
    duration: '3 hours', tag: 'Advanced',
    subText: 'Persuasion • Negotiation • Escalation Handling • Empathy',
    subModules: [
      { id: 'sp-4-1', title: 'Persuasive Language',         duration: '45 min', icon: '💡' },
      { id: 'sp-4-2', title: 'Negotiation Phrases',         duration: '45 min', icon: '🤜' },
      { id: 'sp-4-3', title: 'Escalation Handling',         duration: '45 min', icon: '🔥' },
      { id: 'sp-4-4', title: 'Empathy in Customer Service', duration: '45 min', icon: '💙' },
    ],
  },
];

// ── Writing Modules ───────────────────────────────────────────
const WRITING_MODULES = [
  {
    id: 'wr-1', number: 1,
    title: 'Grammar Foundations',
    description: 'Build a strong base with tenses, sentence structure and punctuation.',
    emoji: '📝', color: '#3b82f6', bg: '#eff6ff',
    duration: '2 hours', tag: 'Beginner',
    subText: 'Tenses • Sentence Structure • Punctuation • Common Errors',
    subModules: [
      { id: 'wr-1-1', title: 'Tenses & Their Usage',  duration: '35 min', icon: '⏰' },
      { id: 'wr-1-2', title: 'Sentence Structure',    duration: '30 min', icon: '🧱' },
      { id: 'wr-1-3', title: 'Punctuation Rules',     duration: '25 min', icon: '❗' },
      { id: 'wr-1-4', title: 'Common Grammar Errors', duration: '30 min', icon: '⚠️' },
    ],
  },
  {
    id: 'wr-2', number: 2,
    title: 'Professional Emails',
    description: 'Write clear, polite and effective customer service emails.',
    emoji: '✉️', color: '#8b5cf6', bg: '#f5f3ff',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Subject Lines • Greetings • Email Body • Sign-off',
    subModules: [
      { id: 'wr-2-1', title: 'Email Subject Lines',    duration: '25 min', icon: '📌' },
      { id: 'wr-2-2', title: 'Professional Greetings', duration: '30 min', icon: '🙏' },
      { id: 'wr-2-3', title: 'Email Body Writing',     duration: '40 min', icon: '📄' },
      { id: 'wr-2-4', title: 'Closing & Sign-off',     duration: '25 min', icon: '✍️' },
    ],
  },
  {
    id: 'wr-3', number: 3,
    title: 'Handling Complaints',
    description: 'Write professional responses to angry customers and difficult situations.',
    emoji: '🛡️', color: '#ef4444', bg: '#fef2f2',
    duration: '2.5 hours', tag: 'Intermediate',
    subText: 'Acknowledging • Offering Solutions • Refund Writing • Follow-ups',
    subModules: [
      { id: 'wr-3-1', title: 'Acknowledging Complaints', duration: '35 min', icon: '👂' },
      { id: 'wr-3-2', title: 'Offering Solutions',       duration: '35 min', icon: '💡' },
      { id: 'wr-3-3', title: 'Refund & Compensation',    duration: '30 min', icon: '💰' },
      { id: 'wr-3-4', title: 'Follow-up Messages',       duration: '40 min', icon: '📬' },
    ],
  },
  {
    id: 'wr-4', number: 4,
    title: 'Advanced Business Writing',
    description: 'Reports, escalations and formal correspondence at a professional level.',
    emoji: '💼', color: '#14b8a6', bg: '#f0fdfa',
    duration: '3 hours', tag: 'Advanced',
    subText: 'Escalation Emails • Reports • Chat Support • Internal Comms',
    subModules: [
      { id: 'wr-4-1', title: 'Escalation Emails',      duration: '45 min', icon: '🔺' },
      { id: 'wr-4-2', title: 'Incident Reports',       duration: '45 min', icon: '📋' },
      { id: 'wr-4-3', title: 'Chat Support Writing',   duration: '40 min', icon: '💬' },
      { id: 'wr-4-4', title: 'Internal Communication', duration: '50 min', icon: '🏢' },
    ],
  },
];

const MODULES_MAP = { speaking: SPEAKING_MODULES, writing: WRITING_MODULES };

// ── Sub-module lesson view ────────────────────────────────────
function SubModuleView({ sub, module, onBack, onComplete, isCompleted }) {
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
            <p className="modules-submodule-module-name">Module {module.number}: {module.title}</p>
            <h2 className="modules-submodule-title">{sub.title}</h2>
            <p className="modules-submodule-duration">⏱ {sub.duration}</p>
          </div>
        </div>
        <div className="modules-submodule-body">
          <div className="modules-coming-soon">
            <div className="modules-coming-soon__icon">{sub.icon}</div>
            <h3>Lesson Content Coming Soon</h3>
            <p>This lesson is being prepared. It will include videos, exercises and AI-powered quizzes.</p>
            <div className="modules-coming-soon__features">
              <div className="modules-coming-soon__feature">🎥 Video Lesson</div>
              <div className="modules-coming-soon__feature">📝 Practice Exercises</div>
              <div className="modules-coming-soon__feature">🎯 Quiz</div>
              <div className="modules-coming-soon__feature">🤖 AI Feedback</div>
            </div>
            {!isCompleted ? (
              <button className="modules-complete-btn"
                style={{ background: module.color }} onClick={onComplete}>
                ✅ Mark as Complete
              </button>
            ) : (
              <div className="modules-already-done">✅ Lesson Completed!</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Module detail (sub-modules list) ─────────────────────────
function ModuleDetail({ module, completedSubs, onSubClick, onBack, categoryColor }) {
  const progress = Math.round(
    (module.subModules.filter(s => completedSubs.includes(s.id)).length / module.subModules.length) * 100
  );

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
                <span className="submodule-row__duration">⏱ {sub.duration}</span>
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
    </div>
  );
}

// ── Category modules grid ─────────────────────────────────────
function CategoryModules({ category, completedSubModules, onModuleClick, onBack }) {
  const modules   = MODULES_MAP[category.id];

  const isCompleted = (module) =>
    module.subModules.every(s => completedSubModules.includes(s.id));

  const isUnlocked = (module, index) => {
    if (index === 0) return true;
    return isCompleted(modules[index - 1]);
  };

  const getProgress = (module) => {
    const done = module.subModules.filter(s => completedSubModules.includes(s.id)).length;
    return Math.round((done / module.subModules.length) * 100);
  };

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
            <button key={module.id}
              className={`module-card-box ${!unlocked ? 'module-card-box--locked' : ''}`}
              style={{ '--mc': module.color, '--mb': module.bg }}
              onClick={() => unlocked && onModuleClick(module)}
              disabled={!unlocked}
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
                  {unlocked ? module.description : 'Complete the previous module to unlock this.'}
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
                style={{ background: unlocked ? module.color : '#e2e8f0' }}>
                {unlocked
                  ? completed ? '✅ Completed' : progress > 0 ? 'Continue →' : 'Start →'
                  : '🔒 Locked'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Modules Page ─────────────────────────────────────────
export default function ModulesPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedModule, setSelectedModule]     = useState(null);
  const [activeSubModule, setActiveSubModule]   = useState(null);
  const [completedSubModules, setCompletedSubModules] = useState([]);

  const handleCompleteSubModule = () => {
    if (!activeSubModule) return;
    setCompletedSubModules(prev =>
      prev.includes(activeSubModule.sub.id) ? prev : [...prev, activeSubModule.sub.id]
    );
    setActiveSubModule(null);
  };

  // ── Level 3: Lesson view ────────────────────────────────────
  if (activeSubModule) {
    return (
      <SubModuleView
        sub={activeSubModule.sub}
        module={activeSubModule.module}
        onBack={() => setActiveSubModule(null)}
        onComplete={handleCompleteSubModule}
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
      />
    );
  }

  // ── Level 1b: Category modules ──────────────────────────────
  if (selectedCategory) {
    return (
      <CategoryModules
        category={selectedCategory}
        completedSubModules={completedSubModules}
        onModuleClick={(module) => setSelectedModule(module)}
        onBack={() => setSelectedCategory(null)}
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