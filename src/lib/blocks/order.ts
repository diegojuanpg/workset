/** The list with the item at `from` lifted out and put down at `to`, everything between them
 *  shifting one place to close the gap and open the new one — what dragging a row in a list
 *  does, and what a swap does not: [1,2,3,4] with 4 dropped second is [1,4,2,3], never
 *  [1,4,3,2]. Out-of-range indices are clamped rather than throwing, since they come from a
 *  pointer travelling past the ends of the row. */
export function reordered<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(Math.min(Math.max(to, 0), next.length), 0, moved);
  return next;
}

/** The run of blocks `index` belongs to: the longest stretch sitting week to week with no empty
 *  week between them. Reordering happens inside a run because that is exactly the set of blocks
 *  whose weeks can be relaid without moving the plan in time — an empty week is a decision, and
 *  closing it to make room for a reorder would be a second edit nobody asked for. */
export function runAround(
  blocks: readonly { start: number; span: number }[],
  index: number,
): { first: number; last: number } {
  const touches = (i: number) =>
    blocks[i].start + blocks[i].span === blocks[i + 1].start;
  let first = index;
  while (first > 0 && touches(first - 1)) first--;
  let last = index;
  while (last < blocks.length - 1 && touches(last)) last++;
  return { first, last };
}

/** Whether every macrocycle in this order still holds one unbroken stretch of blocks.
 *
 *  A macro has no dates: it is drawn as a single bracket from its first block to its last. Let
 *  a block that belongs to another macro — or to none — land in the middle and the bracket
 *  covers training it has nothing to do with, which is a lie the calendar has no way to tell
 *  apart from the truth. So a reorder that would split one is refused instead. */
export function macrosIntact(order: readonly { macroId: string | null }[]): boolean {
  const closed = new Set<string>();
  let current: string | null = null;
  for (const block of order) {
    if (block.macroId === current) continue;
    if (block.macroId !== null && closed.has(block.macroId)) return false;
    if (current !== null) closed.add(current);
    current = block.macroId;
  }
  return true;
}
