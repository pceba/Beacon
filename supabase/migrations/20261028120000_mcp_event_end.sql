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
