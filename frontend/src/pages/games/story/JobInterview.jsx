import { useState, useRef } from 'react';
import { Send, Briefcase } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './JobInterview.css';

export default function JobInterview({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]         = useState('idle');
  const [session, setSession]     = useState(null);
  const [setup, setSetup]         = useState(null);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(5);
  const [feedback, setFeedback]   = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startGame = async () => {
    setIsSubmitting(false);
    setMessages([]);
    setInput('');
    setFeedback(null);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.story.startJobInterview({
        gameType: 'JOB_INTERVIEW', category: 'STORY', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setSetup({ company: data.companyName, role: data.role, interviewer: data.interviewerName });
      setMessages([{ role: 'interviewer', text: data.interviewerMessage }]);
      setQuestionsLeft(data.questionsLeft);
      setPhase('playing');
      CompanionEvents.emit('CHALLENGE_STARTED');
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch {
      setError('Failed to start interview. Please try again.');
      setPhase('idle');
    }
  };

  const handleAnswer = async () => {
    if (!input.trim() || isSubmitting) return;

    const userText = input.trim();
    setInput('');
    setIsSubmitting(true);
    setMessages(prev => [...prev, { role: 'candidate', text: userText }]);
    scrollToBottom();

    try {
      const res = await gamesService.story.answerJobInterview(
        session.id, { answer: userText, timeMs: 5000 }
      );

      const data = res.data;

      if (data.gameOver) {
        setFinalData(data);
        setPhase('gameover');
        if (data.evaluation?.overallScore >= 70) {
          CompanionEvents.emit('HIGH_SCORE_ACHIEVED');
        }
        return;
      }

      setFeedback({ tip: data.feedback });
      setMessages(prev => [...prev, { role: 'interviewer', text: data.interviewerQuestion }]);
      setQuestionsLeft(data.questionsLeft);
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
      <div className="job-interview">
        <GameHeader title="Job Interview Simulator" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">👔</div>
          <h2>Job Interview Simulator</h2>
          <p>Ace your BPO job interview with AI coaching!</p>
          <div className="game-intro-rules">
            <div className="rule">🏢 AI plays a professional interviewer</div>
            <div className="rule">💬 Answer <b>6 interview questions</b></div>
            <div className="rule">🎯 AI scores confidence, grammar & vocabulary</div>
            <div className="rule">📋 Questions cover: self-intro, customer handling, strengths</div>
            <div className="rule">✅ Score 70+ = <b>Hire recommendation!</b></div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Interview</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="job-interview">
        <GameHeader title="Job Interview Simulator" score={0} onBack={onBack} />
        <GameLoading message="Setting up your interview..." />
      </div>
    );
  }

  if (phase === 'gameover' && finalData) {
    const eval_ = finalData.evaluation;
    const hired = ['Strong Yes', 'Yes'].includes(eval_?.hiringDecision);
    return (
      <div className="job-interview">
        <GameHeader title="Job Interview Simulator" score={eval_?.overallScore || 0} onBack={onBack} />
        <ScoreScreen
          score={eval_?.overallScore || 0}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={eval_?.summary}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          <div className={`ji-verdict ${hired ? 'ji-verdict--hired' : 'ji-verdict--rejected'}`}>
            {hired ? '🎉 Hired!' : '😔 Not selected this time'} — {eval_?.hiringDecision}
          </div>
          {eval_?.strengths?.length > 0 && (
            <div className="ji-section">
              <p className="ji-section-label">✅ Strengths:</p>
              {eval_.strengths.map((s, i) => <p key={i} className="ji-item">• {s}</p>)}
            </div>
          )}
          {eval_?.improvements?.length > 0 && (
            <div className="ji-section">
              <p className="ji-section-label">💡 Improve:</p>
              {eval_.improvements.map((s, i) => <p key={i} className="ji-item">• {s}</p>)}
            </div>
          )}
        </ScoreScreen>
      </div>
    );
  }

  return (
    <div className="job-interview">
      <GameHeader title={`Interview at ${setup?.company}`} score={0} onBack={onBack} />

      <div className="ji-game">

        <div className="ji-banner">
          <span>👔 {setup?.role}</span>
          <span>{questionsLeft} questions left</span>
        </div>

        <div className="ji-chat">
          {messages.map((msg, i) => (
            <div key={i} className={`ji-msg ji-msg--${msg.role}`}>
              <div className="ji-msg-avatar">
                {msg.role === 'interviewer' ? '👩‍💼' : '🧑'}
              </div>
              <div className="ji-msg-bubble">{msg.text}</div>
            </div>
          ))}
          {feedback && (
            <div className="ji-tip">💡 {feedback.tip}</div>
          )}
          {isSubmitting && (
            <div className="ji-msg ji-msg--interviewer">
              <div className="ji-msg-avatar">👩‍💼</div>
              <div className="ji-typing"><span /><span /><span /></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="ji-input-row">
          <input
            ref={inputRef}
            type="text"
            className="ji-input"
            placeholder="Type your answer..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnswer()}
            disabled={isSubmitting}
          />
          <button className="ji-send-btn" onClick={handleAnswer}
            disabled={isSubmitting || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}