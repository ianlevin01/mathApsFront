const onboardingSteps = [
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
];

export default onboardingSteps;