import { useState, useEffect } from 'react';
import { Map, Lock, Unlock, Trophy } from 'lucide-react';
import { gamesService } from '../../../services/games.service';
import GameHeader from '../../../components/games/GameHeader';
import GameLoading from '../../../components/games/GameLoading';
import { CompanionEvents } from '../../../components';
import './TreasureHunt.css';

export default function TreasureHunt({ onBack }) {
  const [phase, setPhase]     = useState('loading');
  const [hunt, setHunt]       = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => { loadHunt(); }, []);

  const loadHunt = async () => {
    try {
      const res = await gamesService.daily.getTreasureHunt();
      setHunt(res.data);
      setPhase('ready');
    } catch {
      setError('Failed to load treasure hunt.');
      setPhase('ready');
    }
  };

  if (phase === 'loading') {
    return (
      <div className="treasure-hunt">
        <GameHeader title="Treasure Hunt" score={0} onBack={onBack} />
        <GameLoading message="Loading your treasure hunt..." />
      </div>
    );
  }

  const foundCount = hunt?.foundWords?.length || 0;
  const totalCount = hunt?.totalWords || 10;
  const progressPercent = (foundCount / totalCount) * 100;

  return (
    <div className="treasure-hunt">
      <GameHeader title="🗺️ Treasure Hunt" score={0} onBack={onBack} />

      <div className="th-game">

        {/* Month + Progress */}
        <div className="th-header">
          <p className="th-month">{hunt?.month || 'Monthly'} Challenge</p>
          <div className="th-progress-row">
            <div className="th-progress-track">
              <div className="th-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="th-progress-text">{foundCount}/{totalCount}</span>
          </div>
        </div>

        {/* Completed */}
        {hunt?.completed && (
          <div className="th-completed">
            <Trophy size={40} color="#f59e0b" />
            <h2>Treasure Hunt Complete!</h2>
            <p>You found all {totalCount} hidden vocabulary words this month!</p>
          </div>
        )}

        {/* Next clue */}
        {!hunt?.completed && hunt?.nextClue && (
          <div className="th-clue-card">
            <p className="th-clue-label">🔍 Next clue:</p>
            <p className="th-clue-text">{hunt.nextClue.clue}</p>
            <div className="th-clue-activity">
              <Lock size={14} />
              Complete: <b>{hunt.nextClue.unlockedBy?.replace(/_/g, ' ')}</b> to unlock
            </div>
          </div>
        )}

        {/* Found words */}
        {hunt?.foundWords?.length > 0 && (
          <div className="th-found-section">
            <h3 className="th-found-title">
              <Unlock size={16} /> Found Words ({foundCount})
            </h3>
            <div className="th-words-grid">
              {hunt.foundWords.map((word, i) => (
                <div key={i} className="th-word-card">
                  <span className="th-word-emoji">💎</span>
                  <span className="th-word-text">{word}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked words */}
        <div className="th-locked-section">
          <h3 className="th-locked-title">
            <Lock size={16} /> Remaining ({totalCount - foundCount})
          </h3>
          <div className="th-words-grid">
            {[...Array(totalCount - foundCount)].map((_, i) => (
              <div key={i} className="th-word-card th-word-card--locked">
                <span className="th-word-emoji">🔒</span>
                <span className="th-word-text">???</span>
              </div>
            ))}
          </div>
        </div>

        {/* How to unlock */}
        <div className="th-how-to">
          <h4>How to find treasure words:</h4>
          <div className="th-activities">
            {[
              { act: 'GRAMMAR_GAME',    label: 'Play Grammar Games',    emoji: '✍️' },
              { act: 'VOCABULARY_GAME', label: 'Play Vocabulary Games', emoji: '📚' },
              { act: 'BPO_GAME',        label: 'Play BPO Games',        emoji: '🏢' },
              { act: 'VOICE_SESSION',   label: 'Do Voice Sessions',     emoji: '🎙️' },
              { act: 'ASSESSMENT',      label: 'Complete Assessment',   emoji: '📝' },
            ].map((item, i) => (
              <div key={i} className="th-activity-item">
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="game-error">{error}</p>}
      </div>
    </div>
  );
}