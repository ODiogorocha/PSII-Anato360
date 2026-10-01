// src/services/api.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/',
  timeout: 15000,
});

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Não foi possível conectar ao servidor. Tente novamente.';
    const data = error.response.data;
    if (typeof data === 'string') return 'O servidor não conseguiu concluir a solicitação.';
    const messages = Object.values(data || {}).flat().filter(value => typeof value === 'string');
    return messages.join(' ') || 'Não foi possível concluir a solicitação.';
  }
  return error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.';
}

export interface ImageAnnotation {
  id: number;
  text: string;
  text_es?: string;
  confirmed?: boolean;
  x: number;
  y: number;
  posicao_normalizada: { x: number; y: number } | null;
}

export interface UploadedImage {
  id: number;
  title: string;
  title_es?: string;
  description: string;
  category: string;
  owner_id: number;
  owner_name: string;
  allow_sharing: boolean;
  use_ollama: boolean;
  status: 'queued' | 'processing' | 'ready' | 'failed';
  processed_path: string;
  annotations: ImageAnnotation[];
  error_message: string;
  processing_metadata: Record<string, unknown>;
  created_at: string;
}

export async function imageBlob(id: number, processed = false): Promise<string> {
  const { data } = await api.get(`imagens/${id}/arquivo/${processed ? 'processada' : 'original'}/`, { responseType: 'blob' });
  return URL.createObjectURL(data);
}

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  instituicao: string;
  is_admin: boolean;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

const AUTH_STORAGE_KEY = 'anato360-auth-session';

export function readAuthSession(): AuthSession | null {
  try {
    const serialized = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!serialized) return null;
    const session = JSON.parse(serialized) as AuthSession;
    return session.token && session.user?.email ? session : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

api.interceptors.request.use((config) => {
  const session = readAuthSession();
  if (session?.token) {
    config.headers.Authorization = `Token ${session.token}`;
  }
  return config;
});

// ✅ Interface para tipagem das perguntas
export interface Pergunta {
  id: number;
  frame_alvo: number;
  posicao_x: number;
  posicao_y: number;
  resposta_correta: string;
  sinonimos: string;
  opcoes: string[];
  pontos_recall: number;
  pontos_multipla_escolha: number;
}

export interface Frame {
  numero_frame: number;
  imagem: string;
}

// ✅ Interface para tipagem das peças anatômicas
export interface PecaAnatomica {
  id: number;
  nome: string;
  descricao: string;
  sistema: number;
  sistema_nome: string;
  arquivo_3d?: string;
  total_frames: number;
  frames: Frame[];
  perguntas: Pergunta[];
}
