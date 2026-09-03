import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { AccountSettings } from "@/components/settings/account-settings";

export const metadata: Metadata = { title: "Account Settings — Workset" };

export default async function AccountSettingsPage() {
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

  return (
    <main className="flex flex-1 justify-center p-6">
      <AccountSettings
        avatarUrl={profile?.avatar_url ?? generatedAvatarDataUri(user.id)}
        displayName={profile?.display_name ?? ""}
        email={user.email ?? ""}
        username={profile?.username ?? ""}
      />
    </main>
  );
}
