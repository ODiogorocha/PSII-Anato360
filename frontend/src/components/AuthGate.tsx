import { useState } from 'react';
import axios from 'axios';
import { api } from '../services/api';
import type { AuthSession } from '../services/api';

interface Props {
  apiOnline: boolean | null;
  checkingApi: boolean;
  onRetryApi: () => void;
  onAuthenticated: (session: AuthSession) => void;
}

type Mode = 'login' | 'register';

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return 'Não foi possível concluir a solicitação. Tente novamente.';

  const data = error.response?.data as Record<string, unknown> | undefined;
  if (typeof data?.detail === 'string') return data.detail;
  if (data) {
    const messages = Object.entries(data).flatMap(([field, value]) => {
      const label = field === 'email' ? 'E-mail' : field === 'password' ? 'Senha' : field;
      const parts = Array.isArray(value) ? value : [value];
      return parts.filter((part): part is string => typeof part === 'string').map((part) => `${label}: ${part}`);
    });
    if (messages.length) return messages.join(' ');
  }
  if (!error.response) return 'A API não respondeu. Confira se o Docker Compose está ativo e tente novamente.';
  return `A solicitação falhou (HTTP ${error.response.status}). Tente novamente.`;
}

export default function AuthGate({ apiOnline, checkingApi, onRetryApi, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmation) {
      setError('As senhas não correspondem.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === 'register' ? 'auth/registro/' : 'auth/login/';
      const payload = mode === 'register'
        ? { nome: name.trim(), email: email.trim(), instituicao: institution.trim(), password }
        : { email: email.trim(), password };
      const response = await api.post<AuthSession>(endpoint, payload);
      if (!response.data?.token || !response.data?.user) {
        throw new Error('A resposta da API não contém uma sessão válida.');
      }
      onAuthenticated(response.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-700">Anato360</h1>
          <p className="mt-2 text-sm text-slate-600">Universidad Santo Tomás &amp; UFSM</p>
        </header>

        {apiOnline === false && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <span><strong>Aviso de Conexão:</strong> Não foi possível conectar à API. Confira se os serviços do Docker Compose estão ativos. Inicie o Compose e tente novamente.</span>
            <button type="button" onClick={onRetryApi} disabled={checkingApi} className="shrink-0 rounded-lg border border-amber-400 px-3 py-2 font-semibold disabled:opacity-50">
              {checkingApi ? 'Verificando…' : 'Tentar novamente'}
            </button>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex gap-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Acesso à conta">
            <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => changeMode('login')} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
              Entrar
            </button>
            <button type="button" role="tab" aria-selected={mode === 'register'} onClick={() => changeMode('register')} className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
              Criar conta
            </button>
          </div>

          <h2 className="mb-5 text-xl font-bold">{mode === 'register' ? 'Cadastro de usuário' : 'Acesse sua conta'}</h2>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nome completo
                  <input required maxLength={150} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Instituição
                  <input required maxLength={180} autoComplete="organization" value={institution} onChange={(event) => setInstitution(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
              </>
            )}

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              E-mail
              <input required type="email" maxLength={150} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Senha
              <input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </label>
            {mode === 'register' && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Confirme a senha
                <input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </label>
            )}

            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <button type="submit" disabled={submitting} className="mt-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {submitting ? 'Aguarde…' : mode === 'register' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">Seus dados são enviados somente para a API do Anato360.</p>
        </section>
      </div>
    </main>
  );
}
