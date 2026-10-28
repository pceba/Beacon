// Edge Function: lifepp-mcp
// Servidor MCP remoto (transporte Streamable HTTP, respuestas JSON, sin sesión) para
// conectar Beacon a claude.ai como conector personalizado. Claude razona con tu plan;
// aquí no hay API key de Anthropic.
//
// Autenticación: token personal que genera la app (Ajustes → Conectar con Claude).
//   - En la URL:      https://<ref>.supabase.co/functions/v1/lifepp-mcp/<token>
//   - o en cabecera:  Authorization: Bearer <token>
// El token se valida en Postgres (funciones mcp_*), que solo tocan las filas de su dueño.
// Usa la clave pública del proyecto (SUPABASE_ANON_KEY, la inyecta Supabase).

const SERVER_INFO = { name: 'beacon', title: 'Beacon', version: '1.3.0' };
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const TOKEN = /(lpp_[0-9a-f]{64})/;
const MAX_BODY_BYTES = 64_000;

const INSTRUCTIONS = [
  'Beacon es la app de salud, hábitos y tareas de esta persona.',
  'Usa get_today para ver el día y get_week para los últimos 7 días.',
  'Para registrar lo que dice que ha hecho: log_water, log_habit, log_meal, log_workout, log_mood, log_sleep y log_weight.',
  'log_habit solo marca un hábito que ya existe; si no está, no lo crees.',
  'Usa add_tasks para apuntar tareas nuevas; no dupliques las que ya están abiertas.',
  'Para el calendario: add_event y update_event. Para escribir: add_journal (reflexión del día) y add_note (nota libre).',
  'Para corregir algo, busca su id con list_recent. delete_entry borra un registro concreto: úsalo solo si la persona lo pide de forma explícita y dile qué has borrado.',
  'Las fechas van en formato yyyy-mm-dd y las horas en HH:mm, en la zona horaria del usuario.',
  'No inventes datos de salud.',
].join(' ');

type Json = Record<string, unknown>;
type RpcId = string | number | null;

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Título corto de la tarea' },
    description: { type: 'string', description: 'Detalle opcional' },
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    deadline: { type: 'string', description: 'Fecha límite yyyy-mm-dd, opcional' },
  },
  required: ['title'],
  additionalProperties: false,
};

