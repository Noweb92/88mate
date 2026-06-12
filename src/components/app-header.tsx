import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/jobs", label: "My jobs", key: "jobs" },
  { href: "/vault", label: "Vault", key: "vault" },
] as const;

export function AppHeader({
  active,
}: {
  active: "dashboard" | "jobs" | "vault";
}) {
  return (
    <header className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-xl font-extrabold tracking-tight"
        >
          88<span className="text-primary">Mate</span>
        </Link>
        <form action="/auth/signout" method="post">
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
      <nav className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-center text-sm font-medium transition-colors",
              active === tab.key
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
