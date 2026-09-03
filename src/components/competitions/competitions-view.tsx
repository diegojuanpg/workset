"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DotsMenu } from "@/components/ui/dots-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { ChartActivityIcon, FlagIcon, PlusIcon, UsersIcon } from "@/components/icons";
import { formatRange, phaseOf, weeksOut, type Phase } from "@/lib/competitions/dates";
import { deleteCompetition } from "@/lib/competitions/actions";
import type { Competition, RosterAthlete } from "@/lib/competitions/queries";
import { CompetitionModal } from "@/components/competitions/competition-modal";

type Filter = "upcoming" | "past" | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

// Federation logos, shown as 20px round avatars like Vercel project icons.
const FEDERATION_LOGOS: Record<string, string> = {
  IPF: "/federations/ipf-mark.png",
  IPL: "/federations/ipl-mark.png",
  WRPF: "/federations/wrpf-mark.png",
};

// Brand-colored badge per federation (Turborepo-style: gradient sampled from the
// federation's own logo), falling back to the plain gray badge for the rest.
const FEDERATION_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  IPF: "ipf",
  IPL: "ipl",
  WRPF: "wrpf",
};

// Status dot mirrors the Vercel deployment state dot ("Ready" is teal-600).
const PHASE: Record<Phase, { label: string; color: string }> = {
  ongoing: { label: "Now", color: "var(--ds-teal-600)" },
  upcoming: { label: "Upcoming", color: "var(--ds-blue-700)" },
  past: { label: "Past", color: "var(--ds-gray-700)" },
};

// Vercel Deployments table clone (CDP-measured): one CSS grid, rows as subgrid so
// every row shares the same column tracks. Column order: name, status, federation,
// type, age class, athletes, date. They appear progressively: base = name/status/date,
// md adds federation+type, lg adds age class+athletes. Hidden cells drop their track,
// so the visible-cell count must match the track count at each breakpoint.
const GRID_COLS = [
  "grid-cols-[minmax(0,2fr)_minmax(8.5rem,auto)_minmax(8rem,auto)]",
  "md:grid-cols-[minmax(0,2fr)_minmax(8.5rem,auto)_fit-content(7rem)_fit-content(7rem)_minmax(8rem,auto)]",
  "lg:grid-cols-[minmax(0,2fr)_minmax(8.5rem,auto)_fit-content(7rem)_fit-content(7rem)_fit-content(9rem)_fit-content(8rem)_minmax(8rem,auto)]",
].join(" ");

/** Compact age-class summary for the row. */
function ageClassLabel(categories: string[]): string {
  if (categories.length === 0) return "All classes";
  if (categories.length === 1) return categories[0];
  return `${categories.length} classes`;
}

