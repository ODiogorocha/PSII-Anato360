import { useRef, useState } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigate = (next: View) => { onNavigate(next); setIsMenuOpen(false); };
  const navItems: { id: View; label: string; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: tr(lang, 'nav_dashboard') },
    { id: 'quiz', label: tr(lang, 'nav_quiz') },
    { id: 'progress', label: tr(lang, 'nav_progress') },
    { id: 'gallery', label: lang === 'pt' ? 'Imagens' : 'Imágenes' },
    { id: 'admin', label: tr(lang, 'nav_admin'), adminOnly: true },
  ];

  const initials = user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      onKeyDown={event => {
        if (event.key === 'Escape' && isMenuOpen) { setIsMenuOpen(false); menuButton.current?.focus(); }
      }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6"
      style={{
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <button
        type="button"
        className="font-display text-lg mr-3 lg:mr-8 min-h-11 shrink-0"
        style={{ color: 'var(--primary)' }}
        onClick={() => navigate('dashboard')}
      >
        Anato360
      </button>

      {/* Nav links */}
      <nav aria-label={lang === 'pt' ? 'Navegação principal' : 'Navegación principal'} className="hidden lg:flex items-center gap-1 flex-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            aria-current={view === item.id ? 'page' : undefined}
            className="min-h-11 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
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
      <div className="flex items-center gap-1 sm:gap-3 ml-auto">
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
          className="min-h-11 min-w-11 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
        >
          {lang === 'pt' ? 'ES' : 'PT'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="min-w-11 min-h-11 rounded-lg flex items-center justify-center text-base transition-all hover:opacity-70"
          style={{ color: 'var(--muted-fg)' }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2">
          <div
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="hidden lg:block min-h-11 px-2 text-xs hover:underline transition-all"
            style={{ color: 'var(--muted-fg)' }}
          >
            {tr(lang, 'nav_logout')}
          </button>
        </div>
        <button ref={menuButton} type="button" onClick={() => setIsMenuOpen(value => !value)} aria-expanded={isMenuOpen} aria-controls="mobile-navigation" aria-label={lang === 'pt' ? 'Menu de navegação' : 'Menú de navegación'} className="lg:hidden min-h-11 min-w-11 rounded-lg text-xl" style={{ color: 'var(--primary)' }}>{isMenuOpen ? '×' : '☰'}</button>
      </div>
      {isMenuOpen && <nav id="mobile-navigation" className="lg:hidden absolute top-full left-0 right-0 flex flex-col gap-1 p-3 border-b shadow-lg" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} aria-label={lang === 'pt' ? 'Navegação móvel' : 'Navegación móvil'}>
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => <button key={item.id} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined} className="min-h-11 px-4 py-2 rounded-lg text-left text-sm font-medium" style={{ background: view === item.id ? 'var(--muted)' : 'transparent', color: view === item.id ? 'var(--primary)' : 'var(--muted-fg)' }}>{item.label}</button>)}
        <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="min-h-11 px-4 py-2 rounded-lg text-left text-sm" style={{ color: 'var(--muted-fg)' }}>{tr(lang, 'nav_logout')}</button>
      </nav>}
    </header>
  );
}
