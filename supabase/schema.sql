-- ==============================================================================
-- memorIA Database Schema & Schedule Seed (PostgreSQL for Supabase)
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
-- day_of_week: 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo
CREATE TABLE IF NOT EXISTS recurrent_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: activities (Actividades Puntuales: Tareas, Exámenes, Reuniones, Eventos)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'exam', 'meeting', 'personal')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ,
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

-- 6. Políticas de Seguridad (Row Level Security - RLS)
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


-- ==============================================================================
-- 7. FUNCIÓN Y SEED AUTOMÁTICO DE TUS CURSOS REALES
-- Ejecuta esta función en Supabase cuando crees un usuario o la invoques
-- ==============================================================================

CREATE OR REPLACE FUNCTION seed_user_academic_schedule(target_user_id UUID)
RETURNS void AS $$
DECLARE
    sub_innovacion UUID;
    sub_discreta UUID;
    sub_estadistica UUID;
    sub_ia UUID;
    sub_arq_soft UUID;
    sub_sist_oper UUID;
    sub_trabajo UUID;
BEGIN
    -- 1. Materia: Innovación
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Innovación', 'INN-101', '#f59e0b', 'H-203', true)
    RETURNING id INTO sub_innovacion;

    -- Clases de Innovación:
    -- Lunes 07:00 - 09:00 (Teoría / H-203)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_innovacion, 1, '07:00', '09:00', 'H-203');
    -- Viernes 18:00 - 20:00 (Lab 01 (H-212))
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_innovacion, 5, '18:00', '20:00', 'Lab 01 (H-212)');

    -- 2. Materia: Matemática Discreta
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Matemática Discreta', 'DISC-102', '#ec4899', 'H-202', true)
    RETURNING id INTO sub_discreta;

    -- Clases de Discreta:
    -- Miércoles 07:00 - 09:00 (H-202)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_discreta, 3, '07:00', '09:00', 'H-202');
    -- Jueves 09:00 - 10:00 (H-202)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_discreta, 4, '09:00', '10:00', 'H-202');

    -- 3. Materia: Estadística y Probabilidades
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Estadística y Probabilidades', 'EST-201', '#eab308', 'H-202', true)
    RETURNING id INTO sub_estadistica;

    -- Clases de Estadística:
    -- Jueves 07:00 - 09:00 (H-202)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_estadistica, 4, '07:00', '09:00', 'H-202');
    -- Miércoles 11:00 - 13:00 (Lab: Estadística y Prob. / Lab 05)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_estadistica, 3, '11:00', '13:00', 'Lab 05');
    -- Viernes 14:00 - 16:00 (H-202)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_estadistica, 5, '14:00', '16:00', 'H-202');

    -- 4. Materia: Inteligencia Artificial
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Inteligencia Artificial', 'IA-301', '#8b5cf6', 'H-205', true)
    RETURNING id INTO sub_ia;

    -- Clases de IA:
    -- Viernes 07:00 - 09:00 (Lab: IA I / Lab 01 (H-212))
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_ia, 5, '07:00', '09:00', 'Lab 01 (H-212)');
    -- Martes 16:00 - 18:00 (H-205)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_ia, 2, '16:00', '18:00', 'H-205');
    -- Jueves 17:00 - 18:00 (H-205)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_ia, 4, '17:00', '18:00', 'H-205');

    -- 5. Materia: Arquitectura de Software
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Arquitectura de Software', 'ARQ-302', '#10b981', 'H-205', true)
    RETURNING id INTO sub_arq_soft;

    -- Clases de Arq. Software:
    -- Sábado 09:00 - 11:00 (Lab 01 (H-212))
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_arq_soft, 6, '09:00', '11:00', 'Lab 01 (H-212)');
    -- Viernes 16:00 - 18:00 (H-205)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_arq_soft, 5, '16:00', '18:00', 'H-205');
    -- Martes 18:00 - 19:00 (H-205)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_arq_soft, 2, '18:00', '19:00', 'H-205');

    -- 6. Materia: Sistemas Operativos
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Sistemas Operativos', 'SO-203', '#06b6d4', 'H-203', true)
    RETURNING id INTO sub_sist_oper;

    -- Clases de Sistemas Operativos:
    -- Lunes 14:00 - 15:30 (H-203)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_sist_oper, 1, '14:00', '15:30', 'H-203');
    -- Miércoles 14:00 - 16:00 (H-203)
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_sist_oper, 3, '14:00', '16:00', 'H-203');
    -- Jueves 18:00 - 20:00 (Lab: Sist. Operativos / Lab 02 (H-213))
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_sist_oper, 4, '18:00', '20:00', 'Lab 02 (H-213)');

    -- 7. Actividad Recurrente / Materia: Trabajo Continuo
    INSERT INTO subjects (user_id, name, code, color, classroom, is_active)
    VALUES (target_user_id, 'Trabajo Continuo', 'TRAB', '#64748b', 'Remoto / Oficina', true)
    RETURNING id INTO sub_trabajo;

    -- Horarios de Trabajo Continuo:
    -- Lunes: 09:30 - 13:30 y 15:30 - 18:00
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 1, '09:30', '13:30', 'Trabajo');
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 1, '15:30', '18:00', 'Trabajo');

    -- Martes: 08:00 - 13:30 y 14:00 - 16:00
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 2, '08:00', '13:30', 'Trabajo');
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 2, '14:00', '16:00', 'Trabajo');

    -- Jueves: 10:30 - 17:00
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 4, '10:30', '17:00', 'Trabajo');

    -- Viernes: 09:30 - 13:30
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 5, '09:30', '13:30', 'Trabajo');

    -- Sábado: 11:30 - 18:00
    INSERT INTO recurrent_classes (user_id, subject_id, day_of_week, start_time, end_time, classroom)
    VALUES (target_user_id, sub_trabajo, 6, '11:30', '18:00', 'Trabajo');

END;
$$ LANGUAGE plpgsql;

-- Para sembrar tus cursos a tu usuario actual cuando te registres en Supabase, ejecuta:
-- SELECT seed_user_academic_schedule(auth.uid());
