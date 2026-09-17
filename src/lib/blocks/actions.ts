"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fromISODate, startsInPastWeek, weekCount } from "@/lib/blocks/weeks";
import { freeName } from "@/lib/blocks/names";

export interface TrainingBlockInput {
  athleteId: string;
  name: string;
  startsOn: string;
  endsOn: string;
  /** The cycle type the coach picked, or null for a block named in free text. Only the tint
   *  and the picker's own selection read it — the name is copied into `name` when the type is
   *  picked, so renaming or deleting the type later leaves the block's name alone.
   *
   *  Three states, not two, and the difference matters on update: absent means "don't touch
   *  it", null means "clear it". A drag sends dates and a name and nothing else, and it must
   *  not cost the block its type on the way past. */
  typeId?: string | null;
  /** Number the name out of the way instead of refusing it. Set only where the app is the one
   *  naming the block — undoing a delete writes back a name the coach never retyped, and a
   *  failed Undo is worse than a block that comes back as "Competition 2". A name typed into
   *  the form never sets this: it comes back as an error, so the coach sees what happened. */
  autoRename?: boolean;
}

interface ActionResult {
  error?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLANNING_PATH = "/[username]/athletes/[id]/planning";

/** The rules a block has to satisfy whichever way it is written. The whole-week ones are also
 *  table constraints; these exist to answer with something a coach can read. */
/** Whole days from one yyyy-mm-dd to another, signed. Used to tell a move (both ends travel
 *  the same distance) from a resize, the same test the table's own trigger makes. */
function daysApart(to: string, from: string): number {
  return Math.round(
    (fromISODate(to).getTime() - fromISODate(from).getTime()) / 86_400_000,
  );
}

function validate(input: TrainingBlockInput): string | null {
  const name = input.name.trim();
  if (!name || name.length > 80)
    return "Name must be between 1 and 80 characters.";
  if (!ISO_DATE.test(input.startsOn) || !ISO_DATE.test(input.endsOn))
    return "Pick a start and an end date.";
  if (weekCount(fromISODate(input.startsOn), fromISODate(input.endsOn)) === null)
    return "A block must run from a Monday to a Sunday, in whole weeks.";
  // Can't be a table constraint: a CHECK has to be immutable, and this one depends on now().
  // Server clock, so it can read one week ahead of a coach late on a Sunday west of UTC —
  // that week is over for them too, so rejecting it is still the right answer.
  if (startsInPastWeek(input.startsOn, new Date()))
    return "A block can't start in a week that has already passed.";
  return null;
}

/** Postgres codes the coach can actually trigger; anything else is ours to fix. */
function writeError(
  where: string,
  error: { code?: string; message: string },
): string {
  if (error.code === "23P01") return "That overlaps a block already on the plan.";
  // Two unique indexes a coach can trip, and which one it was decides which group they have
  // to look in. Matched on the index name, which Postgres puts in the message.
  if (error.code === "23505")
    return error.message.includes("loose")
      ? "You already have a block with this name outside a macrocycle."
      : "That macrocycle already has a block with this name.";
  console.error(where, error.code, error.message);
  return "Could not save the block.";
}

/** Every name already taken in the group a block would land in: its macrocycle, or the
 *  athlete's loose blocks when it has none. `except` drops the block itself, so a block being
 *  moved never counts as its own clash. */
async function namesInGroup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
  macroId: string | null,
  except?: string,
): Promise<string[]> {
  const query = supabase.from("training_blocks").select("id, name");
  const { data } = await (macroId
    ? query.eq("macro_id", macroId)
    : query.eq("athlete_id", athleteId).is("macro_id", null));
  return (data ?? []).filter((b) => b.id !== except).map((b) => b.name);
}

/** Every macro name the athlete already has. */
async function macroNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  athleteId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("macrocycles")
    .select("name")
    .eq("athlete_id", athleteId);
  return (data ?? []).map((m) => m.name);
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createTrainingBlock(
  input: TrainingBlockInput,
): Promise<ActionResult & { id?: string }> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  // The athlete is coach-scoped by its own RLS, so reading it back is what authorises the write.
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("id", input.athleteId)
    .maybeSingle();
  if (!athlete) return { error: "Athlete not found." };

  // A block is always born loose, so the group it has to be unique in is the athlete's
  // unfiled blocks. Only consulted when the caller asked for it — otherwise the index decides
  // and the coach gets a sentence back.
  const name = input.autoRename
    ? freeName(input.name, await namesInGroup(supabase, input.athleteId, null))
    : input.name.trim();

  // The id comes back so a caller can hang things off the new block — undoing a delete has to
  // put its microcycles back, and they can only be addressed by the block they belong to.
  const { data: block, error } = await supabase
    .from("training_blocks")
    .insert({
      athlete_id: input.athleteId,
      name,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      type_id: input.typeId ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: writeError("createTrainingBlock", error) };

  revalidatePath(PLANNING_PATH, "page");
  return { id: block?.id };
}

