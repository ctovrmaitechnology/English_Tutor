import { useState, useEffect, useRef } from 'react';
import { Send, Shield, Swords } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './BossBattle.css';

export default function BossBattle({ onBack }) {
  const [phase, setPhase]         = useState('checking');
  const [canChallenge, setCanChallenge] = useState(false);
  const [alreadyResult, setAlreadyResult] = useState(null);
  const [session, setSession]     = useState(null);
  const [bossInfo, setBossInfo]   = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [turnsLeft, setTurnsLeft] = useState(10);
  const [bossAnger, setBossAnger] = useState(10);
  const [currentScore, setCurrentScore] = useState(0);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  useEffect(() => { checkBoss(); }, []);

  const checkBoss = async () => {
    try {
      const res = await gamesService.daily.checkBoss();
      setCanChallenge(res.data.canChallenge);
      if (!res.data.canChallenge) {
        setAlreadyResult({
          defeated: res.data.alreadyDefeated,
          score: res.data.score,
          message: res.data.message,
        });
      }
      setPhase('ready');
    } catch {
      setPhase('ready');
      setCanChallenge(true);
    }
  };

  const startBoss = async () => {
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.daily.startBoss();
      const data = res.data;

      setSession({ id: data.sessionId });
      setBossInfo({ name: data.bossName, title: data.bossTitle, scenario: data.scenario, demands: data.demands });
      setMessages([{ role: 'boss', text: data.bossMessage }]);
      setTurnsLeft(data.maxTurns);
      setBossAnger(10);
      setCurrentScore(0);
      setPhase('battle');
      CompanionEvents.emit('CHALLENGE_STARTED');
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch {
      setError('Failed to start boss battle.');
      setPhase('ready');
    }
  };

  const handleReply = async () => {
    if (!input.trim() || isSubmitting) return;

    const userText = input.trim();
    setInput('');
    setIsSubmitting(true);
    setMessages(prev => [...prev, { role: 'agent', text: userText }]);
    scrollToBottom();

    try {
      const res = await gamesService.daily.replyBoss(
        session.id, { answer: userText, timeMs: 5000 }
      );

      const data = res.data;
      setBossAnger(data.bossAngryLevel || bossAnger);
      setCurrentScore(data.currentScore || currentScore);
      setTurnsLeft(data.turnsLeft || turnsLeft - 1);

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        if (data.defeated) {
          CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
        }
        return;
      }

      setMessages(prev => [...prev, {
        role: 'boss',
        text: data.bossReply,
        feedback: data.feedback,
      }]);
      scrollToBottom();
    } catch {
      setError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (phase === 'checking' || phase === 'loading') {
    return (
      <div className="boss-battle">
        <GameHeader title="Boss Battle" score={0} onBack={onBack} />
        <GameLoading message={phase === 'checking' ? 'Checking boss status...' : 'Summoning the Boss...'} />
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="boss-battle">
        <GameHeader title="⚔️ Boss Battle" score={0} onBack={onBack} />
        <div className="bb-ready">
          {alreadyResult ? (
            <div className="bb-already">
              <div className="bb-already-emoji">{alreadyResult.defeated ? '🏆' : '💀'}</div>
              <h2>{alreadyResult.defeated ? 'Boss Defeated!' : 'Boss Still Standing!'}</h2>
              <p>{alreadyResult.message}</p>
              <p className="bb-already-score">Score: {alreadyResult.score}/100</p>
              <button className="bb-back-btn" onClick={onBack}>← Back to Games</button>
            </div>
          ) : (
            <div className="bb-intro">
              <div className="bb-boss-icon">👹</div>
              <h2>Weekly Boss Battle</h2>
              <p>The most difficult customer challenge of the week!</p>
              <div className="game-intro-rules">
                <div className="rule">😡 AI plays the <b>most demanding customer ever</b></div>
                <div className="rule">💬 10 turns to handle the situation professionally</div>
                <div className="rule">⭐ Score <b>75+</b> to defeat the boss</div>
                <div className="rule">🏆 Defeat = special weekly badge + <b>300 XP</b></div>
                <div className="rule">⚠️ One attempt per week!</div>
              </div>
              {error && <p className="game-error">{error}</p>}
              <button className="game-start-btn" onClick={startBoss}>⚔️ Challenge the Boss!</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    return (
      <div className="boss-battle">
        <GameHeader title="Boss Battle" score={finalData.finalScore || currentScore} onBack={onBack} />
        <ScoreScreen
          score={finalData.finalScore || currentScore}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={finalData.message}
          onPlayAgain={onBack}
          onBack={onBack}
        >
          <div className={`bb-verdict ${finalData.defeated ? 'bb-verdict--won' : 'bb-verdict--lost'}`}>
            {finalData.defeated
              ? '🏆 BOSS DEFEATED! You are a professional champion!'
              : '💀 Boss wins this week. Try again next Sunday!'}
          </div>
          {finalData.defeated && (
            <div className="bb-badge">🏅 Weekly Badge: BOSS SLAYER earned!</div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  // Battle phase
  const angerPercent = (bossAnger / 10) * 100;

  return (
    <div className="boss-battle">
      <GameHeader
        title={`⚔️ vs ${bossInfo?.name}`}
        score={currentScore}
        onBack={onBack}
      />

      <div className="bb-game">

        {/* Boss anger meter */}
        <div className="bb-anger-bar">
          <span className="bb-anger-label">😡 Boss Anger</span>
          <div className="bb-anger-track">
            <div
              className="bb-anger-fill"
              style={{
                width: `${angerPercent}%`,
                background: angerPercent > 70 ? '#ef4444' : angerPercent > 40 ? '#f59e0b' : '#10b981',
              }}
            />
          </div>
          <span className="bb-turns">{turnsLeft} turns</span>
        </div>

        {/* Boss scenario */}
        <div className="bb-scenario">
          <p className="bb-scenario-text">📋 {bossInfo?.scenario}</p>
          <div className="bb-demands">
            {bossInfo?.demands?.map((d, i) => (
              <span key={i} className="bb-demand">⚠️ {d}</span>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="bb-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`bb-msg bb-msg--${msg.role}`}>
              <div className="bb-msg-avatar">
                {msg.role === 'boss' ? '👹' : '🎧'}
              </div>
              <div className="bb-msg-content">
                <div className="bb-msg-bubble">{msg.text}</div>
                {msg.feedback && (
                  <div className="bb-feedback">💡 {msg.feedback}</div>
                )}
              </div>
            </div>
          ))}
          {isSubmitting && (
            <div className="bb-msg bb-msg--boss">
              <div className="bb-msg-avatar">👹</div>
              <div className="bb-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bb-input-row">
          <input
            ref={inputRef}
            type="text"
            className="bb-input"
            placeholder="Respond professionally..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReply()}
            disabled={isSubmitting}
          />
          <button className="bb-send-btn" onClick={handleReply}
            disabled={isSubmitting || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}