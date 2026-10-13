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
