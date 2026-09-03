import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WorksetMark } from "@/components/icons";

export const metadata: Metadata = { title: "Invite — Workset" };

const MESSAGES: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invite link has expired",
    body: "Ask your coach to send you a new one.",
  },
  self: {
    title: "You can't join your own roster",
    body: "That invite belongs to your own coach account.",
  },
  invalid: {
    title: "This invite link isn't valid",
    body: "It may have already been used. Ask your coach for a new one.",
  },
};

export default async function JoinErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const msg = MESSAGES[error ?? "invalid"] ?? MESSAGES.invalid;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex w-full items-center p-4 md:p-6">
        <Link aria-label="Workset home" href="/">
          <WorksetMark className="h-6 w-auto text-foreground" />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-heading-24 text-foreground">{msg.title}</h1>
        <p className="max-w-sm text-copy-14 text-muted-foreground">{msg.body}</p>
        <Button
          nativeButton={false}
          render={<Link href="/" />}
          size="md"
          variant="secondary"
        >
          Go to Workset
        </Button>
      </main>
    </div>
  );
}
