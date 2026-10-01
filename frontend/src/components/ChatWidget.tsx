import { useState, useEffect, useRef } from 'react';
import { api, apiError } from '../services/api';
import type { UploadedImage } from '../services/api';
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

export default function ChatWidget({ lang }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [availability, setAvailability] = useState<'checking' | 'ready' | 'model_missing' | 'unavailable'>('checking');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imageId, setImageId] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    let active = true;
    api.get<Array<{ id: number; role: 'user' | 'assistant'; content: string }>>('ia/historico/').then(({ data }) => {
      if (!active) return;
      setMessages(data.map(message => ({ id: message.id, sender: message.role, text: message.content })));
      setHistoryLoaded(true);
      setError('');
    }).catch(reason => { if (active) setError(apiError(reason)); });
    return () => { active = false; };
  }, [isOpen, historyLoaded, historyVersion]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const check = () => api.get<{ status: 'ready' | 'model_missing' | 'unavailable' }>('ia/status/')
      .then(({ data }) => { if (active) setAvailability(data.status); })
      .catch(() => { if (active) setAvailability('unavailable'); });
    void check();
    api.get<UploadedImage[]>('imagens/').then(({ data }) => { if (active) setImages(data); })
      .catch(reason => { if (active) setError(apiError(reason)); });
    const timer = window.setInterval(() => void check(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isOpen]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy, isOpen]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || !historyLoaded) return;
    setBusy(true);
    setError('');
    const pendingId = -Date.now();
    setMessages(current => [...current, { id: pendingId, text, sender: 'user' }]);
    setDraft('');
    try {
      const { data } = await api.post<{ resposta: string; messages?: Array<{ id: number; role: 'user' | 'assistant'; content: string }> }>('ia/perguntar/', {
        pergunta: text, idioma: lang, ...(imageId ? { imagem_id: Number(imageId) } : {}),
      }, { timeout: 360000 });
      setMessages(current => data.messages
        ? [...current.filter(message => message.id !== pendingId), ...data.messages.map(message => ({ id: message.id, text: message.content, sender: message.role }))]
        : [...current, { id: Date.now(), text: data.resposta, sender: 'assistant' }]);
    } catch (reason) {
      setError(apiError(reason));
      setMessages(current => current.filter(message => message.id !== pendingId));
      setDraft(text);
    } finally { setBusy(false); }
  };

  const clearHistory = async () => {
    if (busy || !historyLoaded) return;
    try { await api.delete('ia/historico/'); setMessages([]); setError(''); }
    catch (reason) { setError(apiError(reason)); }
  };

  return (
    <div className="fixed right-4 bottom-20 md:right-6 md:bottom-6 z-50 flex flex-col items-end">
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
                <span className={`w-1.5 h-1.5 rounded-full ${availability === 'ready' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                {busy ? (lang === 'pt' ? 'Respondendo...' : 'Respondiendo...') : availability === 'ready' ? tr(lang, 'chatStatus') : availability === 'model_missing' ? (lang === 'pt' ? 'Preparando o assistente...' : 'Preparando el asistente...') : availability === 'checking' ? (lang === 'pt' ? 'Conectando...' : 'Conectando...') : (lang === 'pt' ? 'Temporariamente indisponível' : 'Temporalmente no disponible')}
              </p>
            </div>
            <button type="button" disabled={busy || !historyLoaded} onClick={() => void clearHistory()} className="text-xs underline disabled:opacity-40">{lang === 'pt' ? 'Limpar' : 'Limpiar'}</button>
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

          {images.length > 0 && <label className="px-4 py-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
            {lang === 'pt' ? 'Imagem em estudo' : 'Imagen en estudio'}
            <select value={imageId} onChange={event => setImageId(event.target.value)} disabled={busy} className="w-full mt-1 p-2 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--fg)' }}>
              <option value="">{lang === 'pt' ? 'Conversa geral' : 'Conversación general'}</option>
              {images.map(item => <option key={item.id} value={item.id}>{(lang === 'es' ? item.title_es : item.title) || item.title || `#${item.id}`}</option>)}
            </select>
          </label>}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--bg)' }} aria-live="polite">
            {messages.length === 0 && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--muted-fg)' }}>{tr(lang, 'chatWelcome')}</p>}
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
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
            {busy && <p className="text-sm animate-pulse" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Consultando o assistente...' : 'Consultando al asistente...'}</p>}
            {error && <p role="alert" className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
            {!historyLoaded && error && <button onClick={() => setHistoryVersion(value => value + 1)} className="text-sm underline">{lang === 'pt' ? 'Recarregar conversa' : 'Recargar conversación'}</button>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
            <input
              value={draft}
              maxLength={4000}
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
              disabled={!draft.trim() || busy || !historyLoaded}
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
