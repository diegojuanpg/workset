import Link from "next/link";
import { WorksetMark } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

interface AuthHeaderProps {
  action?: { label: string; href: string };
  showSignOut?: boolean;
}

export function AuthHeader({ action, showSignOut = false }: AuthHeaderProps) {
  return (
    <header className="flex w-full items-center justify-between p-4 md:p-6">
      <Link aria-label="Workset home" href="/">
        <WorksetMark className="h-6 w-auto text-foreground" />
      </Link>
      {action ? (
        <Button
          nativeButton={false}
          render={<Link href={action.href} />}
          size="sm"
          variant="secondary"
        >
          {action.label}
        </Button>
      ) : showSignOut ? (
        <form action={signOut}>
          <Button size="sm" type="submit" variant="secondary">
            Log Out
          </Button>
        </form>
      ) : null}
    </header>
  );
}
