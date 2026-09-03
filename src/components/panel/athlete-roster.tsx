"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DotsMenu } from "@/components/ui/dots-menu";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Scroller } from "@/components/ui/scroller";
import { AthleteFind } from "@/components/panel/athlete-find";
import { PlusIcon } from "@/components/icons";
import {
  createAthlete,
  deleteAthlete,
  regenerateInvite,
  renameAthlete,
  resetAllPlanned,
  setAthletePlanned,
} from "@/lib/athletes/actions";

export interface Athlete {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  planned: boolean;
  pending: boolean;
}

type RosterModal =
  | { type: "add" }
  | { type: "rename"; athlete: Athlete }
  | { type: "remove"; athlete: Athlete }
  | { type: "reset" }
  | { type: "invite"; token: string; name: string }
  | null;

export function AthleteRoster({
  athletes,
  username,
}: {
  athletes: Athlete[];
  username: string;
}) {
  const [modal, setModal] = React.useState<RosterModal>(null);
  const [sortDesc, setSortDesc] = React.useState(false);
  const [planFilter, setPlanFilter] = React.useState<"all" | "planned" | "unplanned">("all");
  const [, startTransition] = React.useTransition();
  const [optimistic, applyOptimistic] = React.useOptimistic(
    athletes,
    (state, patch: { id: string; planned: boolean } | "reset") =>
      patch === "reset"
        ? state.map((a) => ({ ...a, planned: false }))
        : state.map((a) => (a.id === patch.id ? { ...a, planned: patch.planned } : a))
  );

  let filtered = optimistic;
  if (planFilter !== "all") {
    filtered = filtered.filter((a) =>
      planFilter === "planned" ? a.planned : !a.planned
    );
  }
  // Server already sorts A–Z; desc is just the reverse.
  if (sortDesc) filtered = [...filtered].reverse();

  const plannedCount = optimistic.filter((a) => a.planned).length;

  const togglePlanned = (id: string, planned: boolean) => {
    startTransition(async () => {
      applyOptimistic({ id, planned });
      await setAthletePlanned(id, planned);
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      applyOptimistic("reset");
      await resetAllPlanned();
    });
  };

  const copyInvite = (athlete: Athlete) => {
    startTransition(async () => {
      const result = await regenerateInvite(athlete.id);
      if (result.token) {
        setModal({ type: "invite", token: result.token, name: athlete.name });
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pt-5">
      {/* Vercel-style Find: opens the overlay panel, doesn't filter the list below. */}
      <AthleteFind athletes={optimistic} username={username} />

      {/* relative: the ⋯ menu anchors to this row and overflows the panel, Vercel-style. */}
      <div className="relative flex items-center justify-between pt-3 pb-2">
        {/* Quiet metadata: the athlete names below are the content, not this. */}
        {optimistic.length > 0 ? (
          <span className="inline-flex h-5 items-center rounded-full bg-[var(--ds-gray-alpha-200)] px-2 text-label-12 font-medium tabular-nums text-[var(--ds-gray-900)]">
            {plannedCount}/{optimistic.length} Planned
          </span>
        ) : (
          <span />
        )}
        <DotsMenu
          size="md"
          align="start"
          anchor="parent"
          menuClassName="w-max min-w-56"
          active={planFilter !== "all"}
          items={[
            { section: "Filter" },
            { label: "All athletes", checked: planFilter === "all", onSelect: () => setPlanFilter("all") },
            { label: "Planned", checked: planFilter === "planned", onSelect: () => setPlanFilter("planned") },
            { label: "Unplanned", checked: planFilter === "unplanned", onSelect: () => setPlanFilter("unplanned") },
            { separator: true },
            { section: "Sort" },
            { label: "A–Z", checked: !sortDesc, onSelect: () => setSortDesc(false) },
            { label: "Z–A", checked: sortDesc, onSelect: () => setSortDesc(true) },
            { separator: true },
            {
              label: "Reset planning",
              disabled: plannedCount === 0,
              onSelect: () => setModal({ type: "reset" }),
            },
            { separator: true },
            // Vercel "Create Team"-style footer row.
            {
              label: "Add athlete",
              description: "Add a new athlete to your roster",
              icon: <PlusIcon className="size-4" />,
              onSelect: () => setModal({ type: "add" }),
            },
          ]}
        />
      </div>

      {/* Scroller fades clipped rows at the edges — items sink under the footer.
          -mr-3 pulls the scrollbar to the panel border; pr-3 keeps rows in place. */}
      <Scroller className="-mr-3 min-h-0 flex-1 pb-2">
        <div className="pr-3">
        {optimistic.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
            <p className="text-copy-13 text-muted-foreground">
              No athletes in your roster yet.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModal({ type: "add" })}
            >
              Add athlete
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-copy-13 text-muted-foreground">
            No athletes match the current filter.
          </p>
        ) : (
          filtered.map((athlete) => (
            <div
              key={athlete.id}
              className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--ds-gray-alpha-100)]"
            >
              <Link
                href={`/${username}/athletes/${athlete.id}`}
                className="flex min-w-0 flex-1 flex-col"
              >
                <span className="truncate text-copy-14 font-medium text-foreground">
                  {athlete.name}
                </span>
                <span className="text-copy-13 text-muted-foreground">
                  {/* "Week: n/m" once the training-block system exists. */}
                  {athlete.pending ? "Invitation pending" : "Week: —"}
                </span>
              </Link>
              <div className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <DotsMenu
                  size="md"
                  items={[
                    ...(athlete.pending
                      ? [
                          {
                            label: "Copy invite link",
                            onSelect: () => copyInvite(athlete),
                          } as const,
                          { separator: true } as const,
                        ]
                      : []),
                    {
                      label: "Rename",
                      onSelect: () => setModal({ type: "rename", athlete }),
                    },
                    { separator: true },
                    {
                      label: "Remove",
                      destructive: true,
                      onSelect: () => setModal({ type: "remove", athlete }),
                    },
                  ]}
                />
              </div>
              <Checkbox
                aria-label={`Planned: ${athlete.name}`}
                checked={athlete.planned}
                onCheckedChange={(checked) =>
                  togglePlanned(athlete.id, checked === true)
                }
              />
            </div>
          ))
        )}
        </div>
      </Scroller>

      {modal?.type === "add" ? (
        <AddAthleteModal
          onClose={() => setModal(null)}
          onCreated={(token, name) => setModal({ type: "invite", token, name })}
        />
      ) : modal?.type === "rename" ? (
        <AthleteNameModal
          title="Rename athlete"
          submitLabel="Save"
          initialFirst={modal.athlete.firstName}
          initialLast={modal.athlete.lastName ?? ""}
          onClose={() => setModal(null)}
          onSubmit={(first, last) => renameAthlete(modal.athlete.id, first, last)}
        />
      ) : modal?.type === "invite" ? (
        <InviteLinkModal
          name={modal.name}
          token={modal.token}
          onClose={() => setModal(null)}
        />
      ) : modal?.type === "remove" ? (
        <ConfirmModal
          title={`Remove ${modal.athlete.name}?`}
          description="The athlete will be removed from your roster. This cannot be undone."
          confirmLabel="Remove"
          onClose={() => setModal(null)}
          onConfirm={() => deleteAthlete(modal.athlete.id)}
        />
      ) : modal?.type === "reset" ? (
        <ConfirmModal
          title="Reset planning?"
          description={`${plannedCount} planned ${plannedCount === 1 ? "athlete" : "athletes"} will be unmarked. This cannot be undone.`}
          confirmLabel="Reset"
          onClose={() => setModal(null)}
          onConfirm={handleReset}
        />
      ) : null}
    </div>
  );
}

