/** What Ctrl+C holds on the calendar. Not the system clipboard — a block is not text — but
 *  localStorage, so a phase copied on one athlete can be pasted on another: the same program
 *  for two lifters is the commonest reason to copy anything here. */

export interface ClipMicro {
  /** Weeks after the block's own start. */
  offset: number;
  label: string;
  typeId: string | null;
}

interface ClipBlock {
  name: string;
  typeId: string | null;
  span: number;
  micros: ClipMicro[];
}

export type Clip =
  | ({ kind: "micro" } & Omit<ClipMicro, "offset">)
  | ({ kind: "block" } & ClipBlock)
  | {
      kind: "macro";
      name: string;
      typeId: string | null;
      /** In order, each with `offset` weeks after the first block's start. */
      blocks: (ClipBlock & { offset: number })[];
    };

const KEY = "workset:clipboard";

export function readClip(): Clip | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Clip) : null;
  } catch {
    return null;
  }
}

export function writeClip(clip: Clip): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(clip));
  } catch {
    // Private mode or a full store: the copy is simply lost, and paste says so.
  }
}

/** What the toast calls the thing that was copied. */
export function clipName(clip: Clip): string {
  return clip.kind === "micro" ? `microcycle ${clip.label}` : clip.name;
}
