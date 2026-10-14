import React, { useState } from 'react';

export default function UploadPDFPage({ lang }: { lang: 'pt' | 'es' }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/ia/upload-pdf/', {
        method: 'POST',
        body: formData, // O browser define automaticamente o multipart/form-data
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(data.mensagem || 'PDF indexado com sucesso!');
        setFile(null);
      } else {
        setMessage(data.erro || 'Erro ao carregar o PDF.');
      }
    } catch (error) {
      setMessage('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10">
      <h2 className="text-xl font-bold mb-4 text-gray-800">
        {lang === 'pt' ? 'Gerir Base de Conhecimento (PDFs)' : 'Gestionar Base de Conocimiento (PDFs)'}
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        {lang === 'pt' 
          ? 'Envie documentos PDF de anatomia veterinária para que a IA os utilize como contexto nas respostas do chat.' 
          : 'Sube documentos PDF de anatomía veterinaria para que la IA los use como contexto.'}
      </p>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer text-blue-600 hover:underline">
            {file ? file.name : (lang === 'pt' ? 'Clique para selecionar um PDF' : 'Haz clic para seleccionar un PDF')}
          </label>
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? (lang === 'pt' ? 'A indexar com Ollama...' : 'Indexando...') : (lang === 'pt' ? 'Enviar e Indexar PDF' : 'Subir e Indexar PDF')}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-gray-50 border rounded-lg text-sm text-center text-gray-700">
          {message}
        </div>
      )}
    </div>
  );
}