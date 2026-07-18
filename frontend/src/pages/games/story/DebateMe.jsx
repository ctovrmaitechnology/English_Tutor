import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './DebateMe.css';

export default function DebateMe({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]       = useState('idle');
  const [session, setSession]   = useState(null);
  const [topic, setTopic]       = useState('');
  const [userSide, setUserSide] = useState('');
  const [aiSide, setAiSide]     = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [roundsLeft, setRoundsLeft] = useState(4);
  const [score, setScore]       = useState(0);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startGame = async () => {
    setIsSubmitting(false);
    setMessages([]);
    setInput('');
    setScore(0);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.story.startDebateMe({
        gameType: 'DEBATE_ME', category: 'STORY', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setTopic(data.topic);
      setUserSide(data.yourSide);
      setAiSide(data.aiSide);
      setMessages([{ role: 'ai', text: data.aiArgument }]);
      setRoundsLeft(data.roundsLeft);
      setPhase('playing');
      scrollToBottom();
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch {
      setError('Failed to start debate. Please try again.');
      setPhase('idle');
    }
  };

  const handleArgue = async () => {
    if (!input.trim() || isSubmitting) return;

    const userText = input.trim();
    setInput('');
    setIsSubmitting(true);
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    scrollToBottom();

    try {
      const res = await gamesService.story.argueDebateMe(
        session.id, { answer: userText, timeMs: 5000 }
      );

      const data = res.data;
      setScore(data.currentScore || score);

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        CompanionEvents.emit('CHALLENGE_COMPLETED');
        return;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.aiCounterArgument,
        feedback: data.feedback,
      }]);
      setRoundsLeft(data.roundsLeft);
      scrollToBottom();
    } catch {
      setError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  if (phase === 'idle') {
    return (
      <div className="debate-me">
        <GameHeader title="Debate Me" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">🗣️</div>
          <h2>Debate Me</h2>
          <p>Argue your point against the AI!</p>
          <div className="game-intro-rules">
            <div className="rule">💬 AI takes one side of a topic</div>
            <div className="rule">🥊 You argue the <b>opposite side</b></div>
            <div className="rule">🔄 4 rounds of arguments</div>
            <div className="rule">🎯 AI scores argument quality & vocabulary</div>
            <div className="rule">🏆 Best arguments = most points!</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Debate</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="debate-me">
        <GameHeader title="Debate Me" score={0} onBack={onBack} />
        <GameLoading message="Setting up debate topic..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    const verdict = finalData.verdict;
    const userWon = verdict?.winner === 'User';
    return (
      <div className="debate-me">
        <GameHeader title="Debate Me" score={verdict?.overallScore || score} onBack={onBack} />
        <ScoreScreen
          score={verdict?.overallScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={verdict?.userScoreSummary}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className={`dm-winner ${userWon ? 'dm-winner--won' : verdict?.winner === 'Draw' ? 'dm-winner--draw' : 'dm-winner--lost'}`}>
            {userWon ? '🏆 You won the debate!' : verdict?.winner === 'Draw' ? '🤝 It\'s a draw!' : '🤖 AI won this round!'}
          </div>
          {verdict?.strengths?.length > 0 && (
            <div className="dm-section">
              <p className="dm-section-label">✅ Strong points:</p>
              {verdict.strengths.map((s, i) => <p key={i} className="dm-item">• {s}</p>)}
            </div>
          )}
          {verdict?.vocabularyHighlights?.length > 0 && (
            <div className="dm-section">
              <p className="dm-section-label">⭐ Good vocabulary:</p>
              <div className="dm-vocab-chips">
                {verdict.vocabularyHighlights.map((w, i) => (
                  <span key={i} className="dm-vocab-chip">{w}</span>
                ))}
              </div>
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  return (
    <div className="debate-me">
      <GameHeader title="Debate Me" score={score} onBack={onBack} />

      <div className="dm-game">

        <div className="dm-topic-banner">
          <p className="dm-topic-text">"{topic}"</p>
          <div className="dm-sides">
            <span className="dm-side dm-side--ai">🤖 AI: {aiSide}</span>
            <span className="dm-side dm-side--user">👤 You: {userSide}</span>
          </div>
          <span className="dm-rounds">{roundsLeft} rounds left</span>
        </div>

        <div className="dm-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`dm-msg dm-msg--${msg.role}`}>
              <div className="dm-msg-avatar">{msg.role === 'ai' ? '🤖' : '👤'}</div>
              <div className="dm-msg-content">
                <div className="dm-msg-bubble">{msg.text}</div>
                {msg.feedback && (
                  <div className="dm-msg-feedback">💡 {msg.feedback}</div>
                )}
              </div>
            </div>
          ))}
          {isSubmitting && (
            <div className="dm-msg dm-msg--ai">
              <div className="dm-msg-avatar">🤖</div>
              <div className="dm-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="dm-input-row">
          <input
            ref={inputRef}
            type="text"
            className="dm-input"
            placeholder={`Argue the ${userSide} side...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleArgue()}
            disabled={isSubmitting}
          />
          <button className="dm-send-btn" onClick={handleArgue}
            disabled={isSubmitting || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}