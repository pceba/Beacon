-- Supabase Database Updates for Life Management App
-- Run these SQL commands in your Supabase SQL Editor
-- This adds support for habits, notes, and updates tasks table

-- ============================================
-- HABITS TABLE
-- ============================================
-- Create table for user habits (e.g., "Read", "Creatine", "Meditate")

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', etc.
  color TEXT, -- Optional color for UI
  icon TEXT, -- Optional icon name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- ============================================
-- HABIT LOGS TABLE
-- ============================================
-- Track when habits are completed

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL, -- YYYY-MM-DD
  completed BOOLEAN NOT NULL DEFAULT true,
  notes TEXT, -- Optional notes for that day
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habit_id, log_date) -- One log per habit per day
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_log_date ON habit_logs(log_date);

-- ============================================
-- NOTES TABLE
-- ============================================
-- Brain dump / quick notes for unstructured text

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  title TEXT, -- Optional title
  tags TEXT[], -- Optional tags array
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- ============================================
-- TASKS TABLE UPDATE
-- ============================================
-- Ensure tasks table has completed boolean (should already exist, but ensure it)

DO $$
BEGIN
  -- Check if tasks table exists (it might be named 'todos')
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'todos') THEN
    -- Ensure completed column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'todos' AND column_name = 'completed'
    ) THEN
      ALTER TABLE todos ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
  
  -- Also check for 'tasks' table name
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'completed'
    ) THEN
      ALTER TABLE tasks ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all new tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habits') THEN
    ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'habit_logs') THEN
    ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- HABITS RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own habits" ON habits;
DROP POLICY IF EXISTS "Users can read their own habits" ON habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON habits;

-- Policy: Allow users to insert their own habits
CREATE POLICY "Users can insert their own habits"
ON habits
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own habits
CREATE POLICY "Users can read their own habits"
ON habits
FOR SELECT
USING (true);

-- Policy: Allow users to update their own habits
CREATE POLICY "Users can update their own habits"
ON habits
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own habits
CREATE POLICY "Users can delete their own habits"
ON habits
FOR DELETE
USING (true);

-- ============================================
-- HABIT LOGS RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can read habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can update habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can delete habit logs" ON habit_logs;

-- Policy: Allow users to insert habit logs for their habits
CREATE POLICY "Users can insert habit logs"
ON habit_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habits 
    WHERE habits.id = habit_logs.habit_id
  )
);

-- Policy: Allow users to read habit logs for their habits
CREATE POLICY "Users can read habit logs"
ON habit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM habits 
    WHERE habits.id = habit_logs.habit_id
  )
);

-- Policy: Allow users to update habit logs for their habits
CREATE POLICY "Users can update habit logs"
ON habit_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM habits 
    WHERE habits.id = habit_logs.habit_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM habits 
    WHERE habits.id = habit_logs.habit_id
  )
);

-- Policy: Allow users to delete habit logs for their habits
CREATE POLICY "Users can delete habit logs"
ON habit_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM habits 
    WHERE habits.id = habit_logs.habit_id
  )
);

-- ============================================
-- NOTES RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can read their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Policy: Allow users to insert their own notes
CREATE POLICY "Users can insert their own notes"
ON notes
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own notes
CREATE POLICY "Users can read their own notes"
ON notes
FOR SELECT
USING (true);

-- Policy: Allow users to update their own notes
CREATE POLICY "Users can update their own notes"
ON notes
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own notes
CREATE POLICY "Users can delete their own notes"
ON notes
FOR DELETE
USING (true);
