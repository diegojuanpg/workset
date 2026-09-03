"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateField } from "@/components/ui/date-field";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  COMPETITION_TYPES,
  FEDERATIONS,
  FEDERATION_NAMES,
  weightClassGroups,
} from "@/lib/competitions/federations";
import { meetDays, parseISODate } from "@/lib/competitions/dates";
import { createCompetition, updateCompetition } from "@/lib/competitions/actions";
import type { Competition, RosterAthlete } from "@/lib/competitions/queries";

interface Entry {
  ageCategory: string;
  weightClass: string;
  /** The one day of the meet this athlete lifts. "" = the meet's first day. */
  competesOn: string;
}

const dayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CompetitionModal({
  competition,
  roster,
  onClose,
}: {
  /** Present = edit, absent = create. */
  competition?: Competition;
  roster: RosterAthlete[];
  onClose: () => void;
}) {
  const [name, setName] = React.useState(competition?.name ?? "");
  const [location, setLocation] = React.useState(competition?.location ?? "");
  const [startsOn, setStartsOn] = React.useState(competition?.startsOn ?? "");
  const [endsOn, setEndsOn] = React.useState(competition?.endsOn ?? "");
  const [type, setType] = React.useState(competition?.type ?? "");
  const [federation, setFederation] = React.useState(competition?.federation ?? "");
  const [ageCategories, setAgeCategories] = React.useState<string[]>(
    competition?.ageCategories ?? []
  );
  const [entries, setEntries] = React.useState<Map<string, Entry>>(
    () =>
      new Map(
        (competition?.entries ?? []).map((e) => [
          e.athleteId,
          {
            ageCategory: e.ageCategory ?? "",
            weightClass: e.weightClass ?? "",
            competesOn: e.competesOn ?? "",
          },
        ])
      )
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const nameRef = React.useRef<HTMLInputElement>(null);

  const fedAgeCategories = FEDERATIONS[federation]?.ageCategories ?? [];
  // Age options an athlete can be entered in: the meet's chosen categories, or all
  // the federation offers when the meet is open to everyone.
  const entryAgeOptions = ageCategories.length ? ageCategories : fedAgeCategories;
  // The days the meet runs. A one-day meet leaves nothing to pick, so the day selector only
  // appears once there is more than one session to choose between.
  const days = startsOn ? meetDays(startsOn, endsOn || startsOn) : [];

  const toggleAgeCategory = (category: string) => {
    setAgeCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const toggle = (id: string, on: boolean) => {
    setEntries((prev) => {
      const next = new Map(prev);
      if (on) next.set(id, { ageCategory: "", weightClass: "", competesOn: "" });
      else next.delete(id);
      return next;
    });
  };

  const patch = (id: string, field: keyof Entry, value: string) => {
    setEntries((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (current) next.set(id, { ...current, [field]: value });
      return next;
    });
  };

  const submit = () => {
    if (pending) return;
    const input = {
      name,
      location,
      startsOn,
      endsOn: endsOn || startsOn,
      type,
      federation,
      ageCategories,
      // Drop a day the meet no longer runs — moving the dates after entering athletes would
      // otherwise submit a session that has ceased to exist.
      entries: [...entries].map(([athleteId, e]) => ({
        athleteId,
        ...e,
        competesOn: days.includes(e.competesOn) ? e.competesOn : "",
      })),
    };
    startTransition(async () => {
      const result = competition
        ? await updateCompetition(competition.id, input)
        : await createCompetition(input);
      if (result.error) setError(result.error);
      else onClose();
    });
  };

  return (
    <Modal
      open
      sticky
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={competition ? "Edit competition" : "New competition"}
      description="Athletes entered here get the meet marked on their year calendar."
      initialFocusRef={nameRef}
      footer={
        <>
          <span className="text-copy-13 text-[var(--ds-red-900)]">{error}</span>
          <div className="flex gap-3">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="md"
              loading={pending}
              disabled={!name.trim() || !startsOn || !type || !federation}
              onClick={submit}
            >
              {competition ? "Save" : "Create"}
            </Button>
          </div>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          ref={nameRef}
          label="Name"
          placeholder="e.g. IPF World Classic Championships"
          value={name}
          maxLength={120}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        <Input
          label="Location"
          placeholder="City, country (optional)"
          value={location}
          maxLength={120}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Start date</Label>
            <DateField
              name="startsOn"
              placeholder="Select a date"
              defaultValue={competition ? parseISODate(competition.startsOn) : undefined}
              onChange={(d) => {
                const iso = toISODate(d);
                setStartsOn(iso);
                // Multi-day meets are the exception — keep the end pinned to the start
                // until the coach moves it, and never let it fall behind.
                if (!endsOn || endsOn < iso) setEndsOn(iso);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>End date</Label>
            <DateField
              key={startsOn}
              name="endsOn"
              placeholder="Same day"
              min={startsOn ? parseISODate(startsOn) : undefined}
              defaultValue={endsOn ? parseISODate(endsOn) : undefined}
              onChange={(d) => setEndsOn(toISODate(d))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Type"
            placeholder="Select a type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {COMPETITION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="Federation"
            placeholder="Select a federation"
            value={federation}
            onChange={(e) => {
              setFederation(e.target.value);
              // Categories are federation-specific — stale picks would be nonsense.
              setAgeCategories([]);
              // The competing day survives: it is a date, not a federation-specific pick.
              setEntries(
                (prev) =>
                  new Map(
                    [...prev].map(([id, e]) => [
                      id,
                      { ageCategory: "", weightClass: "", competesOn: e.competesOn },
                    ]),
                  ),
              );
            }}
          >
            {FEDERATION_NAMES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>

        {federation && (
          <div className="flex flex-col gap-2">
            <Label>Age categories</Label>
            <p className="text-copy-13 text-[var(--ds-gray-900)]">
              Which categories this meet runs. Leave empty for all.
            </p>
            <div className="flex flex-wrap gap-2">
              {fedAgeCategories.map((category) => {
                const active = ageCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAgeCategory(category)}
                    className={
                      active
                        ? "rounded-full bg-[var(--ds-gray-1000)] px-3 py-1 text-button-14 text-[var(--ds-gray-100)]"
                        : "rounded-full px-3 py-1 text-button-14 text-[var(--ds-gray-1000)] shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] hover:bg-[var(--ds-gray-100)]"
                    }
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Athletes</Label>
          {roster.length === 0 ? (
            <p className="text-copy-13 text-[var(--ds-gray-900)]">
              No athletes in your roster yet.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg shadow-[0_0_0_1px_var(--ds-gray-alpha-400)]">
              {roster.map((athlete) => {
                const entry = entries.get(athlete.id);
                return (
                  <div
                    key={athlete.id}
                    className="flex flex-col gap-2 border-b border-[var(--ds-gray-alpha-400)] p-3 last:border-b-0"
                  >
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <Checkbox
                        checked={!!entry}
                        onCheckedChange={(on) => toggle(athlete.id, on === true)}
                      />
                      <span className="text-copy-14 text-[var(--ds-gray-1000)]">{athlete.name}</span>
                    </label>
                    {entry && (
                      <div className="grid grid-cols-2 gap-2 pl-[26px]">
                        <Select
                          size="small"
                          placeholder="Age category"
                          value={entry.ageCategory}
                          disabled={!federation}
                          onChange={(e) => patch(athlete.id, "ageCategory", e.target.value)}
                        >
                          {entryAgeOptions.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
                        <Select
                          size="small"
                          placeholder="Weight class"
                          value={entry.weightClass}
                          disabled={!federation}
                          onChange={(e) => patch(athlete.id, "weightClass", e.target.value)}
                        >
                          {weightClassGroups(federation, athlete.sex).map((group) => (
                            <optgroup key={group.label} label={`${group.label} (kg)`}>
                              {group.classes.map((c) => (
                                <option key={c} value={`${c} kg`}>
                                  {c} kg
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </Select>
                        {days.length > 1 && (
                          <Select
                            size="small"
                            placeholder="Competes on"
                            value={days.includes(entry.competesOn) ? entry.competesOn : ""}
                            onChange={(e) => patch(athlete.id, "competesOn", e.target.value)}
                          >
                            {days.map((d) => (
                              <option key={d} value={d}>
                                {dayLabel.format(parseISODate(d))}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
