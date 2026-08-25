import { useEffect, useState } from 'react';
import { api } from './services/api';
import type { Pergunta, PecaAnatomica } from './services/api';
import { Viewer360 } from './components/Viewer360';
import { ModelViewer3D } from './components/ModelViewer3D';
import { Trophy, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

export function App() {
  const [pecas, setPecas] = useState<PecaAnatomica[]>([]);
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaAnatomica | null>(null);
  const [indicePergunta, setIndicePergunta] = useState(0);
  const [respostaAberta, setRespostaAberta] = useState('');
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
  const [pontuacao, setPontuacao] = useState(0);
  const [feedback, setFeedback] = useState<{ correto: boolean; texto: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState<string | null>(null);

  useEffect(() => {
    api.get<PecaAnatomica[]>('pecas/')
      .then((res) => {
        setPecas(res.data || []);
        if (res.data && res.data.length > 0) {
          setPecaSelecionada(res.data[0]);
        }
        setCarregando(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar peças:", err);
        setErroApi("Não foi possível conectar ao back-end Django. Verifique se o servidor na porta 8000 está ativo.");
        setCarregando(false);
      });
  }, []);

  const perguntasLista = pecaSelecionada?.perguntas || [];
  const perguntaAtual: Pergunta | undefined = perguntasLista[indicePergunta];

  const normalizar = (txt: string) =>
    (txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  const handleValidarResposta = (respostaEscolhida: string, isRecall: boolean) => {
    if (!perguntaAtual || feedback) return;

    const respostaNormalizada = normalizar(respostaEscolhida);
    const corretaNormalizada = normalizar(perguntaAtual.resposta_correta);
    const sinonimos = perguntaAtual.sinonimos
      ? perguntaAtual.sinonimos.split(',').map((s) => normalizar(s))
      : [];

    const acertou = respostaNormalizada === corretaNormalizada || sinonimos.includes(respostaNormalizada);

    if (acertou) {
      const pontosGanhos = isRecall ? (perguntaAtual.pontos_recall || 20) : (perguntaAtual.pontos_multipla_escolha || 10);
      setPontuacao((prev) => prev + pontosGanhos);
      setFeedback({
        correto: true,
        texto: `Correto! +${pontosGanhos} pontos (${isRecall ? 'Recall Ativo' : 'Múltipla Escolha'}).`,
      });
    } else {
      setFeedback({
        correto: false,
        texto: `Incorreto. A resposta correta é: ${perguntaAtual.resposta_correta}.`,
      });
    }
  };

  const proximaPergunta = () => {
    setFeedback(null);
    setRespostaAberta('');
    setMostrarOpcoes(false);
    if (perguntasLista.length > 0 && indicePergunta + 1 < perguntasLista.length) {
      setIndicePergunta((prev) => prev + 1);
    } else {
      setIndicePergunta(0);
    }
  };

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 font-semibold animate-pulse">Carregando dados do Anato360...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col gap-6 font-sans">
      {/* Topo / Placar */}
      <header className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Anato360</h1>
          <p className="text-sm text-slate-500">ZOO-00171 • Universidad Santo Tomás & UFSM</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg">
          <Trophy className="text-amber-500 w-5 h-5" />
          <span className="font-bold text-amber-900">{pontuacao} pts</span>
        </div>
      </header>

      {/* Alerta de erro de conexão com API */}
      {erroApi && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm">
          <strong>Aviso de Conexão:</strong> {erroApi}
        </div>
      )}

      {/* Seletor de Peças */}
      {pecas.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {pecas.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPecaSelecionada(p);
                setIndicePergunta(0);
                setFeedback(null);
                setRespostaAberta('');
                setMostrarOpcoes(false);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                pecaSelecionada?.id === p.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      {/* Área Central */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Lado Esquerdo: Visualizador Inteligente (3D Real ou 360 Frames) */}
        <section className="flex justify-center">
          {pecaSelecionada?.arquivo_3d ? (
            <ModelViewer3D modelUrl={pecaSelecionada.arquivo_3d} />
          ) : (
            <Viewer360
              frames={pecaSelecionada?.frames || []}
              perguntaAtual={perguntaAtual}
            />
          )}
        </section>

        {/* Lado Direito: Quiz */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="border-b pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              {pecaSelecionada?.sistema_nome || "Sistema Anatômico"}
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              {pecaSelecionada?.nome || "Nenhuma peça cadastrada"}
            </h2>
          </div>

          {perguntaAtual ? (
            <div className="flex flex-col gap-4">
              {!mostrarOpcoes ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm text-indigo-900">
                    💡 <strong>Desafio de Recall:</strong> Digite o nome da estrutura anatômica e ganhe {perguntaAtual.pontos_recall || 20} pts.
                  </div>
                  <input
                    type="text"
                    value={respostaAberta}
                    onChange={(e) => setRespostaAberta(e.target.value)}
                    disabled={!!feedback}
                    placeholder="Digite o nome da estrutura anatômica..."
                    className="border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleValidarResposta(respostaAberta, true)}
                      disabled={!respostaAberta.trim() || !!feedback}
                      className="flex-1 bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
                    >
                      Confirmar Resposta
                    </button>
                    <button
                      onClick={() => setMostrarOpcoes(true)}
                      disabled={!!feedback}
                      className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition text-sm cursor-pointer"
                    >
                      Ver Alternativas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-500 mb-1">
                    Selecione uma opção ({perguntaAtual.pontos_multipla_escolha || 10} pts):
                  </span>
                  {(perguntaAtual.opcoes || []).map((opcao, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleValidarResposta(opcao, false)}
                      disabled={!!feedback}
                      className="p-3 text-left border rounded-lg border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition font-medium text-slate-700 disabled:pointer-events-none cursor-pointer"
                    >
                      {opcao}
                    </button>
                  ))}
                </div>
              )}

              {feedback && (
                <div className={`p-4 rounded-lg flex items-center justify-between ${feedback.correto ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
                  <div className="flex items-center gap-2 font-medium text-sm">
                    {feedback.correto ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                    <span>{feedback.texto}</span>
                  </div>
                  <button
                    onClick={proximaPergunta}
                    className="flex items-center gap-1 bg-white border border-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-md hover:bg-slate-50 font-semibold shadow-sm cursor-pointer"
                  >
                    Próxima <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {pecaSelecionada ? "Cadastre perguntas para esta peça no Django Admin (/admin)." : "Cadastre uma peça no Django Admin para iniciar o quiz."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default App;