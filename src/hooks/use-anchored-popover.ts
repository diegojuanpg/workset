"use client";

import * as React from "react";

/**
 * Places a portalled panel against its trigger. Portalling is what lets a popover escape the
 * modal bodies in this app, all of which clip their overflow — but it also means position has
 * to be computed by hand. The panel renders once hidden so its height can be measured, then
 * lands below the trigger, or above it when there is no room.
 *
 * Returns refs for the trigger and the panel, plus the style the panel should carry.
 */
export interface AnchoredPopoverOptions {
  /** Which edges line up: "start" puts the panel's left on the anchor's left, "end" its
   *  right on the anchor's right. A menu hanging off a control at the right of a row wants
   *  "end", or it opens away from the row and the clamp drags it back. */
  align?: "start" | "end";
  /** Measure the trigger's nearest positioned ancestor instead of the trigger, for a panel
   *  meant to line up with the row it sits in rather than with the button. */
  toOffsetParent?: boolean;
}

export function useAnchoredPopover(
  open: boolean,
  { align = "start", toOffsetParent = false }: AnchoredPopoverOptions = {},
) {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const self = anchorRef.current;
      // `anchor="parent"` rows line the panel up with the row, top edge included — that is
      // what the caller asked for by naming the parent, so the whole rect comes from it.
      const anchorEl =
        toOffsetParent && self?.offsetParent instanceof HTMLElement
          ? self.offsetParent
          : self;
      const trigger = anchorEl?.getBoundingClientRect();
      const panel = panelRef.current?.getBoundingClientRect();
      if (!trigger || !panel) return;
      const below = trigger.bottom + 4;
      setPos({
        top:
          below + panel.height > window.innerHeight - 8
            ? Math.max(8, trigger.top - 4 - panel.height)
            : below,
        left: Math.max(
          8,
          Math.min(
            align === "end" ? trigger.right - panel.width : trigger.left,
            window.innerWidth - panel.width - 8,
          ),
        ),
      });
    };
    place();
    window.addEventListener("resize", place);
    // Capture phase: the scroll may happen in a modal body, which doesn't bubble to window.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, toOffsetParent]);

  /** Cleared by the trigger before opening, so a stale position can't flash the panel at the
   *  previous spot for one frame before the measuring pass corrects it. */
  const reset = React.useCallback(() => setPos(null), []);

  // Transparent rather than `visibility: hidden` for the measuring pass: a hidden element
  // cannot take focus, so a panel that wants its field focused on open silently lost the call.
  // Transparent lays out identically, and `pointerEvents: none` keeps the frame unclickable.
  const style: React.CSSProperties = pos
    ? { top: pos.top, left: pos.left }
    : { top: 0, left: 0, opacity: 0, pointerEvents: "none" };

  // Whether the panel has been measured and placed. Callers that move focus into it need to
  // wait for this — before it, the panel is still sitting at the origin being measured.
  return { anchorRef, panelRef, style, reset, placed: pos !== null };
}
