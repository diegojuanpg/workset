"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CompetitionEntryInput {
  athleteId: string;
  ageCategory: string;
  weightClass: string;
  /** yyyy-mm-dd, or "" for the meet's first day. One day only — an athlete lifts once. */
  competesOn: string;
}

export interface CompetitionInput {
  name: string;
  location: string;
  startsOn: string;
  endsOn: string;
  type: string;
  federation: string;
  ageCategories: string[];
  entries: CompetitionEntryInput[];
}

interface ActionResult {
  error?: string;
}

async function requireCoach() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface CompetitionRow {
  name: string;
  location: string | null;
  starts_on: string;
  ends_on: string;
  type: string;
  federation: string;
  age_categories: string[];
}

function validate(input: CompetitionInput): { error: string } | { row: CompetitionRow } {
  const name = input.name.trim();
  if (!name || name.length > 120) return { error: "Name must be between 1 and 120 characters." };
  const location = input.location.trim().slice(0, 120) || null;
  if (!ISO_DATE.test(input.startsOn) || Number.isNaN(Date.parse(input.startsOn)))
    return { error: "Pick a start date." };
  if (!ISO_DATE.test(input.endsOn) || Number.isNaN(Date.parse(input.endsOn)))
    return { error: "Pick an end date." };
  if (input.endsOn < input.startsOn) return { error: "The end date can't be before the start date." };
  if (!input.type.trim()) return { error: "Pick a competition type." };
  if (!input.federation.trim()) return { error: "Pick a federation." };
  const ageCategories = input.ageCategories
    .map((c) => c.trim())
    .filter((c) => c && c.length <= 48);
  // Can't be a table CHECK — the meet's dates live on the other table — so it is enforced here.
  if (
    input.entries.some(
      (e) => e.competesOn && (e.competesOn < input.startsOn || e.competesOn > input.endsOn),
    )
  )
    return { error: "An athlete's competition day falls outside the meet." };
  return {
    row: {
      name,
      location,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      type: input.type.trim(),
      federation: input.federation.trim(),
      age_categories: ageCategories,
    },
  };
}

/** Replace-all: entries are few and the modal always submits the complete set. */
async function replaceEntries(
  supabase: Awaited<ReturnType<typeof requireCoach>>["supabase"],
  competitionId: string,
  entries: CompetitionEntryInput[]
) {
  await supabase.from("competition_athletes").delete().eq("competition_id", competitionId);
  if (entries.length === 0) return null;
  const { error } = await supabase.from("competition_athletes").insert(
    entries.map((e) => ({
      competition_id: competitionId,
      athlete_id: e.athleteId,
      age_category: e.ageCategory.trim() || null,
      weight_class: e.weightClass.trim() || null,
      competes_on: e.competesOn || null,
    }))
  );
  return error;
}

export async function createCompetition(input: CompetitionInput): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const parsed = validate(input);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("competitions")
    .insert({ coach_id: user.id, ...parsed.row })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not create the competition." };

  if (await replaceEntries(supabase, data.id, input.entries))
    return { error: "Competition saved, but the athletes could not be entered." };

  revalidatePath("/", "layout");
  return {};
}

export async function updateCompetition(
  id: string,
  input: CompetitionInput
): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const parsed = validate(input);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("competitions")
    .update(parsed.row)
    .eq("id", id)
    .eq("coach_id", user.id);
  if (error) return { error: "Could not save the competition." };

  if (await replaceEntries(supabase, id, input.entries))
    return { error: "Competition saved, but the athletes could not be entered." };

  revalidatePath("/", "layout");
  return {};
}

export async function deleteCompetition(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const { error } = await supabase
    .from("competitions")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id);
  if (error) return { error: "Could not delete the competition." };
  revalidatePath("/", "layout");
  return {};
}
