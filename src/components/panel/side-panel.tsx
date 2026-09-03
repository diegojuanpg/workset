"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpenIcon,
  ChevronLeftIcon,
  FlagIcon,
  GridSquareIcon,
  MessageIcon,
  SidebarLeftIcon,
  WorksetMark,
} from "@/components/icons";
import { AthleteRoster, type Athlete } from "@/components/panel/athlete-roster";
import { UserMenu } from "@/components/panel/user-menu";

export interface PanelProfile {
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

interface SidePanelProps extends PanelProfile {
  athletes: Athlete[];
  onHide: () => void;
}

const SECTIONS = [
  { label: "Dashboard", path: "", icon: GridSquareIcon, exact: true },
  { label: "Messages", path: "/messages", icon: MessageIcon },
  { label: "Library", path: "/library", icon: BookOpenIcon },
  { label: "Competitions", path: "/competitions", icon: FlagIcon },
];

/* Settings takes over the panel rather than nesting under it — the roster and the app
   sections have nothing to do with the settings you are editing, and the back row is the
   only way out. Vercel's settings nav carries no icons, and neither does this one. */
const SETTINGS_SECTIONS = [
  { label: "Account", path: "/settings", icon: null, exact: true },
  { label: "Programming", path: "/settings/programming", icon: null },
];

export function SidePanel({
  username,
  displayName,
  email,
  avatarUrl,
  athletes,
  onHide,
}: SidePanelProps) {
  const pathname = usePathname();
  const inSettings = pathname.startsWith(`/${username}/settings`);
  const sections = inSettings ? SETTINGS_SECTIONS : SECTIONS;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between pt-3 pr-2 pl-4">
        <Link
          href={`/${username}`}
          className="flex items-center gap-2 text-foreground"
        >
          <WorksetMark className="size-5" />
          <span className="text-label-14 font-medium">Workset</span>
        </Link>
        <button
          type="button"
          onClick={onHide}
          title="Hide sidebar"
          className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--ds-gray-alpha-200)] hover:text-foreground"
        >
          <SidebarLeftIcon className="size-4" />
        </button>
      </header>

      {inSettings ? (
        <Link
          href={`/${username}`}
          className="mx-2 mt-4 flex h-9 items-center gap-2.5 rounded-md pl-3 text-label-14 font-medium tracking-[-0.02em] text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-alpha-100)] hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4 shrink-0" />
          Settings
        </Link>
      ) : null}

      {/* CDP-measured from vercel.com sidebar nav: 36px rows, 6px radius, 16px
          icon inset 12px, 10px icon-label gap, 14px/500 label with -0.02em
          tracking, active bg gray-200, inactive gray-900, 1px row gap. */}
      <nav className={cn("flex flex-col gap-px px-2", inSettings ? "pt-1" : "pt-4")}>
        {sections.map(({ label, path, icon: Icon, exact }) => {
          const href = `/${username}${path}`;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-md text-label-14 font-medium tracking-[-0.02em] transition-colors",
                // Without an icon the label takes the inset the icon would have had, so
                // both navs start their text on the same vertical line.
                Icon ? "pl-3" : "pl-[34px]",
                active
                  ? "bg-[var(--ds-gray-200)] text-foreground"
                  : "text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-alpha-100)] hover:text-foreground"
              )}
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              {label}
            </Link>
          );
        })}
      </nav>

      {inSettings ? (
        <div className="flex-1" />
      ) : (
        <>
          {/* Zone divider: app navigation above, athlete workspace below. */}
          <div className="mx-3 mt-4 h-px bg-[var(--ds-gray-200)]" />
          <AthleteRoster athletes={athletes} username={username} />
        </>
      )}

      <footer className="p-2">
        <UserMenu
          username={username}
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
        />
      </footer>
    </div>
  );
}
