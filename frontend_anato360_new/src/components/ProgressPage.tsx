import type { Language, UserStats, AnatomySystem } from '../lib/types';
import { tr, systemName } from '../lib/translations';

interface Props {
  lang: Language;
  stats: UserStats;
}

const SYSTEMS: Array<Exclude<AnatomySystem, 'all'>> = [
  'skeletal', 'muscular', 'digestive', 'respiratory', 'circulatory',
];

const SYSTEM_ICONS: Record<string, string> = {
  skeletal: '🦴',
  muscular: '💪',
  digestive: '🫀',
  respiratory: '🫁',
  circulatory: '❤️',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ProgressPage({ lang, stats }: Props) {
  const total = stats.results.length;
  const correct = stats.results.filter(r => r.correct).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const openCorrect = stats.results.filter(r => r.usedOpenAnswer && r.correct).length;

  // Per system stats
  const systemStats = SYSTEMS.map(sys => {
    const sysResults = stats.results.filter(r => r.system === sys);
    const sysCorrect = sysResults.filter(r => r.correct).length;
    const sysTotal = sysResults.length;
    const sysPoints = sysResults.reduce((s, r) => s + r.points, 0);
    const sysAccuracy = sysTotal > 0 ? Math.round((sysCorrect / sysTotal) * 100) : 0;
    return { sys, sysTotal, sysCorrect, sysPoints, sysAccuracy };
  }).filter(s => s.sysTotal > 0);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl mb-2" style={{ color: 'var(--fg)' }}>
          {tr(lang, 'progressTitle')}
        </h1>
        <p style={{ color: 'var(--muted-fg)' }}>{tr(lang, 'progressSub')}</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: tr(lang, 'totalPoints'), value: stats.totalPoints.toLocaleString(), icon: '★' },
          { label: tr(lang, 'accuracy'), value: `${accuracy}%`, icon: '🎯' },
          { label: tr(lang, 'correctAnswers'), value: `${correct}/${total}`, icon: '✅' },
          { label: tr(lang, 'openAnswer'), value: String(openCorrect), icon: '⚡' },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-2xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="text-xl mb-2">{item.icon}</div>
            <div className="font-mono-data text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>
              {item.value}
            </div>
            <div className="text-xs" style={{ color: 'var(--muted-fg)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Performance by system */}
      {systemStats.length > 0 && (
        <div className="mb-10">
          <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--fg)' }}>
            {tr(lang, 'performanceBySystem')}
          </h2>
          <div className="space-y-3">
            {systemStats.map(({ sys, sysTotal, sysCorrect, sysPoints, sysAccuracy }) => (
              <div
                key={sys}
                className="rounded-xl p-4"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{SYSTEM_ICONS[sys]}</span>
                    <span className="font-medium text-sm" style={{ color: 'var(--fg)' }}>
                      {systemName(lang, sys)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span style={{ color: 'var(--muted-fg)' }}>
                      {sysCorrect}/{sysTotal}
                    </span>
                    <span className="font-mono-data font-semibold" style={{ color: 'var(--primary)' }}>
                      +{sysPoints}pts
                    </span>
                  </div>
                </div>
                {/* Accuracy bar */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--muted)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${sysAccuracy}%`,
                        background: sysAccuracy >= 70 ? '#16a34a' : sysAccuracy >= 40 ? 'var(--accent)' : '#dc2626',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono-data w-8 text-right" style={{ color: 'var(--muted-fg)' }}>
                    {sysAccuracy}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="font-semibold text-base mb-4" style={{ color: 'var(--fg)' }}>
          {tr(lang, 'recentActivity')}
        </h2>

        {stats.results.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
          >
            <p className="text-4xl mb-3">🐾</p>
            <p>{tr(lang, 'noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...stats.results].reverse().slice(0, 20).map((r, i) => (
              <div
                key={r.questionId + i}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--muted)' }}
              >
                <span>{r.correct ? '✅' : '❌'}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium" style={{ color: 'var(--fg)' }}>
                    {lang === 'pt' ? r.correct_pt : r.correct_es}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--muted-fg)' }}>
                    {SYSTEM_ICONS[r.system]} {systemName(lang, r.system)}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-mono-data font-semibold text-xs"
                    style={{ color: r.correct ? 'var(--primary)' : 'var(--muted-fg)' }}
                  >
                    {r.correct ? `+${r.points}` : '0'}pts
                  </div>
                  {r.usedOpenAnswer && r.correct && (
                    <div className="text-xs" style={{ color: 'var(--accent)' }}>⚡ ×2</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
