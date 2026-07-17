import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { suggestUsername } from "@/lib/auth/username";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Welcome — Tensor" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.username && profile.display_name) {
    redirect(`/${profile.username}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-24 text-foreground">Welcome to Tensor</h1>
          <p className="text-copy-14 text-muted-foreground">
            A couple of details before you get started.
          </p>
        </div>
        <OnboardingForm
          generatedAvatar={generatedAvatarDataUri(user.id)}
          suggestedUsername={suggestUsername(user.email ?? "")}
        />
      </div>
    </main>
  );
}
