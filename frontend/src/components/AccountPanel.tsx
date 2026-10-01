import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';

type User = { id: number; email: string; nome: string; instituicao: string; is_admin: boolean };
type Session = { token: string; user: User };
type UploadedImage = {
  id: number;
  original_path: string;
  allow_sharing: boolean;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  error_message: string;
  created_at: string;
  annotations: { id: number; text: string; x: number; y: number }[];
};
type Notice = { id: number; message: string; is_read: boolean; created_at: string };
type Quiz = {
  largura: number;
  altura: number;
  perguntas: { id: number; pergunta: string; posicao: { x: number; y: number }; resposta_correta: string; opcoes: string[] }[];
};

const tokenConfig = (token: string) => ({ headers: { Authorization: `Token ${token}` } });
const statusLabel: Record<UploadedImage['status'], string> = {
  queued: 'Na fila',
  processing: 'Em processamento',
  ready: 'Pronta para estudar',
  failed: 'Falha no processamento',
};

function readSavedSession(): Session | null {
  try {
    const value = localStorage.getItem('anato360-session');
    return value ? JSON.parse(value) as Session : null;
  } catch {
    return null;
  }
}

export function AccountPanel() {
  const [session, setSession] = useState<Session | null>(readSavedSession);
  const [registering, setRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [instituicao, setInstituicao] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [sharing, setSharing] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizImageUrl, setQuizImageUrl] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [score, setScore] = useState(0);

  const refresh = useCallback(async (token: string) => {
    const config = tokenConfig(token);
    const [imageResponse, notificationResponse] = await Promise.all([
      api.get<UploadedImage[]>('imagens/', config),
      api.get<Notice[]>('notificacoes/', config),
    ]);
    setImages(imageResponse.data);
    setNotices(notificationResponse.data);
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const load = async () => {
      try {
        const [userResponse, imageResponse, notificationResponse] = await Promise.all([
          api.get<User>('auth/me/', tokenConfig(session.token)),
          api.get<UploadedImage[]>('imagens/', tokenConfig(session.token)),
          api.get<Notice[]>('notificacoes/', tokenConfig(session.token)),
        ]);
        if (active) {
          const renewedSession = { ...session, user: userResponse.data };
          setSession(renewedSession);
          localStorage.setItem('anato360-session', JSON.stringify(renewedSession));
          setImages(imageResponse.data);
          setNotices(notificationResponse.data);
        }
      } catch {
        if (active) {
          localStorage.removeItem('anato360-session');
          setSession(null);
        }
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void refresh(session.token).catch(() => undefined);
    }, 7000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [session?.token, refresh]);

  useEffect(() => () => {
    if (quizImageUrl) URL.revokeObjectURL(quizImageUrl);
  }, [quizImageUrl]);

  const finishLogin = (data: Session) => {
    localStorage.setItem('anato360-session', JSON.stringify(data));
    setSession(data);
    setPassword('');
    setError('');
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (registering) {
        const response = await api.post<Session>('auth/registro/', {
          email, nome, instituicao, password,
        });
        finishLogin(response.data);
      } else {
        const response = await api.post<Session>('auth/login/', { email, password });
        finishLogin(response.data);
      }
    } catch (requestError: any) {
      const detail = requestError.response?.data?.detail;
      const validation = requestError.response?.data;
      setError(detail || (typeof validation === 'object' ? Object.values(validation).flat().join(' ') : '') || 'Não foi possível concluir o acesso.');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (!session) return;
    try { await api.post('auth/logout/', {}, tokenConfig(session.token)); } catch { /* sessão local sempre é encerrada */ }
    localStorage.removeItem('anato360-session');
    setSession(null);
    setImages([]);
    setNotices([]);
    setQuiz(null);
    setQuizImageUrl('');
  };

  const uploadImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem('image') as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('original_file', file);
    data.append('allow_sharing', String(sharing));
    setBusy(true);
    setError('');
    try {
      await api.post('imagens/', data, tokenConfig(session.token));
      fileInput.value = '';
      await refresh(session.token);
    } catch (requestError: any) {
      const validation = requestError.response?.data;
      setError(typeof validation === 'object' ? Object.values(validation).flat().join(' ') : 'Não foi possível enviar a imagem.');
    } finally {
      setBusy(false);
    }
  };

  const openQuiz = async (imageId: number) => {
    if (!session) return;
    setError('');
    try {
      const [quizResponse, fileResponse] = await Promise.all([
        api.get<Quiz>(`imagens/${imageId}/quiz/`, tokenConfig(session.token)),
        api.get<Blob>(`imagens/${imageId}/arquivo/processada/`, { ...tokenConfig(session.token), responseType: 'blob' }),
      ]);
      if (quizResponse.data.perguntas.length === 0) {
        setError('Nenhum rótulo foi reconhecido nesta imagem para criar perguntas de quiz.');
        return;
      }
      setQuizImageUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(fileResponse.data);
      });
      setQuiz(quizResponse.data);
      setQuizIndex(0);
      setQuizAnswer('');
      setScore(0);
    } catch {
      setError('O quiz estará disponível quando o processamento terminar e houver rótulos reconhecidos.');
    }
  };

  const unreadNotices = notices.filter((notice) => !notice.is_read);
  const currentQuestion = quiz?.perguntas[quizIndex];

  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-800">Conta e imagens de estudo</h2>
          {session ? (
            <p className="text-sm text-slate-500">{session.user.nome} · {session.user.instituicao}</p>
          ) : (
            <p className="text-sm text-slate-500">Entre ou crie uma conta para enviar imagens anatômicas.</p>
          )}
        </div>
        {session && <button onClick={logout} className="text-sm text-indigo-700 font-semibold hover:underline">Sair</button>}
      </div>

      {!session ? (
        <form onSubmit={submitAuth} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {registering && <>
            <input required value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome" className="border rounded-lg p-2.5" />
            <input required value={instituicao} onChange={(event) => setInstituicao(event.target.value)} placeholder="Instituição" className="border rounded-lg p-2.5" />
          </>}
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail" className="border rounded-lg p-2.5" />
          <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha (mínimo 8 caracteres)" className="border rounded-lg p-2.5" />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button disabled={busy} className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50">
              {busy ? 'Aguarde…' : registering ? 'Criar conta' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setRegistering(!registering); setError(''); }} className="text-sm text-indigo-700 hover:underline">
              {registering ? 'Já tenho conta' : 'Criar cadastro'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <form onSubmit={uploadImage} className="flex flex-col sm:flex-row sm:items-end gap-3 border-t border-slate-100 pt-4">
            <label className="flex-1 text-sm font-medium text-slate-700">
              Enviar imagem (JPEG, PNG, WebP, BMP ou TIFF; até 20 MB)
              <input required name="image" type="file" accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff" className="block w-full mt-1 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={sharing} onChange={(event) => setSharing(event.target.checked)} />
              Permitir uso por outros estudantes
            </label>
            <button disabled={busy} className="bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold disabled:opacity-50">
              {busy ? 'Enviando…' : 'Enviar e processar'}
            </button>
          </form>

          {unreadNotices.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900" aria-live="polite">
              <strong>Atualizações:</strong>
              <ul className="list-disc ml-5 mt-1">{unreadNotices.slice(0, 5).map((notice) => <li key={notice.id}>
                {notice.message}{' '}
                <button onClick={() => {
                  void api.post(`notificacoes/${notice.id}/marcar-lida/`, {}, tokenConfig(session.token))
                    .then(() => setNotices((items) => items.map((item) => item.id === notice.id ? { ...item, is_read: true } : item)))
                    .catch(() => setError('Não foi possível atualizar o aviso.'));
                }} className="text-xs underline">Marcar como lida</button>
              </li>)}</ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Imagens e processamento</h3>
            {images.length === 0 ? <p className="text-sm text-slate-500">Você ainda não enviou imagens.</p> : images.map((image) => (
              <article key={image.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-800">Imagem #{image.id}</p>
                  <p className="text-xs text-slate-500">{statusLabel[image.status]}{image.allow_sharing ? ' · compartilhada' : ''}</p>
                  {image.status === 'failed' && <p className="text-xs text-rose-700 mt-1">{image.error_message}</p>}
                </div>
                {image.status === 'ready' && <button onClick={() => void openQuiz(image.id)} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-semibold">Estudar imagem</button>}
              </article>
            ))}
          </div>

          {quiz && (
            <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Quiz da imagem · {score} acertos</h3>
                <button onClick={() => setQuiz(null)} className="text-sm text-slate-500 hover:underline">Fechar</button>
              </div>
              {quizImageUrl && <div className="relative self-center max-w-full">
                <img src={quizImageUrl} alt="Imagem anatômica sem rótulos" className="max-h-96 max-w-full rounded-lg border object-contain" />
                {currentQuestion && <span
                  aria-label="Posição da pergunta"
                  className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600 text-white border-2 border-white shadow flex items-center justify-center text-sm font-bold"
                  style={{ left: `${(currentQuestion.posicao.x / Math.max(1, quiz.largura - 1)) * 100}%`, top: `${(currentQuestion.posicao.y / Math.max(1, quiz.altura - 1)) * 100}%` }}
                >?</span>}
              </div>}
              {currentQuestion ? (
                <div className="flex flex-col gap-2">
                  <p className="font-medium text-slate-700">Pergunta {quizIndex + 1} de {quiz.perguntas.length}: {currentQuestion.pergunta}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentQuestion.opcoes.map((option) => (
                      <button key={option} disabled={!!quizAnswer} onClick={() => {
                        setQuizAnswer(option);
                        if (option === currentQuestion.resposta_correta) setScore((value) => value + 1);
                      }} className={`rounded-lg border p-2.5 text-left ${quizAnswer === option ? (option === currentQuestion.resposta_correta ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400') : 'hover:bg-indigo-50'}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                  {quizAnswer && <div className="flex items-center justify-between text-sm">
                    <span className={quizAnswer === currentQuestion.resposta_correta ? 'text-emerald-700' : 'text-rose-700'}>
                      {quizAnswer === currentQuestion.resposta_correta ? 'Correto!' : `Resposta: ${currentQuestion.resposta_correta}`}
                    </span>
                    <button onClick={() => { setQuizIndex((value) => value + 1); setQuizAnswer(''); }} className="font-semibold text-indigo-700">
                      {quizIndex + 1 === quiz.perguntas.length ? 'Concluir' : 'Próxima pergunta'}
                    </button>
                  </div>}
                </div>
              ) : <p className="text-sm text-slate-600">Quiz concluído. Pontuação: {score}/{quiz.perguntas.length}.</p>}
            </div>
          )}
        </>
      )}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <p className="text-xs text-slate-400">O processamento continua no servidor. O status e os avisos ficam salvos na conta, mesmo se você sair desta página.</p>
    </section>
  );
}
