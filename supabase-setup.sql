-- Supabase Database Setup for Health Tracker App
-- Run these SQL commands in your Supabase SQL Editor
-- This sets up the database structure and fixes foreign key constraints

-- ============================================
-- USERS TABLE (if it doesn't exist)
-- ============================================
-- Create a simple users table to satisfy foreign key constraints
-- Since we're using UUID-based auth, we'll auto-create users on first insert

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Policy: Allow all operations on users (since we're using UUID-based auth)
CREATE POLICY "Allow all operations on users"
ON users
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX FOREIGN KEY CONSTRAINTS
-- ============================================
-- Drop existing foreign key constraints that reference users table
-- We'll recreate them to allow any UUID

-- Nutrition Logs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_logs') THEN
    -- Drop foreign key if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%nutrition_logs_user_id%'
      AND table_name = 'nutrition_logs'
    ) THEN
      ALTER TABLE nutrition_logs DROP CONSTRAINT IF EXISTS nutrition_logs_user_id_fkey;
    END IF;
  END IF;
END $$;

-- Workouts
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workouts') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%workouts_user_id%'
      AND table_name = 'workouts'
    ) THEN
      ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_user_id_fkey;
    END IF;
  END IF;
END $$;

-- Sleep Logs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sleep_logs') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%sleep_logs_user_id%'
      AND table_name = 'sleep_logs'
    ) THEN
      ALTER TABLE sleep_logs DROP CONSTRAINT IF EXISTS sleep_logs_user_id_fkey;
    END IF;
  END IF;
END $$;

-- ============================================
-- RECREATE FOREIGN KEYS (OPTIONAL - MORE PERMISSIVE)
-- ============================================
-- If you want to keep foreign keys but make them less restrictive,
-- you can add them back. But for UUID-based auth, it's better to remove them.

-- Add foreign keys back if needed (commented out by default)
-- ALTER TABLE nutrition_logs 
--   ADD CONSTRAINT nutrition_logs_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE workouts 
--   ADD CONSTRAINT workouts_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE sleep_logs 
--   ADD CONSTRAINT sleep_logs_user_id_fkey 
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- ALTERNATIVE: REMOVE FOREIGN KEY CONSTRAINTS COMPLETELY
-- ============================================
-- If the above doesn't work, you can completely remove foreign key constraints
-- This is safe for UUID-based auth since we're not using Supabase Auth

-- Find and drop all foreign key constraints on user_id columns
-- Only for tables that actually exist in the public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tc.constraint_name, 
            tc.table_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.tables AS t
          ON tc.table_name = t.table_name
          AND tc.table_schema = t.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND kcu.column_name = 'user_id'
          AND tc.table_schema = 'public'
          AND t.table_schema = 'public'
    ) LOOP
        BEGIN
            -- Double check table exists before dropping constraint
            IF EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = r.table_name
            ) THEN
                EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || 
                        ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                -- Ignore errors if table doesn't exist or constraint doesn't exist
                RAISE NOTICE 'Could not drop constraint % on table %: %', 
                    r.constraint_name, r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- SAVED MEALS TABLE
-- ============================================
-- Create table for saving meal templates that users can reuse

CREATE TABLE IF NOT EXISTS saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  calories NUMERIC(10, 2) NOT NULL DEFAULT 0,
  protein NUMERIC(10, 2) NOT NULL DEFAULT 0,
  carbs NUMERIC(10, 2) NOT NULL DEFAULT 0,
  fat NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_id ON saved_meals(user_id);

-- ============================================
-- TODOS TABLE
-- ============================================
-- Table to store user objectives / to-dos

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);

-- ============================================
-- WORKOUT TEMPLATES TABLE
-- ============================================
-- Create table for workout templates/routines that users can reuse

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);

-- ============================================
-- WORKOUT TEMPLATE EXERCISES TABLE
-- ============================================
-- Exercises in workout templates (no weight/reps, just exercise name and number of sets)

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  sets_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_template_exercises_template_id ON workout_template_exercises(template_id);

-- Add template_id to workouts table to track which template was used
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL;

-- ============================================
-- RLS POLICIES (from previous file)
-- ============================================

-- Enable RLS on all tables (only if they exist)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_logs') THEN
    ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workouts') THEN
    ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
    ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sets') THEN
    ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sleep_logs') THEN
    ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_meals') THEN
    ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
    ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_template_exercises') THEN
    ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
