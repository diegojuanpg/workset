import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeader } from "@/components/auth/auth-header";
import { WorksetMark } from "@/components/icons";

export const metadata: Metadata = { title: "Log in — Workset" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader action={{ label: "Sign Up", href: "/signup" }} />
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="flex w-full max-w-xs flex-col items-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-[var(--ds-gray-100)]">
            <WorksetMark className="h-8 w-auto text-foreground" />
          </div>
          <AuthForm mode="login" />
        </div>
      </main>
      <footer className="p-6 text-center text-label-12 text-muted-foreground">
        By proceeding, you agree to creating a Workset account subject to our{" "}
        <Link className="text-foreground hover:underline" href="/terms">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link className="text-foreground hover:underline" href="/privacy">
          Privacy Policy
        </Link>
        .
      </footer>
    </div>
  );
}
