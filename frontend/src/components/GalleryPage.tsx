import { useCallback, useEffect, useState } from 'react';
import type { AnatomySystem, AppUser, Language } from '../lib/types';
import { api, apiError, imageBlob } from '../services/api';
import type { UploadedImage } from '../services/api';
import { systemName } from '../lib/translations';
import ImageStudyDialog from './ImageStudyDialog';

const SYSTEMS: AnatomySystem[] = ['all', 'skeletal', 'muscular', 'digestive', 'respiratory', 'circulatory'];

interface Props {
  lang: Language;
  user: AppUser;
  onUpload: () => void;
  onEdit: (id: number) => void;
}

interface Notification {
  id: number;
  message: string;
  is_read: boolean;
}

function ImagePreview({ image, original = false }: { image: UploadedImage; original?: boolean }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setUrl(''); setError('');
    imageBlob(image.id, !original && !!image.processed_path).then(value => {
      objectUrl = value;
      if (active) setUrl(value); else URL.revokeObjectURL(value);
    }).catch(reason => { if (active) setError(apiError(reason)); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image.id, image.processed_path, original]);
  if (!url) return <div className="aspect-[4/3] flex items-center justify-center text-sm px-5" style={{ color: 'var(--muted-fg)', background: 'var(--muted)' }}>{error || '...'}</div>;
  return <img src={url} alt={image.title} className="w-full aspect-[4/3] object-contain" loading="lazy" style={{ background: 'var(--muted)' }} />;
}

