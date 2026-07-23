import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

// ── Level System ──────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: 'Rookie',    emoji: '🌱', color: '#94a3b8' },
  { level: 2, name: 'Learner',   emoji: '📖', color: '#3b82f6' },
  { level: 3, name: 'Improving', emoji: '📈', color: '#f59e0b' },
  { level: 4, name: 'Confident', emoji: '💪', color: '#8b5cf6' },
  { level: 5, name: 'BPO Ready', emoji: '🏆', color: '#10b981' },
];

function getLevel(score) {
  if (score >= 81) return LEVELS[4];
  if (score >= 61) return LEVELS[3];
  if (score >= 41) return LEVELS[2];
  if (score >= 21) return LEVELS[1];
  return LEVELS[0];
}

const S = {
  page:      { padding: '28px 32px', fontFamily: "'Inter',-apple-system,sans-serif", minHeight: '100vh' },
  card:      { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: 20 },
  grid2:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 },
  grid4:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 },
  badge:     (c) => ({ background: c + '18', color: c, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${c}30`, display: 'inline-flex', alignItems: 'center', gap: 4 }),
  kpi:       (c) => ({ background: '#fff', borderRadius: 14, padding: '16px 18px', borderLeft: `4px solid ${c}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }),
  progressTrack: { height: 8, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden' },
  progressFill:  (p, c) => ({ height: '100%', borderRadius: 8, background: c, width: `${Math.min(p, 100)}%`, transition: 'width 0.6s ease' }),
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' },
  td:        { fontSize: 13, color: '#334155', padding: '12px', borderBottom: '1px solid #f1f5f9' },
  backBtn:   { background: 'transparent', border: '2px solid #94a3b8', borderRadius: 12, padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#64748b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
};

const MODULE_NAMES = {
  'sp-1': 'Speaking & Listening Foundations (Module 1)',
  'sp-2': 'Conversational Fluency (Module 2)',
  'sp-3': 'Professional Speaking (Module 3)',
  'sp-4': 'Advanced Communication (Module 4)',
  'wr-1': 'Grammar & Sentence Structure (Module 1)',
  'wr-2': 'Business Writing (Module 2)',
  'wr-3': 'Advanced Composition (Module 3)',
  'wr-4': 'Executive Communication (Module 4)'
};

const LESSON_NAMES = {
  'sp-1-1': 'Greetings & Introducing Yourself',
  'sp-1-2': 'Asking & Answering Questions',
  'sp-1-3': 'Expressing Opinions',
  'sp-1-4': 'Daily Routine & Habits',
  'sp-1-5': 'Describing People & Places',
  'sp-1-6': 'Talking About Experiences',
  'sp-1-7': 'Expressing Likes & Dislikes',
  'sp-1-8': 'Making Plans & Arrangements',
  'sp-1-9': 'Ordering Food & Dining',
  'sp-1-10': 'Asking for Directions',

  'sp-2-1': 'Professional Phone Etiquette',
  'sp-2-2': 'Customer Support Scenarios',
  'sp-2-3': 'Handling Difficult Customers',
  'sp-2-4': 'Active Listening & Empathy',

  'sp-3-1': 'Business Presentation Skills',
  'sp-3-2': 'Negotiation & Persuasion',

  'sp-4-1': 'Executive Briefings',
  'sp-4-2': 'Debate & Advanced Reasoning',

  'wr-1-1': 'Verb Tenses & Agreement',
  'wr-1-2': 'Sentence Structure & Punctuation',
  'wr-2-1': 'Professional Email Writing',
  'wr-2-2': 'Business Report Writing',
};

function getModuleTitle(id) {
  if (!id) return '—';
  if (MODULE_NAMES[id]) return MODULE_NAMES[id];
  const base = id.split('-').slice(0, 2).join('-');
  if (MODULE_NAMES[base]) return MODULE_NAMES[base];
  return id;
}

function getLessonTitle(id) {
  if (!id) return '—';
  if (LESSON_NAMES[id]) return LESSON_NAMES[id];
  return id;
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

function Spinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 13, color: '#64748b' }}>{text}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function AdminUserDetail({ userId, onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true); setError(null);
    const token = localStorage.getItem('vrm_admin_token');
    api.get(`/admin/users/${userId}/detail`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => setData(res.data))
      .catch(e => setError(e?.response?.data?.message || 'Failed to load user detail'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={S.page}><Spinner text="Loading user details..." /></div>;
  if (error) return (
    <div style={S.page}>
      <button style={S.backBtn} onClick={onBack}>← Back to Users</button>
      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 20, color: '#991b1b', marginTop: 20 }}>⚠️ {error}</div>
    </div>
  );
  if (!data) return null;

  const { user, summary, modules, assessments, assessmentHistory, lessonAttempts, certificates } = data;
  const currentLevel = getLevel(summary.moduleProgressScore);
  const entryLevel   = getLevel(summary.entryScore);
  const speakingModules = modules.filter(m => m.category === 'speaking');
  const writingModules  = modules.filter(m => m.category === 'writing');

  return (
    <div style={S.page}>
      {/* Back button */}
      <button style={{ ...S.backBtn, marginBottom: 20 }} onClick={onBack}>← Back to Users</button>

      {/* ── User Profile Header ── */}
      <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>
          {user.name?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>{user.name}</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{user.email} · {user.batch} · {user.role}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={S.badge(user.isActive ? '#10b981' : '#ef4444')}>● {user.isActive ? 'Active' : 'Inactive'}</span>
            <span style={S.badge(currentLevel.color)}>{currentLevel.emoji} Level {currentLevel.level} — {currentLevel.name}</span>
            <span style={S.badge('#6366f1')}>Joined {fmt(user.createdAt)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px 24px', background: '#f8fafc', borderRadius: 14 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: currentLevel.color }}>{summary.moduleProgressScore}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Module Progress</div>
          <div style={{ fontSize: 10, color: '#94a3b8' }}>{summary.modulesDone}/{summary.totalModules} modules</div>
        </div>
      </div>

      {/* ── KPI Summary Row ── */}
      <div style={S.grid4}>
        {[
          { label: 'Modules Done',    val: `${summary.modulesDone}/${summary.totalModules}`, color: '#6366f1' },
          { label: 'Sub-modules Done', val: `${summary.subModulesDone}/${summary.totalSubModules}`, color: '#8b5cf6' },
          { label: 'Entry Score',     val: `${summary.entryScore}%`, color: '#94a3b8' },
          { label: 'Latest Score',    val: `${summary.latestScore}%`, color: currentLevel.color },
          { label: 'Improvement',     val: `${summary.improvement >= 0 ? '+' : ''}${summary.improvement}%`, color: summary.improvement >= 0 ? '#10b981' : '#ef4444' },
          { label: 'Certificates',    val: summary.certificates, color: '#ec4899' },
          { label: 'Games Played',    val: summary.gamesPlayed, color: '#3b82f6' },
          { label: 'Total XP',        val: summary.totalXp, color: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} style={S.kpi(k.color)}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.val}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Level Progress ── */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>📊 Level Progress</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>{entryLevel.emoji}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Entry: Lv.{entryLevel.level}</div>
          </div>
          <div style={{ fontSize: 20, color: '#cbd5e1' }}>→</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>{currentLevel.emoji}</div>
            <div style={{ fontSize: 10, color: currentLevel.color, fontWeight: 700 }}>Now: Lv.{currentLevel.level}</div>
          </div>
          {currentLevel.level > entryLevel.level && (
            <span style={{ ...S.badge('#10b981'), fontSize: 13, padding: '6px 14px' }}>
              +{currentLevel.level - entryLevel.level} Level{currentLevel.level - entryLevel.level > 1 ? 's' : ''} gained
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {LEVELS.map(l => (
            <div key={l.level} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: l.level <= currentLevel.level ? 20 : 14, opacity: l.level <= currentLevel.level ? 1 : 0.35, transition: 'all 0.3s' }}>{l.emoji}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: l.level <= currentLevel.level ? l.color : '#cbd5e1' }}>Lv.{l.level}</div>
            </div>
          ))}
        </div>
        <div style={{ ...S.progressTrack, marginTop: 8 }}>
          <div style={S.progressFill(summary.moduleProgressScore, currentLevel.color)} />
        </div>
      </div>

      {/* ── Growth Graph ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>📈 Growth Journey</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Score progression across all assessments</div>
          </div>
          {summary.improvement !== 0 && (
            <div style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
              background: summary.improvement > 0 ? '#d1fae5' : '#fef2f2',
              color: summary.improvement > 0 ? '#065f46' : '#991b1b',
            }}>
              {summary.improvement > 0 ? '↑' : '↓'} {Math.abs(summary.improvement)}% {summary.improvement > 0 ? 'improvement' : 'decline'}
            </div>
          )}
        </div>
        {assessmentHistory.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={[
                  ...(summary.entryScore > 0 ? [{ stage: 'Entry Test', score: summary.entryScore }] : []),
                  ...assessmentHistory.map((a) => ({
                    stage: `${a.category === 'speaking' ? 'Sp' : 'Wr'} ${a.level.charAt(0)}${a.level.slice(1).toLowerCase()}`,
                    score: a.percentage,
                  })),
                ]}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
              >
                <defs>
                  <linearGradient id="adminGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#adminGrowthGrad)"
                  strokeWidth={3} dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: '#4f46e5' }} name="Score" />
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]}
                  ticks={[0, 20, 40, 60, 80, 100]}
                  tickFormatter={(v) => {
                    const lvl = LEVELS.find(l => l.level === Math.ceil(v / 20));
                    return lvl ? `Lv${lvl.level}` : '';
                  }}
                />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const score = payload[0].value;
                  const lvl = getLevel(score);
                  return (
                    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div>Score: <strong>{score}%</strong></div>
                      <div style={{ color: lvl.color, fontWeight: 700 }}>{lvl.emoji} Level {lvl.level} — {lvl.name}</div>
                    </div>
                  );
                }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              {LEVELS.map(l => (
                <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                  <span>Lv{l.level} {l.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>No assessment data yet</div>
            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Graph will appear once this user completes their first assessment</div>
          </div>
        )}
      </div>

      {/* ── Modules & Sub-modules ── */}
      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e1b4b', marginBottom: 12 }}>📚 Module & Sub-module Breakdown</div>

      <div style={S.grid2}>
        {/* Speaking Modules */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>🎤</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Speaking Modules</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{summary.speakingDone}/4 completed</div>
            </div>
          </div>
          {speakingModules.map(m => (
            <div key={m.moduleId} style={{ marginBottom: 12 }}>
              <div
                onClick={() => setExpandedModule(expandedModule === m.moduleId ? null : m.moduleId)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: m.completed ? '#f0fdf4' : '#f8fafc', border: `1px solid ${m.completed ? '#86efac' : '#e2e8f0'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 16 }}>{m.completed ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.completed ? '#065f46' : '#334155' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.completedSubs}/{m.totalSubs} sub-modules</div>
                </div>
                <div style={{ ...S.progressTrack, width: 60 }}>
                  <div style={S.progressFill((m.completedSubs / m.totalSubs) * 100, '#6366f1')} />
                </div>
                <span style={{ fontSize: 12, color: '#94a3b8', transform: expandedModule === m.moduleId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>
              {expandedModule === m.moduleId && (
                <div style={{ marginTop: 6, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {m.subModules.map(sub => (
                    <div key={sub.subModuleId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: sub.completed ? '#f0fdf4' : '#fafafa', borderRadius: 8, border: `1px solid ${sub.completed ? '#bbf7d0' : '#f1f5f9'}` }}>
                      <span style={{ fontSize: 12 }}>{sub.completed ? '✅' : '⬜'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: sub.completed ? '#065f46' : '#64748b', flex: 1 }}>{sub.label}</span>
                      {sub.completedAt && <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmt(sub.completedAt)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Writing Modules */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 20 }}>✍️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Writing Modules</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{summary.writingDone}/4 completed</div>
            </div>
          </div>
          {writingModules.map(m => (
            <div key={m.moduleId} style={{ marginBottom: 12 }}>
              <div
                onClick={() => setExpandedModule(expandedModule === m.moduleId ? null : m.moduleId)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: m.completed ? '#f0fdf4' : '#f8fafc', border: `1px solid ${m.completed ? '#86efac' : '#e2e8f0'}`, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <span style={{ fontSize: 16 }}>{m.completed ? '✅' : '⭕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.completed ? '#065f46' : '#334155' }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.completedSubs}/{m.totalSubs} sub-modules</div>
                </div>
                <div style={{ ...S.progressTrack, width: 60 }}>
                  <div style={S.progressFill((m.completedSubs / m.totalSubs) * 100, '#10b981')} />
                </div>
                <span style={{ fontSize: 12, color: '#94a3b8', transform: expandedModule === m.moduleId ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              </div>
              {expandedModule === m.moduleId && (
                <div style={{ marginTop: 6, marginLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {m.subModules.map(sub => (
                    <div key={sub.subModuleId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: sub.completed ? '#f0fdf4' : '#fafafa', borderRadius: 8, border: `1px solid ${sub.completed ? '#bbf7d0' : '#f1f5f9'}` }}>
                      <span style={{ fontSize: 12 }}>{sub.completed ? '✅' : '⬜'}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: sub.completed ? '#065f46' : '#64748b', flex: 1 }}>{sub.label}</span>
                      {sub.completedAt && <span style={{ fontSize: 10, color: '#94a3b8' }}>{fmt(sub.completedAt)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Assessment Scores ── */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🎯 Assessment Scores</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Best score per category and level</div>

        <div style={S.grid2}>
          {/* Speaking Assessments */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>🎤 Speaking</div>
            {['beginner', 'intermediate', 'advanced'].map(level => {
              const d = assessments.speaking[level];
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>{level}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{d ? `${d.attempts} attempt${d.attempts > 1 ? 's' : ''}` : 'Not attempted'}</div>
                  </div>
                  {d ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: d.passed ? '#10b981' : '#f59e0b' }}>{d.best}%</span>
                      <span style={S.badge(d.passed ? '#10b981' : '#f59e0b')}>{d.passed ? '✅ Passed' : '⏳ In Progress'}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Writing Assessments */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>✍️ Writing</div>
            {['beginner', 'intermediate', 'advanced'].map(level => {
              const d = assessments.writing[level];
              return (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 8, border: '1px solid #f1f5f9' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', textTransform: 'capitalize' }}>{level}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{d ? `${d.attempts} attempt${d.attempts > 1 ? 's' : ''}` : 'Not attempted'}</div>
                  </div>
                  {d ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: d.passed ? '#10b981' : '#f59e0b' }}>{d.best}%</span>
                      <span style={S.badge(d.passed ? '#10b981' : '#f59e0b')}>{d.passed ? '✅ Passed' : '⏳ In Progress'}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>—</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Assessment History Table ── */}
      {assessmentHistory.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>📋 Assessment History</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>All attempts in chronological order</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['#', 'Category', 'Level', 'Score', 'Result', 'Level Achieved', 'Date'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assessmentHistory.map((a, i) => {
                  const lvl = getLevel(a.percentage);
                  return (
                    <tr key={a.id}>
                      <td style={S.td}>{i + 1}</td>
                      <td style={S.td}><span style={S.badge(a.category === 'speaking' ? '#6366f1' : '#10b981')}>{a.category}</span></td>
                      <td style={S.td}><span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{a.level.toLowerCase()}</span></td>
                      <td style={S.td}><strong style={{ color: a.passed ? '#10b981' : '#f59e0b' }}>{a.percentage}%</strong> <span style={{ fontSize: 10, color: '#94a3b8' }}>({a.rawScore}/{a.totalQuestions})</span></td>
                      <td style={S.td}>{a.passed ? <span style={S.badge('#10b981')}>✅ Passed</span> : <span style={S.badge('#f59e0b')}>❌ Failed</span>}</td>
                      <td style={S.td}><span style={S.badge(lvl.color)}>{lvl.emoji} Lv.{lvl.level} {lvl.name}</span></td>
                      <td style={S.td}>{fmt(a.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lesson Attempts Table (lesson_attempts) ── */}
      {lessonAttempts && lessonAttempts.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>🗣️ Speaking & Writing Lesson Attempts</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>Detailed history from lesson_attempts table</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {['#', 'Module Name', 'Lesson Name', 'Level', 'Set', 'Score', 'Status', 'Date'].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessonAttempts.map((la, i) => (
                  <tr key={la.id || i}>
                    <td style={S.td}>{i + 1}</td>
                    <td style={S.td}><strong>{getModuleTitle(la.moduleId || la.lessonId)}</strong></td>
                    <td style={S.td}>{getLessonTitle(la.lessonId)}</td>
                    <td style={S.td}><span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{la.level?.toLowerCase() || '—'}</span></td>
                    <td style={S.td}>{la.set || '—'}</td>
                    <td style={S.td}><strong style={{ color: la.overallScore >= 60 ? '#10b981' : '#ef4444' }}>{la.overallScore}%</strong></td>
                    <td style={S.td}><span style={S.badge(la.status === 'completed' ? '#10b981' : '#94a3b8')}>{la.status}</span></td>
                    <td style={S.td}>{fmt(la.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Certificates ── */}
      {certificates.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>🏆 Certificates Earned</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {certificates.map(c => (
              <div key={c.id} style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', borderRadius: 14, padding: '18px 22px', color: '#fff', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 36 }}>🏆</span>
                <div>
                  <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Certificate</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{c.moduleName || c.category}</div>
                  <div style={{ fontSize: 12, color: '#c7d2fe' }}>Score: {c.score}% · {fmt(c.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overall Improvement Summary ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)',
        borderRadius: 20, padding: 32, color: '#fff',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Overall Improvement Summary</div>
          <div style={{ fontSize: 12, color: '#a5b4fc' }}>From entry to current status</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>{entryLevel.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.entryScore}%</div>
            <div style={{ fontSize: 11, color: '#a5b4fc' }}>Entry — Lv.{entryLevel.level} {entryLevel.name}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, color: '#a5b4fc' }}>→</div>
            {summary.improvement > 0 && (
              <div style={{ background: '#10b981', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800, marginTop: 4 }}>
                +{summary.improvement}%
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>{currentLevel.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{summary.moduleProgressScore}%</div>
            <div style={{ fontSize: 11, color: '#c7d2fe' }}>Now — Lv.{currentLevel.level} {currentLevel.name} ({summary.modulesDone}/{summary.totalModules} modules)</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          {[
            { emoji: '📚', val: `${summary.modulesDone}/${summary.totalModules}`, label: 'Modules' },
            { emoji: '📝', val: `${summary.subModulesDone}/${summary.totalSubModules}`, label: 'Sub-modules' },
            { emoji: '🏆', val: summary.certificates, label: 'Certificates' },
            { emoji: '🎮', val: summary.gamesCompleted, label: 'Games' },
            { emoji: '⚡', val: summary.totalXp, label: 'Total XP' },
            { emoji: '🎯', val: `${summary.avgAccuracy}%`, label: 'Accuracy' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
              <div style={{ fontSize: 18 }}>{s.emoji}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#a5b4fc' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
