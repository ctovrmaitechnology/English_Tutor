import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';

const COLORS = ['#6366f1','#10b981','#3b82f6','#8b5cf6','#f59e0b','#ec4899'];

// ── Level System ──────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: 'Rookie',     emoji: '🌱', min: 0,  max: 20, color: '#94a3b8', gradient: 'linear-gradient(135deg,#94a3b8,#cbd5e1)' },
  { level: 2, name: 'Learner',    emoji: '📖', min: 21, max: 40, color: '#3b82f6', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)' },
  { level: 3, name: 'Improving',  emoji: '📈', min: 41, max: 60, color: '#f59e0b', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)' },
  { level: 4, name: 'Confident',  emoji: '💪', min: 61, max: 80, color: '#8b5cf6', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { level: 5, name: 'BPO Ready',  emoji: '🏆', min: 81, max: 100, color: '#10b981', gradient: 'linear-gradient(135deg,#059669,#10b981)' },
];

function getLevel(score) {
  if (score <= 0) return LEVELS[0];
  for (const l of LEVELS) {
    if (score >= l.min && score <= l.max) return l;
  }
  return LEVELS[4];
}

function getSkillTag(score) {
  if (score >= 81) return 'Expert';
  if (score >= 61) return 'Proficient';
  if (score >= 41) return 'Developing';
  if (score >= 21) return 'Basic';
  return 'Beginner';
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:      { padding: '28px 32px', fontFamily: "'Inter',-apple-system,sans-serif", background: '#f8fafc', minHeight: '100vh', maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' },
  card:      { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
  cardSub:   { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  grid2:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 },
  grid3:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 20 },
  badge:     (c) => ({ background: c + '18', color: c, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: `1px solid ${c}30` }),
  chip:      (done) => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: done ? '#f0fdf4' : '#f8fafc', border: `1px solid ${done ? '#86efac' : '#e2e8f0'}` }),
  progressTrack: { height: 10, borderRadius: 10, background: '#f1f5f9', overflow: 'hidden', marginTop: 4 },
  progressFill:  (p, c) => ({ height: '100%', borderRadius: 10, background: c, width: `${Math.min(p, 100)}%`, transition: 'width 0.6s ease' }),
  tabRow:    { display: 'flex', gap: 4, marginBottom: 24, background: '#f1f5f9', borderRadius: 10, padding: 4 },
  tab:       (a) => ({ flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: 'pointer', border: 'none', background: a ? '#fff' : 'transparent', color: a ? '#6366f1' : '#64748b', boxShadow: a ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }),
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', background: '#f8fafc' },
  td:        { fontSize: 13, color: '#334155', padding: '12px 12px', borderBottom: '1px solid #f1f5f9' },
  certCard:  { background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', borderRadius: 16, padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', gap: 16 },
  spinner:   { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', flexDirection: 'column', gap: 16, color: '#6366f1' },
};

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f8fafc' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color || '#a5b4fc' }}>{p.name}: <strong>{p.value}</strong></div>)}
    </div>
  );
};

