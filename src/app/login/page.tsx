import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in — Tensor" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-24 text-foreground">Log in to Tensor</h1>
          <p className="text-copy-14 text-muted-foreground">
            We&apos;ll email you a 6-digit code. No passwords.
          </p>
        </div>
        <AuthForm mode="login" />
        <p className="text-copy-13 text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link className="text-foreground underline underline-offset-2" href="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
