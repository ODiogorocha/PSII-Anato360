import type { Language, UserStats, AppUser, AnatomySystem } from '../lib/types';
import { tr, systemName, systemDesc } from '../lib/translations';

interface Props {
  lang: Language;
  stats: UserStats;
  user: AppUser;
  customQuestionsCount: number;
  onStartQuiz: (system: AnatomySystem) => void;
}

const systems: Array<{ id: Exclude<AnatomySystem, 'all'>; icon: string; color: string }> = [
  { id: 'skeletal', icon: '🦴', color: '#4b9e6b' },
  { id: 'muscular', icon: '💪', color: '#e86b2b' },
  { id: 'digestive', icon: '🫀', color: '#9b4bb8' },
  { id: 'respiratory', icon: '🫁', color: '#2b8be8' },
  { id: 'circulatory', icon: '❤️', color: '#e84b4b' },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-fg)' }}>{label}</p>
      <p className="font-mono-data text-2xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>{sub}</p>}
    </div>
  );
}

export default function Dashboard({ lang, stats, user, customQuestionsCount, onStartQuiz }: Props) {
  const correct = stats.results.filter(r => r.correct).length;
  const total = stats.results.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
      {/* Welcome */}
      <div className="mb-10">
        <p className="text-sm mb-1" style={{ color: 'var(--muted-fg)' }}>
          {tr(lang, 'welcome')}, {user.name.split(' ')[0]} 👋
        </p>
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--fg)' }}>
          {tr(lang, 'welcomeSub')}
        </h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard
          label={tr(lang, 'totalPoints')}
          value={stats.totalPoints.toLocaleString()}
        />
        <StatCard
          label={tr(lang, 'correctAnswers')}
          value={String(correct)}
        />
        <StatCard
          label={tr(lang, 'totalAnswered')}
          value={String(total)}
        />
        <StatCard
          label={tr(lang, 'accuracy')}
          value={`${accuracy}%`}
        />
      </div>

      {/* All systems card */}
      <button
        onClick={() => onStartQuiz('all')}
        className="w-full mb-6 rounded-2xl p-6 text-left transition-all hover:opacity-90 active:scale-[0.99]"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl mb-2">🐾</div>
            <h2 className="font-display text-2xl mb-1">{systemName(lang, 'all')}</h2>
            <p className="text-sm opacity-80">{systemDesc(lang, 'all')}</p>
            {customQuestionsCount > 0 && (
              <div className="mt-2 text-xs font-medium opacity-90">
                +{customQuestionsCount} {lang === 'pt' ? 'questões do professor' : 'preguntas del profesor'}
              </div>
            )}
          </div>
          <div
            className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl text-2xl"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            →
          </div>
        </div>
      </button>

      {/* System grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map(sys => (
          <button
            key={sys.id}
            onClick={() => onStartQuiz(sys.id)}
            className="rounded-2xl p-6 text-left transition-all hover:opacity-90 active:scale-[0.99] group"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
              style={{ background: `${sys.color}18` }}
            >
              {sys.icon}
            </div>
            <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--fg)' }}>
              {systemName(lang, sys.id)}
            </h3>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              {systemDesc(lang, sys.id)}
            </p>
            <div
              className="mt-4 text-xs font-semibold"
              style={{ color: sys.color }}
            >
              {tr(lang, 'startQuiz')} →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
