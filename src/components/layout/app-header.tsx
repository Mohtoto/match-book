"use client";

import { appConfig } from "@/lib/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@/components/layout/user-button";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/app", label: "Reconcile", exact: true },
  { href: "/app/runs", label: "Run history", exact: false },
  { href: "/app/suppliers", label: "Suppliers", exact: false },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-xs supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/app" className="flex items-center space-x-2">
              <span className="text-lg font-bold">{appConfig.projectName}</span>
            </Link>

            <nav className="flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <UserButton />
        </div>
      </div>
    </header>
  );
}
