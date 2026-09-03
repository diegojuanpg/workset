import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = { title: "Workset" };

// Placeholder athlete landing. The real training view (desktop app) comes later.
export default async function AthleteHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: details } = await supabase
    .from("athlete_profiles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!details) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader showSignOut />
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-heading-32 text-foreground">You&apos;re all set</h1>
        <p className="max-w-sm text-copy-16 text-muted-foreground">
          Your coach is building your training. You&apos;ll be able to see it here soon.
        </p>
      </main>
    </div>
  );
}