const TOOLS = [
  {
    name: 'get_today',
    title: 'Ver el día',
    description:
      'Resumen de un día en Beacon: agua (ml), ánimo y energía (1-5), comidas y calorías, horas de sueño, entrenos, hábitos hechos o pendientes, tareas abiertas y eventos. Por defecto, hoy.',
    inputSchema: {
      type: 'object',
      properties: { date: { type: 'string', description: 'Día yyyy-mm-dd; si falta, hoy' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'list_tasks',
    title: 'Listar tareas',
    description: 'Tareas de Beacon con id, título, prioridad, fecha límite y estado. Por defecto solo las abiertas.',
    inputSchema: {
      type: 'object',
      properties: { include_completed: { type: 'boolean', description: 'Incluir también las completadas' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'add_tasks',
    title: 'Añadir tareas',
    description:
      'Crea hasta 20 tareas en Beacon. Las que ya existen abiertas con el mismo título se saltan. Devuelve las creadas y las saltadas.',
    inputSchema: {
      type: 'object',
      properties: { tasks: { type: 'array', items: TASK_SCHEMA, minItems: 1, maxItems: 20 } },
      required: ['tasks'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'update_task',
    title: 'Cambiar una tarea',
    description:
      'Cambia una tarea existente (usa el id de list_tasks o get_today): título, descripción, prioridad, fecha límite (null la quita) o completada.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'id de la tarea' },
        title: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        deadline: { type: ['string', 'null'], description: 'yyyy-mm-dd o null' },
        completed: { type: 'boolean' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'log_water',
    title: 'Anotar agua',
    description: 'Suma mililitros de agua a un día. Cada llamada admite de 1 a 5000 ml. Si ya había agua, se acumula.',
    inputSchema: {
      type: 'object',
      properties: {
        ml: { type: 'integer', minimum: 1, maximum: 5000, description: 'Mililitros a sumar' },
        date: { type: 'string', description: 'Día yyyy-mm-dd; si falta, hoy' },
      },
      required: ['ml'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'log_habit',
    title: 'Marcar hábito',
    description:
      'Marca o desmarca un hábito que ya existe. Indica name o id. Si no existe, falla y no lo crea. done por defecto es true.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del hábito, si no pasas id' },
        id: { type: 'string', description: 'id del hábito' },
        done: { type: 'boolean', description: 'true hecho, false pendiente. Por defecto true' },
        date: { type: 'string', description: 'Día yyyy-mm-dd; si falta, hoy' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'log_meal',
    title: 'Anotar comida',
    description:
      'Añade una comida. meal_type: breakfast, lunch, dinner, snack u other. at es yyyy-mm-dd o yyyy-mm-dd HH:mm en la zona del usuario; si falta, ahora.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la comida' },
        calories: { type: 'integer', minimum: 0, maximum: 10000 },
        protein_g: { type: 'number', minimum: 0, maximum: 9999 },
        carbs_g: { type: 'number', minimum: 0, maximum: 9999 },
        fat_g: { type: 'number', minimum: 0, maximum: 9999 },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'] },
        at: { type: 'string', description: 'yyyy-mm-dd o yyyy-mm-dd HH:mm; si falta, ahora' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'log_workout',
    title: 'Anotar entreno',
    description: 'Añade un entreno ya hecho. at es yyyy-mm-dd o yyyy-mm-dd HH:mm; si falta, ahora.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la sesión' },
        duration_minutes: { type: 'integer', minimum: 1, maximum: 1440 },
        notes: { type: 'string' },
        at: { type: 'string', description: 'yyyy-mm-dd o yyyy-mm-dd HH:mm; si falta, ahora' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'log_mood',
    title: 'Anotar ánimo',
    description: 'Guarda el ánimo del día (1-5). Si ya había uno, lo sustituye. La energía y las notas solo cambian si las envías.',
    inputSchema: {
      type: 'object',
      properties: {
        mood: { type: 'integer', minimum: 1, maximum: 5, description: 'Ánimo de 1 a 5' },
        energy: { type: 'integer', minimum: 1, maximum: 5, description: 'Energía de 1 a 5, opcional' },
        notes: { type: 'string' },
        date: { type: 'string', description: 'Día yyyy-mm-dd; si falta, hoy' },
      },
      required: ['mood'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'get_week',
    title: 'Ver la semana',
    description:
      'Últimos 7 días, acabando en end_date o en hoy. Por día: agua, calorías, horas de sueño, entrenos, hábitos hechos y total, y ánimo. También las tareas abiertas y completadas cuya fecha límite cae en esa semana.',
    inputSchema: {
      type: 'object',
      properties: { end_date: { type: 'string', description: 'Último día yyyy-mm-dd; si falta, hoy' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'log_sleep',
    title: 'Anotar sueño',
    description:
      'Guarda una noche de sueño. bed y wake en HH:mm (o yyyy-mm-dd HH:mm). wake_day es el día en que se levantó (por defecto hoy); si bed es solo hora y queda después de wake, se entiende la noche anterior. Si ya había una noche que termina ese día, se sustituye.',
    inputSchema: {
      type: 'object',
      properties: {
        bed: { type: 'string', description: 'Hora de acostarse, HH:mm' },
        wake: { type: 'string', description: 'Hora de levantarse, HH:mm' },
        quality: { type: 'integer', minimum: 1, maximum: 5, description: 'Calidad de 1 a 5, opcional' },
        notes: { type: 'string' },
        wake_day: { type: 'string', description: 'Día en que se levantó, yyyy-mm-dd; si falta, hoy' },
      },
      required: ['bed', 'wake'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'log_weight',
    title: 'Anotar peso',
    description: 'Guarda el peso del día en kg (y la grasa corporal en %, opcional). Si ya había uno ese día, se actualiza.',
    inputSchema: {
      type: 'object',
      properties: {
        kg: { type: 'number', minimum: 25, maximum: 350 },
        body_fat_pct: { type: 'number', minimum: 2, maximum: 70 },
        date: { type: 'string', description: 'Día yyyy-mm-dd; si falta, hoy' },
      },
      required: ['kg'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'add_event',
    title: 'Añadir evento',
    description: 'Crea un evento en el calendario de la app (clase, cita, plan). La hora es opcional; si sabes cuándo acaba, pon end_time.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'yyyy-mm-dd' },
        time: { type: 'string', description: 'HH:mm, opcional' },
        end_time: { type: 'string', description: 'HH:mm, opcional; posterior a time. Sin ella el evento dura una hora en el calendario' },
        location: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['title', 'date'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'update_event',
    title: 'Cambiar evento',
    description: 'Cambia un evento por su id (búscalo con list_recent kind=event). Solo cambian los campos que envíes; time vacío quita la hora (y la de fin), end_time vacío quita solo la de fin.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        date: { type: 'string', description: 'yyyy-mm-dd' },
        time: { type: 'string', description: 'HH:mm, o vacío para quitarla' },
        end_time: { type: 'string', description: 'HH:mm, o vacío para quitarla' },
        location: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'add_journal',
    title: 'Escribir en el diario',
    description: 'Añade una reflexión al diario, con título, ánimo (1-5) y etiquetas opcionales. Escribe lo que la persona ha contado, sin inventar.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        title: { type: 'string' },
        mood: { type: 'integer', minimum: 1, maximum: 5 },
        tags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
      },
      required: ['content'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'add_note',
    title: 'Añadir nota',
    description: 'Guarda una nota libre (ideas, listas, apuntes).',
    inputSchema: {
      type: 'object',
      properties: { content: { type: 'string' }, title: { type: 'string' } },
      required: ['content'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'list_recent',
    title: 'Ver registros recientes',
    description:
      'Registros de los últimos días con su id, para corregir o borrar uno concreto. kind: meal, workout, sleep, weight, event, journal o note. Para event incluye también los próximos días.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['meal', 'workout', 'sleep', 'weight', 'event', 'journal', 'note'] },
        days: { type: 'integer', minimum: 1, maximum: 90, description: 'Por defecto 7' },
      },
      required: ['kind'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'delete_entry',
    title: 'Borrar un registro',
    description:
      'Borra UN registro por su id. Úsalo solo cuando la persona lo pida explícitamente y confirma después qué has borrado. kind: meal, workout, sleep, weight, event, journal, note o task.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['meal', 'workout', 'sleep', 'weight', 'event', 'journal', 'note', 'task'] },
        id: { type: 'string' },
      },
      required: ['kind', 'id'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
];

class RpcError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

const env = (name: string) => Deno.env.get(name)?.trim() || '';

const publicKey = () => {
  const legacy = env('SUPABASE_ANON_KEY');
  if (legacy) return legacy;
  const raw = env('SUPABASE_PUBLISHABLE_KEYS');
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'string') return parsed;
    const values = Object.values(parsed as Record<string, unknown>).filter((value) => typeof value === 'string');
    return (values[0] as string) ?? '';
  } catch {
    return raw;
  }
};

const callRpc = async (fn: string, args: Json): Promise<unknown> => {
  const url = env('SUPABASE_URL');
  const key = publicKey();
  if (!url || !key) throw new RpcError('Servidor sin configurar', 500);
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  }).catch(() => null);
  if (!response) throw new RpcError('Sin conexión con la base de datos', 502);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (body ?? {}) as { code?: string; message?: string };
    if (error.code === '28000') throw new RpcError('Token no válido o revocado', 401, error.code);
    throw new RpcError(error.message || 'Error de la base de datos', response.status, error.code);
  }
  return body;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-protocol-version',
};

const httpJson = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json', ...extra },
  });

const rpcResult = (id: RpcId, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id: RpcId, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

const toolText = (value: unknown, isError = false) => ({
  content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const runTool = async (token: string, name: string, args: Json) => {
  switch (name) {
    case 'get_today':
      return await callRpc('mcp_get_today', { p_token: token, p_date: str(args.date) ?? null });
    case 'list_tasks':
      return await callRpc('mcp_list_tasks', { p_token: token, p_include_completed: args.include_completed === true });
    case 'add_tasks': {
      if (!Array.isArray(args.tasks) || args.tasks.length === 0) throw new RpcError('tasks debe ser una lista con al menos una tarea', 400);
      return await callRpc('mcp_add_tasks', { p_token: token, p_tasks: args.tasks.slice(0, 20) });
    }
    case 'update_task': {
      const id = str(args.id);
      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new RpcError('id de tarea no válido', 400);
      const changes: Json = {};
      for (const key of ['title', 'description', 'priority', 'deadline', 'completed']) {
        if (key in args) changes[key] = args[key];
      }
      if (Object.keys(changes).length === 0) throw new RpcError('No hay cambios', 400);
      return await callRpc('mcp_update_task', { p_token: token, p_task_id: id, p_changes: changes });
    }
    case 'log_water': {
      const ml = args.ml;
      if (typeof ml !== 'number' || !Number.isInteger(ml) || ml < 1 || ml > 5000) {
        throw new RpcError('ml debe ser un entero entre 1 y 5000', 400);
      }
      return await callRpc('mcp_log_water', { p_token: token, p_ml: ml, p_date: str(args.date) ?? null });
    }
    case 'log_habit': {
      const id = str(args.id);
      const name = str(args.name)?.trim();
      if (id && !/^[0-9a-f-]{36}$/i.test(id)) throw new RpcError('id de hábito no válido', 400);
      if (!id && !name) throw new RpcError('indica el nombre o el id del hábito', 400);
      return await callRpc('mcp_log_habit', {
        p_token: token,
        p_habit_id: id ?? null,
        p_name: name ?? null,
        p_done: args.done !== false,
        p_date: str(args.date) ?? null,
      });
    }
    case 'log_meal': {
      const name = str(args.name)?.trim();
      if (!name) throw new RpcError('la comida necesita un nombre', 400);
      return await callRpc('mcp_log_meal', {
        p_token: token,
        p_name: name,
        p_calories: args.calories ?? null,
        p_protein_g: args.protein_g ?? null,
        p_carbs_g: args.carbs_g ?? null,
        p_fat_g: args.fat_g ?? null,
        p_meal_type: str(args.meal_type) ?? null,
        p_at: str(args.at) ?? null,
      });
    }
    case 'log_workout': {
      const name = str(args.name)?.trim();
      if (!name) throw new RpcError('el entreno necesita un nombre', 400);
      return await callRpc('mcp_log_workout', {
        p_token: token,
        p_name: name,
        p_duration_minutes: args.duration_minutes ?? null,
        p_notes: str(args.notes) ?? null,
        p_at: str(args.at) ?? null,
      });
    }
    case 'log_mood': {
      const mood = args.mood;
      if (typeof mood !== 'number' || !Number.isInteger(mood) || mood < 1 || mood > 5) {
        throw new RpcError('ánimo debe ser un entero de 1 a 5', 400);
      }
      if (args.energy != null && (typeof args.energy !== 'number' || !Number.isInteger(args.energy) || args.energy < 1 || args.energy > 5)) {
        throw new RpcError('energía debe ser un entero de 1 a 5', 400);
      }
      return await callRpc('mcp_log_mood', {
        p_token: token,
        p_mood: mood,
        p_energy: args.energy ?? null,
        p_notes: str(args.notes) ?? null,
        p_date: str(args.date) ?? null,
      });
    }
    case 'get_week':
      return await callRpc('mcp_get_week', { p_token: token, p_end_date: str(args.end_date) ?? null });
    case 'log_sleep': {
      const bed = str(args.bed)?.trim();
      const wake = str(args.wake)?.trim();
      if (!bed || !wake) throw new RpcError('indica bed y wake en HH:mm', 400);
      if (args.quality != null && (typeof args.quality !== 'number' || !Number.isInteger(args.quality) || args.quality < 1 || args.quality > 5)) {
        throw new RpcError('calidad debe ser un entero de 1 a 5', 400);
      }
      return await callRpc('mcp_log_sleep', {
        p_token: token,
        p_bed: bed,
        p_wake: wake,
        p_quality: args.quality ?? null,
        p_notes: str(args.notes) ?? null,
        p_wake_day: str(args.wake_day) ?? null,
      });
    }
    case 'log_weight': {
      if (typeof args.kg !== 'number' || !Number.isFinite(args.kg)) throw new RpcError('kg debe ser un número', 400);
      if (args.body_fat_pct != null && (typeof args.body_fat_pct !== 'number' || !Number.isFinite(args.body_fat_pct))) {
        throw new RpcError('body_fat_pct debe ser un número', 400);
      }
      return await callRpc('mcp_log_weight', {
        p_token: token,
        p_kg: args.kg,
        p_body_fat: args.body_fat_pct ?? null,
        p_date: str(args.date) ?? null,
      });
    }
    case 'add_event': {
      const title = str(args.title)?.trim();
      const date = str(args.date)?.trim();
      if (!title || !date) throw new RpcError('el evento necesita título y fecha', 400);
      return await callRpc('mcp_add_event', {
        p_token: token,
        p_title: title,
        p_date: date,
        p_time: str(args.time) ?? null,
        p_location: str(args.location) ?? null,
        p_description: str(args.description) ?? null,
        // Solo si viene: así sigue funcionando con la versión del SQL anterior a end_time.
        ...(str(args.end_time) ? { p_end_time: str(args.end_time) } : {}),
      });
    }
    case 'update_event': {
      const id = str(args.id);
      if (!id || !UUID.test(id)) throw new RpcError('id de evento no válido', 400);
      const changes: Json = {};
      for (const key of ['title', 'date', 'time', 'end_time', 'location', 'description']) {
        if (key in args) changes[key] = args[key];
      }
      if (Object.keys(changes).length === 0) throw new RpcError('No hay cambios', 400);
      return await callRpc('mcp_update_event', { p_token: token, p_event_id: id, p_changes: changes });
    }
    case 'add_journal': {
      const content = str(args.content)?.trim();
      if (!content) throw new RpcError('la entrada no puede estar vacía', 400);
      if (args.mood != null && (typeof args.mood !== 'number' || !Number.isInteger(args.mood) || args.mood < 1 || args.mood > 5)) {
        throw new RpcError('ánimo debe ser un entero de 1 a 5', 400);
      }
      const tags = Array.isArray(args.tags) ? args.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8) : null;
      return await callRpc('mcp_add_journal', {
        p_token: token,
        p_content: content,
        p_title: str(args.title) ?? null,
        p_mood: args.mood ?? null,
        p_tags: tags,
      });
    }
    case 'add_note': {
      const content = str(args.content)?.trim();
      if (!content) throw new RpcError('la nota no puede estar vacía', 400);
      return await callRpc('mcp_add_note', { p_token: token, p_content: content, p_title: str(args.title) ?? null });
    }
    case 'list_recent': {
      const kind = str(args.kind);
      if (!kind) throw new RpcError('indica kind', 400);
      const days = typeof args.days === 'number' && Number.isInteger(args.days) ? args.days : 7;
      return await callRpc('mcp_list_recent', { p_token: token, p_kind: kind, p_days: days });
    }
    case 'delete_entry': {
      const kind = str(args.kind);
      const id = str(args.id);
      if (!kind) throw new RpcError('indica kind', 400);
      if (!id || !UUID.test(id)) throw new RpcError('id no válido', 400);
      return await callRpc('mcp_delete_entry', { p_token: token, p_kind: kind, p_id: id });
    }
    default:
      throw new RpcError(`Herramienta desconocida: ${name}`, 404);
  }
};

const handleMessage = async (token: string, message: Json): Promise<unknown | null> => {
  const id = (message.id ?? null) as RpcId;
  const method = typeof message.method === 'string' ? message.method : '';
  const isNotification = !('id' in message);
  const params = (message.params && typeof message.params === 'object' ? message.params : {}) as Json;

  if (message.jsonrpc !== '2.0' || !method) {
    return isNotification ? null : rpcError(id, -32600, 'Invalid Request');
  }
  if (isNotification) return null;

  switch (method) {
    case 'initialize': {
      const requested = str(params.protocolVersion) ?? '';
      const protocolVersion = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call': {
      const name = str(params.name) ?? '';
      const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Json;
      if (!TOOLS.some((tool) => tool.name === name)) return rpcError(id, -32602, `Herramienta desconocida: ${name}`);
      try {
        return rpcResult(id, toolText(await runTool(token, name, args)));
      } catch (error) {
        const text = error instanceof Error ? error.message : 'Error';
        return rpcResult(id, toolText(text, true));
      }
    }
    case 'resources/list':
      return rpcResult(id, { resources: [] });
    case 'prompts/list':
      return rpcResult(id, { prompts: [] });
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
};

const extractToken = (request: Request) => {
  const header = request.headers.get('authorization') ?? '';
  const fromHeader = header.match(/^Bearer\s+(lpp_[0-9a-f]{64})\s*$/i)?.[1];
  if (fromHeader) return fromHeader;
  return new URL(request.url).pathname.match(TOKEN)?.[1] ?? null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') {
    return httpJson(405, rpcError(null, -32000, 'Method not allowed'), { allow: 'POST, OPTIONS' });
  }

  const token = extractToken(request);
  if (!token) return httpJson(401, rpcError(null, -32001, 'Falta el token de Beacon'));

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return httpJson(413, rpcError(null, -32600, 'Petición demasiado grande'));
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return httpJson(400, rpcError(null, -32700, 'Parse error'));
  }

  const messages = (Array.isArray(payload) ? payload : [payload]).filter(
    (item): item is Json => Boolean(item) && typeof item === 'object',
  );
  if (messages.length === 0) return httpJson(400, rpcError(null, -32600, 'Invalid Request'));

  // Valida el token al inicializar; las herramientas lo validan en cada llamada.
  if (messages.some((message) => message.method === 'initialize')) {
    try {
      await callRpc('mcp_whoami', { p_token: token });
    } catch (error) {
      const status = error instanceof RpcError ? error.status : 500;
      return httpJson(status === 401 ? 401 : 502, rpcError(null, -32001, error instanceof Error ? error.message : 'Error'));
    }
  }

  const responses = (await Promise.all(messages.map((message) => handleMessage(token, message)))).filter(
    (response) => response !== null,
  );
  if (responses.length === 0) return new Response(null, { status: 202, headers: corsHeaders });
  return httpJson(200, Array.isArray(payload) ? responses : responses[0]);
});
