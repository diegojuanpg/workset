import Link from "next/link";
import { WorksetMark } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  action?: { label: string; href: string };
}

export function AuthHeader({ action }: AuthHeaderProps) {
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
      ) : null}
    </header>
  );
}
