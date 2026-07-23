import { memo } from 'react';
import './Sidebar.css';
import { LayoutDashboard, ClipboardList, UserCircle, LogOut, Gamepad2, BookOpen, BarChart2, CalendarCheck, Dumbbell, Lock } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',   label: 'Dashboard',  Icon: LayoutDashboard, requiresEntry: false },
  { id: 'assessment', label: 'Assessment', Icon: ClipboardList,   requiresEntry: false },
  { id: 'modules',    label: 'Modules',    Icon: BookOpen,        requiresEntry: true  },
  { id: 'games',      label: 'Games',      Icon: Gamepad2,        requiresEntry: true  },
  { id: 'profile',    label: 'Profile',    Icon: UserCircle,      requiresEntry: false },
];

const PROGRESS_ITEMS = [
  { id: 'progress',         label: 'My Progress',  Icon: BarChart2,     requiresEntry: true },
  { id: 'weekly',           label: 'Weekly Test',  Icon: CalendarCheck, requiresEntry: true },
  { id: 'practice-session', label: 'Practice',     Icon: Dumbbell,      requiresEntry: true },
];

const Sidebar = memo(function Sidebar({ activePage, onNavigate, onLogout, hasCompletedEntryTest = true }) {
  const renderItem = ({ id, label, Icon, requiresEntry }) => {
    const isLocked = requiresEntry && !hasCompletedEntryTest;
    const isActive = activePage === id;

    return (
      <button
        key={id}
        id={`nav-${id}`}
        className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''} ${isLocked ? 'sidebar__nav-item--locked' : ''}`}
        onClick={() => !isLocked && onNavigate(id)}
        aria-current={isActive ? 'page' : undefined}
        title={isLocked ? 'Complete Entry Test to unlock' : label}
        style={{ opacity: isLocked ? 0.5 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
      >
        <span className="sidebar__nav-icon"><Icon size={20} /></span>
        <span className="sidebar__nav-label-text">{label}</span>
        {isLocked
          ? <Lock size={12} style={{ marginLeft:'auto', color:'#94a3b8' }} />
          : isActive
          ? <span className="sidebar__nav-indicator" aria-hidden="true" />
          : null
        }
      </button>
    );
  };

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
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

      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">Menu</p>
        {NAV_ITEMS.map(renderItem)}
      </nav>

      <div className="sidebar__divider" />

      <nav className="sidebar__nav">
        <p className="sidebar__nav-label">My Learning</p>
        {PROGRESS_ITEMS.map(renderItem)}
      </nav>

      <div className="sidebar__spacer" />
      <div className="sidebar__divider" />

      {!hasCompletedEntryTest && (
        <div style={{ padding:'12px 16px', margin:'0 12px 12px', background:'rgba(99,102,241,0.15)', borderRadius:10, border:'1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontSize:11, color:'#a5b4fc', fontWeight:700, marginBottom:4 }}>🎯 Next Step</div>
          <div style={{ fontSize:11, color:'#c7d2fe', lineHeight:1.4 }}>Complete your Entry Test to unlock all features</div>
        </div>
      )}

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