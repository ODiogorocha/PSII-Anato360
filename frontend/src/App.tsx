import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import type { Language, Theme, View, UserStats, AnatomySystem, AppUser } from './lib/types';
import { api, apiError, clearAuthSession, readAuthSession, saveAuthSession } from './services/api';
import type { AuthSession, AuthUser } from './services/api';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuizPage from './components/QuizPage';
import ProgressPage from './components/ProgressPage';
import AdminPage from './components/AdminPage';
import GalleryPage from './components/GalleryPage';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => readAuthSession());
  const [view, setView] = useState<View>('dashboard');
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('anato360-theme') === 'dark' ? 'dark' : 'light');
  const [lang, setLang] = useState<Language>(() => localStorage.getItem('anato360-lang') === 'es' ? 'es' : 'pt');
  const [stats, setStats] = useState<UserStats>({ totalPoints: 0, results: [] });
  const [questionsCount, setQuestionsCount] = useState(0);
  const [quizSystem, setQuizSystem] = useState<AnatomySystem>('all');
  const [error, setError] = useState('');
  const [editingImageId, setEditingImageId] = useState<number | undefined>();
  const [checkingSession, setCheckingSession] = useState(!!session);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [view, session?.user.id]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('anato360-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'es';
    localStorage.setItem('anato360-lang', lang);
  }, [lang]);

  const refreshStats = useCallback(async () => {
    const token = readAuthSession()?.token;
    if (!token) return;
    try {
      const [progress, dashboard] = await Promise.all([
        api.get<UserStats>('progresso/'), api.get<{ questions: number }>('dashboard/'),
      ]);
      if (readAuthSession()?.token !== token) return;
      setStats(progress.data);
      setQuestionsCount(dashboard.data.questions);
      setError('');
    } catch (reason) { if (readAuthSession()?.token === token) setError(apiError(reason)); }
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    let active = true;
    api.get<AuthUser>('auth/me/').then(({ data }) => {
      if (!active) return;
      const updated = { token: session.token, user: data };
      saveAuthSession(updated);
      setSession(updated);
      void refreshStats();
    }).catch((reason) => {
      if (!active) return;
      if ([401, 403].includes(reason.response?.status)) {
        clearAuthSession(); setSession(null);
      } else { setError(apiError(reason)); }
    }).finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [session?.token, refreshStats]);

  const handleLogin = async (email: string, password: string, registration?: { nome: string; instituicao: string }) => {
    const { data } = await api.post<AuthSession>(registration ? 'auth/registro/' : 'auth/login/', { email, password, ...registration });
    saveAuthSession(data);
    setSession(data);
    setStats({ totalPoints: 0, results: [] });
    setError('');
    setView('dashboard');
  };

  const handleLogout = async () => {
    try { await api.post('auth/logout/'); } finally {
      clearAuthSession(); setSession(null); setStats({ totalPoints: 0, results: [] }); setError('');
    }
  };
  const navigate = (next: View) => {
    if (next === 'admin' || next === 'upload') setEditingImageId(undefined);
    setView(next);
    if (next === 'progress' || next === 'dashboard') void refreshStats();
  };
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(l => l === 'pt' ? 'es' : 'pt');

  if (!session) return <LoginPage lang={lang} theme={theme} onLogin={handleLogin} onToggleLang={toggleLang} onToggleTheme={toggleTheme} />;
  if (checkingSession) return <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--primary)' }}>Anato360 · {lang === 'pt' ? 'Carregando...' : 'Cargando...'}</main>;

  const user: AppUser = { id: session.user.id, name: session.user.nome || session.user.email.split('@')[0], email: session.user.email, isAdmin: session.user.is_admin };
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <Navbar lang={lang} theme={theme} user={user} view={view} stats={stats} isAdmin={!!user.isAdmin} onNavigate={navigate} onToggleLang={toggleLang} onToggleTheme={toggleTheme} onLogout={() => { void handleLogout().catch(() => {}); }} />
      <main className="pt-16 pb-20 md:pb-0">
        {error && <div role="alert" className="max-w-5xl mx-auto px-4 pt-5 text-sm" style={{ color: 'var(--accent)' }}>{error} <button onClick={() => void refreshStats()} className="underline">{lang === 'pt' ? 'Tentar novamente' : 'Reintentar'}</button></div>}
        {view === 'dashboard' && <Dashboard lang={lang} stats={stats} user={user} customQuestionsCount={questionsCount} onStartQuiz={system => { setQuizSystem(system); setView('quiz'); }} />}
        {view === 'quiz' && <QuizPage lang={lang} system={quizSystem} onComplete={() => navigate('dashboard')} onBack={() => navigate('dashboard')} />}
        {view === 'progress' && <ProgressPage lang={lang} stats={stats} />}
        {view === 'gallery' && <GalleryPage lang={lang} user={user} onUpload={() => { setEditingImageId(undefined); setView('upload'); }} onEdit={id => { setEditingImageId(id); setView('upload'); }} />}
        {(view === 'upload' || (view === 'admin' && user.isAdmin)) && <AdminPage key={`${view}-${editingImageId || 'new'}`} lang={lang} isAdmin={!!user.isAdmin} imageId={editingImageId} onSaved={() => void refreshStats()} />}
      </main>
      <ChatWidget lang={lang} />
    </div>
  );
}
