import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchFromCDN } from '../utils/cdn';
import './Challenges.css';
import { 
  Trophy, 
  Flame, 
  CheckCircle, 
  Lock, 
  Zap, 
  ChevronRight, 
  Sparkles,
  Gift
} from 'lucide-react';
import { CompanionEvents, Confetti } from '../components';

export default function Challenges() {
  const [questState, setQuestState] = useState('idle'); // 'idle', 'active_quiz', 'completed'
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showOverlay, setShowOverlay] = useState(false);

  // Fetch streak, quests, and achievements with React Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['challengesData'],
    queryFn: () => fetchFromCDN('mock-data/challenges.json'),
  });

  const [badges, setBadges] = useState(null);

  // Initial state synchronization once query resolves successfully
  const initialBadges = data?.badges || [];
  const currentBadges = badges !== null ? badges : initialBadges;

  const handleStartQuest = useCallback(() => {
    setQuestState('active_quiz');
    setSelectedAnswer(null);
    CompanionEvents.emit('CHALLENGE_STARTED');
  }, []);

  const handleSelectAnswer = useCallback((index) => {
    setSelectedAnswer(index);
  }, []);

  const handleSubmitQuest = useCallback(() => {
    if (selectedAnswer === 1) { // Index of "Put on hold"
      setQuestState('completed');
      setShowOverlay(true);
      CompanionEvents.emit('CHALLENGE_COMPLETED');
    } else {
      alert("Oops! That's not the correct meaning. Try again!");
    }
  }, [selectedAnswer]);

  const handleUnlockBadge = useCallback((id) => {
    const targetBadge = currentBadges.find(b => b.id === id);
    if (targetBadge && !targetBadge.unlocked) {
      setBadges(prev => {
        const activeList = prev !== null ? prev : initialBadges;
        return activeList.map(badge => {
          if (badge.id === id) {
            return { ...badge, unlocked: true };
          }
          return badge;
        });
      });
      CompanionEvents.emit('BADGE_UNLOCKED');
    }
  }, [currentBadges, initialBadges]);

  if (isLoading) {
    return (
      <div className="challenges-container animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '24px', opacity: 0.7 }}>
        <div style={{ height: '80px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px' }} />
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ height: '300px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 1 }} />
          <div style={{ height: '300px', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '16px', flex: 1 }} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="challenges-container" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '24px', textAlign: 'center', maxWidth: '400px' }}>
          <span style={{ fontSize: '48px' }} role="img" aria-label="warning">⚠️</span>
          <h3 style={{ margin: '16px 0 8px', color: '#991b1b' }}>Failed to Load Challenges</h3>
          <p style={{ color: '#7f1d1d', fontSize: '14px', marginBottom: '16px' }}>{error?.message || 'A network error occurred while reaching the cache server.'}</p>
          <button onClick={() => refetch()} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
            Retry Request
          </button>
        </div>
      </div>
    );
  }

  const streak = data?.streak || { days: 4, multiplier: "XP x1.2 Active" };
  const quests = data?.quests || [];

  return (
    <div className="challenges-container animate-fade-in">
      {/* Streak Banner */}
      <section className="ch-streak-banner">
        <div className="ch-streak-left">
          <div className="streak-flame-container">
            <Flame className="streak-flame-icon" size={32} />
          </div>
          <div className="ch-streak-text">
            <h3>{streak.days}-Day Practice Streak!</h3>
            <p>Complete today's active quest to earn a 5-day multiplier bonus.</p>
          </div>
        </div>
        <div className="ch-streak-right">
          <span className="multiplier-pill">{streak.multiplier}</span>
        </div>
      </section>

      {/* Split Section: Daily Quests and Achievements Rack */}
      <div className="ch-split-layout">
        
        {/* Left Side: Daily Quests */}
        <div className="ch-quests-card content-card">
          <div className="ch-card-header">
            <Zap className="accent-blue" size={20} />
            <h3>Daily Quests</h3>
          </div>
          <p className="card-description">Complete daily micro-exercises to earn experience points.</p>

          <div className="quests-list">
            
            {quests.map((quest) => {
              if (quest.id === 'q2') {
                // Interactive Quest 2 (Idioms Match Challenge)
                if (questState === 'idle') {
                  return (
                    <div key={quest.id} className="quest-item active">
                      <div className="quest-status">
                        <div className="active-dot"></div>
                      </div>
                      <div className="quest-details">
                        <h4>{quest.title}</h4>
                        <p>{quest.desc}</p>
                      </div>
                      <button className="quest-action-btn" onClick={handleStartQuest}>
                        Start <ChevronRight size={14} />
                      </button>
                    </div>
                  );
                }

                if (questState === 'active_quiz') {
                  return (
                    <div key={quest.id} className="quest-active-quiz animate-scale-up">
                      <h4>Choose the correct meaning:</h4>
                      <p className="quiz-question">What does the idiom <strong>"To put a customer on ice"</strong> mean in BPO vocabulary?</p>
                      
                      <div className="quiz-options">
                        <button 
                          className={`quiz-option ${selectedAnswer === 0 ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(0)}
                        >
                          1. To terminate the call immediately.
                        </button>
                        <button 
                          className={`quiz-option ${selectedAnswer === 1 ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(1)}
                        >
                          2. To put the customer on hold.
                        </button>
                        <button 
                          className={`quiz-option ${selectedAnswer === 2 ? 'selected' : ''}`}
                          onClick={() => handleSelectAnswer(2)}
                        >
                          3. To send an email follow-up.
                        </button>
                      </div>

                      <div className="quiz-actions">
                        <button 
                          className="quest-btn-submit" 
                          disabled={selectedAnswer === null}
                          onClick={handleSubmitQuest}
                        >
                          Submit Answer
                        </button>
                      </div>
                    </div>
                  );
                }

                if (questState === 'completed') {
                  return (
                    <div key={quest.id} className="quest-item completed animate-scale-up">
                      <div className="quest-status">
                        <CheckCircle className="check-icon" size={20} />
                      </div>
                      <div className="quest-details">
                        <h4>{quest.title}</h4>
                        <p>Congratulations! You defined the hold phrase correctly.</p>
                      </div>
                      <span className="quest-reward">{quest.reward}</span>
                    </div>
                  );
                }
              }

              // Standard Static Quests (q1, q3)
              return (
                <div key={quest.id} className={`quest-item ${quest.type}`}>
                  <div className="quest-status">
                    {quest.type === 'completed' ? (
                      <CheckCircle className="check-icon" size={20} />
                    ) : (
                      <Lock className="lock-icon" size={18} />
                    )}
                  </div>
                  <div className="quest-details">
                    <h4>{quest.title}</h4>
                    <p>{quest.desc}</p>
                  </div>
                  <span className="quest-reward">{quest.reward}</span>
                </div>
              );
            })}

          </div>
        </div>

        {/* Right Side: Badge Showcase Rack */}
        <div className="ch-badges-card content-card">
          <div className="ch-card-header">
            <Trophy className="accent-amber" size={20} />
            <h3>Achievement Badges</h3>
          </div>
          <p className="card-description">
            Click on a locked badge to simulate unlocking it! Watch your Panda buddy react.
          </p>

          <div className="badges-grid">
            {currentBadges.map(badge => (
              <button 
                key={badge.id}
                className={`badge-tile ${badge.unlocked ? 'unlocked animate-scale-up' : 'locked'}`}
                onClick={() => handleUnlockBadge(badge.id)}
                title={badge.unlocked ? `Unlocked: ${badge.desc}` : `Locked: ${badge.desc}`}
                disabled={badge.unlocked}
              >
                <div className="badge-tile__icon">{badge.icon}</div>
                <span className="badge-tile__name">{badge.name}</span>
                <span className="badge-tile__status">
                  {badge.unlocked ? 'Earned' : 'Click to Unlock'}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* CodeChef Style Fullscreen Challenge Success Overlay */}
      {showOverlay && (
        <>
          <Confetti />
          <div className="fullscreen-overlay animate-fade-in">
            <div className="overlay-card animate-scale-up">
              <div className="overlay-celebration-graphic">
                <Sparkles size={40} className="reward-icon-large" />
              </div>
              <h2>Challenge Completed!</h2>
              <p className="overlay-desc">Congratulations! You have successfully completed the BPO matched idioms vocabulary challenge.</p>
              
              <div className="overlay-stats">
                <div className="overlay-stat">
                  <span className="overlay-stat-val">100%</span>
                  <span className="overlay-stat-label">Accuracy</span>
                </div>
                <div className="overlay-stat">
                  <span className="overlay-stat-val">{streak.days} Days</span>
                  <span className="overlay-stat-label">Streak</span>
                </div>
                <div className="overlay-stat">
                  <span className="overlay-stat-val">+15</span>
                  <span className="overlay-stat-label">XP Earned</span>
                </div>
              </div>

              <button className="overlay-btn-continue" onClick={() => setShowOverlay(false)}>
                Awesome, Continue!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
