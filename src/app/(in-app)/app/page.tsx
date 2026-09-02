"use client";

import React from "react";
import Link from "next/link";
import { ArrowRightIcon, PlusIcon, TruckIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRuns, useSuppliers } from "@/lib/matchbook/hooks";
import { DeclaredTypeBadge } from "@/components/matchbook/declared-type-badge";

/**
 * The landing screen inside the app.
 *
 * Deliberately not a dashboard — no charts, no trend graphs, no stat tiles.
 * The scope fence rules those out, and they would be the wrong thing anyway:
 * someone arriving here has a supplier price file open in another window and
 * wants to get on with it. So the primary action is the whole page, with recent
 * runs underneath for picking up where they left off.
 */
export default function AppHomepage() {
  const { runs, isLoading: runsLoading } = useRuns();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();

  const recentRuns = runs.slice(0, 5);
  const hasSuppliers = suppliers.length > 0;

  return (
    <div className="flex flex-col gap-8 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reconcile a price file
        </h1>
        <p className="text-sm text-muted-foreground">
          Your catalogue export plus a supplier&apos;s new prices, and you get
          back what changed and a file your system will accept.
        </p>
      </div>

      {/* The primary action, given the weight it deserves. */}
      <Link
        href="/app/runs/new"
        className="group flex items-center gap-5 rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary hover:bg-primary/5"
      >
        <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10">
          <UploadIcon className="size-6" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base font-medium">Start a new reconciliation</span>
          <span className="text-sm text-muted-foreground">
            Two files. Map the columns once per supplier, never again.
          </span>
        </div>
        <ArrowRightIcon className="ml-auto size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>

      {/* Nudge toward the first supplier only when there are none. */}
      {!suppliersLoading && !hasSuppliers && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border p-4">
          <TruckIcon className="size-4 text-muted-foreground" />
          <p className="text-sm">
            <span className="font-medium">Add your first supplier</span>
            <span className="text-muted-foreground">
              {" "}
              — mappings are saved against them, so month two is the quick one.
            </span>
          </p>
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link href="/app/suppliers">
              <PlusIcon className="size-4" />
              Add supplier
            </Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent runs</h2>
          {runs.length > 5 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/runs">See all {runs.length}</Link>
            </Button>
          )}
        </div>

        {runsLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : recentRuns.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nothing yet. Your runs will be listed here so you can see what you
            imported and why.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Price file</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      {run.supplierName}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {run.supplierFilename}
                    </TableCell>
                    <TableCell>
                      <DeclaredTypeBadge declaredType={run.declaredType} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {run.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(run.createdAt).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/runs/${run.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
