"use client";

import * as React from "react";
import { useActionState } from "react";
import { updateProfile, type SettingsState } from "@/app/[username]/settings/actions";
import { Button } from "@/components/ui/button";
import { Fieldset } from "@/components/ui/fieldset";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { CameraIcon } from "@/components/icons";

const EMPTY: SettingsState = { error: null };

interface AccountSettingsProps {
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string;
}

export function AccountSettings({
  displayName,
  username,
  email,
  avatarUrl,
}: AccountSettingsProps) {
  // One action, one state per card: each form posts only its own field, so a failing
  // save shows its error where it happened instead of on all three.
  const [nameState, saveName, savingName] = useActionState(updateProfile, EMPTY);
  const [userState, saveUser, savingUser] = useActionState(updateProfile, EMPTY);
  const [avatarState, saveAvatar, savingAvatar] = useActionState(updateProfile, EMPTY);

  const [preview, setPreview] = React.useState<string | null>(null);
  const avatarForm = React.useRef<HTMLFormElement>(null);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <form action={saveName}>
        <Fieldset
          title="Display Name"
          subtitle="This is the name your athletes see on invites and messages."
          footer="Please use 64 characters at maximum."
          footerActions={
            <Button size="md" type="submit" loading={savingName} variant="secondary">
              Save
            </Button>
          }
        >
          <Input
            defaultValue={displayName}
            error={nameState.error ?? undefined}
            maxLength={64}
            name="displayName"
            required
          />
        </Fieldset>
      </form>

      <form action={saveUser}>
        <Fieldset
          title="Username"
          subtitle="Your namespace on Workset. Changing it moves every page under it."
          footer="Lowercase letters, numbers and dashes."
          footerActions={
            <Button size="md" type="submit" loading={savingUser} variant="secondary">
              Save
            </Button>
          }
        >
          <Input
            defaultValue={username}
            error={userState.error ?? undefined}
            maxLength={48}
            name="username"
            prefix="workset.app/"
            required
          />
        </Fieldset>
      </form>

      {/* Picking a file submits straight away — an avatar has nothing else to confirm. */}
      <form action={saveAvatar} ref={avatarForm}>
        <Fieldset
          title="Avatar"
          subtitle="Click the avatar to upload a custom one from your files."
          footer="An avatar is optional but recommended. Max 2MB."
        >
          <label className="group relative size-20 cursor-pointer self-start overflow-hidden rounded-full border border-border focus-within:shadow-[var(--ds-focus-ring)]">
            {/* Blob/data URIs — next/image can't optimize these. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Your avatar"
              className="size-full object-cover"
              src={preview ?? avatarUrl}
            />
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--ds-gray-alpha-600)] opacity-0 transition-opacity group-hover:opacity-100">
              <CameraIcon className="size-5 text-[var(--ds-gray-1000)]" />
            </span>
            <input
              accept="image/*"
              className="sr-only"
              disabled={savingAvatar}
              name="avatar"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPreview(URL.createObjectURL(file));
                avatarForm.current?.requestSubmit();
              }}
              type="file"
            />
          </label>
          {avatarState.error ? (
            <Note size="sm" type="error">
              {avatarState.error}
            </Note>
          ) : null}
        </Fieldset>
      </form>

      <Fieldset
        title="Email"
        subtitle={email}
        footer="Your email comes from the account you signed in with and can't be changed here."
      />
    </div>
  );
}
