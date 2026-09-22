import React, { useState } from 'react';

interface Mensagem {
  autor: 'aluno' | 'ia';
  texto: string;
}

export default function SidebarChat() {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { autor: 'ia', texto: 'Olá! Sou o teu assistente de anatomia veterinária. Como te posso ajudar hoje?' }
  ]);
  const [carregando, setCarregando] = useState(false);

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pergunta.trim() || carregando) return;

    const novaMensagemUsuario = pergunta;
    setMensagens(prev => [...prev, { autor: 'aluno', texto: novaMensagemUsuario }]);
    setPergunta('');
    setCarregando(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ia/perguntar/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: novaMensagemUsuario })
      });

      const data = await response.json();
      const respostaIA = data.resposta || 'Desculpa, ocorreu um erro ao consultar os dados anatómicos.';

      setMensagens(prev => [...prev, { autor: 'ia', texto: respostaIA }]);
    } catch (error) {
      setMensagens(prev => [...prev, { autor: 'ia', texto: 'Erro de conexão com o servidor de IA.' }]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Botão flutuante para abrir/fechar o chat */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg flex items-center gap-2 transition"
        >
          💬 <span>Assistente Anato360</span>
        </button>
      )}

      {/* Janela lateral do Chatbot */}
      {aberto && (
        <div className="w-80 md:w-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col h-[500px]">
          {/* Cabeçalho */}
          <div className="bg-blue-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
            <h3 className="font-semibold">Assistente de Estudo (Ollama)</h3>
            <button 
              onClick={() => setAberto(false)}
              className="text-white hover:text-gray-200 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {/* Histórico de Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
            {mensagens.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl max-w-[85%] text-sm ${
                  msg.autor === 'aluno'
                    ? 'ml-auto bg-blue-600 text-white rounded-br-none'
                    : 'mr-auto bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.texto}
              </div>
            ))}
            {carregando && (
              <div className="mr-auto bg-white text-gray-500 p-3 rounded-xl border border-gray-200 text-sm animate-pulse">
                A consultar base de dados anatómicos...
              </div>
            )}
          </div>

          {/* Input de Envio */}
          <form onSubmit={enviarMensagem} className="p-3 bg-white border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Pergunta sobre anatomia..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={carregando}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}