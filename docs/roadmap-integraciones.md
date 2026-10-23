# Mejoras e integraciones de memorIA

Revisión del 23 de octubre de 2026. Norely es el nombre del perfil y Evebebé su apodo. Se conserva el UUID original, sus cursos, sus sesiones y sus actividades.

## Fallos corregidos en esta ampliación

- El perfil se elegía automáticamente antes de entrar a la agenda. Ahora se elige explícitamente y se puede volver al selector.
- La propuesta de cita no mostraba disponibilidad común. Ahora empieza por día y duración, consulta ambas agendas y excluye su propia reserva al editar.
- Una propuesta rechazada seguía en la agenda del remitente aunque ya no reservaba disponibilidad. Ahora queda únicamente en el historial de invitaciones.
- Una invitación cancelada o finalizada podía seguir mostrándose como pendiente y aceptar una respuesta. Ahora los botones, contadores y validación comparten la definición de invitación pendiente.
- Un laboratorio sin aula definida podía heredar la de teoría. Ahora no se inventa esa aula en el calendario o su exportación.
- La exportación recurrente dependía de la zona del equipo y podía desplazar clases nocturnas al usar un día de recurrencia incompatible con la fecha UTC. Ahora el origen se calcula en Lima y la recurrencia usa el día UTC correspondiente.
- El archivo iCalendar no escapaba todos los separadores, no plegaba líneas largas con caracteres UTF-8 y trataba eventos de todo el día como citas con hora. Se corrigieron esos casos; las tareas sin duración no bloquean disponibilidad externa y las propuestas pendientes se exportan como tentativas.

También se corrigió la comparación de fechas de una respuesta: dos valores ISO que representan el mismo instante no se rechazan como si la invitación hubiera cambiado. Las invitaciones cerradas quedan en su historial y no ocupan el resumen de pendientes del inicio.

La base de pruebas pasó de 47 a 67 casos. Incluye una prueba transaccional de dos propuestas simultáneas: SQLite solo guarda una para la misma hora. Los cambios no añaden servicios externos ni requieren pagar una API.

## Orden propuesto

| Prioridad | Integración o mejora | Beneficio | Requisitos pendientes |
|---|---|---|---|
| 1 | Nube compartida y acceso al espacio | Los dos celulares consultan la misma información sin depender de esta computadora. | Proyecto Supabase accesible, migraciones, alojamiento con HTTPS y acceso protegido al espacio compartido. Los perfiles seguirían siendo organización dentro de ese espacio. |
| 2 | Google Calendar: disponibilidad | Evita cruces con compromisos que ya tengan fuera de memorIA. | Conectar cada calendario con OAuth, guardar tokens en el servidor y asociarlos al perfil correcto. Empezar por lectura de ocupado/libre. |
| 3 | Notificaciones push | Avisa de una invitación, su respuesta y próximos compromisos aunque la app no esté abierta. | HTTPS, permiso explícito desde un botón, suscripciones por dispositivo/perfil y un servidor que programe y envíe avisos. |
| 4 | Sincronización de calendarios | Los cambios aceptados se reflejan en Google Calendar sin repetir importaciones. | Identificadores externos, sincronización incremental, tratamiento de eliminaciones y reintentos idempotentes. Separar la aceptación interna del envío de invitaciones externas. |
| 5 | Importación de horarios y dictado ampliado | Reduce la entrada manual de cursos/laboratorios y mejora la transcripción cuando el navegador falle. | Revisión previa obligatoria de propietario, curso, sesión, fecha y hora; proveedor de transcripción opcional con coste y tratamiento de audio definidos. |

El orden es una recomendación a partir del estado del código, no una integración ya conectada. La exportación manual `.ics` ya existe y fue reforzada; no es sincronización bidireccional.

## Estado y decisiones técnicas

El motor verificado es SQLite. El nombre de host del Supabase configurado volvió a fallar la resolución DNS durante esta revisión. Cambiar de motor no migra datos automáticamente: primero habría que transferir un respaldo y comprobar los totales e identificadores. La comprobación transaccional de cruces está garantizada en SQLite; en Supabase también debe trasladarse al interior de la RPC antes de prometer la misma garantía frente a escrituras simultáneas.

Para Google Calendar, la API de [Freebusy](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) permite consultar intervalos ocupados. La [sincronización incremental](https://developers.google.com/workspace/calendar/api/guides/sync) utiliza tokens para recuperar cambios sin importar el calendario completo repetidamente. La recomendación inicial es incorporar disponibilidad externa y mantener memorIA como fuente de la respuesta a la invitación.

Supabase ofrece [suscripciones a cambios](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes); sustituirían el refresco periódico una vez recuperada la nube y definido el acceso del espacio. Para avisos con la app cerrada, [Web Push](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) necesita suscripción, service worker y entrega desde servidor; un temporizador local no cubre ese caso.

La exportación sigue [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html). No se ha certificado la importación en cada cliente de calendario, el audio real del micrófono ni ninguna conexión OAuth o entrega push.
