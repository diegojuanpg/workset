"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { generatedAvatarDataUri } from "@/lib/avatar";
import { ChevronUpDownIcon, SidebarLeftIcon, SlashForwardIcon } from "@/components/icons";
import { DotsMenu } from "@/components/ui/dots-menu";
import { SidePanel, type PanelProfile } from "@/components/panel/side-panel";
import type { Athlete } from "@/components/panel/athlete-roster";

// Athlete sub-sections, navigated from the breadcrumb section dropdown.
const ATHLETE_SECTIONS = [
  { label: "Dashboard", path: "" },
  { label: "Planning", path: "/planning" },
  { label: "Nutrition", path: "/nutrition" },
  { label: "Meet Plan", path: "/meet-plan" },
  { label: "Billing", path: "/billing" },
];

// Section title centred in the top bar (Vercel puts "Overview" there). Keyed by the
// path left over after the coach namespace; athlete pages use the breadcrumb instead.
const SECTION_TITLES: Record<string, string> = {
  "": "Dashboard",
  "/messages": "Messages",
  "/library": "Library",
  "/competitions": "Competitions",
  "/settings": "Account Settings",
  "/settings/programming": "Programming Settings",
};

const COLLAPSE_KEY = "workset:panel-collapsed";
const WIDTH_KEY = "workset:panel-width";
// Vercel-measured resize bounds: free-follow while dragging, clamp max 400;
// release <120 collapses, release under the 240 minimum snaps to it.
const DEFAULT_W = 250;
const MIN_W = 240;
const MAX_W = 400;
const COLLAPSE_W = 120;

interface PanelShellProps extends PanelProfile {
  athletes: Athlete[];
  children: React.ReactNode;
}

