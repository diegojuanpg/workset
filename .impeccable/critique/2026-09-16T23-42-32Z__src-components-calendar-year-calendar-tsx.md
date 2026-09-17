---
target: year calendar
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-09-16T23-42-32Z
slug: src-components-calendar-year-calendar-tsx
---
Method: dual-agent (A: design review + live browser · B: detector + static evidence + tests)

## Design Health Score — 21/40

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | The block the planner is editing carries no mark on the calendar: after blur, `outline: none`, no fill change, no `aria-selected`/`aria-current` |
| 2 | Match system / real world | 3 | Three date formats on one surface: `Sep 21 – Nov 8, 2026` (planner), `21/09/2026` (modal), `2026-09-21` (bar's accessible name, `:2301`) |
| 3 | User control and freedom | 2 | Undo lives only in a toast measured at 4.29s; no Ctrl+Z; one-click Delete takes every microcycle with it |
| 4 | Consistency and standards | 2 | A refused *move* turns the bar red mid-gesture (`REFUSED_BAR:214`); a refused *draw* looks identical to a valid one until release |
| 5 | Error prevention | 2 | Overlap and past-week are checked live (`draftRefusal:596`) but the only feedback is the absence of a silhouette |
| 6 | Recognition rather than recall | 1 | Nothing on the calendar states a block's dates; zero `aria-keyshortcuts`; no shortcut help anywhere |
| 7 | Flexibility and efficiency | 3 | A real power layer exists — copy/paste a macro with its micros, reorder-by-collision, wheel scroll, edge autoscroll — and none of it is discoverable |
| 8 | Aesthetic and minimalist design | 3 | Disciplined Geist fidelity, but an untyped block bar is 1.19:1 against the card while its own micro chip is saturated |
| 9 | Error recovery | 2 | Messages state rules, never routes; the toast lands 570px from the gesture and leaves in 4.3s |
| 10 | Help and documentation | 1 | The only instructional text is the empty state, and it teaches a gesture that is impossible on touch |
| **Total** | | **21/40** | **Needs work** |

## Design Specificity Verdict

**The information model is authored for a strength coach. The composition and visual language are not.**

Authored: 53 ISO week columns × 7 weekday rows (the week is the unit of periodization, not the month); three tiers under one column set — macro bracket / block bar / micro chip — which *is* macro→meso→micro drawn as geometry; blocks snapping to whole Monday–Sunday weeks; "8 weeks out from IPF World Championships" in the words a lifter uses; `startsInPastWeek` as a training rule; a 4-week default offer because a plan grows a mesocycle at a time (`:219`).

Not authored:
- **The plan itself is a stock Gantt.** Grey pill, grip icon, name, dashed ghosts, bracket. Rename "Peak I" to "Sprint 14" and this is a Linear roadmap. A block encodes exactly one training attribute — its type colour — and by default it encodes none.
- **The meet is inert.** Nov 7 is one red square among 371. A block grown to Sep 21 – Nov 8 swallowed the IPF Worlds date and the calendar said nothing.
- **The proportions invert the product.** Header + day matrix = 357px of a 464px card; the plan rows get 104px. Three-quarters of the signature surface is a date axis. A coach never plans on a Thursday.

**Deterministic scan.** `detect.mjs` ran on four targets: `year-calendar.tsx` clean (`[]`), `empty-state.tsx` clean, `src/components/calendar` and `planning-view.tsx` each returned the same single advisory — `design-system-font-size` at `planning-view.tsx:138` (`text-[10px]`, off the DESIGN.md ramp of 32/24/16/14/12). One advisory, zero errors, across the whole surface. Read that as *the rule set does not cover this surface* rather than *this surface is clean*: the detector hunts marketing-page clichés and has nothing to grip on a 53-week data grid. Everything substantive below is invisible to it.

Static evidence, verified mechanically: zero hardcoded hex in the calendar, zero `dark:` overrides in `calendar/*` (the only ones are the documented `CHIP_CLASS` exception), zero lucide imports, zero fixed widths that break a narrow viewport. Tests: 80/80 pass in 8 files.

**Visual overlays.** Not available this run — Assessment A held the browser for live inspection, so the detector overlay was not injected. No user-visible overlay exists; the browser evidence in this report is direct inspection, not an overlay pass.

## Overall Impression

The engineering under this surface is better than the design on top of it. Gestures, collision handling and the copy/paste layer are genuinely sophisticated, and the single best thing in the product — `dropRefusal`, which counts the planned weeks a drag would destroy and refuses instead of performing — is the model everything else should follow.

What holds it back is a systematic pattern: **the surface knows things it never says.** It knows which block is selected, and doesn't mark it. It knows a range is refused mid-drag, and draws it as if it were valid. It knows the block's dates, and only says them in a modal. It knows twelve keyboard shortcuts, and documents none. The biggest opportunity isn't new features — it's making the state the code already computes visible on the card.

## What's Working

1. **`dropRefusal` (`:770-779`).** It refuses instead of performing, names the exact number of planned weeks at risk, and the same sentence serves the drag, Shift+arrow and the server, so the three can never disagree. This is how a destructive edge-drag should behave in a tool where one week is an hour of a coach's work.
2. **The month-band staircase (`:2728-2757`).** A week straddling a month boundary is split on the real day, and the band closes half the 8px row gap on each side so it reads as one month instead of a row of boxes. It resolves "which month is this column?" without a second caption and without spending any colour.
3. **Reorder-by-collision (`:930-939`, `reorderRun:1632`).** Dropping a block on its neighbour is the one drop the overlap rule must refuse, and it is exactly the gesture that means "put this one there". Turning that dead end into a relay of the whole run — with "Peak I moved to 2 of 3" and an Undo — converts the system's hardest constraint into its most useful move.

## Priority Issues

### [P0] The selected block carries no mark on the calendar
**Why it matters.** Pressing a bar loads it into the planner below. After focus leaves, the bar has `outline: none`, unchanged background and no `aria-selected`/`aria-current`. With 8–12 blocks in a year and the planner 150px below the fold, a coach editing "week 3" cannot confirm which block they are in; for a screen-reader user the pairing is unrecoverable.
**Context you should weigh:** this is the direct consequence of removing the white selection ring earlier in this session. The finding is real, but the fix is not "put it back" — it is a mark that does not read as focus.
**Fix.** `aria-current="true"` on the selected bar plus a persistent 1px `--ds-gray-1000` shadow-border, distinct from the 2px focus outline, and `aria-labelledby` from the planner heading back to the bar. `year-calendar.tsx:2292-2327`.
**Suggested command:** `/impeccable polish`

### [P1] A block's dates are never stated on the calendar
**Why it matters.** "How many weeks is this and when does it end?" is the question a coach asks every time they look at the year, and the surface refuses to answer it: the bar's `title` is its name (`:2345`), the dates live as ISO in the accessible name (`:2301`) and in the Edit modal. The only date text on the card is day digits and week numbers, 200px above across a 16px gap.
**Fix.** Put the range on the bar's own `title` ("Sep 21 – Nov 8 · 7 weeks"), and on hover/focus brighten the week-number cells the bar covers — the mechanism already exists for the drag (`draftAt`, `:2009`).
**Suggested command:** `/impeccable clarify`

### [P1] A refused draw is silent for the whole gesture
**Why it matters.** `draftRefusal` is computed live (`:596`) and its only effect is suppressing the silhouette (`:2212`), so the day band renders identically to a valid range until release, when a toast lands 570px away. A refused *move*, by contrast, outlines the bar red mid-gesture. The two gestures teach opposite lessons, and drawing is the first one a coach learns.
**Fix.** Draw the silhouette anyway, red-outlined with `REFUSED_BAR`, carrying the reason as its label instead of "6 weeks".
**Suggested command:** `/impeccable harden`

### [P1] The Undo window is 4.3s and the code assumes 8
**Why it matters.** Measured toast lifetime: 4.29s. `src/components/ui/toast.tsx` passes no `duration` and no `toast()` call sets one, so sonner's 4000ms default applies to every toast including the Undo ones — while `year-calendar.tsx:715` reasons explicitly about "the eight seconds the toast was up". Deleting a 20-week block with 20 planned microcycles is one unconfirmed click, and recovery means noticing a bottom-right message and crossing the screen inside four seconds.
**Fix.** `duration: 10000` for any toast carrying an action, and anchor the toaster bottom-centre or near the gesture. `src/components/ui/toast.tsx:12-18`.
**Suggested command:** `/impeccable harden`

### [P2] The draw gesture is impossible on touch, and the empty state teaches it anyway
**Why it matters.** Day cells compute `touch-action: auto` while bars and chips set `touch-none`, so a horizontal drag pans the scroller instead of drawing. There is no `@media (hover: none)` or `pointer: coarse` rule anywhere in `src/`, so micro offers, block offers, the macro offer, the bar's `⋯` menu and both edge grips — all `opacity-0` until hover — never appear on a phone. Meanwhile the empty state reads "Drag across the weeks above to draw one." At 400px with the sidebar open the document scrolls horizontally and the calendar card is 87px wide, which breaches DESIGN.md's Own-Scroller Rule and CLAUDE.md's mobile-first rule.
**Fix.** `touch-action: pan-y` on day cells, a `@media (hover: none)` block resting the offers at ~0.6 opacity, and a collapsing sidebar below `sm`.
**Suggested command:** `/impeccable adapt`

### [P3] Untyped block bars are invisible
**Why it matters.** `NEUTRAL_CHIP` is `rgba(0,0,0,0.08)` on the card — 1.19:1 — carrying a 12px name, under a 14px/500 month caption and beside a saturated micro chip. The default path (no mesocycle type chosen) produces the weakest mark on the card for the most important object, inverting DESIGN.md's own "el bloque es la barra sólida y coloreada".
**Fix.** Give `NEUTRAL_CHIP` a 1px `--ds-gray-alpha-500` shadow-border so an untyped bar still reads as an object. `src/lib/cycles/types.ts:57-58`.
**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Alex (impatient power user).** Every block costs a modal with a required name, despite `autoRename`/`numberedName` already being wired for the paste path (`:1199`, `:66`). No Duplicate in the bar's context menu — three items, none of them the one he wants; Ctrl+C/V does it and nothing says so. No way back to today once scrolled to December except prev-year → next-year (the Today button was removed this session at your request — this is the cost of that call). The scrollbar is hidden (`NO_SCROLLBAR:156`), removing the one control for throwing across the year. The `⋯` on a bar is `opacity-0` until hover.

**Sam (keyboard + screen reader + 200% zoom).** Every keyboard mutation is silent: Shift+ArrowRight grew a block 6→7 weeks and the only change was the `aria-label` on the already-focused element, which screen readers do not re-announce; the page's only `aria-live` region belongs to sonner. Zero `aria-keyshortcuts` for a twelve-shortcut vocabulary. The accessible name carries ISO dates. There is no keyboard path to the start edge — Shift+arrow resizes the end only, and the comment at `:1113` claims Ctrl+arrow moves the start, which it does not. The cursor changes indicator language three times down one column, and on the ghost rows "the cursor is here" and "you could add something here" are the same 30×24 dashed box. At 200% zoom, five of seven day rows are visible, the plan row is below the fold and the hidden scrollbar makes the extent of the content unknowable. Out-of-year days are `--ds-gray-700` = 3.2:1, below AA.

**Powerlifting coach planning 20 weeks to a meet.** The countdown never moves during a drag (`meetCountdown` is fixed to today, `:578`) — at the exact moment of counting backwards from Nov 7, the only number on screen is "6 weeks", not "ends 2 weeks out". Planning backwards from the meet is unsupported: the drag runs right-to-left but shows no weeks-out readout. Onboarding an in-season athlete is blocked outright — "A block can't start in a week that has already passed" means a coach picking up a lifter eight weeks into prep cannot record what already happened, and the message offers no route. Two micro types sharing an initial collapse to the same 12px letter (`microLabel`, `types.ts:72-76`), distinguished only by hue.

## Minor Observations

- Red now means three things on one card: destructive/refused, meet day (`MEET:371`), and any block or micro the coach colours red.
- The empty state says "No blocks in 2027" while the planner directly below reads "Peak I / Sep 21 – Nov 8, 2026" — two adjacent regions asserting opposite things.
- `aria-rowcount` is 9 (`:1952`) but the DOM renders 10 `role="row"` elements, and the plan row at `:2111` has no `role="gridcell"` children at all. No `aria-rowindex`/`aria-colindex` anywhere; month `columnheader`s spanning several columns carry no `aria-colspan`.
- `micro-picker.tsx` declares `role="combobox"` with `aria-expanded` and `aria-controls` but no `aria-activedescendant`, so the active row is never announced.
- `src/components/ui/modal.tsx` carries `dark:bg-[var(--ds-background-100)]` overrides — DESIGN.md's No-Dark-Override rule has exactly one documented exception and this is not it.
- The edge fade runs the full card height, washing the rightmost bar's 12px name along with day digits.
- `todayRef.scrollIntoView` depends only on `[today, year]` (`:1406`), so a resize or a phone rotation loses the view with no recentre.
- The micro ghost target is 30×24px — exactly at the WCAG 2.5.8 floor with no margin.
- `MACRO_ABOVE` is a literal `false`, so eight true-branches across `year-calendar.tsx` and `chips.tsx` are permanently unreachable.
- `EmptyStateProps` and `NEUTRAL_CHIP` have no external importer (`NEUTRAL_CHIP` is still used inside `fillFor`, so it is reachable, not dead).
- One `ponytail:` deferral in the calendar: `PLAN_ROWS` at `:170`, the hand-derived 104px the empty state depends on.

## Questions to Consider

1. If a coach never plans on a Tuesday, why do 371 day cells take 357px of a 464px card while the entire plan gets 104px? What does this surface look like if the day matrix collapses to a single week ribbon and the three plan tiers take the rest?
2. The meet is the reason the year exists, and it is one red square among 371. What if it were a vertical rule through the whole card, with every bar carrying a live "ends 2 weeks out" label while being dragged?
3. Every refusal states the rule; none offers the route. If "That would drop 3 planned weeks. Clear them first." is the best sentence in the product, why isn't every other refusal an action — a "Start it Monday 14 Sept" button in the toast — instead of a statement the coach has to translate into a second gesture?
