import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard — Tensor" };

interface UsernamePageProps {
  params: Promise<{ username: string }>;
}

export default async function UsernamePage({ params }: UsernamePageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.username || !profile.display_name) redirect("/onboarding");

  // Someone else's namespace → Vercel-style 404. No public profiles in this phase.
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

  const avatar = profile.avatar_url ?? generatedAvatarDataUri(user.id);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={profile.display_name}
          className="size-16 rounded-full border border-border object-cover"
          src={avatar}
        />
        <h1 className="text-heading-24 text-foreground">
          {profile.display_name}
        </h1>
        <p className="text-copy-14 text-muted-foreground">
          tensor.app/{profile.username}
        </p>
      </div>
      <p className="text-copy-14 text-muted-foreground">
        Your training dashboard is coming next.
      </p>
      <form action={signOut}>
        <Button size="sm" type="submit" variant="tertiary">
          Sign out
        </Button>
      </form>
    </main>
  );
}
