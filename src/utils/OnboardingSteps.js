const onboardingSteps = [
  // ── Pasos existentes (en /chat) ──────────────────────────────────────────
  {
    id: "studies",
    target: '[data-tour="studies"]',
    title: "Estudios",
    description:
      "Acá podés guardar, organizar y revisar contenido por temas o carpetas para estudiar mejor.",
    preferredPlacement: "bottom",
  },
  {
    id: "hamburger",
    target: '[data-tour="hamburger"]',
    title: "Historial de chats",
    description:
      "Desde este menú podés abrir el historial de conversaciones y volver a chats anteriores.",
    preferredPlacement: "bottom",
  },
  {
    id: "attach",
    target: '[data-tour="attach"]',
    title: "Adjuntar archivos",
    description:
      "Acá podés subir fotos, capturas, PDFs o archivos para que MathAPS los analice junto con tu consulta.",
    preferredPlacement: "top",
  },
  {
    id: "model",
    target: '[data-tour="model-selector"]',
    title: "Selector de modelo",
    description:
      "Desde acá elegís qué modelo usar según el tipo de respuesta que necesites.",
    preferredPlacement: "top",
  },

  // ── Nuevos pasos: StudyHub ───────────────────────────────────────────────
  {
    id: "studyhub-intro",
    target: '[data-tour="study-title"]',
    title: "Bienvenido a Mis Estudios 🗂️",
    description:
      "Este es tu espacio de aprendizaje. Creá carpetas por materia, guardá chats y organizá todo lo que estudiaste.",
    preferredPlacement: "bottom",
    navigateTo: "/study",
  },
  {
    id: "studyhub-folders",
    target: '[data-tour="folder-create-btn"]',
    title: "Creá una carpeta",
    description:
      "Cada carpeta agrupa los chats y archivos de una materia. Una vez que tengas chats y archivos adentro, podés generar flashcards y preguntas.",
    preferredPlacement: "bottom",
    navigateTo: "/study",
  },
  {
    id: "studyhub-flashcards",
    target: '[data-tour="tool-flashcards"]',
    title: "Flashcards 🧠",
    description:
      "MathAPS genera preguntas de opción múltiple basadas en lo que estudiaste en cada carpeta. Elegís la carpeta y la IA hace el resto.",
    preferredPlacement: "bottom",
    navigateTo: "/study",
  },
  {
    id: "studyhub-devquestions",
    target: '[data-tour="tool-devquestions"]',
    title: "Preguntas a desarrollo ✍️",
    description:
      "Respondé preguntas abiertas y recibí corrección automática con puntaje del 1 al 10. Ideal para preparar parciales.",
    preferredPlacement: "bottom",
    navigateTo: "/study",
  },
  {
    id: "studyhub-streak",
    target: '[data-tour="streak-card"]',
    title: "Tu racha de estudio 🔥",
    description:
      "Hacé el examen diario (3 flashcards + 1 pregunta a desarrollo) para mantener tu racha activa. ¡Cuantos más días seguidos, mejor!",
    preferredPlacement: "top",
    navigateTo: "/study",
  },

  // ── Último paso: volver al chat ──────────────────────────────────────────
  {
    id: "back-to-chat",
    target: '[data-tour="btn-back-chat"]',
    title: "Volvé al chat cuando quieras 💬",
    description:
      "Desde acá regresás al chat matemático para seguir resolviendo problemas con IA. ¡Ya conocés todo lo que MathAPS tiene para ofrecerte!",
    preferredPlacement: "bottom",
    navigateTo: "/study",
  },
];

export default onboardingSteps;
