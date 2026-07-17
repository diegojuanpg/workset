import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = { title: "Sign up — Workset" };

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader action={{ label: "Log In", href: "/login" }} />
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
        <div className="material-small flex w-full max-w-[550px] flex-col rounded-xl px-8 py-12 md:px-20 md:py-16">
          <AuthForm mode="signup" />
        </div>
      </main>
    </div>
  );
}
