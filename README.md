# memorIA

Agenda académica para Gerardo (Principito) y Norely (Evebebé). Cada perfil conserva sus cursos y pendientes. Las citas pueden enviarse como invitaciones; solo entran en la agenda del destinatario cuando las acepta.

Al abrir o recargar la app se elige el perfil antes de mostrar la agenda. El botón «Cambiar perfil» vuelve a esa selección sin alterar los datos. En Invitaciones, «Buscar una hora juntos» permite elegir primero el día y la duración, revisar las horas ocupadas de ambos y seleccionar un espacio común. Norely mantiene el mismo identificador de perfil que antes: se corrigió el nombre y se conservó Evebebé como apodo.

La disponibilidad incluye teoría, laboratorios, prácticas, actividades con duración y propuestas pendientes. Las tareas sin duración se consideran recordatorios; las reuniones sin fin registrado reservan una hora estimada. Las propuestas rechazadas, las actividades canceladas y las completadas no reservan horas. La búsqueda consulta los datos registrados, con horas de Perú; permite ajustar la franja horaria. El servidor local vuelve a comprobar los cruces dentro de la transacción al enviar o aceptar una invitación.

## Ejecutar

Requiere Node.js 22.13 o superior (Node 24 recomendado).

```powershell
npm install
npm run dev
```

Abre http://localhost:3000. En desarrollo usa una base SQLite real en `data/memoria.sqlite`, fuera de Git. El archivo y sus archivos WAL deben permanecer en un disco persistente. No se generan tareas ni citas de ejemplo al abrir la app. Los datos del navegador de la versión anterior se migran sin borrar sus claves originales. En Cursos se puede recuperar explícitamente el horario precargado anterior; revísalo porque contenía información de ejemplo.

Para usar dos dispositivos con el mismo servidor, abre en ambos la dirección de red que muestra Next.js. Los perfiles son un espacio compartido: no constituyen cuentas privadas ni una frontera de autenticación. Las invitaciones llegan a la bandeja interna y se actualizan al volver a la app o en un máximo de 15 segundos mientras está abierta; no son notificaciones push.

## Guardado

- La API `/api/data` valida perfil, curso, horario, fechas e invitaciones.
- Una operación de curso y sesiones se guarda en una transacción; los reintentos llevan un identificador para no duplicarse.
- El navegador conserva un respaldo y una cola persistente de cambios. Los fallos de guardado se muestran y pueden reintentarse.
- Cursos y sesiones son registros separados. Las sesiones admiten `theory`, `laboratory` y `practice`, con docente y aula independientes.
- Eliminar un curso elimina sus sesiones y conserva las actividades sin curso.
- Datos y respaldo (`/settings`) permite consultar el almacenamiento, descargar JSON, cambiar el apodo y revisar una restauración antes de recuperar registros. Conserva los datos actuales ante duplicados o diferencias.
- Las invitaciones admiten una contrapropuesta sobre la misma cita; cambia quién debe confirmar sin duplicar actividades.
- Cada curso puede tener fechas de semestre y una regla de feriados. Los feriados y el margen de traslado se configuran por perfil; las excepciones de una sesión tienen prioridad solo en su fecha.

## Supabase y despliegue

El proyecto configurado durante la revisión no resolvía por DNS. La nube no se pudo verificar. Para rehabilitarla, configura un proyecto accesible y aplica:

1. En un proyecto nuevo: `supabase/schema.sql` y luego `supabase/migrations/20261022_reliable_storage.sql`.
2. En el proyecto existente: solo la migración. No borres las tablas.

Aplica después `supabase/migrations/20261023_norely_profile.sql` para corregir nombre y apodo conservando el mismo perfil.

Después aplica `supabase/migrations/20261023_planning_upgrades.sql`: añade semestres, feriados, cambios puntuales, contrapropuestas y restauración sin sobrescritura. La RPC comprueba versiones y cruces con traslado dentro de la transacción.

Variables del servidor:

```dotenv
MEMORIA_STORAGE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=CLAVE_SOLO_DEL_SERVIDOR
```

No pongas la service role en una variable `NEXT_PUBLIC_`. La app usa RPC restringidas al servidor. En Vercel el motor predeterminado es Supabase, porque SQLite no es persistente en su sistema de archivos. En un servidor con disco persistente se puede configurar `MEMORIA_STORAGE=sqlite` y `MEMORIA_DATA_DIR` como ruta absoluta. Cambiar de motor no transfiere automáticamente datos entre SQLite y Supabase; conserva el respaldo antes de hacerlo.

Si haces público el enlace, cualquiera que lo conozca podrá seleccionar ambos perfiles. Para un despliegue privado usa la protección de acceso del hosting. No se añadió una autenticación individual porque el producto solicitado utiliza un espacio compartido.

## Voz y fechas

El dictado del navegador (`es-PE`) transcribe la frase. Voz y texto usan el mismo parser en español, disponible sin una API de IA ni conexión externa. Resuelve fechas explícitas, días de semana, hoy/mañana/pasado mañana y fechas relativas; no inventa un día cuando falta o no se reconoce. Fechas y horas se interpretan en `America/Lima`, independientemente de la zona horaria del servidor. La vista previa muestra la fecha completa y permite corregirla antes de guardar. El acceso al micrófono depende del navegador y necesita HTTPS o localhost. El audio real requiere una comprobación con el micrófono del dispositivo.

## Verificación

```powershell
npm test
npm run typecheck
npm run build
npm start
```

Las pruebas cubren persistencia SQLite, transacciones y reintentos, propiedad de registros, laboratorios, invitaciones, disponibilidad compartida y propuestas simultáneas, fechas en español, proyección del calendario y exportación ICS.

El calendario exporta la vista actual como archivo `.ics`, con horas de Perú, laboratorios separados, fechas de todo el día y propuestas marcadas como tentativas. Es una exportación manual; no sincroniza automáticamente cambios posteriores ni elimina eventos ya importados en otra app. El análisis de mejoras y las integraciones propuestas está en [docs/roadmap-integraciones.md](docs/roadmap-integraciones.md).
