"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AthleteOnboardingState {
  error: string | null;
}

export async function completeAthleteOnboarding(
  _prev: AthleteOnboardingState,
  formData: FormData
): Promise<AthleteOnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Must be a claimed athlete of some coach.
  const { data: membership } = await supabase
    .from("athletes")
    .select("id")
    .eq("athlete_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/");

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const unit = String(formData.get("unit") ?? "metric");
  const sex = String(formData.get("sex") ?? "");
  const birthDate = String(formData.get("birthDate") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const avatar = formData.get("avatar");

  if (!firstName || firstName.length > 64) {
    return { error: "Please enter your first name." };
  }
  if (lastName.length > 64) {
    return { error: "Last name is too long." };
  }
  if (unit !== "metric" && unit !== "imperial") {
    return { error: "Please choose a unit system." };
  }
  if (sex !== "male" && sex !== "female") {
    return { error: "Please select your sex." };
  }
  const dob = Date.parse(birthDate);
  if (!birthDate || Number.isNaN(dob) || dob > Date.now()) {
    return { error: "Please enter a valid date of birth." };
  }
  if ((Date.now() - dob) / (365.25 * 864e5) > 100) {
    return { error: "Please enter a valid date of birth." };
  }

  // Height stored canonically in cm; imperial gets converted here.
  const heightCm =
    unit === "imperial"
      ? Math.round((Number(formData.get("heightFt")) * 12 + Number(formData.get("heightIn"))) * 2.54)
      : Math.round(Number(formData.get("heightCm")));
  if (!Number.isFinite(heightCm) || heightCm < 60 || heightCm > 260) {
    return { error: "Please enter a valid height." };
  }
  if (phone && (phone.length < 3 || phone.length > 32)) {
    return { error: "Please enter a valid phone number, or leave it blank." };
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

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    first_name: firstName,
    last_name: lastName || null,
    display_name: [firstName, lastName].filter(Boolean).join(" "),
    unit_preference: unit,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
  });
  if (profileError) {
    return { error: "Could not save your profile. Try again." };
  }

  const { error: detailsError } = await supabase.from("athlete_profiles").insert({
    profile_id: user.id,
    birth_date: birthDate,
    sex,
    height_cm: heightCm,
    phone: phone || null,
  });
  if (detailsError) {
    return { error: "Could not save your details. Try again." };
  }

  redirect("/athlete");
}
