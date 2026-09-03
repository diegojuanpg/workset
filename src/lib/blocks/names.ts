/** Naming a block or a macro inside the group that has to keep its names apart.
 *
 *  One rule decides who wins a clash: **the app renumbers a name it wrote itself, and never
 *  touches a name the coach typed.** Picking a cycle type, dragging a block into a macro and
 *  undoing a delete are all the app writing a name, so they count up out of the way. A name
 *  typed into a field comes back as an error instead — the coach chose it, and silently
 *  changing it would hide that the plan now says something they didn't ask for.
 */

/** Case-folded, ends trimmed. What the unique indexes compare, and what "the same name" means
 *  everywhere above them. A double space inside a name is left alone: it makes a different
 *  name, which is the coach's business. */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** The name without its trailing number: "Competition 1" is a numbered "Competition". Used so
 *  renumbering a clash counts on from the base rather than stacking another digit onto it. A
 *  name that is only a number keeps itself — "1" has no base to fall back to. */
export function baseName(name: string): string {
  const stripped = name.trim().replace(/\s+\d+$/, "").trim();
  return stripped || name.trim();
}

/** The next name in a series: the highest number already taken, plus one.
 *
 *  Gaps are never filled. Deleting "Volume 2" leaves "Volume 1" and "Volume 3" where they are
 *  and the next pick is "Volume 4" — a coach reading the plan a month later should be able to
 *  trust that two blocks numbered the same are the same block, and reusing 2 breaks that. */
export function numberedName(base: string, taken: readonly string[]): string {
  const stem = baseName(base);
  const suffix = new RegExp(
    `^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)$`,
    "i",
  );
  const highest = taken.reduce((max, name) => {
    const found = name.trim().match(suffix);
    return found ? Math.max(max, Number(found[1])) : max;
  }, 0);
  return `${stem} ${highest + 1}`;
}

/** The name to write when the app is the one naming something: `desired` if the group has room
 *  for it, and the next number in its series if not. */
export function freeName(desired: string, taken: readonly string[]): string {
  const want = desired.trim();
  const used = new Set(taken.map(nameKey));
  return used.has(nameKey(want)) ? numberedName(want, taken) : want;
}