export async function updateTrainingBlock(
  id: string,
  input: TrainingBlockInput,
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  // A resize that leaves a labelled week outside the block is a deletion: the trigger on the
  // table drops any microcycle the block no longer covers. Refused rather than performed —
  // dragging an edge one column too far shouldn't quietly cost a week of planning, and the
  // coach can clear the week first if that is what they meant. Every path in — the drag, the
  // arrow keys, this dialog — lands here, so the rule is enforced once.
  //
  // Only a resize is checked. A move takes its weeks with it: both ends travel the same
  // distance and the trigger carries every label along, so the labels sitting outside the
  // block's new range at this moment are exactly the ones about to be moved into it.
  const { data: before } = await supabase
    .from("training_blocks")
    .select("starts_on, ends_on")
    .eq("id", id)
    .maybeSingle();
  const shift = before && daysApart(input.startsOn, before.starts_on);
  const moving = shift !== null && shift !== 0 && shift === daysApart(input.endsOn, before!.ends_on);
  if (before && !moving) {
    // Read through RLS, so a block that isn't theirs simply comes back empty.
    const { data: dropped } = await supabase
      .from("microcycles")
      .select("starts_on")
      .eq("block_id", id)
      .or(`starts_on.lt.${input.startsOn},starts_on.gt.${input.endsOn}`);
    if (dropped && dropped.length > 0) {
      const n = dropped.length;
      return {
        error: `That would drop ${n} planned ${n === 1 ? "week" : "weeks"}. Clear ${n === 1 ? "it" : "them"} first.`,
      };
    }
  }

  // No athlete check: the row's own policy already limits this to blocks the coach owns, and
  // athlete_id isn't in the update grant, so the block can't be moved to someone else's lifter.
  const { error } = await supabase
    .from("training_blocks")
    .update({
      name: input.name.trim(),
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      // Only when the caller said something about it. `in` rather than a null check: null is
      // a real instruction here — the coach picked "No type" — and has to reach the column.
      ...("typeId" in input ? { type_id: input.typeId ?? null } : {}),
    })
    .eq("id", id);
  if (error) return { error: writeError("updateTrainingBlock", error) };

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

/** Lays a run of blocks out in a new order, keeping every length and the week the run already
 *  started on — dragging the third block onto the first leaves 3, 1, 2 over the same weeks.
 *
 *  One RPC rather than an update per block: they cross each other's weeks on the way, and the
 *  no-overlap constraint refuses the first step even though the finished arrangement is legal.
 *  The function defers that check to the end of its own transaction. */
export async function reorderTrainingBlocks(
  orderedIds: string[],
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };
  if (orderedIds.length < 2) return {};

  // Read back through RLS: a block belonging to another coach simply isn't returned, so a
  // short list is the answer to "you don't own all of these".
  const { data: rows } = await supabase
    .from("training_blocks")
    .select("id, starts_on")
    .in("id", orderedIds);
  if (!rows || rows.length !== orderedIds.length) {
    return { error: "Those blocks are no longer on the plan." };
  }

  // The run keeps its first week, so nothing is pushed into the past that wasn't already
  // there — but a run that starts in a spent week can't be rearranged at all, the same rule
  // the drag and the dialog apply to a single block.
  const anchor = rows.reduce(
    (first, r) => (r.starts_on < first ? r.starts_on : first),
    rows[0].starts_on,
  );
  if (startsInPastWeek(anchor, new Date())) {
    return { error: "A block can't start in a week that has already passed." };
  }

  const { error } = await supabase.rpc("reorder_training_blocks", {
    ids: orderedIds,
  });
  if (error) return { error: writeError("reorderTrainingBlocks", error) };

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

/** Starts a macrocycle over one block. The macro has no dates, so the block it is created
 *  around is what gives it a place on the calendar — a macro with no blocks would be a name
 *  with nowhere to sit, which is why the two writes are undone together. */
export async function createMacrocycle(
  athleteId: string,
  blockId: string,
  name: string,
  typeId: string | null = null,
  autoRename = false,
): Promise<ActionResult & { id?: string }> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };
  if (!name.trim() || name.trim().length > 80)
    return { error: "Name must be between 1 and 80 characters." };

  // Coach-scoped by its own RLS, so reading it back is what authorises the write.
  const { data: athlete } = await supabase
    .from("athletes")
    .select("id")
    .eq("id", athleteId)
    .maybeSingle();
  if (!athlete) return { error: "Athlete not found." };

  // A macro's group is the athlete. Same split as a block: undo renames its way back in,
  // a name typed into the dialog comes back as an error.
  const macroName = autoRename
    ? freeName(name, await macroNames(supabase, athleteId))
    : name.trim();

  const { data: macro, error } = await supabase
    .from("macrocycles")
    .insert({ athlete_id: athleteId, name: macroName, type_id: typeId })
    .select("id")
    .single();
  if (error || !macro) {
    if (error?.code === "23505")
      return { error: "You already have a macrocycle with this name." };
    console.error("createMacrocycle", error?.code, error?.message);
    return { error: "Could not create the macrocycle." };
  }

  const assigned = await setBlockMacrocycle(blockId, macro.id);
  if (assigned.error) {
    // No transaction across two calls, so the macro is rolled back by hand rather than left
    // behind as a name attached to nothing.
    await supabase.from("macrocycles").delete().eq("id", macro.id);
    return assigned;
  }

  return { id: macro.id };
}

