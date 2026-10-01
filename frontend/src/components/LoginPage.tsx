import { useState } from 'react';
import type { Language, Theme } from '../lib/types';
import { apiError } from '../services/api';
import { tr } from '../lib/translations';

interface Props {
  lang: Language;
  theme: Theme;
  onLogin: (email: string, password: string, registration?: { nome: string; instituicao: string }) => Promise<void>;
  onToggleLang: () => void;
  onToggleTheme: () => void;
}

export default function LoginPage({ lang, theme, onLogin, onToggleLang, onToggleTheme }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [institution, setInstitution] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!email.trim() || !password.trim() || (mode === 'register' && (!name.trim() || !institution.trim()))) {
      setError(lang === 'pt' ? 'Preencha todos os campos.' : 'Complete todos los campos.');
      return;
    }
    if (mode === 'register' && password.length < 8) {
      setError(lang === 'pt' ? 'A senha deve ter pelo menos 8 caracteres.' : 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError(lang === 'pt' ? 'As senhas não coincidem.' : 'Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onLogin(email.trim(), password, mode === 'register' ? { nome: name.trim(), instituicao: institution.trim() } : undefined);
    } catch (reason) { setError(apiError(reason)); }
    finally { setBusy(false); }
  };

  const changeMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
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
              {tr(lang, mode === 'login' ? 'loginTitle' : 'registerTitle')}
            </h1>
            <p className="text-base" style={{ color: 'var(--muted-fg)' }}>
              {tr(lang, mode === 'login' ? 'loginSubtitle' : 'registerSubtitle')}
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8 shadow-sm"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'fullName')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    placeholder={lang === 'pt' ? 'Ana García' : 'Ana García'}
                    autoComplete="name"
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
              )}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>
                  {tr(lang, 'email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="ana.garcia@ust.cl"
                  autoComplete="email"
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
                  {mode === 'login' && (
                    <button
                      onClick={() => setError(lang === 'pt' ? 'Solicite a redefinição de senha ao administrador da sua instituição.' : 'Solicite el restablecimiento al administrador de su institución.')}
                      type="button"
                      className="text-xs hover:underline"
                      style={{ color: 'var(--primary)' }}
                    >
                      {tr(lang, 'forgotPassword')}
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'confirmPassword')}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
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
              )}

              {mode === 'register' && <div>
                <label htmlFor="institution" className="block text-sm font-medium mb-2" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Instituição' : 'Institución'}</label>
                <input id="institution" value={institution} onChange={e => setInstitution(e.target.value)} required placeholder="UFSM / Universidad Santo Tomás" className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1.5px solid var(--border)' }} />
              </div>}
              {error && (
                <p role="alert" className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {busy ? (lang === 'pt' ? 'Aguarde...' : 'Espere...') : tr(lang, mode === 'login' ? 'loginButton' : 'registerButton')}
              </button>
            </form>

            {mode === 'login' && (
              <div
                className="mt-6 p-3 rounded-xl text-xs text-center"
                style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
              >
                {lang === 'pt' ? 'Entre com sua conta institucional ou crie uma conta para começar.' : 'Ingrese con su cuenta institucional o cree una cuenta para empezar.'}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-6 text-sm" style={{ color: 'var(--muted-fg)' }}>
              <span>{tr(lang, mode === 'login' ? 'noAccount' : 'alreadyHaveAccount')}</span>
              <button
                type="button"
                onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}
                className="font-semibold hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                {tr(lang, mode === 'login' ? 'createAccount' : 'backToLogin')}
              </button>
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
