import type { Language } from '../lib/types';
import dashboardPreview from '../assets/anato360-dashboard.png';

interface Props {
  lang: Language;
  onEnter: () => void;
  onToggleLang: () => void;
}

const labPhoto = 'https://images.unsplash.com/photo-1707944745899-104a4b12d945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400';

const copy = {
  pt: {
    nav: ['Produto', 'Experiência', 'Demonstração', 'Sobre'],
    enter: 'Acessar aplicativo',
    eyebrow: 'Educação veterinária sem fronteiras',
    heroTitle: 'Anatomia que ganha vida,',
    heroAccent: 'em qualquer idioma.',
    heroText: 'Uma plataforma interativa e bilíngue que aproxima estudantes do Brasil e do Chile de uma aprendizagem mais visual, prática e conectada.',
    start: 'Começar agora',
    watch: 'Ver demonstração',
    partner: 'Uma iniciativa acadêmica binacional',
    course: 'ZOO-00171 · Anatomia Veterinária',
    productKicker: 'Feito para aprender fazendo',
    productTitle: 'Da peça anatômica à compreensão',
    productText: 'O Anato360 reúne exploração visual, prática gamificada e apoio inteligente em uma única experiência de aprendizagem.',
    features: [
      ['Visualização 360°', 'Explore peças anatômicas em diferentes ângulos e identifique estruturas com marcadores interativos.'],
      ['Quiz gamificado', 'Pratique por sistema anatômico, responda de forma direta ou por alternativas e acumule pontos.'],
      ['Assistente com IA', 'Tire dúvidas sobre a plataforma e encontre rapidamente o próximo passo nos seus estudos.'],
      ['Conteúdo pelo professor', 'Envie fotografias anatômicas, revise marcações sugeridas por IA e publique novas questões.'],
      ['Português + Español', 'Alterne o idioma em toda a experiência e aprenda em um ambiente verdadeiramente binacional.'],
      ['Progresso visível', 'Acompanhe acertos, taxa de desempenho, atividade recente e evolução por sistema.'],
    ],
    previewLabel: 'Aplicativo em uso',
    previewTitle: 'Um laboratório de anatomia ao alcance de um clique',
    previewText: 'Interface responsiva, modo claro e escuro e caminhos simples para praticar, acompanhar o progresso ou preparar novos conteúdos.',
    evidenceKicker: 'Experiência em contexto real',
    evidenceTitle: 'Construído com colaboração chilena',
    evidenceText: 'A validação com colegas da Universidad Santo Tomás aproximou o produto da rotina dos estudantes e ajudou a orientar idioma, navegação e dinâmica das atividades.',
    quote: 'A proposta bilíngue e a prática por sistemas tornam o conteúdo mais acessível, visual e fácil de revisar em grupo.',
    quoteBy: 'Síntese dos registros de uso · Estudantes parceiros no Chile',
    testimonialVideo: 'Vozes dos estudantes chilenos',
    testimonialVideoDesc: 'Depoimentos sobre a experiência de uso, a colaboração binacional e as contribuições do Anato360 para o estudo de anatomia.',
    testimonialVideoLabel: 'Vídeo de depoimentos · Chile',
    testimonialVideoPending: 'Espaço preparado para o vídeo oficial',
    evidenceStats: [['2', 'países conectados'], ['2', 'idiomas disponíveis'], ['360°', 'de exploração visual']],
    demoKicker: 'Veja em ação',
    demoTitle: 'Uma situação concreta de aprendizagem',
    demoText: 'Acompanhe uma estudante escolhendo o sistema esquelético, explorando uma peça em 360°, respondendo ao quiz e consultando seu progresso.',
    playDemo: 'Reproduzir demonstração',
    demoDuration: 'Demonstração · 1–3 min',
    demoChapters: ['Escolha do sistema', 'Exploração da peça', 'Resposta e feedback', 'Evolução do estudante'],
    aboutKicker: 'Sobre o projeto',
    aboutTitle: 'Aprender juntos, além das fronteiras',
    aboutText: 'O Anato360 nasceu em uma experiência COIL — Collaborative Online International Learning — que reuniu estudantes e orientadores brasileiros e chilenos em torno de um desafio comum: apoiar a aprendizagem de anatomia veterinária com tecnologia.',
    coil: 'Parceria COIL',
    institutions: 'Brasil + Chile · UFSM + Universidad Santo Tomás',
    makingTitle: 'Como construímos o Anato360',
    makingText: 'Conheça as equipes, as trocas entre parceiros, a arquitetura React e as escolhas que transformaram um desafio acadêmico em produto.',
    watchMaking: 'Assistir making of',
    makingDuration: 'Desenvolvimento · 1–3 min',
    timeline: [
      ['01', 'Escuta', 'Necessidades dos estudantes e contexto binacional'],
      ['02', 'Cocriação', 'Protótipos, testes e contribuições dos parceiros'],
      ['03', 'Tecnologia', 'React, TypeScript, Vite e Tailwind CSS'],
      ['04', 'Continuidade', 'Mais peças, novas turmas e evolução da IA'],
    ],
    teamTitle: 'Uma equipe, dois países',
    teams: [
      ['UFSM · Brasil', 'Estudantes de Computação e orientadores', 'Desenvolvimento, experiência e tecnologia'],
      ['UST · Chile', 'Estudantes de Medicina Veterinária e docentes', 'Conteúdo, validação e contexto de uso'],
    ],
    finalTitle: 'Pronto para ver a anatomia de outro ângulo?',
    finalText: 'Entre no Anato360 e transforme cada estrutura em uma oportunidade de aprender.',
    finalButton: 'Prosseguir para a aplicação',
    footer: 'Projeto acadêmico binacional · COIL · 2026',
  },
  es: {
    nav: ['Producto', 'Experiencia', 'Demostración', 'Sobre'],
    enter: 'Acceder a la aplicación',
    eyebrow: 'Educación veterinaria sin fronteras',
    heroTitle: 'Anatomía que cobra vida,',
    heroAccent: 'en cualquier idioma.',
    heroText: 'Una plataforma interactiva y bilingüe que acerca a estudiantes de Brasil y Chile a un aprendizaje más visual, práctico y conectado.',
    start: 'Comenzar ahora',
    watch: 'Ver demostración',
    partner: 'Una iniciativa académica binacional',
    course: 'ZOO-00171 · Anatomía Veterinaria',
    productKicker: 'Creado para aprender haciendo',
    productTitle: 'De la pieza anatómica a la comprensión',
    productText: 'Anato360 reúne exploración visual, práctica gamificada y apoyo inteligente en una sola experiencia de aprendizaje.',
    features: [
      ['Visualización 360°', 'Explora piezas anatómicas desde distintos ángulos e identifica estructuras con marcadores interactivos.'],
      ['Quiz gamificado', 'Practica por sistema anatómico, responde directamente o con alternativas y acumula puntos.'],
      ['Asistente con IA', 'Resuelve dudas sobre la plataforma y encuentra rápidamente el próximo paso en tus estudios.'],
      ['Contenido docente', 'Sube fotografías anatómicas, revisa marcadores sugeridos por IA y publica nuevas preguntas.'],
      ['Português + Español', 'Cambia el idioma en toda la experiencia y aprende en un entorno verdaderamente binacional.'],
      ['Progreso visible', 'Consulta aciertos, rendimiento, actividad reciente y evolución por sistema.'],
    ],
    previewLabel: 'Aplicación en uso',
    previewTitle: 'Un laboratorio de anatomía a un clic',
    previewText: 'Interfaz responsiva, modo claro y oscuro y rutas simples para practicar, seguir el progreso o preparar nuevos contenidos.',
    evidenceKicker: 'Experiencia en contexto real',
    evidenceTitle: 'Construido con colaboración chilena',
    evidenceText: 'La validación con colegas de la Universidad Santo Tomás acercó el producto a la rutina estudiantil y orientó el idioma, la navegación y la dinámica de las actividades.',
    quote: 'La propuesta bilingüe y la práctica por sistemas hacen que el contenido sea más accesible, visual y fácil de revisar en grupo.',
    quoteBy: 'Síntesis de los registros de uso · Estudiantes colaboradores en Chile',
    testimonialVideo: 'Voces de los estudiantes chilenos',
    testimonialVideoDesc: 'Testimonios sobre la experiencia de uso, la colaboración binacional y los aportes de Anato360 al estudio de anatomía.',
    testimonialVideoLabel: 'Video de testimonios · Chile',
    testimonialVideoPending: 'Espacio preparado para el video oficial',
    evidenceStats: [['2', 'países conectados'], ['2', 'idiomas disponibles'], ['360°', 'de exploración visual']],
    demoKicker: 'Míralo en acción',
    demoTitle: 'Una situación concreta de aprendizaje',
    demoText: 'Acompaña a una estudiante eligiendo el sistema esquelético, explorando una pieza en 360°, respondiendo el quiz y consultando su progreso.',
    playDemo: 'Reproducir demostración',
    demoDuration: 'Demostración · 1–3 min',
    demoChapters: ['Elección del sistema', 'Exploración de la pieza', 'Respuesta y feedback', 'Evolución del estudiante'],
    aboutKicker: 'Sobre el proyecto',
    aboutTitle: 'Aprender juntos, más allá de las fronteras',
    aboutText: 'Anato360 nació de una experiencia COIL — Collaborative Online International Learning — que reunió a estudiantes y orientadores brasileños y chilenos en torno a un desafío común: apoyar el aprendizaje de anatomía veterinaria con tecnología.',
    coil: 'Colaboración COIL',
    institutions: 'Brasil + Chile · UFSM + Universidad Santo Tomás',
    makingTitle: 'Cómo construimos Anato360',
    makingText: 'Conoce los equipos, los intercambios entre socios, la arquitectura React y las decisiones que transformaron un desafío académico en un producto.',
    watchMaking: 'Ver making of',
    makingDuration: 'Desarrollo · 1–3 min',
    timeline: [
      ['01', 'Escucha', 'Necesidades de los estudiantes y contexto binacional'],
      ['02', 'Cocreación', 'Prototipos, pruebas y contribuciones de los socios'],
      ['03', 'Tecnología', 'React, TypeScript, Vite y Tailwind CSS'],
      ['04', 'Continuidad', 'Más piezas, nuevos cursos y evolución de la IA'],
    ],
    teamTitle: 'Un equipo, dos países',
    teams: [
      ['UFSM · Brasil', 'Estudiantes de Computación y orientadores', 'Desarrollo, experiencia y tecnología'],
      ['UST · Chile', 'Estudiantes de Medicina Veterinaria y docentes', 'Contenido, validación y contexto de uso'],
    ],
    finalTitle: '¿Listo para ver la anatomía desde otro ángulo?',
    finalText: 'Entra a Anato360 y transforma cada estructura en una oportunidad de aprender.',
    finalButton: 'Continuar a la aplicación',
    footer: 'Proyecto académico binacional · COIL · 2026',
  },
};

