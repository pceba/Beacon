// Edge Function: capalot-mcp
// Servidor MCP remoto (transporte Streamable HTTP, respuestas JSON, sin sesión) para
// conectar Capalot a claude.ai como conector personalizado. Claude razona con tu plan;
// aquí no hay API key de Anthropic.
//
// Autenticación: token personal que genera la app (Ajustes → Conectar con Claude).
//   - En la URL:      https://<ref>.supabase.co/functions/v1/capalot-mcp/<token>
//   - o en cabecera:  Authorization: Bearer <token>
// El token se valida en Postgres (funciones mcp_*), que solo tocan las filas de su dueño.
// Usa la clave pública del proyecto (SUPABASE_ANON_KEY, la inyecta Supabase).

const SERVER_INFO = { name: 'capalot', title: 'Capalot', version: '1.0.0' };
const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const TOKEN = /(cap_[0-9a-f]{64})/;
const MAX_BODY_BYTES = 64_000;

const INSTRUCTIONS = [
  'Capalot es la app de salud, hábitos y tareas de esta persona.',
  'Usa get_today para ver el día (agua, ánimo, comidas, sueño, entrenos, hábitos, tareas abiertas y eventos).',
  'Usa add_tasks para apuntar tareas nuevas; no dupliques las que ya están abiertas.',
  'Las fechas van en formato yyyy-mm-dd y en la zona horaria del usuario.',
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
      'Resumen de un día en Capalot: agua (ml), ánimo y energía (1-5), comidas y calorías, horas de sueño, entrenos, hábitos hechos o pendientes, tareas abiertas y eventos. Por defecto, hoy.',
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
    description: 'Tareas de Capalot con id, título, prioridad, fecha límite y estado. Por defecto solo las abiertas.',
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
      'Crea hasta 20 tareas en Capalot. Las que ya existen abiertas con el mismo título se saltan. Devuelve las creadas y las saltadas.',
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
  const fromHeader = header.match(/^Bearer\s+(cap_[0-9a-f]{64})\s*$/i)?.[1];
  if (fromHeader) return fromHeader;
  return new URL(request.url).pathname.match(TOKEN)?.[1] ?? null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'POST') {
    return httpJson(405, rpcError(null, -32000, 'Method not allowed'), { allow: 'POST, OPTIONS' });
  }

  const token = extractToken(request);
  if (!token) return httpJson(401, rpcError(null, -32001, 'Falta el token de Capalot'));

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
