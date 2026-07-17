"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoGoogle } from "@/components/icons";

const RESEND_COOLDOWN_SECONDS = 60;

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);

  const [step, setStep] = React.useState<"email" | "code">("email");
  // Vercel-style signup: providers first, email form behind the link.
  const [showEmail, setShowEmail] = React.useState(mode === "login");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: mode === "signup" },
    });
    setLoading(false);
    if (error) {
      if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
        setError("No account found for this email. Sign up instead.");
      } else if (error.status === 429) {
        setError("Too many requests. Wait a minute and try again.");
      } else {
        setError(error.message);
      }
      return;
    }
    setStep("code");
    setCode("");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
      if (error.code === "otp_expired") {
        setError("Invalid or expired code. Check the code or request a new one.");
      } else if (error.status === 429) {
        setError("Too many attempts. Wait a few minutes and try again.");
      } else {
        setError(error.message);
      }
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Google sign-in is not available yet.");
    }
  }

  if (step === "code") {
    return (
      <form
        className="flex w-full flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && code.length === 6) verifyCode();
        }}
      >
        <p className="text-center text-copy-14 text-muted-foreground">
          We sent a 6-digit code to{" "}
          <span className="text-foreground">{email}</span>. It expires in 5
          minutes.
        </p>
        <Input
          aria-label="Verification code"
          autoComplete="one-time-code"
          autoFocus
          className="text-center font-mono tracking-[0.5em]"
          error={error ?? undefined}
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          placeholder="000000"
          size="large"
          value={code}
        />
        <Button
          disabled={code.length !== 6}
          loading={loading}
          size="lg"
          type="submit"
        >
          Verify
        </Button>
        <div className="flex items-center justify-between">
          <Button
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            size="sm"
            type="button"
            variant="tertiary"
          >
            Use a different email
          </Button>
          <Button
            disabled={cooldown > 0 || loading}
            onClick={sendCode}
            size="sm"
            type="button"
            variant="tertiary"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </Button>
        </div>
      </form>
    );
  }

  const emailForm = (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && email) sendCode();
      }}
    >
      <Input
        aria-label="Email address"
        autoComplete="email"
        autoFocus={mode === "login"}
        error={error ?? undefined}
        onChange={(e) => setEmail(e.target.value.trim())}
        placeholder="Email Address"
        required
        size="large"
        type="email"
        value={email}
      />
      <Button disabled={!email} loading={loading} size="lg" type="submit">
        Continue with Email
      </Button>
    </form>
  );

  const googleButton = (
    <Button
      onClick={signInWithGoogle}
      prefix={<LogoGoogle />}
      size="lg"
      type="button"
      variant="secondary"
    >
      Continue with Google
    </Button>
  );

  if (mode === "signup") {
    return (
      <div className="flex w-full flex-col gap-4">
        {googleButton}
        {showEmail ? (
          emailForm
        ) : (
          <button
            className="mx-auto text-copy-14 text-[var(--ds-blue-900)] hover:underline"
            onClick={() => setShowEmail(true)}
            type="button"
          >
            Continue with Email →
          </button>
        )}
        {error && !showEmail ? (
          <p className="text-center text-copy-13 text-[var(--ds-red-900)]">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {emailForm}
      <div className="h-px w-full bg-border" />
      {googleButton}
    </div>
  );
}
