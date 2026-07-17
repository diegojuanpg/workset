import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// "/" only routes: proxy guarantees a session here.
export default async function Home() {
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

  if (!profile?.username || !profile.display_name) redirect("/onboarding");
  redirect(`/${profile.username}`);
}
