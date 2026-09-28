import type { Language, Problem } from "./contracts.ts";

export const messages = {
  es: {
    session: "En sesión",
    resting: "Descansando",
    pending: "Pausa pendiente",
    paused: "Recordatorios pausados",
    snoozed: "Aviso pospuesto",
    heading: "Tu próxima pausa",
    restHeading: "Este momento es para ti.",
    dueHeading: "Es hora de una pausa.",
    pauseHeading: "A tu propio ritmo.",
    subtitle: "Un momento para descansar la vista.",
    restSubtitle: "Aparta la mirada. Relaja los hombros.",
    dueSubtitle: "Tu descanso empieza cuando tú decidas.",
    pauseSubtitle: "Retoma los recordatorios cuando quieras.",
    until: "hasta tu próxima pausa",
    untilEnd: "para volver con calma",
    nextReminder: "hasta el próximo aviso",
    waiting: "cuando tú decidas",
    remaining: "Tiempo restante",
    start: "Descansar ahora",
    begin: "Iniciar descanso",
    pause: "Pausar",
    resume: "Reanudar",
    restart: "Reiniciar contador",
    snooze: "Posponer {minutes} min",
    repeat: "Próximo aviso en {time}",
    sessionSummary: "{minutes} min de sesión",
    breakSummary: "{minutes} min de descanso",
    restMessage: "{minutes} min para ti",
    nextPaused: "Los recordatorios seguirán pausados al terminar.",
    workInterval: "Intervalo de trabajo",
    breakDuration: "Duración del descanso",
    settings: "Configuración",
    settingsTitle: "A tu medida",
    settingsDescription: "Pequeños ajustes para tu día a día.",
    sound: "Sonido",
    tone: "Tono",
    soundNames: {
      breeze: "Brisa",
      bell: "Campana",
      drops: "Gotas",
      pulse: "Pulso",
      aurora: "Aurora",
    },
    previewSound: "Escuchar sonido",
    testing: "Probando...",
    notificationSettings: "Ajustes de Windows",
    notificationHint: "El sonido de la app funciona incluso con No molestar.",
    priorityHelp: "Permitir banners con No molestar",
    prioritySteps:
      "En Windows 11: Notificaciones > Establecer notificaciones de prioridad > Agregar aplicaciones. Selecciona Stop Computer Notifier. En Windows 10: Asistente de concentración > Personalizar la lista de prioridades. Si no aparece, prueba una notificación desde la app instalada.",
    soundPlayed: "Sonido reproducido.",
    soundFailed:
      "No se pudo reproducir el sonido. Revisa la salida de audio e inténtalo de nuevo.",
    startup: "Iniciar con Windows",
    language: "Idioma",
    appearance: "Apariencia",
    system: "Sistema",
    light: "Claro",
    dark: "Oscuro",
    save: "Guardar cambios",
    saving: "Guardando...",
    saved: "Cambios guardados. Los tiempos se aplican al próximo ciclo.",
    nextCycle: "Los cambios de tiempo se aplican al próximo ciclo.",
    invalid: "Usa minutos enteros entre {min} y {max}.",
    test: "Probar notificación",
    testSent:
      "Windows recibió la prueba. Si no aparece, revisa No molestar y los banners en sus ajustes.",
    back: "Volver",
    background: "Activo en segundo plano",
    close: "Cerrar y mantener en segundo plano",
    minimize: "Minimizar",
    dismiss: "Cerrar mensaje",
    open: "Abrir aplicación",
    quit: "Salir",
    noticeTitle: "Es momento de descansar",
    noticeBody:
      "Tómate {minutes} min para descansar la vista y cambiar de postura.",
    finishTitle: "Tu descanso terminó",
    finishBody: "Empieza un nuevo intervalo. Vuelve a tu ritmo.",
    finishPaused: "Tu descanso terminó. Los recordatorios siguen pausados.",
    testTitle: "Así se verá tu recordatorio",
    testBody:
      "Tus avisos de descanso aparecerán aquí. Descanso configurado: {minutes} min.",
    loading: "Preparando tu próxima pausa...",
    loadFailed:
      "No se pudo abrir la aplicación. Ciérrala y vuelve a abrirla desde la bandeja.",
    saveFailed:
      "No se pudieron guardar los cambios. Tus ajustes anteriores se mantienen.",
    notificationFailed:
      "No se pudo mostrar el aviso. Revisa las notificaciones de Windows o usa la aplicación desde la bandeja.",
    notificationUnconfirmed:
      "Windows no confirmó la prueba. Revisa sus ajustes de notificaciones e inténtalo de nuevo.",
    settingsRecovered:
      "No se pudieron leer tus ajustes. Se conservó una copia y se restauraron los valores iniciales.",
    startupUnavailable:
      "No se pudo activar el inicio con Windows. Comprueba que la aplicación esté instalada.",
    invalidSettings: "Revisa los valores antes de guardar.",
  },
  en: {
    session: "In session",
    resting: "Taking a break",
    pending: "Break pending",
    paused: "Reminders paused",
    snoozed: "Reminder snoozed",
    heading: "Your next pause",
    restHeading: "This moment is yours.",
    dueHeading: "Time for a pause.",
    pauseHeading: "At your own pace.",
    subtitle: "A moment to give your eyes a rest.",
    restSubtitle: "Look away. Relax your shoulders.",
    dueSubtitle: "Your break starts when you decide.",
    pauseSubtitle: "Resume your reminders whenever you like.",
    until: "until your next pause",
    untilEnd: "until you return refreshed",
    nextReminder: "until the next reminder",
    waiting: "whenever you are ready",
    remaining: "Time remaining",
    start: "Take a break",
    begin: "Start break",
    pause: "Pause",
    resume: "Resume",
    restart: "Restart timer",
    snooze: "Snooze {minutes} min",
    repeat: "Next reminder in {time}",
    sessionSummary: "{minutes} min in session",
    breakSummary: "{minutes} min of rest",
    restMessage: "{minutes} min for yourself",
    nextPaused: "Reminders will remain paused after your break.",
    workInterval: "Work interval",
    breakDuration: "Break duration",
    settings: "Settings",
    settingsTitle: "Make it yours",
    settingsDescription: "Small adjustments for your everyday routine.",
    sound: "Sound",
    tone: "Tone",
    soundNames: {
      breeze: "Breeze",
      bell: "Bell",
      drops: "Drops",
      pulse: "Pulse",
      aurora: "Aurora",
    },
    previewSound: "Preview sound",
    testing: "Testing...",
    notificationSettings: "Windows settings",
    notificationHint: "App sounds play even with Do not disturb enabled.",
    priorityHelp: "Allow banners during Do not disturb",
    prioritySteps:
      "On Windows 11: Notifications > Set priority notifications > Add apps. Select Stop Computer Notifier. On Windows 10: Focus assist > Customize your priority list. If missing, test a notification from the installed app.",
    soundPlayed: "Sound played.",
    soundFailed:
      "The sound could not play. Check your audio output and try again.",
    startup: "Launch with Windows",
    language: "Language",
    appearance: "Appearance",
    system: "System",
    light: "Light",
    dark: "Dark",
    save: "Save changes",
    saving: "Saving...",
    saved: "Settings saved. Timing changes apply to the next cycle.",
    nextCycle: "Timing changes apply to the next cycle.",
    invalid: "Use whole minutes between {min} and {max}.",
    test: "Test notification",
    testSent:
      "Windows received the test. If it does not appear, check Do not disturb and notification banners in Windows settings.",
    back: "Back",
    background: "Running in the background",
    close: "Close and keep running in the background",
    minimize: "Minimize",
    dismiss: "Dismiss message",
    open: "Open app",
    quit: "Quit",
    noticeTitle: "Time to take a break",
    noticeBody: "Take {minutes} min to rest your eyes and change your posture.",
    finishTitle: "Your break is over",
    finishBody: "A new interval has started. Go at your own pace.",
    finishPaused: "Your break is over. Reminders are still paused.",
    testTitle: "This is your break reminder",
    testBody:
      "Your break notifications will appear here. Configured break: {minutes} min.",
    loading: "Preparing your next pause...",
    loadFailed: "The app could not open. Close it and reopen it from the tray.",
    saveFailed:
      "Your changes could not be saved. Your previous settings are unchanged.",
    notificationFailed:
      "The notification could not be shown. Check Windows notifications or open the app from the tray.",
    notificationUnconfirmed:
      "Windows did not confirm the test. Check notification settings and try again.",
    settingsRecovered:
      "Your settings could not be read. A copy was preserved and defaults were restored.",
    startupUnavailable:
      "Windows startup could not be enabled. Check that the app is installed.",
    invalidSettings: "Check the values before saving.",
  },
} as const;
export type Copy = (typeof messages)[Language];
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key]),
  );
}
export function problemText(problem: Problem, language: Language): string {
  return messages[language][problem];
}
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
