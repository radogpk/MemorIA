# memorIA 🎓✨

> **Agenda y Calendario Académico Inteligente (PWA) con IA para Móvil y PC**  
> Diseñado para estudiantes y académicos que necesitan centralizar sus materias, horarios de clases recurrentes, tareas, evaluaciones y reuniones en una única plataforma fluida.

---

## 🌟 Características Principales

1. **📅 Calendario Multifuncional Interactivo:**
   - **Vistas intercambiables:** Vista semanal (cuadrícula horaria de 07:00 a 22:00), vista diaria detallada y vista mensual en cuadrícula.
   - **Proyección de Clases Semanales:** Configuras tus materias y horarios una sola vez y se proyectan automáticamente en cada semana sin duplicar filas en la base de datos.
   - **Detección de Colisiones Horarias:** Alerta visual automática si una reunión o tarea manual se solapa con una clase o examen.

2. **🎓 Gestión Integral de Materias:**
   - Asignación de código, docente, aula base y paleta de colores personalizada.
   - Selector multidia para franjas horarias complejas (ej. *Cálculo: Lunes y Miércoles de 08:00 a 10:00*).

3. **✅ Tablero de Tareas y Evaluaciones:**
   - Agrupación automática por urgencia: **Vencidas**, **Para Hoy**, **Esta Semana**, **Próximas** y **Completadas**.
   - Distinción visual para exámenes (badge rojo prioritario), tareas (color ámbar) y reuniones.

4. **🤖 Asistente Inteligente memorIA (Gemini Flash):**
   - Entrada rápida mediante texto libre o **dictado por voz** desde el navegador.
   - Analiza frases informales como *"Examen de Redes el próximo martes a las 10 am en el aula 204"* y extrae automáticamente la fecha, hora, materia y tipo de evento.
   - Atajo de teclado global: `Ctrl + K` / `Cmd + K`.

5. **📱 Progressive Web App (PWA) Offline-First:**
   - Instalable en Android, iOS (Safari "Añadir a pantalla de inicio") y PC/Mac (Chrome/Edge botón de instalar).
   - Service Worker configurado con `@serwist/next` para consultar el horario y tareas sin conexión activa a internet.

---

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 15 (App Router, React 19, TypeScript).
- **Estilos:** Tailwind CSS con tema oscuro moderno, Lucide Icons.
- **PWA & Cache:** `@serwist/next` con manifiesto web app y soporte offline.
- **Base de Datos & Auth:** Supabase (PostgreSQL con Row Level Security y `@supabase/ssr`).
- **Inteligencia Artificial:** Google Gemini Flash (`@google/generative-ai`) con validación Zod.
- **Pruebas:** Vitest (17 tests unitarios y de integración pasando).
- **Despliegue:** Vercel (Frontend & Serverless API Routes) + Supabase Cloud.

---

## 🚀 Inicio Rápido en Desarrollo Local

### 1. Clonar e Instalar Dependencias
```bash
git clone <tu-repositorio>
cd memorIA
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo:
```bash
cp .env.example .env.local
```
Edita `.env.local` con tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
GEMINI_API_KEY=tu-gemini-api-key-de-google-ai-studio
```
*(Nota: Si no configuras las claves de inmediato, la aplicación cuenta con un modo de respaldo local con datos mock y parser heurístico para que puedas probar la interfaz de inmediato).*

### 3. Ejecutar en Modo Desarrollo
```bash
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000).

### 4. Ejecutar la Suite de Pruebas
```bash
npm test
```

---

## 🗄️ Configuración de la Base de Datos en Supabase

1. Crea un proyecto gratuito en [Supabase](https://supabase.com).
2. Dirígete a la pestaña **SQL Editor**.
3. Abre el archivo `supabase/schema.sql` de este repositorio, copia su contenido y ejecútalo (**Run**).
4. El script creará automáticamente:
   - Tabla `subjects` (Materias).
   - Tabla `recurrent_classes` (Horarios semanales).
   - Tabla `activities` (Tareas, exámenes, reuniones).
   - Políticas de seguridad **Row Level Security (RLS)** para que cada usuario solo acceda a sus propios datos.

---

## ☁️ Despliegue en Vercel

1. Sube tu código a GitHub.
2. Inicia sesión en [Vercel](https://vercel.com) y pulsa **Add New > Project**.
3. Importa tu repositorio `memorIA`.
4. En la sección **Environment Variables**, añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
5. Pulsa **Deploy**. ¡Tu PWA estará disponible en minutos en una URL HTTPS con soporte para instalación móvil y de escritorio!
