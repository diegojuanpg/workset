"use client";

import * as React from "react";
import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, USERNAME_RULES } from "@/lib/auth/username";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Spinner } from "@/components/ui/spinner";
import { CameraIcon, CheckCircleIcon, CrossCircleIcon } from "@/components/icons";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface OnboardingFormProps {
  suggestedUsername: string;
  suggestedDisplayName: string;
  generatedAvatar: string;
}

export function OnboardingForm({
  suggestedUsername,
  suggestedDisplayName,
  generatedAvatar,
}: OnboardingFormProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    { error: null }
  );

  const [username, setUsername] = React.useState(suggestedUsername);
  const [checked, setChecked] = React.useState<{
    value: string;
    available: boolean;
  } | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Status derived in render; the effect only records async results.
  const value = username.trim().toLowerCase();
  const status: UsernameStatus = !value
    ? "idle"
    : !isValidUsername(value)
      ? "invalid"
      : checked?.value === value
        ? checked.available
          ? "available"
          : "taken"
        : "checking";

  // Debounced live availability check, Vercel-style.
  React.useEffect(() => {
    if (!value || !isValidUsername(value)) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data: available } = await supabase.rpc("username_available", {
        candidate: value,
      });
      if (!cancelled) setChecked({ value, available: available !== false });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value, supabase]);

  const usernameSuffix =
    status === "checking" ? (
      <Spinner size="sm" />
    ) : status === "available" ? (
      <CheckCircleIcon className="size-4 text-[var(--ds-green-800)]" />
    ) : status === "taken" || status === "invalid" ? (
      <CrossCircleIcon className="size-4 text-[var(--ds-red-900)]" />
    ) : null;

  const usernameError =
    status === "invalid"
      ? USERNAME_RULES
      : status === "taken"
        ? "That username is already taken."
        : undefined;

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <button
          aria-label="Upload avatar"
          className="group relative size-20 overflow-hidden rounded-full border border-border focus-visible:shadow-[var(--ds-focus-ring)] focus-visible:outline-none"
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          {/* Blob/data URIs — next/image can't optimize these. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Avatar preview"
            className="size-full object-cover"
            src={avatarPreview ?? generatedAvatar}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-[var(--ds-gray-alpha-600)] opacity-0 transition-opacity group-hover:opacity-100">
            <CameraIcon className="size-5 text-[var(--ds-gray-1000)]" />
          </span>
        </button>
        <p className="text-copy-13 text-muted-foreground">
          Optional — click to upload, or keep the generated one.
        </p>
        <input
          accept="image/*"
          className="hidden"
          name="avatar"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setAvatarPreview(file ? URL.createObjectURL(file) : null);
          }}
          ref={fileRef}
          type="file"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          autoFocus
          defaultValue={suggestedDisplayName}
          id="displayName"
          maxLength={64}
          name="displayName"
          placeholder="Please enter your full name, or a display name you are comfortable with."
          required
          size="large"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          error={usernameError}
          id="username"
          maxLength={48}
          name="username"
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          prefix="workset.app/"
          required
          size="large"
          suffix={usernameSuffix}
          suffixStyling={false}
          value={username}
        />
        <p className="text-copy-13 text-muted-foreground">
          Lowercase letters, numbers and dashes. You can change it later in
          settings.
        </p>
      </div>

      {state.error ? (
        <Note size="sm" type="error">
          {state.error}
        </Note>
      ) : null}

      <Button
        disabled={status === "taken" || status === "invalid"}
        loading={pending}
        size="lg"
        type="submit"
      >
        Continue
      </Button>
    </form>
  );
}
