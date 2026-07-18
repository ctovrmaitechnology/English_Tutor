import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './AngryCustomer.css';

export default function AngryCustomer({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]           = useState('idle');
  const [session, setSession]       = useState(null);
  const [scenario, setScenario]     = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [turnsLeft, setTurnsLeft]   = useState(8);
  const [currentScore, setCurrentScore] = useState(0);
  const [finalData, setFinalData]   = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const startGame = async () => {
    setIsSubmitting(false);
    setMessages([]);
    setInput('');
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.bpo.startAngryCustomer({
        gameType: 'ANGRY_CUSTOMER',
        category: 'BPO',
        difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setScenario({
        name: data.customerName,
        issue: data.issue,
        scenario: data.scenario,
      });
      setMessages([{ role: 'customer', text: data.customerMessage }]);
      setTurnsLeft(data.maxTurns);
      setCurrentScore(0);
      setPhase('playing');
      scrollToBottom();
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch {
      setError('Failed to start simulation. Please try again.');
      setPhase('idle');
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
      const res = await gamesService.bpo.replyAngryCustomer(
        session.id,
        { answer: userText, timeMs: 5000 }
      );

      const data = res.data;

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        CompanionEvents.emit('CHALLENGE_COMPLETED');
        return;
      }

      setMessages(prev => [...prev, {
        role: 'customer',
        text: data.customerReply,
        feedback: data.feedback,
        fillerWords: data.fillerWords,
      }]);
      setTurnsLeft(data.turnsLeft);
      setCurrentScore(data.currentScore || currentScore);
      scrollToBottom();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="angry-customer">
        <GameHeader title="Angry Customer Simulator" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">📞</div>
          <h2>Angry Customer Simulator</h2>
          <p>Handle a difficult customer call professionally!</p>
          <div className="game-intro-rules">
            <div className="rule">😤 AI plays an angry customer with a real issue</div>
            <div className="rule">💬 Type professional responses to calm them down</div>
            <div className="rule">🎯 AI scores your <b>empathy, tone & resolution</b></div>
            <div className="rule">📈 The better you handle it, the calmer they get</div>
            <div className="rule">⭐ Score 75+ = excellent agent performance!</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Call</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="angry-customer">
        <GameHeader title="Angry Customer Simulator" score={0} onBack={onBack} />
        <GameLoading message="Setting up customer scenario..." />
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────
  if (phase === 'gameover' && finalData) {
    return (
      <div className="angry-customer">
        <GameHeader title="Angry Customer Simulator" score={finalData.scores?.overall || 0} onBack={onBack} />
        <ScoreScreen
          score={finalData.scores?.overall || 0}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={finalData.summary}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className="ac-score-grid">
            {[
              { label: 'Empathy',       value: finalData.scores?.empathy },
              { label: 'Professional',  value: finalData.scores?.professionalism },
              { label: 'Resolution',    value: finalData.scores?.resolution },
              { label: 'Grammar',       value: finalData.scores?.grammar },
            ].map((item, i) => (
              <div key={i} className="ac-score-item">
                <span className="ac-score-label">{item.label}</span>
                <div className="ac-score-bar-track">
                  <div className="ac-score-bar-fill"
                    style={{ width: `${(item.value / 25) * 100}%` }} />
                </div>
                <span className="ac-score-value">{item.value}/25</span>
              </div>
            ))}
          </div>
          {finalData.improvements?.length > 0 && (
            <div className="ac-improvements">
              <p className="ac-improvements-label">💡 Improvements:</p>
              {finalData.improvements.map((tip, i) => (
                <p key={i} className="ac-improvement-tip">• {tip}</p>
              ))}
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  return (
    <div className="angry-customer">
      <GameHeader
        title={`Call with ${scenario?.name}`}
        score={currentScore}
        onBack={onBack}
      />

      <div className="ac-game">

        {/* Scenario banner */}
        <div className="ac-scenario-banner">
          <span className="ac-scenario-issue">📋 Issue: {scenario?.issue}</span>
          <span className="ac-turns-left">{turnsLeft} turns left</span>
        </div>

        {/* Chat messages */}
        <div className="ac-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`ac-msg ac-msg--${msg.role}`}>
              <div className="ac-msg-avatar">
                {msg.role === 'customer' ? '😤' : '🎧'}
              </div>
              <div className="ac-msg-content">
                <div className="ac-msg-bubble">{msg.text}</div>
                {msg.feedback && (
                  <div className="ac-msg-feedback">💡 {msg.feedback}</div>
                )}
                {msg.fillerWords?.length > 0 && (
                  <div className="ac-msg-fillers">
                    ⚠️ Filler words: {msg.fillerWords.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSubmitting && (
            <div className="ac-msg ac-msg--customer">
              <div className="ac-msg-avatar">😤</div>
              <div className="ac-msg-content">
                <div className="ac-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="ac-input-row">
          <input
            ref={inputRef}
            type="text"
            className="ac-input"
            placeholder="Type your professional response..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReply()}
            disabled={isSubmitting}
          />
          <button
            className="ac-send-btn"
            onClick={handleReply}
            disabled={isSubmitting || !input.trim()}
          >
            <Send size={18} />
          </button>
        </div>

        {error && <p className="game-error">{error}</p>}

      </div>
    </div>
  );
}