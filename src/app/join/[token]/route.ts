import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Invite claim. Signed-out visitors get their token stashed and are sent to sign up;
// signed-in visitors redeem it (claim_invitation is security-definer) and move on.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const res = NextResponse.redirect(`${origin}/signup`);
    res.cookies.set("pending_invite", token, {
      httpOnly: true,
      path: "/",
      maxAge: 3600,
      sameSite: "lax",
    });
    return res;
  }

  const { data, error } = await supabase.rpc("claim_invitation", { p_token: token });

  const done = (dest: string) => {
    const res = NextResponse.redirect(`${origin}${dest}`);
    res.cookies.delete("pending_invite");
    return res;
  };

  if (error) {
    const msg = error.message;
    const reason = msg.includes("self_coach")
      ? "self"
      : msg.includes("invite_expired")
        ? "expired"
        : "invalid";
    return done(`/join?error=${reason}`);
  }

  const result = data as { coach_id: string; needs_onboarding: boolean };
  return done(result.needs_onboarding ? "/athlete/onboarding" : "/athlete");
}
