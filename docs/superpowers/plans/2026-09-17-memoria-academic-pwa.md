# memorIA (Agenda y Calendario Académico PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir y desplegar la PWA memorIA para gestión académica integral con calendario multifuncional, clases recurrentes, tareas/exámenes, asistente de IA con Gemini Flash y sincronización con Supabase.

**Architecture:** Aplicación Next.js 15 (App Router) con TypeScript y Tailwind CSS, PWA offline-first con `@serwist/next`, capa de datos en Supabase (PostgreSQL + RLS + Auth SSR), motor de proyección semanal de clases en memoria del cliente y API Route para extracción de actividades en lenguaje natural vía Gemini Flash con esquemas estructurados Zod.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, date-fns, `@supabase/supabase-js`, `@supabase/ssr`, `@serwist/next`, `@google/genai`, Zod, Vitest.

## Global Constraints

- Plataforma base: Next.js 15 App Router, TypeScript estricto.
- Backend & Auth: Supabase Cloud PostgreSQL con políticas RLS obligatorias en todas las tablas.
- PWA: Service Worker activo mediante Serwist con soporte offline para visualización de horarios.
- IA: Endpoint de inferencia seguro en el servidor (`/api/ai/quick-add`) con clave `GEMINI_API_KEY` protegida.
- Internacionalización y zona horaria: Manejo en UTC en base de datos y conversión automática a hora local del navegador.

---

### Task 1: Scaffolding y Configuración Base del Proyecto

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: Node.js 18+ / npm
- Produces: Base ejecutable de Next.js 15 con Tailwind CSS y entorno de pruebas Vitest configurado.

