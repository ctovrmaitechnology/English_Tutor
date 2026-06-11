import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import './Games.css';
import WordAmnesia from './games/vocabulary/WordAmnesia';
import WordChain from './games/vocabulary/WordChain';
import SynonymStorm from './games/vocabulary/SynonymStorm';
import SpeedRun from './games/vocabulary/SpeedRun';
import GrammarNinja      from './games/grammar/GrammarNinja';
import ErrorHunt         from './games/grammar/ErrorHunt';
import TenseTransformer  from './games/grammar/TenseTransformer';
import AngryCustomer  from './games/bpo/AngryCustomer';
import EmailRace      from './games/bpo/EmailRace';
import HoldMusic      from './games/bpo/HoldMusic';
import JargonMaster   from './games/bpo/JargonMaster';
import StoryBuilder  from './games/story/StoryBuilder';
import JobInterview  from './games/story/JobInterview';
import DebateMe      from './games/story/DebateMe';
import NewsAnchor    from './games/story/NewsAnchor';
import TongueTwister from './games/voice/TongueTwister';
import EchoMaster    from './games/voice/EchoMaster';
import AccentDrill   from './games/voice/AccentDrill';
import SpeedSpeak    from './games/voice/SpeedSpeak';
import SpinWheel    from './games/daily/SpinWheel';
import BossBattle   from './games/daily/BossBattle';
import StreakShield  from './games/daily/StreakShield';
import TreasureHunt from './games/daily/TreasureHunt';
import SentenceSurgeon from './games/grammar/SentenceSurgeon';
// ── 6 Game Categories ────────────────────────────────────────────────────
const GAME_CATEGORIES = [
  {
    id: 'vocabulary',
    emoji: '📚',
    label: 'Vocabulary Games',
    color: '#6366f1',
    bg: '#ede9fe',
    tag: 'Vocabulary',
    desc: 'Build and expand your English word power',
    subText: 'WordCharm • Synonym Storm • Word Amnesia • Speed Run',
  },
  {
    id: 'grammar',
    emoji: '✍️',
    label: 'Grammar Games',
    color: '#10b981',
    bg: '#d1fae5',
    tag: 'Grammar',
    desc: 'Master English grammar rules through play',
    subText: 'Grammar Ninja • Sentence Surgeon • Error Hunt • Tense Transformers',
  },
  {
    id: 'voice-pronunciation',
    emoji: '🎙️',
    label: 'Voice & Pronunciation',
    color: '#f59e0b',
    bg: '#fef3c7',
    tag: 'Speaking',
    desc: 'Improve your accent and pronunciation skills',
    subText: 'Tongue Twisters • Echo Master • Accent Drill • Speed Speak',
  },
  {
    id: 'bpo-scenario',
    emoji: '🏢',
    label: 'BPO Scenario Games',
    color: '#3b82f6',
    bg: '#eff6ff',
    tag: 'Professional',
    desc: 'Real-world BPO call simulations and roleplay',
    subText: 'Angry Customer Simulator • Email Race • Hold Music • Jargon Master',
  },
  {
    id: 'daily-special',
    emoji: '⭐',
    label: 'Daily & Special Games',
    color: '#ec4899',
    bg: '#fdf2f8',
    tag: 'Daily',
    desc: 'Fresh daily challenges and special event games',
    subText: 'Daily Spin Wheel • Boss Battle • Streak Shield • Treasure Hunt',
  },
  {
    id: 'story-creative',
    emoji: '🎭',
    label: 'Story & Creative Games',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    tag: 'Creative',
    desc: 'Express yourself with storytelling and creative writing',
    subText: 'Story Builder • News Anchor • Job Interview Simulator • Debate Me',
  },
];

