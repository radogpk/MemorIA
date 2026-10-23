# Acuerdos, semestres, traslado y restauración

## Contrapropuestas

En una invitación pendiente, el destinatario puede elegir «Proponer otra hora». Se reutilizan las agendas y los espacios libres comunes. Se actualiza la misma actividad: conserva identificador, creador, título y detalles; la invitación registra quién propuso la hora, quién debe confirmarla y el horario anterior. Las dos personas pueden intercambiar alternativas sin crear citas duplicadas. No hay aceptación automática.

Las respuestas y contrapropuestas comprueban la versión de la actividad. Un cambio viejo, una invitación cerrada o una nueva hora que cruza con clases, laboratorios o traslado se rechazan. El cálculo y la entrega de avisos consideran los dos participantes aunque el creador original sea ahora quien debe responder. La entrega push sigue dependiendo de su configuración pendiente.

## Semestres y feriados

El formulario de un curso admite nombre, inicio y fin del semestre. Sin fechas conserva el horario semanal de la versión anterior; con fechas, las sesiones solo aparecen dentro del intervalo inclusivo. Los cursos anteriores no reciben fechas inventadas.

Los feriados son fechas registradas por cada perfil en Datos y respaldo. No se descarga ni aplica automáticamente un calendario nacional. La regla inicial de Gerardo es no tener clases en esos días; la de Norely mantiene las clases. Guardar fechas y preferencias es una acción explícita. Cada curso puede heredar la regla o definir que respeta o mantiene los feriados.

En Cursos → Cambios por fecha se elige una sesión semanal y una fecha coincidente con su día. Se puede suspender solo esa sesión o indicar que se dicta con otra hora, aula o docente. Un cambio «Se dicta» tiene prioridad sobre el feriado. No crea otra clase recurrente ni altera las semanas siguientes. Al editar un curso se conservan los identificadores y las excepciones de sus sesiones.

Calendario, agenda del día, disponibilidad compartida y exportación iCalendar reutilizan la misma definición de ocurrencia. La exportación incluye el límite del semestre, exclusiones y cambios mediante RECURRENCE-ID. Los laboratorios sin aula/docente definidos no heredan los de teoría.

## Traslado

En Datos y respaldo → Horario de cada persona se configura un margen de 0 a 120 minutos. El valor inicial es 0 para conservar los horarios existentes hasta que lo configuren. La disponibilidad de citas reserva ese margen antes y después de compromisos con duración, incluidas clases y propuestas pendientes. Se muestra la hora real del compromiso junto al margen; no se desplaza la clase ni se inventan distancias o rutas. Un intervalo entre dos eventos necesita un solo margen, no la suma de ambos. Se consideran los márgenes que cruzan medianoche; los recordatorios sin duración y las reservas de todo el día no reciben margen adicional.

## Restauración

Datos y respaldo admite archivos JSON de memorIA v4/v5 de hasta 2 MB. La revisión valida estructura, propietarios, fechas, relaciones y reglas antes de presentar registros por recuperar, duplicados y conflictos. Los duplicados con otro identificador se vinculan al curso existente; los registros con diferencias conservan la versión actual. Las invitaciones que cruzan horarios o traslado quedan fuera.

La recuperación añade únicamente registros faltantes, en una operación de hasta 500 registros. Se conservan perfiles y preferencias actuales; las fechas de semestre y excepciones viajan con sus cursos y sesiones. No se sustituyen registros ni se borran datos. Antes de confirmar se guarda una copia anterior en `memoria_before_restore`, descargable desde la misma pantalla. Requiere haber sincronizado los cambios pendientes. Una vista previa desactualizada exige revisarla otra vez y el servidor comprueba `create_only` para evitar sobrescrituras por cambios de otro dispositivo.

## Persistencia y comprobaciones

SQLite ejecuta los cambios dentro de su transacción existente. La migración no destructiva `supabase/migrations/20261023_planning_upgrades.sql` añade campos y traslada las comprobaciones de versión, contrapropuesta, restauración y cruces a la RPC, bajo bloqueo transaccional. Debe aplicarse después de las migraciones anteriores; no se ha aplicado al proyecto remoto.

Pasaron 90 pruebas, incluidas 4 de integración en un PostgreSQL 17 local aislado. Estas últimas aplicaron y repitieron la migración, guardaron una contrapropuesta y su aceptación, comprobaron la cancelación transaccional de una restauración en conflicto, las reglas de horario y dos propuestas simultáneas de las que solo una pudo reservarse. Para ejecutarlas se usa un servidor de prueba aparte, base `memoria_planning_test`, usuario `memoria_test`, `MEMORIA_TEST_POSTGRES_PORT` y opcionalmente `MEMORIA_TEST_PSQL`. Sin esas variables se omiten las cuatro pruebas PostgreSQL. No se usan credenciales ni datos del Supabase real.

El proyecto Supabase remoto sigue pendiente de reactivación y configuración; las comprobaciones locales no certifican sincronización entre celulares ni entrega push en producción.

En navegador se verificó el guardado independiente de la regla de Norely y un margen temporal de 30 minutos; la contrapropuesta desde Norely y su aceptación desde Gerardo mantuvieron la misma cita. Cambiar el semestre conservó el identificador del laboratorio y su excepción de aula/docente. La restauración mostró un registro nuevo, dos duplicados y una diferencia, y recuperó únicamente el registro nuevo. Se usaron registros sintéticos identificados como pruebas; no son información académica real.

Se retiraron todos los registros y preferencias temporales de la app. La comparación del contenido completo confirmó que se conservaron exactamente los 2 perfiles, 8 cursos, 19 sesiones y 5 actividades originales. La copia anterior a la restauración se descargó y coincide exactamente con esos datos. El servidor PostgreSQL aislado se detuvo; el borrado de su carpeta `.impeccable/review/pg-planning` fue rechazado por la política automática de permisos, por lo que sus archivos permanecen en el directorio de revisión ignorado por Git.

La revisión visual independiente final obtuvo `ship` para esta extensión en las capturas de escritorio, móvil y ancho del usuario. No certifica el resto histórico de la app ni los servicios remotos.
