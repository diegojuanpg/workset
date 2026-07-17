import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = { title: "Sign up — Workset" };

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader action={{ label: "Log In", href: "/login" }} />
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
        <div className="material-small flex w-full max-w-[550px] flex-col gap-10 rounded-xl px-8 py-12 md:px-20 md:py-16">
          <h1 className="text-center text-heading-32 text-foreground">
            Your first plan
            <br />
            is just a sign-up away.
          </h1>
          <div className="mx-auto w-full max-w-[390px]">
            <AuthForm mode="signup" />
          </div>
          <p className="text-center text-copy-16 text-foreground">
            Already have an account?{" "}
            <Link className="text-[var(--ds-blue-900)] hover:underline" href="/login">
              Log In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