// Add: collect first/last, create the stub, hand the invite token back for display.
function AddAthleteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (token: string, name: string) => void;
}) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!first.trim() || pending) return;
    startTransition(async () => {
      const result = await createAthlete(first, last);
      if (result.error) {
        setError(result.error);
      } else if (result.token) {
        onCreated(result.token, [first.trim(), last.trim()].filter(Boolean).join(" "));
      }
    });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Add athlete"
      description="A temporary name — they can edit it when they set up their account."
      initialFocusRef={inputRef}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button size="md" disabled={!first.trim()} loading={pending} onClick={submit}>
            Add
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          ref={inputRef}
          label="First name"
          placeholder="First name"
          value={first}
          maxLength={64}
          error={error ?? undefined}
          onChange={(e) => {
            setFirst(e.target.value);
            setError(null);
          }}
        />
        <Input
          label="Last name"
          placeholder="Last name (optional)"
          value={last}
          maxLength={64}
          onChange={(e) => setLast(e.target.value)}
        />
      </form>
    </Modal>
  );
}

// Shows the single-use invite link for the coach to copy and send.
function InviteLinkModal({
  name,
  token,
  onClose,
}: {
  name: string;
  token: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/join/${token}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Invite ${name}`}
      description="Send this link so they can set up their account. It works once and expires in 7 days."
      footer={
        <Button size="md" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="flex items-center gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <Button variant="secondary" size="md" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Modal>
  );
}

// First/last name editor — used by Rename.
function AthleteNameModal({
  title,
  submitLabel,
  initialFirst = "",
  initialLast = "",
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initialFirst?: string;
  initialLast?: string;
  onClose: () => void;
  onSubmit: (first: string, last: string) => Promise<{ error?: string }>;
}) {
  const [first, setFirst] = React.useState(initialFirst);
  const [last, setLast] = React.useState(initialLast);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!first.trim() || pending) return;
    startTransition(async () => {
      const result = await onSubmit(first, last);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      initialFocusRef={inputRef}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button size="md" disabled={!first.trim()} loading={pending} onClick={submit}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          ref={inputRef}
          label="First name"
          placeholder="First name"
          value={first}
          maxLength={64}
          error={error ?? undefined}
          onChange={(e) => {
            setFirst(e.target.value);
            setError(null);
          }}
        />
        <Input
          label="Last name"
          placeholder="Last name (optional)"
          value={last}
          maxLength={64}
          onChange={(e) => setLast(e.target.value)}
        />
      </form>
    </Modal>
  );
}

// Destructive confirmation — shared by Remove athlete and Reset planning.
function ConfirmModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<{ error?: string } | void> | void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const confirm = () => {
    startTransition(async () => {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="error" size="md" loading={pending} onClick={confirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error ? <p className="text-copy-14 text-[var(--ds-red-900)]">{error}</p> : null}
    </Modal>
  );
}
