# Revisión e implementación de memorIA

## Fallos encontrados

- El cliente generaba IDs como `sub-...`, `rec-...` y `default-user`, incompatibles con columnas UUID de Supabase.
- Las escrituras ignoraban el campo `error` de Supabase; la interfaz cerraba los formularios sin confirmar el guardado.
- Una migración del caché podía eliminar cursos, clases y actividades si faltaba `profile_id` en una clase.
- La edición de un curso no actualizaba realmente sus sesiones.
- Laboratorio, aula y a veces docente estaban mezclados en un texto. La proyección siempre tomaba el docente del curso.
- Había parsers diferentes en cliente y servidor. No reconocían fechas explícitas ni todos los días de la semana y podían asignar una fecha por defecto de dos días después.
- El botón de detener dictado cambiaba el estado visual sin detener el reconocimiento.
- Los filtros de perfil podían quedar desactualizados. El asistente y el planificador podían recibir cursos o exámenes de ambos perfiles.
- Se repetía el asistente en varias zonas y se mostraba una pausa de almuerzo como si estuviera reservada.

## Resultado

La API valida y guarda operaciones transaccionales en SQLite local o Supabase configurado. SQLite es el motor comprobado durante esta revisión. El navegador conserva caché y cambios pendientes, reintenta sin duplicar operaciones y muestra los fallos. Los cambios rechazados pueden apartarse conservando una copia local y en el respaldo descargable.

Los cursos contienen sesiones de teoría, laboratorio o práctica, cada una con aula y docente propios. Los perfiles mantienen sus datos separados y las actividades compartidas se declaran explícitamente. Las invitaciones admiten respuesta del destinatario, se reconfirman tras cambios y rechazan respuestas a una propuesta que ya cambió.

Voz y texto usan el mismo parser en español, con calendario en `America/Lima`. La revisión previa permite corregir el dato y el formulario guarda el valor real del campo de fecha. La interfaz, navegación, formularios y jerarquía se renovaron sin añadir contenido ficticio nuevo.

## Evidencia y límites

- 47 pruebas aprobadas; comprobación TypeScript y compilación de producción aprobadas.
- Seis rutas principales y las API comprobadas en producción local.
- Recorrido en navegador: creación y edición de laboratorio, cambio de perfil, aceptación y reconfirmación de cita, corrección manual de fecha y recarga.
- La corrección a 6 de noviembre de 2026, 16:00 de Perú, se comprobó en la base como `2026-11-06T21:00:00.000Z`.
- Capturas revisadas a 1440, 678 y 390 píxeles, además de formularios y estados relevantes. Revisión independiente: los dos ajustes solicitados quedaron resueltos.
- Auditoría de dependencias de producción: cero vulnerabilidades conocidas en el momento de la comprobación. Quedan avisos en herramientas de desarrollo.
- El proyecto Supabase existente falla por DNS: la migración SQL y la conexión remota quedan sin verificar. No se realizó un despliegue.
- Las invitaciones son internas a la app y se refrescan mientras está abierta; no hay notificaciones push. El audio del micrófono requiere una prueba en el dispositivo.
- Los perfiles pertenecen a un espacio compartido, sin autenticación individual. Cambiar entre SQLite y Supabase no transfiere automáticamente los datos.

Se conservaron los datos anteriores. Los registros creados para probar los recorridos fueron retirados al finalizar.
