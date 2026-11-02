import type { Language, AnatomySystem } from "./types"

const t = {
  pt: {
    appName: "Anato360",

    appSubtitle: "Sistema Interativo de Anatomia Veterinária",

    login: "Entrar",

    loginTitle: "Bem-vindo ao Anato360",

    loginSubtitle:
      "Plataforma interativa para o estudo da anatomia veterinária",

    email: "E-mail",

    password: "Senha",

    demoHint: "Use qualquer e-mail e senha para acessar",

    forgotPassword: "Esqueci minha senha",

    loginButton: "Entrar na plataforma",

    nav_dashboard: "Início",

    nav_quiz: "Praticar",

    nav_progress: "Progresso",

    nav_images: "Imagens",

    nav_logout: "Sair",

    nav_menu_open: "Abrir menu de navegação",

    nav_menu_close: "Fechar menu de navegação",

    welcome: "Olá",

    welcomeSub: "Escolha um sistema anatômico para praticar",

    system_skeletal: "Sistema Esquelético",

    system_muscular: "Sistema Muscular",

    system_digestive: "Sistema Digestório",

    system_respiratory: "Sistema Respiratório",

    system_circulatory: "Sistema Circulatório",

    system_all: "Todos os Sistemas",

    system_desc_skeletal: "Ossos, articulações e cartilagens",

    system_desc_muscular: "Músculos e tendões",

    system_desc_digestive: "Trato gastrointestinal e órgãos digestórios",

    system_desc_respiratory: "Pulmões, traqueia e vias aéreas",

    system_desc_circulatory: "Coração, vasos e circulação",

    system_desc_all: "Pratique com questões de todos os sistemas",

    totalPoints: "Pontuação Total",

    correctAnswers: "Acertos",

    totalAnswered: "Respondidas",

    accuracy: "Taxa de Acerto",

    startQuiz: "Iniciar Prática",

    quizTitle: "Identificar Estrutura",

    questionOf: "Questão",

    of: "de",

    rotate360: "Arraste para girar a peça",

    zoomIn: "Aumentar zoom",

    zoomOut: "Diminuir zoom",

    resetView: "Redefinir visualização",

    zoomLevel: "Zoom",

    imageGalleryTitle: "Galeria de imagens",

    imageGallerySub:
      "Explore as imagens e estruturas anatômicas disponíveis para estudo.",

    filterSystem: "Filtrar por sistema",

    allSystems: "Todos os sistemas",

    selectImage: "Ver imagem",

    selectedImage: "Imagem selecionada",

    targetStructure: "Estrutura em destaque",

    chatTitle: "Assistente de estudos",

    chatSubtitle: "Pergunte sobre o material enviado",

    chatIntro:
      "Envie um PDF para consultar o conteúdo. Depois, faça uma pergunta sobre o material.",

    chatPlaceholder: "Escreva sua pergunta...",

    chatUpload: "Enviar PDF",

    chatUploading: "Enviando PDF...",

    chatSending: "Consultando o material...",

    chatSend: "Enviar pergunta",

    chatOpen: "Abrir assistente de estudos",

    chatClose: "Fechar assistente de estudos",

    chatUploadSuccess: "Material carregado. Agora você pode fazer perguntas.",

    chatChoosePdf: "Selecione um arquivo PDF.",

    chatUploadError: "Não foi possível carregar o material",

    chatAnswerError: "Não foi possível responder",

    chatMissingAnswer: "A API não retornou uma resposta válida.",

    openAnswerLabel: "Qual é esta estrutura anatômica?",

    openAnswerPlaceholder: "Digite o nome da estrutura...",

    checkAnswer: "Verificar",

    showOptions: "Ver alternativas",

    openBonus: "×2 pontos por resposta direta!",

    correct: "Correto!",

    incorrect: "Incorreto",

    correctAnswer: "Resposta correta:",

    pointsEarned: "pontos ganhos",

    nextQuestion: "Próxima questão",

    quizComplete: "Prática concluída!",

    totalEarned: "Pontos ganhos nesta sessão",

    backToDashboard: "Voltar ao início",

    sessionSummary: "Resumo da sessão",

    progressTitle: "Meu Progresso",

    progressSub: "Acompanhe sua evolução no aprendizado",

    recentActivity: "Atividade recente",

    noActivity: "Nenhuma atividade ainda. Comece praticando!",

    performanceBySystem: "Desempenho por sistema",

    noData: "Sem dados",

    openAnswer: "Resposta direta",

    multipleChoice: "Múltipla escolha",

    nav_admin: "Admin",

    admin_title: "Painel do Professor",

    admin_subtitle: "Envie uma imagem anatômica para criar novas questões",

    admin_upload_label: "Arraste uma imagem aqui ou clique para selecionar",

    admin_upload_hint: "Formatos aceitos: JPG, PNG, WEBP · Máx. 10 MB",

    admin_analyze: "Analisar com IA",

    admin_processing: "Processando imagem...",

    admin_processing_sub: "A IA está identificando as estruturas anatômicas",

    admin_detected: "estruturas identificadas automaticamente",

    admin_edit_title: "Editor de estruturas",

    admin_edit_sub:
      "Clique na imagem para adicionar marcadores · Clique em um marcador para editar",

    admin_marker_label_pt: "Nome em português",

    admin_marker_label_es: "Nombre en español",

    admin_marker_placeholder_pt: "Ex: Fêmur",

    admin_marker_placeholder_es: "Ej: Fémur",

    admin_marker_confirm: "Confirmar",

    admin_marker_delete: "Remover marcador",

    admin_system_select: "Sistema anatômico",

    admin_save: "Salvar questões no banco",

    admin_save_count: "questões prontas para salvar",

    admin_saved_title: "Questões salvas com sucesso!",

    admin_saved_sub: "As questões já estão disponíveis no modo de prática",

    admin_new: "Enviar nova imagem",

    admin_click_to_add: "Clique na imagem para posicionar um marcador",

    admin_no_markers: "Nenhum marcador adicionado ainda",

    admin_reset: "Recomeçar",

    admin_ai_badge: "Identificado pela IA",

    admin_manual_badge: "Adicionado manualmente",

    admin_image_alt: "Descrição da imagem (opcional)",

    admin_image_alt_pt: "Descrição em português",

    admin_image_alt_es: "Descripción en español",
  },

  es: {
    appName: "Anato360",

    appSubtitle: "Sistema Interactivo de Anatomía Veterinaria",

    login: "Ingresar",

    loginTitle: "Bienvenido a Anato360",

    loginSubtitle:
      "Plataforma interactiva para el estudio de anatomía veterinaria",

    email: "Correo electrónico",

    password: "Contraseña",

    demoHint: "Use cualquier correo y contraseña para acceder",

    forgotPassword: "Olvidé mi contraseña",

    loginButton: "Ingresar a la plataforma",

    nav_dashboard: "Inicio",

    nav_quiz: "Practicar",

    nav_progress: "Progreso",

    nav_images: "Imágenes",

    nav_logout: "Salir",

    nav_menu_open: "Abrir menú de navegación",

    nav_menu_close: "Cerrar menú de navegación",

    welcome: "Hola",

    welcomeSub: "Elige un sistema anatómico para practicar",

    system_skeletal: "Sistema Esquelético",

    system_muscular: "Sistema Muscular",

    system_digestive: "Sistema Digestivo",

    system_respiratory: "Sistema Respiratorio",

    system_circulatory: "Sistema Circulatorio",

    system_all: "Todos los Sistemas",

    system_desc_skeletal: "Huesos, articulaciones y cartílagos",

    system_desc_muscular: "Músculos y tendones",

    system_desc_digestive: "Tracto gastrointestinal y órganos digestivos",

    system_desc_respiratory: "Pulmones, tráquea y vías aéreas",

    system_desc_circulatory: "Corazón, vasos y circulación",

    system_desc_all: "Practica con preguntas de todos los sistemas",

    totalPoints: "Puntuación Total",

    correctAnswers: "Aciertos",

    totalAnswered: "Respondidas",

    accuracy: "Tasa de Acierto",

    startQuiz: "Iniciar Práctica",

    quizTitle: "Identificar Estructura",

    questionOf: "Pregunta",

    of: "de",

    rotate360: "Arrastre para girar la pieza",

    zoomIn: "Aumentar zoom",

    zoomOut: "Reducir zoom",

    resetView: "Restablecer vista",

    zoomLevel: "Zoom",

    imageGalleryTitle: "Galería de imágenes",

    imageGallerySub:
      "Explore las imágenes y estructuras anatómicas disponibles para estudiar.",

    filterSystem: "Filtrar por sistema",

    allSystems: "Todos los sistemas",

    selectImage: "Ver imagen",

    selectedImage: "Imagen seleccionada",

    targetStructure: "Estructura destacada",

    chatTitle: "Asistente de estudio",

    chatSubtitle: "Pregunte sobre el material enviado",

    chatIntro:
      "Envíe un PDF para consultar el contenido. Luego, haga una pregunta sobre el material.",

    chatPlaceholder: "Escriba su pregunta...",

    chatUpload: "Enviar PDF",

    chatUploading: "Enviando PDF...",

    chatSending: "Consultando el material...",

    chatSend: "Enviar pregunta",

    chatOpen: "Abrir asistente de estudio",

    chatClose: "Cerrar asistente de estudio",

    chatUploadSuccess: "Material cargado. Ahora puede hacer preguntas.",

    chatChoosePdf: "Seleccione un archivo PDF.",

    chatUploadError: "No se pudo cargar el material",

    chatAnswerError: "No se pudo responder",

    chatMissingAnswer: "La API no devolvió una respuesta válida.",

    openAnswerLabel: "¿Cuál es esta estructura anatómica?",

    openAnswerPlaceholder: "Escriba el nombre de la estructura...",

    checkAnswer: "Verificar",

    showOptions: "Ver alternativas",

    openBonus: "¡×2 puntos por respuesta directa!",

    correct: "¡Correcto!",

    incorrect: "Incorrecto",

    correctAnswer: "Respuesta correcta:",

    pointsEarned: "puntos ganados",

    nextQuestion: "Siguiente pregunta",

    quizComplete: "¡Práctica completada!",

    totalEarned: "Puntos ganados en esta sesión",

    backToDashboard: "Volver al inicio",

    sessionSummary: "Resumen de la sesión",

    progressTitle: "Mi Progreso",

    progressSub: "Sigue tu evolución en el aprendizaje",

    recentActivity: "Actividad reciente",

    noActivity: "Sin actividad aún. ¡Comienza practicando!",

    performanceBySystem: "Rendimiento por sistema",

    noData: "Sin datos",

    openAnswer: "Respuesta directa",

    multipleChoice: "Opción múltiple",

    nav_admin: "Admin",

    admin_title: "Panel del Profesor",

    admin_subtitle: "Suba una imagen anatómica para crear nuevas preguntas",

    admin_upload_label: "Arrastre una imagen aquí o haga clic para seleccionar",

    admin_upload_hint: "Formatos aceptados: JPG, PNG, WEBP · Máx. 10 MB",

    admin_analyze: "Analizar con IA",

    admin_processing: "Procesando imagen...",

    admin_processing_sub: "La IA está identificando las estructuras anatómicas",

    admin_detected: "estructuras identificadas automáticamente",

    admin_edit_title: "Editor de estructuras",

    admin_edit_sub:
      "Haga clic en la imagen para añadir marcadores · Haga clic en un marcador para editarlo",

    admin_marker_label_pt: "Nombre en portugués",

    admin_marker_label_es: "Nombre en español",

    admin_marker_placeholder_pt: "Ej: Fêmur",

    admin_marker_placeholder_es: "Ej: Fémur",

    admin_marker_confirm: "Confirmar",

    admin_marker_delete: "Eliminar marcador",

    admin_system_select: "Sistema anatómico",

    admin_save: "Guardar preguntas en el banco",

    admin_save_count: "preguntas listas para guardar",

    admin_saved_title: "¡Preguntas guardadas con éxito!",

    admin_saved_sub:
      "Las preguntas ya están disponibles en el modo de práctica",

    admin_new: "Subir nueva imagen",

    admin_click_to_add: "Haga clic en la imagen para posicionar un marcador",

    admin_no_markers: "Aún no se han añadido marcadores",

    admin_reset: "Reiniciar",

    admin_ai_badge: "Identificado por IA",

    admin_manual_badge: "Añadido manualmente",

    admin_image_alt: "Descripción de la imagen (opcional)",

    admin_image_alt_pt: "Descripción en portugués",

    admin_image_alt_es: "Descripción en español",
  },
}

export function tr(lang: Language, key: keyof typeof t.pt): string {
  return t[lang][key] ?? key
}

export function systemName(lang: Language, system: AnatomySystem): string {
  const key = `system_${system}` as keyof typeof t.pt

  return t[lang][key] ?? system
}

export function systemDesc(lang: Language, system: AnatomySystem): string {
  const key = `system_desc_${system}` as keyof typeof t.pt

  return t[lang][key] ?? ""
}
