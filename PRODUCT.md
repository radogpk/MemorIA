# memorIA

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Gerardo (Principito) y Norely (Evebebé) usan dos perfiles dentro de un espacio compartido. Evebebé es el apodo de Norely.

## Product Purpose

Organizar cursos, clases, laboratorios, entregas y actividades personales sin mezclar los datos de los perfiles. Proponer citas al otro perfil y saber si las aceptó.

## Capabilities and Constraints

- Cada curso pertenece a un perfil. Puede tener sesiones de teoría, laboratorio o práctica; cada sesión puede tener aula y docente propios.
- Las actividades personales pertenecen a un perfil; las compartidas pueden requerir confirmación del otro.
- Al abrir la app se elige un perfil antes de mostrar la agenda. Cambiar de perfil vuelve a esa selección.
- Las citas compartidas empiezan por elegir el día y comparar agendas. Los espacios libres consideran laboratorios y reservas pendientes de ambos.
- El destinatario de una invitación pendiente puede proponer otra hora sobre la misma actividad. Se conservan su identidad y detalles, cambia quién debe confirmar y nunca se acepta automáticamente.
- Cada curso puede definir un semestre con fechas inclusivas de inicio y fin. Sin fechas mantiene su repetición semanal; no se inventan límites para los cursos anteriores.
- Cada perfil registra sus feriados y regla habitual; cada curso puede heredarla o cambiarla. Una excepción por fecha suspende una sesión o modifica solo su hora, aula o docente y tiene prioridad sobre el feriado.
- Cada perfil puede reservar un margen de traslado de 0 a 120 minutos al buscar y confirmar planes compartidos, sin cambiar las horas reales de sus compromisos. El valor inicial es 0.
- La restauración de respaldos JSON v4/v5 muestra una vista previa y recupera solo registros faltantes. Conserva los registros actuales ante duplicados o diferencias, mantiene perfiles y preferencias y guarda una copia anterior antes de confirmar.
- Entrada por voz y texto en español, con fecha explícita editable antes de guardar.
- Next.js, React y TypeScript existentes; almacenamiento persistente local y soporte de Supabase para despliegue.
- Zona de referencia de los usuarios: America/Lima. No hay autenticación individual: los perfiles son organización dentro del mismo espacio, no cuentas privadas.

## Evidence on Hand

Implementación existente y horarios en src/lib/storage/initial-data.ts. Los datos precargados son datos de la versión anterior y no se presentan como información nueva confirmada. El Supabase configurado falla por DNS durante la revisión.

La extensión de planificación del 23 de octubre está descrita en docs/2026-10-23-planning-upgrades.md. El flujo local se verificó con datos sintéticos que se retiraron después; los datos originales se conservaron. La migración de Supabase remoto y la entrega push siguen pendientes, por lo que no se afirma sincronización entre celulares en producción.

## Product Principles

- Nunca descartar datos para corregir una migración.
- Mostrar el estado real del guardado.
- Mantener una sola fuente para propiedad, horarios e interpretación de fechas.
- Compartir e invitar son decisiones explícitas.
