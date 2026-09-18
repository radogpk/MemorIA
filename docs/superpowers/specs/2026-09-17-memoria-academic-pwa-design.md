# Especificación de Diseño: memorIA (Agenda y Calendario Académico PWA)

**Fecha:** 2026-09-17  
**Estado:** Aprobado para Plan de Implementación  
**Autor:** Antigravity & Usuario  
**Repositorio / Proyecto:** `memorIA`

---

## 1. Resumen Ejecutivo y Propósito

**memorIA** es una Progressive Web App (PWA) de alta productividad enfocada en estudiantes y el ámbito académico, diseñada para ejecutarse con fluidez tanto en dispositivos móviles (Android/iOS) como en computadoras de escritorio (Windows/macOS/Linux).

La aplicación unifica en un único calendario interactivo (vistas Día, Semana y Mes):
1. **Horario de clases recurrente:** Materias, aulas, profesores y bloques semanales fijos.
2. **Tareas y entregas:** Actividades con fecha límite y prioridad vinculadas a cada materia.
3. **Exámenes y evaluaciones:** Eventos con alta visibilidad y alertas de colisión horaria.
4. **Reuniones y actividades personales:** Bloques de tiempo libres o eventos puntuales.
5. **Asistente inteligente (*memorIA Quick-Add*):** Motor de lenguaje natural con Gemini Flash que extrae automáticamente fecha, hora, materia y tipo de evento a partir de texto informal.

El backend y base de datos se alojan en **Supabase** (PostgreSQL con Row Level Security y Supabase Auth) y el despliegue frontend/servidor se realiza de forma nativa en **Vercel**.

---

## 2. Arquitectura General del Sistema

```
┌───────────────────────────────────────────────────────────────┐
│                    Dispositivos de Usuario                    │
│   [Móvil: PWA Standalone]        [PC / Desktop: Browser / PWA]│
└──────────────────────────────┬────────────────────────────────┘
                               │ HTTPS / Service Worker Cache
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                 Vercel Platform (Next.js 15)                  │
│  ┌───────────────────────┐       ┌─────────────────────────┐  │
│  │ App Router UI / React │       │ API Routes (Serverless) │  │
│  │ - Calendar Views      │       │ - /api/ai/quick-add     │  │
│  │ - Subjects / Classes  │       │ - Auth & Session Verify │  │
│  │ - Serwist PWA Engine  │       │ - Gemini Flash SDK      │  │
│  └───────────┬───────────┘       └────────────┬────────────┘  │
└──────────────┼────────────────────────────────┼───────────────┘
               │ Data Operations (RLS)          │ Prompt + Output Schema
               ▼                                ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│       Supabase Cloud         │ │     Google AI Platform       │
│  - PostgreSQL Database       │ │  - Gemini 1.5 / 2.0 Flash    │
│  - Supabase Auth (JWT)       │ │  - Structured JSON Output    │
│  - Row Level Security (RLS)  │ └──────────────────────────────┘
└──────────────────────────────┘
```

### Tecnologías Clave:
* **Frontend Framework:** Next.js 15 (App Router, React 19, TypeScript).
* **Estilos y Componentes:** Tailwind CSS, Radix UI Primitives, Lucide Icons, `date-fns` (manejo ágil de fechas y zonas horarias).
* **PWA / Service Worker:** `@serwist/next` (cacheo de activos estáticos y estrategia Network-First para consulta offline).
* **Base de Datos & Auth:** Supabase PostgreSQL con RLS policies por `auth.uid()`, `@supabase/ssr` para autenticación con cookies seguras.
* **Inteligencia Artificial:** `@google/genai` con modelo Gemini Flash para inferencia JSON estructurada con validación Zod.
* **Hosting:** Vercel (Frontend & Serverless Functions) + Supabase (Database & Auth).

---

## 3. Modelo de Datos en Supabase (PostgreSQL)

### 3.1. Esquema Relacional

