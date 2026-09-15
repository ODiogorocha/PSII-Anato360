import type { Language, Theme, View, UserStats, AppUser } from '../lib/types';
import { tr } from '../lib/translations';

interface Props {
  lang: Language;
  theme: Theme;
  user: AppUser;
  view: View;
  stats: UserStats;
  isAdmin: boolean;
  onNavigate: (v: View) => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export default function Navbar({
  lang, theme, user, view, stats, isAdmin,
  onNavigate, onToggleLang, onToggleTheme, onLogout,
}: Props) {
  const navItems: { id: View; label: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: tr(lang, 'nav_dashboard') },
    { id: 'quiz', label: tr(lang, 'nav_quiz') },
    { id: 'progress', label: tr(lang, 'nav_progress') },
    { id: 'admin', label: tr(lang, 'nav_admin'), adminOnly: true },
  ];

  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6"
      style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div
        className="font-display text-lg mr-8 cursor-pointer"
        style={{ color: 'var(--primary)' }}
        onClick={() => onNavigate('dashboard')}
      >
        Anato360
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-1 flex-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              background: view === item.id ? 'var(--muted)' : 'transparent',
              color: view === item.id ? 'var(--primary)' : 'var(--muted-fg)',
            }}
          >
            {item.adminOnly && <span className="text-xs">🎓</span>}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Score badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold font-mono-data"
          style={{ background: 'var(--muted)', color: 'var(--primary)' }}
        >
          <span>★</span>
          <span>{stats.totalPoints.toLocaleString()}</span>
        </div>

        {/* Language toggle */}
        <button
          onClick={onToggleLang}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
        >
          {lang === 'pt' ? 'ES' : 'PT'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all hover:opacity-70"
          style={{ color: 'var(--muted-fg)' }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="hidden md:block text-xs hover:underline transition-all"
            style={{ color: 'var(--muted-fg)' }}
          >
            {tr(lang, 'nav_logout')}
          </button>
        </div>
      </div>
    </header>
  );
}
