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
