---
target: year calendar + create block
total_score: 22
p0_count: 2
p1_count: 2
timestamp: 2026-08-14T10-30-59Z
slug: src-components-calendar-year-calendar-tsx
---
Method: dual-agent (A: design review · B: detector + static evidence)

## Design Health Score — 22/40

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Drag feedback is excellent; a refused drop is silent (`if (!d || !d.valid) return;`) |
| 2 | Match system / real world | 3 | Macro/meso/micro fits the coach's frame; `MICRO_DEFAULT = "A"` means nothing; `DAY_TITLE` is es-ES in an en-US app |
| 3 | User control and freedom | 2 | Undo exists only for block delete — not move, resize, macro delete, or a cleared micro |
| 4 | Consistency and standards | 2 | `destructive-action-modal.tsx:84` says "type the project name"; three destructive actions, three different gates |
| 5 | Error prevention | 3 | Strong in the modal (`overlaps()`, `min`, `MAX_WEEKS`); weak on the grid — a range can be painted across occupied weeks |
| 6 | Recognition rather than recall | 1 | Four write gestures (double-click, right-click, 8px grips, hover bracket), zero affordances |
| 7 | Flexibility and efficiency | 1 | No keyboard shortcuts, no duplicate block, no template, no jump-to-today |
| 8 | Aesthetic and minimalist design | 4 | Genuinely above bar |
| 9 | Error recovery | 3 | Macro-drag refusal is best-in-class; block drop is silent |
| 10 | Help and documentation | 0 | No empty state, no legend, no hint — while sibling pages all use `EmptyState` |

## Anti-Patterns Verdict

Deterministic scan: exit 0, zero findings across the detector's 44 slop rules, on `src/components/calendar/*` and on `ui/{modal,input,date-field}`. Caveat from Assessment B: those rules target marketing-page visual clichés, not app a11y or interaction correctness.

LLM assessment: not slop — the inverse failure. The constants (`COLUMN_PX = 34.43`, `MATRIX_TOP = 69`, `MACRO_ABOVE`) come from measuring a real thing, breaking it and fixing it. The diagnosis is an over-refined visual layer over an undiscoverable interaction layer. Machine tells: comment density, and the placeholder-shaped `Macro N` / micro `"A"` defaults.

Browser overlays: none. Chrome DevTools MCP points at a nonexistent binary path; the alternative browser tool required a step unavailable to a subagent. `curl` confirmed `/…/planning` → `307 /login`. All findings are static-code-only; no runtime verification.

## What's Working

1. The refused macro drag (`refuses()` + red bracket that keeps tracking the pointer) answers "why won't this move" during the gesture, in domain language. The model the block drag should copy.
2. The `aria-hidden` row-reservation spacers: grid rows only exist where something is placed, so the first block would grow the card 32px under the pointer at the moment of the drop.
3. `PAST_VEIL` as `bg-[var(--ds-background-100)]/60` — a grey scrim raises luminance on a dark UI; washing toward the card background is the only correct answer.

## Priority Issues

### [P0] Creation and editing have no discoverable entry point
Double-click sits on a bare div; Edit/Delete only behind right-click; resize grips are 8px spans; the bracket only appears on hover. A coach who never right-clicks can create blocks and nothing else.
Fix: `DotsMenu` on the block bar (already used in three other components); a ghost bar on empty week hover reusing the proven `MICRO_GHOST` treatment; an empty state with one line of copy and a two-item legend.
Suggested command: /impeccable onboard

### [P0] Keyboard cannot perform a single write
The move grip is a real focusable `<button aria-label="Move …">` that is inert on Enter/Space. ContextMenu items are `div role="menuitem"` with no tabIndex.
Fix: make the bar focusable with Enter opening `BlockModal` — the modal path is already fully keyboard-operable, so that one change recovers create/edit/delete. Then arrow-key nudging on the grip and roving focus in ContextMenu.
Suggested command: /impeccable audit

### [P1] A refused block drop says nothing
Both the overlap and past-week cases snap back in silence, while the bracket drag does the right thing eight functions down.
Fix: compute `reason` alongside `valid` in the `drop` memo, tint the bar red during the drag, toast on refused release.

### [P1] Delete ceremony is inverted and the copy is wrong
`destructive-action-modal.tsx` hardcodes "the project name" and asserts "cannot be undone" while the handler returns an Undo toast; `BlockModal`'s Delete has no confirmation; `deleteMacrocycle` has neither confirmation nor undo.
Fix: delete the block immediately with the existing Undo toast; give the macro an Undo; take the noun from the caller.
Suggested command: /impeccable clarify

### [P2] An armed range is an invisible modal state that any click commits
`onCommit` is bound to window mousedown with no target check and calls preventDefault, so clicking New block, a year chevron or the sidebar is swallowed.
Fix: restrict to `closest("[data-week]")`, cancel otherwise; show "Click to finish · Esc to cancel" in the header row.

## Persona Red Flags

Coach with 25 athletes: no duplicate/template — the same 4-week block across 25 lifters is 25 trips through the modal. ~26 of 53 weeks visible, so a 20-week macro never shows both ends. `scrollIntoView` on `[today, year]` discards the week they were studying, with no jump-to-today. A success toast on every drag.

First-time coach: the micro `+` writes "A" to the database on first click; typing "Deload" leaves "d", one round-trip per keystroke. `Macro N` is placeholder-shaped and the rename target is a 24px bracket you have to guess is clickable.

Keyboard / AT user: 371 role-less divs, no table/grid semantics, no row or column headers. Per-cell description is a `title` in es-ES. `role="separator"` on resize handles. Every micro `+` is in the tab order — 40 planned weeks is 40 invisible stops. Focus ring on the micro chip is a 1px `focus:` border. Colour-only meaning throughout (red meet, blue today, veil past, red bracket).

## Minor Observations

- Overlap warning prints raw ISO dates beside a line reading "Ends Sunday, 29 March".
- The weeks input turns red out of range but never states the 52 limit.
- `startMacro` names off `macros.length + 1`, so deleting Macro 1 then creating another yields a second Macro 2.
- `title` is the only long-name affordance on bars and brackets.
- No `prefers-reduced-motion` anywhere in `src/`.

## Questions to Consider

1. Why is there a 7-row day matrix at all? 371 cells to place ~3 markers a year, when every write path operates on whole weeks.
2. A microcycle is one character. Whose vocabulary fits in one character — and is `slice(-1)` a design decision or a schema decision that leaked upward?
3. Right-click is the only route to Edit and Delete. How would you ever learn about the coaches who never find it?
4. Moving a block is instant and un-undoable; deleting one makes you type its name and then offers Undo. Which one actually destroys an afternoon of work?
