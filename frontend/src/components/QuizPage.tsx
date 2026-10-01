import { useState, useRef, useEffect } from 'react';
import type { Language, AnatomySystem, QuizResult } from '../lib/types';
import { tr } from '../lib/translations';
import { api, apiError, imageBlob } from '../services/api';
import type { Question } from '../lib/types';
import Viewer360 from './Viewer360';

const POINTS_MCQ = 10;

type Phase = 'open' | 'revealed' | 'feedback';

interface Props {
  lang: Language;
  system: AnatomySystem;
  onComplete: (results: QuizResult[]) => void;
  onBack: () => void;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export default function QuizPage({ lang, system, onComplete, onBack }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const answered = useRef(new Set<string>());
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('open');
  const [openInput, setOpenInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ correct: boolean; points: number; usedOpen: boolean } | null>(null);
  const [sessionResults, setSessionResults] = useState<QuizResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[index];

  useEffect(() => {
    setOpenInput('');
    setSelectedOption(null);
    setPhase('open');
    setLastResult(null);
    if (inputRef.current) inputRef.current.focus();
  }, [index]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get<Question[]>('quiz/perguntas/', { params: { system, limit: 15 } }).then(({ data }) => {
      if (active) { setQuestions(data); setError(''); }
    }).catch(reason => { if (active) setError(apiError(reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [system]);

  useEffect(() => {
    let active = true;
    let url = '';
    setImageUrl('');
    if (!q) return;
    if (q.image_id) {
      imageBlob(q.image_id, true).then(value => {
        url = value;
        if (active) setImageUrl(value); else URL.revokeObjectURL(value);
      }).catch(reason => { if (active) setError(apiError(reason)); });
    } else { setImageUrl(q.imageUrl); }
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [q]);

  const correctAnswer = q ? (lang === 'pt' ? q.correct_pt : q.correct_es) : '';
  const options = q ? (lang === 'pt' ? q.options_pt : q.options_es) : [];

  const submitAnswer = async (answer: string, usedOpen: boolean) => {
    if (!q || busy || answered.current.has(q.id)) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post<{ correct: boolean; points: number; requires_choice: boolean; result?: QuizResult }>('quiz/responder/', { question_id: q.id, answer, used_open_answer: usedOpen });
      if (data.requires_choice) { setPhase('revealed'); return; }
      if (!data.result) throw new Error(lang === 'pt' ? 'Resposta inválida do servidor.' : 'Respuesta inválida del servidor.');
      answered.current.add(q.id);
      setSessionResults(previous => [...previous, data.result!]);
      setLastResult({ correct: data.correct, points: data.points, usedOpen });
      setPhase('feedback');
    } catch (reason) { setError(apiError(reason)); setSelectedOption(null); }
    finally { setBusy(false); }
  };

  const handleOpenSubmit = () => { if (openInput.trim()) void submitAnswer(openInput.trim(), true); };
  const handleReveal = () => { if (!busy) setPhase('revealed'); };
  const handleOptionSelect = (option: string) => {
    if (phase !== 'revealed' || busy) return;
    setSelectedOption(option);
    void submitAnswer(option, false);
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setIsComplete(true);
    } else {
      setIndex(i => i + 1);
    }
  };

  if (loading || !q) return <div className="max-w-2xl mx-auto px-4 py-12 text-center">
    <h1 className="font-display text-3xl mb-4">{lang === 'pt' ? 'Praticar anatomia' : 'Practicar anatomía'}</h1>
    <p role={error ? 'alert' : undefined} style={{ color: error ? 'var(--accent)' : 'var(--muted-fg)' }}>{loading ? (lang === 'pt' ? 'Carregando questões...' : 'Cargando preguntas...') : error || (lang === 'pt' ? 'Nenhuma questão disponível para este sistema. Envie uma imagem e confirme seus rótulos para começar.' : 'No hay preguntas disponibles. Envíe una imagen y confirme sus etiquetas para empezar.')}</p>
    <button onClick={onBack} className="mt-6 px-5 py-3 rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>← {tr(lang, 'backToDashboard')}</button>
  </div>;

  if (isComplete) {
    const total = sessionResults.reduce((s, r) => s + r.points, 0);
    const correct = sessionResults.filter(r => r.correct).length;

    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
          style={{ background: 'var(--muted)' }}
        >
          🎉
        </div>
        <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--fg)' }}>
          {tr(lang, 'quizComplete')}
        </h1>
        <p className="mb-8" style={{ color: 'var(--muted-fg)' }}>
          {tr(lang, 'sessionSummary')}
        </p>

        {/* Score summary */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div
            className="font-mono-data text-5xl font-bold mb-2"
            style={{ color: 'var(--primary)' }}
          >
            +{total}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>{tr(lang, 'totalEarned')}</p>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center">
              <div className="font-mono-data text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                {correct}/{questions.length}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
                {tr(lang, 'correctAnswers')}
              </div>
            </div>
            <div className="text-center">
              <div className="font-mono-data text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                {questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0}%
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted-fg)' }}>
                {tr(lang, 'accuracy')}
              </div>
            </div>
          </div>
        </div>

        {/* Per-question review */}
        <div className="space-y-2 mb-8 text-left">
          {sessionResults.map((r, i) => (
            <div
              key={r.questionId + i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'var(--muted)' }}
            >
              <span className="text-base">{r.correct ? '✅' : '❌'}</span>
              <span className="flex-1" style={{ color: 'var(--fg)' }}>
                {lang === 'pt' ? r.correct_pt : r.correct_es}
              </span>
              <span
                className="font-mono-data font-semibold text-xs"
                style={{ color: r.correct ? 'var(--primary)' : 'var(--muted-fg)' }}
              >
                +{r.points}pts
              </span>
              {r.usedOpenAnswer && r.correct && (
                <span className="text-xs" style={{ color: 'var(--accent)' }}>×2</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => onComplete(sessionResults)}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          {tr(lang, 'backToDashboard')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-sm flex items-center gap-1 hover:opacity-70 transition-all"
          style={{ color: 'var(--muted-fg)' }}
        >
          ← {tr(lang, 'backToDashboard')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            {tr(lang, 'questionOf')} {index + 1} {tr(lang, 'of')} {questions.length}
          </span>
          {/* Progress bar */}
          <div
            className="w-32 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--muted)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((index + 1) / questions.length) * 100}%`,
                background: 'var(--primary)',
              }}
            />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
      {/* 360° Viewer */}
      <Viewer360
        imageUrl={imageUrl}
        imageAlt={lang === 'pt' ? q.imageAlt_pt : q.imageAlt_es}
        marker={q.marker}
        lang={lang}
      />

      {/* Quiz area */}
      <div
        className="mt-5 rounded-2xl p-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <h2 className="font-display text-xl mb-5" style={{ color: 'var(--fg)' }}>
          {tr(lang, 'quizTitle')}
        </h2>

        {/* FEEDBACK phase */}
        {phase === 'feedback' && lastResult && (
          <div>
            <div
              className="flex items-center gap-3 p-4 rounded-xl mb-4"
              style={{
                background: lastResult.correct ? '#16a34a18' : '#dc262618',
                border: `1px solid ${lastResult.correct ? '#16a34a40' : '#dc262640'}`,
              }}
            >
              <span className="text-2xl">{lastResult.correct ? '✅' : '❌'}</span>
              <div>
                <p className="font-semibold text-base" style={{ color: lastResult.correct ? '#16a34a' : '#dc2626' }}>
                  {lastResult.correct ? tr(lang, 'correct') : tr(lang, 'incorrect')}
                </p>
                <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                  {tr(lang, 'correctAnswer')} <strong style={{ color: 'var(--fg)' }}>{correctAnswer}</strong>
                </p>
              </div>
              {lastResult.points > 0 && (
                <div className="ml-auto text-right">
                  <div
                    className="font-mono-data font-bold text-lg"
                    style={{ color: 'var(--primary)' }}
                  >
                    +{lastResult.points}
                  </div>
                  {lastResult.usedOpen && lastResult.correct && (
                    <div className="text-xs" style={{ color: 'var(--accent)' }}>×2 bônus</div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              {index + 1 >= questions.length
                ? (lang === 'pt' ? 'Ver resultado' : 'Ver resultado')
                : tr(lang, 'nextQuestion')} →
            </button>
          </div>
        )}

        {/* OPEN phase */}
        {phase === 'open' && (
          <div className="space-y-4">
            {/* Bonus hint */}
            <div
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
              style={{ background: `var(--muted)`, color: 'var(--accent)' }}
            >
              <span>⚡</span>
              <span className="font-medium">{tr(lang, 'openBonus')}</span>
            </div>

            <label className="block text-sm font-medium" style={{ color: 'var(--muted-fg)' }}>
              {tr(lang, 'openAnswerLabel')}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={openInput}
              onChange={e => setOpenInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleOpenSubmit()}
              placeholder={tr(lang, 'openAnswerPlaceholder')}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'var(--muted)',
                color: 'var(--fg)',
                border: '1.5px solid var(--border)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />

            <div className="flex gap-3">
              <button
                onClick={handleOpenSubmit}
                disabled={!openInput.trim() || busy}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                {busy ? '...' : tr(lang, 'checkAnswer')}
              </button>
              <button
                onClick={handleReveal}
                disabled={busy}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80 border"
                style={{
                  background: 'transparent',
                  color: 'var(--muted-fg)',
                  borderColor: 'var(--border)',
                }}
              >
                {tr(lang, 'showOptions')}
              </button>
            </div>
          </div>
        )}

        {/* REVEALED / MCQ phase */}
        {phase === 'revealed' && (
          <div className="space-y-3">
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--muted-fg)' }}>
              {tr(lang, 'openAnswerLabel')}
            </p>
            {options.map(option => {
              const isSelected = selectedOption === option;
              const isCorrect = normalize(option) === normalize(correctAnswer);
              let bg = 'var(--muted)';
              let color = 'var(--fg)';
              let borderColor = 'transparent';
              if (isSelected) {
                bg = isCorrect ? '#16a34a18' : '#dc262618';
                borderColor = isCorrect ? '#16a34a60' : '#dc262660';
                color = isCorrect ? '#16a34a' : '#dc2626';
              }

              return (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  disabled={selectedOption !== null || busy}
                  className="w-full text-left px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:cursor-default"
                  style={{
                    background: bg,
                    color,
                    border: `1.5px solid ${borderColor}`,
                  }}
                >
                  {option}
                </button>
              );
            })}
            <p className="text-xs text-center pt-2" style={{ color: 'var(--muted-fg)' }}>
              {tr(lang, 'multipleChoice')} · {POINTS_MCQ} pts
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
