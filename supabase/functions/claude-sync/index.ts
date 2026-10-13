// Edge Function: claude-sync
// Recibe el snapshot de Hoy de un usuario con sesión, comprueba su cuota diaria,
// llama a la API de Anthropic con la clave del servidor y devuelve
// {"brief": string, "addTasks": [{title, priority, deadline}]}.
//
// Secrets (supabase secrets set ...):
//   ANTHROPIC_API_KEY    obligatoria
//   CLAUDE_MODEL         opcional (por defecto claude-sonnet-5-5)
//   CLAUDE_DAILY_LIMIT   opcional, llamadas por usuario y día UTC (por defecto 10)
//   ALLOWED_ORIGINS      opcional, orígenes web separados por comas (por defecto *)
// SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase.

const MAX_BODY_BYTES = 32_000;
const MAX_TOKENS = 700;
const ANTHROPIC_URL = Deno.env.get('ANTHROPIC_API_URL') || 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = [
  'Mantienes al día las tareas de esta persona a partir del JSON que recibes.',
  'Responde solo con JSON: {"brief":"una frase en español, factual","addTasks":[{"title":"","priority":"low|medium|high","deadline":"yyyy-mm-dd"|null}]}.',
  'addTasks solo si falta un compromiso claro que no esté ya en tasks. Si no falta nada, addTasks va vacío.',
  'No inventes hábitos, citas médicas ni objetivos. No pidas borrar ni completar nada.',
].join(' ');

type Priority = 'low' | 'medium' | 'high';
type Reply = { brief: string; addTasks: Array<{ title: string; priority: Priority; deadline: string | null }> };

const env = (name: string) => Deno.env.get(name)?.trim() || '';

const corsHeaders = (request: Request): Record<string, string> => {
  const allowed = env('ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get('origin') ?? '';
  const allowOrigin = allowed.length === 0 ? '*' : allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
};

const json = (request: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'content-type': 'application/json' },
  });

// ---------- Snapshot: solo los campos conocidos, recortados ----------

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const num = (value: unknown, max: number) => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
};
const day = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
const priority = (value: unknown): Priority => (value === 'high' || value === 'low' ? value : 'medium');
const obj = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {});
const list = (value: unknown, max: number) => (Array.isArray(value) ? value.slice(0, max) : []);

const sanitizeSnapshot = (raw: unknown) => {
  const snapshot = obj(raw);
  const goals = obj(snapshot.goals);
  const today = obj(snapshot.today);
  const mood = today.mood == null ? null : Math.round(num(today.mood, 5)) || null;
  return {
    date: day(snapshot.date),
    goals: {
      waterMl: num(goals.waterMl, 20_000),
      calories: num(goals.calories, 20_000),
      sleepHours: num(goals.sleepHours, 24),
    },
    today: {
      waterMl: num(today.waterMl, 20_000),
      mood,
      calories: num(today.calories, 50_000),
      sleepHours: num(today.sleepHours, 24),
      workout: today.workout === true,
    },
    habits: list(snapshot.habits, 50)
      .map((habit) => ({ name: text(obj(habit).name, 60), doneToday: obj(habit).doneToday === true }))
      .filter((habit) => habit.name),
    tasks: list(snapshot.tasks, 60)
      .map((task) => ({
        title: text(obj(task).title, 120),
        priority: priority(obj(task).priority),
        deadline: day(obj(task).deadline),
      }))
      .filter((task) => task.title),
  };
};

// ---------- Respuesta del modelo: mismo contrato que el cliente ----------

const extractReply = (output: string): Reply => {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end <= start) return { brief: '', addTasks: [] };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(output.slice(start, end + 1));
  } catch {
    return { brief: '', addTasks: [] };
  }
  return {
    brief: text(parsed.brief, 180),
    addTasks: list(parsed.addTasks, 5)
      .map((task) => ({
        title: text(obj(task).title, 80),
        priority: priority(obj(task).priority),
        deadline: day(obj(task).deadline),
      }))
      .filter((task) => task.title),
  };
};

const secondsToUtcMidnight = () => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== 'POST') return json(request, 405, { error: 'Método no permitido' });

  const supabaseUrl = env('SUPABASE_URL');
  const apiKey = env('ANTHROPIC_API_KEY');
  const publicKey = env('SUPABASE_ANON_KEY') || request.headers.get('apikey') || '';
  if (!supabaseUrl || !apiKey || !publicKey) return json(request, 500, { error: 'Claude no está configurado en el servidor' });

  // 1. Sesión real de Supabase
  const authorization = request.headers.get('authorization') ?? '';
  if (!/^Bearer\s+\S+/i.test(authorization)) return json(request, 401, { error: 'Sin sesión' });
  const supabaseHeaders = { apikey: publicKey, authorization, 'content-type': 'application/json' };
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: supabaseHeaders }).catch(() => null);
  if (!userResponse?.ok) return json(request, 401, { error: 'Sesión no válida' });

  // 2. Cuerpo acotado
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) return json(request, 413, { error: 'Snapshot demasiado grande' });
  let body: Record<string, unknown>;
  try {
    body = obj(JSON.parse(rawBody));
  } catch {
    return json(request, 400, { error: 'JSON no válido' });
  }
  const snapshot = sanitizeSnapshot(body.snapshot);
  if (!snapshot.date) return json(request, 400, { error: 'Falta la fecha del snapshot' });

  // 3. Cuota diaria (cuenta antes de llamar, también si Anthropic falla)
  const limit = Math.max(1, Number(env('CLAUDE_DAILY_LIMIT')) || 10);
  const quota = await fetch(`${supabaseUrl}/rest/v1/rpc/claude_usage_bump`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({ p_limit: limit }),
  }).catch(() => null);
  if (!quota?.ok) return json(request, 503, { error: 'No se ha podido comprobar la cuota', retryAfter: 300 });
  const used = Number(await quota.json());
  if (!Number.isFinite(used) || used < 0) {
    return json(request, 429, { error: 'Límite diario de Claude alcanzado', retryAfter: secondsToUtcMidnight() });
  }

  // 4. Anthropic
  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env('CLAUDE_MODEL') || 'claude-sonnet-5-5',
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(snapshot) }],
    }),
  }).catch(() => null);

  if (!upstream) return json(request, 503, { error: 'Sin conexión con Claude', retryAfter: 300 });
  if (!upstream.ok) {
    const status = upstream.status;
    await upstream.body?.cancel();
    if (status === 429 || status >= 500) {
      const retryAfter = Number(upstream.headers.get('retry-after')) || 300;
      return json(request, 503, { error: 'Claude está saturado, se reintentará', retryAfter });
    }
    console.error('Anthropic respondió', status);
    return json(request, 502, { error: 'Claude no ha respondido', retryAfter: 3600 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as { content?: Array<{ type?: string; text?: string }> };
  const output = (payload.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');

  return json(request, 200, { ...extractReply(output), used, limit });
});
