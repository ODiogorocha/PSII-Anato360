import { useState, useRef, useCallback } from 'react';
import type { Language, AnatomySystem, AdminMarker, Question } from '../lib/types';
import { tr, systemName } from '../lib/translations';

interface Props {
  lang: Language;
  onSaveQuestions: (questions: Question[]) => void;
}

type AdminPhase = 'upload' | 'processing' | 'editing' | 'saved';

const SYSTEMS: Array<Exclude<AnatomySystem, 'all'>> = [
  'skeletal', 'muscular', 'digestive', 'respiratory', 'circulatory',
];

const SYSTEM_ICONS: Record<string, string> = {
  skeletal: '🦴', muscular: '💪', digestive: '🫀', respiratory: '🫁', circulatory: '❤️',
};

// Simulated AI-detected positions (relative %)
const AI_DETECTION_TEMPLATES = [
  [
    { x: 28, y: 30 }, { x: 52, y: 45 }, { x: 70, y: 28 },
    { x: 38, y: 65 }, { x: 62, y: 68 },
  ],
  [
    { x: 35, y: 25 }, { x: 58, y: 40 }, { x: 42, y: 60 },
    { x: 72, y: 55 }, { x: 22, y: 70 },
  ],
  [
    { x: 45, y: 20 }, { x: 30, y: 50 }, { x: 65, y: 38 },
    { x: 50, y: 72 },
  ],
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AdminPage({ lang, onSaveQuestions }: Props) {
  const [phase, setPhase] = useState<AdminPhase>('upload');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [markers, setMarkers] = useState<AdminMarker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [system, setSystem] = useState<Exclude<AnatomySystem, 'all'>>('skeletal');
  const [altPt, setAltPt] = useState('');
  const [altEs, setAltEs] = useState('');
  const [processingStep, setProcessingStep] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      setImageDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) loadImage(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const runProcessing = () => {
    if (!imageDataUrl) return;
    setPhase('processing');
    setProcessingStep(0);

    // Simulate progressive detection steps
    const steps = [
      { delay: 600, step: 1 },
      { delay: 1200, step: 2 },
      { delay: 1900, step: 3 },
      { delay: 2500, step: 4 },
    ];
    steps.forEach(({ delay, step }) => {
      setTimeout(() => setProcessingStep(step), delay);
    });

    setTimeout(() => {
      // Pick a random template and generate AI markers
      const template = AI_DETECTION_TEMPLATES[Math.floor(Math.random() * AI_DETECTION_TEMPLATES.length)];
      const aiMarkers: AdminMarker[] = template.map((pos, i) => ({
        id: uid(),
        x: pos.x,
        y: pos.y,
        label_pt: `Estrutura ${i + 1}`,
        label_es: `Estructura ${i + 1}`,
        confirmed: false,
      }));
      setMarkers(aiMarkers);
      setSelectedId(aiMarkers[0]?.id ?? null);
      setPhase('editing');
    }, 3000);
  };

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();

    // Check if click is near an existing marker (within 24px)
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const nearMarker = markers.find(m => {
      const dx = (m.x - clickX) * (rect.width / 100);
      const dy = (m.y - clickY) * (rect.height / 100);
      return Math.sqrt(dx * dx + dy * dy) < 24;
    });

    if (nearMarker) {
      setSelectedId(nearMarker.id);
      return;
    }

    // Add new marker
    const newMarker: AdminMarker = {
      id: uid(),
      x: clickX,
      y: clickY,
      label_pt: '',
      label_es: '',
      confirmed: false,
    };
    setMarkers(prev => [...prev, newMarker]);
    setSelectedId(newMarker.id);
  }, [markers]);

  const updateMarker = (id: string, patch: Partial<AdminMarker>) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const deleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
    setSelectedId(null);
  };

  const confirmMarker = (id: string) => {
    updateMarker(id, { confirmed: true });
  };

  const handleSave = () => {
    const confirmed = markers.filter(m => m.confirmed && m.label_pt.trim() && m.label_es.trim());
    if (confirmed.length === 0) return;

    const questions: Question[] = confirmed.map(m => ({
      id: `custom_${uid()}`,
      system,
      imageUrl: imageDataUrl,
      imageAlt_pt: altPt || 'Peça anatômica',
      imageAlt_es: altEs || 'Pieza anatómica',
      marker: { x: m.x, y: m.y },
      correct_pt: m.label_pt.trim(),
      correct_es: m.label_es.trim(),
      options_pt: [m.label_pt.trim(), 'Estrutura A', 'Estrutura B', 'Estrutura C'],
      options_es: [m.label_es.trim(), 'Estructura A', 'Estructura B', 'Estructura C'],
    }));

    onSaveQuestions(questions);
    setSavedCount(questions.length);
    setPhase('saved');
  };

  const reset = () => {
    setPhase('upload');
    setImageDataUrl('');
    setMarkers([]);
    setSelectedId(null);
    setAltPt('');
    setAltEs('');
    setProcessingStep(0);
  };

  const selectedMarker = markers.find(m => m.id === selectedId);
  const confirmedCount = markers.filter(m => m.confirmed && m.label_pt && m.label_es).length;

  const processingMessages = [
    lang === 'pt' ? 'Carregando modelo de visão...' : 'Cargando modelo de visión...',
    lang === 'pt' ? 'Detectando regiões anatômicas...' : 'Detectando regiones anatómicas...',
    lang === 'pt' ? 'Identificando estruturas...' : 'Identificando estructuras...',
    lang === 'pt' ? 'Gerando anotações...' : 'Generando anotaciones...',
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full mb-3"
            style={{ background: 'var(--muted)', color: 'var(--primary)' }}
          >
            <span>🎓</span>
            <span>{lang === 'pt' ? 'Painel do Professor' : 'Panel del Profesor'}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--fg)' }}>
            {tr(lang, 'admin_title')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--muted-fg)' }}>
            {tr(lang, 'admin_subtitle')}
          </p>
        </div>
        {phase !== 'upload' && (
          <button
            onClick={reset}
            className="text-sm px-4 py-2 rounded-xl border transition-all hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
          >
            ← {tr(lang, 'admin_reset')}
          </button>
        )}
      </div>

      {/* UPLOAD phase */}
      {phase === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl border-2 border-dashed transition-all cursor-pointer"
            style={{
              borderColor: isDragOver ? 'var(--primary)' : 'var(--border)',
              background: isDragOver ? 'var(--muted)' : 'var(--card)',
            }}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageDataUrl ? (
              <div className="relative">
                <img
                  src={imageDataUrl}
                  alt="Preview"
                  className="w-full rounded-2xl object-contain max-h-80"
                />
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-all"
                  style={{ background: 'rgba(0,0,0,0.4)' }}
                >
                  <span className="text-white font-medium text-sm">
                    {lang === 'pt' ? 'Trocar imagem' : 'Cambiar imagen'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center gap-4 text-center px-8">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'var(--muted)' }}
                >
                  🖼️
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--fg)' }}>
                    {tr(lang, 'admin_upload_label')}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'admin_upload_hint')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Image metadata */}
          {imageDataUrl && (
            <div
              className="mt-5 rounded-2xl p-5 space-y-4 animate-fade-in-up"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'admin_image_alt_pt')}
                  </label>
                  <input
                    type="text"
                    value={altPt}
                    onChange={e => setAltPt(e.target.value)}
                    placeholder={lang === 'pt' ? 'Ex: Cão - Vista lateral' : 'Ej: Perro - Vista lateral'}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1.5px solid var(--border)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                    {tr(lang, 'admin_image_alt_es')}
                  </label>
                  <input
                    type="text"
                    value={altEs}
                    onChange={e => setAltEs(e.target.value)}
                    placeholder="Ej: Perro - Vista lateral"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1.5px solid var(--border)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                  {tr(lang, 'admin_system_select')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SYSTEMS.map(sys => (
                    <button
                      key={sys}
                      onClick={() => setSystem(sys)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: system === sys ? 'var(--primary)' : 'var(--muted)',
                        color: system === sys ? 'var(--primary-fg)' : 'var(--fg)',
                      }}
                    >
                      <span>{SYSTEM_ICONS[sys]}</span>
                      <span>{systemName(lang, sys)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={runProcessing}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
              >
                <span>🤖</span>
                <span>{tr(lang, 'admin_analyze')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PROCESSING phase */}
      {phase === 'processing' && (
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <img
              src={imageDataUrl}
              alt="Processing"
              className="w-full h-full object-cover"
              draggable={false}
            />
            {/* Dark overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(10,30,30,0.55)' }}
            />
            {/* Scanning line */}
            <div
              className="absolute left-0 right-0 animate-scan pointer-events-none"
              style={{
                height: '3px',
                background: 'linear-gradient(to right, transparent, var(--primary), var(--primary), transparent)',
                boxShadow: '0 0 20px 4px var(--primary)',
                top: '0',
              }}
            />
            {/* Grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(61,184,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(61,184,184,0.08) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
            {/* Center status */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div
                className="px-5 py-2 rounded-full font-mono-data text-xs font-semibold"
                style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--primary)' }}
              >
                IA · Anato360 Vision v2.1
              </div>
              <div className="text-white text-center">
                <p className="font-semibold text-lg">{tr(lang, 'admin_processing')}</p>
                <p className="text-sm opacity-70 mt-1">{tr(lang, 'admin_processing_sub')}</p>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div
            className="mt-5 rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            {processingMessages.map((msg, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500"
                  style={{
                    background: processingStep > i ? 'var(--primary)' : 'var(--muted)',
                    color: processingStep > i ? 'var(--primary-fg)' : 'var(--muted-fg)',
                  }}
                >
                  {processingStep > i ? '✓' : i + 1}
                </div>
                <span
                  className="text-sm transition-all duration-300"
                  style={{ color: processingStep > i ? 'var(--fg)' : 'var(--muted-fg)' }}
                >
                  {msg}
                </span>
                {processingStep === i + 1 && (
                  <span className="ml-auto text-xs animate-pulse" style={{ color: 'var(--primary)' }}>
                    {lang === 'pt' ? 'Em andamento...' : 'En progreso...'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDITING phase */}
      {phase === 'editing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image + markers (2/3 width) */}
          <div className="lg:col-span-2 space-y-3">
            <div
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
              style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
            >
              <span>👆</span>
              <span>{tr(lang, 'admin_edit_sub')}</span>
            </div>

            <div
              ref={imgRef}
              className="relative rounded-2xl overflow-hidden cursor-crosshair select-none"
              style={{ background: 'var(--muted)', aspectRatio: '4/3' }}
              onClick={handleImageClick}
            >
              <img
                src={imageDataUrl}
                alt="Anatomical"
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />

              {/* Markers */}
              {markers.map((m, idx) => {
                const isSelected = m.id === selectedId;
                const isConfirmed = m.confirmed && m.label_pt;
                return (
                  <div
                    key={m.id}
                    className="absolute animate-marker-pop"
                    style={{ left: `${m.x}%`, top: `${m.y}%` }}
                    onClick={e => { e.stopPropagation(); setSelectedId(m.id); }}
                  >
                    {/* Marker dot */}
                    <div
                      className="relative -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <div
                          className="absolute rounded-full"
                          style={{
                            width: '36px', height: '36px',
                            top: '-8px', left: '-8px',
                            border: '2px solid var(--accent)',
                            background: 'rgba(217,95,43,0.15)',
                          }}
                        />
                      )}
                      {/* Dot */}
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold"
                        style={{
                          fontSize: '9px',
                          background: isConfirmed ? 'var(--primary)' : 'var(--accent)',
                          transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                          transition: 'transform 0.15s',
                        }}
                      >
                        {idx + 1}
                      </div>
                      {/* Label tooltip */}
                      {isConfirmed && !isSelected && (
                        <div
                          className="absolute left-6 -top-2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium pointer-events-none shadow-md"
                          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                        >
                          {lang === 'pt' ? m.label_pt : m.label_es}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Click-to-add hint */}
              {markers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="px-5 py-3 rounded-full text-sm font-medium"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  >
                    + {tr(lang, 'admin_click_to_add')}
                  </div>
                </div>
              )}
            </div>

            {/* AI badge + count */}
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted-fg)' }}>
              <span
                className="px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--muted)', color: 'var(--primary)' }}
              >
                🤖 {markers.filter(m => m.label_pt.startsWith('Estrutura') || m.label_pt.startsWith('Estructura')).length} {tr(lang, 'admin_ai_badge')}
              </span>
              <span
                className="px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
              >
                ✏️ {markers.filter(m => !m.label_pt.startsWith('Estrutura') && !m.label_pt.startsWith('Estructura')).length} {tr(lang, 'admin_manual_badge')}
              </span>
              <span className="ml-auto">
                {markers.length} {lang === 'pt' ? 'marcadores' : 'marcadores'}
              </span>
            </div>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-4">
            {/* Selected marker editor */}
            {selectedMarker ? (
              <div
                className="rounded-2xl p-5 space-y-4 animate-fade-in-up"
                style={{ background: 'var(--card)', border: '2px solid var(--accent)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'var(--accent)', fontSize: '10px' }}
                    >
                      {markers.findIndex(m => m.id === selectedId) + 1}
                    </div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--fg)' }}>
                      {lang === 'pt' ? 'Editar marcador' : 'Editar marcador'}
                    </span>
                  </div>
                  {selectedMarker.confirmed && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#16a34a18', color: '#16a34a' }}>
                      ✓ {lang === 'pt' ? 'Confirmado' : 'Confirmado'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                    🇧🇷 {tr(lang, 'admin_marker_label_pt')}
                  </label>
                  <input
                    type="text"
                    value={selectedMarker.label_pt}
                    onChange={e => updateMarker(selectedMarker.id, { label_pt: e.target.value, confirmed: false })}
                    placeholder={tr(lang, 'admin_marker_placeholder_pt')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1.5px solid var(--border)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted-fg)' }}>
                    🇨🇱 {tr(lang, 'admin_marker_label_es')}
                  </label>
                  <input
                    type="text"
                    value={selectedMarker.label_es}
                    onChange={e => updateMarker(selectedMarker.id, { label_es: e.target.value, confirmed: false })}
                    placeholder={tr(lang, 'admin_marker_placeholder_es')}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--muted)', color: 'var(--fg)', border: '1.5px solid var(--border)' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => confirmMarker(selectedMarker.id)}
                    disabled={!selectedMarker.label_pt.trim() || !selectedMarker.label_es.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                  >
                    ✓ {tr(lang, 'admin_marker_confirm')}
                  </button>
                  <button
                    onClick={() => deleteMarker(selectedMarker.id)}
                    className="px-3 py-2.5 rounded-xl text-sm transition-all hover:opacity-70 border"
                    style={{ borderColor: '#dc262640', color: '#dc2626' }}
                    title={tr(lang, 'admin_marker_delete')}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <p className="text-3xl mb-2">👆</p>
                <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                  {tr(lang, 'admin_click_to_add')}
                </p>
              </div>
            )}

            {/* Marker list */}
            {markers.length > 0 && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                    {lang === 'pt' ? 'Todos os marcadores' : 'Todos los marcadores'}
                  </p>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {markers.map((m, idx) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:opacity-80"
                      style={{ background: m.id === selectedId ? 'var(--muted)' : 'transparent' }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{
                          background: m.confirmed ? 'var(--primary)' : 'var(--accent)',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: m.label_pt ? 'var(--fg)' : 'var(--muted-fg)' }}
                        >
                          {m.label_pt || (lang === 'pt' ? 'Sem identificação' : 'Sin identificación')}
                        </p>
                        {m.label_es && (
                          <p className="text-xs truncate" style={{ color: 'var(--muted-fg)' }}>
                            ES: {m.label_es}
                          </p>
                        )}
                      </div>
                      {m.confirmed && <span className="text-xs" style={{ color: '#16a34a' }}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            {confirmedCount > 0 && (
              <button
                onClick={handleSave}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 animate-fade-in-up"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <span>💾</span>
                <span>{confirmedCount} {tr(lang, 'admin_save_count')}</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* SAVED phase */}
      {phase === 'saved' && (
        <div className="max-w-lg mx-auto text-center py-12 animate-fade-in-up">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6"
            style={{ background: 'var(--muted)' }}
          >
            ✅
          </div>
          <h2 className="font-display text-3xl mb-3" style={{ color: 'var(--fg)' }}>
            {tr(lang, 'admin_saved_title')}
          </h2>
          <p className="mb-2" style={{ color: 'var(--muted-fg)' }}>
            {tr(lang, 'admin_saved_sub')}
          </p>
          <div
            className="inline-flex items-center gap-2 font-mono-data text-lg font-bold px-5 py-3 rounded-xl my-6"
            style={{ background: 'var(--muted)', color: 'var(--primary)' }}
          >
            <span>+{savedCount}</span>
            <span className="text-sm font-normal" style={{ color: 'var(--muted-fg)' }}>
              {lang === 'pt' ? 'novas questões adicionadas' : 'nuevas preguntas añadidas'}
            </span>
          </div>
          <button
            onClick={reset}
            className="block w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            {tr(lang, 'admin_new')}
          </button>
        </div>
      )}
    </div>
  );
}