export function CompetitionsView({
  competitions,
  roster,
}: {
  competitions: Competition[];
  roster: RosterAthlete[];
}) {
  const [filter, setFilter] = React.useState<Filter>("upcoming");
  const [query, setQuery] = React.useState("");
  const [modal, setModal] = React.useState<
    | { type: "form"; competition?: Competition }
    | { type: "detail"; competition: Competition }
    | { type: "delete"; competition: Competition }
    | null
  >(null);
  const [pending, startTransition] = React.useTransition();

  const nameById = React.useMemo(
    () => new Map(roster.map((a) => [a.id, a.name])),
    [roster]
  );

  // "Upcoming" keeps meets running right now — from a planning point of view they
  // haven't happened yet. Past reads newest first, upcoming soonest first.
  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const withPhase = competitions
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q))
      .map((c) => ({ c, phase: phaseOf(c.startsOn, c.endsOn) }));
    const kept =
      filter === "all"
        ? withPhase
        : withPhase.filter(({ phase }) =>
            filter === "past" ? phase === "past" : phase !== "past"
          );
    return filter === "past" ? [...kept].reverse() : kept;
  }, [competitions, filter, query]);

  return (
    <main className="flex flex-1 flex-col p-6">
      {/* Toolbar, Vercel Deployments layout: first control left, the rest pushed right. */}
      <div className="mb-6 flex items-center gap-2">
        <SearchInput
          placeholder="Search competitions"
          className="mr-auto w-full max-w-64"
          value={query}
          onValueChange={setQuery}
        />
        <Select
          size="medium"
          aria-label="Filter competitions"
          className="w-auto"
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Button size="md" prefix={<PlusIcon />} onClick={() => setModal({ type: "form" })}>
          New competition
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={<FlagIcon />}
            title={
              query
                ? "No competitions match that search"
                : filter === "past"
                  ? "No past competitions"
                  : "No competitions yet"
            }
            description="Add a meet and enter the athletes who will compete in it."
          />
        </div>
      ) : (
        <div
          className={`grid gap-x-4 rounded border border-[var(--ds-gray-alpha-400)] ${GRID_COLS}`}
        >
          {rows.map(({ c, phase }) => {
            const weeks = weeksOut(c.startsOn);
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setModal({ type: "detail", competition: c })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setModal({ type: "detail", competition: c });
                  }
                }}
                className="col-span-full grid h-16 cursor-pointer grid-cols-subgrid items-center gap-x-4 border-b border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] bg-clip-padding px-3 first:rounded-t last:rounded-b last:border-b-0 hover:bg-[var(--ds-gray-100)]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {FEDERATION_LOGOS[c.federation] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      src={FEDERATION_LOGOS[c.federation]}
                      className="size-11 shrink-0 object-contain"
                    />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-gray-200)]">
                      <ChartActivityIcon className="size-4 text-[var(--ds-gray-900)]" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-copy-14 text-[var(--ds-gray-1000)]">
                      {c.name}
                    </span>
                    {c.location && (
                      <span className="truncate text-copy-13 text-[var(--ds-gray-900)]">
                        {c.location}
                      </span>
                    )}
                  </span>
                </span>

                {/* Status cell — dot in a 16px box (nudged -3px like Vercel), bold label, gray meta. */}
                <span className="flex min-w-0 items-center gap-1.5 text-copy-14 text-[var(--ds-gray-900)] tabular-nums">
                  <span className="-ml-[3px] flex h-5 items-center gap-1">
                    <span className="flex size-4 items-center justify-center">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: PHASE[phase].color }}
                      />
                    </span>
                    <span className="text-label-14 font-medium text-[var(--ds-gray-1000)]">
                      {PHASE[phase].label}
                    </span>
                  </span>
                  {weeks !== null && <span>{weeks}w out</span>}
                </span>

                <span className="hidden min-w-0 md:flex">
                  <Badge variant={FEDERATION_BADGE_VARIANT[c.federation] ?? "gray-subtle"} size="md">
                    {c.federation}
                  </Badge>
                </span>

                <span className="hidden min-w-0 md:flex">
                  <Badge variant="gray-subtle" size="md">
                    {c.type}
                  </Badge>
                </span>

                <span className="hidden min-w-0 lg:flex">
                  <Badge variant="gray-subtle" size="md">
                    {ageClassLabel(c.ageCategories)}
                  </Badge>
                </span>

                <span className="hidden shrink-0 items-center gap-1.5 lg:flex">
                  <UsersIcon className="size-4 shrink-0 text-[var(--ds-gray-900)]" />
                  <span className="whitespace-nowrap text-copy-14 text-[var(--ds-gray-1000)]">
                    {c.entries.length} {c.entries.length === 1 ? "athlete" : "athletes"}
                  </span>
                </span>

                <span className="flex items-center justify-end gap-2">
                  <span className="whitespace-nowrap text-copy-14 text-[var(--ds-gray-900)] tabular-nums">
                    {formatRange(c.startsOn, c.endsOn)}
                  </span>
                  {/* Menu clicks must not also trigger the row's detail view. */}
                  <span onClick={(e) => e.stopPropagation()}>
                    <DotsMenu
                      size="md"
                      label={`Actions for ${c.name}`}
                      items={[
                        { label: "Edit", onSelect: () => setModal({ type: "form", competition: c }) },
                        { separator: true },
                        {
                          label: "Delete",
                          destructive: true,
                          onSelect: () => setModal({ type: "delete", competition: c }),
                        },
                      ]}
                    />
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === "form" && (
        <CompetitionModal
          competition={modal.competition}
          roster={roster}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "detail" && (
        <CompetitionDetail
          competition={modal.competition}
          nameById={nameById}
          onEdit={() => setModal({ type: "form", competition: modal.competition })}
          onDelete={() => setModal({ type: "delete", competition: modal.competition })}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === "delete" && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setModal(null);
          }}
          title={`Delete ${modal.competition.name}?`}
          description="The competition and its athlete entries are removed. This can't be undone."
          footer={
            <>
              <Button variant="secondary" size="md" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant="error"
                size="md"
                loading={pending}
                onClick={() => {
                  const id = modal.competition.id;
                  startTransition(async () => {
                    await deleteCompetition(id);
                    setModal(null);
                  });
                }}
              >
                Delete
              </Button>
            </>
          }
        />
      )}
    </main>
  );
}

