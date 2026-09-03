"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUsername, USERNAME_RULES } from "@/lib/auth/username";

export interface SettingsState {
  error: string | null;
  saved?: boolean;
}

/**
 * One action behind every card on the Account page: each form posts only its own
 * fields, so the patch is built from the keys that are present and a card can never
 * blank out a field it doesn't show.
 */
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patch: {
    display_name?: string;
    username?: string;
    avatar_url?: string;
  } = {};
  let movedTo: string | null = null;

  if (formData.has("displayName")) {
    const displayName = String(formData.get("displayName") ?? "").trim();
    if (!displayName || displayName.length > 64) {
      return { error: "Please enter a display name (max 64 characters)." };
    }
    patch.display_name = displayName;
  }

  if (formData.has("username")) {
    const username = String(formData.get("username") ?? "").trim().toLowerCase();
    if (!isValidUsername(username)) return { error: USERNAME_RULES };
    patch.username = username;
    movedTo = username;
  }

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 2 * 1024 * 1024) {
      return { error: "Avatar must be smaller than 2MB." };
    }
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/avatar`, avatar, {
        upsert: true,
        contentType: avatar.type || "image/png",
      });
    if (uploadError) return { error: "Avatar upload failed. Try again." };
    const { publicUrl } = supabase.storage
      .from("avatars")
      .getPublicUrl(`${user.id}/avatar`).data;
    // The storage path never changes, so without a fresh query string every browser
    // that has seen the old avatar keeps serving it from cache.
    patch.avatar_url = `${publicUrl}?v=${Date.now()}`;
  }

  if (Object.keys(patch).length === 0) return { error: null };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is already taken." };
    if (error.code === "23514") return { error: "That username is reserved or invalid." };
    return { error: "Could not save your changes. Try again." };
  }

  // The panel reads the profile in the namespace layout, so the whole tree is stale.
  revalidatePath("/", "layout");
  // The username is the namespace: staying put would land on someone else's 404.
  if (movedTo) redirect(`/${movedTo}/settings`);
  return { error: null, saved: true };
}
