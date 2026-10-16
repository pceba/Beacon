-- Borra solo los datos de demostración (ids que empiezan por dec0de00-).
-- Los registros reales no se tocan.
DELETE FROM public.habit_logs WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.habits WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.workouts WHERE id::text LIKE 'dec0de00-%';      -- ejercicios y series caen en cascada
DELETE FROM public.water_logs WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.mood_logs WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.sleep_logs WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.nutrition_logs WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.meal_templates WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.body_metrics WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.journal_entries WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.notes WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.tasks WHERE id::text LIKE 'dec0de00-%';
DELETE FROM public.events WHERE id::text LIKE 'dec0de00-%';
