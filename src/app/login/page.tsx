import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = { title: "Log in — Workset" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader action={{ label: "Sign Up", href: "/signup" }} />
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
        <div className="flex w-full max-w-xs flex-col gap-6">
          <h1 className="text-center text-heading-32 text-foreground">
            Log in to Workset
          </h1>
          <AuthForm mode="login" />
          <p className="text-center text-copy-16 text-foreground">
            Don&apos;t have an account?{" "}
            <Link className="text-[var(--ds-blue-900)] hover:underline" href="/signup">
              Sign Up
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
