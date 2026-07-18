import { useState, useRef } from 'react';
import { Send, BookOpen } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import ScoreScreen from '../../../components/games/ScoreScreen';
import { CompanionEvents } from '../../../components';
import './StoryBuilder.css';

export default function StoryBuilder({ onBack, difficulty = 'BEGINNER' }) {
  const [phase, setPhase]       = useState('idle');
  const [session, setSession]   = useState(null);
  const [genre, setGenre]       = useState('');
  const [setting, setSetting]   = useState('');
  const [story, setStory]       = useState([]);
  const [turnsLeft, setTurnsLeft] = useState(5);
  const [input, setInput]       = useState('');
  const [score, setScore]       = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]       = useState('');

  const storyEndRef = useRef(null);
  const inputRef    = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => storyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const startGame = async () => {
    setIsSubmitting(false);
    setStory([]);
    setInput('');
    setScore(0);
    setFeedback(null);
    setFinalData(null);
    setPhase('loading');
    setError('');

    try {
      const res = await gamesService.story.startStoryBuilder({
        gameType: 'STORY_BUILDER', category: 'STORY', difficulty,
      });

      const data = res.data;
      setSession({ id: data.sessionId });
      setGenre(data.genre);
      setSetting(data.setting);
      setStory([{ by: 'ai', text: data.aiOpening }]);
      setTurnsLeft(data.turnsLeft);
      setPhase('playing');
      scrollToBottom();
      CompanionEvents.emit('CHALLENGE_STARTED');
      setTimeout(() => inputRef.current?.focus(), 300);
    } catch {
      setError('Failed to start story. Please try again.');
      setPhase('idle');
    }
  };

  const handleContinue = async () => {
    if (!input.trim() || isSubmitting) return;

    const userText = input.trim();
    setInput('');
    setIsSubmitting(true);

    setStory(prev => [...prev, { by: 'user', text: userText }]);
    scrollToBottom();

    try {
      const res = await gamesService.story.continueStoryBuilder(
        session.id, { answer: userText, timeMs: 5000 }
      );

      const data = res.data;
      setScore(data.totalScore || score);
      setFeedback({
        scores: data.scores,
        feedback: data.feedback,
        correctedSentence: data.correctedSentence !== userText
          ? data.correctedSentence : null,
      });

      if (data.gameOver) {
        setStory(prev => [...prev, { by: 'ai', text: data.aiEnding }]);
        setFinalData(data);
        setPhase('gameover');
        scrollToBottom();
        CompanionEvents.emit('CHALLENGE_COMPLETED');
        return;
      }

      setStory(prev => [...prev, { by: 'ai', text: data.aiContinuation }]);
      setTurnsLeft(data.turnsLeft);
      scrollToBottom();
    } catch {
      setError('Something went wrong.');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Idle ─────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="story-builder">
        <GameHeader title="Story Builder" score={0} onBack={onBack} />
        <div className="game-intro">
          <div className="game-intro-emoji">📖</div>
          <h2>Story Builder</h2>
          <p>Co-write a creative story with the AI!</p>
          <div className="game-intro-rules">
            <div className="rule">🤖 AI starts the story with 2 sentences</div>
            <div className="rule">✍️ You add the <b>next sentence</b></div>
            <div className="rule">🔄 AI continues, you continue — 5 turns each</div>
            <div className="rule">🎯 AI scores your <b>grammar, creativity & flow</b></div>
            <div className="rule">📚 Your best sentence is highlighted at the end!</div>
          </div>
          {error && <p className="game-error">{error}</p>}
          <button className="game-start-btn" onClick={startGame}>Start Story</button>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="story-builder">
        <GameHeader title="Story Builder" score={0} onBack={onBack} />
        <GameLoading message="AI is starting your story..." />
      </div>
    );
  }

  // ── Game Over ────────────────────────────────────────────────
  if (phase === 'gameover' && finalData) {
    const eval_ = finalData.evaluation;
    return (
      <div className="story-builder">
        <GameHeader title="Story Builder" score={eval_?.overallScore || score} onBack={onBack} />
        <ScoreScreen
          score={eval_?.overallScore || score}
          maxScore={0}
          xpEarned={finalData.xpEarned || 0}
          feedback={eval_?.summary}
          onPlayAgain={startGame}
          onBack={onBack}
        >
          {eval_?.bestSentence && (
            <div className="sb-best-sentence">
              <p className="sb-best-label">⭐ Your best sentence:</p>
              <p className="sb-best-text">"{eval_.bestSentence}"</p>
            </div>
          )}
          <div className="sb-full-story">
            <p className="sb-story-label">📖 Your complete story:</p>
            {story.map((item, i) => (
              <p key={i} className={`sb-story-para ${item.by === 'user' ? 'sb-story-para--user' : ''}`}>
                {item.text}
              </p>
            ))}
          </div>
        </ScoreScreen>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────
  return (
    <div className="story-builder">
      <GameHeader title="Story Builder" score={score} onBack={onBack} />

      <div className="sb-game">

        {/* Genre badge */}
        <div className="sb-meta">
          <span className="sb-genre">{genre}</span>
          <span className="sb-turns">{turnsLeft} turns left</span>
        </div>

        {/* Story display */}
        <div className="sb-story-box">
          {story.map((item, i) => (
            <p key={i} className={`sb-para ${item.by === 'user' ? 'sb-para--user' : 'sb-para--ai'}`}>
              {item.text}
            </p>
          ))}
          {isSubmitting && (
            <div className="sb-ai-typing">
              <span className="sb-typing-dot" /><span className="sb-typing-dot" /><span className="sb-typing-dot" />
            </div>
          )}
          <div ref={storyEndRef} />
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="sb-feedback">
            <p className="sb-feedback-text">💡 {feedback.feedback}</p>
            {feedback.correctedSentence && (
              <p className="sb-correction">
                <b>Better phrasing:</b> "{feedback.correctedSentence}"
              </p>
            )}
            {feedback.scores && (
              <div className="sb-scores">
                <span>Grammar: {feedback.scores.grammar}/10</span>
                <span>Creativity: {feedback.scores.creativity}/10</span>
                <span>Flow: {feedback.scores.relevance}/10</span>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div className="sb-input-row">
          <input
            ref={inputRef}
            type="text"
            className="sb-input"
            placeholder="Continue the story..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            disabled={isSubmitting}
          />
          <button className="sb-submit-btn" onClick={handleContinue}
            disabled={isSubmitting || !input.trim()}>
            <Send size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}