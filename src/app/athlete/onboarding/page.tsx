import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { AuthHeader } from "@/components/auth/auth-header";
import { AthleteOnboardingForm } from "@/components/athlete/athlete-onboarding-form";

export const metadata: Metadata = { title: "Set up your profile — Workset" };

export default async function AthleteOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: membership }, { data: details }] = await Promise.all([
    supabase
      .from("athletes")
      .select("first_name, last_name")
      .eq("athlete_id", user.id)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("athlete_profiles")
      .select("profile_id")
      .eq("profile_id", user.id)
      .maybeSingle(),
  ]);

  // Not a claimed athlete → not their screen.
  if (!membership) redirect("/");
  // Already set up → straight to the athlete area.
  if (details) redirect("/athlete");

  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader showSignOut />
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
        <div className="flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-center text-heading-32 text-foreground">
              Set up your profile
            </h1>
            <p className="text-center text-copy-16 text-muted-foreground">
              A few details so your coach can plan your training.
            </p>
          </div>
          <AthleteOnboardingForm
            generatedAvatar={generatedAvatarDataUri(user.id)}
            suggestedFirstName={membership.first_name}
            suggestedLastName={membership.last_name ?? ""}
          />
        </div>
      </main>
    </div>
  );
}
