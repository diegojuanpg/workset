"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { SearchInput } from "@/components/ui/search-input";
import type { Athlete } from "@/components/panel/athlete-roster";

const ROW_H = 48;

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M1.5 6.5a5 5 0 1 1 10 0 5 5 0 0 1-10 0m5-6.5a6.5 6.5 0 1 0 4.04 11.6l3.43 3.43.53.53 1.06-1.06-.53-.53-3.43-3.43A6.5 6.5 0 0 0 6.5 0"
      clipRule="evenodd"
    />
  </svg>
);

// Roster search box — trigger for the Find overlay (also bound to the F key).
export function AthleteFind({
  athletes,
  username,
}: {
  athletes: Athlete[];
  username: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "f" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <SearchInput
        ref={triggerRef}
        readOnly
        aria-label="Search athletes"
        placeholder="Search athletes"
        shortcut="F"
        value=""
        onFocus={() => setOpen(true)}
        onChange={() => {}}
      />
      {open ? (
        <FindOverlay
          athletes={athletes}
          username={username}
          getTriggerBox={() => triggerRef.current?.parentElement ?? null}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.blur();
          }}
        />
      ) : null}
    </>
  );
}

// Vercel Find clone (CDP-measured): only the SURFACE morphs from the trigger
// rect (150ms ease, origin top-left) — content never scales, it fades 250ms/50.
// On close the overlay fades fast and the TRIGGER plays the reverse FLIP.
function FindOverlay({
  athletes,
  username,
  getTriggerBox,
  onClose,
}: {
  athletes: Athlete[];
  username: string;
  getTriggerBox: () => HTMLElement | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const [anchor] = React.useState(() => {
    const rect = getTriggerBox()?.getBoundingClientRect();
    // Vercel offsets the panel -4/-6px so it swallows the trigger.
    return rect ? { top: rect.top - 6, left: rect.left - 4, rect } : null;
  });
  const panelRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const closing = React.useRef(false);

  React.useLayoutEffect(() => {
    const rect = anchor?.rect;
    const surface = surfaceRef.current;
    if (rect && surface) {
      const sx = rect.width / surface.offsetWidth;
      const sy = rect.height / surface.offsetHeight;
      surface.animate(
        [{ transform: `translate(4px, 6px) scale(${sx}, ${sy})` }, { transform: "none" }],
        { duration: 150, easing: "ease" }
      );
    }
    contentRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 250,
      delay: 50,
      easing: "ease",
      fill: "backwards",
    });
  }, [anchor]);

  // Body scroll lock while the overlay is up (the panel is viewport-anchored).
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const close = React.useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const box = getTriggerBox();
    const surface = surfaceRef.current;
    if (box && surface) {
      const rect = box.getBoundingClientRect();
      box.animate(
        [
          {
            transformOrigin: "top left",
            transform: `translate(-4px, -6px) scale(${surface.offsetWidth / rect.width}, ${48 / rect.height})`,
          },
          { transformOrigin: "top left", transform: "none" },
        ],
        { duration: 150, easing: "ease" }
      );
    }
    // Soft exit for the overlay itself (Vercel cuts it; a 120ms fade reads cleaner).
    const fades = [panelRef.current, backdropRef.current]
      .filter(Boolean)
      .map((el) =>
        el!.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 120,
          easing: "ease",
          fill: "forwards",
        })
      );
    const done = () => {
      closing.current = false;
      onClose();
    };
    if (fades[0]) fades[0].onfinish = done;
    else done();
  }, [getTriggerBox, onClose]);

  const results = query.trim()
    ? athletes.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase()))
    : athletes;
  const selected = Math.min(sel, Math.max(0, results.length - 1));

  const go = (athlete: Athlete) => {
    close();
    router.push(`/${username}/athletes/${athlete.id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      const next =
        e.key === "ArrowDown"
          ? (selected + 1) % results.length
          : (selected - 1 + results.length) % results.length;
      setSel(next);
      listRef.current?.children[next + 1]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selected]) go(results[selected]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  if (!anchor) return null;

  return createPortal(
    <>
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 bg-[var(--ds-background-100)]/60 animate-find-backdrop"
        onClick={close}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Find athlete"
        onKeyDown={onKeyDown}
        style={{ top: anchor.top, left: anchor.left }}
        className="fixed z-50 w-96"
      >
        {/* Morphing surface behind the content — content itself never scales. */}
        <div
          ref={surfaceRef}
          aria-hidden
          className="absolute -inset-px origin-top-left material-modal"
        />
        <div ref={contentRef} className="relative">
          <label className="flex h-12 items-center border-b border-[var(--ds-gray-400)]">
            <span className="grid size-12 flex-none place-content-center text-[var(--ds-gray-700)] animate-find-icon">
              <SearchIcon />
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSel(0);
              }}
              placeholder="Find Athlete..."
              className="h-12 min-w-0 flex-1 border-none bg-transparent pr-4 text-copy-14 text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)] animate-find-input"
            />
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="grid size-12 flex-none cursor-pointer place-content-center"
            >
              <kbd className="inline-flex h-5 items-center rounded px-1.5 font-sans text-label-12 text-[var(--ds-gray-1000)] shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] animate-find-esc">
                Esc
              </kbd>
            </button>
          </label>

          <div ref={listRef} className="relative max-h-[18.5rem] overflow-y-auto p-1">
            {/* Sliding selection highlight — Vercel moves one surface, rows stay transparent. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-1 top-1 h-12 rounded-md bg-[var(--ds-gray-alpha-100)] transition-transform duration-100"
              style={{
                transform: `translateY(${selected * ROW_H}px)`,
                opacity: results.length === 0 ? 0 : 1,
              }}
            />
            {results.length === 0 ? (
              <p className="py-8 text-center text-copy-13 text-[var(--ds-gray-900)]">
                No athletes found.
              </p>
            ) : (
              results.map((athlete, i) => (
                <button
                  key={athlete.id}
                  type="button"
                  onClick={() => go(athlete)}
                  onMouseMove={() => setSel(i)}
                  className="relative flex h-12 w-full cursor-pointer items-center border-none bg-transparent text-left"
                >
                  <span className="grid size-11 flex-none place-content-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      src={generatedAvatarDataUri(athlete.id)}
                      className="size-5 rounded-full"
                    />
                  </span>
                  <span className="truncate pr-2 text-copy-14 text-[var(--ds-gray-1000)]">
                    {athlete.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
