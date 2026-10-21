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
