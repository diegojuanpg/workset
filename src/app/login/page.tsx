import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeader } from "@/components/auth/auth-header";

export const metadata: Metadata = { title: "Log in — Workset" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AuthHeader action={{ label: "Sign Up", href: "/signup" }} />
      <main className="flex flex-1 flex-col items-center justify-center p-6 pb-24">
        <div className="w-full max-w-xs">
          <AuthForm mode="login" />
        </div>
      </main>
    </div>
  );
}
