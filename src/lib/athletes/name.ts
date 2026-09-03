/** Coach-facing display name for a roster athlete (placeholder or claimed). */
export function athleteName(first: string, last: string | null): string {
  return [first, last].filter(Boolean).join(" ");
}
