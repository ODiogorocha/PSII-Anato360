// src/services/api.ts
import axios from 'axios';

// ✅ Instância do Axios para comunicação com o backend Django
export const api = axios.create({
  baseURL: 'http://localhost:8000/api/', // ajuste conforme sua rota real
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
