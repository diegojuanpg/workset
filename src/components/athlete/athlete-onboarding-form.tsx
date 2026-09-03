"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  completeAthleteOnboarding,
  type AthleteOnboardingState,
} from "@/app/athlete/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Switch } from "@/components/ui/switch";
import { DateField } from "@/components/ui/date-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { CameraIcon } from "@/components/icons";

interface AthleteOnboardingFormProps {
  suggestedFirstName: string;
  suggestedLastName: string;
  generatedAvatar: string;
}

export function AthleteOnboardingForm({
  suggestedFirstName,
  suggestedLastName,
  generatedAvatar,
}: AthleteOnboardingFormProps) {
  const [state, formAction, pending] = useActionState<AthleteOnboardingState, FormData>(
    completeAthleteOnboarding,
    { error: null }
  );

  const [unit, setUnit] = React.useState<"metric" | "imperial">("metric");
  const [sex, setSex] = React.useState("");
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // DOB bounds: nobody born in the future, cap the year dropdown at 1920.
  const today = React.useMemo(() => new Date(), []);
  const minDate = React.useMemo(() => new Date(1920, 0, 1), []);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          autoFocus
          defaultValue={suggestedFirstName}
          label="First name"
          maxLength={64}
          name="firstName"
          placeholder="First name"
          required
          size="large"
        />
        <Input
          defaultValue={suggestedLastName}
          label="Last name"
          maxLength={64}
          name="lastName"
          placeholder="Last name"
          size="large"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Date of birth</Label>
        <DateField max={today} min={minDate} name="birthDate" placeholder="Select your date of birth" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Sex</Label>
        <Switch
          className="w-full"
          items={[
            { value: "male", label: "Male" },
            { value: "female", label: "Female" },
          ]}
          name="sex"
          onValueChange={setSex}
          size="large"
          value={sex}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label className="mb-0">Height</Label>
          <Switch
            items={[
              { value: "metric", label: "Metric" },
              { value: "imperial", label: "Imperial" },
            ]}
            name="unit"
            onValueChange={(v) => setUnit(v as "metric" | "imperial")}
            size="small"
            value={unit}
          />
        </div>
        {/* type=text + inputMode: number inputs render native spinners in Firefox
            (the DS Input only suppresses the -webkit- ones), which break the layout. */}
        {unit === "metric" ? (
          <Input inputMode="numeric" maxLength={3} name="heightCm" placeholder="Height" size="large" suffix="cm" />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Input inputMode="numeric" maxLength={2} name="heightFt" placeholder="Feet" size="large" suffix="ft" />
            <Input inputMode="numeric" maxLength={2} name="heightIn" placeholder="Inches" size="large" suffix="in" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Phone <span className="text-muted-foreground">(optional)</span></Label>
        <PhoneInput name="phone" />
      </div>

      {state.error ? (
        <Note size="sm" type="error">
          {state.error}
        </Note>
      ) : null}

      <Button loading={pending} size="lg" type="submit">
        Continue
      </Button>
    </form>
  );
}
