import { useState } from 'react';
import type { Language, Theme } from '../lib/types';
import { tr } from '../lib/translations';

interface Props {
  lang: Language;
  theme: Theme;
  onLogin: (email: string, name: string) => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
}

export default function LoginPage({ lang, theme, onLogin, onToggleLang, onToggleTheme }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(lang === 'pt' ? 'Preencha todos os campos.' : 'Complete todos los campos.');
      return;
    }
    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    onLogin(email, name);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-xl" style={{ color: 'var(--primary)' }}>Anato360</span>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleLang}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
          >
            {lang === 'pt' ? 'ES' : 'PT'}
          </button>
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Hero text */}
          <div className="mb-10 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{ background: 'var(--muted)', color: 'var(--primary)' }}
            >
              <span>🐾</span>
              <span>ZOO-00171 · Universidad Santo Tomás</span>
            </div>
            <h1 className="font-display text-4xl mb-3" style={{ lineHeight: 1.2 }}>
              {tr(lang, 'loginTitle')}
            </h1>
            <p className="text-base" style={{ color: 'var(--muted-fg)' }}>
              {tr(lang, 'loginSubtitle')}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 shadow-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>
                  {tr(lang, 'email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="ana.garcia@ust.cl"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--fg)',
                    border: '1.5px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'password')}
                  </label>
                  <button
                    type="button"
                    className="text-xs hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    {tr(lang, 'forgotPassword')}
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'var(--muted)',
                    color: 'var(--fg)',
                    border: '1.5px solid var(--border)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {tr(lang, 'loginButton')}
              </button>
            </form>

            <div
              className="mt-6 p-3 rounded-xl text-xs text-center"
              style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
            >
              💡 {tr(lang, 'demoHint')}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-8" style={{ color: 'var(--muted-fg)' }}>
            UFSM · Projeto de Software II · 2026
          </p>
        </div>
      </div>
    </div>
  );
}
