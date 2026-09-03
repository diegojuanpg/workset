import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";

export const metadata: Metadata = { title: "Dashboard — Workset" };

// Auth, onboarding and namespace checks live in the segment layout.
export default async function UsernamePage() {
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
          workset.app/{profile.username}
        </p>
      </div>
      <p className="text-copy-14 text-muted-foreground">
        Your training dashboard is coming next.
      </p>
    </main>
  );
}
