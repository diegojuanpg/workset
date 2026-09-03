import { createClient } from "@/lib/supabase/server";

export interface TrainingBlock {
  id: string;
  name: string;
  /** yyyy-mm-dd, always a Monday. */
  startsOn: string;
  /** yyyy-mm-dd, always a Sunday. */
  endsOn: string;
  /** The macrocycle this block belongs to, if a coach has grouped it into one. */
  macroId: string | null;
  /** The cycle type behind it, if the coach picked one. Null is the ordinary case for a block
   *  named in free text, and for every block that predates the vocabulary. */
  typeId: string | null;
}

/** A macrocycle: a name over a run of consecutive blocks. It has no dates of its own — its
 *  span is whatever its blocks span, which is why it can never cover an empty week. */
export interface Macrocycle {
  id: string;
  name: string;
  typeId: string | null;
}

/** One week of a block, labelled with what kind of week it is. */
export interface Microcycle {
  id: string;
  blockId: string;
  /** yyyy-mm-dd, the Monday of the week it covers. */
  startsOn: string;
  /** A single character, for now. */
  label: string;
  typeId: string | null;
}

/** Every microcycle of one athlete, reached through their blocks. */
export async function getAthleteMicros(
  athleteId: string,
): Promise<Microcycle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("microcycles")
    // The join is a filter, not a projection: !inner drops micros whose block belongs to
    // someone else, which is what scopes the read to this athlete.
    .select(
      "id, block_id, starts_on, label, type_id, training_blocks!inner(athlete_id)",
    )
    .eq("training_blocks.athlete_id", athleteId);

  return (data ?? []).map((m) => ({
    id: m.id,
    blockId: m.block_id,
    startsOn: m.starts_on,
    label: m.label,
    typeId: m.type_id,
  }));
}

/** Every macro of one athlete. The calendar pairs them with the blocks that point at them. */
export async function getAthleteMacros(
  athleteId: string,
): Promise<Macrocycle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("macrocycles")
    .select("id, name, type_id")
    .eq("athlete_id", athleteId)
    .order("created_at");

  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    typeId: m.type_id,
  }));
}

/** Every block of one athlete, in calendar order. Not filtered by year: the calendar
 *  navigates years client-side, and a coach's whole plan is a handful of rows. */
export async function getAthleteBlocks(
  athleteId: string,
): Promise<TrainingBlock[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("training_blocks")
    .select("id, name, starts_on, ends_on, macro_id, type_id")
    .eq("athlete_id", athleteId)
    .order("starts_on");

  return (data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    startsOn: b.starts_on,
    endsOn: b.ends_on,
    macroId: b.macro_id,
    typeId: b.type_id,
  }));
}
