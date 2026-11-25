import { useState } from 'react';
import type { Language } from '../lib/types';
import { tr } from '../lib/translations';

interface Props {
  lang: Language;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
}

function assistantReply(lang: Language, message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('quiz') || normalized.includes('prática') || normalized.includes('practicar')) {
    return lang === 'pt'
      ? 'Para praticar, abra a aba Praticar e escolha um sistema anatômico. Respostas diretas valem pontos extras.'
      : 'Para practicar, abre la pestaña Practicar y elige un sistema anatómico. Las respuestas directas valen puntos extra.';
  }
  if (normalized.includes('ponto') || normalized.includes('progres') || normalized.includes('punt')) {
    return lang === 'pt'
      ? 'Você pode acompanhar seus pontos, acertos e desempenho por sistema na aba Progresso.'
      : 'Puedes consultar tus puntos, aciertos y rendimiento por sistema en la pestaña Progreso.';
  }
  if (normalized.includes('prof') || normalized.includes('admin')) {
    return lang === 'pt'
      ? 'Professores podem acessar o painel Admin usando um e-mail institucional com identificação de docente.'
      : 'Los profesores pueden acceder al panel Admin usando un correo institucional con identificación docente.';
  }

  return lang === 'pt'
    ? 'Posso ajudar com o uso da plataforma, quizzes, pontuação ou conteúdos de anatomia veterinária. O que você gostaria de saber?'
    : 'Puedo ayudarte con la plataforma, los quizzes, la puntuación o contenidos de anatomía veterinaria. ¿Qué te gustaría saber?';
}

export default function ChatWidget({ lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: tr(lang, 'chatWelcome'), sender: 'assistant' },
  ]);

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages(current => [
      ...current,
      { id: Date.now(), text, sender: 'user' },
      { id: Date.now() + 1, text: assistantReply(lang, text), sender: 'assistant' },
    ]);
    setDraft('');
  };

  return (
    <div className="fixed right-4 bottom-4 md:right-6 md:bottom-6 z-50 flex flex-col items-end">
      {isOpen && (
        <section
          className="w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-7rem)] mb-3 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          aria-label={tr(lang, 'chatTitle')}
        >
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <path d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 0 1-8 8H6l-4 2 1.4-4.2A9 9 0 1 1 21 12Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{tr(lang, 'chatTitle')}</p>
              <p className="text-xs opacity-80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                {tr(lang, 'chatStatus')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label={tr(lang, 'chatClose')}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--bg)' }} aria-live="polite">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background: message.sender === 'user' ? 'var(--primary)' : 'var(--card)',
                    color: message.sender === 'user' ? 'var(--primary-fg)' : 'var(--card-fg)',
                    border: message.sender === 'assistant' ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              placeholder={tr(lang, 'chatPlaceholder')}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1px solid var(--border)' }}
              aria-label={tr(lang, 'chatPlaceholder')}
            />
            <button
              type="submit"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              disabled={!draft.trim()}
              aria-label={tr(lang, 'chatSend')}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                <path d="m22 2-7 20-4-9-9-4 20-7Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 2 11 13" strokeLinecap="round" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(current => !current)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        aria-label={tr(lang, isOpen ? 'chatClose' : 'chatOpen')}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2">
            <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="2">
            <path d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 0 1-8 8H6l-4 2 1.4-4.2A9 9 0 1 1 21 12Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
