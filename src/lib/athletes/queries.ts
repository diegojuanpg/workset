import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Shared per-request so the athlete layout and its pages hit the DB once. */
export const getAthlete = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("id, first_name, last_name, planned, athlete_id, invite_status")
    .eq("id", id)
    .single();
  return data;
});
