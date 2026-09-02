"use client";

import { Footer } from "@/components/layout/footer";
import { AppHeader } from "@/components/layout/app-header";
import React from "react";
import useUser from "@/lib/users/useUser";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shimmer that matches the real layout: a 14-unit header with a brand and
 * three nav items, then a page heading and the primary action block.
 *
 * Uses the Skeleton component rather than hardcoded greys so it follows the
 * theme in dark mode.
 */
function DashboardSkeleton() {
  return (
    <div className="flex h-screen flex-col gap-4">
      <div className="border-b border-border/40 bg-background">
        <div className="mx-auto flex h-14 max-w-(--breakpoint-xl) items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Skeleton className="h-6 w-28" />
            <div className="hidden items-center gap-4 md:flex">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      <div className="grow p-4 sm:p-2">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 py-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* The primary action block. */}
          <Skeleton className="h-28 w-full rounded-lg" />

          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useUser();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col h-screen gap-4">
      <AppHeader />
      <div className="grow p-4 sm:p-2 max-w-7xl mx-auto w-full">{children}</div>
      <Footer />
    </div>
  );
}

export default AppLayout;