-- Only drop policies for tables that exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_logs') THEN
    DROP POLICY IF EXISTS "Users can insert their own nutrition logs" ON nutrition_logs;
    DROP POLICY IF EXISTS "Users can read their own nutrition logs" ON nutrition_logs;
    DROP POLICY IF EXISTS "Users can update their own nutrition logs" ON nutrition_logs;
    DROP POLICY IF EXISTS "Users can delete their own nutrition logs" ON nutrition_logs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workouts') THEN
    DROP POLICY IF EXISTS "Users can insert their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can read their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
    DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
    DROP POLICY IF EXISTS "Users can insert workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can read workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can update workout exercises" ON workout_exercises;
    DROP POLICY IF EXISTS "Users can delete workout exercises" ON workout_exercises;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sets') THEN
    DROP POLICY IF EXISTS "Users can insert workout sets" ON workout_sets;
    DROP POLICY IF EXISTS "Users can read workout sets" ON workout_sets;
    DROP POLICY IF EXISTS "Users can update workout sets" ON workout_sets;
    DROP POLICY IF EXISTS "Users can delete workout sets" ON workout_sets;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sleep_logs') THEN
    DROP POLICY IF EXISTS "Users can insert their own sleep logs" ON sleep_logs;
    DROP POLICY IF EXISTS "Users can read their own sleep logs" ON sleep_logs;
    DROP POLICY IF EXISTS "Users can update their own sleep logs" ON sleep_logs;
    DROP POLICY IF EXISTS "Users can delete their own sleep logs" ON sleep_logs;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_meals') THEN
    DROP POLICY IF EXISTS "Users can insert their own saved meals" ON saved_meals;
    DROP POLICY IF EXISTS "Users can read their own saved meals" ON saved_meals;
    DROP POLICY IF EXISTS "Users can update their own saved meals" ON saved_meals;
    DROP POLICY IF EXISTS "Users can delete their own saved meals" ON saved_meals;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
    DROP POLICY IF EXISTS "Users can read their own todos" ON todos;
    DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
    DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
    DROP POLICY IF EXISTS "Users can insert their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can read their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can update their own workout templates" ON workout_templates;
    DROP POLICY IF EXISTS "Users can delete their own workout templates" ON workout_templates;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_template_exercises') THEN
    DROP POLICY IF EXISTS "Users can insert workout template exercises" ON workout_template_exercises;
    DROP POLICY IF EXISTS "Users can read workout template exercises" ON workout_template_exercises;
    DROP POLICY IF EXISTS "Users can update workout template exercises" ON workout_template_exercises;
    DROP POLICY IF EXISTS "Users can delete workout template exercises" ON workout_template_exercises;
  END IF;
END $$;

-- Create new policies (only for tables that exist)
DO $$ 
BEGIN
  -- Nutrition Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nutrition_logs') THEN
    BEGIN
      CREATE POLICY "Users can insert their own nutrition logs"
      ON nutrition_logs FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own nutrition logs"
      ON nutrition_logs FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own nutrition logs"
      ON nutrition_logs FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own nutrition logs"
      ON nutrition_logs FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Workouts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workouts') THEN
    BEGIN
      CREATE POLICY "Users can insert their own workouts"
      ON workouts FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own workouts"
      ON workouts FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own workouts"
      ON workouts FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own workouts"
      ON workouts FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Workout Exercises
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_exercises') THEN
    BEGIN
      CREATE POLICY "Users can insert workout exercises"
      ON workout_exercises FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read workout exercises"
      ON workout_exercises FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update workout exercises"
      ON workout_exercises FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete workout exercises"
      ON workout_exercises FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Workout Sets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_sets') THEN
    BEGIN
      CREATE POLICY "Users can insert workout sets"
      ON workout_sets FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read workout sets"
      ON workout_sets FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update workout sets"
      ON workout_sets FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete workout sets"
      ON workout_sets FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Sleep Logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sleep_logs') THEN
    BEGIN
      CREATE POLICY "Users can insert their own sleep logs"
      ON sleep_logs FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own sleep logs"
      ON sleep_logs FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own sleep logs"
      ON sleep_logs FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own sleep logs"
      ON sleep_logs FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Saved Meals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_meals') THEN
    BEGIN
      CREATE POLICY "Users can insert their own saved meals"
      ON saved_meals FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own saved meals"
      ON saved_meals FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own saved meals"
      ON saved_meals FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own saved meals"
      ON saved_meals FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Todos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    BEGIN
      CREATE POLICY "Users can insert their own todos"
      ON todos FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own todos"
      ON todos FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own todos"
      ON todos FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own todos"
      ON todos FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Workout Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_templates') THEN
    BEGIN
      CREATE POLICY "Users can insert their own workout templates"
      ON workout_templates FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read their own workout templates"
      ON workout_templates FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update their own workout templates"
      ON workout_templates FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete their own workout templates"
      ON workout_templates FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;

  -- Workout Template Exercises
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workout_template_exercises') THEN
    BEGIN
      CREATE POLICY "Users can insert workout template exercises"
      ON workout_template_exercises FOR INSERT WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can read workout template exercises"
      ON workout_template_exercises FOR SELECT USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can update workout template exercises"
      ON workout_template_exercises FOR UPDATE USING (true) WITH CHECK (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      CREATE POLICY "Users can delete workout template exercises"
      ON workout_template_exercises FOR DELETE USING (true);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================
-- NOTES:
-- ============================================
-- 1. This script removes foreign key constraints on user_id columns
--    since we're using UUID-based auth (not Supabase Auth)
-- 
-- 2. If you want to keep foreign keys, you'll need to:
--    - Create users in the users table before inserting data
--    - Or modify the app to auto-create users on first login
--
-- 3. The RLS policies allow all operations since we're filtering
--    by user_id in the application code itself.
