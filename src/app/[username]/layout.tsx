import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { athleteName } from "@/lib/athletes/name";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { PanelShell } from "@/components/panel/panel-shell";

interface UsernameLayoutProps {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}

export default async function UsernameLayout({ children, params }: UsernameLayoutProps) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: athleteRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("athletes")
      .select("id, first_name, last_name, planned, athlete_id, invite_status")
      .order("first_name"),
  ]);

  if (!profile?.username || !profile.display_name) redirect("/onboarding");

  const athletes = (athleteRows ?? []).map((a) => ({
    id: a.id,
    name: athleteName(a.first_name, a.last_name),
    firstName: a.first_name,
    lastName: a.last_name,
    planned: a.planned,
    pending: a.athlete_id === null,
  }));

  // Someone else's namespace → Vercel-style 404, no panel. No public profiles in this phase.
  if (profile.username !== username.toLowerCase()) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="text-heading-32 text-foreground">404</span>
          <div className="h-10 w-px bg-border" />
          <p className="text-copy-14 text-muted-foreground">
            You are logged in as{" "}
            <span className="text-foreground">{user.email}</span>
          </p>
        </div>
        <form action={signOut}>
          <Button size="md" type="submit" variant="secondary">
            Sign in as a different user
          </Button>
        </form>
      </main>
    );
  }

  return (
    <PanelShell
      username={profile.username}
      displayName={profile.display_name}
      email={user.email ?? ""}
      avatarUrl={profile.avatar_url ?? generatedAvatarDataUri(user.id)}
      athletes={athletes}
    >
      {children}
    </PanelShell>
  );
}
