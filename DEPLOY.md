# Despliegue de Capalot

La app (web, iOS, Android) nunca ve la clave de Anthropic. Hoy llama a la Edge Function
`claude-sync` con la sesión de Supabase; la función verifica la sesión, aplica una cuota
diaria y llama a la API con la clave guardada en los secrets de Supabase.

```
App (Expo) ──JWT──▶ Supabase Edge Function claude-sync ──x-api-key──▶ api.anthropic.com
     │                        │
     └──── PostgREST + RLS ───┴── claude_usage (cuota)
```

## 1. Supabase: auth y RLS

1. **Authentication → Sign In / Providers → Allow anonymous sign-ins**: activar.
   Cada dispositivo obtiene un usuario anónimo real (sesión persistente).
2. **SQL Editor**: ejecutar `supabase/migrations/20261013120000_auth_rls.sql`.
   - Quita las políticas abiertas y deja `user_id = auth.uid()` en todas las tablas.
   - Crea `claim_legacy_user()`: la primera vez que la app entra con sesión, mueve las
     filas del UUID local antiguo (`capalot_user_id`) a la cuenta nueva.
   - Crea `claude_usage` y `claude_usage_bump()` para la cuota.
   - Es idempotente.
3. Cuando todos tus dispositivos hayan abierto la versión nueva:
   `DROP FUNCTION public.claim_legacy_user(uuid);`

Proyecto nuevo desde cero: `capalot-setup.sql` y después la migración.

## 2. Anthropic

1. console.anthropic.com → workspace propio (`capalot-prod`) con límite de gasto mensual.
2. Crear una API key en ese workspace. No se pega en la app ni en el repo.

## 3. Edge Function

Con la CLI (`npx supabase login`, `npx supabase link --project-ref <ref>`):

```
npx supabase secrets set ANTHROPIC_API_KEY=<clave>
npx supabase functions deploy claude-sync
```

O desde el dashboard: **Edge Functions → Deploy a new function → Via editor**, nombre
`claude-sync`, pegar `supabase/functions/claude-sync/index.ts`, y **desactivar
"Verify JWT"** (la función verifica la sesión ella misma; ver `supabase/config.toml`).
La clave se añade en **Edge Functions → Secrets**.

Secrets:

| Nombre | Obligatorio | Por defecto |
|---|---|---|
| `ANTHROPIC_API_KEY` | sí | — |
| `CLAUDE_MODEL` | no | `claude-sonnet-5-5` |
| `CLAUDE_DAILY_LIMIT` | no | `10` llamadas por usuario y día (UTC) |
| `ALLOWED_ORIGINS` | no | `*` (poner el dominio web, separado por comas) |

`SUPABASE_URL` y `SUPABASE_ANON_KEY` los inyecta Supabase.

## 4. Web

```
npm ci
npm run build:web        # genera dist/
```

Hosting estático (Vercel, Netlify, EAS Hosting…): comando `npm run build:web`, carpeta
`dist`, variables `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
Después, poner ese dominio en `ALLOWED_ORIGINS`.

## 5. iOS / Android

EAS Build (`npx eas build`) con las mismas dos variables `EXPO_PUBLIC_*` en el entorno de
EAS. Antes de las tiendas:
- `ios.bundleIdentifier` y `android.package` en `app.json`.
- Privacy labels / Data safety: datos de salud, compartidos con Anthropic para el resumen.
- El envío a Claude va detrás de un interruptor en Ajustes (desactivado por defecto).
- Si se añaden cuentas con email, borrar la cuenta desde la app.

## Contrato de sincronización

- Entrada: `{ "snapshot": { date, goals, today, habits, tasks } }` (igual que antes).
- Salida: `{ "brief", "addTasks": [{ title, priority, deadline }], "used", "limit" }`.
- Errores: `{ "error", "retryAfter"? }` con 401 (sin sesión), 429 (cuota), 503 (Claude
  saturado), 502.
- Cliente: no llama si el snapshot no cambió, como mucho una vez cada 2 h dentro del día
  (salvo "Sincronizar ahora") y respeta `retryAfter` tras un error.

## Coste aproximado

Unos 800 tokens de entrada y 250 de salida por llamada (techo 700 de salida).

| Modelo | Por llamada | Por usuario y día (cuota 10) |
|---|---|---|
| Sonnet 5.5 ($2 / $10 por MTok) | ~0,004 $ | ≤ 0,10 $ (real: 0,01–0,02 $) |
| Haiku 5.5 ($0,10 / $0,50 por MTok) | ~0,0002 $ | ≤ 0,005 $ |