/** Label + value row for the detail sheet. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-label-13 text-[var(--ds-gray-900)]">{label}</span>
      <span className="text-copy-14 text-[var(--ds-gray-1000)]">{children}</span>
    </div>
  );
}

/** Read-only sheet with everything about one meet, opened by clicking its row. */
function CompetitionDetail({
  competition: c,
  nameById,
  onEdit,
  onDelete,
  onClose,
}: {
  competition: Competition;
  nameById: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const phase = phaseOf(c.startsOn, c.endsOn);
  const weeks = weeksOut(c.startsOn);
  const logo = FEDERATION_LOGOS[c.federation];
  const entries = [...c.entries].sort((a, b) =>
    (nameById.get(a.athleteId) ?? "").localeCompare(nameById.get(b.athleteId) ?? "")
  );

  return (
    <Modal
      open
      sticky
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" src={logo} className="size-8 shrink-0 object-contain" />
          ) : null}
          <span className="min-w-0 truncate">{c.name}</span>
        </span>
      }
      description={c.location ?? undefined}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onDelete}>
            Delete
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
            <Button size="md" onClick={onEdit}>
              Edit
            </Button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <span className="flex items-center gap-2 text-copy-14 text-[var(--ds-gray-900)] tabular-nums">
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: PHASE[phase].color }}
          />
          <span className="text-[var(--ds-gray-1000)]">{PHASE[phase].label}</span>
          {weeks !== null && <span>· {weeks}w out</span>}
        </span>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <Field label="Date">{formatRange(c.startsOn, c.endsOn)}</Field>
          <Field label="Type">{c.type}</Field>
          <Field label="Federation">{c.federation}</Field>
          <div className="col-span-2 flex flex-col gap-1.5">
            <span className="text-label-13 text-[var(--ds-gray-900)]">Age categories</span>
            {c.ageCategories.length ? (
              <span className="flex flex-wrap gap-1.5">
                {c.ageCategories.map((category) => (
                  <Badge key={category} variant="gray-subtle" size="sm">
                    {category}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-copy-14 text-[var(--ds-gray-1000)]">All categories</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-label-13 text-[var(--ds-gray-900)]">
            Athletes · {entries.length}
          </span>
          {entries.length === 0 ? (
            <p className="text-copy-14 text-[var(--ds-gray-900)]">No athletes entered yet.</p>
          ) : (
            <div className="rounded-lg shadow-[0_0_0_1px_var(--ds-gray-alpha-400)]">
              {entries.map((e) => {
                const detail = [e.ageCategory, e.weightClass].filter(Boolean).join(" · ");
                return (
                  <div
                    key={e.athleteId}
                    className="flex items-center justify-between gap-3 border-b border-[var(--ds-gray-alpha-400)] px-3 py-2.5 last:border-b-0"
                  >
                    <span className="min-w-0 truncate text-copy-14 text-[var(--ds-gray-1000)]">
                      {nameById.get(e.athleteId) ?? "Unknown athlete"}
                    </span>
                    <span className="shrink-0 text-copy-13 text-[var(--ds-gray-900)] tabular-nums">
                      {detail || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
