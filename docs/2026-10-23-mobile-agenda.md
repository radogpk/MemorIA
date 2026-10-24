# Agenda y Mi día con prioridad móvil

La agenda móvil se organiza por día para que se puedan leer los compromisos sin reducir un horario de escritorio. Esta extensión conserva los perfiles, los datos académicos y el sistema visual existente de memorIA. Describe el código local; todavía no se ha publicado esta interfaz.

## Mi día

«Tu día» destaca el compromiso en curso o el siguiente, con su hora y acceso a los detalles. Después muestra el resto del día. Los compromisos terminados por horario o completados siguen disponibles en «Ver lo que ya pasó», cerrado al entrar; no se marcan como completadas las actividades solo porque haya pasado su hora.

Si ya no quedan compromisos, aparece «Tu agenda de hoy terminó». Un día sin actividades tiene un mensaje distinto. Los accesos a pendientes, a planear juntos y a mañana permiten continuar sin pasar por un panel de estadísticas. La sección de próximos días muestra hasta tres actividades futuras y excluye las actividades de trabajo de esa lista.

## Calendario

Hasta 850 píxeles de ancho, Día muestra una lista cronológica y Semana agrupa esa lista por fechas. Una franja de siete días permite cambiar de fecha; también se conserva un campo de fecha nativo y el acceso a Hoy. Mes funciona como selector de fecha con indicadores de actividades: distingue la selección del día actual y abre la agenda del día elegido. En pantallas más anchas se conservan los horarios de Día y Semana.

El selector permite consultar la agenda propia, la de la otra persona o ambas. Cuando se ven ambas, las filas incluyen el nombre de su propietario. Teoría, laboratorio y práctica mantienen su tipo escrito; dos sesiones de un mismo curso siguen siendo compromisos distintos. Los horarios se presentan en America/Lima. Las tareas con hora y sin fin registrado se muestran como entregas, sin inventarles duración; las de todo el día conservan esa indicación.

En cada fila, tocar la hora, el contenido o la flecha abre un mismo detalle mediante un botón nativo. La acción de completar una tarea es un botón independiente y no forma parte del botón de detalle. El detalle muestra fecha, horario y, en las clases, aula y docente; los datos no registrados dicen «Por confirmar». Las opciones para editar o consultar el curso respetan el perfil propietario. Un compromiso compartido enlaza a su plan.

Los filtros por curso y tipo, la organización del estudio y la exportación se agrupan en «Filtros y opciones». Un filtro aplicado cambia el rótulo a «Filtros activos». Si no hay coincidencias, la agenda ofrece «Quitar filtros»; un día realmente vacío conserva su explicación propia.

## Navegación y formularios

La barra inferior mantiene Mi día, Agenda, Cursos, Tareas y Juntos. El encabezado conserva el perfil activo, el cambio de perfil y Ajustes, cuyo nombre accesible incluye el estado del guardado. «Añadir» queda sobre la barra inferior en móvil y abre el formulario manual. Desde Calendario, conserva la fecha seleccionada. La entrada por voz o texto sigue disponible desde el formulario.

Los controles principales de las superficies revisadas tienen objetivos de al menos 44 píxeles. Los diálogos nativos se presentan cerca del borde inferior en móvil, con campos nativos de 16 píxeles y contenido desplazable. Los espacios reservados para la barra, la acción Añadir y los diálogos contemplan los valores CSS de área segura. Esto describe la implementación; el comportamiento en un dispositivo con muesca o teclado virtual no está verificado.

## Comprobaciones y límites

Pasaron TypeScript, la compilación de producción y 104 pruebas automatizadas; 5 pruebas optativas quedaron omitidas. Seis pruebas de presentación de fechas también se ejecutaron bajo UTC. La revisión con Chromium cubrió 390×844, 320×740, 768×1024 y 1440×900, incluidas ambas personas, días con clases y laboratorios, un día vacío, filtros sin resultados, ambas agendas, el mes y los formularios. Los estados «Ahora» y entrega se ejercitaron con registros sintéticos que después se retiraron.

La evidencia de navegador registra cambio de fecha, selección de perfil y vista, apertura y cierre de detalles, cierre con Escape, fecha conservada al añadir y separación entre consultar y completar una tarea. No se detectó desbordamiento horizontal en los anchos de 390, 320 y 1440 píxeles revisados. El detector CSS se ejecutó una vez, terminó con código 0 y no informó hallazgos.

La corrección final del diseño estrecho se comprobó con una tarea sintética de título largo a 320 píxeles: la hora abre los detalles y conserva su estado pendiente; el botón separado la completa, la mueve a lo ya pasado y permite volver a marcarla pendiente. El título conserva espacio de lectura y el control de completar mide 44 píxeles, sin desbordamiento. La compilación de producción volvió a pasar. La captura adicional es `.impeccable/review/mobile-task-320.png`; los registros de prueba se retiraron y la comparación completa con la copia original volvió a coincidir.

La revisión independiente cerró con `ship` los dos hallazgos: el objetivo de detalle de la fila y su regresión en el diseño estrecho. No observó regresiones en la evidencia de esa corrección. El dictamen cubre esos hallazgos evaluados; no constituye una nueva aprobación de toda la superficie. El registro está en `.impeccable/review/mobile-finish-verdict.md`.

Las capturas muestran el primer viewport; la captura de página completa no estuvo disponible. Los contenidos largos se comprobaron mediante el DOM y su desplazamiento. No se certifican iOS Safari, tacto físico, teclado virtual, muescas, dictado real ni notificaciones push. Esta revisión cubre la extensión de Agenda y Mi día y sus controles compartidos; no es una aprobación de todas las pantallas históricas.

## Datos y publicación

La previsualización en `http://localhost:3001` usa SQLite y una copia aislada en `data/mobile-preview/memoria.sqlite`: 2 perfiles, 13 cursos, 30 sesiones y 124 actividades. Tras retirar los registros de prueba, la comparación de todos los registros normalizados coincidió exactamente con `snapshot-original.json`. No se modificaron los datos de producción ni la base SQLite original.

Las capturas y el registro de comprobaciones están en `.impeccable/review/mobile-evidence.md`. El contrato de esta superficie está en `.impeccable/mobile-agenda.md`. `DESIGN.md` y `.impeccable/design.json` se conservan sin cambios: esta tarea extiende su mundo visual, y los comportamientos móviles específicos quedan documentados aquí. El despliegue sigue pendiente; estas comprobaciones locales no certifican sincronización entre celulares en producción.
