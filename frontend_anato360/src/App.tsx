import { useState, useEffect } from 'react';
import type { Language, Theme, View, UserStats, AnatomySystem, AppUser, Question } from './lib/types';
import type { QuizResult } from './lib/types';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import QuizPage from './components/QuizPage';
import ProgressPage from './components/ProgressPage';
import AdminPage from './components/AdminPage';

const ADMIN_KEYWORDS = ['prof', 'admin', 'teacher', 'docente', 'profesor'];

function isAdminEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return ADMIN_KEYWORDS.some(kw => lower.includes(kw));
}

export default function App() {
  const [view, setView] = useState<View>('login');
  const [theme, setTheme] = useState<Theme>('light');
  const [lang, setLang] = useState<Language>('pt');
  const [user, setUser] = useState<AppUser | null>(null);
  const [stats, setStats] = useState<UserStats>({ totalPoints: 0, results: [] });
  const [quizSystem, setQuizSystem] = useState<AnatomySystem>('all');
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  const toggleLang = () => setLang(l => (l === 'pt' ? 'es' : 'pt'));

  const handleLogin = (email: string, name: string) => {
    setUser({ name, email, isAdmin: isAdminEmail(email) });
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const handleStartQuiz = (system: AnatomySystem) => {
    setQuizSystem(system);
    setView('quiz');
  };

  const handleQuizComplete = (results: QuizResult[]) => {
    setStats(prev => ({
      totalPoints: prev.totalPoints + results.reduce((s, r) => s + r.points, 0),
      results: [...prev.results, ...results],
    }));
    setView('dashboard');
  };

  const handleSaveQuestions = (questions: Question[]) => {
    setCustomQuestions(prev => [...prev, ...questions]);
  };

  if (view === 'login' || !user) {
    return (
      <LoginPage
        lang={lang}
        theme={theme}
        onLogin={handleLogin}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
      />
    );
  }

  const isAdmin = !!user.isAdmin;

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <Navbar
        lang={lang}
        theme={theme}
        user={user}
        view={view}
        stats={stats}
        isAdmin={isAdmin}
        onNavigate={setView}
        onToggleLang={toggleLang}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
      <main className="pt-16">
        {view === 'dashboard' && (
          <Dashboard
            lang={lang}
            stats={stats}
            user={user}
            customQuestionsCount={customQuestions.length}
            onStartQuiz={handleStartQuiz}
          />
        )}
        {view === 'quiz' && (
          <QuizPage
            lang={lang}
            system={quizSystem}
            extraQuestions={customQuestions}
            onComplete={handleQuizComplete}
            onBack={() => setView('dashboard')}
          />
        )}
        {view === 'progress' && (
          <ProgressPage lang={lang} stats={stats} />
        )}
        {view === 'admin' && isAdmin && (
          <AdminPage lang={lang} onSaveQuestions={handleSaveQuestions} />
        )}
        {view === 'admin' && !isAdmin && (
          <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <p className="text-4xl mb-4">🔒</p>
            <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--fg)' }}>
              {lang === 'pt' ? 'Acesso restrito' : 'Acceso restringido'}
            </h2>
            <p style={{ color: 'var(--muted-fg)' }}>
              {lang === 'pt'
                ? 'Use um e-mail de professor para acessar esta área. Ex: prof@ust.cl'
                : 'Use un correo de profesor para acceder a esta área. Ej: prof@ust.cl'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
