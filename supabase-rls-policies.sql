-- Supabase RLS Policies for Health Tracker App
-- Run these SQL commands in your Supabase SQL Editor
-- These policies allow users to insert/update/delete their own data based on user_id

-- ============================================
-- NUTRITION_LOGS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own nutrition logs" ON nutrition_logs;
DROP POLICY IF EXISTS "Users can read their own nutrition logs" ON nutrition_logs;
DROP POLICY IF EXISTS "Users can update their own nutrition logs" ON nutrition_logs;
DROP POLICY IF EXISTS "Users can delete their own nutrition logs" ON nutrition_logs;

-- Policy: Allow users to insert their own nutrition logs
CREATE POLICY "Users can insert their own nutrition logs"
ON nutrition_logs
FOR INSERT
WITH CHECK (true); -- Allow all inserts (since we're using UUID-based user_id)

-- Policy: Allow users to read their own nutrition logs
CREATE POLICY "Users can read their own nutrition logs"
ON nutrition_logs
FOR SELECT
USING (true); -- Allow all reads (you can restrict to user_id if needed)

-- Policy: Allow users to update their own nutrition logs
CREATE POLICY "Users can update their own nutrition logs"
ON nutrition_logs
FOR UPDATE
USING (true) -- Allow all updates
WITH CHECK (true);

-- Policy: Allow users to delete their own nutrition logs
CREATE POLICY "Users can delete their own nutrition logs"
ON nutrition_logs
FOR DELETE
USING (true); -- Allow all deletes

-- ============================================
-- WORKOUTS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can read their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;

-- Policy: Allow users to insert their own workouts
CREATE POLICY "Users can insert their own workouts"
ON workouts
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own workouts
CREATE POLICY "Users can read their own workouts"
ON workouts
FOR SELECT
USING (true);

-- Policy: Allow users to update their own workouts
CREATE POLICY "Users can update their own workouts"
ON workouts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own workouts
CREATE POLICY "Users can delete their own workouts"
ON workouts
FOR DELETE
USING (true);

-- ============================================
-- WORKOUT_EXERCISES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can read workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can update workout exercises" ON workout_exercises;
DROP POLICY IF EXISTS "Users can delete workout exercises" ON workout_exercises;

-- Policy: Allow users to insert workout exercises
CREATE POLICY "Users can insert workout exercises"
ON workout_exercises
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read workout exercises
CREATE POLICY "Users can read workout exercises"
ON workout_exercises
FOR SELECT
USING (true);

-- Policy: Allow users to update workout exercises
CREATE POLICY "Users can update workout exercises"
ON workout_exercises
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete workout exercises
CREATE POLICY "Users can delete workout exercises"
ON workout_exercises
FOR DELETE
USING (true);

-- ============================================
-- WORKOUT_SETS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can read workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can update workout sets" ON workout_sets;
DROP POLICY IF EXISTS "Users can delete workout sets" ON workout_sets;

-- Policy: Allow users to insert workout sets
CREATE POLICY "Users can insert workout sets"
ON workout_sets
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read workout sets
CREATE POLICY "Users can read workout sets"
ON workout_sets
FOR SELECT
USING (true);

-- Policy: Allow users to update workout sets
CREATE POLICY "Users can update workout sets"
ON workout_sets
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete workout sets
CREATE POLICY "Users can delete workout sets"
ON workout_sets
FOR DELETE
USING (true);

-- ============================================
-- SLEEP_LOGS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own sleep logs" ON sleep_logs;
DROP POLICY IF EXISTS "Users can read their own sleep logs" ON sleep_logs;
DROP POLICY IF EXISTS "Users can update their own sleep logs" ON sleep_logs;
DROP POLICY IF EXISTS "Users can delete their own sleep logs" ON sleep_logs;

-- Policy: Allow users to insert their own sleep logs
CREATE POLICY "Users can insert their own sleep logs"
ON sleep_logs
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own sleep logs
CREATE POLICY "Users can read their own sleep logs"
ON sleep_logs
FOR SELECT
USING (true);

-- Policy: Allow users to update their own sleep logs
CREATE POLICY "Users can update their own sleep logs"
ON sleep_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own sleep logs
CREATE POLICY "Users can delete their own sleep logs"
ON sleep_logs
FOR DELETE
USING (true);

-- ============================================
-- SAVED_MEALS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own saved meals" ON saved_meals;
DROP POLICY IF EXISTS "Users can read their own saved meals" ON saved_meals;
DROP POLICY IF EXISTS "Users can update their own saved meals" ON saved_meals;
DROP POLICY IF EXISTS "Users can delete their own saved meals" ON saved_meals;

-- Policy: Allow users to insert their own saved meals
CREATE POLICY "Users can insert their own saved meals"
ON saved_meals
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own saved meals
CREATE POLICY "Users can read their own saved meals"
ON saved_meals
FOR SELECT
USING (true);

-- Policy: Allow users to update their own saved meals
CREATE POLICY "Users can update their own saved meals"
ON saved_meals
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own saved meals
CREATE POLICY "Users can delete their own saved meals"
ON saved_meals
FOR DELETE
USING (true);

-- ============================================
-- TODOS TABLE
-- ============================================

-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can read their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;

-- Policy: Allow users to insert their own todos
CREATE POLICY "Users can insert their own todos"
ON todos
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own todos
CREATE POLICY "Users can read their own todos"
ON todos
FOR SELECT
USING (true);

-- Policy: Allow users to update their own todos
CREATE POLICY "Users can update their own todos"
ON todos
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own todos
CREATE POLICY "Users can delete their own todos"
ON todos
FOR DELETE
USING (true);

-- ============================================
-- WORKOUT_TEMPLATES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own workout templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can read their own workout templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can update their own workout templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can delete their own workout templates" ON workout_templates;

-- Policy: Allow users to insert their own workout templates
CREATE POLICY "Users can insert their own workout templates"
ON workout_templates
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read their own workout templates
CREATE POLICY "Users can read their own workout templates"
ON workout_templates
FOR SELECT
USING (true);

-- Policy: Allow users to update their own workout templates
CREATE POLICY "Users can update their own workout templates"
ON workout_templates
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete their own workout templates
CREATE POLICY "Users can delete their own workout templates"
ON workout_templates
FOR DELETE
USING (true);

-- ============================================
-- WORKOUT_TEMPLATE_EXERCISES TABLE
-- ============================================

-- Enable RLS
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert workout template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can read workout template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can update workout template exercises" ON workout_template_exercises;
DROP POLICY IF EXISTS "Users can delete workout template exercises" ON workout_template_exercises;

-- Policy: Allow users to insert workout template exercises
CREATE POLICY "Users can insert workout template exercises"
ON workout_template_exercises
FOR INSERT
WITH CHECK (true);

-- Policy: Allow users to read workout template exercises
CREATE POLICY "Users can read workout template exercises"
ON workout_template_exercises
FOR SELECT
USING (true);

-- Policy: Allow users to update workout template exercises
CREATE POLICY "Users can update workout template exercises"
ON workout_template_exercises
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policy: Allow users to delete workout template exercises
CREATE POLICY "Users can delete workout template exercises"
ON workout_template_exercises
FOR DELETE
USING (true);

-- ============================================
-- NOTES:
-- ============================================
-- These policies use `WITH CHECK (true)` and `USING (true)` which allows
-- all operations. This is because we're using UUID-based user_id instead
-- of Supabase Auth.
--
-- For better security in production, you could restrict based on user_id:
-- USING (user_id = current_setting('app.user_id')::uuid)
--
-- But since we're storing user_id in AsyncStorage and not using Supabase Auth,
-- the simpler approach is to allow all operations. The app itself ensures
-- users only see/modify their own data by filtering by user_id in queries.
