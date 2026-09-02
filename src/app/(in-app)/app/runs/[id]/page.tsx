"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ConstructionIcon,
  FileSpreadsheetIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier } from "@/db/schema/suppliers";
import type { Upload } from "@/db/schema/uploads";
import type { ReconciliationRun } from "@/db/schema/reconciliation-runs";
import { DeclaredTypeBadge } from "@/components/matchbook/declared-type-badge";

type RunDetail = {
  run: ReconciliationRun;
  supplier: Supplier;
  catalogue: Upload;
  supplierFile: Upload;
};

function FileFacts({ upload, label }: { upload: Upload; label: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">
          {upload.originalFilename}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Rows</dt>
        <dd className="font-mono">{upload.rowCount?.toLocaleString() ?? "—"}</dd>
        {upload.sheetName && (
          <>
            <dt className="text-muted-foreground">Sheet</dt>
            <dd className="truncate font-mono">{upload.sheetName}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Header row</dt>
        <dd className="font-mono">{upload.headerRowIndex + 1}</dd>
      </dl>
      {upload.rawDeletedAt && (
        <p className="text-xs text-muted-foreground">
          Raw file deleted — this run can no longer be re-read.
        </p>
      )}
    </div>
  );
}

export default function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useSWR<RunDetail>(
    `/api/app/runs/${params.id}`
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-4">
        <Alert variant="destructive">
          <AlertDescription>
            We couldn&apos;t load this run.{" "}
            <Link href="/app/runs" className="underline">
              Back to run history
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { run, supplier, catalogue, supplierFile } = data;

  const effectiveDate = supplierFile.effectiveDate
    ? new Date(supplierFile.effectiveDate)
    : null;
  const isFutureDated = effectiveDate ? effectiveDate > new Date() : false;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" asChild>
          <Link href="/app/runs">
            <ArrowLeftIcon className="size-4" />
            Run history
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {supplier.name}
          </h1>
          <DeclaredTypeBadge declaredType={supplierFile.declaredType} />
          <Badge variant="outline" className="font-normal">
            {run.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Started{" "}
          {new Date(run.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      {/* A future effective date has to be visible on the face of the run. */}
      {isFutureDated && effectiveDate && (
        <Alert>
          <CalendarClockIcon className="size-4" />
          <AlertTitle>These prices start later</AlertTitle>
          <AlertDescription>
            This file is effective{" "}
            {effectiveDate.toLocaleDateString(undefined, { dateStyle: "long" })}.
            Anything you export will be labelled with that date.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FileFacts upload={catalogue} label="Your catalogue export" />
        <FileFacts
          upload={supplierFile}
          label={`Price file from ${supplier.name}`}
        />
      </div>

      {/*
        Honest placeholder. Build steps 2 onwards in the project skill's build
        order land here: column mapping, then the matching cascade, then the
        diff and change report, then export.
      */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ConstructionIcon className="size-4" />
            Column mapping is the next thing to build
          </CardTitle>
          <CardDescription>
            Both files are stored and parsed. What comes next, in order:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              Map the columns — part number, description, price, unit of measure,
              pack size — and save it against {supplier.name}
            </li>
            <li>Exact and normalised matching, with matched/unmatched counts</li>
            <li>Diff computation and the change report</li>
            <li>Manual mapping for unmatched lines, saved as confirmed</li>
            <li>Export using your ERP&apos;s template</li>
            <li>Sanity flags on implausible movements</li>
            <li>Fuzzy match suggestions, last</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
