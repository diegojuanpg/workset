# Workset

Training planner for coaches and athletes. Full architecture spec lives outside this repo, in the private `eva01` notes workspace (`App Architecture and Organization.md`) — read it before making stack or structure decisions.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript strict
- Tailwind CSS v4 + Geist design system (tokens in `src/app/geist-*.css`)
- Supabase (`@supabase/ssr` — clients in `src/lib/supabase/`)
- Motion, @dnd-kit, TanStack Table/Virtual, Recharts, next-themes
- pnpm, Vitest (`pnpm test`), ESLint

## Commands

- `pnpm dev` — dev server
- `pnpm check` — lint + typecheck + build (run before committing)

## UI rules (MANDATORY)

- **Always use the `impeccable` skill** for any frontend design or redesign work (layout, hierarchy, polish, motion, accessibility) before/while building.
- **Always use the `geist-design-system` skill** (`~/.claude/skills/geist-design-system/`) when creating, editing, or redesigning any UI component.
- Before using a component: read its `references/<name>.md` in the skill, then copy the source from the skill's `assets/components/ui/` into `src/components/ui/` along with the internal deps the reference lists.
- Colors only via `--ds-*` tokens or semantic tokens (`bg-background`, `text-foreground`, …). Never hardcoded hex, never `dark:` overrides for token colors.
- Typography via `text-heading-*` / `text-copy-*` / `text-label-*` / `text-button-*` utilities. Surfaces via `material-*` utilities.
- Geist icons from the skill's `assets/components/icons.tsx` (grep by name — 9k lines, never read whole), not lucide.

## Project map

- `docs/project-index.md` is the living map of the codebase. Update it in the same commit that adds or changes a feature — map level only (where things live + how flows work), never duplicated code.

## Code style

- Named exports, PascalCase components, camelCase utils, 2-space indent
- No `any`; mobile-first responsive
- Server Actions must validate auth; fetch independent data with `Promise.all`