const featureIcons = [
  <path key="rotate" d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5" />,
  <path key="quiz" d="M9 11h6M9 15h4M8 3h8l3 3v15H5V3h3Zm7 0v4h4" />,
  <path key="chat" d="M5 18 3 21l1-5a8 8 0 1 1 3 3M8 11h.01M12 11h.01M16 11h.01" />,
  <path key="upload" d="M12 16V4m0 0L8 8m4-4 4 4M5 14v6h14v-6" />,
  <path key="lang" d="M3 5h12M9 3v2m4 0c-1 5-4 8-8 10m2-7c2 3 4 5 7 6m2-4 5 11m-2-4h-6" />,
  <path key="chart" d="M4 20V10m6 10V4m6 16v-7m5 7H2" />,
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
      <path d="M5 12h14m-5-5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

export default function LandingPage({ lang, onEnter, onToggleLang }: Props) {
  const c = copy[lang];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing min-h-screen overflow-hidden">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071817]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-5 lg:px-8 flex items-center">
          <button onClick={() => scrollTo('top')} className="font-display text-2xl text-[#51c5c7] mr-auto">Anato360</button>
          <nav className="hidden lg:flex items-center gap-7 mr-8">
            {c.nav.map((label, index) => (
              <button
                key={label}
                onClick={() => scrollTo(['produto', 'experiencia', 'demonstracao', 'sobre'][index])}
                className="text-sm text-white/65 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>
          <button onClick={onToggleLang} className="h-9 px-3 rounded-lg border border-white/15 text-xs font-semibold text-white/70 mr-3">
            {lang === 'pt' ? 'ES' : 'PT'}
          </button>
          <button onClick={onEnter} className="hidden sm:flex h-10 px-5 rounded-xl bg-[#45bdc0] text-[#061817] text-sm font-semibold items-center gap-2 hover:bg-[#65d0d2] transition-colors">
            {c.enter}
            <ArrowIcon />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="relative pt-20 lg:pt-28 pb-24 px-5">
          <div className="landing-orb landing-orb-one" />
          <div className="landing-orb landing-orb-two" />
          <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#45bdc0]/25 bg-[#45bdc0]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#68d0d2] mb-7">
                <span className="w-2 h-2 rounded-full bg-[#45bdc0]" />
                {c.eyebrow}
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-[-0.03em] text-white mb-7">
                {c.heroTitle}<br />
                <em className="text-[#53c7c9]">{c.heroAccent}</em>
              </h1>
              <p className="text-lg leading-relaxed text-white/65 max-w-xl mb-9">{c.heroText}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onEnter} className="h-13 px-7 rounded-xl bg-[#45bdc0] text-[#061817] font-semibold flex items-center justify-center gap-2 hover:bg-[#65d0d2] transition-all hover:-translate-y-0.5">
                  {c.start}
                  <ArrowIcon />
                </button>
                <button onClick={() => scrollTo('demonstracao')} className="h-13 px-7 rounded-xl border border-white/15 bg-white/5 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/10 transition-colors">
                  <PlayIcon />
                  {c.watch}
                </button>
              </div>
              <div className="mt-10 pt-7 border-t border-white/10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/45">
                <span>{c.partner}</span>
                <span className="text-white/70">{c.course}</span>
              </div>
            </div>

            <div className="relative lg:pl-5">
              <div className="absolute -inset-5 rounded-[2rem] bg-[#45bdc0]/10 blur-2xl" />
              <div className="relative rounded-2xl border border-white/15 bg-[#0d2423] p-2.5 shadow-2xl shadow-black/40 rotate-[1deg] hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-1.5 px-2 pb-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef815a]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e6bd57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#54b989]" />
                  <span className="ml-auto text-[10px] text-white/35">anato360.app</span>
                </div>
                <img src={dashboardPreview} alt={lang === 'pt' ? 'Tela inicial do aplicativo Anato360' : 'Pantalla inicial de la aplicación Anato360'} className="rounded-xl w-full" />
              </div>
              <div className="absolute -bottom-5 -left-3 sm:left-0 rounded-xl border border-white/10 bg-[#102a28] px-4 py-3 shadow-xl flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#45bdc0]/15 text-[#53c7c9] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4" /></svg>
                </span>
                <span><strong className="block text-sm text-white">360°</strong><span className="text-xs text-white/45">interactive anatomy</span></span>
              </div>
            </div>
          </div>
        </section>

        <section id="produto" className="py-24 px-5 bg-[#f1efe8] text-[#142221]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#247d7e] mb-4">{c.productKicker}</p>
              <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-5">{c.productTitle}</h2>
              <p className="text-lg text-[#526260] leading-relaxed">{c.productText}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {c.features.map((feature, index) => (
                <article key={feature[0]} className="group rounded-2xl border border-[#d8d9d2] bg-white p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0d3430]/5 transition-all">
                  <span className="w-11 h-11 rounded-xl bg-[#dff1ee] text-[#197879] flex items-center justify-center mb-6 group-hover:bg-[#45bdc0] group-hover:text-[#061817] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{featureIcons[index]}</svg>
                  </span>
                  <h3 className="font-semibold text-lg mb-2">{feature[0]}</h3>
                  <p className="text-sm leading-relaxed text-[#65716f]">{feature[1]}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-5 bg-[#e6e5dd] text-[#142221]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.35fr_0.65fr] gap-12 items-center">
            <div className="rounded-2xl bg-[#0a1d1c] p-2.5 shadow-2xl">
              <img src={dashboardPreview} alt={c.previewLabel} className="w-full rounded-xl" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#247d7e]">{c.previewLabel}</span>
              <h2 className="font-display text-4xl mt-4 mb-5 leading-tight">{c.previewTitle}</h2>
              <p className="text-[#596865] leading-relaxed mb-7">{c.previewText}</p>
              <button onClick={onEnter} className="font-semibold text-[#176f70] flex items-center gap-2 hover:gap-3 transition-all">
                {c.enter}
                <ArrowIcon />
              </button>
            </div>
          </div>
        </section>

        <section id="experiencia" className="py-24 px-5 bg-[#0a1e1c] text-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55c8ca] mb-4">{c.evidenceKicker}</p>
                <h2 className="font-display text-4xl sm:text-5xl mb-6">{c.evidenceTitle}</h2>
                <p className="text-white/60 text-lg leading-relaxed">{c.evidenceText}</p>
                <div className="grid grid-cols-3 gap-3 mt-10">
                  {c.evidenceStats.map(stat => (
                    <div key={stat[1]} className="border-l border-[#45bdc0]/30 pl-4">
                      <strong className="font-display text-3xl text-[#59cbcd] block">{stat[0]}</strong>
                      <span className="text-xs text-white/45">{stat[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <figure className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 sm:p-9">
                <svg viewBox="0 0 24 24" className="w-9 h-9 fill-[#55c8ca] mb-7"><path d="M6.5 10H4a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2h2v6H2v-6h4.5Zm10 0H14a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2h2v6h-6v-6h4.5Z" /></svg>
                <blockquote className="font-display text-2xl sm:text-3xl leading-snug mb-7">“{c.quote}”</blockquote>
                <figcaption className="text-sm text-white/45 border-t border-white/10 pt-5">{c.quoteBy}</figcaption>
              </figure>
            </div>

            <div className="mt-16 grid lg:grid-cols-[1.4fr_0.6fr] rounded-3xl overflow-hidden border border-white/10 bg-[#102725]">
              <div className="relative min-h-72 sm:min-h-96 overflow-hidden">
                <img
                  src={labPhoto}
                  alt={c.testimonialVideoLabel}
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#071817]/25 to-[#071817]/70" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-20 h-20 rounded-full border border-white/30 bg-[#45bdc0] text-[#061817] flex items-center justify-center shadow-2xl" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1"><path d="M8 5v14l11-7L8 5Z" /></svg>
                  </span>
                </div>
                <span className="absolute left-5 top-5 rounded-full border border-white/15 bg-[#071817]/75 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                  {c.testimonialVideoLabel}
                </span>
              </div>
              <div className="p-7 sm:p-10 flex flex-col justify-center">
                <span className="font-mono-data text-xs uppercase tracking-[0.16em] text-[#55c8ca] mb-4">COIL · Brasil + Chile</span>
                <h3 className="font-display text-3xl mb-4">{c.testimonialVideo}</h3>
                <p className="text-sm leading-relaxed text-white/50 mb-7">{c.testimonialVideoDesc}</p>
                <div className="flex items-center gap-2 text-xs text-white/40 border-t border-white/10 pt-5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-[#55c8ca]" strokeWidth="2">
                    <path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {c.testimonialVideoPending}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="demonstracao" className="py-24 px-5 bg-[#f1efe8] text-[#142221]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#247d7e] mb-4">{c.demoKicker}</p>
              <h2 className="font-display text-4xl sm:text-5xl mb-5">{c.demoTitle}</h2>
              <p className="text-lg text-[#5c6967] leading-relaxed">{c.demoText}</p>
            </div>
            <div className="relative aspect-video max-w-5xl mx-auto rounded-3xl overflow-hidden bg-[#081918] shadow-2xl group">
              <img src={dashboardPreview} alt={c.demoTitle} className="w-full h-full object-cover opacity-55 group-hover:scale-[1.02] transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061817] via-transparent to-transparent" />
              <button onClick={onEnter} className="absolute inset-0 m-auto w-fit h-fit flex flex-col items-center gap-4 text-white">
                <span className="w-20 h-20 rounded-full bg-[#4bc2c4] text-[#061817] flex items-center justify-center shadow-xl shadow-black/30 transition-transform group-hover:scale-110">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current ml-1"><path d="M8 5v14l11-7L8 5Z" /></svg>
                </span>
                <span className="font-semibold">{c.playDemo}</span>
              </button>
              <span className="absolute left-6 bottom-6 text-xs text-white/60">{c.demoDuration}</span>
            </div>
            <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              {c.demoChapters.map((chapter, index) => (
                <div key={chapter} className="rounded-xl border border-[#d4d6cf] bg-white px-4 py-3 text-sm">
                  <span className="text-[#268082] font-mono-data text-xs mr-2">0{index + 1}</span>{chapter}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="sobre" className="py-24 px-5 bg-[#e5e3da] text-[#142221]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-14 items-center mb-24">
              <div className="relative">
                <img src={labPhoto} alt={lang === 'pt' ? 'Equipe colaborando em laboratório' : 'Equipo colaborando en un laboratorio'} className="w-full h-[30rem] object-cover rounded-3xl grayscale-[20%]" />
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-[#071817]/80 via-transparent to-transparent" />
                <div className="absolute left-6 right-6 bottom-6 text-white">
                  <span className="inline-block rounded-full bg-[#4bc2c4] text-[#061817] px-3 py-1 text-xs font-bold mb-3">{c.coil}</span>
                  <p className="font-display text-2xl">{c.institutions}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#247d7e] mb-4">{c.aboutKicker}</p>
                <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-6">{c.aboutTitle}</h2>
                <p className="text-lg text-[#586663] leading-relaxed">{c.aboutText}</p>
                <div className="grid grid-cols-2 gap-4 mt-9">
                  {c.teams.map(team => (
                    <article key={team[0]} className="rounded-2xl border border-[#cdd0c8] bg-white/60 p-5">
                      <span className="text-xs font-bold text-[#197879]">{team[0]}</span>
                      <h3 className="font-semibold mt-3 mb-2">{team[1]}</h3>
                      <p className="text-xs text-[#64716e] leading-relaxed">{team[2]}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-[#0a1e1c] text-white p-7 sm:p-12">
              <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#55c8ca]">{c.makingDuration}</span>
                  <h2 className="font-display text-4xl mt-4 mb-5">{c.makingTitle}</h2>
                  <p className="text-white/55 leading-relaxed mb-7">{c.makingText}</p>
                  <button onClick={() => scrollTo('processo')} className="h-12 px-6 rounded-xl bg-[#45bdc0] text-[#061817] font-semibold flex items-center gap-2">
                    <PlayIcon />
                    {c.watchMaking}
                  </button>
                </div>
                <div id="processo" className="grid sm:grid-cols-2 gap-3">
                  {c.timeline.map(step => (
                    <article key={step[0]} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 min-h-36">
                      <span className="font-mono-data text-xs text-[#55c8ca]">{step[0]}</span>
                      <h3 className="font-semibold mt-5 mb-2">{step[1]}</h3>
                      <p className="text-sm text-white/45 leading-relaxed">{step[2]}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-28 px-5 text-center bg-[#45bdc0] text-[#061817]">
          <div className="max-w-3xl mx-auto">
            <p className="font-mono-data text-xs uppercase tracking-[0.2em] mb-5">Anato360 · ZOO-00171</p>
            <h2 className="font-display text-4xl sm:text-6xl leading-tight mb-5">{c.finalTitle}</h2>
            <p className="text-[#123f3c]/75 text-lg mb-9">{c.finalText}</p>
            <button onClick={onEnter} className="h-14 px-8 mx-auto rounded-xl bg-[#071817] text-white font-semibold flex items-center gap-3 hover:bg-[#102a28] hover:-translate-y-0.5 transition-all">
              {c.finalButton}
              <ArrowIcon />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-[#061817] text-white/45 px-5 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-xl text-[#51c5c7]">Anato360</span>
          <p className="text-xs">{c.footer}</p>
          <button onClick={onEnter} className="text-xs text-white/70 hover:text-white">{c.enter}</button>
        </div>
      </footer>
    </div>
  );
}
