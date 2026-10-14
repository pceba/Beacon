# Despliegue de Lifepp

Sin API key de Anthropic. Claude trabaja desde claude.ai (web o app del móvil) con tu
plan, a través de un conector MCP. La app calcula sola el resumen de Hoy.

```
Lifepp (Expo, móvil/web) ──sesión anónima──▶ Supabase (Postgres + RLS)
                                                   ▲
claude.ai ──MCP──▶ Edge Function lifepp-mcp ──token──┘  (funciones mcp_* en Postgres)
```

## 1. Supabase (proyecto luoqjomxnmygaaaffber)

1. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: activado.
2. **SQL Editor**, en orden:
   - `lifepp-setup.sql` (solo en un proyecto vacío: borra y recrea las tablas).
   - `supabase/migrations/20261013120000_auth_rls.sql`: RLS por usuario.
   - `supabase/migrations/20261013140000_mcp_connector.sql`: tokens del conector y funciones `mcp_*`.
   - `supabase/migrations/20261014120000_mcp_logs.sql`: agua, hábitos, comidas, entrenos, ánimo y la semana.
     Si las dos anteriores ya están aplicadas, ejecuta solo esta.
3. **Edge Functions → Deploy a new function → Via editor**: nombre `lifepp-mcp`, pegar
   `supabase/functions/lifepp-mcp/index.ts`, desplegar y, en su pestaña Settings,
   **desactivar "Verify JWT"** (Claude no manda un JWT de Supabase; la autorización es el
   token de Lifepp). Con la CLI: `npx supabase functions deploy lifepp-mcp --no-verify-jwt`.

No hace falta ningún secret.

## 2. Conectar Claude

1. En la app: **Ajustes → Conectar con Claude → Crear enlace** y copiarlo.
2. En claude.ai: **Personalizar → Conectores → Añadir conector personalizado**.
   URL = el enlace; autenticación **Sin inicio de sesión**.
3. En un chat: "+" → Conectores → activar Lifepp. Por ejemplo: "Mira mi día en Lifepp y
   apúntame las tareas de esta semana".

El enlace lleva el token dentro y funciona como una contraseña. "Crear enlace nuevo" invalida el
anterior; "Desconectar Claude" lo revoca. Si tu cuenta tiene cabeceras de petición en el
diálogo del conector, también vale la URL sin token
(`.../functions/v1/lifepp-mcp`) con la cabecera `Authorization: Bearer <token>`.

Herramientas del conector. No borra nada.

| Herramienta | Qué hace |
| --- | --- |
| `get_today` | Resumen de un día. Por defecto, hoy. |
| `get_week` | Últimos 7 días: agua, calorías, sueño, entrenos, hábitos y ánimo. Tareas con fecha en esa semana. |
| `list_tasks` | Tareas, por defecto solo las abiertas. |
| `add_tasks` | Crea tareas. Salta las abiertas con el mismo título. |
| `update_task` | Cambia título, descripción, prioridad, fecha o completada. |
| `log_water` | Suma ml a un día (1–5000 por llamada). |
| `log_habit` | Marca o desmarca un hábito que ya existe. No lo crea. |
| `log_meal` | Añade una comida. |
| `log_workout` | Añade un entreno ya hecho. |
| `log_mood` | Guarda ánimo (1–5) y, si vienen, energía y notas. |

## 3. App en el móvil (Android)

```
npm ci
npx eas login
npx eas build -p android --profile preview   # genera un .apk instalable
```

`eas.json` lleva las dos variables públicas (`EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`); van dentro del bundle por diseño. El plan gratuito de
Expo incluye builds. iOS necesita cuenta de Apple Developer.

## 4. Web (opcional)

`npm run build:web` genera `dist/` para cualquier hosting estático (Vercel, Netlify…), con
las mismas dos variables.

## Importante

- Cada instalación entra con un usuario anónimo propio. Si desinstalas la app o borras sus
  datos, ese usuario se pierde (y sus datos dejan de ser accesibles). Siguiente paso
  recomendado: vincular un email a la cuenta.
- La web y el móvil son usuarios distintos hasta que haya login con email.
- `claim_legacy_user` mueve a la cuenta las filas del UUID local antiguo; cuando todos los
  dispositivos estén actualizados: `DROP FUNCTION public.claim_legacy_user(uuid);`
