-- Datos de demostración realistas para Beacon (≈ 6 semanas).
-- Se insertan en la cuenta que tiene el conector de Claude activo (mcp_tokens).
-- Todos los ids empiezan por dec0de00- para poder borrarlos con supabase/seed/demo-clean.sql.
-- Fechas en hora de Singapur (UTC+8). Es idempotente: borra la demo anterior antes de insertar.

CREATE OR REPLACE FUNCTION pg_temp.did(n bigint) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$
  SELECT ('dec0de00-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;

CREATE OR REPLACE FUNCTION pg_temp.pick(arr text[]) RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT arr[1 + floor(random() * array_length(arr, 1))::int]
$$;

DO $$
DECLARE
  uid uuid;
  tz text := 'Asia/Singapore';
  today date := (now() AT TIME ZONE 'Asia/Singapore')::date;
  start_day date := (now() AT TIME ZONE 'Asia/Singapore')::date - 44;
  d date;
  k bigint := 0;
  dow int;
  is_today boolean;
  h record;
  wid uuid;
  eid uuid;
  ex text;
  ex_i int;
  s int;
  base_kg numeric;
  weeks numeric;
  bed timestamptz;
  wake timestamptz;
  meal record;
  habit_ids uuid[] := ARRAY[]::uuid[];
  habit_p numeric[] := ARRAY[0.92, 0.88, 0.55, 0.62, 0.45];
BEGIN
  SELECT user_id INTO uid FROM public.mcp_tokens ORDER BY created_at DESC LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No hay ninguna cuenta con el conector activo';
  END IF;
  PERFORM setseed(0.4242);

  -- Limpieza de una demo anterior
  DELETE FROM public.habit_logs WHERE id::text LIKE 'dec0de00-%';
  DELETE FROM public.habits WHERE id::text LIKE 'dec0de00-%';
  DELETE FROM public.workouts WHERE id::text LIKE 'dec0de00-%';
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

  -- Los días con registros propios (agua o ánimo) no se pisan
  -- Hábitos
  FOR h IN SELECT * FROM (VALUES
      (1, 'Leer 20 minutos', 'book', '#1C4ED8'),
      (2, 'Creatina', 'droplets', '#0F7A45'),
      (3, 'Meditar 10 min', 'leaf', '#3A4D8F'),
      (4, 'Estirar', 'heart', '#C2410C'),
      (5, 'Sin pantallas tras las 23:30', 'moon', '#3E4652')
    ) AS t(i, name, icon, color)
  LOOP
    k := k + 1;
    INSERT INTO public.habits (id, user_id, name, icon, color, frequency, created_at)
    VALUES (pg_temp.did(k), uid, h.name, h.icon, h.color, 'daily', (start_day::timestamp + make_interval(mins => h.i)) AT TIME ZONE tz);
    habit_ids := habit_ids || pg_temp.did(k);
  END LOOP;

  -- Plantillas de comida
  FOR meal IN SELECT * FROM (VALUES
      ('Avena con plátano', 420, 16, 68, 9, 'breakfast'),
      ('Chicken rice', 620, 38, 72, 18, 'lunch'),
      ('Yogur griego con granola', 380, 24, 44, 11, 'snack'),
      ('Salmón con verduras', 590, 42, 22, 34, 'dinner'),
      ('Batido de proteína', 240, 30, 18, 4, 'snack')
    ) AS t(name, kcal, p, c, f, mt)
  LOOP
    k := k + 1;
    INSERT INTO public.meal_templates (id, user_id, name, calories, protein_g, carbs_g, fat_g, meal_type, created_at)
    VALUES (pg_temp.did(k), uid, meal.name, meal.kcal, meal.p, meal.c, meal.f, meal.mt, start_day::timestamp AT TIME ZONE tz);
  END LOOP;

  d := start_day;
  WHILE d <= today LOOP
    is_today := d = today;
    dow := extract(isodow FROM d);

    -- Agua (hoy, a media mañana)
    IF NOT EXISTS (SELECT 1 FROM public.water_logs WHERE user_id = uid AND log_date = d) THEN
      k := k + 1;
      INSERT INTO public.water_logs (id, user_id, log_date, amount_ml, created_at)
      VALUES (pg_temp.did(k), uid, d,
              CASE WHEN is_today THEN 1250 ELSE (5 + floor(random() * 7))::int * 250 END,
              (d::timestamp + interval '20 hours') AT TIME ZONE tz);
    END IF;

    -- Sueño de la noche anterior
    bed := ((d - 1)::timestamp + interval '23 hours'
            + make_interval(mins => (floor(random() * 120) + CASE WHEN dow IN (6, 7) THEN 45 ELSE 0 END)::int)) AT TIME ZONE tz;
    wake := (d::timestamp + interval '6 hours 50 minutes'
             + make_interval(mins => (floor(random() * 80) + CASE WHEN dow IN (6, 7) THEN 70 ELSE 0 END)::int)) AT TIME ZONE tz;
    k := k + 1;
    INSERT INTO public.sleep_logs (id, user_id, bed_time, wake_time, quality_rating, notes, created_at)
    VALUES (pg_temp.did(k), uid, bed, wake,
            LEAST(5, GREATEST(2, round(1.2 + extract(epoch FROM wake - bed) / 3600 * 0.38 + random() * 0.8)))::int,
            NULL, wake + interval '10 minutes');

    -- Ánimo
    IF NOT EXISTS (SELECT 1 FROM public.mood_logs WHERE user_id = uid AND log_date = d) THEN
      k := k + 1;
      INSERT INTO public.mood_logs (id, user_id, log_date, mood_score, energy_score, notes, created_at)
      VALUES (pg_temp.did(k), uid, d,
              CASE WHEN is_today THEN 4 ELSE LEAST(5, GREATEST(1, round(3.4 + (random() - 0.45) * 2.6)))::int END,
              LEAST(5, GREATEST(1, round(3.2 + (random() - 0.5) * 2.4)))::int,
              NULL, (d::timestamp + interval '21 hours') AT TIME ZONE tz);
    END IF;

    -- Comidas
    k := k + 1;
    INSERT INTO public.nutrition_logs (id, user_id, logged_at, name, calories, protein_g, carbs_g, fat_g, meal_type)
    SELECT pg_temp.did(k), uid, (d::timestamp + interval '8 hours 15 minutes' + make_interval(mins => floor(random() * 50)::int)) AT TIME ZONE tz, x.name, x.kcal, x.p, x.c, x.f, 'breakfast'
    FROM (VALUES ('Avena con plátano', 420, 16, 68, 9), ('Yogur griego con granola', 380, 24, 44, 11),
                 ('Tostadas con huevo y aguacate', 460, 20, 38, 24), ('Kaya toast y café', 390, 9, 52, 15)) AS x(name, kcal, p, c, f)
    ORDER BY random() LIMIT 1;

    k := k + 1;
    INSERT INTO public.nutrition_logs (id, user_id, logged_at, name, calories, protein_g, carbs_g, fat_g, meal_type)
    SELECT pg_temp.did(k), uid, (d::timestamp + interval '12 hours 40 minutes' + make_interval(mins => floor(random() * 60)::int)) AT TIME ZONE tz, x.name, x.kcal, x.p, x.c, x.f, 'lunch'
    FROM (VALUES ('Chicken rice', 620, 38, 72, 18), ('Laksa', 710, 28, 70, 34), ('Poke de salmón', 640, 34, 70, 22),
                 ('Ensalada de atún', 520, 36, 30, 26), ('Nasi lemak', 680, 24, 82, 28), ('Pollo teriyaki con arroz', 650, 40, 78, 16)) AS x(name, kcal, p, c, f)
    ORDER BY random() LIMIT 1;

    IF NOT is_today THEN
      k := k + 1;
      INSERT INTO public.nutrition_logs (id, user_id, logged_at, name, calories, protein_g, carbs_g, fat_g, meal_type)
      SELECT pg_temp.did(k), uid, (d::timestamp + interval '19 hours 45 minutes' + make_interval(mins => floor(random() * 90)::int)) AT TIME ZONE tz, x.name, x.kcal, x.p, x.c, x.f, 'dinner'
      FROM (VALUES ('Salmón con verduras', 590, 42, 22, 34), ('Pasta boloñesa', 720, 34, 88, 22), ('Tortilla francesa con ensalada', 480, 28, 14, 32),
                   ('Ramen', 760, 30, 90, 28), ('Wok de ternera y verduras', 610, 38, 52, 24), ('Hamburguesa casera', 780, 42, 56, 40)) AS x(name, kcal, p, c, f)
      ORDER BY random() LIMIT 1;

      IF random() < 0.55 THEN
        k := k + 1;
        INSERT INTO public.nutrition_logs (id, user_id, logged_at, name, calories, protein_g, carbs_g, fat_g, meal_type)
        SELECT pg_temp.did(k), uid, (d::timestamp + interval '16 hours 30 minutes' + make_interval(mins => floor(random() * 60)::int)) AT TIME ZONE tz, x.name, x.kcal, x.p, x.c, x.f, 'snack'
        FROM (VALUES ('Batido de proteína', 240, 30, 18, 4), ('Plátano y almendras', 260, 7, 32, 13), ('Fruta', 120, 1, 28, 0), ('Yogur griego', 150, 15, 8, 6)) AS x(name, kcal, p, c, f)
        ORDER BY random() LIMIT 1;
      END IF;
    END IF;

    -- Hábitos (hoy: solo creatina hecha)
    FOR s IN 1..array_length(habit_ids, 1) LOOP
      IF (is_today AND s = 2) OR (NOT is_today AND random() < habit_p[s]) THEN
        k := k + 1;
        INSERT INTO public.habit_logs (id, habit_id, user_id, log_date, completed)
        VALUES (pg_temp.did(k), habit_ids[s], uid, d, true);
      END IF;
    END LOOP;

    -- Entrenos: lunes pierna + core, jueves torso, sábado calistenia
    IF NOT is_today AND dow IN (1, 4, 6) AND random() < 0.88 THEN
      weeks := (d - start_day) / 7.0;
      k := k + 1;
      wid := pg_temp.did(k);
      INSERT INTO public.workouts (id, user_id, started_at, name, notes, duration_minutes, completed)
      VALUES (wid, uid,
              (d::timestamp + CASE WHEN dow = 6 THEN interval '10 hours' ELSE interval '18 hours 30 minutes' END) AT TIME ZONE tz,
              CASE dow WHEN 1 THEN 'Pierna + core' WHEN 4 THEN 'Torso' ELSE 'Calistenia' END,
              NULL, (50 + floor(random() * 25))::int, true);
      ex_i := 0;
      FOREACH ex IN ARRAY CASE dow
          WHEN 1 THEN ARRAY['Sentadilla', 'Peso muerto rumano', 'Prensa', 'Plancha']
          WHEN 4 THEN ARRAY['Press banca', 'Remo con barra', 'Press militar', 'Jalón al pecho']
          ELSE ARRAY['Dominadas', 'Fondos', 'Flexiones', 'L-sit'] END
      LOOP
        ex_i := ex_i + 1;
        k := k + 1;
        eid := pg_temp.did(k);
        INSERT INTO public.workout_exercises (id, workout_id, exercise_name, order_index) VALUES (eid, wid, ex, ex_i);
        base_kg := CASE ex
          WHEN 'Sentadilla' THEN 70 WHEN 'Peso muerto rumano' THEN 60 WHEN 'Prensa' THEN 120
          WHEN 'Press banca' THEN 55 WHEN 'Remo con barra' THEN 50 WHEN 'Press militar' THEN 32.5 WHEN 'Jalón al pecho' THEN 50
          ELSE NULL END;
        FOR s IN 1..3 LOOP
          k := k + 1;
          INSERT INTO public.workout_sets (id, exercise_id, set_number, reps, weight_kg, duration_seconds, completed)
          VALUES (pg_temp.did(k), eid, s,
                  CASE WHEN ex IN ('Plancha', 'L-sit') THEN NULL
                       WHEN ex = 'Dominadas' THEN 6 + floor(weeks / 2)::int - (s - 1)
                       WHEN ex = 'Fondos' THEN 9 + floor(weeks / 2)::int - (s - 1)
                       WHEN ex = 'Flexiones' THEN 18 + floor(weeks)::int - 2 * (s - 1)
                       ELSE 8 + (CASE WHEN s = 1 THEN 2 ELSE 0 END) END,
                  CASE WHEN base_kg IS NULL THEN NULL ELSE base_kg + 2.5 * floor(weeks / 1.5) END,
                  CASE WHEN ex = 'Plancha' THEN 45 + 5 * floor(weeks)::int WHEN ex = 'L-sit' THEN 10 + 2 * floor(weeks)::int ELSE NULL END,
                  true);
        END LOOP;
      END LOOP;
    END IF;

    -- Peso los domingos (bajando poco a poco)
    IF dow = 7 OR is_today THEN
      k := k + 1;
      INSERT INTO public.body_metrics (id, user_id, date, weight_kg, body_fat_pct, notes, created_at)
      VALUES (pg_temp.did(k), uid, d,
              round((73.1 - (d - start_day) * 0.028 + (random() - 0.5) * 0.5)::numeric, 1),
              round((16.2 - (d - start_day) * 0.02 + (random() - 0.5) * 0.3)::numeric, 1),
              NULL, (d::timestamp + interval '8 hours') AT TIME ZONE tz);
    END IF;

    d := d + 1;
  END LOOP;

  -- Diario
  FOR h IN SELECT * FROM (VALUES
      (-41, 'Primera semana en Singapur', 'Todo es enorme y húmedo. El campus de SMU está en pleno centro y se va andando a todo. Ganas de montar una rutina desde ya.', 4, ARRAY['intercambio']),
      (-34, 'Rutina', 'Ya tengo el gimnasio fijo los lunes y jueves y calistenia el sábado en el parque. Me cuesta dormir antes de las 12.', 3, ARRAY['gym', 'sueño']),
      (-27, 'Semana pesada', 'Muchas entregas a la vez. Dormí poco el martes y se nota en todo. Mañana sin pantallas a partir de las 23:30.', 2, ARRAY['estudio']),
      (-20, 'Fin de semana en Malasia', 'Escapada con gente del intercambio. Comí fatal y anduve muchísimo. Volví cansado pero contento.', 5, ARRAY['viaje']),
      (-13, 'Meditar sí funciona', 'Tres días seguidos meditando 10 minutos antes de dormir y me duermo antes. Lo mantengo.', 4, ARRAY['hábitos']),
      (-6, 'Proyecto de Digital Business', 'Buena reunión con el grupo: ya tenemos empresa y enfoque. Me toca la parte de datos.', 4, ARRAY['estudio']),
      (-2, 'Antes del mid-term', 'Repaso de R casi terminado. Algo nervioso con las regresiones, pero bien.', 3, ARRAY['estudio']),
      (-1, 'Rebranding de la app', 'La app ahora se llama Beacon. Me gusta mucho más el icono nuevo.', 5, ARRAY['proyectos'])
    ) AS t(off, title, content, mood, tags)
  LOOP
    k := k + 1;
    INSERT INTO public.journal_entries (id, user_id, created_at, title, content, mood_score, tags)
    VALUES (pg_temp.did(k), uid, ((today + h.off)::timestamp + interval '22 hours 10 minutes') AT TIME ZONE tz, h.title, h.content, h.mood, h.tags);
  END LOOP;

  -- Notas
  FOR h IN SELECT * FROM (VALUES
      (-30, 'Sitios para comer', 'Maxwell Food Centre (chicken rice), Lau Pa Sat por la noche, Tiong Bahru para desayunar.'),
      (-18, 'Ideas para el TFG', 'Agentes con herramientas sobre datos personales. Evaluación con tareas reales. Hablar con el tutor en enero.'),
      (-9, 'Rutina de torso', 'Press banca 3×8, remo 3×8, press militar 3×8, jalón 3×10. Subir 2,5 kg cuando salgan todas las series.'),
      (-4, 'Viaje de diciembre', 'Opciones: Filipinas con amigos (Palawan) o mochilero por Vietnam. Mirar vuelos antes del 1 de noviembre.'),
      (0, 'Para Claude', 'Pedirle el resumen semanal los domingos y que me apunte las tareas de la semana.')
    ) AS t(off, title, content)
  LOOP
    k := k + 1;
    INSERT INTO public.notes (id, user_id, created_at, title, content)
    VALUES (pg_temp.did(k), uid, ((today + h.off)::timestamp + interval '13 hours') AT TIME ZONE tz, h.title, h.content);
  END LOOP;

  -- Tareas
  FOR h IN SELECT * FROM (VALUES
      ('Enviar el proposal de Digital Business', 'Versión final en el drive del grupo', 1, false, 'high'),
      ('Comprar creatina', NULL, 0, false, 'medium'),
      ('Pedir cita en el dentista', 'Antes de volver a Madrid', -2, false, 'medium'),
      ('Reservar vuelos de diciembre', 'Comparar Palawan y Hanói', 6, false, 'high'),
      ('Escribir al tutor del TFG', NULL, 10, false, 'low'),
      ('Pagar el alquiler de noviembre', NULL, 15, false, 'high'),
      ('Lavar la ropa', NULL, 0, false, 'low'),
      ('Ejercicios de R, semana 7', NULL, -5, true, 'medium'),
      ('Renovar el seguro de viaje', NULL, -12, true, 'high'),
      ('Preparar la presentación del club', NULL, -9, true, 'medium'),
      ('Abrir cuenta en el banco local', NULL, -30, true, 'medium'),
      ('Comprar tarjeta EZ-Link', NULL, -40, true, 'low')
    ) AS t(title, descr, off, done, prio)
  LOOP
    k := k + 1;
    INSERT INTO public.tasks (id, user_id, title, description, deadline, completed, priority, created_at)
    VALUES (pg_temp.did(k), uid, h.title, h.descr, today + h.off, h.done, h.prio, ((today + LEAST(h.off, 0) - 3)::timestamp + interval '10 hours') AT TIME ZONE tz);
  END LOOP;

  -- Eventos (pasados y próximos)
  FOR h IN SELECT * FROM (VALUES
      (0, '15:30', 'Mid-term DSA212', 'SOE/SCIS2 Seminar Room 3-7'),
      (0, '20:00', 'Cena con el grupo de intercambio', 'Lau Pa Sat'),
      (1, '10:00', 'Calistenia en el parque', 'Fort Canning Park'),
      (3, '12:00', 'Clase Digital Business', 'SMU, LKCSB'),
      (4, '18:30', 'Gym: torso', 'Gimnasio SMU'),
      (5, '12:00', 'Clase Digital Business', 'SMU, LKCSB'),
      (7, '19:00', 'Llamada con la familia', NULL),
      (9, '16:00', 'Reunión grupo Digital Business', 'Biblioteca Li Ka Shing'),
      (12, '09:30', 'Clase DSA212', 'SMU, SCIS'),
      (-3, '12:00', 'Clase Digital Business', 'SMU, LKCSB'),
      (-7, '21:00', 'Afterwork del club de intercambio', 'Clarke Quay')
    ) AS t(off, at, title, place)
  LOOP
    k := k + 1;
    INSERT INTO public.events (id, user_id, title, description, event_date, event_time, location, created_at)
    VALUES (pg_temp.did(k), uid, h.title, NULL, today + h.off, h.at::time, h.place, ((today - 10)::timestamp) AT TIME ZONE tz);
  END LOOP;

  RAISE NOTICE 'Demo de Beacon: % filas para %', k, uid;
END $$;
