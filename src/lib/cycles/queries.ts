import { createClient } from "@/lib/supabase/server";
import type { CycleType, CycleTier } from "@/lib/cycles/types";

/** Every cycle type the signed-in coach owns, in one read. The three tiers share a table, so
 *  the settings page and the calendar's pickers all want the same rows — grouping them here
 *  costs one pass and saves three round trips. */
export async function getCycleTypes(): Promise<Record<CycleTier, CycleType[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cycle_types")
    .select("id, tier, name, description, color")
    .order("name");

  const grouped: Record<CycleTier, CycleType[]> = {
    macro: [],
    meso: [],
    micro: [],
  };
  for (const row of data ?? []) {
    // The CHECK constraints narrow these; the generated types only know they are text.
    const type = row as CycleType;
    grouped[type.tier]?.push(type);
  }
  return grouped;
}