// Vercel-style collapsible sidebar: drag the border left, the border chevron,
// or the panel-header button hide it; the persistent top bar reopens it.
export function PanelShell({ children, athletes, ...profile }: PanelShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [width, setWidth] = React.useState(DEFAULT_W);
  const [dragging, setDragging] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Athlete crumb for the top bar, derived from the URL — no extra fetch.
  const athleteId = pathname?.match(/\/athletes\/([^/]+)/)?.[1];
  const athlete = athleteId ? athletes.find((a) => a.id === athleteId) : null;
  const athleteBase = athlete ? `/${profile.username}/athletes/${athlete.id}` : "";
  const section = athlete
    ? (ATHLETE_SECTIONS.find(
        (s) => s.path !== "" && pathname.startsWith(athleteBase + s.path)
      ) ?? ATHLETE_SECTIONS[0])
    : null;
  const sectionTitle = athlete
    ? null
    : SECTION_TITLES[pathname.replace(`/${profile.username}`, "")];

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time localStorage read after hydration
    if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    if (stored >= MIN_W && stored <= MAX_W) setWidth(stored);
  }, []);

  const setAndStore = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem(COLLAPSE_KEY, String(value));
    if (!value) {
      // Reopening always comes back at the default width.
      setWidth(DEFAULT_W);
      localStorage.removeItem(WIDTH_KEY);
    }
  };

  // Live resize (Vercel behavior): width follows the pointer freely up to MAX_W.
  // On release: <COLLAPSE_W collapses, <MIN_W snaps to the minimum, else it sticks.
  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const widthAt = (x: number) => Math.min(MAX_W, Math.max(0, startW + x - startX));
    const onMove = (ev: PointerEvent) => setWidth(widthAt(ev.clientX));
    const onUp = (ev: PointerEvent) => {
      const w = widthAt(ev.clientX);
      cleanup();
      if (w < COLLAPSE_W) {
        setWidth(startW);
        setAndStore(true);
        return;
      }
      const final = Math.max(MIN_W, w);
      setWidth(final);
      localStorage.setItem(WIDTH_KEY, String(final));
    };
    const cleanup = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Collapse is instant — Vercel doesn't animate the width. */}
      <aside
        style={{ width: collapsed ? 0 : width }}
        className={cn(
          "sticky top-0 z-30 h-screen shrink-0 border-border bg-[var(--ds-background-200)]",
          // Only clip while the aside is narrower than its content: collapsed or
          // mid-drag. Otherwise menus (user menu, roster ⋯) must escape the panel.
          (collapsed || dragging) && "overflow-hidden",
          !collapsed && "border-r"
        )}
      >
        {/* Inner width matches the live width so content reflows while resizing. */}
        <div style={{ width: Math.max(width, MIN_W) }} className="h-full">
          <SidePanel
            {...profile}
            athletes={athletes}
            onHide={() => setAndStore(true)}
          />
        </div>
      </aside>

      {!collapsed ? (
        // Zero-width sticky strip sitting on the border: drag handle + chevron.
        <div className="group sticky top-0 z-40 h-screen w-0">
          {/* Vercel hit area: 16px extending into the content side of the border. */}
          <div
            onPointerDown={onHandlePointerDown}
            className="absolute inset-y-0 left-0 w-4 cursor-col-resize"
          />
          {/* Chevron shows after a 150ms hover delay; its glyph zooms 90→100%. */}
          <button
            type="button"
            aria-label="Hide sidebar"
            title="Hide sidebar"
            onClick={() => setAndStore(true)}
            className="absolute top-1/2 -left-3 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[var(--ds-gray-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] opacity-0 transition-opacity delay-150 duration-150 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden
              className="scale-90 transition-transform duration-150 group-hover:scale-100"
            >
              <path
                fillRule="evenodd"
                d="m10.5 14.06-.53-.53-4.82-4.82a1 1 0 0 1 0-1.42l4.82-4.82.53-.53L11.56 3l-.53.53L6.56 8l4.47 4.47.53.53z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Persistent top bar — future home of section navigation. */}
        <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          {collapsed ? (
            <>
              <button
                type="button"
                aria-label="Open sidebar"
                title="Open sidebar"
                onClick={() => setAndStore(false)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--ds-gray-alpha-200)] hover:text-foreground"
              >
                <SidebarLeftIcon className="size-4" />
              </button>
              {/* Vercel separator between the sidebar toggle and the breadcrumb slot. */}
              <div aria-hidden className="h-5 w-px bg-[var(--ds-gray-alpha-400)]" />
            </>
          ) : null}
          {athlete && section ? (
            <div className="flex min-w-0 items-center gap-2">
              {/* Athlete crumb — display only; switching athletes lives in the panel. */}
              <div className="flex min-w-0 items-center gap-2 px-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src={generatedAvatarDataUri(athlete.id)}
                  className="size-5 shrink-0 rounded-full"
                />
                <span className="truncate text-copy-14 font-medium tracking-[-0.02em] text-foreground">
                  {athlete.name}
                </span>
              </div>
              {/* Vercel breadcrumb slash (CDP-cloned SVG, gray-alpha-400). */}
              <SlashForwardIcon className="size-4 shrink-0 text-[var(--ds-gray-alpha-400)]" />
              {/* Section breadcrumb: chevron dropdown navigates the athlete sections. */}
              <DotsMenu
                align="start"
                label="Change section"
                trigger={
                  // Vercel section title: 14px/500, gray-900, -0.02em (CDP-measured).
                  <span className="flex items-center gap-1 text-copy-14 font-medium tracking-[-0.02em] text-[var(--ds-gray-900)]">
                    {section.label}
                    <ChevronUpDownIcon className="size-4 shrink-0 text-[var(--ds-gray-700)]" />
                  </span>
                }
                items={ATHLETE_SECTIONS.map(({ label, path }) => ({
                  label,
                  checked: section.path === path,
                  onSelect: () => router.push(`${athleteBase}${path}`),
                }))}
              />
            </div>
          ) : null}
          {sectionTitle ? (
            // Centred on the bar itself, not on the leftover space — stays put whether
            // or not the sidebar toggle is showing.
            <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-copy-14 font-medium tracking-[-0.02em] text-foreground">
              {sectionTitle}
            </h1>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