export async function renameMacrocycle(
  id: string,
  name: string,
  typeId: string | null = null,
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };
  if (!name.trim() || name.trim().length > 80)
    return { error: "Name must be between 1 and 80 characters." };

  const { error } = await supabase
    .from("macrocycles")
    .update({ name: name.trim(), type_id: typeId })
    .eq("id", id);
  if (error) {
    // Typed by the coach, so it is answered rather than worked around.
    if (error.code === "23505")
      return { error: "You already have a macrocycle with this name." };
    console.error("renameMacrocycle", error.code, error.message);
    return { error: "Could not rename the macrocycle." };
  }

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

/** Drops the macro. Its blocks stay: the foreign key sets their macro_id back to null. */
export async function deleteMacrocycle(id: string): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("macrocycles").delete().eq("id", id);
  if (error) {
    console.error("deleteMacrocycle", error.code, error.message);
    return { error: "Could not delete the macrocycle." };
  }

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

/** Adds a block to a macro, or takes it out with null. The composite foreign key refuses a
 *  macro belonging to a different athlete, and the unique index refuses a duplicate name
 *  inside the macro — both come back as a sentence through writeError. Emptying the macro
 *  this way drops it too, since a macro with no blocks has nowhere to be drawn. */
export async function setBlockMacrocycle(
  blockId: string,
  macroId: string | null,
): Promise<ActionResult & { renamedTo?: string }> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const { data: before } = await supabase
    .from("training_blocks")
    .select("macro_id, athlete_id, name")
    .eq("id", blockId)
    .maybeSingle();
  if (!before) return { error: "Block not found." };

  // Changing group means being renamed if the new one already holds this name. The app is
  // doing the naming here — nobody typed anything, they dragged a bar — so it counts the name
  // up out of the way rather than refusing the drag. Runs in both directions and between
  // macros: leaving a macro lands the block in the loose group, which can clash just as well.
  const name = freeName(
    before.name,
    await namesInGroup(supabase, before.athlete_id, macroId, blockId),
  );

  const { error } = await supabase
    .from("training_blocks")
    .update({ macro_id: macroId, name })
    .eq("id", blockId);
  if (error) return { error: writeError("setBlockMacrocycle", error) };

  const left = before?.macro_id;
  if (left && left !== macroId) {
    const { count } = await supabase
      .from("training_blocks")
      .select("id", { count: "exact", head: true })
      .eq("macro_id", left);
    if (count === 0) await supabase.from("macrocycles").delete().eq("id", left);
  }

  revalidatePath(PLANNING_PATH, "page");
  // Only when it actually changed: the caller says so in the toast, and "renamed to the name
  // it already had" is a sentence nobody should have to read.
  return name === before.name.trim() ? {} : { renamedTo: name };
}

/** Writes the label on one week of a block, creating the microcycle if that week had none.
 *  RLS reaches the row through its block, so a block the coach doesn't own simply matches
 *  nothing rather than being denied. */
export async function setMicrocycle(
  blockId: string,
  startsOn: string,
  label: string,
  typeId: string | null = null,
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };
  if (!ISO_DATE.test(startsOn)) return { error: "Pick a week." };
  if ([...label].length !== 1) return { error: "A label is one character." };

  const { error } = await supabase
    .from("microcycles")
    .upsert(
      { block_id: blockId, starts_on: startsOn, label, type_id: typeId },
      { onConflict: "block_id,starts_on" },
    );
  if (error) {
    console.error("setMicrocycle", error.code, error.message);
    return { error: "Could not save the microcycle." };
  }

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

export async function deleteMicrocycle(id: string): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("microcycles").delete().eq("id", id);
  if (error) {
    console.error("deleteMicrocycle", error.code, error.message);
    return { error: "Could not delete the microcycle." };
  }

  revalidatePath(PLANNING_PATH, "page");
  return {};
}

export async function deleteTrainingBlock(id: string): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("training_blocks").delete().eq("id", id);
  if (error) {
    console.error("deleteTrainingBlock", error.code, error.message);
    return { error: "Could not delete the block." };
  }

  revalidatePath(PLANNING_PATH, "page");
  return {};
}