export default function GalleryPage({ lang, user, onUpload, onEdit }: Props) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [mine, setMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<UploadedImage | null>(null);
  const [system, setSystem] = useState<AnatomySystem>('all');
  const filteredImages = images.filter(image => system === 'all' || image.category === system);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const [imageResponse, noticeResponse] = await Promise.all([
        api.get<UploadedImage[]>('imagens/', { params: mine ? { mine: true } : {} }),
        api.get<Notification[]>('notificacoes/'),
      ]);
      setImages(imageResponse.data); setNotifications(noticeResponse.data); setError('');
    } catch (reason) { setError(apiError(reason)); }
    finally { setLoading(false); }
  }, [mine]);
  useEffect(() => { setLoading(true); void load(); }, [load]);
  useEffect(() => {
    if (!images.some(image => ['queued', 'processing'].includes(image.status))) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [images, load]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setDeleteId(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const toggleSharing = async (image: UploadedImage) => {
    setBusyId(image.id);
    try { await api.patch(`imagens/${image.id}/`, { allow_sharing: !image.allow_sharing }); await load(); }
    catch (reason) { setError(apiError(reason)); }
    finally { setBusyId(null); }
  };
  const remove = async () => {
    if (!deleteId) return;
    setBusyId(deleteId);
    try { await api.delete(`imagens/${deleteId}/`); setDeleteId(null); await load(); }
    catch (reason) { setError(apiError(reason)); }
    finally { setBusyId(null); }
  };
  const reprocess = async (id: number) => {
    setBusyId(id);
    try { await api.post(`imagens/${id}/reprocessar/`); await load(); }
    catch (reason) { setError(apiError(reason)); }
    finally { setBusyId(null); }
  };
  const dismiss = async (id: number) => {
    try {
      await api.post(`notificacoes/${id}/marcar-lida/`);
      setNotifications(current => current.filter(item => item.id !== id));
    } catch (reason) { setError(apiError(reason)); }
  };
  const statusName = (image: UploadedImage) => ({ queued: lang === 'pt' ? 'Na fila' : 'En cola', processing: lang === 'pt' ? 'Processando' : 'Procesando', ready: lang === 'pt' ? 'Pronta' : 'Lista', failed: lang === 'pt' ? 'Falha no processamento' : 'Error de procesamiento' })[image.status];

  return <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
    <div className="flex flex-wrap justify-between gap-4 items-start mb-8">
      <div><h1 className="font-display text-3xl md:text-4xl mb-2">{lang === 'pt' ? 'Biblioteca de imagens' : 'Biblioteca de imágenes'}</h1><p style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Suas peças anatômicas e imagens compartilhadas.' : 'Sus piezas anatómicas e imágenes compartidas.'}</p></div>
      <button onClick={onUpload} className="px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>+ {lang === 'pt' ? 'Enviar imagem' : 'Enviar imagen'}</button>
    </div>
    <div className="flex flex-wrap items-center gap-2 mb-6">{[false, true].map(value => <button key={String(value)} onClick={() => setMine(value)} aria-pressed={mine === value} className="min-h-11 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: mine === value ? 'var(--primary)' : 'var(--muted)', color: mine === value ? 'var(--primary-fg)' : 'var(--muted-fg)' }}>{value ? (lang === 'pt' ? 'Minhas imagens' : 'Mis imágenes') : (lang === 'pt' ? 'Todas as imagens' : 'Todas las imágenes')}</button>)}<button onClick={() => void load()} className="ml-auto text-sm underline" style={{ color: 'var(--primary)' }}>{lang === 'pt' ? 'Atualizar' : 'Actualizar'}</button></div>
    <div className="mb-6 flex flex-col gap-2 sm:max-w-sm">
      <label htmlFor="image-system-filter" className="text-sm font-medium">Filtrar por sistema</label>
      <select id="image-system-filter" value={system} onChange={event => setSystem(SYSTEMS.find(item => item === event.target.value) || 'all')} className="min-h-11 rounded-xl border px-3 text-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--fg)' }}>
        {SYSTEMS.map(item => <option key={item} value={item}>{systemName(lang, item)}</option>)}
      </select>
    </div>
    {error && <p role="alert" className="mb-5 text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
    {notifications.filter(item => !item.is_read).map(item => <div key={item.id} role="status" className="mb-3 p-4 rounded-xl flex gap-3 items-center text-sm" style={{ background: 'var(--muted)', color: 'var(--fg)' }}><p className="flex-1">{item.message}</p><button onClick={() => void dismiss(item.id)} className="text-xs underline shrink-0" style={{ color: 'var(--primary)' }}>{lang === 'pt' ? 'Marcar como lida' : 'Marcar como leída'}</button></div>)}
    {loading ? <p className="animate-pulse" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'Carregando imagens...' : 'Cargando imágenes...'}</p> : filteredImages.length === 0 ? <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}><p className="text-4xl mb-4">🖼️</p><p style={{ color: 'var(--muted-fg)' }}>{images.length === 0 ? (lang === 'pt' ? 'Nenhuma imagem disponível. Envie a primeira imagem para começar.' : 'No hay imágenes disponibles. Envíe la primera imagen para empezar.') : (lang === 'pt' ? 'Nenhuma imagem para este sistema.' : 'No hay im\u00e1genes para este sistema.')}</p></div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {filteredImages.map(image => <article key={image.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <button type="button" className="w-full block" onClick={() => setSelected(image)} aria-haspopup="dialog" aria-label={(lang === 'es' ? image.title_es || image.title : image.title) || `#${image.id}`}><ImagePreview image={image} /></button>
        <div className="p-5"><div className="flex gap-2 items-start justify-between"><h2 className="font-semibold truncate">{lang === 'es' ? image.title_es || image.title : image.title || `Imagem ${image.id}`}</h2><span className="text-xs shrink-0" style={{ color: image.status === 'failed' ? 'var(--accent)' : 'var(--primary)' }}>{statusName(image)}</span></div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>#{image.id} · {image.owner_name || user.name} · {image.allow_sharing ? (lang === 'pt' ? 'Compartilhada' : 'Compartida') : (lang === 'pt' ? 'Privada' : 'Privada')}</p>
          <p className="text-xs mt-2" style={{ color: 'var(--muted-fg)' }}>{SYSTEMS.includes(image.category as AnatomySystem) ? systemName(lang, image.category as AnatomySystem) : image.category}</p>
          <div className="flex flex-wrap gap-1 mt-3">{image.annotations.slice(0, 4).map(annotation => <span key={annotation.id} className="px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--muted)', color: 'var(--muted-fg)' }}>{lang === 'es' ? annotation.text_es || annotation.text : annotation.text}</span>)}{image.annotations.length > 4 && <span className="text-xs px-2 py-1">+{image.annotations.length - 4}</span>}</div>
          {(user.isAdmin || image.owner_id === user.id) && <div className="flex flex-wrap gap-3 mt-4 text-xs font-medium"><button disabled={busyId === image.id} onClick={() => void toggleSharing(image)} style={{ color: 'var(--primary)' }}>{image.allow_sharing ? (lang === 'pt' ? 'Tornar privada' : 'Hacer privada') : (lang === 'pt' ? 'Compartilhar' : 'Compartir')}</button><button disabled={image.status !== 'ready'} onClick={() => onEdit(image.id)} className="disabled:opacity-30" style={{ color: 'var(--primary)' }}>{lang === 'pt' ? 'Editar rótulos' : 'Editar etiquetas'}</button><button onClick={() => setDeleteId(image.id)} style={{ color: 'var(--accent)' }}>{lang === 'pt' ? 'Excluir' : 'Eliminar'}</button></div>}
          {image.status === 'failed' && <p className="mt-3 text-xs" style={{ color: 'var(--accent)' }}>{image.error_message}</p>}
          {image.status === 'failed' && (user.isAdmin || image.owner_id === user.id) && <button disabled={busyId === image.id} onClick={() => void reprocess(image.id)} className="mt-3 text-xs underline disabled:opacity-40" style={{ color: 'var(--primary)' }}>{lang === 'pt' ? 'Tentar processamento novamente' : 'Reintentar procesamiento'}</button>}
        </div>
      </article>)}
    </div>}
    {selected && <ImageStudyDialog key={selected.id} image={images.find(image => image.id === selected.id) || selected} lang={lang} onClose={() => setSelected(null)} />}
    {deleteId && <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"><section role="alertdialog" aria-modal="true" aria-label={lang === 'pt' ? 'Excluir imagem' : 'Eliminar imagen'} className="max-w-sm w-full rounded-2xl p-6" style={{ background: 'var(--card)' }}><h2 className="font-display text-2xl mb-3">{lang === 'pt' ? 'Excluir imagem?' : '¿Eliminar imagen?'}</h2><p className="text-sm mb-6" style={{ color: 'var(--muted-fg)' }}>{lang === 'pt' ? 'A imagem e seus rótulos serão removidos da biblioteca.' : 'La imagen y sus etiquetas se eliminarán de la biblioteca.'}</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl" style={{ background: 'var(--muted)' }}>{lang === 'pt' ? 'Cancelar' : 'Cancelar'}</button><button disabled={busyId === deleteId} onClick={() => void remove()} className="flex-1 py-2 rounded-xl" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{lang === 'pt' ? 'Excluir' : 'Eliminar'}</button></div></section></div>}
  </div>;
}