function Spinner() {
  return (
    <div style={S.spinner}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Loading your progress...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function ScoreRing({ value, color, label, size = 100 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ - (circ * Math.min(value, 100)) / 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          fill={color} fontSize={size > 80 ? 18 : 14} fontWeight={800}>{value}%</text>
      </svg>
      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Level Progress Bar Component ──────────────────────────────────────────────
function LevelBar({ currentLevel, score }) {
  const pct = Math.min(100, Math.max(0, score));
  return (
    <div style={{ position: 'relative', marginTop: 20, marginBottom: 8 }}>
      {/* Level markers */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        {LEVELS.map((l) => {
          const isActive = l.level === currentLevel.level;
          const isPast   = l.level < currentLevel.level;
          return (
            <div key={l.level} style={{ textAlign: 'center', flex: 1, opacity: isPast ? 0.5 : isActive ? 1 : 0.35 }}>
              <div style={{ fontSize: isActive ? 28 : 20, marginBottom: 4, transition: 'all 0.3s', transform: isActive ? 'scale(1.2)' : 'none' }}>
                {l.emoji}
              </div>
              <div style={{ fontSize: 11, fontWeight: isActive ? 800 : 600, color: isActive ? l.color : '#94a3b8' }}>
                Lv.{l.level}
              </div>
              <div style={{ fontSize: 10, color: isActive ? l.color : '#cbd5e1', fontWeight: 600 }}>
                {l.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Track */}
      <div style={{ height: 14, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', borderRadius: 10, background: currentLevel.gradient,
          width: `${pct}%`, transition: 'width 1s ease',
          boxShadow: `0 0 12px ${currentLevel.color}50`,
        }} />
      </div>

      {/* Current position dot */}
      <div style={{
        position: 'absolute', bottom: -4, left: `${pct}%`, transform: 'translateX(-50%)',
        width: 22, height: 22, borderRadius: '50%', background: currentLevel.color,
        border: '3px solid #fff', boxShadow: `0 2px 8px ${currentLevel.color}60`,
        transition: 'left 1s ease',
      }} />
    </div>
  );
}

// ── Journey Map Component ─────────────────────────────────────────────────────
function JourneyMap({ moduleBreakdown, assessmentStatus, certificates }) {
  const sp = assessmentStatus?.speaking || {};
  const wr = assessmentStatus?.writing || {};

  const steps = [
    { id: 'entry',  label: 'Entry Test',          emoji: '📋', done: true },
    { id: 'sp-1',   label: 'Speaking M1',          emoji: '🔊', done: moduleBreakdown.find(m => m.moduleId === 'sp-1')?.completed },
    { id: 'wr-1',   label: 'Writing M1',           emoji: '✍️', done: moduleBreakdown.find(m => m.moduleId === 'wr-1')?.completed },
    { id: 'beg',    label: 'Beginner Test',         emoji: '🎯', done: sp.passedBeginner && wr.passedBeginner },
    { id: 'sp-2',   label: 'Speaking M2',          emoji: '📞', done: moduleBreakdown.find(m => m.moduleId === 'sp-2')?.completed },
    { id: 'wr-2',   label: 'Writing M2',           emoji: '📧', done: moduleBreakdown.find(m => m.moduleId === 'wr-2')?.completed },
    { id: 'int',    label: 'Intermediate Test',     emoji: '🎯', done: sp.passedIntermediate && wr.passedIntermediate },
    { id: 'sp-3',   label: 'Speaking M3',          emoji: '🎙️', done: moduleBreakdown.find(m => m.moduleId === 'sp-3')?.completed },
    { id: 'wr-3',   label: 'Writing M3',           emoji: '📝', done: moduleBreakdown.find(m => m.moduleId === 'wr-3')?.completed },
    { id: 'sp-4',   label: 'Speaking M4',          emoji: '⭐', done: moduleBreakdown.find(m => m.moduleId === 'sp-4')?.completed },
    { id: 'wr-4',   label: 'Writing M4',           emoji: '🏆', done: moduleBreakdown.find(m => m.moduleId === 'wr-4')?.completed },
    { id: 'adv',    label: 'Advanced Test',          emoji: '🎯', done: sp.passedAdvanced && wr.passedAdvanced },
    { id: 'cert',   label: 'Certified!',           emoji: '🎓', done: certificates.length >= 2 },
  ];

  // Find current step (first not done)
  let currentIdx = steps.findIndex(s => !s.done);
  if (currentIdx === -1) currentIdx = steps.length - 1;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: steps.length * 80, paddingRight: 8 }}>
        {steps.map((step, i) => {
          const isDone    = step.done;
          const isCurrent = i === currentIdx;
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 }}>
                {/* Node */}
                <div style={{
                  width: isCurrent ? 48 : 40, height: isCurrent ? 48 : 40,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isCurrent ? 22 : 18,
                  background: isDone ? '#d1fae5' : isCurrent ? '#ede9fe' : '#f1f5f9',
                  border: `3px solid ${isDone ? '#10b981' : isCurrent ? '#6366f1' : '#e2e8f0'}`,
                  boxShadow: isCurrent ? '0 0 16px rgba(99,102,241,0.4)' : 'none',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? '✅' : step.emoji}
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 9, fontWeight: 700, color: isDone ? '#10b981' : isCurrent ? '#6366f1' : '#cbd5e1',
                  marginTop: 6, textAlign: 'center', maxWidth: 70, lineHeight: 1.3,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {step.label}
                </span>
                {isCurrent && (
                  <span style={{ fontSize: 8, fontWeight: 800, color: '#6366f1', marginTop: 2, background: '#ede9fe', padding: '1px 6px', borderRadius: 8 }}>
                    YOU ARE HERE
                  </span>
                )}
              </div>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 3, minWidth: 12,
                  background: isDone ? '#10b981' : '#e2e8f0',
                  marginTop: -20, borderRadius: 2,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Growth Graph Component ────────────────────────────────────────────────────
function GrowthGraph({ scoreTrend, entryScore, latestScore }) {
  // Build journey data points from score trend
  const journeyData = [];

  if (entryScore > 0) {
    journeyData.push({ stage: 'Entry Test', score: Math.min(100, entryScore), level: getLevel(Math.min(100, entryScore)).level });
  }

  scoreTrend.forEach((s, i) => {
    const score = Math.min(100, s.score);
    journeyData.push({
      stage: s.category === 'speaking' ? `Speaking ${s.attempt?.replace('Test ', '#')}` : `Writing ${s.attempt?.replace('Test ', '#')}`,
      score,
      level: getLevel(score).level,
    });
  });

  if (journeyData.length === 0) {
    journeyData.push({ stage: 'Start', score: 0, level: 1 });
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={journeyData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          {/* Level zone reference lines */}
          {LEVELS.map((l) => (
            <Area key={`zone-${l.level}`} type="monotone" dataKey={() => l.max}
              stroke="none" fill="none" legendType="none" />
          ))}

          <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#growthGrad)"
            strokeWidth={3} dot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 8, fill: '#4f46e5' }} name="Score" />

          <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tickFormatter={(v) => {
              const l = LEVELS.find(l => l.max === v);
              return l ? `Lv${l.level}` : '';
            }}
          />
          <Tooltip content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const score = payload[0].value;
            const lvl = getLevel(score);
            return (
              <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div>Score: <strong>{score}</strong></div>
                <div style={{ color: lvl.color, fontWeight: 700 }}>Level {lvl.level} — {lvl.name} {lvl.emoji}</div>
              </div>
            );
          }} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Level legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {LEVELS.map(l => (
          <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#64748b' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
            <span>Lv{l.level} {l.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Improvement Report Component ──────────────────────────────────────────────
function ImprovementReport({ summary, assessmentStatus, currentLevel, entryLevel, certificates }) {
  const sp = assessmentStatus?.speaking || {};
  const wr = assessmentStatus?.writing || {};
  const spScore = sp.passingScore || (sp.scores ? Math.round(Object.values(sp.scores).filter(Boolean).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(sp.scores).filter(Boolean).length)) : 0);
  const wrScore = wr.passingScore || (wr.scores ? Math.round(Object.values(wr.scores).filter(Boolean).reduce((a, b) => a + b, 0) / Math.max(1, Object.values(wr.scores).filter(Boolean).length)) : 0);

  const overallNow = summary.latestScore || 0;
  const overallStart = summary.entryScore || 0;
  const improvement = overallNow - overallStart;
  const levelsGained = currentLevel.level - entryLevel.level;

  const stats = [
    { label: 'Starting Level', before: `Lv.${entryLevel.level} ${entryLevel.name}`, after: `Lv.${currentLevel.level} ${currentLevel.name}`, emoji: entryLevel.emoji, afterEmoji: currentLevel.emoji, color: currentLevel.color },
    { label: 'Speaking', before: `${getSkillTag(overallStart)}`, after: `${getSkillTag(spScore || overallNow)}`, emoji: '🎤', color: '#6366f1' },
    { label: 'Writing', before: `${getSkillTag(overallStart)}`, after: `${getSkillTag(wrScore || overallNow)}`, emoji: '✍️', color: '#10b981' },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)',
      borderRadius: 20, padding: '32px', color: '#fff', marginTop: 8,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
        <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Your Improvement Report</h3>
        <p style={{ margin: 0, fontSize: 13, color: '#a5b4fc' }}>From the first day to now — here's how far you've come</p>
      </div>

      {/* Level jump */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        padding: '20px 0', marginBottom: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>{entryLevel.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginTop: 4 }}>Lv.{entryLevel.level}</div>
          <div style={{ fontSize: 11, color: '#818cf8' }}>{entryLevel.name}</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: '#a5b4fc' }}>→</div>
          {levelsGained > 0 && (
            <div style={{ background: '#10b981', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, marginTop: 4 }}>
              +{levelsGained} Level{levelsGained > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>{currentLevel.emoji}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>Lv.{currentLevel.level}</div>
          <div style={{ fontSize: 11, color: '#c7d2fe' }}>{currentLevel.name}</div>
        </div>
      </div>

      {/* Skill improvements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            background: 'rgba(255,255,255,0.08)', borderRadius: 12, backdropFilter: 'blur(4px)',
          }}>
            <span style={{ fontSize: 24 }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600 }}>{s.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 13, color: '#94a3b8', textDecoration: 'line-through' }}>{s.before}</span>
                <span style={{ fontSize: 14, color: '#fff' }}>→</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{s.after}</span>
                {s.afterEmoji && <span>{s.afterEmoji}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12 }}>
        {[
          { val: `${summary.modulesDone}/${summary.totalModules}`, label: 'Modules Done', emoji: '📚' },
          { val: certificates.length, label: 'Certificates', emoji: '🏆' },
          { val: `${summary.gamesCompleted}`, label: 'Games Played', emoji: '🎮' },
          { val: `${summary.totalXp}`, label: 'Total XP', emoji: '⚡' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: '#a5b4fc' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Motivational message */}
      {improvement > 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, padding: '16px', background: 'rgba(16,185,129,0.15)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399' }}>
            🚀 You improved {improvement} points since your entry test!
          </div>
          <div style={{ fontSize: 12, color: '#a5b4fc', marginTop: 4 }}>
            {levelsGained > 0
              ? `That's ${levelsGained} level${levelsGained > 1 ? 's' : ''} of growth. Keep pushing!`
              : 'Keep going — every practice session makes you better!'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default fallback data ─────────────────────────────────────────────────────
const DEFAULT_DATA = {
  summary: {
    overallPct: 0, speakingPct: 0, writingPct: 0,
    speakingDone: 0, writingDone: 0, modulesDone: 0, totalModules: 8,
    gamesCompleted: 0, avgAccuracy: 0, totalXp: 0,
    entryScore: 0, latestScore: 0, improvement: 0,
  },
  moduleBreakdown: [
    { moduleId: 'sp-1', label: 'Speaking M1', category: 'Speaking', completed: false },
    { moduleId: 'sp-2', label: 'Speaking M2', category: 'Speaking', completed: false },
    { moduleId: 'sp-3', label: 'Speaking M3', category: 'Speaking', completed: false },
    { moduleId: 'sp-4', label: 'Speaking M4', category: 'Speaking', completed: false },
    { moduleId: 'wr-1', label: 'Writing M1', category: 'Writing', completed: false },
    { moduleId: 'wr-2', label: 'Writing M2', category: 'Writing', completed: false },
    { moduleId: 'wr-3', label: 'Writing M3', category: 'Writing', completed: false },
    { moduleId: 'wr-4', label: 'Writing M4', category: 'Writing', completed: false },
  ],
  scoreTrend: [],
  speakingTrend: [],
  writingTrend: [],
  xpTrend: [],
  recentGames: [],
  gameByCategory: [],
  certificates: [],
};

const DEFAULT_STATUS = {
  speaking: { passedBeginner: false, passedIntermediate: false, passedAdvanced: false, scores: {}, passingScore: null },
  writing:  { passedBeginner: false, passedIntermediate: false, passedAdvanced: false, scores: {}, passingScore: null },
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function MyProgress({ user }) {
  const [data, setData]       = useState(DEFAULT_DATA);
  const [status, setStatus]   = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const progressRes = await api.get('/my-progress');
      setData(progressRes.data || DEFAULT_DATA);
    } catch (e) {
      // silently fall back to default data
      setData(DEFAULT_DATA);
    }

    // assessment/status is optional — never block the UI for it
    try {
      const statusRes = await api.get('/assessment/status');
      setStatus(statusRes.data || DEFAULT_STATUS);
    } catch (e) {
      setStatus(DEFAULT_STATUS);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={S.page}><Spinner /></div>;

  const {
    summary        = DEFAULT_DATA.summary,
    moduleBreakdown = DEFAULT_DATA.moduleBreakdown,
    scoreTrend     = [],
    speakingTrend  = [],
    writingTrend   = [],
    xpTrend        = [],
    recentGames    = [],
    gameByCategory = [],
    certificates   = [],
  } = data || DEFAULT_DATA;
  const firstName = user?.first_name || 'there';

  // Safe summary with defaults
  const safeSummary = { ...DEFAULT_DATA.summary, ...(summary || {}) };

  // Calculate levels
  // Module-based progress for level (matches admin page)
  const moduleProgressScore = Math.min(100, safeSummary.overallPct || 0);
  const overallScore = moduleProgressScore;
  const entryScore   = Math.min(100, safeSummary.entryScore || 0);
  const currentLevel = getLevel(moduleProgressScore);
  const entryLevel   = getLevel(entryScore);

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e1b4b', margin: 0 }}>My Progress 📊</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Welcome back, {firstName}! Here's your learning journey so far.</p>
      </div>

      {/* ── LEVEL CARD ── */}
      <div style={{ ...S.card, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Your Current Level</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 36 }}>{currentLevel.emoji}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: currentLevel.color }}>Level {currentLevel.level} — {currentLevel.name}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {currentLevel.level < 5
                    ? `${currentLevel.max - overallScore} more points to reach Level ${currentLevel.level + 1}`
                    : '🎉 You reached the highest level!'}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: currentLevel.color }}>{overallScore}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Overall Score</div>
          </div>
        </div>
        <LevelBar currentLevel={currentLevel} score={overallScore} />
      </div>

      {/* ── GROWTH GRAPH ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <div style={S.cardTitle}>📈 Your Growth Journey</div>
            <div style={S.cardSub}>How your score has changed across assessments</div>
          </div>
          {safeSummary.improvement !== 0 && (
            <div style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800,
              background: safeSummary.improvement > 0 ? '#d1fae5' : '#fef2f2',
              color: safeSummary.improvement > 0 ? '#065f46' : '#991b1b',
            }}>
              {safeSummary.improvement > 0 ? '↑' : '↓'} {Math.abs(safeSummary.improvement)} points
            </div>
          )}
        </div>
        <GrowthGraph scoreTrend={scoreTrend} entryScore={entryScore} latestScore={overallScore} />
      </div>

      {/* ── JOURNEY MAP ── */}
      <div style={S.card}>
        <div style={S.cardTitle}>🗺️ Learning Journey Map</div>
        <div style={{ ...S.cardSub, marginBottom: 24 }}>Your path from Entry Test to BPO Certification</div>
        <JourneyMap moduleBreakdown={moduleBreakdown} assessmentStatus={status} certificates={certificates} />
      </div>

      {/* ── TABS (existing detail sections) ── */}
      <div style={S.tabRow}>
        {['📚 Modules', '🎯 Assessments', '🎮 Games', '🏆 Certificates'].map((t, i) => (
          <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* Modules Tab */}
      {tab === 0 && (
        <div>
          <div style={S.grid2}>
            <div style={S.card}>
              <div style={S.cardTitle}>Module Completion Overview</div>
              <div style={S.cardSub}>Your progress across all learning modules</div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '16px 0' }}>
                <ScoreRing value={safeSummary.overallPct || 0} color="#6366f1" label="Overall" size={120} />
                <ScoreRing value={safeSummary.speakingPct || 0} color="#8b5cf6" label="Speaking" size={100} />
                <ScoreRing value={safeSummary.writingPct || 0} color="#10b981" label="Writing" size={100} />
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Module Checklist</div>
              <div style={S.cardSub}>Tap each module to see details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {moduleBreakdown.map((m, i) => (
                  <div key={i} style={S.chip(m.completed)}>
                    <span style={{ fontSize: 16 }}>{m.completed ? '✅' : '⭕'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: m.completed ? '#065f46' : '#475569' }}>{m.label}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.category}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Progress by Category</div>
            <div style={S.cardSub}>How far you've come in each area</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
              {[
                { label: 'Speaking Modules', pct: safeSummary.speakingPct || 0, done: safeSummary.speakingDone || 0, color: '#6366f1' },
                { label: 'Writing Modules', pct: safeSummary.writingPct || 0, done: safeSummary.writingDone || 0, color: '#10b981' },
              ].map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.done}/4 done</span>
                  </div>
                  <div style={S.progressTrack}><div style={S.progressFill(c.pct, c.color)} /></div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{c.pct}% complete</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assessments Tab */}
      {tab === 1 && (
        <div>
          <div style={S.grid3}>
            {[
              { label: 'Entry Score', val: `Lv.${entryLevel.level} ${entryLevel.name}`, color: '#94a3b8', icon: entryLevel.emoji },
              { label: 'Current Level', val: `Lv.${currentLevel.level} ${currentLevel.name}`, color: currentLevel.color, icon: currentLevel.emoji },
              { label: 'Levels Gained', val: `+${currentLevel.level - entryLevel.level} Level${currentLevel.level - entryLevel.level !== 1 ? 's' : ''}`, color: '#10b981', icon: '📈' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Score Trend Over Time</div>
            <div style={S.cardSub}>Your assessment scores across all attempts</div>
            {scoreTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={scoreTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <Area type="monotone" dataKey="score" stroke="#6366f1" fill="url(#sg2)" strokeWidth={2.5} name="Score" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CT />} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>No assessment attempts yet</div>
            )}
          </div>
          {scoreTrend.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Assessment History</div>
              <div style={S.cardSub}>Your recent test attempts</div>
              <table style={S.table}>
                <thead><tr>{['Attempt', 'Category', 'Score', 'Level', 'Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {scoreTrend.map((s, i) => {
                    const lvl = getLevel(s.score);
                    return (
                      <tr key={i}>
                        <td style={S.td}>{s.attempt}</td>
                        <td style={S.td}><span style={S.badge('#6366f1')}>{s.category}</span></td>
                        <td style={S.td}><strong style={{ color: lvl.color }}>{s.score}</strong></td>
                        <td style={S.td}><span style={S.badge(lvl.color)}>Lv.{lvl.level} {lvl.name}</span></td>
                        <td style={S.td}>{new Date(s.date).toLocaleDateString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Games Tab */}
      {tab === 2 && (
        <div>
          <div style={S.grid3}>
            {[
              { label: 'Total XP Earned', val: safeSummary.totalXp || 0, color: '#8b5cf6', icon: '⚡' },
              { label: 'Games Completed', val: safeSummary.gamesCompleted || 0, color: '#10b981', icon: '🎮' },
              { label: 'Avg Accuracy', val: `${safeSummary.avgAccuracy || 0}%`, color: '#3b82f6', icon: '🎯' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', borderLeft: `4px solid ${s.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={S.grid2}>
            <div style={S.card}>
              <div style={S.cardTitle}>XP Earned (Last 6 Weeks)</div>
              <div style={S.cardSub}>Experience points from games each week</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={xpTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <Bar dataKey="xp" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="XP" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CT />} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Games by Category</div>
              <div style={S.cardSub}>Which types of games you play most</div>
              {gameByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={gameByCategory} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {gameByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CT />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>No games played yet</div>
              )}
            </div>
          </div>
          {recentGames.length > 0 && (
            <div style={S.card}>
              <div style={S.cardTitle}>Recent Game Sessions</div>
              <div style={S.cardSub}>Your last 5 game activities</div>
              <table style={S.table}>
                <thead><tr>{['Game', 'Score', 'Accuracy', 'XP', 'Status', 'Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {recentGames.map((g, i) => (
                    <tr key={i}>
                      <td style={S.td}><strong>{g.gameType?.replace(/_/g, ' ')}</strong></td>
                      <td style={S.td}>{g.score}/{g.maxScore}</td>
                      <td style={S.td}>{g.accuracy}%</td>
                      <td style={S.td}><span style={{ color: '#8b5cf6', fontWeight: 700 }}>+{g.xpEarned} XP</span></td>
                      <td style={S.td}>{g.completed ? <span style={S.badge('#10b981')}>Done</span> : <span style={S.badge('#94a3b8')}>Incomplete</span>}</td>
                      <td style={S.td}>{new Date(g.startedAt).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Certificates Tab */}
      {tab === 3 && (
        <div>
          {certificates.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {certificates.map((c, i) => (
                <div key={i} style={S.certCard}>
                  <div style={{ fontSize: 48 }}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#a5b4fc', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Certificate of Completion</div>
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{c.moduleName || `${c.category} Module`}</div>
                    <div style={{ fontSize: 13, color: '#c7d2fe', marginBottom: 8 }}>Awarded to {c.recipientName}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.category?.toUpperCase()}</span>
                      <span style={{ background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Score: {c.score}%</span>
                      <span style={{ fontSize: 11, color: '#a5b4fc' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...S.card, textAlign: 'center', padding: '60px 32px' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>No Certificates Yet</div>
              <div style={{ fontSize: 14, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>
                Complete a learning module and pass the assessment to earn your first certificate!
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── IMPROVEMENT REPORT (Bottom) ── */}
      <ImprovementReport
        summary={safeSummary}
        assessmentStatus={status || DEFAULT_STATUS}
        currentLevel={currentLevel}
        entryLevel={entryLevel}
        certificates={certificates || []}
      />
    </div>
  );
}