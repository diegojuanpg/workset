"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  disabled?: boolean;
  href?: string;
  destructive?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  // The menu takes focus when it opens and the arrows walk it: without this the panel was
  // reachable only by pointer, so Shift+F10 opened a menu nobody could then choose from.
  React.useEffect(() => {
    if (!pos) return;
    panel.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  }, [pos]);

  const walk = (e: React.KeyboardEvent, step: number) => {
    e.preventDefault();
    const all = Array.from(
      panel.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [],
    );
    const at = all.indexOf(document.activeElement as HTMLElement);
    all[(at + step + all.length) % all.length]?.focus();
  };

  React.useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  return (
    <div
      ref={ref}
      onContextMenu={(e) => {
        e.preventDefault();
        // Viewport coordinates, not offsets from the trigger: the panel is portalled, so it
        // is no longer positioned against this element. Diverges from the DS source, which
        // renders the menu in place and gets clipped by any scroller or modal around it.
        setPos({ x: e.clientX, y: e.clientY });
      }}
      className={cn("relative", className)}
    >
      {children}
      {pos &&
        createPortal(
          <div
            ref={panel}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") walk(e, 1);
              if (e.key === "ArrowUp") walk(e, -1);
            }}
            style={{ top: pos.y, left: pos.x }}
            className="fixed z-50 min-w-52 material-menu p-1"
          >
            {items.map((item, i) => {
              if (item.separator)
                return (
                  <div key={i} className="my-1 h-px bg-[var(--ds-gray-400)]" />
                );
              const cls = cn(
                "flex h-9 items-center gap-2 rounded-md px-2 text-sm",
                item.disabled
                  ? "cursor-not-allowed text-[var(--ds-gray-600)]"
                  : item.destructive
                    ? "cursor-pointer text-[var(--ds-red-900)] hover:bg-[var(--ds-red-100)]"
                    : "cursor-pointer text-[var(--ds-gray-1000)] hover:bg-[var(--ds-gray-alpha-100)]",
              );
              const inner = (
                <>
                  {item.icon && (
                    <span className="flex size-4 shrink-0 items-center text-current">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.suffix && (
                    <span className="shrink-0 text-[var(--ds-gray-700)]">
                      {item.suffix}
                    </span>
                  )}
                </>
              );
              if (item.href && !item.disabled)
                return (
                  <a
                    key={i}
                    href={item.href}
                    role="menuitem"
                    className={cls}
                    onClick={() => setPos(null)}
                  >
                    {inner}
                  </a>
                );
              return (
                <div
                  key={i}
                  role="menuitem"
                  tabIndex={item.disabled ? -1 : 0}
                  aria-disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onSelect?.();
                    setPos(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    if (item.disabled) return;
                    item.onSelect?.();
                    setPos(null);
                  }}
                  className={cn(
                    cls,
                    "outline-none focus-visible:bg-[var(--ds-gray-alpha-100)]",
                  )}
                >
                  {inner}
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
