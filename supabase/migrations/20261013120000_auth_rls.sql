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
--   5. claude_usage + claude_usage_bump(): cuota diaria de la Edge Function.
--   6. Tablas del esquema antiguo (todos, saved_meals, users): RLS sin políticas.
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
-- 6. Esquema antiguo: cerrar del todo (RLS sin políticas = nadie entra con la anon key)
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

-- ------------------------------------------------------------
-- 5. Cuota diaria de Claude (la usa la Edge Function claude-sync)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claude_usage (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  day     date NOT NULL,
  calls   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.claude_usage ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo se toca a través de la función de abajo.

-- Suma una llamada para el usuario de la sesión. Devuelve el total de hoy (UTC),
-- o -1 si ya estaba en el límite (y entonces no suma).
CREATE OR REPLACE FUNCTION public.claude_usage_bump(p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  today date := (now() AT TIME ZONE 'utc')::date;
  total integer;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.claude_usage AS u (user_id, day, calls)
  VALUES (me, today, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET calls = u.calls + 1
    WHERE u.calls < GREATEST(p_limit, 0)
  RETURNING u.calls INTO total;
  RETURN COALESCE(total, -1);
END;
$$;

REVOKE ALL ON FUNCTION public.claude_usage_bump(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claude_usage_bump(integer) TO authenticated;
