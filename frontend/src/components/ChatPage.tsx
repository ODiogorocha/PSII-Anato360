import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, FileText, LoaderCircle, Send, Sparkles, Upload } from 'lucide-react';
import type { Language } from '../lib/types';
import { api } from '../services/api';

type Message = { role: 'assistant' | 'user'; text: string };

function readSavedPdf(): string {
  try { return sessionStorage.getItem('anato360-chat-pdf') || ''; } catch { return ''; }
}

function getApiError(error: unknown): string {
  const response = (error as { response?: { data?: { erro?: string; detail?: string } } })?.response;
  return response?.data?.erro || response?.data?.detail || 'Não foi possível falar com a API. Confira se os serviços estão ativos.';
}

export default function ChatPage({ lang }: { lang: Language }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = sessionStorage.getItem('anato360-chat-messages');
      if (saved) return JSON.parse(saved) as Message[];
    } catch { /* inicia uma conversa nova se o histórico local estiver inválido */ }
    return [{
      role: 'assistant',
      text: lang === 'pt'
        ? 'Olá! Envie um PDF de estudo para eu indexar e depois faça sua pergunta. As respostas usam o conteúdo do material.'
        : '¡Hola! Sube un PDF de estudio para indexarlo y luego haz tu pregunta. Las respuestas usan el contenido del material.',
    }];
  });
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfName, setPdfName] = useState(readSavedPdf);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, sending]);
  useEffect(() => {
    sessionStorage.setItem('anato360-chat-messages', JSON.stringify(messages));
  }, [messages]);

  const uploadPdf = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('pdf') as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('pdf', file);
    setUploading(true);
    setError('');
    try {
      await api.post('ia/upload-pdf/', data);
      setPdfName(file.name);
      sessionStorage.setItem('anato360-chat-pdf', file.name);
      setMessages((current) => [...current, {
        role: 'assistant',
        text: lang === 'pt'
          ? `PDF “${file.name}” indexado. Pode perguntar sobre o material.`
          : `PDF “${file.name}” indexado. Ya puedes preguntar sobre el material.`,
      }]);
      input.value = '';
    } catch (uploadError) {
      setError(getApiError(uploadError));
    } finally {
      setUploading(false);
    }
  };

  const sendQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || sending) return;
    setQuestion('');
    setError('');
    setMessages((current) => [...current, { role: 'user', text }]);
    setSending(true);
    try {
      const response = await api.post<{ resposta: string }>('ia/perguntar/', { pergunta: text }, { timeout: 120000 });
      setMessages((current) => [...current, { role: 'assistant', text: response.data.resposta }]);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-4xl flex-col py-8" style={{ minHeight: 'calc(100vh - 6rem)' }}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            <Sparkles size={16} /> Ollama · Anato360
          </div>
          <h1 className="font-display text-3xl">{lang === 'pt' ? 'Assistente de estudos' : 'Asistente de estudio'}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
            {lang === 'pt' ? 'Converse com o material de estudo enviado.' : 'Pregunta sobre el material de estudio que subiste.'}
          </p>
        </div>
        <form onSubmit={uploadPdf} className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-75" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <Upload size={16} />
            {uploading ? (lang === 'pt' ? 'Indexando…' : 'Indexando…') : (lang === 'pt' ? 'Enviar PDF' : 'Subir PDF')}
            <input className="sr-only" name="pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => {
              if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit();
            }} disabled={uploading} />
          </label>
        </form>
      </header>

      {pdfName && (
        <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>
          <FileText size={16} /> <span>{lang === 'pt' ? 'Material indexado:' : 'Material indexado:'} {pdfName}</span>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border p-4 md:p-6" style={{ background: 'var(--card)', borderColor: 'var(--border)', minHeight: 320, maxHeight: '60vh' }} aria-live="polite">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: message.role === 'assistant' ? 'var(--muted)' : 'var(--primary)', color: message.role === 'assistant' ? 'var(--primary)' : 'var(--primary-fg)' }}>
              {message.role === 'assistant' ? <Bot size={17} /> : <span className="text-xs font-bold">EU</span>}
            </div>
            <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed" style={{ background: message.role === 'user' ? 'var(--primary)' : 'var(--muted)', color: message.role === 'user' ? 'var(--primary-fg)' : 'var(--fg)' }}>
              {message.text}
            </p>
          </div>
        ))}
        {sending && <div className="flex items-center gap-2 pl-11 text-sm" style={{ color: 'var(--muted-fg)' }}><LoaderCircle size={16} className="animate-spin" /> {lang === 'pt' ? 'Ollama está preparando a resposta…' : 'Ollama está preparando la respuesta…'}</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--accent)', color: 'var(--fg)', background: 'var(--card)' }}>{error}</p>}

      <form onSubmit={sendQuestion} className="mt-3 flex gap-2 rounded-2xl border p-2" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={lang === 'pt' ? 'Pergunte sobre o PDF…' : 'Pregunta sobre el PDF…'}
          aria-label={lang === 'pt' ? 'Sua pergunta' : 'Tu pregunta'}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          style={{ color: 'var(--fg)' }}
          disabled={sending}
        />
        <button type="submit" disabled={!question.trim() || sending} aria-label={lang === 'pt' ? 'Enviar pergunta' : 'Enviar pregunta'} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-50" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          <Send size={17} />
        </button>
      </form>
      <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
        {lang === 'pt' ? 'O serviço de chat usa o Ollama no backend. Envie um PDF após reiniciar os serviços para indexar o conteúdo.' : 'El chat usa Ollama en el backend. Sube un PDF después de reiniciar los servicios para indexar el contenido.'}
      </p>
    </section>
  );
}
