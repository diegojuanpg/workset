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
| `/{username}` | `src/app/[username]/page.tsx` | Dashboard personal (placeholder). Guardias de auth/onboarding/namespace viven en el layout del segmento. |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Intercambia el code de Google OAuth por sesión. |

### Componentes y lógica

- `src/components/auth/auth-form.tsx` — cliente; maneja los 3 estados (email → código → verificado). `signInWithOtp` con `shouldCreateUser: true/false` distingue signup de login (login con email desconocido da error "no account found"). `verifyOtp` al completar el código.
- `src/components/auth/onboarding-form.tsx` — cliente; disponibilidad de username con debounce 300ms contra la RPC `username_available` (spinner → check verde / cruz roja en el suffix del Input), preview de avatar, submit vía server action.
- `src/components/auth/auth-header.tsx` — header compartido: mark + botón Sign Up/Log In/Log Out según pantalla.
- `src/app/onboarding/actions.ts` — server action `completeOnboarding`: valida auth + datos, sube avatar a Storage (`avatars/{uid}/avatar`), **upsert** del perfil (self-heal si la fila falta), redirect a `/{username}`.
- `src/lib/auth/actions.ts` — server action `signOut`.
- `src/lib/auth/username.ts` — regex de username (`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, máx 48), sugerencia estilo Vercel (`email-local-part-1234`).
- `src/lib/avatar.ts` — avatar generado determinístico: grilla 6×6 de píxeles interpolando 2 colores de una paleta de 8, todo derivado del hash del user id. Data URI, sin storage.
- `src/proxy.ts` — middleware (Next 16 lo llama proxy): refresca la sesión en cada request. `/home` y `/join` son públicos; sin sesión: `/` → `/home`, resto → `/login`; logueado en `/login|/signup` → `/`.
- `src/app/page.tsx` — `/` solo enruta: sin sesión → `/home`; cookie `pending_invite` → `/join/{token}` (retoma un claim); atleta (membresía + no coach) → `/athlete[/onboarding]`; coach con perfil incompleto → `/onboarding`; coach completo → `/{username}`.

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

## Cuentas de atleta (coach ↔ atleta)

Modelo **dual-rol**: un usuario puede ser coach y/o atleta a la vez — no es un `role`, son capacidades derivadas de datos (`profiles.is_coach` + existencia de fila en `athlete_profiles`). Mismo auth passwordless que el coach; el atleta entra la primera vez por un **link de invitación single-use**, después loguea normal por `/login`.

### Modelo

- El coach agrega un atleta con nombre temporal (nombre + apellido) → crea una fila de **membresía** en `athletes` con `invite_token` (pendiente, `athlete_id` NULL).
- El coach copia el link `/join/{token}` y lo manda por su medio (sin mail automático — no hay dominio/Resend aún).
- El atleta abre el link → auth (código o Google) → reclama el token → completa sus datos deportivos.
- **Many-to-many**: un atleta puede tener varios coaches; cada coach = una fila `athletes` distinta apuntando al mismo `athlete_id`.

### Rutas

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/join/{token}` | `src/app/join/[token]/route.ts` | Handler del claim. Sin sesión: guarda el token en cookie `pending_invite` y manda a `/signup`. Con sesión: llama `claim_invitation`, limpia la cookie, redirige a onboarding/`/athlete` o a `/join?error=`. |
| `/join` | `src/app/join/page.tsx` | Página de error del invite (expirado / usado / propio roster). |
| `/athlete/onboarding` | `src/app/athlete/onboarding/page.tsx` + `actions.ts` | Ventana de datos del atleta (obligatoria post-claim si falta `athlete_profiles`). |
| `/athlete` | `src/app/athlete/page.tsx` | Landing placeholder ("You're all set"). La vista real de entrenamiento es fase futura. |

### Flujo de claim

Sin sesión abre `/join/{token}` → cookie `pending_invite` + `/signup` → autentica (código/Google) → cae en `/` → `/` lee la cookie → `/join/{token}` (ya logueado) → RPC `claim_invitation` linkea `athlete_id` → limpia cookie → `/athlete/onboarding` (o `/athlete` si ya tenía perfil). Un coach que abre su propio link recibe error `self_coach`; reclamar un token ya usado por uno mismo es idempotente.

### Componentes y lógica

- `src/lib/athletes/actions.ts` — `createAthlete(first, last)` inserta el stub y **devuelve el `invite_token`** para mostrar el link; `regenerateInvite(id)` genera token nuevo + expiry (para links vencidos/filtrados); `renameAthlete` ahora con first/last.
- `src/lib/athletes/name.ts` — `athleteName(first, last)` = display combinado para el roster.
- `src/components/panel/athlete-roster.tsx` — "Add athlete" pide nombre + apellido y muestra el link para copiar (`InviteLinkModal`); filas pendientes muestran "Invitation pending" y un ⋯ → "Copy invite link".
- `src/components/athlete/athlete-onboarding-form.tsx` — cliente; todo con componentes DS: avatar, nombre/apellido (pre-cargados del stub), fecha nac (`DateField`), sexo (`Switch` sin default — fuerza elegir), unidades métrico/imperial (`Switch` que cambia el input de altura), teléfono opcional (`PhoneInput` con bandera + código de país).

### Datos (`supabase/migrations/20260721000000_athlete_accounts.sql`)

- `profiles` +`first_name`/`last_name` (nombre estructurado para todos), +`is_coach` (bool, lo setea el onboarding de coach), +`unit_preference` (`metric|imperial`).
- `athlete_profiles` (1:1 con profiles): `birth_date`, `sex` (`male|female`), `height_cm` (canónico), `phone` opcional. RLS: dueño = el atleta (write); coach linkeado = read-only.
- `athletes` reestructurada a membresía: +`athlete_id` (NULL = pendiente), `first_name`/`last_name` (placeholder del coach) reemplazan `name`, `label`, `invite_token`/`invite_status`/`invite_expires_at`/`claimed_at`. `unique(coach_id, athlete_id)`.
- RPC `claim_invitation(token)` — security definer (escribe `athlete_id` en fila del coach, saltando RLS): valida token/expiry (**7 días**, single-use), bloquea self-coach, idempotente si ya está linkeado.

### Unidades

Regla: **guardar canónico, mostrar convertido**. Altura siempre en `cm` en la DB; `profiles.unit_preference` decide cómo se ingresa/muestra. El onboarding con imperial convierte ft/in → cm al guardar.

### Pendiente de esta feature

- Vista real del atleta (dashboard desktop), switcher coach↔atleta (UI, `localStorage workset:mode`), settings del atleta (editar sus datos), opt-in "yo también entreno" (activar `is_coach` desde settings), coach-view del atleta usando el nombre real del profile (la policy de lectura ya existe).

## Left side panel

Layout persistente del área logueada (spec: `eva01/Features.md` § Left side panel). Desktop only esta fase.

### Rutas

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/home` | `src/app/home/page.tsx` | Landing pública, vacía por ahora (estilo Vercel: la landing vive en /home). |
| `/{username}/*` | `src/app/[username]/layout.tsx` | Layout del segmento: valida auth/onboarding, fetch de perfil + atletas en `Promise.all`, 404 estilo Vercel en namespace ajeno (sin panel), y envuelve todo en `PanelShell`. |
| `/{username}/messages\|library` | `src/app/[username]/<sección>/page.tsx` | Placeholders con `EmptyState`. |
| `/{username}/settings/*` | `src/app/[username]/settings/` | Sección de settings (ver § Settings). Se entra desde la tuerca del menú de usuario. |
| `/{username}/competitions` | `src/app/[username]/competitions/page.tsx` | Sección de competencias (ver § Competitions). |
| `/{username}/athletes/{id}` | `src/app/[username]/athletes/[id]/page.tsx` | Dashboard del atleta — en blanco (nombre + "Week: —"). `layout.tsx` del segmento valida el atleta (`notFound()`) para todas las sub-páginas. |
| `/{username}/athletes/{id}/planning` | `src/app/[username]/athletes/[id]/planning/page.tsx` | Monta el `YearCalendar` (ver § Year Calendar). |
| `/{username}/athletes/{id}/nutrition\|meet-plan\|billing` | `src/app/[username]/athletes/[id]/<sección>/page.tsx` | Secciones del atleta, placeholders `EmptyState`; se navegan desde el breadcrumb de la top bar. |

### Componentes (`src/components/panel/`)

- `panel-shell.tsx` — cliente; sidebar colapsable y **redimensionable** estilo Vercel (localStorage `workset:panel-collapsed` + `workset:panel-width`): columna sticky `--ds-background-200`, drag del borde con ancho en vivo (240–400px, límites medidos de Vercel; soltar <120 colapsa, colapso instantáneo sin animación), chevron circular on-hover (delay 150ms) sobre el borde, o botón del header del panel. Top bar permanente de 48px: "Open sidebar" + separador cuando está colapsado; en páginas de atleta, breadcrumb `⚪ Nombre / Sección ⌄` (crumb display + dropdown DotsMenu con check para Dashboard/Planning/Nutrition/Meet Plan/Billing).
- `side-panel.tsx` — contenido del panel: header (mark + botón hide), nav de secciones (Dashboard/Messages/Library/Competitions, activo por `usePathname`), separador, roster, footer con menú de usuario. Bajo `/{username}/settings/*` el panel **se transforma** (estilo Vercel): header y footer quedan, y el medio pasa a fila "‹ Settings" (vuelve al dashboard) + nav de settings sin íconos; el separador y el roster no se montan. Es un swap de array (`SECTIONS` / `SETTINGS_SECTIONS`) sobre el mismo `.map`, no un layout aparte. El flag `exact` distingue la entrada raíz de cada nav (Dashboard, Account) para que no quede activa sobre sus hijas.
- `athlete-find.tsx` — clon CDP-medido del "Find" de Vercel: `FindOverlay` (panel 384px `material-modal` que morphea desde el rect del trigger; solo la superficie escala, contenido hace fade; al cerrar el trigger juega el FLIP inverso; resultados con avatar pixelado, highlight deslizante `transform 100ms`, ↑↓/Enter navega, Esc/backdrop cierra) + trigger `AthleteFind` (search del roster, tecla F — no filtra el roster).
- `athlete-roster.tsx` — v2 diferenciado de Efort: search delegado a `AthleteFind`, header quieto: badge pill "n/m planned" solo (sin label suelto, sin barra de progreso), menú ⋯ único estilo team-switcher, anclado a la fila, ancho auto (w-max) pudiendo desbordar el panel (secciones Filter y Sort con check / Reset planning con confirmación / footer "Add athlete" con ＋ y sublabel; ⋯ resaltado con filtro activo), filas: nombre + subtítulo "Week: —" (o "Invitation pending" si el atleta no reclamó su cuenta) + dots menu on-hover (Copy invite link si pendiente / Rename / Remove) + checkbox planned a la derecha (`useOptimistic`), modales alta (con link de invitación, ver § Cuentas de atleta)/rename/remove. Lista dentro de `Scroller` (fade dinámico en los bordes al scrollear, estilo Vercel). Sin avatares ni pips (ruido con muchos atletas; el avatar vive en la página del atleta).
- `user-menu.tsx` — footer estilo Vercel: avatar + username a la izquierda; a la derecha botón circular ⋯ (abre el dropdown) y campanita de notificaciones (deshabilitada, fase futura). Dropdown custom con `useDismissable`: username/email + tuerca → settings, Feedback deshabilitado, Theme (`ThemeSwitcher` triple), Home Page → `/home`, Log Out, "Upgrade to Pro" visual.
- `src/lib/athletes/actions.ts` — server actions con auth validada: `createAthlete`, `renameAthlete`, `deleteAthlete`, `setAthletePlanned`, `resetAllPlanned`. Revalidan con `revalidatePath("/", "layout")`.
- `src/lib/athletes/queries.ts` — `getAthlete(id)` envuelto en `cache()` de React: layout y páginas del atleta comparten una sola query por request.

### Datos

- `supabase/migrations/20260717000000_athletes.sql` — tabla `athletes` (`id`, `coach_id` FK profiles, `name` 1–64, `planned` bool, timestamps), índice en `coach_id`, trigger `updated_at`, grants por columna, RLS coach-only. El atleta es solo una fila del coach — invitaciones/cuenta real quedan para la fase de roles.

### Pendiente de esta feature

- Condiciones de filtrado del roster, mobile (drawer), backend de Feedback, billing del Upgrade, contenido real de las secciones, week real (sistema de bloques).

## Settings

Sección propia con navegación en el panel (§ Left side panel). Dos secciones por ahora; la lista vive en `SETTINGS_SECTIONS` de `side-panel.tsx` y los títulos de la top bar en `SECTION_TITLES` de `panel-shell.tsx` — agregar una sección es una ruta nueva más una línea en cada uno.

### Rutas

| Ruta | Archivo | Qué hace |
|---|---|---|
| `/{username}/settings` | `src/app/[username]/settings/page.tsx` | Account. Server: relee el perfil y monta `AccountSettings`. |
| `/{username}/settings/programming` | `src/app/[username]/settings/programming/page.tsx` | Las tres tablas de tipos de ciclo (My Macrocycles / Mesocycles / Microcycles). Un solo `getCycleTypes()` para las tres. |

### Componentes y lógica

- `src/components/settings/account-settings.tsx` — cliente. Cuatro `Fieldset` (el card de settings del DS: título, subtítulo, contenido y footer con hint + acción): Display Name, Username (prefix `workset.app/`), Avatar y Email (solo lectura — el mail viene del proveedor de auth). Cada card es su propio `<form>` con su propio `useActionState` sobre la **misma** action, así un error se muestra donde pasó en vez de en las cuatro. El avatar no tiene botón Save: elegir archivo hace `requestSubmit()` y muestra preview optimista con `URL.createObjectURL`.
- `src/components/settings/cycle-types-table.tsx` — cliente. **Un solo componente** parametrizado por `tier` para las tres tablas: cambia el copy y si existen las columnas Color/Preview (los macros se dibujan como bracket gris — no hay dónde poner color). Filas con `Table` del DS, menú ⋯ por fila (Edit / Delete), modal único para alta y edición (difieren solo en qué action llama Save), borrado con `DestructiveActionModal`. Picker de color = 8 puntos, no un color wheel. El **preview es el chip real**: importa `BLOCK_BAR`/`MICRO_CHIP` de `src/components/calendar/chips.ts`, las mismas clases que pinta el calendario, más el fill de `CHIP_CLASS`.
- `src/lib/cycles/types.ts` — paleta (`CYCLE_COLORS`, 8 escalas Geist), límites (`NAME_MAX` 40, `DESCRIPTION_MAX` 120), los mapas `CHIP_CLASS`/`DOT_CLASS` escritos a mano (Tailwind no arma una clase desde un string en runtime), `microLabel(name)` (inicial en mayúscula, spread de array para no partir un par astral — el CHECK cuenta caracteres) y `nextTypeName(base, taken)` (numera siempre desde 1 y cuenta por encima de lo existente; borrar "Volume 2" no libera el 2). Cubierto en `types.test.ts`.
- `src/lib/cycles/actions.ts` — `createCycleType` / `updateCycleType` / `deleteCycleType`, auth validada, `23505` → "You already have a ‹tier› called that". `coach_id` no está en el grant de update, así que un tipo no se puede regalar.
- `src/lib/cycles/queries.ts` — `getCycleTypes()`: una lectura, agrupada por tier.
- `src/app/[username]/settings/actions.ts` — `updateProfile` (auth validada). Arma el patch **solo con las claves presentes** en el `FormData`, de modo que un card no puede blanquear un campo que no muestra. Reusa `isValidUsername`/`USERNAME_RULES` del onboarding y su misma subida a storage `avatars/{uid}/avatar`, agregando `?v=<timestamp>` a la URL pública (el path es fijo: sin cache-bust el browser sigue sirviendo el avatar viejo). Mapea `23505` → username tomado y `23514` → reservado. `revalidatePath("/", "layout")` porque el panel lee el perfil en el layout del namespace; si cambió el username **redirige** a `/{nuevo}/settings` — el username es el namespace y quedarse cae en el 404 de namespace ajeno.

### Datos del reordenamiento (`supabase/migrations/20260823000000_reorder_training_blocks.sql`)

- `training_blocks_no_overlap` pasó a `deferrable initially immediate`: cada escritura normal — el arrastre, el diálogo de Edit, un insert — sigue siendo rechazada apenas se solapa, y solo la función de abajo pide que el chequeo espere.
- `reorder_training_blocks(ids uuid[])` — acuesta los bloques uno detrás de otro en el orden dado, arrancando en el `min(starts_on)` de ellos, así el tramo no se mueve en el tiempo: solo cambia qué pasa cuándo. Va en una función porque los bloques se cruzan las semanas en el camino y la restricción rechazaría el primer paso aunque el arreglo final sea válido. `security invoker`: la policy del coach decide qué filas toca. Cada bloque conserva su largo, y mover los dos extremos la misma distancia es lo que `microcycles_follow_block` lee como mudanza, así que los micros viajan con su bloque.
- `reorderTrainingBlocks(orderedIds)` en `src/lib/blocks/actions.ts` valida auth, relee por RLS (una lista corta significa "no son todos tuyos") y rechaza si la primera semana del tramo ya pasó.

### Datos (`supabase/migrations/20260822000000_cycle_types.sql`)

- `cycle_types` — **una tabla para los tres tiers**, no tres: se diferencian solo en qué columnas muestran, y separarlas triplicaba policies, grants y actions para ahorrar una columna sin usar. Columnas: `coach_id` FK profiles, `tier` (`macro|meso|micro`), `name` 1–40 (más corto que los 80 de un block: el nombre se copia al block y se numera), `description` ≤120 not null default `''`, `color` de las 8 escalas Geist (se guarda el **nombre de escala**, no un hex — es lo que deja que un color renderice bien en ambos temas). Único `(coach_id, tier, name)`: el mismo nombre en otro tier es válido (un "Deload" meso y un "Deload" micro son cosas distintas). RLS de propiedad directa (no hay atleta en el medio).
- Todavía **nada apunta a un tipo**: el picker en el calendario (elegir tipo al crear block/micro, numerado "Volume 1"/"Volume 2", y el color en la barra) es el paso siguiente, y agrega el FK a `training_blocks`/`microcycles`.

El resto de settings no necesita migración: los grants y policies de `profiles` (`update (id, username, display_name, avatar_url)`) y las policies de storage de avatars ya vienen de `20260716000000_auth_profiles.sql`.

### Pendiente de esta feature

- Wiring del picker de tipos en el calendario (ver § Datos). Cambio de email/contraseña y borrado de cuenta (necesitan flujo de confirmación de Supabase auth). Chequeo de disponibilidad de username en vivo — acá alcanza con el error de la unique.

## Competitions

Meets del coach + qué atletas compiten en cada uno (spec: `eva01/Features.md` § Competitions Section). Privadas por coach, sin catálogo compartido.

### Componentes y lógica

- `src/app/[username]/competitions/page.tsx` — server: una sola llamada a `getCompetitionsPageData()`, pasa datos al cliente.
- `src/lib/competitions/queries.ts` — `getCompetitionsPageData()`: `Promise.all` de competencias (con entries embebidas), roster y `athlete_profiles`. El sexo se mapea aparte porque `athletes → profiles → athlete_profiles` no tiene FK directa y PostgREST no puede embeberla.
- `src/lib/competitions/actions.ts` — server actions con auth validada: `createCompetition`, `updateCompetition`, `deleteCompetition`. Las entries se reemplazan enteras en cada guardado (delete + insert): el modal siempre manda el set completo y son pocas.
- `src/lib/competitions/federations.ts` — listas semilla IPF/WRPF/IPL (categorías de edad + weight classes por sexo) y tipos de evento. Se guardan como texto libre en la DB para que la futura pestaña Settings las haga editables por coach sin migración. `weightClassGroups(federation, sex)` devuelve un solo grupo si se conoce el sexo, y ambos etiquetados si no (atleta con invitación pendiente = sin `athlete_profiles`).
- `src/lib/competitions/dates.ts` — `phaseOf` (upcoming/ongoing/past), `weeksOut` (semanas enteras hacia arriba: la semana del meet es 1; null una vez empezado; redondea días antes de dividir para no romperse con DST) y `formatRange`. Tests en `dates.test.ts`.
- `src/components/competitions/competitions-view.tsx` — cliente, layout clonado de la lista de Deployments de Vercel: toolbar con `border-b` (search por nombre/lugar + filtro Upcoming/Past/All + "New competition") y filas full-bleed separadas por `border-b`, con hover. Columnas en orden: nombre (con logo de federación + lugar debajo), estado + fase + "nw out", federación (`Badge` con variant de marca por federación — gradiente diagonal 135deg sampleado del logo, `ipf`/`ipl`/`wrpf` en `badge.tsx` junto a `trial`/`turbo`; sin variant propia cae a `gray-subtle`). Logos reales sin fondo en `public/federations/{ipf,ipl,wrpf}-mark.png` (`FEDERATION_LOGOS`, mismo archivo), `Badge` del tipo, age class (`Badge` con `ageClassLabel`: "All classes" / la categoría / "N classes"), n athletes, fecha a la derecha, ⋯ Edit/Delete. Grid con subgrid; las columnas caen con breakpoints (base = nombre/estado/fecha; `md` suma federación+tipo; `lg` suma age class+athletes). El punto de estado es un span propio: el `StatusDot` del DS es solo para el ciclo de vida de deployments y su doc pide no reusarlo. `EmptyState` cuando no hay filas. Search y filtro son estado de sesión sobre las filas ya traídas — sin round trip. Click en una fila abre `CompetitionDetail` (modal read-only en el mismo archivo): logo + nombre + lugar, estado/weeks, grilla de fecha/tipo/federación/categorías de edad (chips o "All categories") y la lista completa de atletas con su categoría de edad · clase de peso. Footer con Edit/Delete/Close. El ⋯ de la fila hace `stopPropagation` para no disparar el detalle.
- `src/components/competitions/competition-modal.tsx` — cliente: alta y edición en el mismo modal. Nombre, lugar, rango de fechas (`DateField`; la fecha de fin se pega a la de inicio hasta que el coach la mueva), tipo, federación, chips de **categorías de edad del meet** (multi; vacío = todas) y lista del roster con checkbox + selects de categoría de edad/peso por atleta. El dropdown de edad por atleta se limita a las categorías elegidas del meet (o todas las de la federación si no se eligió ninguna). Cambiar de federación limpia categorías y picks.

### Datos (`supabase/migrations/20260722000000_competitions.sql`, `..._24000000_competition_age_categories.sql`)

- `competitions` — `id`, `coach_id` FK profiles, `name`, `location?`, `starts_on`/`ends_on` (`date`, check `ends_on >= starts_on`), `type`, `federation` (texto libre, sin enum), `age_categories text[]` (categorías de edad que corre el meet; vacío = todas), timestamps. Índice `(coach_id, starts_on)`, RLS coach-only.
- `competition_athletes` — PK `(competition_id, athlete_id)`, `age_category?`, `weight_class?`. La categoría vive acá y no en el atleta: el mismo lifter entra en clases distintas según el meet. RLS por la competencia del coach + check de que el atleta también sea suyo.

### Pendiente de esta feature

- Marcar el meet en el Year Calendar del atleta (feature siguiente) y el día concreto dentro de un rango multi-día (por ahora se marca el rango entero).
- Pestaña Settings para editar federaciones / categorías / tipos por coach.
- Vista de competencias en la página del atleta.

## Year Calendar

Vista anual del atleta, vive en Planning. Por ahora solo la grilla: sin bloques, sin marcas de competencias.

- **Reordenar** (`src/lib/blocks/order.ts`, cubierto en `order.test.ts`): `reordered(items, from, to)` es el corrimiento estilo lista que comparten bloques y micros — levantar y volver a apoyar, no intercambiar (`[1,2,3,4]` con el 4 al puesto 2 da `[1,4,2,3]`, no `[1,4,3,2]`). `runAround(blocks, i)` da el tramo de bloques que se tocan semana a semana; un hueco corta el tramo, porque cerrarlo sería una segunda edición que nadie pidió. `macrosIntact(order)` rechaza un orden que parta un macro en dos — el bracket se dibuja del primero al último bloque del macro, así que un bloque ajeno en el medio quedaría cubierto por él.
- Micros: el chip es agarrable a la vista (`cursor-grab` en hover, `cursor-grabbing` al llevarlo, sin paso de armado). El arrastre encaja en columnas enteras (`COLUMN_PX`), está clampeado al rango de su bloque y Escape lo abandona. Al soltar, `reorderMicros` reescribe **contenidos por semana** — un micro se direcciona por su semana, así que no mueve filas y no necesita transacción; solo escribe las semanas que cambiaron. Las semanas vacías son casilleros de la lista, no huecos a saltear.
- Bloques: el reordenamiento vive en el drop que antes se rechazaba. Soltar una barra encima de una vecina era lo único que el arrastre no podía hacer, y es justo el gesto que significa "poné esta ahí" — si `reorderRun` no lo toma, sigue rechazando con el toast de siempre. Reempaca el tramo entero desde la semana en que ya arrancaba, con update optimista sobre `placed` y Undo.
- `src/components/calendar/micro-picker.tsx` — elegir el micro de una semana desde el vocabulario del coach. Dropdown portalado sobre `useAnchoredPopover` con métricas del `Menu` de Geist (panel `p-2` de 256px, filas de 40px, radio 6px) y el keyframe propio `animate-dots-menu-in`. Campo de búsqueda arriba separado por divisor sangrado; escribir filtra por substring y Enter toma la fila activa, así que "i" + Enter es una semana de Intro sin mover el puntero. Cada fila lleva a la izquierda el chip real que va a quedar estampado — letra de `microLabel()` sobre el color de `fillFor()`. Lista con tope de 256px y `scrollIntoView({block:"nearest"})` sobre la fila activa. El focus del campo se engancha al `placed` del hook y corre sin array de dependencias con guarda de `activeElement`: `visibility: hidden` durante la medición hacía que `focus()` fuera un no-op (por eso el hook ahora oculta con `opacity: 0`).
- `src/components/calendar/chips.ts` — `BLOCK_BAR` y `MICRO_CHIP` **sin color**: el calendario y el preview de los tipos de ciclo pintan las mismas clases (el preview solo es honesto si es el chip real, no un parecido), y cada uno le suma el fill de `CHIP_CLASS`. Hoy ambos usan `CHIP_CLASS.gray` — ningún block ni micro tiene tipo todavía.
- `src/components/calendar/year-calendar.tsx` — cliente. Una sola CSS grid: **columnas = semanas ISO** (1..52/53), **filas = M T W T F S S**, celda = día del mes. Escala tipográfica **medida por CDP sobre el Calendar real de `vercel.com/geist/calendar`**, no del port del skill (que difiere): día = el `span` de Geist clonado clase por clase (`block size-8 rounded-[4px] border border-transparent text-center text-[14px] leading-[30px] font-normal` — el leading de 30px sobre la caja de 32 con borde de 1px es lo que centra el dígito; con flex + leading 20 no queda igual), columnas fijas de **34.43px** (el chip de 32 + 2.43 de aire del `td`) con el chip `justify-self-center`, filas con pitch de **40px** (`gap-y-2` sobre chips de 32, = el `my-2` del `tr`), labels de eje `text-xs` (12px/18px) peso normal uppercase — letras M–S en `--ds-gray-1000`, números de semana en `--ds-gray-900`, caption del año `text-sm font-medium --ds-gray-1000`, y sobre la grilla el mismo seteo tipográfico de vercel.com (`font-feature-settings: "calt" 0, "rlig", "ss11"`, `font-synthesis: style small-caps` — sin peso sintetizado — y `text-rendering: optimizeLegibility`). Tonos: los nombres de mes llevan el énfasis (todos en `--ds-gray-1000`) y los días se sientan atrás en gris (`--ds-gray-900`, los de enero del año siguiente un paso más apagados en `--ds-gray-700`). Sin alternancia por mes y sin distinción de fin de semana (Geist sí la hace; acá se descartó). Legibilidad de la celda sin dibujar grilla: el hover revela el chip (`--ds-gray-alpha-200` + `transition-colors`, el `day_button` de Geist). En reposo no hay ningún fondo — el fin de semana se distingue solo por el tono del texto, como en Geist. Ancho fijo ⇒ la grilla mide ~1825px y **siempre scrollea horizontal** (decisión explícita: fidelidad a Geist por sobre que entre el año completo), dentro del `Scroller` en eje X con `fadeStart={false}`: se desvanece solo el borde derecho, porque la máscara del izquierdo borraría la columna sticky. El auto-scroll a hoy usa `scrollIntoView({ block: "nearest", inline: "center" })`, así no necesita ref al viewport del `Scroller`. superficie `material-menu` (= `rounded-[12px]` + `--ds-shadow-menu`, idéntico al popover medido), sin `tabular-nums` (el real usa cifras proporcionales). Hoy = chip liso `bg-[var(--ds-blue-900)]` + `text-[var(--ds-background-100)]`, igual que el día "Today" real. El anillo que a veces se le ve en el picker (`shadow-[0_0_0_1px_...,0_0_0_2.5px_...]`) es el del día con foco, no el marcador: al mover el foco a otro día la clase desaparece. Días fuera del año = `--ds-gray-700 opacity-40` (el `outside` del port). Nav `‹ año ›` = `Button` ghost `icon-sm` con `rounded-full` y `--ds-gray-700` → `--ds-gray-1000` en hover (así es el nav medido). Ritmo vertical también medido: filas de 32px con 8px de gap (pitch 40px), padding del contenedor 12px, fila de meses 21px (alto del caption), fila de semanas 18px (alto del weekday). Año en estado local (sin límites, sin URL). Fila de meses que spanea sus semanas; los nombres de mes van todos en `--ds-gray-1000` y los días en gris, sin bandas ni divisores. Columna de labels M–S sticky. `minmax(20px, 1fr)`: el año entero entra en pantallas grandes y scrollea horizontal en las chicas (scrollbar fino, mismo estilo que `Scroller`). Al montar, el scroll se centra en la semana de hoy (si el año no es el actual, vuelve al principio). `today` se resuelve post-hydration: server y browser pueden estar en días distintos. Desktop-only por ahora.
- `src/lib/calendar/year.ts` — `isoWeeksInYear` (52/53), `yearWeeks(year)` (columna: `week`, `month` = mes del jueves por la regla ISO, `days` Mon..Sun) y `monthSpans` (spans del header). Los días previos al 1 de enero van `null` (en blanco: son del calendario del año anterior); la última semana **sí** muestra sus días de enero del año siguiente, atenuados. Tests en `year.test.ts`.

### Pendiente de esta feature

- Bloques de entrenamiento (barras arrastrables debajo de la grilla) y las barras de fase/meet.
- Marcar competencias del atleta en la grilla.
- Mobile.

## Design system

Skill `geist-design-system` (obligatoria para UI). Componentes copiados en `src/components/ui/`: Button, Input, Spinner, Note, Modal, DotsMenu, Checkbox, SearchInput, EmptyState, Fieldset (card de settings: título/subtítulo/contenido + footer con hint y acciones), Table (el fuente del skill no spreadea `...props` sobre el `<table>` — agregado, era la causa de un warning de lint), ThemeSwitcher, Badge (único retoque sobre el fuente del skill: el `props as any` de la rama `href` pasó a `React.ComponentPropsWithoutRef<"a">` — el proyecto prohíbe `any`), Scroller (máscara de desvanecido en el borde clipeado + scrollbar fino; `axis="y"` por defecto, `axis="x"` para el Year Calendar, y `fadeStart={false}` para no borrar un header sticky), Select (native estilado), Switch (segmented multi-opción; copiado sin la rama de Tooltip que no usamos, y con el layout pasado de flex a grid `auto-cols-fr` — con `flex-1` sobre contenedor `w-fit` el label más largo se comprimía hasta desbordar la caja), Calendar (range picker DS; su `CalendarGrid` interno se exporta para reusar la grilla). Composiciones propias sobre primitivos DS: `date-field.tsx` (DateField — single-date en popover con `CalendarGrid` + `captionLayout="dropdown"` mes/año, fechas futuras deshabilitadas), `phone-input.tsx` (PhoneInput estilo intl-tel-input/Vercel — campo unificado con bandera + caret adentro a la izquierda que abre dropdown de países (US/UK pinned + alfabético) y número inline; la bandera se autodetecta del código de discado tipeado (`+54` → 🇦🇷); emite el string completo). `cn()` extiende tailwind-merge para que la escala tipográfica Geist (`text-copy-*`, `text-label-*`, …) cuente como font-size y no la pise `text-foreground` (regresión cubierta en `src/lib/utils.test.ts`). Íconos Geist en `src/components/icons.tsx` (LogoGoogle, ArrowRight, CheckCircle, CrossCircle, Camera, GridSquare, Message, BookOpen, Flag, SettingsGear, FaceSmile, Home, Logout, Plus, SidebarLeft, Filter, Calendar, ChevronDown/Left/Right, Clock, Location, Users + `WorksetMark` custom de la marca). npm: `react-day-picker` (v9, pineado — el DS Calendar usa su API v9). Solo tokens `--ds-*`/semánticos, tipografía `text-heading-*`/`text-copy-*`/`text-label-*`, superficies `material-*`.
