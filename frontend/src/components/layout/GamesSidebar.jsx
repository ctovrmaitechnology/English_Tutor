import { Gamepad2 } from 'lucide-react';
import { GAMES } from './Sidebar';
import './GamesSidebar.css';

/**
 * GamesSidebar — Secondary panel that slides in beside the main sidebar
 * when the user navigates to the Games section.
 *
 * Props:
 * - activeGame: currently selected game id
 * - onGameSelect: callback(gameId) to navigate to a game
 */
export default function GamesSidebar({ activeGame, onGameSelect }) {
  return (
    <aside className="games-sidebar" aria-label="Games navigation">
      {/* Header */}
      <div className="games-sidebar__header">
        <Gamepad2 size={18} />
        <span>Games</span>
      </div>

      <div className="games-sidebar__divider" />

      {/* Game list */}
      <nav className="games-sidebar__list">
        {GAMES.map(({ id, emoji, label, color, tag }) => (
          <button
            key={id}
            className={`games-sidebar__item ${activeGame === id ? 'games-sidebar__item--active' : ''}`}
            style={{ '--gc': color }}
            onClick={() => onGameSelect(id)}
            aria-pressed={activeGame === id}
          >
            <span className="games-sidebar__emoji">{emoji}</span>
            <div className="games-sidebar__info">
              <span className="games-sidebar__label">{label}</span>
              <span className="games-sidebar__tag" style={{ color }}>{tag}</span>
            </div>
            {activeGame === id && <span className="games-sidebar__dot" />}
          </button>
        ))}
      </nav>
    </aside>
  );
}