- [ ] **Step 1: Crear configuración de `package.json` con dependencias clave**
  Instalar `next`, `react`, `react-dom`, `typescript`, `@types/node`, `@types/react`, `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `date-fns`, `zod`, `vitest`.
- [ ] **Step 2: Configurar `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts` y `postcss.config.mjs`**
  Habilitar paths `@/*` apuntando a `./src/*` y directivas de Tailwind.
- [ ] **Step 3: Crear `src/app/globals.css` y `src/app/layout.tsx`**
  Definir tipografía, paleta de colores oscuros/claros y envoltorio básico de la app.
- [ ] **Step 4: Crear test de sanidad en Vitest (`src/__tests__/sanity.test.ts`)**
  Verificar que el entorno de pruebas ejecuta y valida aserciones correctamente.
- [ ] **Step 5: Ejecutar test y verificar pase**
  Comando: `npm test` o `npx vitest run`.
- [ ] **Step 6: Commit**
  `git add . && git commit -m "chore: initial Next.js 15 scaffolding with tailwind and vitest"`

---

### Task 2: Capa de Base de Datos Supabase (Esquema SQL y Clientes SSR)

**Files:**
- Create: `supabase/schema.sql`
- Create: `src/types/database.types.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Test: `src/__tests__/supabase-types.test.ts`

**Interfaces:**
- Consumes: Variables de entorno `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Produces: Tipos TypeScript para `Subject`, `RecurrentClass`, `Activity`, clientes listos para browser y Server Components.

- [ ] **Step 1: Escribir archivo `supabase/schema.sql`**
  Incluir tablas `subjects`, `recurrent_classes`, `activities`, índices y políticas RLS con `auth.uid() = user_id`.
- [ ] **Step 2: Crear definiciones de tipos en `src/types/database.types.ts`**
  Definir interfaces `Subject`, `RecurrentClass`, `Activity`, `CreateActivityInput`, etc.
- [ ] **Step 3: Implementar clientes Supabase en `src/lib/supabase/client.ts` y `server.ts`**
  Usar `@supabase/ssr` (`createBrowserClient` y `createServerClient`).
- [ ] **Step 4: Configurar `middleware.ts` para refresco automático de sesión JWT**
- [ ] **Step 5: Escribir test de validación de esquemas y tipos**
  Verificar que los tipos de datos mapean correctamente los campos obligatorios y opcionales.
- [ ] **Step 6: Ejecutar test de verificación y commit**
  `git commit -m "feat(supabase): add schema, types, and SSR clients"`

---

### Task 3: Motor de Proyección de Clases Recurrentes y Calendario

**Files:**
- Create: `src/lib/calendar/projection.ts`
- Create: `src/lib/calendar/types.ts`
- Test: `src/__tests__/calendar-projection.test.ts`

**Interfaces:**
- Consumes: Array de `RecurrentClass`, fecha de inicio y fin de la semana seleccionada.
- Produces: `projectRecurrentClasses(classes: RecurrentClass[], weekStart: Date): ProjectedClassEvent[]`

- [ ] **Step 1: Escribir test unitario de fallo en `src/__tests__/calendar-projection.test.ts`**
  Comprobar que una clase asignada para el día 1 (Lunes) de 08:00 a 10:00 se proyecta exactamente en la fecha del lunes de la semana consultada con su timestamp ISO correspondiente.
- [ ] **Step 2: Ejecutar test y verificar fallo**
- [ ] **Step 3: Implementar `projectRecurrentClasses` en `src/lib/calendar/projection.ts`**
  Usar funciones de `date-fns` (`addDays`, `setHours`, `setMinutes`, `startOfWeek`).
- [ ] **Step 4: Implementar detección de colisiones (`detectCollisions`)**
  Detectar solapamientos de horario entre actividades manuales y clases fijas.
- [ ] **Step 5: Ejecutar tests y confirmar aprobación**
- [ ] **Step 6: Commit**
  `git commit -m "feat(calendar): implement recurrent class projection and collision detection"`

---

### Task 4: Módulo de Gestión de Materias y Horario Fijo (`/subjects`)

**Files:**
- Create: `src/app/subjects/page.tsx`
- Create: `src/components/subjects/SubjectCard.tsx`
- Create: `src/components/subjects/SubjectFormModal.tsx`
- Create: `src/components/subjects/ClassScheduleSelector.tsx`
- Create: `src/lib/actions/subjects.ts`
- Test: `src/__tests__/subjects-validation.test.ts`

**Interfaces:**
- Consumes: Clientes Supabase para insertar/actualizar materias y horarios de clase.
- Produces: Interfaz para crear materia con color, aula, profesor y franjas de clase semanales.

- [ ] **Step 1: Escribir test de validación de datos de materia (nombre requerido, color hex válido)**
- [ ] **Step 2: Implementar Server Actions o llamadas cliente en `src/lib/actions/subjects.ts`**
- [ ] **Step 3: Construir `ClassScheduleSelector.tsx`**
  Selector interactivo de día de semana (Lunes a Domingo) y selector de hora inicio/fin.
- [ ] **Step 4: Construir formulario modal `SubjectFormModal.tsx` y listado `SubjectCard.tsx`**
- [ ] **Step 5: Integrar en la página `/subjects` con estado optimista o revalidación**
- [ ] **Step 6: Commit**
  `git commit -m "feat(subjects): add subject management and weekly schedule configuration"`

---

### Task 5: Componente de Calendario Multifuncional (`/calendar`)

**Files:**
- Create: `src/app/calendar/page.tsx`
- Create: `src/components/calendar/CalendarHeader.tsx`
- Create: `src/components/calendar/WeekView.tsx`
- Create: `src/components/calendar/DayView.tsx`
- Create: `src/components/calendar/MonthView.tsx`
- Create: `src/components/calendar/CalendarEventCard.tsx`
- Create: `src/components/calendar/CalendarFilterBar.tsx`
- Test: `src/__tests__/calendar-views.test.ts`

**Interfaces:**
- Consumes: Clases proyectadas de Task 3 + actividades puntuales de Supabase.
- Produces: Cuadrícula interactiva con horas (07:00 a 22:00), navegación de fechas y filtros.

- [ ] **Step 1: Escribir test unitario de generación de columnas de la semana (Lunes a Domingo)**
- [ ] **Step 2: Construir `CalendarHeader.tsx`**
  Selector de vista (Día/Semana/Mes), botones `< Hoy >`, y botón de acción rápida `+ memorIA`.
- [ ] **Step 3: Construir `WeekView.tsx` con cuadrícula de horas y posicionamiento por porcentaje/minutos**
- [ ] **Step 4: Construir `DayView.tsx` y `MonthView.tsx`**
- [ ] **Step 5: Construir `CalendarEventCard.tsx`**
  Diferenciación visual entre clase (bloque completo), examen (badge rojo), tarea (indicador) y reunión.
- [ ] **Step 6: Construir barra de filtros `CalendarFilterBar.tsx` (toggle por materia y tipo de evento)**
- [ ] **Step 7: Probar renderizado y commit**
  `git commit -m "feat(calendar): implement multifunctional calendar with week, day, and month views"`

---

### Task 6: Módulo de Tareas y Actividades (`/tasks` y Modales)

**Files:**
- Create: `src/app/tasks/page.tsx`
- Create: `src/components/tasks/TaskList.tsx`
- Create: `src/components/tasks/TaskItem.tsx`
- Create: `src/components/tasks/ActivityModal.tsx`
- Create: `src/lib/actions/activities.ts`
- Test: `src/__tests__/activities-status.test.ts`

**Interfaces:**
- Consumes: Supabase `activities` table.
- Produces: Interfaz para marcar tareas como completadas, editar fechas y agregar actividades manuales.

- [ ] **Step 1: Escribir test para filtro de tareas (vencidas, hoy, próximas, completadas)**
- [ ] **Step 2: Implementar acciones CRUD en `src/lib/actions/activities.ts`**
- [ ] **Step 3: Construir `ActivityModal.tsx` con soporte para tareas, exámenes y reuniones**
- [ ] **Step 4: Construir vista de lista `TaskList.tsx` agrupada por fecha y estado**
- [ ] **Step 5: Integrar en `/tasks` y enlazar con el calendario general**
- [ ] **Step 6: Commit**
  `git commit -m "feat(activities): add tasks management and manual activity modal"`

---

### Task 7: Asistente memorIA IA (Entrada Rápida con Gemini Flash)

**Files:**
- Create: `src/app/api/ai/quick-add/route.ts`
- Create: `src/lib/ai/gemini.ts`
- Create: `src/lib/ai/prompts.ts`
- Create: `src/lib/ai/schemas.ts`
- Create: `src/components/ai/QuickAddModal.tsx`
- Test: `src/__tests__/ai-schema.test.ts`

**Interfaces:**
- Consumes: `raw_text`, fecha actual, timezone y catálogo de materias.
- Produces: Objeto estructurado `{ title, type, subject_id, start_datetime, end_datetime, priority }`.

- [ ] **Step 1: Escribir test de validación del esquema Zod de salida IA en `src/__tests__/ai-schema.test.ts`**
- [ ] **Step 2: Configurar cliente `@google/genai` en `src/lib/ai/gemini.ts`**
- [ ] **Step 3: Crear system prompt especializado en calendarización académica en `src/lib/ai/prompts.ts`**
- [ ] **Step 4: Implementar Route Handler `POST /api/ai/quick-add` con validación Zod**
- [ ] **Step 5: Construir `QuickAddModal.tsx` con input de texto libre, loading skeleton y previsualización editable**
- [ ] **Step 6: Añadir atajo de teclado global `Ctrl+K` / `Cmd+K` para abrir el asistente**
- [ ] **Step 7: Probar con mock de IA y commit**
  `git commit -m "feat(ai): integrate Gemini Flash quick-add assistant with structured schema"`

---

### Task 8: Configuración PWA (Serwist), Soporte Offline y Responsive Polish

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/*` (iconos PWA en svg/png)
- Create: `src/app/sw.ts` (Service Worker)
- Modify: `next.config.mjs` (integrar `@serwist/next`)
- Create: `src/components/layout/BottomNavigation.tsx` (Navegación móvil)
- Create: `src/components/layout/Sidebar.tsx` (Navegación desktop)
- Test: `src/__tests__/pwa-manifest.test.ts`

**Interfaces:**
- Consumes: Serwist plugin, navegador compatible con Service Workers.
- Produces: App instalable en escritorio y smartphone con barra de navegación adaptativa.

- [ ] **Step 1: Crear `public/manifest.json` con configuración de standalone, colores e iconos**
- [ ] **Step 2: Generar iconos base PWA (192x192, 512x512)**
- [ ] **Step 3: Implementar Service Worker `src/app/sw.ts` con caching de assets y datos**
- [ ] **Step 4: Configurar `next.config.mjs` con `withSerwist`**
- [ ] **Step 5: Construir `BottomNavigation.tsx` para móviles y `Sidebar.tsx` para desktop**
- [ ] **Step 6: Test de validación del manifest y Service Worker**
- [ ] **Step 7: Commit**
  `git commit -m "feat(pwa): configure Serwist service worker, manifest, and adaptive navigation"`

---

### Task 9: Verificación de Build, Despliegue en Vercel y Documentación

**Files:**
- Create: `README.md`
- Create: `.env.example`
- Modify: `walkthrough.md`

- [ ] **Step 1: Crear `.env.example` con las variables de Supabase y Gemini**
- [ ] **Step 2: Ejecutar build de producción completo (`npm run build`) y verificar 0 errores de compilación o tipado**
- [ ] **Step 3: Redactar `README.md` con instrucciones de configuración de Supabase y despliegue en Vercel en 1 clic**
- [ ] **Step 4: Ejecutar suite completa de pruebas (`npm test`)**
- [ ] **Step 5: Commit final**
  `git commit -m "chore: finalize build verification, env documentation, and deployment guide"`
