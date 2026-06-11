import { memo } from 'react';
import './Sidebar.css';
import { LayoutDashboard, ClipboardList, UserCircle, LogOut, Gamepad2, BookOpen } from 'lucide-react';

// ── Navigation items ─────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',   label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'assessment', label: 'Assessment', Icon: ClipboardList   },
  { id: 'modules',    label: 'Modules',    Icon: BookOpen        },
  { id: 'games',      label: 'Games',      Icon: Gamepad2        },
  { id: 'profile',    label: 'Profile',    Icon: UserCircle      },
];

/**
 * Main Sidebar — primary left navigation
 */
const Sidebar = memo(function Sidebar({ activePage, onNavigate, onLogout }) {
  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">

      {/* Brand Header */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.15)" />
            <path d="M10 12h12M10 16h8M10 20h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="23" cy="22" r="4" fill="rgba(255,255,255,0.2)" />
            <path d="M21.5 22h3M23 20.5v3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="sidebar__logo-text">
          <span className="sidebar__brand">VRM BUDDY</span>
          <span className="sidebar__tagline">AI Communication Buddy</span>
        </div>
      </div>

      <div className="sidebar__divider" />

      {/* Main Nav */}
      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">Menu</p>
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`sidebar__nav-item ${activePage === id ? 'sidebar__nav-item--active' : ''}`}
            onClick={() => onNavigate(id)}
            aria-current={activePage === id ? 'page' : undefined}
          >
            <span className="sidebar__nav-icon"><Icon size={20} /></span>
            <span className="sidebar__nav-label-text">{label}</span>
            {activePage === id && <span className="sidebar__nav-indicator" aria-hidden="true" />}
          </button>
        ))}
      </nav>

      <div className="sidebar__spacer" />
      <div className="sidebar__divider" />

      {/* Logout */}
      <div className="sidebar__logout-container">
        <button className="sidebar__logout-btn" onClick={onLogout} aria-label="Logout">
          <span className="sidebar__logout-icon"><LogOut size={20} /></span>
          <span className="sidebar__logout-text">Logout</span>
        </button>
      </div>

    </aside>
  );
});

export default Sidebar;