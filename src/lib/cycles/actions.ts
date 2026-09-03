"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CYCLE_COLORS,
  CYCLE_TIERS,
  DESCRIPTION_MAX,
  NAME_MAX,
  type CycleColor,
  type CycleTier,
} from "@/lib/cycles/types";

export interface CycleTypeInput {
  tier: CycleTier;
  name: string;
  description: string;
  color: CycleColor;
}

interface ActionResult {
  error?: string;
}

const SETTINGS_PATH = "/[username]/settings/programming";

/** The rules a type has to satisfy whichever way it is written. The same ones are CHECK
 *  constraints; these exist to answer with something a coach can read. */
function validate(input: CycleTypeInput): string | null {
  const name = input.name.trim();
  if (!name || name.length > NAME_MAX)
    return `Name must be between 1 and ${NAME_MAX} characters.`;
  if (input.description.trim().length > DESCRIPTION_MAX)
    return `Description must be ${DESCRIPTION_MAX} characters or fewer.`;
  if (!CYCLE_TIERS.includes(input.tier)) return "Unknown cycle tier.";
  if (!CYCLE_COLORS.includes(input.color)) return "Pick a colour from the palette.";
  return null;
}

function writeError(
  where: string,
  error: { code?: string; message: string },
  tier: CycleTier,
): string {
  if (error.code === "23505") return `You already have a ${tier} called that.`;
  console.error(where, error.code, error.message);
  return "Could not save the cycle type.";
}

async function client() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createCycleType(
  input: CycleTypeInput,
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("cycle_types").insert({
    coach_id: user.id,
    tier: input.tier,
    name: input.name.trim(),
    description: input.description.trim(),
    color: input.color,
  });
  if (error) return { error: writeError("createCycleType", error, input.tier) };

  revalidatePath(SETTINGS_PATH, "page");
  return {};
}

export async function updateCycleType(
  id: string,
  input: CycleTypeInput,
): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  // No ownership check: the row's own policy already limits this to the coach's types, and
  // coach_id isn't in the update grant, so a type can't be handed to someone else.
  const { error } = await supabase
    .from("cycle_types")
    .update({
      name: input.name.trim(),
      description: input.description.trim(),
      color: input.color,
    })
    .eq("id", id);
  if (error) return { error: writeError("updateCycleType", error, input.tier) };

  revalidatePath(SETTINGS_PATH, "page");
  return {};
}

/** Drops the type. Nothing points at one yet, so nothing is orphaned — once the calendar's
 *  pickers reference these, the blocks that used it keep their name and lose their colour. */
export async function deleteCycleType(id: string): Promise<ActionResult> {
  const { supabase, user } = await client();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("cycle_types").delete().eq("id", id);
  if (error) {
    console.error("deleteCycleType", error.code, error.message);
    return { error: "Could not delete the cycle type." };
  }

  revalidatePath(SETTINGS_PATH, "page");
  return {};
}