```sql
-- Extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Materias / Asignaturas
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    color VARCHAR(10) NOT NULL DEFAULT '#3b82f6',
    professor VARCHAR(100),
    classroom VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Clases Recurrentes Semanales (Horario)
CREATE TABLE recurrent_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50), -- Opcional, anula el aula general de la materia si es específica de ese día
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Actividades Puntuales (Tareas, Exámenes, Reuniones, Eventos)
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL, -- NULL para eventos no académicos
    title VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'exam', 'meeting', 'personal')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ, -- Si es nulo, representa un punto en el tiempo (ej. entrega a las 23:59)
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX idx_subjects_user ON subjects(user_id);
CREATE INDEX idx_recurrent_classes_user ON recurrent_classes(user_id);
CREATE INDEX idx_activities_user_dates ON activities(user_id, start_datetime);
CREATE INDEX idx_activities_subject ON activities(subject_id);

-- Políticas de Seguridad (Row Level Security)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrent_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subjects" ON subjects
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own recurrent classes" ON recurrent_classes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own activities" ON activities
    FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Diseño del Frontend y Experiencia de Usuario (PWA)

### 4.1. Vistas Principales

1. **Vista Calendario Unificado (`/calendar`):**
   * Selector superior: `Día` | `Semana` (por defecto) | `Mes`.
   * Flechas de navegación temporal (`<`, `>`, botón `Hoy`).
   * Cuadrícula horaria semanal (7:00 AM a 10:00 PM):
     * Las `recurrent_classes` se calculan en cliente para el rango de la semana visualizada y se pintan con el color asignado a la materia.
     * Las `activities` se superponen en su horario exacto. Si es `task` con hora límite, aparece como un bloque compacto o indicador visual; si es `exam`, con borde destacado y badge rojo; si es `meeting`, con indicador de reunión.
   * Filtro interactivo por etiquetas (Materias activas, Solo exámenes, Tareas pendientes).

2. **Vista Materias y Horario (`/subjects`):**
   * Tarjetas por materia: código, nombre, docente, aula base, color picker.
   * Asignación visual de bloques de clases de la semana (ej. *Martes y Jueves 08:00 - 10:00*).

3. **Vista Tareas & Entregas (`/tasks`):**
   * Listado organizado por: *Vencidas*, *Para Hoy*, *Esta Semana*, *Completadas*.
   * Checkbox directo para completar tareas.

4. **Modal Asistente memorIA (`QuickAddDialog`):**
   * Invocable con atajo `Ctrl+K` / `Cmd+K` o botón flotante `+`.
   * Pestaña 1: **memorIA IA** (Input de texto libre o dictado por voz del navegador).
   * Pestaña 2: **Manual** (Formulario estructurado tradicional).

### 4.2. Especificaciones PWA
* `manifest.json`: 
  * `name`: "memorIA - Agenda & Calendario Académico"
  * `short_name`: "memorIA"
  * `display`: "standalone"
  * `start_url`: "/calendar"
  * `theme_color`: "#0f172a"
  * `background_color`: "#020617"
  * `icons`: 192x192, 512x512 y maskable icons.
* Service Worker configurado con estrategia:
  * Cache estática (`staleWhileRevalidate` para JS/CSS/Fonts).
  * Cache de datos recientes para abrir la app y ver las clases del día sin conexión activa.

---

## 5. Módulo de Inteligencia Artificial (memorIA Engine)

### 5.1. Endpoint `/api/ai/quick-add` (Serverless)

* **Entrada (Request Body):**
  ```json
  {
    "raw_text": "El profesor de Redes dijo que el examen parcial es el próximo martes a las 10 am y dura 2 horas",
    "user_timezone": "America/Bogota",
    "current_datetime": "2026-09-17T23:55:00-05:00",
    "subjects_context": [
      { "id": "uuid-1", "name": "Redes de Computadoras", "code": "RED-201" },
      { "id": "uuid-2", "name": "Cálculo Diferencial", "code": "MAT-101" }
    ]
  }
  ```

* **Procesamiento:**
  * Uso de Gemini Flash con System Prompt que instruye la resolución de fechas relativas ("próximo martes", "mañana", "en 3 días") basándose estrictamente en `current_datetime` y `user_timezone`.
  * Matching inteligente del nombre de materia con `subjects_context`.
  * Generación estricta de JSON vía esquema Zod (`generateObject` o `responseSchema`).

* **Salida Estructurada (Response):**
  ```json
  {
    "parsed": {
      "title": "Examen Parcial",
      "type": "exam",
      "subject_id": "uuid-1",
      "subject_name": "Redes de Computadoras",
      "start_datetime": "2026-09-22T10:00:00-05:00",
      "end_datetime": "2026-09-22T12:00:00-05:00",
      "is_all_day": false,
      "priority": "high",
      "description": "Detectado vía memorIA: examen parcial de 2 horas"
    }
  }
  ```

* **Validación en Cliente:** La interfaz muestra un cuadro de previsualización antes de guardar en Supabase, permitiendo al usuario corregir cualquier campo con un clic.

---

## 6. Manejo de Errores y Casos Borde

1. **Detección de Colisiones Horarias:**
   * Al agregar o editar una actividad en un horario donde ya existe una clase recurrente o un examen, el sistema no bloquea agresivamente, pero presenta una advertencia clara: *"Atención: Tienes clase de Cálculo en este horario"*.
2. **Offline Mode:**
   * Si el usuario no tiene conexión al abrir la PWA, los datos visualizados provienen de la caché local de IndexedDB / Service Worker. Si intenta invocar la IA sin red, se notifica de inmediato: *"memorIA IA requiere conexión. Puedes usar el registro manual"*.
3. **Manejo de Zona Horaria (Timezones):**
   * Todas las fechas se almacenan en UTC (`TIMESTAMPTZ`) en Supabase y se renderizan en el timezone local del navegador del usuario para evitar desfases de horario al cambiar de región.

---

## 7. Plan de Pruebas y Validación

1. **Pruebas Unitarias:**
   * Generación y proyección de clases recurrentes: verificar que para una semana dada (ej. 21 al 27 de septiembre) un curso de los lunes a las 8am se proyecte exactamente en la fecha correcta.
   * Validación del schema Zod del parser de IA.
2. **Pruebas de Integración:**
   * Autenticación con Supabase (inicio de sesión, refresco de sesión con cookies).
   * Operaciones CRUD en `subjects`, `recurrent_classes` y `activities` validando las políticas RLS.
3. **Pruebas PWA y Responsive:**
   * Auditoría con Lighthouse (Categoría PWA: manifest válido, service worker registrado, standalone experience).
   * Verificación en viewport móvil (390px / iPhone) y desktop (1440px / Monitor).

---

## 8. Despliegue en Vercel y Variables de Entorno

### Variables Requeridas:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
GEMINI_API_KEY=<tu-gemini-api-key>
NEXT_PUBLIC_APP_URL=https://memoria-app.vercel.app
```