// ── Voice & Pronunciation sub-games ──────────────────────────────────────
const VOICE_GAMES = [
  { id: 'tongue-twister', emoji: '👅', label: 'Tongue Twister Challenge', desc: 'Master tricky tongue twisters to sharpen your pronunciation and fluency at speed!', color: '#f59e0b', bg: '#fef3c7', badge: 'Fun', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'echo-master', emoji: '🎧', label: 'Echo Master', desc: 'Listen and repeat! Match the AI voice as closely as possible to improve your accent.', color: '#6366f1', bg: '#ede9fe', badge: 'Listen', difficulty: 'Easy', xp: '+15 XP' },
  { id: 'accent-drill', emoji: '🎯', label: 'Accent Drill', desc: 'Targeted drills for common accent challenges — perfect your vowels, consonants and stress.', color: '#ec4899', bg: '#fdf2f8', badge: 'Drill', difficulty: 'Hard', xp: '+30 XP' },
  { id: 'speed-speak', emoji: '⚡', label: 'Speed Speak', desc: 'Read sentences aloud as fast and clearly as possible. Beat your own speed record!', color: '#10b981', bg: '#d1fae5', badge: 'Speed', difficulty: 'Medium', xp: '+20 XP' },
];

// ── Grammar sub-games ─────────────────────────────────────────────────────
const GRAMMAR_GAMES = [
  { id: 'grammar-ninja', emoji: '🥷', label: 'Grammar Ninja', desc: 'Slice through incorrect sentences with lightning-fast grammar corrections.', color: '#10b981', bg: '#d1fae5', badge: 'Action', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'sentence-surgeon', emoji: '🩺', label: 'Sentence Surgeon', desc: 'Diagnose broken sentences and operate to fix grammar, punctuation, and structure errors.', color: '#3b82f6', bg: '#eff6ff', badge: 'Fix-it', difficulty: 'Hard', xp: '+30 XP' },
  { id: 'error-hunt', emoji: '🔎', label: 'Error Hunt', desc: 'Spot the grammar mistake hiding in each sentence. Find it before the timer runs out!', color: '#f59e0b', bg: '#fef3c7', badge: 'Timed', difficulty: 'Easy', xp: '+15 XP' },
  { id: 'tense-transformers', emoji: '⏳', label: 'Tense Transformers', desc: 'Transform sentences across past, present and future tenses.', color: '#8b5cf6', bg: '#f5f3ff', badge: 'Tenses', difficulty: 'Hard', xp: '+30 XP' },
];

// ── Vocabulary sub-games ──────────────────────────────────────────────────
const VOCAB_GAMES = [
  { id: 'wordcharm-ai', emoji: '🤖', label: 'WordCharm vs AI', desc: 'Challenge the AI in a head-to-head vocabulary battle.', color: '#6366f1', bg: '#ede9fe', badge: 'vs AI', difficulty: 'Hard', xp: '+30 XP' },
  { id: 'synonym-storm', emoji: '⚡', label: 'Synonym Storm', desc: 'A fast-paced storm of synonyms! Match as many word pairs as you can before time runs out.', color: '#f59e0b', bg: '#fef3c7', badge: 'Speed', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'word-amnesia', emoji: '🧠', label: 'Word Amnesia', desc: 'Complete sentences by choosing the correct missing word. Beat your streak!', color: '#ec4899', bg: '#fdf2f8', badge: 'Memory', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'vocab-speed-run', emoji: '🏃', label: 'Vocabulary Speed Run', desc: 'Race against the clock! Define as many words as possible in 60 seconds.', color: '#10b981', bg: '#d1fae5', badge: 'Timed', difficulty: 'Easy', xp: '+15 XP' },
];

// ── BPO Scenario sub-games ────────────────────────────────────────────────
const BPO_GAMES = [
  { id: 'angry-customer', emoji: '📞', label: 'Angry Customer Simulator', desc: 'Calm down a simulated angry customer using professional language.', color: '#3b82f6', bg: '#eff6ff', badge: 'Roleplay', difficulty: 'Hard', xp: '+30 XP' },
  { id: 'email-race', emoji: '✉️', label: 'Email Race', desc: 'Speed-draft correct responses to customer support emails before the clock runs out.', color: '#10b981', bg: '#d1fae5', badge: 'Speed', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'hold-music', emoji: '🎵', label: 'Hold Music', desc: 'Respond to customer scenarios without filler words in under 10 seconds.', color: '#f59e0b', bg: '#fef3c7', badge: 'Listening', difficulty: 'Easy', xp: '+15 XP' },
  { id: 'jargon-master', emoji: '💬', label: 'Jargon Master', desc: 'Master BPO vocabulary and acronyms in rapid-fire format.', color: '#6366f1', bg: '#ede9fe', badge: 'Vocabulary', difficulty: 'Medium', xp: '+20 XP' },
];

