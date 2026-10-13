-- ============================================================
-- CAPALOT — Conector MCP para Claude (claude.ai con tu plan, sin API key)
-- Ejecutar después de 20261013120000_auth_rls.sql. Idempotente.
--
-- La app genera un token personal (Ajustes → Conectar con Claude). Solo se guarda
-- su hash. La Edge Function capalot-mcp recibe el token y llama a las funciones
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
  token := 'cap_' || encode(gen_random_bytes(32), 'hex');
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
  IF p_token IS NULL OR p_token !~ '^cap_[0-9a-f]{64}$' THEN
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
