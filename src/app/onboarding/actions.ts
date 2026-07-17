"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUsername, USERNAME_RULES } from "@/lib/auth/username";

export interface OnboardingState {
  error: string | null;
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const avatar = formData.get("avatar");

  if (!displayName || displayName.length > 64) {
    return { error: "Please enter a display name (max 64 characters)." };
  }
  if (!isValidUsername(username)) {
    return { error: USERNAME_RULES };
  }

  let avatarUrl: string | null = null;
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
    if (uploadError) {
      return { error: "Avatar upload failed. Try again or skip it." };
    }
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(`${user.id}/avatar`)
      .data.publicUrl;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "That username is already taken." };
    }
    if (updateError.code === "23514") {
      return { error: "That username is reserved or invalid." };
    }
    return { error: "Could not save your profile. Try again." };
  }

  redirect(`/${username}`);
}
