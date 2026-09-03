"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ActionResult {
  error?: string;
}

interface InviteResult extends ActionResult {
  token?: string;
}

async function requireCoach() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function validName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 64 ? trimmed : null;
}

function validLast(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.length <= 64 ? trimmed : null;
}

export async function createAthlete(
  firstName: string,
  lastName: string
): Promise<InviteResult> {
  const { supabase, user } = await requireCoach();
  const first = validName(firstName);
  if (!first) return { error: "First name must be between 1 and 64 characters." };
  const last = validLast(lastName);

  const { data, error } = await supabase
    .from("athletes")
    .insert({ coach_id: user.id, first_name: first, last_name: last })
    .select("invite_token")
    .single();
  if (error || !data) return { error: "Could not add athlete." };
  revalidatePath("/", "layout");
  return { token: data.invite_token };
}

export async function renameAthlete(
  id: string,
  firstName: string,
  lastName: string
): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const first = validName(firstName);
  if (!first) return { error: "First name must be between 1 and 64 characters." };
  const last = validLast(lastName);

  const { error } = await supabase
    .from("athletes")
    .update({ first_name: first, last_name: last })
    .eq("id", id)
    .eq("coach_id", user.id);
  if (error) return { error: "Could not rename athlete." };
  revalidatePath("/", "layout");
  return {};
}

// Fresh single-use token + 7-day expiry. Used when the old link expired or leaked.
export async function regenerateInvite(id: string): Promise<InviteResult> {
  const { supabase, user } = await requireCoach();
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("athletes")
    .update({
      invite_token: token,
      invite_status: "pending",
      invite_expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    })
    .eq("id", id)
    .eq("coach_id", user.id)
    .neq("invite_status", "claimed");
  if (error) return { error: "Could not regenerate the invite." };
  revalidatePath("/", "layout");
  return { token };
}

export async function deleteAthlete(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const { error } = await supabase
    .from("athletes")
    .delete()
    .eq("id", id)
    .eq("coach_id", user.id);
  if (error) return { error: "Could not remove athlete." };
  revalidatePath("/", "layout");
  return {};
}

export async function setAthletePlanned(id: string, planned: boolean): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const { error } = await supabase
    .from("athletes")
    .update({ planned })
    .eq("id", id)
    .eq("coach_id", user.id);
  if (error) return { error: "Could not update athlete." };
  revalidatePath("/", "layout");
  return {};
}

export async function resetAllPlanned(): Promise<ActionResult> {
  const { supabase, user } = await requireCoach();
  const { error } = await supabase
    .from("athletes")
    .update({ planned: false })
    .eq("coach_id", user.id);
  if (error) return { error: "Could not reset." };
  revalidatePath("/", "layout");
  return {};
}
