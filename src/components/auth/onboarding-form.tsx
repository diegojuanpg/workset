"use client";

import * as React from "react";
import { useActionState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, USERNAME_RULES } from "@/lib/auth/username";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface OnboardingFormProps {
  suggestedUsername: string;
  generatedAvatar: string;
}

export function OnboardingForm({
  suggestedUsername,
  generatedAvatar,
}: OnboardingFormProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    { error: null }
  );

  const [username, setUsername] = React.useState(suggestedUsername);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  async function checkUsername() {
    const value = username.trim().toLowerCase();
    if (!value) return;
    if (!isValidUsername(value)) {
      setUsernameError(USERNAME_RULES);
      return;
    }
    const { data: available } = await supabase.rpc("username_available", {
      candidate: value,
    });
    setUsernameError(available === false ? "That username is already taken." : null);
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          autoFocus
          id="displayName"
          maxLength={64}
          name="displayName"
          placeholder="Please enter your full name, or a display name you are comfortable with."
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          error={usernameError ?? undefined}
          id="username"
          maxLength={48}
          name="username"
          onBlur={checkUsername}
          onChange={(e) => {
            setUsername(e.target.value.toLowerCase());
            setUsernameError(null);
          }}
          prefix="workset.app/"
          required
          value={username}
        />
        <p className="text-copy-13 text-muted-foreground">
          Lowercase letters, numbers and dashes. Max 48 characters. You can
          change it later in settings.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="avatar">Avatar (optional)</Label>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Avatar preview"
            className="size-12 shrink-0 rounded-full border border-border object-cover"
            src={avatarPreview ?? generatedAvatar}
          />
          <input
            accept="image/*"
            className="text-copy-13 text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-copy-13 file:text-foreground"
            id="avatar"
            name="avatar"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setAvatarPreview(file ? URL.createObjectURL(file) : null);
            }}
            type="file"
          />
        </div>
        <p className="text-copy-13 text-muted-foreground">
          If you skip this, we&apos;ll use the generated one.
        </p>
      </div>

      {state.error ? (
        <p className="text-copy-13 text-[var(--ds-red-900)]">{state.error}</p>
      ) : null}

      <Button loading={pending} size="lg" type="submit">
        Continue
      </Button>
    </form>
  );
}
