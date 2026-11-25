import { useRef, useState, useEffect } from 'react';
import type { Language } from '../lib/types';

interface Props {
  imageUrl: string;
  imageAlt: string;
  marker?: { x: number; y: number };
  lang: Language;
}

export default function Viewer360({ imageUrl, imageAlt, marker, lang }: Props) {
  const [rotY, setRotY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const startX = useRef(0);
  const startRotY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ width: 4, height: 3 });
  const [imageSize, setImageSize] = useState({ width: 4, height: 3 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setBounds({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const startDrag = (clientX: number) => {
    setIsDragging(true);
    setHasInteracted(true);
    startX.current = clientX;
    startRotY.current = rotY;
  };

  const moveDrag = (clientX: number) => {
    if (!isDragging) return;
    const delta = (clientX - startX.current) * 0.6;
    setRotY(Math.max(-60, Math.min(60, startRotY.current + delta)));
  };

  const endDrag = () => setIsDragging(false);

  const changeZoom = (amount: number) => {
    setZoom(current => Math.max(1, Math.min(2.5, current + amount)));
    setHasInteracted(true);
  };
  const resetView = () => { setRotY(0); setZoom(1); setHasInteracted(true); };

  const displayAngle = Math.round(rotY);
  // Keep pixel coordinates aligned with the full image, including portrait uploads.
  const fit = Math.min(bounds.width / imageSize.width, bounds.height / imageSize.height);

  // Simulate depth compression at extreme angles
  const scaleX = 1 - Math.abs(rotY) * 0.003;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={lang === 'pt' ? 'Visualizador de imagem. Use as setas para girar, + e − para zoom e 0 para restaurar.' : 'Visor de imagen. Use las flechas para girar, + y − para zoom y 0 para restablecer.'}
      tabIndex={0}
      className="relative select-none rounded-2xl overflow-hidden"
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        background: 'var(--muted)',
        aspectRatio: '4/3',
        touchAction: 'pan-y',
      }}
      onPointerDown={event => {
        if (event.button !== 0 || !event.isPrimary) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        startDrag(event.clientX);
      }}
      onPointerMove={event => { if (event.isPrimary) moveDrag(event.clientX); }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', '+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault(); setHasInteracted(true);
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') setRotY(value => Math.max(-60, Math.min(60, value + (event.key === 'ArrowLeft' ? -10 : 10))));
          else if (event.key === '0') resetView();
          else changeZoom(event.key === '-' ? -0.25 : 0.25);
        }
      }}
    >
      {/* Image with 3D rotation */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          perspective: '900px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div className="relative shrink-0" style={{
          width: imageSize.width * fit, height: imageSize.height * fit,
          transform: `rotateY(${rotY}deg) scaleX(${scaleX}) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
        <img
          src={imageUrl || undefined}
          alt={imageAlt}
          draggable={false}
          className="w-full h-full object-contain"
          onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />

      {/* Structure marker */}
      {marker && <div
        className="absolute pointer-events-none"
        data-testid="structure-marker"
        style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
      >
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              width: '28px',
              height: '28px',
              background: 'var(--accent)',
              opacity: 0.35,
              transform: 'translate(-25%, -25%)',
            }}
          />
          {/* Dot */}
          <div
            className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
            style={{ background: 'var(--accent)' }}
          />
        </div>
      </div>}
        </div>
      </div>

      <div className="absolute top-3 right-3 flex gap-2" onPointerDown={event => event.stopPropagation()}>
        <button type="button" onClick={() => changeZoom(0.25)} disabled={zoom >= 2.5} aria-label={lang === 'pt' ? 'Aumentar zoom' : 'Acercar'} className="min-h-11 min-w-11 rounded-lg bg-black/70 text-xl text-white disabled:opacity-40">+</button>
        <button type="button" onClick={() => changeZoom(-0.25)} disabled={zoom <= 1} aria-label={lang === 'pt' ? 'Diminuir zoom' : 'Alejar'} className="min-h-11 min-w-11 rounded-lg bg-black/70 text-xl text-white disabled:opacity-40">−</button>
        <button type="button" onClick={resetView} aria-label={lang === 'pt' ? 'Restaurar visualização' : 'Restablecer vista'} className="min-h-11 min-w-11 rounded-lg bg-black/70 text-xl text-white">↺</button>
      </div>
      {/* Bottom HUD */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        {/* Rotation indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-data"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          <span>↔</span>
          <span>{displayAngle}°</span>
        </div>

        <span className="rounded-full px-2.5 py-1 text-xs font-mono-data bg-black/70 text-white" aria-live="polite">Zoom {Math.round(zoom * 100)}%</span>

        {/* Hint */}
        {!hasInteracted && (
          <div
            className="hidden sm:block px-3 py-1 rounded-full text-xs"
            style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
          >
            {lang === 'pt' ? 'Arraste para girar' : 'Arrastre para girar'}
          </div>
        )}

        {/* 360° badge */}
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          2D
        </div>
      </div>
    </div>
  );
}
