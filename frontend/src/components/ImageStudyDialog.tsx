import { useEffect, useRef, useState } from 'react';
import type { Language } from '../lib/types';
import { apiError, imageBlob, type UploadedImage } from '../services/api';
import Viewer360 from './Viewer360';

interface Props {
  image: UploadedImage;
  lang: Language;
  onClose: () => void;
}

export default function ImageStudyDialog({ image, lang, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [original, setOriginal] = useState(false);
  const [loaded, setLoaded] = useState<{ processed: boolean; url: string; error: string } | null>(null);
  const [annotationId, setAnnotationId] = useState(image.annotations[0]?.id);
  const annotation = image.annotations.find(item => item.id === annotationId) || image.annotations[0];
  const processed = !original && !!image.processed_path;
  const url = loaded?.processed === processed ? loaded.url : '';
  const error = loaded?.processed === processed ? loaded.error : '';
  const title = lang === 'es' ? image.title_es || image.title : image.title;
  const width = Number(image.processing_metadata.width);
  const height = Number(image.processing_metadata.height);
  // Automatic labels refer to the processed image; manual labels refer to the original.
  const coordinates = annotation && (processed || image.processing_mode === 'manual')
    ? annotation.posicao_normalizada ?? (width > 0 && height > 0 ? { x: annotation.x / width, y: annotation.y / height } : undefined)
    : undefined;
  const marker = coordinates ? { x: coordinates.x * 100, y: coordinates.y * 100 } : undefined;

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    imageBlob(image.id, processed).then(value => {
      objectUrl = value;
      if (active) setLoaded({ processed, url: value, error: '' }); else URL.revokeObjectURL(value);
    }).catch(reason => { if (active) setLoaded({ processed, url: '', error: apiError(reason) }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image.id, processed]);

  const download = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `anato360-${image.id}-${processed ? 'processada' : 'original'}.png`;
    link.click();
  };

  return <dialog ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="study-image-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-2xl p-0 backdrop:bg-black/60" style={{ background: 'var(--card)', color: 'var(--fg)' }}>
    <div className="p-4 sm:p-6" onClick={event => event.stopPropagation()}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 id="study-image-title" className="font-display text-2xl break-words min-w-0">{title}</h2>
        <button type="button" onClick={onClose} aria-label={lang === 'pt' ? 'Fechar' : 'Cerrar'} className="min-h-11 min-w-11 shrink-0 rounded-lg text-2xl">×</button>
      </header>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="min-w-0">
          {url ? <Viewer360 key={`${image.id}-${processed}`} imageUrl={url} imageAlt={title} marker={marker} lang={lang} /> : <p role={error ? 'alert' : 'status'} className="aspect-[4/3] flex items-center justify-center px-4 text-sm" style={{ background: 'var(--muted)' }}>{error || (lang === 'pt' ? 'Carregando imagem...' : 'Cargando imagen...')}</p>}
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <button type="button" onClick={() => { setLoaded(null); setOriginal(value => !value); }} disabled={!image.processed_path} className="min-h-11 underline disabled:opacity-30" style={{ color: 'var(--primary)' }}>{original ? (lang === 'pt' ? 'Ver processada' : 'Ver procesada') : 'Ver original'}</button>
            <button type="button" disabled={!url} onClick={download} className="min-h-11 underline disabled:opacity-30" style={{ color: 'var(--primary)' }}>{lang === 'pt' ? 'Baixar imagem' : 'Descargar imagen'}</button>
          </div>
        </div>
        <section className="min-w-0 rounded-2xl border p-5" style={{ borderColor: 'var(--border)' }} aria-labelledby="study-structure-title">
          <h3 id="study-structure-title" className="font-display text-xl">{lang === 'pt' ? 'Estudar estruturas' : 'Estudiar estructuras'}</h3>
          <p className="mt-2 text-sm break-words" style={{ color: 'var(--muted-fg)' }}>{lang === 'es' ? image.description_es || image.description : image.description}</p>
          {image.annotations.length ? <>
            <label htmlFor="study-annotation" className="block mt-4 mb-2 text-sm">{lang === 'pt' ? 'Selecionar estrutura' : 'Seleccionar estructura'}</label>
            <select id="study-annotation" value={annotation?.id} onChange={event => setAnnotationId(Number(event.target.value))} className="min-h-11 w-full min-w-0 rounded-xl border px-3 text-sm" style={{ background: 'var(--muted)', borderColor: 'var(--border)' }}>
              {image.annotations.map(item => <option key={item.id} value={item.id}>{lang === 'es' ? item.text_es || item.text : item.text}</option>)}
            </select>
            <p className="mt-5 text-xs uppercase tracking-wide" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Estrutura selecionada' : 'Estructura seleccionada'}</p>
            <p aria-live="polite" className="mt-1 text-lg font-semibold break-words" style={{ color: 'var(--primary)' }}>{lang === 'es' ? annotation?.text_es || annotation?.text : annotation?.text}</p>
            {annotation && !annotation.confirmed && <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Rótulo aguardando confirmação.' : 'Etiqueta pendiente de confirmación.'}</p>}
          </> : <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Esta imagem ainda não possui rótulos.' : 'Esta imagen todavía no tiene etiquetas.'}</p>}
        </section>
      </div>
    </div>
  </dialog>;
}