// ── Daily & Special sub-games ─────────────────────────────────────────────
const DAILY_GAMES = [
  { id: 'daily-spin', emoji: '🎡', label: 'Daily Spin Wheel', desc: 'Spin the daily wheel for vocabulary challenges, word definitions, and bonus XP boosts.', color: '#ec4899', bg: '#fdf2f8', badge: 'Daily', difficulty: 'Easy', xp: '+10 XP' },
  { id: 'boss-battle', emoji: '⚔️', label: 'Boss Battle', desc: 'Defeat the toughest customer in a weekly BPO roleplay challenge. Score 75%+ to win!', color: '#ef4444', bg: '#fef2f2', badge: 'Boss', difficulty: 'Hard', xp: '+50 XP' },
  { id: 'streak-shield', emoji: '🛡️', label: 'Streak Shield', desc: 'Earn shields by maintaining a 7-day streak. Use them to protect your streak.', color: '#3b82f6', bg: '#eff6ff', badge: 'Shield', difficulty: 'Medium', xp: '+20 XP' },
  { id: 'treasure-hunt', emoji: '🗺️', label: 'Treasure Hunt', desc: 'Find hidden vocabulary words across all modules throughout the month.', color: '#f59e0b', bg: '#fef3c7', badge: 'Explore', difficulty: 'Hard', xp: '+30 XP' },
];

// ── Story & Creative sub-games ────────────────────────────────────────────
const STORY_GAMES = [
  { id: 'story-builder', emoji: '📖', label: 'Story Builder', desc: 'Collaborate with the AI to build a creative story. AI evaluates your sentences!', color: '#8b5cf6', bg: '#f5f3ff', badge: 'Story', difficulty: 'Medium', xp: '+25 XP' },
  { id: 'news-anchor', emoji: '🎙️', label: 'News Anchor', desc: 'Read a script like a real news anchor. AI checks your fluency and pronunciation.', color: '#3b82f6', bg: '#eff6ff', badge: 'Speaking', difficulty: 'Hard', xp: '+35 XP' },
  { id: 'job-interview', emoji: '👔', label: 'Job Interview Simulator', desc: 'Answer tough job interview questions. AI scores your confidence and vocabulary.', color: '#10b981', bg: '#d1fae5', badge: 'Job', difficulty: 'Hard', xp: '+40 XP' },
  { id: 'debate-me', emoji: '🗣️', label: 'Debate Me', desc: 'Debate the AI on random topics. Present structured arguments in clear English.', color: '#ec4899', bg: '#fdf2f8', badge: 'Fluency', difficulty: 'Hard', xp: '+40 XP' },
];

// ── Reusable game card ────────────────────────────────────────────────────
function GameCard({ g, onClick }) {
  return (
    <button
      className="vocab-game-card"
      style={{ '--vc': g.color, '--vb': g.bg }}
      onClick={() => onClick(g.id)}
    >
      <div className="vocab-game-card__bar" style={{ background: g.color }} />
      <div className="vocab-game-card__top">
        <div className="vocab-game-card__emoji-wrap" style={{ background: g.bg }}>
          <span className="vocab-game-card__emoji">{g.emoji}</span>
        </div>
        <div className="vocab-game-card__badges">
          <span className="vocab-badge" style={{ background: g.color }}>{g.badge}</span>
          <span
            className="vocab-diff"
            style={{
              background: g.difficulty === 'Hard' ? '#fef2f2' : g.difficulty === 'Medium' ? '#fffbeb' : '#f0fdf4',
              color: g.difficulty === 'Hard' ? '#dc2626' : g.difficulty === 'Medium' ? '#d97706' : '#16a34a',
            }}
          >{g.difficulty}</span>
        </div>
      </div>
      <div className="vocab-game-card__body">
        <h3 className="vocab-game-card__title">{g.label}</h3>
        <p className="vocab-game-card__desc">{g.desc}</p>
      </div>
      <div className="vocab-game-card__footer">
        <span className="vocab-xp" style={{ color: g.color }}>{g.xp}</span>
        <span className="vocab-play-btn" style={{ background: g.color }}>Play →</span>
      </div>
    </button>
  );
}

