-- ==============================================================================
-- memorIA Database Schema (PostgreSQL for Supabase)
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla: subjects (Materias / Asignaturas)
CREATE TABLE IF NOT EXISTS subjects (
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

-- 3. Tabla: recurrent_classes (Horario Semanal Recurrente)
CREATE TABLE IF NOT EXISTS recurrent_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1 = Lunes, 7 = Domingo
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50), -- Opcional, por si el aula varía según el día
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: activities (Actividades Puntuales: Tareas, Exámenes, Reuniones, Eventos)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL, -- Nullable para actividades personales
    title VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'exam', 'meeting', 'personal')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ, -- Nullable para entregas fijas en un punto en el tiempo
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices de Búsqueda y Optimización
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_user ON recurrent_classes(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_subject ON recurrent_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_dates ON activities(user_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_activities_subject ON activities(subject_id);
CREATE INDEX IF NOT EXISTS idx_activities_type_status ON activities(user_id, type, status);

-- 6. Políticas de Seguridad (Row Level Security)
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrent_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own subjects" ON subjects;
CREATE POLICY "Users can manage own subjects" ON subjects
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own recurrent classes" ON recurrent_classes;
CREATE POLICY "Users can manage own recurrent classes" ON recurrent_classes
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own activities" ON activities;
CREATE POLICY "Users can manage own activities" ON activities
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
