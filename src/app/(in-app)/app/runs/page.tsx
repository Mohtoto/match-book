"use client";

import Link from "next/link";
import { HistoryIcon, PlusIcon } from "lucide-react";
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
import { useRuns } from "@/lib/matchbook/hooks";
import { DeclaredTypeBadge } from "@/components/matchbook/declared-type-badge";

/**
 * Run history — what was imported, when, and from which files.
 *
 * Not a dashboard. No charts. The question this page answers is "what did we do
 * last month, and can I see why", which is a list.
 */
export default function RunsPage() {
  const { runs, isLoading } = useRuns();

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Run history</h1>
          <p className="text-sm text-muted-foreground">
            Every comparison you&apos;ve run, and the files behind it.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/runs/new">
            <PlusIcon className="size-4" />
            New reconciliation
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : runs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <HistoryIcon className="size-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No runs yet</p>
            <p className="text-sm text-muted-foreground">
              Upload a catalogue export and a supplier price file to get started.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/app/runs/new">Start your first reconciliation</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Price file</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Run</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
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
                  <TableCell className="text-right font-mono text-xs">
                    {run.supplierRowCount?.toLocaleString() ?? "—"}
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
  );
}