// ── Coming Soon placeholder ───────────────────────────────────────────────
function ComingSoon({ g, onBack, backLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <button className="games-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <div className="sub-game-coming">
        <div className="sub-game-coming__icon" style={{ background: g.bg }}>
          <span style={{ fontSize: '3rem' }}>{g.emoji}</span>
        </div>
        <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: '#1e293b' }}>{g.label}</h2>
        <p style={{ margin: 0, color: '#94a3b8' }}>{g.desc}</p>
        <div className="cat-placeholder__coming">
          <span className="cat-placeholder__pulse" style={{ background: g.color }} />
          Game Under Development — Coming Soon!
        </div>
      </div>
    </div>
  );
}

// ── Vocabulary Games ──────────────────────────────────────────────────────
function VocabularyGames() {
  const [activeGame, setActiveGame] = useState(null);

    // ✅ Word Chain — connected to backend
  if (activeGame === 'wordcharm-ai') {
    return <WordChain onBack={() => setActiveGame(null)} />;
  }

  // ✅ Word Amnesia — fully connected to backend
  if (activeGame === 'word-amnesia') {
    return <WordAmnesia onBack={() => setActiveGame(null)} />;
  }

    // ✅ word synonym storm — fully connected to backend
  if (activeGame === 'synonym-storm') {
    return <SynonymStorm onBack={() => setActiveGame(null)} />;
  }

  // ✅ vocab speed run — fully connected to backend  
  if (activeGame === 'vocab-speed-run') {
  return <SpeedRun onBack={() => setActiveGame(null)} />;
}

  // Coming soon for other vocabulary games
  if (activeGame) {
    const g = VOCAB_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to Vocabulary Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {VOCAB_GAMES.map(g => (
        <GameCard key={g.id} g={g} onClick={setActiveGame} />
      ))}
    </div>
  );
}

// ── Grammar Games ─────────────────────────────────────────────────────────
function GrammarGames() {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === 'grammar-ninja')      return <GrammarNinja      onBack={() => setActiveGame(null)} />;
  if (activeGame === 'sentence-surgeon')   return <SentenceSurgeon   onBack={() => setActiveGame(null)} />;
  if (activeGame === 'error-hunt')         return <ErrorHunt         onBack={() => setActiveGame(null)} />;
  if (activeGame === 'tense-transformers') return <TenseTransformer  onBack={() => setActiveGame(null)} />;

  if (activeGame) {
    const g = GRAMMAR_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to Grammar Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {GRAMMAR_GAMES.map(g => <GameCard key={g.id} g={g} onClick={setActiveGame} />)}
    </div>
  );
}

// ── Voice Games ───────────────────────────────────────────────────────────
function VoiceGames() {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === 'tongue-twister') return <TongueTwister onBack={() => setActiveGame(null)} />;
  if (activeGame === 'echo-master')    return <EchoMaster    onBack={() => setActiveGame(null)} />;
  if (activeGame === 'accent-drill')   return <AccentDrill   onBack={() => setActiveGame(null)} />;
  if (activeGame === 'speed-speak')    return <SpeedSpeak    onBack={() => setActiveGame(null)} />;

  if (activeGame) {
    const g = VOICE_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to Voice Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {VOICE_GAMES.map(g => <GameCard key={g.id} g={g} onClick={setActiveGame} />)}
    </div>
  );
}

// ── BPO Games ─────────────────────────────────────────────────────────────
function BpoGames() {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === 'angry-customer') return <AngryCustomer onBack={() => setActiveGame(null)} />;
  if (activeGame === 'email-race')     return <EmailRace     onBack={() => setActiveGame(null)} />;
  if (activeGame === 'hold-music')     return <HoldMusic     onBack={() => setActiveGame(null)} />;
  if (activeGame === 'jargon-master')  return <JargonMaster  onBack={() => setActiveGame(null)} />;

  if (activeGame) {
    const g = BPO_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to BPO Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {BPO_GAMES.map(g => <GameCard key={g.id} g={g} onClick={setActiveGame} />)}
    </div>
  );
}

