import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "/" only routes: proxy guarantees a session here.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/home");

  // A signed-out visitor who opened an invite link finishes auth here — resume the claim.
  const pendingInvite = (await cookies()).get("pending_invite")?.value;
  if (pendingInvite) redirect(`/join/${pendingInvite}`);

  const [{ data: profile }, { data: membership }, { data: athleteProfile }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, is_coach")
        .eq("id", user.id)
        .single(),
      supabase
        .from("athletes")
        .select("id")
        .eq("athlete_id", user.id)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("athlete_profiles")
        .select("profile_id")
        .eq("profile_id", user.id)
        .maybeSingle(),
    ]);

  // Invited athlete who isn't also a coach → athlete side of the app.
  if (membership && !profile?.is_coach) {
    redirect(athleteProfile ? "/athlete" : "/athlete/onboarding");
  }

  // Coach (self-signup) or dual-role → coach app.
  if (!profile?.username || !profile.display_name) redirect("/onboarding");
  redirect(`/${profile.username}`);
}
