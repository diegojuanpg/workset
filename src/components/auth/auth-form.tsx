"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightIcon, LogoGoogle } from "@/components/icons";

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

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
  const [codeFocused, setCodeFocused] = React.useState(false);
  const codeInputRef = React.useRef<HTMLInputElement>(null);

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

  const verifyCode = React.useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        setLoading(false);
        setCode("");
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
    },
    [email, router, supabase]
  );

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
    const activeIndex = Math.min(code.length, CODE_LENGTH - 1);
    return (
      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-center text-heading-32 text-foreground">
            Check your email
          </h1>
          <p className="text-center text-copy-16 text-muted-foreground">
            {mode === "login" ? "If you have a Workset account, we" : "We"} sent
            a code to <span className="text-foreground">{email}</span>.
          </p>
        </div>
        <div
          aria-busy={loading}
          className="relative"
          onClick={() => codeInputRef.current?.focus()}
        >
          <input
            aria-label="Verification code"
            autoComplete="one-time-code"
            autoFocus
            className="absolute inset-0 size-full cursor-text opacity-0"
            disabled={loading}
            inputMode="numeric"
            onBlur={() => setCodeFocused(false)}
            onChange={(e) => {
              setError(null);
              const next = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
              setCode(next);
              // Vercel-style: verify as soon as the sixth digit lands.
              if (next.length === CODE_LENGTH && !loading) verifyCode(next);
            }}
            onFocus={() => setCodeFocused(true)}
            ref={codeInputRef}
            value={code}
          />
          <div aria-hidden className="flex gap-2">
            {Array.from({ length: CODE_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex h-12 w-11 items-center justify-center rounded-lg border bg-[var(--ds-background-100)] text-heading-24 text-foreground",
                  error
                    ? "border-[var(--ds-red-900)]"
                    : codeFocused && i === activeIndex
                      ? "border-transparent shadow-[var(--ds-focus-ring)]"
                      : "border-border"
                )}
              >
                {code[i] ?? ""}
              </div>
            ))}
          </div>
        </div>
        {error ? (
          <p className="text-center text-copy-13 text-[var(--ds-red-900)]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col items-center gap-1">
          <Button
            onClick={() => {
              setStep("email");
              setError(null);
            }}
            size="md"
            type="button"
            variant="tertiary"
          >
            Use a Different Email
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
      </div>
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
      <div className="flex w-full flex-col gap-10">
        <h1 className="text-center text-heading-32 text-foreground">
          Your first plan
          <br />
          is just a sign-up away.
        </h1>
        <div className="mx-auto flex w-full max-w-[390px] flex-col gap-4">
          {googleButton}
          {showEmail ? (
            emailForm
          ) : (
            <button
              className="mx-auto inline-flex items-center gap-1.5 text-copy-16 text-[var(--ds-blue-900)] hover:underline"
              onClick={() => setShowEmail(true)}
              type="button"
            >
              Continue with Email
              <ArrowRightIcon className="size-4" />
            </button>
          )}
          {error && !showEmail ? (
            <p className="text-center text-copy-13 text-[var(--ds-red-900)]">
              {error}
            </p>
          ) : null}
        </div>
        <p className="text-center text-copy-16 text-foreground">
          Already have an account?{" "}
          <Link className="text-[var(--ds-blue-900)] hover:underline" href="/login">
            Log In
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-center text-heading-32 text-foreground">
        Log in to Workset
      </h1>
      <div className="flex flex-col gap-4">
        {emailForm}
        <div className="h-px w-full bg-border" />
        {googleButton}
      </div>
      <p className="text-center text-copy-16 text-foreground">
        Don&apos;t have an account?{" "}
        <Link className="text-[var(--ds-blue-900)] hover:underline" href="/signup">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
