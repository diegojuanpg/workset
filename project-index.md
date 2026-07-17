# Workset — Project Index

Mapa del proyecto: qué existe, dónde vive y cómo funciona. Se actualiza en el mismo commit que agrega o cambia una feature.

## Stack

Next.js 16 (App Router, Turbopack) + React 19 + TypeScript strict. Tailwind v4 con el design system Geist (tokens `--ds-*` en `src/app/geist-*.css`). Supabase como backend (auth + Postgres + storage) vía `@supabase/ssr`. pnpm, Vitest.

- `pnpm dev` — dev server en `localhost:3000`
- `pnpm check` — lint + typecheck + build (correr antes de commitear)
- Supabase local: `pnpm exec supabase start` (necesita Docker). Studio en `localhost:54323`, mails capturados en Mailpit `localhost:54324`, API en `localhost:54321`.

## Auth

Sistema passwordless completo (spec: `/home/diego/Projects/eva01/Features.md`). Dos métodos: código OTP de 6 dígitos por email, o Google OAuth. No existen contraseñas.

### Pantallas

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/login` | `src/app/login/page.tsx` | Email primero + divider + Google. Footer de términos (12px, estilo v0). Logo en círculo de 80px arriba del título. |
| `/signup` | `src/app/signup/page.tsx` | Card `material-small` de 550px estilo Vercel: Google primero, "Continue with Email →" despliega el form. |
| (paso código) | dentro de `auth-form.tsx` | "Check your email" + 6 cajitas de dígitos. Auto-verifica al sexto dígito. Cooldown de reenvío visible (60s). |
| `/onboarding` | `src/app/onboarding/page.tsx` | Post-registro obligatorio: avatar (opcional, círculo clickeable), display name (pre-cargado desde Google si existe), username con chequeo de disponibilidad en vivo. |
| `/{username}` | `src/app/[username]/page.tsx` | Dashboard personal. Si visitás el de otro usuario: 404 estilo Vercel ("You are logged in as {email}" + botón para cambiar de cuenta). |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Intercambia el code de Google OAuth por sesión. |

### Componentes y lógica

- `src/components/auth/auth-form.tsx` — cliente; maneja los 3 estados (email → código → verificado). `signInWithOtp` con `shouldCreateUser: true/false` distingue signup de login (login con email desconocido da error "no account found"). `verifyOtp` al completar el código.
- `src/components/auth/onboarding-form.tsx` — cliente; disponibilidad de username con debounce 300ms contra la RPC `username_available` (spinner → check verde / cruz roja en el suffix del Input), preview de avatar, submit vía server action.
- `src/components/auth/auth-header.tsx` — header compartido: mark + botón Sign Up/Log In/Log Out según pantalla.
- `src/app/onboarding/actions.ts` — server action `completeOnboarding`: valida auth + datos, sube avatar a Storage (`avatars/{uid}/avatar`), **upsert** del perfil (self-heal si la fila falta), redirect a `/{username}`.
- `src/lib/auth/actions.ts` — server action `signOut`.
- `src/lib/auth/username.ts` — regex de username (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, máx 48), sugerencia estilo Vercel (`email-local-part-1234`).
- `src/lib/avatar.ts` — avatar generado determinístico: grilla 6×6 de píxeles interpolando 2 colores de una paleta de 8, todo derivado del hash del user id. Data URI, sin storage.
- `src/proxy.ts` — middleware (Next 16 lo llama proxy): refresca la sesión en cada request, redirige sin-sesión → `/login`, y logueado en `/login|/signup` → `/`.
- `src/app/page.tsx` — `/` solo enruta: perfil incompleto → `/onboarding`, completo → `/{username}`.

### Datos (Supabase)

- `supabase/migrations/20260716000000_auth_profiles.sql` — todo el schema:
  - `profiles` (id FK a `auth.users`, username unique con constraint de formato y reservados, display_name, avatar_url). Fila creada por trigger `on_auth_user_created` al registrarse; username/display_name quedan NULL hasta el onboarding.
  - `reserved_usernames` — rutas de la app que nadie puede tomar (`login`, `coach`, `workset`, etc.).
  - RPC `username_available(candidate)` — security definer, para el chequeo en vivo.
  - RLS estricto: cada usuario solo ve/edita su propia fila. Grants por columna explícitos (el Supabase nuevo no otorga nada por defecto).
  - Bucket `avatars` público para lectura; escritura solo en la carpeta del propio uid.
- `src/lib/supabase/` — clientes tipados (`client.ts` browser, `server.ts` server components/actions) + `types.ts` generado (`supabase gen types`).

### Config de Supabase (`supabase/config.toml`)

- OTP: 6 dígitos, expira a los **5 minutos** (`otp_expiry = 300`), reenvío con cooldown de 60s (`max_frequency`), pedir código nuevo invalida el anterior (default), rate limit de verificación 30 intentos/5min.
- Templates de mail (`supabase/templates/otp.html`): estilo Vercel — código en el subject, mark pixelado dibujado con celdas de tabla, caja gris con el código. Subject distinto para signup y login.
- Google OAuth: `[auth.external.google]` habilitado, credenciales en `.env.local` (`SUPABASE_AUTH_EXTERNAL_GOOGLE_*`). Redirect URIs registradas en Google Cloud Console para local y cloud.

### Flujos

1. **Signup con email**: `/signup` → email → Supabase manda código (local: Mailpit) → 6 dígitos → sesión + trigger crea perfil vacío → `/` → `/onboarding` → completa datos → `/{username}`.
2. **Login**: igual pero `shouldCreateUser: false` — email desconocido no manda mail, muestra error.
3. **Google**: botón → consent de Google → `/auth/callback` → sesión (si el email ya existía, Supabase linkea la identidad) → mismo camino de onboarding si el perfil está incompleto.
4. **Sesión persistente**: refresh tokens; el OTP solo se pide en dispositivos nuevos o tras logout.

### Pendiente (ver `eva01/Project X/Tasks.md`)

- Producción: dominio → Resend SMTP → `db push` + config remota + deploy Vercel + mail custom con IP/ubicación.
- Legal: contenido de `/terms` y `/privacy` (los links del login ya existen).
- Futuro: settings (editar perfil), roles coach/atleta.

## Design system

Skill `geist-design-system` (obligatoria para UI). Componentes copiados en `src/components/ui/`: Button, Input, Spinner, Note, Avatar. Íconos Geist en `src/components/icons.tsx` (LogoGoogle, ArrowRight, CheckCircle, CrossCircle, Camera + `WorksetMark` custom de la marca). Solo tokens `--ds-*`/semánticos, tipografía `text-heading-*`/`text-copy-*`/`text-label-*`, superficies `material-*`.
