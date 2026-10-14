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
