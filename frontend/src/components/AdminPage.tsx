import { useState, useRef, useCallback, useEffect } from 'react';
import type { Language, AnatomySystem, AdminMarker } from '../lib/types';
import { api, apiError, imageBlob } from '../services/api';
import type { UploadedImage } from '../services/api';
import { tr, systemName } from '../lib/translations';

interface Props {
  lang: Language;
  onSaved: () => void;
  isAdmin: boolean;
  imageId?: number;
}

type AdminPhase = 'upload' | 'processing' | 'editing' | 'saved';

const SYSTEMS: Array<Exclude<AnatomySystem, 'all'>> = [
  'skeletal', 'muscular', 'digestive', 'respiratory', 'circulatory',
];

const SYSTEM_ICONS: Record<string, string> = {
  skeletal: '🦴', muscular: '💪', digestive: '🫀', respiratory: '🫁', circulatory: '❤️',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AdminPage({ lang, onSaved, isAdmin, imageId }: Props) {
  const [phase, setPhase] = useState<AdminPhase>(imageId ? 'processing' : 'upload');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [markers, setMarkers] = useState<AdminMarker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [system, setSystem] = useState<Exclude<AnatomySystem, 'all'>>('skeletal');
  const [altPt, setAltPt] = useState('');
  const [altEs, setAltEs] = useState('');
  const [processingStep, setProcessingStep] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [allowSharing, setAllowSharing] = useState(false);
  const [useOllama, setUseOllama] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detectedCount, setDetectedCount] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageId) return;
    let active = true;
    api.get<UploadedImage>(`imagens/${imageId}/`).then(({ data }) => {
      if (!active) return;
      setAltPt(data.title); setAltEs(data.title_es || data.title);
      setSystem(data.category as Exclude<AnatomySystem, 'all'>);
      setAllowSharing(data.allow_sharing); setUseOllama(data.use_ollama);
      setUploadedImage(data);
    }).catch(reason => { if (active) { setError(apiError(reason)); setPhase('upload'); } });
    return () => { active = false; };
  }, [imageId]);

  useEffect(() => {
    if (!uploadedImage || !['queued', 'processing'].includes(uploadedImage.status)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api.get<UploadedImage>(`imagens/${uploadedImage.id}/`).then(({ data }) => {
        if (!active) return;
        setUploadedImage(data);
        setProcessingStep(data.status === 'queued' ? 1 : 2);
      }).catch(reason => { if (active) { setError(apiError(reason)); setPhase('upload'); } });
    }, 3000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [uploadedImage]);

  useEffect(() => {
    if (!uploadedImage) return;
    if (uploadedImage.status === 'failed') { setError(uploadedImage.error_message || 'Falha no processamento.'); setPhase('upload'); return; }
    if (uploadedImage.status !== 'ready') return;
    let active = true;
    let url = '';
    setProcessingStep(3);
    imageBlob(uploadedImage.id, !!uploadedImage.processed_path).then(value => {
      url = value;
      if (!active) { URL.revokeObjectURL(value); return; }
      setImageDataUrl(value);
      const detected: AdminMarker[] = uploadedImage.annotations.map(annotation => ({
        id: String(annotation.id), x: (annotation.posicao_normalizada?.x ?? 0.5) * 100,
        y: (annotation.posicao_normalizada?.y ?? 0.5) * 100,
        label_pt: annotation.text, label_es: annotation.text_es || annotation.text,
        confirmed: !!annotation.confirmed,
      }));
      setMarkers(detected); setDetectedCount(detected.length);
      setSelectedId(detected[0]?.id || null); setPhase('editing');
    }).catch(reason => { if (active) { setError(apiError(reason)); setPhase('upload'); } });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [uploadedImage]);

  const loadImage = (nextFile: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/tiff'].includes(nextFile.type)) { setError('Formato aceito: PNG, JPEG, WebP, BMP ou TIFF.'); return; }
    if (nextFile.size > 20 * 1024 * 1024) { setError('A imagem deve ter no máximo 20 MB.'); return; }
    setFile(nextFile); setError(''); setUploadedImage(null);
    const reader = new FileReader();
    reader.onload = e => setImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(nextFile);
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

  const runProcessing = async () => {
    if (!file || busy) return;
    setBusy(true); setPhase('processing'); setProcessingStep(0); setError('');
    const form = new FormData();
    form.append('original_file', file);
    form.append('title', altPt || file.name);
    form.append('title_es', altEs || altPt || file.name);
    form.append('category', system);
    form.append('allow_sharing', String(allowSharing));
    form.append('use_ollama', String(useOllama));
    try {
      const { data } = await api.post<UploadedImage>('imagens/', form, { timeout: 120000 });
      setUploadedImage(data); setProcessingStep(1);
    } catch (reason) { setError(apiError(reason)); setPhase('upload'); }
    finally { setBusy(false); }
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

  const handleSave = async () => {
    if (!uploadedImage || busy) return;
    setBusy(true); setError('');
    try {
      await api.patch(`imagens/${uploadedImage.id}/`, { title: altPt, title_es: altEs, category: system, allow_sharing: allowSharing });
      await api.put(`imagens/${uploadedImage.id}/rotulos/`, { annotations: markers.filter(marker => marker.label_pt.trim()).map(marker => ({ label: marker.label_pt.trim(), label_es: marker.label_es.trim() || marker.label_pt.trim(), x: marker.x, y: marker.y, confirmed: marker.confirmed })) });
      setSavedCount(markers.filter(marker => marker.confirmed && marker.label_pt.trim()).length);
      setPhase('saved'); onSaved();
    } catch (reason) { setError(apiError(reason)); }
    finally { setBusy(false); }
  };

  const reset = () => {
    setPhase('upload');
    setFile(null); setUploadedImage(null); setError('');
    setImageDataUrl('');
    setMarkers([]);
    setSelectedId(null);
    setAltPt('');
    setAltEs('');
    setProcessingStep(0);
  };

  const selectedMarker = markers.find(m => m.id === selectedId);
  const confirmedCount = markers.filter(m => m.confirmed && m.label_pt).length;

  const processingMessages = [
    lang === 'pt' ? 'Enviando imagem...' : 'Enviando imagen...',
    lang === 'pt' ? 'Aguardando processamento...' : 'Esperando procesamiento...',
    lang === 'pt' ? 'Removendo rótulos e reconstruindo a imagem' : 'Eliminando etiquetas y reconstruyendo la imagen',
    useOllama ? (lang === 'pt' ? 'Revisando com IA e preparando o editor' : 'Revisando con IA y preparando el editor') : (lang === 'pt' ? 'Preparando o editor' : 'Preparando el editor'),
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
            <span>{isAdmin ? (lang === 'pt' ? 'Painel do Professor' : 'Panel del Profesor') : (lang === 'pt' ? 'Minhas imagens' : 'Mis imágenes')}</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl" style={{ color: 'var(--fg)' }}>
            {isAdmin ? tr(lang, 'admin_title') : (lang === 'pt' ? 'Enviar imagem' : 'Enviar imagen')}
          </h1>
          <p className="mt-1" style={{ color: 'var(--muted-fg)' }}>
            {tr(lang, 'admin_subtitle')}
          </p>
        </div>
        {phase !== 'upload' && phase !== 'processing' && (
          <button
            onClick={reset}
            className="text-sm px-4 py-2 rounded-xl border transition-all hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-fg)' }}
          >
            ← {tr(lang, 'admin_reset')}
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-6 rounded-xl p-4 text-sm" style={{ background: 'var(--muted)', color: 'var(--accent)' }}>{error}</p>}
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
              accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
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

              <label className="flex gap-3 items-center text-sm" style={{ color: 'var(--muted-fg)' }}><input type="checkbox" checked={allowSharing} onChange={e => setAllowSharing(e.target.checked)} />{lang === 'pt' ? 'Permitir que outros usuários visualizem esta imagem' : 'Permitir que otros usuarios vean esta imagen'}</label>
              <label className="flex gap-3 items-center text-sm" style={{ color: 'var(--muted-fg)' }}><input type="checkbox" checked={useOllama} onChange={e => setUseOllama(e.target.checked)} />{lang === 'pt' ? 'Melhorar o resultado com IA após o processamento inicial' : 'Mejorar el resultado con IA después del procesamiento inicial'}</label>
              <button
                disabled={busy}
                onClick={() => void runProcessing()}
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
                Anato360 · ImageService
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
              style={{ background: 'var(--muted)' }}
              onClick={handleImageClick}
            >
              <img
                src={imageDataUrl}
                alt="Anatomical"
                className="w-full h-auto block pointer-events-none"
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
                🤖 {detectedCount} {tr(lang, 'admin_ai_badge')}
              </span>
              <span
                className="px-2.5 py-1 rounded-full font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}
              >
                ✏️ {markers.filter(m => !/^\d+$/.test(m.id)).length} {tr(lang, 'admin_manual_badge')}
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
                    disabled={!selectedMarker.label_pt.trim()}
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
            {uploadedImage && (
              <button
                onClick={() => void handleSave()}
                disabled={busy}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 animate-fade-in-up"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                <span>💾</span>
                <span>{busy ? '...' : `${confirmedCount} ${tr(lang, 'admin_save_count')}`}</span>
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
            {allowSharing ? (lang === 'pt' ? 'Imagem e rótulos salvos e disponíveis para os outros usuários.' : 'Imagen y etiquetas guardadas y disponibles para otros usuarios.') : (lang === 'pt' ? 'Imagem e rótulos salvos na sua biblioteca privada.' : 'Imagen y etiquetas guardadas en su biblioteca privada.')}
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
