-- ==============================================================================
-- memorIA Database Schema: Modo Dúo / Pareja (PostgreSQL para Supabase)
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla: user_profiles (Perfiles sin contraseñas)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(60) NOT NULL,
    nickname VARCHAR(60),
    avatar_color VARCHAR(10) NOT NULL DEFAULT '#3b82f6',
    role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'owner' o 'partner'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla: subjects (Materias / Asignaturas)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    user_id UUID, -- Opcional para vincular con Supabase Auth si en el futuro se desea
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    color VARCHAR(10) NOT NULL DEFAULT '#3b82f6',
    professor VARCHAR(100),
    classroom VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: recurrent_classes (Horario Semanal Recurrente)
-- day_of_week: 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo
CREATE TABLE IF NOT EXISTS recurrent_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla: activities (Tareas, Exámenes, Reuniones y Citas Compartidas)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'exam', 'meeting', 'personal')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_shared BOOLEAN NOT NULL DEFAULT false, -- Si es true, ambos pueden verla (citas, almuerzos, salidas)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Índices de Búsqueda
CREATE INDEX IF NOT EXISTS idx_subjects_profile ON subjects(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_profile ON recurrent_classes(profile_id);
CREATE INDEX IF NOT EXISTS idx_recurrent_classes_subject ON recurrent_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_activities_profile ON activities(profile_id);
CREATE INDEX IF NOT EXISTS idx_activities_shared ON activities(is_shared);
CREATE INDEX IF NOT EXISTS idx_activities_dates ON activities(start_datetime);

-- 7. Políticas de Seguridad RLS (Permiten acceso público para uso directo y sin contraseñas)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrent_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access to profiles" ON user_profiles;
CREATE POLICY "Public access to profiles" ON user_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to subjects" ON subjects;
CREATE POLICY "Public access to subjects" ON subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to recurrent classes" ON recurrent_classes;
CREATE POLICY "Public access to recurrent classes" ON recurrent_classes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to activities" ON activities;
CREATE POLICY "Public access to activities" ON activities FOR ALL USING (true) WITH CHECK (true);


-- ==============================================================================
-- 8. SIEMBRA INICIAL: Perfiles de Luis y Novia + Horario Universitario
-- ==============================================================================

DO $$
DECLARE
    p_luis UUID;
    p_novia UUID;
    sub_innovacion UUID;
    sub_discreta UUID;
    sub_estadistica UUID;
    sub_ia UUID;
    sub_arq_soft UUID;
    sub_sist_oper UUID;
    sub_trabajo UUID;
BEGIN
    -- Crear o encontrar perfil de Luis
    SELECT id INTO p_luis FROM user_profiles WHERE name = 'Luis' LIMIT 1;
    IF p_luis IS NULL THEN
        INSERT INTO user_profiles (name, nickname, avatar_color, role)
        VALUES ('Luis', 'Luis', '#3b82f6', 'owner')
        RETURNING id INTO p_luis;
    END IF;

    -- Crear o encontrar perfil de Mi Novia
    SELECT id INTO p_novia FROM user_profiles WHERE name = 'Mi Novia' LIMIT 1;
    IF p_novia IS NULL THEN
        INSERT INTO user_profiles (name, nickname, avatar_color, role)
        VALUES ('Mi Novia', 'Amor 💖', '#ec4899', 'partner')
        RETURNING id INTO p_novia;
    END IF;

    -- Si Luis aún no tiene materias sembradas:
    IF NOT EXISTS (SELECT 1 FROM subjects WHERE profile_id = p_luis) THEN
        -- 1. Innovación
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Innovación', 'INN-101', '#f59e0b', 'H-203', true)
        RETURNING id INTO sub_innovacion;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_innovacion, 1, '07:00', '09:00', 'Teoría / H-203');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_innovacion, 5, '18:00', '20:00', 'Lab 01 (H-212)');

        -- 2. Matemática Discreta
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Matemática Discreta', 'DISC-102', '#ec4899', 'H-202', true)
        RETURNING id INTO sub_discreta;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_discreta, 3, '07:00', '09:00', 'H-202');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_discreta, 4, '09:00', '10:00', 'H-202');

        -- 3. Estadística y Probabilidades
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Estadística y Probabilidades', 'EST-201', '#eab308', 'H-202', true)
        RETURNING id INTO sub_estadistica;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_estadistica, 4, '07:00', '09:00', 'H-202');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_estadistica, 3, '11:00', '13:00', 'Lab 05 / Plaza a Contratar');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_estadistica, 5, '14:00', '16:00', 'H-202');

        -- 4. Inteligencia Artificial
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Inteligencia Artificial', 'IA-301', '#8b5cf6', 'H-205', true)
        RETURNING id INTO sub_ia;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_ia, 5, '07:00', '09:00', 'Lab: IA I / Lab 01 (H-212)');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_ia, 2, '16:00', '18:00', 'H-205');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_ia, 4, '17:00', '18:00', 'H-205');

        -- 5. Arquitectura de Software
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Arquitectura de Software', 'ARQ-302', '#10b981', 'H-205', true)
        RETURNING id INTO sub_arq_soft;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_arq_soft, 6, '09:00', '11:00', 'Lab 01 (H-212)');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_arq_soft, 5, '16:00', '18:00', 'H-205');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_arq_soft, 2, '18:00', '19:00', 'H-205');

        -- 6. Sistemas Operativos
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Sistemas Operativos', 'SO-203', '#06b6d4', 'H-203', true)
        RETURNING id INTO sub_sist_oper;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_sist_oper, 1, '14:00', '15:30', 'H-203');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_sist_oper, 3, '14:00', '16:00', 'H-203');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_sist_oper, 4, '18:00', '20:00', 'Lab: Sist. Operativos / Lab 02 (H-213)');

        -- 7. Trabajo Continuo
        INSERT INTO subjects (profile_id, name, code, color, classroom, is_active)
        VALUES (p_luis, 'Trabajo Continuo', 'TRAB', '#64748b', 'Remoto / Oficina', true)
        RETURNING id INTO sub_trabajo;
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 1, '09:30', '13:30', 'Trabajo Continuo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 1, '15:30', '18:00', 'Trabajo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 2, '08:00', '13:30', 'Trabajo Continuo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 2, '14:00', '16:00', 'Trabajo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 4, '10:30', '17:00', 'Trabajo Continuo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 5, '09:30', '13:30', 'Trabajo Continuo');
        INSERT INTO recurrent_classes (profile_id, subject_id, day_of_week, start_time, end_time, classroom)
        VALUES (p_luis, sub_trabajo, 6, '11:30', '18:00', 'Trabajo Continuo');

        -- Tarea y Examen de Luis
        INSERT INTO activities (profile_id, subject_id, title, type, status, start_datetime, end_datetime, priority)
        VALUES (p_luis, sub_ia, 'Examen Parcial de Inteligencia Artificial', 'exam', 'pending', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 2 hours', 'high');
    END IF;

    -- Actividad Compartida de Ejemplo (Cita / Almuerzo juntos)
    IF NOT EXISTS (SELECT 1 FROM activities WHERE is_shared = true) THEN
        INSERT INTO activities (profile_id, title, description, type, status, start_datetime, end_datetime, priority, is_shared)
        VALUES (p_luis, 'Almuerzo juntos 🍽️💖', 'Encuentro en cafetería central o comedor', 'personal', 'pending', NOW() + INTERVAL '1 day 13 hours', NOW() + INTERVAL '1 day 14 hours', 'high', true);
    END IF;

END;
$$;
