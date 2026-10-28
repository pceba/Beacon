-- Beacon · instalación completa en un proyecto VACÍO: esquema + todas las migraciones, en orden.
-- Se genera juntando supabase/schema.sql y supabase/migrations/*.sql. Borra y recrea las tablas.

-- ===== supabase/schema.sql =====
-- ============================================================
-- LIFEPP APP — CLEAN SLATE SETUP
-- Run this in your Supabase SQL Editor, then run
-- supabase/migrations/20261013120000_auth_rls.sql.
-- This script will DROP old tables and RECREATE them correctly.
-- WARNING: This will delete any existing data in these tables.
-- ============================================================

-- 1. Drop existing tables to avoid column/constraint conflicts
DROP TABLE IF EXISTS habit_logs CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS workout_template_exercises CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS nutrition_logs CASCADE;
DROP TABLE IF EXISTS meal_templates CASCADE;
DROP TABLE IF EXISTS sleep_logs CASCADE;
DROP TABLE IF EXISTS mood_logs CASCADE;
DROP TABLE IF EXISTS water_logs CASCADE;
DROP TABLE IF EXISTS body_metrics CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2. Create Tables with correct columns

CREATE TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE,
  display_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE body_metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  date         DATE NOT NULL,
  weight_kg    NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE water_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  log_date   DATE NOT NULL,
  amount_ml  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE mood_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  log_date      DATE NOT NULL,
  mood_score    INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  energy_score  INTEGER CHECK (energy_score BETWEEN 1 AND 5),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);

CREATE TABLE nutrition_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  logged_at  TIMESTAMPTZ DEFAULT NOW(),
  name       TEXT NOT NULL,
  calories   INTEGER DEFAULT 0,
  protein_g  NUMERIC(6,1) DEFAULT 0,
  carbs_g    NUMERIC(6,1) DEFAULT 0,
  fat_g      NUMERIC(6,1) DEFAULT 0,
  meal_type  TEXT DEFAULT 'other',
  notes      TEXT
);

CREATE TABLE meal_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  name       TEXT NOT NULL,
  calories   INTEGER DEFAULT 0,
  protein_g  NUMERIC(6,1) DEFAULT 0,
  carbs_g    NUMERIC(6,1) DEFAULT 0,
  fat_g      NUMERIC(6,1) DEFAULT 0,
  meal_type  TEXT DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  name             TEXT NOT NULL,
  notes            TEXT,
  duration_minutes INTEGER,
  completed        BOOLEAN DEFAULT FALSE
);

CREATE TABLE workout_exercises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID NOT NULL REFERENCES workouts (id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index   INTEGER DEFAULT 0,
  notes         TEXT
);

CREATE TABLE workout_sets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id      UUID NOT NULL REFERENCES workout_exercises (id) ON DELETE CASCADE,
  set_number       INTEGER NOT NULL,
  reps             INTEGER,
  weight_kg        NUMERIC(5,2),
  duration_seconds INTEGER,
  completed        BOOLEAN DEFAULT FALSE
);

CREATE TABLE workout_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workout_template_exercises (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID NOT NULL REFERENCES workout_templates (id) ON DELETE CASCADE,
  exercise_name    TEXT NOT NULL,
  order_index      INTEGER DEFAULT 0,
  default_sets     INTEGER DEFAULT 3,
  default_reps     INTEGER DEFAULT 10,
  default_weight_kg NUMERIC(5,2)
);

CREATE TABLE sleep_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  bed_time       TIMESTAMPTZ NOT NULL,
  wake_time      TIMESTAMPTZ NOT NULL,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habits (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  name       TEXT NOT NULL,
  icon       TEXT,
  color      TEXT DEFAULT '#C8933A',
  frequency  TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE habit_logs (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id  UUID NOT NULL REFERENCES habits (id) ON DELETE CASCADE,
  user_id   UUID NOT NULL,
  log_date  DATE NOT NULL,
  completed BOOLEAN DEFAULT TRUE,
  notes     TEXT,
  UNIQUE (habit_id, log_date)
);

CREATE TABLE journal_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title      TEXT,
  content    TEXT NOT NULL,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  tags       TEXT[] DEFAULT '{}'
);

CREATE TABLE notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title      TEXT,
  content    TEXT NOT NULL
);

CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  deadline    DATE,
  completed   BOOLEAN DEFAULT FALSE,
  priority    TEXT DEFAULT 'medium',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  event_time  TIME,
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  metric_type  TEXT NOT NULL,
  target_value NUMERIC(8,2) NOT NULL,
  period       TEXT DEFAULT 'daily',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security
-- Aquí solo se activa RLS (sin políticas = nadie accede).
-- Las políticas por usuario están en supabase/migrations/20261013120000_auth_rls.sql:
-- ejecútala justo después de este script.

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles','body_metrics','water_logs','mood_logs',
    'nutrition_logs','meal_templates',
    'workouts','workout_exercises','workout_sets',
    'workout_templates','workout_template_exercises',
    'sleep_logs','habits','habit_logs',
    'journal_entries','notes','tasks','events','goals'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "capalot_all" ON %I', tbl);
  END LOOP;
END $$;

-- ===== supabase/migrations/20261013120000_auth_rls.sql =====
-- ============================================================
-- LIFEPP — Auth real y filas por usuario
-- Ejecutar una vez en el SQL Editor de Supabase (o con `supabase db push`).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Qué hace:
--   1. Quita TODAS las políticas abiertas (USING true) de las tablas de la app.
--   2. Activa RLS: cada usuario solo ve y escribe sus filas (user_id = auth.uid()).
--      Las tablas hijas sin user_id se protegen a través de su tabla padre.
--   3. user_id pasa a tener DEFAULT auth.uid() y FK a auth.users (NOT VALID,
--      para no fallar con las filas antiguas que aún tienen el UUID local).
--   4. claim_legacy_user(uuid): el cliente reclama sus filas antiguas
--      (UUID local de antes) la primera vez que entra con sesión.
--   5. Tablas del esquema antiguo (todos, saved_meals, users): RLS sin políticas.
-- ============================================================

-- ------------------------------------------------------------
-- 1 + 2 + 3. Tablas con user_id
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
  owned TEXT[] := ARRAY[
    'profiles','body_metrics','water_logs','mood_logs',
    'nutrition_logs','meal_templates','workouts','workout_templates',
    'sleep_logs','habits','habit_logs','journal_entries','notes',
    'tasks','events','goals'
  ];
BEGIN
  FOREACH tbl IN ARRAY owned LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;

    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id)', tbl || '_user_id_idx', tbl);

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = tbl || '_user_id_auth_fkey'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE NOT VALID',
        tbl, tbl || '_user_id_auth_fkey'
      );
    END IF;

    IF tbl <> 'habit_logs' THEN
      EXECUTE format(
        'CREATE POLICY lifepp_owner ON public.%I FOR ALL TO authenticated
           USING (user_id = (SELECT auth.uid()))
           WITH CHECK (user_id = (SELECT auth.uid()))',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- habit_logs: además, el hábito tiene que ser del mismo usuario.
DO $$
BEGIN
  IF to_regclass('public.habit_logs') IS NOT NULL THEN
    CREATE POLICY lifepp_owner ON public.habit_logs FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (
        user_id = (SELECT auth.uid())
        AND EXISTS (SELECT 1 FROM public.habits h WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid()))
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- Tablas hijas sin user_id: se protegen por su padre
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['workout_exercises','workout_sets','workout_template_exercises'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;

  IF to_regclass('public.workout_exercises') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS workout_exercises_workout_id_idx ON public.workout_exercises (workout_id);
    CREATE POLICY lifepp_owner ON public.workout_exercises FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = (SELECT auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id AND w.user_id = (SELECT auth.uid())));
  END IF;

  IF to_regclass('public.workout_sets') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS workout_sets_exercise_id_idx ON public.workout_sets (exercise_id);
    CREATE POLICY lifepp_owner ON public.workout_sets FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.workout_exercises e JOIN public.workouts w ON w.id = e.workout_id
        WHERE e.id = exercise_id AND w.user_id = (SELECT auth.uid())
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.workout_exercises e JOIN public.workouts w ON w.id = e.workout_id
        WHERE e.id = exercise_id AND w.user_id = (SELECT auth.uid())
      ));
  END IF;

  IF to_regclass('public.workout_template_exercises') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS workout_template_exercises_template_id_idx ON public.workout_template_exercises (template_id);
    CREATE POLICY lifepp_owner ON public.workout_template_exercises FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = (SELECT auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.workout_templates t WHERE t.id = template_id AND t.user_id = (SELECT auth.uid())));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. Esquema antiguo: cerrar del todo (RLS sin políticas = nadie entra con la anon key)
-- ------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['todos','saved_meals','users'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      CONTINUE;
    END IF;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Reclamar filas del UUID local antiguo
-- Solo funciona con sesión, y solo si ese UUID no es ya un usuario real.
-- Las filas que chocarían con un UNIQUE (agua/ánimo del mismo día, perfil) se dejan.
-- Cuando todos tus dispositivos hayan migrado, puedes borrarla:
--   DROP FUNCTION public.claim_legacy_user(uuid);
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_legacy_user(legacy_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  moved integer := 0;
  n integer;
  tbl TEXT;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF legacy_id IS NULL OR legacy_id = me THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = legacy_id) THEN
    RETURN 0;
  END IF;

  FOREACH tbl IN ARRAY ARRAY[
    'body_metrics','nutrition_logs','meal_templates','workouts','workout_templates',
    'sleep_logs','habits','habit_logs','journal_entries','notes','tasks','events','goals'
  ] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET user_id = $1 WHERE user_id = $2', tbl) USING me, legacy_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      moved := moved + n;
    END IF;
  END LOOP;

  FOREACH tbl IN ARRAY ARRAY['water_logs','mood_logs'] LOOP
    IF to_regclass(format('public.%I', tbl)) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%1$I AS old SET user_id = $1
           WHERE old.user_id = $2
             AND NOT EXISTS (SELECT 1 FROM public.%1$I cur WHERE cur.user_id = $1 AND cur.log_date = old.log_date)',
        tbl
      ) USING me, legacy_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      moved := moved + n;
    END IF;
  END LOOP;

  IF to_regclass('public.profiles') IS NOT NULL THEN
    UPDATE public.profiles SET user_id = me
      WHERE user_id = legacy_id
        AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = me);
    GET DIAGNOSTICS n = ROW_COUNT;
    moved := moved + n;
  END IF;

  RETURN moved;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_legacy_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_legacy_user(uuid) TO authenticated;

-- ===== supabase/migrations/20261013140000_mcp_connector.sql =====
-- ============================================================
-- LIFEPP — Conector MCP para Claude (claude.ai con tu plan, sin API key)
-- Ejecutar después de 20261013120000_auth_rls.sql. Idempotente.
--
-- La app genera un token personal (Ajustes → Conectar con Claude). Solo se guarda
-- su hash. La Edge Function lifepp-mcp recibe el token y llama a las funciones
-- mcp_* de aquí abajo, que resuelven el usuario a partir del token y solo tocan
-- sus filas. No hace falta service role.
-- ============================================================

-- La llamada automática a la API de Anthropic ya no se usa.
DROP FUNCTION IF EXISTS public.claude_usage_bump(integer);
DROP TABLE IF EXISTS public.claude_usage;

-- ------------------------------------------------------------
-- Tokens (uno por usuario; generar otro sustituye al anterior)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  tz           text NOT NULL DEFAULT 'UTC',
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
ALTER TABLE public.mcp_tokens ENABLE ROW LEVEL SECURITY;
-- Sin políticas: nadie lee la tabla directamente, solo a través de las funciones.

CREATE OR REPLACE FUNCTION public._mcp_hash(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$ SELECT encode(digest(p_token, 'sha256'), 'hex') $$;

CREATE OR REPLACE FUNCTION public._mcp_valid_tz(p_tz text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_tz IS NULL OR length(p_tz) > 64 THEN
    RETURN 'UTC';
  END IF;
  PERFORM now() AT TIME ZONE p_tz;
  RETURN p_tz;
EXCEPTION WHEN others THEN
  RETURN 'UTC';
END;
$$;

-- App (usuario con sesión): crea o rota su token. Devuelve el token en claro una sola vez.
CREATE OR REPLACE FUNCTION public.create_mcp_token(p_tz text DEFAULT 'UTC')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  me uuid := auth.uid();
  token text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  token := 'lpp_' || encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.mcp_tokens (user_id, token_hash, tz)
  VALUES (me, public._mcp_hash(token), public._mcp_valid_tz(p_tz))
  ON CONFLICT (user_id) DO UPDATE
    SET token_hash = EXCLUDED.token_hash, tz = EXCLUDED.tz, created_at = now(), last_used_at = NULL;
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_mcp_token()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.mcp_tokens WHERE user_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_token_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_build_object('active', true, 'created_at', created_at, 'last_used_at', last_used_at, 'tz', tz)
       FROM public.mcp_tokens WHERE user_id = auth.uid()),
    jsonb_build_object('active', false)
  );
$$;

-- ------------------------------------------------------------
-- Servidor MCP: token → usuario
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._mcp_auth(p_token text, OUT user_id uuid, OUT tz text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^lpp_[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;
  UPDATE public.mcp_tokens t
     SET last_used_at = now()
   WHERE t.token_hash = public._mcp_hash(p_token)
  RETURNING t.user_id, t.tz INTO user_id, tz;
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'invalid token' USING ERRCODE = '28000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._mcp_task_json(t public.tasks)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'id', t.id, 'title', t.title, 'description', t.description,
    'priority', t.priority, 'deadline', t.deadline, 'completed', t.completed
  );
$$;

CREATE OR REPLACE FUNCTION public._mcp_date(p_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_value IS NULL OR p_value !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN NULL;
  END IF;
  RETURN p_value::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Comprobación del token al conectar el conector.
CREATE OR REPLACE FUNCTION public.mcp_whoami(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  zone text;
BEGIN
  SELECT a.tz INTO zone FROM public._mcp_auth(p_token) a;
  RETURN jsonb_build_object('timezone', zone, 'today', (now() AT TIME ZONE zone)::date);
END;
$$;

-- Resumen de un día (por defecto hoy en la zona horaria del token).
CREATE OR REPLACE FUNCTION public.mcp_get_today(p_token text, p_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  day_start timestamptz;
  day_end timestamptz;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  d := COALESCE(public._mcp_date(p_date), (now() AT TIME ZONE zone)::date);
  day_start := d::timestamp AT TIME ZONE zone;
  day_end := (d + 1)::timestamp AT TIME ZONE zone;

  RETURN jsonb_build_object(
    'date', d,
    'timezone', zone,
    'water_ml', COALESCE((SELECT w.amount_ml FROM water_logs w WHERE w.user_id = me AND w.log_date = d), 0),
    'mood', (SELECT m.mood_score FROM mood_logs m WHERE m.user_id = me AND m.log_date = d),
    'energy', (SELECT m.energy_score FROM mood_logs m WHERE m.user_id = me AND m.log_date = d),
    'calories', (SELECT COALESCE(sum(n.calories), 0) FROM nutrition_logs n
                  WHERE n.user_id = me AND n.logged_at >= day_start AND n.logged_at < day_end),
    'meals', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', n.name, 'calories', n.calories) ORDER BY n.logged_at)
                  FROM nutrition_logs n WHERE n.user_id = me AND n.logged_at >= day_start AND n.logged_at < day_end), '[]'::jsonb),
    'sleep_hours', (SELECT round((extract(epoch FROM (s.wake_time - s.bed_time)) / 3600)::numeric, 1)
                  FROM sleep_logs s WHERE s.user_id = me AND s.wake_time >= day_start AND s.wake_time < day_end
                  ORDER BY s.wake_time DESC LIMIT 1),
    'workouts', COALESCE((SELECT jsonb_agg(w.name ORDER BY w.started_at) FROM workouts w
                  WHERE w.user_id = me AND w.started_at >= day_start AND w.started_at < day_end), '[]'::jsonb),
    'habits', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                  'name', h.name,
                  'done', EXISTS (SELECT 1 FROM habit_logs l WHERE l.habit_id = h.id AND l.log_date = d AND l.completed)
                ) ORDER BY h.created_at) FROM habits h WHERE h.user_id = me), '[]'::jsonb),
    'open_tasks', COALESCE((SELECT jsonb_agg(public._mcp_task_json(t) ORDER BY t.deadline NULLS LAST, t.created_at DESC)
                  FROM (SELECT * FROM tasks WHERE user_id = me AND NOT COALESCE(completed, false)
                        ORDER BY deadline NULLS LAST, created_at DESC LIMIT 100) t), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object('title', e.title, 'time', e.event_time, 'location', e.location)
                  ORDER BY e.event_time NULLS FIRST) FROM events e WHERE e.user_id = me AND e.event_date = d), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_list_tasks(p_token text, p_include_completed boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
BEGIN
  SELECT a.user_id INTO me FROM public._mcp_auth(p_token) a;
  RETURN COALESCE((
    SELECT jsonb_agg(public._mcp_task_json(t) ORDER BY t.completed, t.deadline NULLS LAST, t.created_at DESC)
      FROM (SELECT * FROM tasks
             WHERE user_id = me AND (p_include_completed OR NOT COALESCE(completed, false))
             ORDER BY completed, deadline NULLS LAST, created_at DESC
             LIMIT 200) t
  ), '[]'::jsonb);
END;
$$;

-- Añade tareas. Salta las que ya existen abiertas con el mismo título.
CREATE OR REPLACE FUNCTION public.mcp_add_tasks(p_token text, p_tasks jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  item jsonb;
  clean_title text;
  clean_priority text;
  created jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  row_ public.tasks;
BEGIN
  SELECT a.user_id INTO me FROM public._mcp_auth(p_token) a;
  IF jsonb_typeof(p_tasks) <> 'array' THEN
    RAISE EXCEPTION 'tasks must be an array' USING ERRCODE = '22023';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_tasks) WITH ORDINALITY AS e(value, n) WHERE n <= 20 LOOP
    clean_title := left(btrim(COALESCE(item->>'title', '')), 200);
    IF clean_title = '' THEN
      skipped := skipped || jsonb_build_object('title', item->>'title', 'reason', 'sin título');
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM tasks t WHERE t.user_id = me AND NOT COALESCE(t.completed, false)
                 AND lower(btrim(t.title)) = lower(clean_title)) THEN
      skipped := skipped || jsonb_build_object('title', clean_title, 'reason', 'ya existe');
      CONTINUE;
    END IF;
    clean_priority := CASE WHEN item->>'priority' IN ('low', 'medium', 'high') THEN item->>'priority' ELSE 'medium' END;
    INSERT INTO tasks (user_id, title, description, deadline, completed, priority)
    VALUES (me, clean_title, NULLIF(left(btrim(COALESCE(item->>'description', '')), 1000), ''),
            public._mcp_date(item->>'deadline'), false, clean_priority)
    RETURNING * INTO row_;
    created := created || public._mcp_task_json(row_);
  END LOOP;

  RETURN jsonb_build_object('created', created, 'skipped', skipped);
END;
$$;

-- Cambia una tarea propia. Claves admitidas: title, description, deadline (null la quita),
-- priority, completed.
CREATE OR REPLACE FUNCTION public.mcp_update_task(p_token text, p_task_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  row_ public.tasks;
BEGIN
  SELECT a.user_id INTO me FROM public._mcp_auth(p_token) a;
  SELECT * INTO row_ FROM tasks WHERE id = p_task_id AND user_id = me;
  IF row_.id IS NULL THEN
    RAISE EXCEPTION 'task not found' USING ERRCODE = 'P0002';
  END IF;
  IF jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'changes must be an object' USING ERRCODE = '22023';
  END IF;

  IF p_changes ? 'title' AND btrim(COALESCE(p_changes->>'title', '')) <> '' THEN
    row_.title := left(btrim(p_changes->>'title'), 200);
  END IF;
  IF p_changes ? 'description' THEN
    row_.description := NULLIF(left(btrim(COALESCE(p_changes->>'description', '')), 1000), '');
  END IF;
  IF p_changes ? 'deadline' THEN
    row_.deadline := public._mcp_date(p_changes->>'deadline');
  END IF;
  IF p_changes->>'priority' IN ('low', 'medium', 'high') THEN
    row_.priority := p_changes->>'priority';
  END IF;
  IF jsonb_typeof(p_changes->'completed') = 'boolean' THEN
    row_.completed := (p_changes->>'completed')::boolean;
  END IF;

  UPDATE tasks
     SET title = row_.title, description = row_.description, deadline = row_.deadline,
         priority = row_.priority, completed = row_.completed
   WHERE id = row_.id AND user_id = me
  RETURNING * INTO row_;
  RETURN public._mcp_task_json(row_);
END;
$$;

-- ------------------------------------------------------------
-- Permisos
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION public._mcp_hash(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_valid_tz(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_auth(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_task_json(public.tasks) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_date(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_mcp_token(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_mcp_token() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mcp_token_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_mcp_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_mcp_token() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_token_status() TO authenticated;

-- Las mcp_* las llama la Edge Function con la clave pública; el token es la autorización.
REVOKE ALL ON FUNCTION public.mcp_whoami(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_whoami(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.mcp_get_today(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_list_tasks(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_add_tasks(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_update_task(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_get_today(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_tasks(text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_add_tasks(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_task(text, uuid, jsonb) TO anon, authenticated;

-- ===== supabase/migrations/20261014120000_mcp_logs.sql =====
-- ============================================================
-- LIFEPP — Registro y semana para el conector MCP
-- Ejecutar después de 20261013140000_mcp_connector.sql. Idempotente.
-- No borra filas. Cada función autoriza con public._mcp_auth(p_token).
-- ============================================================

-- Momento en la zona del token. Vacío = ahora. yyyy-mm-dd = mediodía.
-- yyyy-mm-dd HH:mm (o con T) se interpreta en esa zona.
CREATE OR REPLACE FUNCTION public._mcp_moment(p_value text, p_zone text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  zone text := COALESCE(NULLIF(btrim(p_zone), ''), 'UTC');
  clean text := NULLIF(btrim(p_value), '');
BEGIN
  IF clean IS NULL THEN
    RETURN now();
  END IF;
  IF clean ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN (clean::date + time '12:00') AT TIME ZONE zone;
  END IF;
  IF clean ~ '^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$' THEN
    RETURN replace(clean, 'T', ' ')::timestamp AT TIME ZONE zone;
  END IF;
  RETURN clean::timestamptz;
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'fecha u hora no válida' USING ERRCODE = '22007';
END;
$$;

CREATE OR REPLACE FUNCTION public._mcp_day(p_value text, p_zone text)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  zone text := COALESCE(NULLIF(btrim(p_zone), ''), 'UTC');
BEGIN
  IF p_value IS NULL OR btrim(p_value) = '' THEN
    RETURN (now() AT TIME ZONE zone)::date;
  END IF;
  IF public._mcp_date(p_value) IS NULL THEN
    RAISE EXCEPTION 'fecha no válida' USING ERRCODE = '22007';
  END IF;
  RETURN public._mcp_date(p_value);
END;
$$;

-- Suma ml al día. Cada llamada admite de 1 a 5000.
CREATE OR REPLACE FUNCTION public.mcp_log_water(p_token text, p_ml integer, p_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  total integer;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF p_ml IS NULL OR p_ml < 1 OR p_ml > 5000 THEN
    RAISE EXCEPTION 'ml fuera de rango (1-5000)' USING ERRCODE = '22023';
  END IF;
  d := public._mcp_day(p_date, zone);

  INSERT INTO water_logs (user_id, log_date, amount_ml)
  VALUES (me, d, p_ml)
  ON CONFLICT (user_id, log_date) DO UPDATE
    SET amount_ml = water_logs.amount_ml + EXCLUDED.amount_ml
  WHERE water_logs.user_id = me
  RETURNING amount_ml INTO total;

  RETURN jsonb_build_object('date', d, 'added_ml', p_ml, 'water_ml', total);
END;
$$;

-- Marca o desmarca un hábito que ya existe. No crea hábitos.
CREATE OR REPLACE FUNCTION public.mcp_log_habit(
  p_token text,
  p_habit_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_done boolean DEFAULT true,
  p_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  v_habit_id uuid;
  habit_name text;
  matches integer;
  clean text;
  done boolean := COALESCE(p_done, true);
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  d := public._mcp_day(p_date, zone);

  IF p_habit_id IS NOT NULL THEN
    SELECT h.id, h.name INTO v_habit_id, habit_name
      FROM habits h WHERE h.id = p_habit_id AND h.user_id = me;
    IF v_habit_id IS NULL THEN
      RAISE EXCEPTION 'hábito no encontrado' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    clean := left(btrim(COALESCE(p_name, '')), 200);
    IF clean = '' THEN
      RAISE EXCEPTION 'indica el nombre o el id del hábito' USING ERRCODE = '22023';
    END IF;
    SELECT count(*) INTO matches
      FROM habits h WHERE h.user_id = me AND lower(btrim(h.name)) = lower(clean);
    IF matches = 0 THEN
      RAISE EXCEPTION 'no hay un hábito llamado %', clean USING ERRCODE = 'P0002';
    END IF;
    IF matches > 1 THEN
      RAISE EXCEPTION 'hay varios hábitos llamados %; usa el id', clean USING ERRCODE = '22023';
    END IF;
    SELECT h.id, h.name INTO v_habit_id, habit_name
      FROM habits h WHERE h.user_id = me AND lower(btrim(h.name)) = lower(clean);
  END IF;

  INSERT INTO habit_logs (habit_id, user_id, log_date, completed)
  VALUES (v_habit_id, me, d, done)
  ON CONFLICT (habit_id, log_date) DO UPDATE
    SET completed = EXCLUDED.completed
  WHERE habit_logs.user_id = me;

  RETURN jsonb_build_object('habit_id', v_habit_id, 'name', habit_name, 'date', d, 'done', done);
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_log_meal(
  p_token text,
  p_name text,
  p_calories integer DEFAULT NULL,
  p_protein_g numeric DEFAULT NULL,
  p_carbs_g numeric DEFAULT NULL,
  p_fat_g numeric DEFAULT NULL,
  p_meal_type text DEFAULT NULL,
  p_at text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  clean text;
  meal text;
  calories integer;
  protein numeric;
  carbs numeric;
  fat numeric;
  moment timestamptz;
  row_ public.nutrition_logs;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  clean := left(btrim(COALESCE(p_name, '')), 200);
  IF clean = '' THEN
    RAISE EXCEPTION 'la comida necesita un nombre' USING ERRCODE = '22023';
  END IF;
  calories := COALESCE(p_calories, 0);
  IF calories < 0 OR calories > 10000 THEN
    RAISE EXCEPTION 'calorías fuera de rango (0-10000)' USING ERRCODE = '22023';
  END IF;
  protein := round(COALESCE(p_protein_g, 0), 1);
  carbs := round(COALESCE(p_carbs_g, 0), 1);
  fat := round(COALESCE(p_fat_g, 0), 1);
  IF protein < 0 OR protein > 9999 OR carbs < 0 OR carbs > 9999 OR fat < 0 OR fat > 9999 THEN
    RAISE EXCEPTION 'macros fuera de rango (0-9999)' USING ERRCODE = '22023';
  END IF;
  meal := lower(btrim(COALESCE(p_meal_type, '')));
  IF meal = '' THEN
    meal := 'other';
  ELSIF meal NOT IN ('breakfast', 'lunch', 'dinner', 'snack', 'other') THEN
    RAISE EXCEPTION 'meal_type debe ser breakfast, lunch, dinner, snack u other' USING ERRCODE = '22023';
  END IF;
  moment := public._mcp_moment(p_at, zone);

  INSERT INTO nutrition_logs (user_id, logged_at, name, calories, protein_g, carbs_g, fat_g, meal_type)
  VALUES (me, moment, clean, calories, protein, carbs, fat, meal)
  RETURNING * INTO row_;

  RETURN jsonb_build_object(
    'id', row_.id, 'name', row_.name, 'calories', row_.calories,
    'protein_g', row_.protein_g, 'carbs_g', row_.carbs_g, 'fat_g', row_.fat_g,
    'meal_type', row_.meal_type, 'logged_at', row_.logged_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_log_workout(
  p_token text,
  p_name text,
  p_duration_minutes integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_at text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  clean text;
  moment timestamptz;
  row_ public.workouts;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  clean := left(btrim(COALESCE(p_name, '')), 200);
  IF clean = '' THEN
    RAISE EXCEPTION 'el entreno necesita un nombre' USING ERRCODE = '22023';
  END IF;
  IF p_duration_minutes IS NOT NULL AND (p_duration_minutes < 1 OR p_duration_minutes > 1440) THEN
    RAISE EXCEPTION 'duración fuera de rango (1-1440 min)' USING ERRCODE = '22023';
  END IF;
  moment := public._mcp_moment(p_at, zone);

  INSERT INTO workouts (user_id, started_at, name, notes, duration_minutes, completed)
  VALUES (me, moment, clean, NULLIF(left(btrim(COALESCE(p_notes, '')), 1000), ''), p_duration_minutes, true)
  RETURNING * INTO row_;

  RETURN jsonb_build_object(
    'id', row_.id, 'name', row_.name, 'duration_minutes', row_.duration_minutes,
    'notes', row_.notes, 'started_at', row_.started_at, 'completed', row_.completed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_log_mood(
  p_token text,
  p_mood integer,
  p_energy integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  note text := NULLIF(left(btrim(COALESCE(p_notes, '')), 1000), '');
  row_ public.mood_logs;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF p_mood IS NULL OR p_mood < 1 OR p_mood > 5 THEN
    RAISE EXCEPTION 'ánimo fuera de rango (1-5)' USING ERRCODE = '22023';
  END IF;
  IF p_energy IS NOT NULL AND (p_energy < 1 OR p_energy > 5) THEN
    RAISE EXCEPTION 'energía fuera de rango (1-5)' USING ERRCODE = '22023';
  END IF;
  d := public._mcp_day(p_date, zone);

  INSERT INTO mood_logs (user_id, log_date, mood_score, energy_score, notes)
  VALUES (me, d, p_mood, p_energy, note)
  ON CONFLICT (user_id, log_date) DO UPDATE
    SET mood_score = EXCLUDED.mood_score,
        energy_score = COALESCE(EXCLUDED.energy_score, mood_logs.energy_score),
        notes = COALESCE(EXCLUDED.notes, mood_logs.notes)
  WHERE mood_logs.user_id = me
  RETURNING * INTO row_;

  RETURN jsonb_build_object('date', row_.log_date, 'mood', row_.mood_score, 'energy', row_.energy_score, 'notes', row_.notes);
END;
$$;

-- Últimos 7 días, acabando en end_date o en hoy. Las tareas son las que vencen en ese tramo.
CREATE OR REPLACE FUNCTION public.mcp_get_week(p_token text, p_end_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  start_d date;
  cursor date;
  day_start timestamptz;
  day_end timestamptz;
  days jsonb := '[]'::jsonb;
  habit_total integer;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  d := public._mcp_day(p_end_date, zone);
  start_d := d - 6;
  SELECT count(*) INTO habit_total FROM habits h WHERE h.user_id = me;

  cursor := start_d;
  WHILE cursor <= d LOOP
    day_start := cursor::timestamp AT TIME ZONE zone;
    day_end := (cursor + 1)::timestamp AT TIME ZONE zone;
    days := days || jsonb_build_object(
      'date', cursor,
      'water_ml', COALESCE((SELECT w.amount_ml FROM water_logs w WHERE w.user_id = me AND w.log_date = cursor), 0),
      'calories', COALESCE((SELECT sum(n.calories) FROM nutrition_logs n
                             WHERE n.user_id = me AND n.logged_at >= day_start AND n.logged_at < day_end), 0),
      'sleep_hours', (SELECT round((extract(epoch FROM (s.wake_time - s.bed_time)) / 3600)::numeric, 1)
                        FROM sleep_logs s
                       WHERE s.user_id = me AND s.wake_time >= day_start AND s.wake_time < day_end
                       ORDER BY s.wake_time DESC LIMIT 1),
      'workouts', (SELECT count(*) FROM workouts w
                    WHERE w.user_id = me AND w.started_at >= day_start AND w.started_at < day_end),
      'habits_done', (SELECT count(*) FROM habit_logs l
                       WHERE l.user_id = me AND l.log_date = cursor AND l.completed),
      'habits_total', habit_total,
      'mood', (SELECT m.mood_score FROM mood_logs m WHERE m.user_id = me AND m.log_date = cursor)
    );
    cursor := cursor + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'start_date', start_d,
    'end_date', d,
    'timezone', zone,
    'days', days,
    'tasks_open', COALESCE((
      SELECT jsonb_agg(public._mcp_task_json(t) ORDER BY t.deadline, t.created_at)
        FROM (SELECT * FROM tasks
               WHERE user_id = me AND NOT COALESCE(completed, false) AND deadline BETWEEN start_d AND d
               ORDER BY deadline, created_at LIMIT 100) t
    ), '[]'::jsonb),
    'tasks_completed', COALESCE((
      SELECT jsonb_agg(public._mcp_task_json(t) ORDER BY t.deadline, t.created_at)
        FROM (SELECT * FROM tasks
               WHERE user_id = me AND COALESCE(completed, false) AND deadline BETWEEN start_d AND d
               ORDER BY deadline, created_at LIMIT 100) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public._mcp_moment(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_day(text, text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mcp_log_water(text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_log_habit(text, uuid, text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_log_meal(text, text, integer, numeric, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_log_workout(text, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_log_mood(text, integer, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_get_week(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mcp_log_water(text, integer, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_habit(text, uuid, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_meal(text, text, integer, numeric, numeric, numeric, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_workout(text, text, integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_mood(text, integer, integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_get_week(text, text) TO anon, authenticated;

-- ===== supabase/migrations/20261018120000_mcp_more.sql =====
-- ============================================================
-- BEACON — Conector MCP completo: sueño, peso, eventos, diario, notas,
-- listar lo reciente y borrar un registro concreto.
-- Ejecutar después de 20261014120000_mcp_logs.sql. Idempotente.
-- Cada función autoriza con public._mcp_auth(p_token) y solo toca filas de su dueño.
-- ============================================================

-- Hora del día "HH:mm" en un día concreto, o un momento completo.
CREATE OR REPLACE FUNCTION public._mcp_clock(p_value text, p_day date, p_zone text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  clean text := NULLIF(btrim(p_value), '');
BEGIN
  IF clean IS NULL THEN
    RETURN NULL;
  END IF;
  IF clean ~ '^\d{1,2}:\d{2}$' THEN
    RETURN (p_day + clean::time) AT TIME ZONE p_zone;
  END IF;
  RETURN public._mcp_moment(clean, p_zone);
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'hora no válida: %', p_value USING ERRCODE = '22007';
END;
$$;

-- Sueño de una noche. wake_day = día en que te levantas (por defecto hoy).
-- bed y wake: "HH:mm" o "yyyy-mm-dd HH:mm". Si bed es solo hora y queda después de wake,
-- se entiende la noche anterior. Si ya había una noche que acaba ese día, se sustituye.
CREATE OR REPLACE FUNCTION public.mcp_log_sleep(
  p_token text,
  p_bed text,
  p_wake text,
  p_quality integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_wake_day text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  bed_at timestamptz;
  wake_at timestamptz;
  hours numeric;
  existing uuid;
  row_ sleep_logs%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  d := public._mcp_day(p_wake_day, zone);
  wake_at := public._mcp_clock(p_wake, d, zone);
  bed_at := public._mcp_clock(p_bed, d, zone);
  IF wake_at IS NULL OR bed_at IS NULL THEN
    RAISE EXCEPTION 'indica a qué hora te acostaste y te levantaste' USING ERRCODE = '22023';
  END IF;
  IF bed_at >= wake_at AND btrim(p_bed) ~ '^\d{1,2}:\d{2}$' THEN
    bed_at := bed_at - interval '1 day';
  END IF;
  hours := extract(epoch FROM wake_at - bed_at) / 3600;
  IF hours <= 0 OR hours > 16 THEN
    RAISE EXCEPTION 'la noche debe durar entre 0 y 16 horas' USING ERRCODE = '22023';
  END IF;
  IF wake_at > now() + interval '2 hours' THEN
    RAISE EXCEPTION 'esa hora de levantarse aún no ha llegado; indica el día con wake_day' USING ERRCODE = '22023';
  END IF;
  IF p_quality IS NOT NULL AND (p_quality < 1 OR p_quality > 5) THEN
    RAISE EXCEPTION 'calidad fuera de rango (1-5)' USING ERRCODE = '22023';
  END IF;

  SELECT s.id INTO existing FROM sleep_logs s
   WHERE s.user_id = me
     AND s.wake_time >= (d::timestamp AT TIME ZONE zone)
     AND s.wake_time < ((d + 1)::timestamp AT TIME ZONE zone)
   ORDER BY s.wake_time DESC LIMIT 1;

  IF existing IS NULL THEN
    INSERT INTO sleep_logs (user_id, bed_time, wake_time, quality_rating, notes)
    VALUES (me, bed_at, wake_at, p_quality, NULLIF(left(btrim(COALESCE(p_notes, '')), 1000), ''))
    RETURNING * INTO row_;
  ELSE
    UPDATE sleep_logs
       SET bed_time = bed_at,
           wake_time = wake_at,
           quality_rating = COALESCE(p_quality, quality_rating),
           notes = COALESCE(NULLIF(left(btrim(COALESCE(p_notes, '')), 1000), ''), notes)
     WHERE id = existing AND user_id = me
    RETURNING * INTO row_;
  END IF;

  RETURN jsonb_build_object(
    'id', row_.id,
    'replaced', existing IS NOT NULL,
    'bed', to_char(row_.bed_time AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
    'wake', to_char(row_.wake_time AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
    'hours', round(hours, 1),
    'quality', row_.quality_rating
  );
END;
$$;

-- Peso del día (y grasa opcional). Un registro por día: si existe, se actualiza.
CREATE OR REPLACE FUNCTION public.mcp_log_weight(
  p_token text,
  p_kg numeric,
  p_body_fat numeric DEFAULT NULL,
  p_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  existing uuid;
  row_ body_metrics%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF p_kg IS NULL OR p_kg < 25 OR p_kg > 350 THEN
    RAISE EXCEPTION 'peso fuera de rango (25-350 kg)' USING ERRCODE = '22023';
  END IF;
  IF p_body_fat IS NOT NULL AND (p_body_fat < 2 OR p_body_fat > 70) THEN
    RAISE EXCEPTION 'grasa fuera de rango (2-70 %%)' USING ERRCODE = '22023';
  END IF;
  d := public._mcp_day(p_date, zone);

  SELECT b.id INTO existing FROM body_metrics b WHERE b.user_id = me AND b.date = d ORDER BY b.created_at DESC LIMIT 1;
  IF existing IS NULL THEN
    INSERT INTO body_metrics (user_id, date, weight_kg, body_fat_pct)
    VALUES (me, d, round(p_kg, 2), round(p_body_fat, 1))
    RETURNING * INTO row_;
  ELSE
    UPDATE body_metrics
       SET weight_kg = round(p_kg, 2), body_fat_pct = COALESCE(round(p_body_fat, 1), body_fat_pct)
     WHERE id = existing AND user_id = me
    RETURNING * INTO row_;
  END IF;

  RETURN jsonb_build_object('id', row_.id, 'date', row_.date, 'weight_kg', row_.weight_kg,
                            'body_fat_pct', row_.body_fat_pct, 'replaced', existing IS NOT NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public._mcp_event_json(e public.events)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object('id', e.id, 'title', e.title, 'date', e.event_date,
                            'time', to_char(e.event_time, 'HH24:MI'), 'location', e.location,
                            'description', e.description);
$$;

-- Crea un evento en el calendario de la app.
CREATE OR REPLACE FUNCTION public.mcp_add_event(
  p_token text,
  p_title text,
  p_date text,
  p_time text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  t time;
  clean text := left(btrim(COALESCE(p_title, '')), 200);
  row_ events%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF clean = '' THEN
    RAISE EXCEPTION 'el evento necesita un título' USING ERRCODE = '22023';
  END IF;
  IF p_date IS NULL OR btrim(p_date) = '' THEN
    RAISE EXCEPTION 'el evento necesita una fecha' USING ERRCODE = '22023';
  END IF;
  d := public._mcp_day(p_date, zone);
  IF NULLIF(btrim(COALESCE(p_time, '')), '') IS NOT NULL THEN
    IF btrim(p_time) !~ '^\d{1,2}:\d{2}$' THEN
      RAISE EXCEPTION 'hora no válida (usa HH:mm)' USING ERRCODE = '22007';
    END IF;
    t := btrim(p_time)::time;
  END IF;

  INSERT INTO events (user_id, title, description, event_date, event_time, location)
  VALUES (me, clean, NULLIF(left(btrim(COALESCE(p_description, '')), 2000), ''), d, t,
          NULLIF(left(btrim(COALESCE(p_location, '')), 200), ''))
  RETURNING * INTO row_;
  RETURN public._mcp_event_json(row_);
END;
$$;

-- Cambia un evento. p_changes admite title, date, time ("" para quitarla), location, description.
CREATE OR REPLACE FUNCTION public.mcp_update_event(p_token text, p_event_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  row_ events%ROWTYPE;
  c jsonb := COALESCE(p_changes, '{}'::jsonb);
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  SELECT * INTO row_ FROM events WHERE id = p_event_id AND user_id = me;
  IF row_.id IS NULL THEN
    RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF c ? 'title' THEN
    IF btrim(COALESCE(c->>'title', '')) = '' THEN
      RAISE EXCEPTION 'el título no puede quedar vacío' USING ERRCODE = '22023';
    END IF;
    row_.title := left(btrim(c->>'title'), 200);
  END IF;
  IF c ? 'date' THEN
    row_.event_date := public._mcp_day(c->>'date', zone);
  END IF;
  IF c ? 'time' THEN
    IF NULLIF(btrim(COALESCE(c->>'time', '')), '') IS NULL THEN
      row_.event_time := NULL;
    ELSIF btrim(c->>'time') ~ '^\d{1,2}:\d{2}$' THEN
      row_.event_time := btrim(c->>'time')::time;
    ELSE
      RAISE EXCEPTION 'hora no válida (usa HH:mm)' USING ERRCODE = '22007';
    END IF;
  END IF;
  IF c ? 'location' THEN
    row_.location := NULLIF(left(btrim(COALESCE(c->>'location', '')), 200), '');
  END IF;
  IF c ? 'description' THEN
    row_.description := NULLIF(left(btrim(COALESCE(c->>'description', '')), 2000), '');
  END IF;

  UPDATE events
     SET title = row_.title, event_date = row_.event_date, event_time = row_.event_time,
         location = row_.location, description = row_.description
   WHERE id = row_.id AND user_id = me;
  RETURN public._mcp_event_json(row_);
END;
$$;

-- Entrada del diario (reflexión), con ánimo 1-5 y etiquetas opcionales.
CREATE OR REPLACE FUNCTION public.mcp_add_journal(
  p_token text,
  p_content text,
  p_title text DEFAULT NULL,
  p_mood integer DEFAULT NULL,
  p_tags text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  body text := left(btrim(COALESCE(p_content, '')), 8000);
  row_ journal_entries%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF body = '' THEN
    RAISE EXCEPTION 'la entrada no puede estar vacía' USING ERRCODE = '22023';
  END IF;
  IF p_mood IS NOT NULL AND (p_mood < 1 OR p_mood > 5) THEN
    RAISE EXCEPTION 'ánimo fuera de rango (1-5)' USING ERRCODE = '22023';
  END IF;
  INSERT INTO journal_entries (user_id, title, content, mood_score, tags)
  VALUES (me, NULLIF(left(btrim(COALESCE(p_title, '')), 200), ''), body, p_mood,
          COALESCE((SELECT array_agg(left(btrim(x), 40)) FROM unnest(p_tags) x WHERE btrim(x) <> ''), '{}'))
  RETURNING * INTO row_;
  RETURN jsonb_build_object('id', row_.id, 'title', row_.title, 'mood', row_.mood_score, 'tags', row_.tags,
                            'created_at', to_char(row_.created_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'));
END;
$$;

-- Nota libre.
CREATE OR REPLACE FUNCTION public.mcp_add_note(p_token text, p_content text, p_title text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  body text := left(btrim(COALESCE(p_content, '')), 8000);
  row_ notes%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF body = '' THEN
    RAISE EXCEPTION 'la nota no puede estar vacía' USING ERRCODE = '22023';
  END IF;
  INSERT INTO notes (user_id, title, content)
  VALUES (me, NULLIF(left(btrim(COALESCE(p_title, '')), 200), ''), body)
  RETURNING * INTO row_;
  RETURN jsonb_build_object('id', row_.id, 'title', row_.title,
                            'created_at', to_char(row_.created_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'));
END;
$$;

-- Registros recientes con su id, para poder corregir o borrar uno concreto.
-- p_kind: meal, workout, sleep, weight, event, journal, note. p_days: últimos N días (1-90).
-- Para event, devuelve también los próximos N días.
CREATE OR REPLACE FUNCTION public.mcp_list_recent(p_token text, p_kind text, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  n integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 90);
  today date;
  since timestamptz;
  kind text := lower(btrim(COALESCE(p_kind, '')));
  items jsonb;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  today := (now() AT TIME ZONE zone)::date;
  since := (today - (n - 1))::timestamp AT TIME ZONE zone;

  IF kind = 'meal' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'at', to_char(x.logged_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'name', x.name, 'calories', x.calories, 'meal_type', x.meal_type) ORDER BY x.logged_at DESC)
      INTO items FROM (SELECT * FROM nutrition_logs WHERE user_id = me AND logged_at >= since ORDER BY logged_at DESC LIMIT 100) x;
  ELSIF kind = 'workout' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'at', to_char(x.started_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'name', x.name, 'duration_minutes', x.duration_minutes) ORDER BY x.started_at DESC)
      INTO items FROM (SELECT * FROM workouts WHERE user_id = me AND started_at >= since ORDER BY started_at DESC LIMIT 100) x;
  ELSIF kind = 'sleep' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'bed', to_char(x.bed_time AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'wake', to_char(x.wake_time AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'hours', round((extract(epoch FROM x.wake_time - x.bed_time) / 3600)::numeric, 1),
             'quality', x.quality_rating) ORDER BY x.wake_time DESC)
      INTO items FROM (SELECT * FROM sleep_logs WHERE user_id = me AND wake_time >= since ORDER BY wake_time DESC LIMIT 100) x;
  ELSIF kind = 'weight' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'date', x.date, 'weight_kg', x.weight_kg, 'body_fat_pct', x.body_fat_pct)
             ORDER BY x.date DESC)
      INTO items FROM (SELECT * FROM body_metrics WHERE user_id = me AND date >= today - (n - 1) ORDER BY date DESC LIMIT 100) x;
  ELSIF kind = 'event' THEN
    SELECT jsonb_agg(public._mcp_event_json(x) ORDER BY x.event_date, x.event_time NULLS FIRST)
      INTO items FROM (SELECT * FROM events WHERE user_id = me AND event_date BETWEEN today - (n - 1) AND today + n
                       ORDER BY event_date, event_time NULLS FIRST LIMIT 100) x;
  ELSIF kind = 'journal' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'at', to_char(x.created_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'title', x.title, 'content', left(x.content, 280), 'mood', x.mood_score, 'tags', x.tags) ORDER BY x.created_at DESC)
      INTO items FROM (SELECT * FROM journal_entries WHERE user_id = me AND created_at >= since ORDER BY created_at DESC LIMIT 50) x;
  ELSIF kind = 'note' THEN
    SELECT jsonb_agg(jsonb_build_object('id', x.id, 'at', to_char(x.created_at AT TIME ZONE zone, 'YYYY-MM-DD HH24:MI'),
             'title', x.title, 'content', left(x.content, 280)) ORDER BY x.created_at DESC)
      INTO items FROM (SELECT * FROM notes WHERE user_id = me AND created_at >= since ORDER BY created_at DESC LIMIT 50) x;
  ELSE
    RAISE EXCEPTION 'tipo no válido: usa meal, workout, sleep, weight, event, journal o note' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('kind', kind, 'days', n, 'items', COALESCE(items, '[]'::jsonb));
END;
$$;

-- Borra UN registro concreto del usuario. Solo cuando la persona lo pide explícitamente.
-- p_kind: meal, workout, sleep, weight, event, journal, note, task.
CREATE OR REPLACE FUNCTION public.mcp_delete_entry(p_token text, p_kind text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  kind text := lower(btrim(COALESCE(p_kind, '')));
  label text;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'falta el id' USING ERRCODE = '22023';
  END IF;

  CASE kind
    WHEN 'meal' THEN DELETE FROM nutrition_logs WHERE id = p_id AND user_id = me RETURNING name INTO label;
    WHEN 'workout' THEN DELETE FROM workouts WHERE id = p_id AND user_id = me RETURNING name INTO label;
    WHEN 'sleep' THEN DELETE FROM sleep_logs WHERE id = p_id AND user_id = me
                        RETURNING to_char(wake_time AT TIME ZONE zone, 'YYYY-MM-DD') INTO label;
    WHEN 'weight' THEN DELETE FROM body_metrics WHERE id = p_id AND user_id = me RETURNING date::text INTO label;
    WHEN 'event' THEN DELETE FROM events WHERE id = p_id AND user_id = me RETURNING title INTO label;
    WHEN 'journal' THEN DELETE FROM journal_entries WHERE id = p_id AND user_id = me RETURNING COALESCE(title, left(content, 40)) INTO label;
    WHEN 'note' THEN DELETE FROM notes WHERE id = p_id AND user_id = me RETURNING COALESCE(title, left(content, 40)) INTO label;
    WHEN 'task' THEN DELETE FROM tasks WHERE id = p_id AND user_id = me RETURNING title INTO label;
    ELSE RAISE EXCEPTION 'tipo no válido: usa meal, workout, sleep, weight, event, journal, note o task' USING ERRCODE = '22023';
  END CASE;

  IF label IS NULL THEN
    RAISE EXCEPTION 'no encontrado' USING ERRCODE = 'P0002';
  END IF;
  RETURN jsonb_build_object('deleted', true, 'kind', kind, 'id', p_id, 'label', label);
END;
$$;

REVOKE ALL ON FUNCTION public._mcp_clock(text, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_event_json(public.events) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mcp_log_sleep(text, text, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_log_weight(text, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_add_event(text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_update_event(text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_add_journal(text, text, text, integer, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_add_note(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_list_recent(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_delete_entry(text, text, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mcp_log_sleep(text, text, text, integer, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_log_weight(text, numeric, numeric, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_add_event(text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_event(text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_add_journal(text, text, text, integer, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_add_note(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_list_recent(text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_delete_entry(text, text, uuid) TO anon, authenticated;

-- ===== supabase/migrations/20261021120000_calendar_workouts.sql =====
-- Beacon v1.3: calendario con hora de fin y entrenos ligados a su rutina.
-- Solo añade (columnas nullable e índices) y se puede ejecutar varias veces.
-- La app funciona sin esta migración: no envía las columnas nuevas hasta que existen.

-- Plan · Calendario: hora de fin opcional. Sin ella el evento dura una hora.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS end_time time NULL;

-- Entreno: rutina de la que salió (para «última vez» de cada rutina). Si se borra la
-- rutina, el entreno se queda sin ella.
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS template_id uuid NULL
  REFERENCES public.workout_templates (id) ON DELETE SET NULL;

-- Consultas acotadas por fecha (Hoy, Plan, Datos). Los índices por user_id y los de
-- las tablas hijas ya existen (20261013120000_auth_rls.sql).
CREATE INDEX IF NOT EXISTS events_user_date_idx ON public.events (user_id, event_date);
CREATE INDEX IF NOT EXISTS tasks_user_deadline_idx ON public.tasks (user_id, deadline);
CREATE INDEX IF NOT EXISTS workouts_user_started_idx ON public.workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS workouts_template_idx ON public.workouts (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS habit_logs_user_date_idx ON public.habit_logs (user_id, log_date);
CREATE INDEX IF NOT EXISTS nutrition_logs_user_logged_idx ON public.nutrition_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS sleep_logs_user_bed_idx ON public.sleep_logs (user_id, bed_time DESC);
CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx ON public.journal_entries (user_id, created_at DESC);

-- ===== supabase/migrations/20261028120000_mcp_event_end.sql =====
-- Beacon v1.3 · El conector de Claude entiende la hora de fin de los eventos (events.end_time,
-- añadida en 20261021120000_calendar_workouts.sql). Se puede ejecutar varias veces.
-- Compatible con la Edge Function anterior: llama por nombre y p_end_time tiene valor por defecto.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time time NULL;

-- Hora 'HH:mm' o error claro.
CREATE OR REPLACE FUNCTION public._mcp_hhmm(p_value text, p_field text)
RETURNS time
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF btrim(p_value) !~ '^\d{1,2}:\d{2}$' THEN
    RAISE EXCEPTION '% no válida (usa HH:mm)', p_field USING ERRCODE = '22007';
  END IF;
  RETURN btrim(p_value)::time;
END;
$$;

-- El fin solo tiene sentido con hora de inicio y tiene que ser posterior.
CREATE OR REPLACE FUNCTION public._mcp_check_event_times(p_start time, p_end time)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_end IS NULL THEN
    RETURN;
  END IF;
  IF p_start IS NULL THEN
    RAISE EXCEPTION 'para poner hora de fin, el evento necesita hora de inicio' USING ERRCODE = '22023';
  END IF;
  IF p_end <= p_start THEN
    RAISE EXCEPTION 'la hora de fin tiene que ser posterior a la de inicio' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._mcp_event_json(e public.events)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object('id', e.id, 'title', e.title, 'date', e.event_date,
                            'time', to_char(e.event_time, 'HH24:MI'),
                            'end_time', to_char(e.end_time, 'HH24:MI'),
                            'location', e.location, 'description', e.description);
$$;

DROP FUNCTION IF EXISTS public.mcp_add_event(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.mcp_add_event(
  p_token text,
  p_title text,
  p_date text,
  p_time text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_end_time text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  d date;
  t time;
  e time;
  clean text := left(btrim(COALESCE(p_title, '')), 200);
  row_ events%ROWTYPE;
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  IF clean = '' THEN
    RAISE EXCEPTION 'el evento necesita un título' USING ERRCODE = '22023';
  END IF;
  IF p_date IS NULL OR btrim(p_date) = '' THEN
    RAISE EXCEPTION 'el evento necesita una fecha' USING ERRCODE = '22023';
  END IF;
  d := public._mcp_day(p_date, zone);
  IF NULLIF(btrim(COALESCE(p_time, '')), '') IS NOT NULL THEN
    t := public._mcp_hhmm(p_time, 'hora');
  END IF;
  IF NULLIF(btrim(COALESCE(p_end_time, '')), '') IS NOT NULL THEN
    e := public._mcp_hhmm(p_end_time, 'hora de fin');
  END IF;
  PERFORM public._mcp_check_event_times(t, e);

  INSERT INTO events (user_id, title, description, event_date, event_time, end_time, location)
  VALUES (me, clean, NULLIF(left(btrim(COALESCE(p_description, '')), 2000), ''), d, t, e,
          NULLIF(left(btrim(COALESCE(p_location, '')), 200), ''))
  RETURNING * INTO row_;
  RETURN public._mcp_event_json(row_);
END;
$$;

-- Cambios admitidos: title, date, time, end_time, location, description.
-- Una cadena vacía en time o end_time los quita (quitar time quita también end_time).
CREATE OR REPLACE FUNCTION public.mcp_update_event(p_token text, p_event_id uuid, p_changes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid;
  zone text;
  row_ events%ROWTYPE;
  c jsonb := COALESCE(p_changes, '{}'::jsonb);
BEGIN
  SELECT a.user_id, a.tz INTO me, zone FROM public._mcp_auth(p_token) a;
  SELECT * INTO row_ FROM events WHERE id = p_event_id AND user_id = me;
  IF row_.id IS NULL THEN
    RAISE EXCEPTION 'evento no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF c ? 'title' THEN
    IF btrim(COALESCE(c->>'title', '')) = '' THEN
      RAISE EXCEPTION 'el título no puede quedar vacío' USING ERRCODE = '22023';
    END IF;
    row_.title := left(btrim(c->>'title'), 200);
  END IF;
  IF c ? 'date' THEN
    row_.event_date := public._mcp_day(c->>'date', zone);
  END IF;
  IF c ? 'time' THEN
    IF NULLIF(btrim(COALESCE(c->>'time', '')), '') IS NULL THEN
      row_.event_time := NULL;
      row_.end_time := NULL;
    ELSE
      row_.event_time := public._mcp_hhmm(c->>'time', 'hora');
    END IF;
  END IF;
  IF c ? 'end_time' THEN
    IF NULLIF(btrim(COALESCE(c->>'end_time', '')), '') IS NULL THEN
      row_.end_time := NULL;
    ELSE
      row_.end_time := public._mcp_hhmm(c->>'end_time', 'hora de fin');
    END IF;
  ELSIF c ? 'time' AND row_.end_time IS NOT NULL AND row_.end_time <= row_.event_time THEN
    -- Se movió el inicio sin decir el fin y el fin quedaría antes: se quita el fin.
    row_.end_time := NULL;
  END IF;
  PERFORM public._mcp_check_event_times(row_.event_time, row_.end_time);
  IF c ? 'location' THEN
    row_.location := NULLIF(left(btrim(COALESCE(c->>'location', '')), 200), '');
  END IF;
  IF c ? 'description' THEN
    row_.description := NULLIF(left(btrim(COALESCE(c->>'description', '')), 2000), '');
  END IF;

  UPDATE events
     SET title = row_.title, event_date = row_.event_date, event_time = row_.event_time,
         end_time = row_.end_time, location = row_.location, description = row_.description
   WHERE id = row_.id AND user_id = me;
  RETURN public._mcp_event_json(row_);
END;
$$;

REVOKE ALL ON FUNCTION public._mcp_hhmm(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_check_event_times(time, time) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._mcp_event_json(public.events) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mcp_add_event(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mcp_update_event(text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mcp_add_event(text, text, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_update_event(text, uuid, jsonb) TO anon, authenticated;