// ── Daily Games ───────────────────────────────────────────────────────────
function DailyGames() {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === 'daily-spin')    return <SpinWheel    onBack={() => setActiveGame(null)} />;
  if (activeGame === 'boss-battle')   return <BossBattle   onBack={() => setActiveGame(null)} />;
  if (activeGame === 'streak-shield') return <StreakShield  onBack={() => setActiveGame(null)} />;
  if (activeGame === 'treasure-hunt') return <TreasureHunt onBack={() => setActiveGame(null)} />;

  if (activeGame) {
    const g = DAILY_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to Daily Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {DAILY_GAMES.map(g => <GameCard key={g.id} g={g} onClick={setActiveGame} />)}
    </div>
  );
}

// ── Story Games ───────────────────────────────────────────────────────────
function StoryGames() {
  const [activeGame, setActiveGame] = useState(null);

  if (activeGame === 'story-builder') return <StoryBuilder onBack={() => setActiveGame(null)} />;
  if (activeGame === 'job-interview') return <JobInterview onBack={() => setActiveGame(null)} />;
  if (activeGame === 'debate-me')     return <DebateMe     onBack={() => setActiveGame(null)} />;
  if (activeGame === 'news-anchor')   return <NewsAnchor   onBack={() => setActiveGame(null)} />;

  if (activeGame) {
    const g = STORY_GAMES.find(v => v.id === activeGame);
    return <ComingSoon g={g} onBack={() => setActiveGame(null)} backLabel="Back to Story Games" />;
  }

  return (
    <div className="vocab-games-grid">
      {STORY_GAMES.map(g => <GameCard key={g.id} g={g} onClick={setActiveGame} />)}
    </div>
  );
}

// ── Category content router ───────────────────────────────────────────────
function CategoryContent({ category }) {
  if (category.id === 'vocabulary')           return <VocabularyGames />;
  if (category.id === 'grammar')              return <GrammarGames />;
  if (category.id === 'voice-pronunciation')  return <VoiceGames />;
  if (category.id === 'bpo-scenario')         return <BpoGames />;
  if (category.id === 'daily-special')        return <DailyGames />;
  if (category.id === 'story-creative')       return <StoryGames />;
  return null;
}

// ── Main Games Page ───────────────────────────────────────────────────────
export default function GamesPage() {
  const [selectedId, setSelectedId] = useState(null);
  const category = GAME_CATEGORIES.find(g => g.id === selectedId);

  // Category view
  if (category) {
    return (
      <div className="games-page" key={selectedId}>
        <button className="games-back-btn" onClick={() => setSelectedId(null)}>
          <ArrowLeft size={16} /> Back to Games
        </button>

        <div
          className="games-header"
          style={{ background: `linear-gradient(135deg, ${category.color} 0%, ${category.color}bb 100%)` }}
        >
          <span className="games-header__emoji">{category.emoji}</span>
          <div>
            <h1 className="games-header__title">{category.label}</h1>
            <p className="games-header__sub">{category.desc}</p>
          </div>
          <span className="games-header__badge">{category.tag}</span>
        </div>

        <div className="content-card">
          <CategoryContent category={category} />
        </div>
      </div>
    );
  }

  // Lobby — 6 category cards
  return (
    <div className="games-page">
      <div className="games-lobby-header">
        <h1 className="games-lobby-title">🎮 Games Center</h1>
        <p className="games-lobby-sub">Choose a category and start playing!</p>
      </div>

      <div className="games-grid">
        {GAME_CATEGORIES.map(game => (
          <button
            key={game.id}
            className="game-card"
            style={{ '--gc': game.color, '--gb': game.bg }}
            onClick={() => setSelectedId(game.id)}
          >
            <div className="game-card__icon-wrap" style={{ background: game.bg }}>
              <span className="game-card__emoji">{game.emoji}</span>
            </div>
            <div className="game-card__body">
              <span className="game-card__tag" style={{ color: game.color, background: game.bg }}>{game.tag}</span>
              <h3 className="game-card__title">{game.label}</h3>
              <p className="game-card__desc">{game.desc}</p>
              <p className="game-card__sub">{game.subText}</p>
            </div>
            <div className="game-card__footer" style={{ background: game.color }}>Explore →</div>
          </button>
        ))}
      </div>
    </div>
  );
}