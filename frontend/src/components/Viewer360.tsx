import React, { useState } from 'react';
import type { Pergunta } from '../services/api';
import { RotateCw } from 'lucide-react';

interface Viewer360Props {
  frames: { numero_frame: number; imagem: string }[];
  perguntaAtual?: Pergunta;
}

export const Viewer360: React.FC<Viewer360Props> = ({ frames, perguntaAtual }) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const totalFrames = frames.length;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || totalFrames === 0) return;
    const deltaX = e.clientX - startX;

    if (Math.abs(deltaX) > 12) {
      const step = deltaX > 0 ? 1 : -1;
      setCurrentFrameIndex((prev) => (prev + step + totalFrames) % totalFrames);
      setStartX(e.clientX);
    }
  };

  const handlePointerUp = () => setIsDragging(false);

  const isArrowVisible = perguntaAtual && perguntaAtual.frame_alvo === currentFrameIndex;

  if (totalFrames === 0) {
    return (
      <div className="w-[450px] h-[450px] bg-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300">
        <RotateCw className="w-10 h-10 animate-spin text-slate-400 mb-2" />
        <p className="font-medium">Nenhum frame cadastrado para esta peça.</p>
      </div>
    );
  }

  const imagemAtual = frames[currentFrameIndex]?.imagem;

  return (
    <div className="flex flex-col items-center select-none">
      <div
        className="relative w-[450px] h-[450px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 cursor-grab active:cursor-grabbing flex items-center justify-center"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={imagemAtual}
          alt={`Frame ${currentFrameIndex}`}
          className="w-full h-full object-contain pointer-events-none"
        />

        {isArrowVisible && (
          <div
            className="absolute z-20 flex flex-col items-center pointer-events-none animate-bounce"
            style={{
              left: `${perguntaAtual.posicao_x}%`,
              top: `${perguntaAtual.posicao_y}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded shadow">
              Identifique
            </span>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600"></div>
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-slate-900/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
          {currentFrameIndex + 1} / {totalFrames} (360°)
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
        <RotateCw className="w-3.5 h-3.5" /> Arraste para girar a peça anatômica
      </p>
    </div>
  );
};