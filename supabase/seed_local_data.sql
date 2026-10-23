-- ==============================================================================
-- Seed: 8 cursos, 19 sesiones recurrentes y 5 actividades locales para Supabase
-- ==============================================================================
BEGIN;

-- Asegurar compatibilidad en la columna holiday_policy
ALTER TABLE public.subjects ALTER COLUMN holiday_policy DROP NOT NULL;
ALTER TABLE public.subjects ALTER COLUMN holiday_policy SET DEFAULT 'inherit';
UPDATE public.subjects SET holiday_policy = 'inherit' WHERE holiday_policy IS NULL;

INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('eca47b4c-1390-4f84-801d-d3c59b08b205', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Innovación', 'INN-101', '#f59e0b', 'Profesor de Innovación', 'H-203', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('bf31990d-22a7-4db2-8ce6-06ea809d2c85', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Matemática Discreta', 'DISC-102', '#ec4899', 'Profesor de Discreta', 'H-202', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('cb10dd1e-e143-4a6a-8fcf-6963dcc712a1', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Estadística y Probabilidades', 'EST-201', '#eab308', 'Plaza a Contratar', 'H-202', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('451c03f2-da2e-4920-8c8a-390f83c24901', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Inteligencia Artificial', 'IA-301', '#8b5cf6', 'Profesor de IA', 'H-205', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('15848c43-f024-4442-836b-9544275e4bf9', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Arquitectura de Software', 'ARQ-302', '#10b981', 'Profesor de Arquitectura', 'H-205', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T04:45:44.829Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('2b233d6e-61a6-41d6-8302-33cbff33dc55', '727db856-313b-4c91-91e4-7fac976dfc6d', 'Sistemas Operativos', 'SO-203', '#06b6d4', 'Profesor de Sistemas Operativos', 'H-203', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('7682595f-edab-4d5e-8cda-9d208a55f2c1', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', 'Diseño UX/UI & Prototipado', 'UX-101', '#ec4899', 'Docente UX', 'Lab Creativo 3', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';
INSERT INTO public.subjects (id, profile_id, name, code, color, professor, classroom, is_active, term, holiday_policy, created_at, updated_at)
VALUES ('81213890-da20-44e2-80c6-13d5459f03f9', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', 'Marketing Digital & Métricas', 'MKT-202', '#f43f5e', 'Docente Marketing', 'A-104', true, NULL, 'inherit', '2026-10-23T03:53:50.139Z', '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color = EXCLUDED.color, holiday_policy = 'inherit';

INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('18910b2f-796d-431a-85a0-97aaabad99ed', '727db856-313b-4c91-91e4-7fac976dfc6d', 'eca47b4c-1390-4f84-801d-d3c59b08b205', 1, '07:00', '09:00', 'Teoría / H-203', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('d57a6cd6-13ac-489e-83cb-3473e312f361', '727db856-313b-4c91-91e4-7fac976dfc6d', 'eca47b4c-1390-4f84-801d-d3c59b08b205', 5, '18:00', '20:00', 'Lab 01 (H-212)', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('0ddd5033-09b9-4f5a-8a69-9a280099a2a9', '727db856-313b-4c91-91e4-7fac976dfc6d', 'bf31990d-22a7-4db2-8ce6-06ea809d2c85', 3, '07:00', '09:00', 'H-202', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('c02a0090-e461-4820-813a-0c0943cf6215', '727db856-313b-4c91-91e4-7fac976dfc6d', 'bf31990d-22a7-4db2-8ce6-06ea809d2c85', 4, '09:00', '10:00', 'H-202', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('d43b6cef-a0f4-4f96-833d-e2269b96fa69', '727db856-313b-4c91-91e4-7fac976dfc6d', 'cb10dd1e-e143-4a6a-8fcf-6963dcc712a1', 4, '07:00', '09:00', 'H-202', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('fdbcee24-502b-43a2-866b-1e1d02913ff5', '727db856-313b-4c91-91e4-7fac976dfc6d', 'cb10dd1e-e143-4a6a-8fcf-6963dcc712a1', 3, '11:00', '13:00', 'Lab 05 / Plaza a Contratar', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('28e8a067-6434-46a6-85be-bfd6f2211879', '727db856-313b-4c91-91e4-7fac976dfc6d', 'cb10dd1e-e143-4a6a-8fcf-6963dcc712a1', 5, '14:00', '16:00', 'H-202', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('47b6fb4d-134c-4b52-8039-e08227404005', '727db856-313b-4c91-91e4-7fac976dfc6d', '451c03f2-da2e-4920-8c8a-390f83c24901', 5, '07:00', '09:00', 'Lab 01 (H-212)', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('8c263bb1-317a-42f2-8b17-ec3e7e1c53c5', '727db856-313b-4c91-91e4-7fac976dfc6d', '451c03f2-da2e-4920-8c8a-390f83c24901', 2, '16:00', '18:00', 'H-205', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('5baa0e25-9a53-4cf2-8dd7-20a21abcad65', '727db856-313b-4c91-91e4-7fac976dfc6d', '451c03f2-da2e-4920-8c8a-390f83c24901', 4, '17:00', '18:00', 'H-205', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('09752648-e1a6-47d8-8824-c68179b9dc2d', '727db856-313b-4c91-91e4-7fac976dfc6d', '2b233d6e-61a6-41d6-8302-33cbff33dc55', 1, '14:00', '15:30', 'H-203', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('2c5493c2-a82b-4b0c-8e10-1a474526f2f1', '727db856-313b-4c91-91e4-7fac976dfc6d', '2b233d6e-61a6-41d6-8302-33cbff33dc55', 3, '14:00', '16:00', 'H-203', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('3bf27ed1-77b1-4c22-8fbd-6d72428e67f5', '727db856-313b-4c91-91e4-7fac976dfc6d', '2b233d6e-61a6-41d6-8302-33cbff33dc55', 4, '18:00', '20:00', 'Lab 02 (H-213)', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('0b667e8c-0c35-45e4-89ee-15c55bf06b45', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', '7682595f-edab-4d5e-8cda-9d208a55f2c1', 2, '10:00', '12:00', 'Lab Creativo 3', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('2ebea848-da98-44ec-82d6-b941661136c5', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', '7682595f-edab-4d5e-8cda-9d208a55f2c1', 4, '10:00', '12:00', 'Lab Creativo 3', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('00a9bd0f-c5af-41aa-8d44-bec6eba230ed', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', '81213890-da20-44e2-80c6-13d5459f03f9', 5, '14:00', '16:00', 'A-104', NULL, 'theory', '[]'::jsonb, '2026-10-23T03:53:50.139Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('0c5f55d4-fe22-4da9-847f-37030dd93643', '727db856-313b-4c91-91e4-7fac976dfc6d', '15848c43-f024-4442-836b-9544275e4bf9', 6, '09:00', '11:00', 'Lab 01 (H-212)', NULL, 'laboratory', '[]'::jsonb, '2026-10-23T04:45:44.829Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('f78c2013-194c-42fb-9d4c-329dea802892', '727db856-313b-4c91-91e4-7fac976dfc6d', '15848c43-f024-4442-836b-9544275e4bf9', 5, '16:00', '18:00', 'H-205', NULL, 'theory', '[]'::jsonb, '2026-10-23T04:45:44.829Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.recurrent_classes (id, profile_id, subject_id, day_of_week, start_time, end_time, classroom, professor, session_type, exceptions, created_at)
VALUES ('c6d1a188-a3e8-42b3-83a5-a70c920306b0', '727db856-313b-4c91-91e4-7fac976dfc6d', '15848c43-f024-4442-836b-9544275e4bf9', 2, '18:00', '19:00', 'H-205', NULL, 'theory', '[]'::jsonb, '2026-10-23T04:45:44.829Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.activities (id, profile_id, subject_id, title, description, type, status, start_datetime, end_datetime, is_all_day, priority, is_shared, invitation, metadata, created_at, updated_at)
VALUES ('097cbbda-72b6-4fc6-8cd4-5c677d7f32f9', '727db856-313b-4c91-91e4-7fac976dfc6d', '451c03f2-da2e-4920-8c8a-390f83c24901', 'Examen Parcial: Redes Neuronales y Búsqueda Heurística', 'Aula H-205. Llevar apuntes permitidos.', 'exam', 'completed', '2026-10-27T21:00:00.000Z', '2026-10-27T23:00:00.000Z', false, 'high', false, NULL, '{}'::jsonb, '2026-10-23T03:53:50.321Z', '2026-10-23T04:45:21.371Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, profile_id, subject_id, title, description, type, status, start_datetime, end_datetime, is_all_day, priority, is_shared, invitation, metadata, created_at, updated_at)
VALUES ('747ffce4-0677-4044-8d40-6b5d30c37d95', '727db856-313b-4c91-91e4-7fac976dfc6d', '15848c43-f024-4442-836b-9544275e4bf9', 'Entrega de Diagrama de Microservicios', 'Documentar arquitectura hexagonal en formato PDF.', 'task', 'completed', '2026-10-24T04:59:00.000Z', NULL, false, 'medium', false, NULL, '{}'::jsonb, '2026-10-23T03:53:50.321Z', '2026-10-23T05:11:45.888Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, profile_id, subject_id, title, description, type, status, start_datetime, end_datetime, is_all_day, priority, is_shared, invitation, metadata, created_at, updated_at)
VALUES ('b4978ce1-b503-4992-8890-bc9c80bc25e5', '727db856-313b-4c91-91e4-7fac976dfc6d', NULL, '💖 Cita / Cena & Paseo juntos', 'Salir a cenar y ver una película.', 'personal', 'pending', '2026-10-25T00:00:00.000Z', '2026-10-25T02:30:00.000Z', false, 'high', true, NULL, '{"couple":true}'::jsonb, '2026-10-23T03:53:50.321Z', '2026-10-23T03:53:50.321Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, profile_id, subject_id, title, description, type, status, start_datetime, end_datetime, is_all_day, priority, is_shared, invitation, metadata, created_at, updated_at)
VALUES ('33447c29-5e51-4c3a-884e-cdc20439338d', '1e12d23b-f0b2-49d4-ae4b-b602226c7d14', '7682595f-edab-4d5e-8cda-9d208a55f2c1', 'Entrega de Wireframes de App Móvil en Figma', 'Subir enlace público del prototipo interactivo.', 'task', 'pending', '2026-10-24T04:59:00.000Z', NULL, false, 'high', false, NULL, '{}'::jsonb, '2026-10-23T03:53:50.321Z', '2026-10-23T03:53:50.321Z')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.activities (id, profile_id, subject_id, title, description, type, status, start_datetime, end_datetime, is_all_day, priority, is_shared, invitation, metadata, created_at, updated_at)
VALUES ('2a61c2a2-3bae-473a-8702-5187d6d61a7a', '727db856-313b-4c91-91e4-7fac976dfc6d', 'eca47b4c-1390-4f84-801d-d3c59b08b205', 'examen', NULL, 'task', 'pending', '2026-10-31T12:00:00.000Z', NULL, false, 'medium', false, NULL, '{}'::jsonb, '2026-10-23T11:48:22.278Z', '2026-10-23T11:48:22.278Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;
