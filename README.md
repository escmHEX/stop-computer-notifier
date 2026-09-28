# Stop Computer Notifier

Recordatorios locales de descanso para Windows 10/11 x64. Interfaz Sereno con paleta Bruma, español e inglés y temas claro, oscuro y del sistema.

## Instalar y usar

Ejecuta el instalador de la versión entregada dentro de `release`. La instalación es por usuario. Abre la aplicación desde el menú Inicio.

- Valores iniciales: 35 minutos de trabajo y 3 de descanso. Cámbialos en Configuración, entre 1 y 1440 minutos enteros.
- El descanso comienza al pulsar Iniciar descanso. Descartar el aviso no lo inicia. Un aviso pendiente se repite cada 5 minutos; también puedes posponerlo 5 minutos.
- Cerrar la ventana libera su proceso visual y mantiene los recordatorios en la bandeja. Para terminar la aplicación, usa Salir en el menú de la bandeja.
- Pausar conserva el tiempo restante. Un descanso ya iniciado sigue corriendo; la pausa afecta a los siguientes recordatorios.
- Bloquear o suspender reinicia el trabajo al volver. Un descanso ya iniciado sigue transcurriendo durante la ausencia y no produce avisos atrasados.
- Cambiar duraciones afecta a la siguiente fase que comience. La cuenta actual mantiene su duración. Los resúmenes muestran los ajustes configurados.
- El inicio con Windows está desactivado inicialmente. Al activarlo, la aplicación inicia en la bandeja. Una apertura manual muestra la ventana.
- Probar notificación usa el tono y la opción de sonido seleccionados, aunque todavía no hayas guardado. Espera la respuesta de Windows y muestra si la entrega falla o no se confirma. La aceptación de Windows no garantiza que haya mostrado el banner.
- Cinco sonidos propios: Brisa, Campana, Gotas, Pulso y Aurora. El botón de reproducción permite escucharlos sin enviar un aviso ni guardar el ajuste. El audio de la app funciona incluso con No molestar y con el esquema Sin sonidos; sigue sujeto al volumen y silencio del dispositivo o mezclador de aplicaciones. El interruptor Sonido silencia los recordatorios.
- Para permitir banners con No molestar, abre Ajustes de Windows desde la app. En Windows 11, entra en Establecer notificaciones de prioridad > Agregar aplicaciones y selecciona Stop Computer Notifier. En Windows 10, usa Asistente de concentración > Personalizar la lista de prioridades. La app no se concede esa excepción automáticamente.

No requiere cuentas ni servidor. El instalador local no tiene firma comercial. No hay actualizaciones automáticas.

## Desarrollo

Requisitos: Windows x64, Node.js 22.12 o superior y npm. Dependencias directas fijadas en `package.json`; árbol reproducible en `package-lock.json`.

```powershell
npm ci
npm start
npm test
npm run test:desktop
npm run dist
```

`npm run build` comprueba TypeScript y genera `dist`. Ejecuta esa compilación antes de `test:desktop`; la prueba tarda aproximadamente un minuto y abre ventanas de la aplicación con preferencias temporales. El instalador queda en `release`, excluido de Git. `scripts/create-icon.ps1` regenera los iconos desde formas vectoriales con System.Drawing.

## Organización

- `src/core/timer.ts`: máquina de estados independiente de Electron y con reloj inyectable. Un solo plazo activo, sin consultas continuas en segundo plano. Cada transición invalida acciones anteriores mediante un identificador de sesión y revisión.
- `src/main`: ciclo de vida, bandeja, avisos, preferencias y eventos de Windows. Los motivos de bloqueo se acumulan para no reanudar durante una suspensión o bloqueo todavía vigente.
- `src/shared/config.ts`: valores predeterminados, límites y validación. Los ajustes habituales se cambian desde la interfaz.
- `src/shared/i18n.ts`: textos ES/EN e interpolación de valores.
- `src/renderer`: React, sin acceso a Node. El puente preload expone únicamente operaciones tipadas, validadas por el proceso principal.

Las preferencias se guardan en `%APPDATA%/Stop Computer Notifier/settings.json`, mediante archivo temporal y sustitución atómica. Un archivo inválido se conserva con nombre `settings.invalid-*.json` y se restauran los valores iniciales. La desinstalación conserva las preferencias para una reinstalación.

Los WAV originales se generan durante la compilación desde `scripts/create-sounds.mjs`. El proceso principal crea un reproductor aislado solo durante el audio y lo destruye al terminar. Una reproducción nueva sustituye a la anterior; cerrar la interfaz no interrumpe el sonido.

Los avisos usan la API nativa de [Electron Notification](https://www.electronjs.org/docs/latest/api/notification), un AppUserModelID estable y un acceso directo con identidad de activación. Las acciones de avisos antiguos no cambian un ciclo nuevo.

## Verificación de esta entrega

Entorno: Windows 11 Home x64, compilación 26100.

- 16 pruebas automatizadas de dominio, avisos y preferencias: vencimiento, repetición, aceptación, posposición, acciones obsoletas, pausa, cambios de duración, bloqueo/suspensión superpuestos, recuperación de archivos inválidos, los cinco tonos y migración de preferencias.
- Prueba de audio: reproducción completa de los cinco WAV, ausencia de avisos al previsualizar, validación del identificador, liberación del reproductor y continuidad al cerrar la interfaz. Los cinco tonos también se comprobaron en la instalación 0.1.1, con reproducción finalizada correctamente.
- Prueba de avisos de escritorio: respuesta asíncrona, rechazo y tiempo de espera, previsualización del tono sin guardar, persistencia de la selección y distribución horizontal del resumen.
- Prueba de escritorio: dos idiomas y temas, validación, aislamiento de Node, eventos de energía controlados, cierre/destrucción de ventana, descanso de un minuto en segundo plano y reapertura con instancia única.
- Revisión visual y de teclado al 100 %, 150 % y 200 %, incluidos ajustes a 47/6 minutos y ventana estrecha, sin desbordamiento horizontal. Paleta con contraste de texto secundario de al menos 4,6:1 y botones principales de al menos 6,6:1.
- Instalación y desinstalación reales. Inicio con Windows activado/desactivado y verificado; arranque con `--background` sin ventanas. Preferencias recuperadas en un proceso nuevo.
- Notificación de prueba recibida en el historial nativo de Windows. Aviso real de trabajo vencido con dos acciones. Manejador de posposición comprobado mediante evento de Electron controlado.
- En la versión 0.1.0, dos mediciones durante unos 61 segundos con la ventana cerrada: entre 246 y 256 MiB de memoria de trabajo conjunta y entre 0,01 % y 0,02 % de CPU conjunta. No quedó un proceso renderer. Son valores de este equipo, con instrumentación de pruebas, no un límite garantizado.

### Pendiente de validación

- Windows 10: no se dispuso de un entorno de prueba.
- Sonido audible y clic real sobre las acciones del aviso de Windows. Se comprobó la entrega nativa y la lógica de acciones, pero no esos dos comportamientos físicos.
- Inicio después de reiniciar Windows y suspensión/bloqueo físicos: se verificaron el registro de inicio, el arranque oculto y los eventos controlados, sin reiniciar ni bloquear el equipo del usuario.

Tras comparar la interfaz definitiva, se cerró el laboratorio y se detuvo su servidor. La revisión automática bloqueó la eliminación de su carpeta temporal, por lo que esa limpieza sigue pendiente fuera del repositorio.
