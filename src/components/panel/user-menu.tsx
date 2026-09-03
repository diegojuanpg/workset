"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDismissable } from "@/hooks/use-dismissable";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import {
  BellIcon,
  FaceSmileIcon,
  HomeIcon,
  LogoutIcon,
  MoreHorizontalIcon,
  SettingsGearIcon,
} from "@/components/icons";

interface UserMenuProps {
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

// CDP-measured from vercel.com account menu: 288px surface, 6px padding,
// 36px rows (14px/400, 8px x-padding, 6px radius), icons 16px gray-900.
const itemClass =
  "flex h-9 w-full cursor-pointer items-center justify-between rounded-md px-2 text-copy-14 text-foreground transition-colors hover:bg-[var(--ds-gray-alpha-100)]";

// Vercel-style account menu anchored to the panel footer.
export function UserMenu({ username, displayName, email, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useDismissable(ref, open, close);

  return (
    <div ref={ref} className="relative">
      {/* CDP-measured from vercel.com sidebar footer: 36px rounded-full pill
          trigger (20px avatar, 14px/400 name, 10/8px x-padding, 8px gap) +
          24px circle buttons (background-100, gray-alpha-400 ring, gray-900 icon). */}
      <div className="flex w-full items-center">
        <button
          type="button"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full pr-2 pl-2.5 transition-colors hover:bg-[var(--ds-gray-alpha-100)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={displayName}
            src={avatarUrl}
            className="size-5 shrink-0 rounded-full object-cover"
          />
          <span className="min-w-0 truncate text-copy-14 text-foreground">
            {username}
          </span>
        </button>
        <button
          type="button"
          aria-label="Open account menu"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "ml-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] transition-colors hover:text-foreground",
            open && "bg-[var(--ds-gray-alpha-200)] text-foreground"
          )}
        >
          <MoreHorizontalIcon className="size-3.5" />
        </button>
        {/* Notifications arrive in a later phase. */}
        <button
          type="button"
          aria-label="Notifications"
          disabled
          className="ml-1 grid size-6 shrink-0 place-items-center rounded-full border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] text-[var(--ds-gray-900)] opacity-50"
        >
          <BellIcon className="size-3.5" />
        </button>
      </div>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-1.5 w-72 origin-bottom-left material-menu p-1.5 animate-menu-in-up"
        >
          <div className="flex items-start justify-between gap-3 px-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-copy-14 font-medium text-foreground">
                {username}
              </p>
              <p className="truncate text-copy-13 text-[var(--ds-gray-900)]">
                {email}
              </p>
            </div>
            <Link
              href={`/${username}/settings`}
              aria-label="Settings"
              onClick={close}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-alpha-200)] hover:text-foreground"
            >
              <SettingsGearIcon className="size-4" />
            </Link>
          </div>

          <div className="-mx-1.5 my-1.5 h-px bg-[var(--ds-gray-200)]" />

          {/* No feedback backend yet. */}
          <div
            role="menuitem"
            aria-disabled
            className="flex h-9 w-full items-center justify-between rounded-md px-2 text-copy-14 text-[var(--ds-gray-600)]"
          >
            Feedback
            <FaceSmileIcon className="size-4" />
          </div>

          <div className="flex h-9 w-full items-center justify-between rounded-md px-2 text-copy-14 text-foreground">
            Theme
            <ThemeSwitcher small />
          </div>

          <Link href="/home" role="menuitem" onClick={close} className={itemClass}>
            Home Page
            <HomeIcon className="size-4 text-[var(--ds-gray-900)]" />
          </Link>

          <form action={signOut}>
            <button type="submit" role="menuitem" className={itemClass}>
              Log Out
              <LogoutIcon className="size-4 text-[var(--ds-gray-900)]" />
            </button>
          </form>

          <div className="pt-1.5 pb-0.5">
            {/* No billing yet — visual only. */}
            <Button variant="primary" size="sm" className="w-full">
              Upgrade to Pro
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
