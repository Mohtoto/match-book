"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  CalendarIcon,
  InfoIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UploadPanel,
  type UploadPanelState,
} from "@/components/matchbook/upload-panel";
import { SupplierDialog } from "@/components/matchbook/supplier-dialog";
import { useSuppliers } from "@/lib/matchbook/hooks";
import {
  DEFAULT_DECLARED_TYPE,
  type DeclaredType,
} from "@/lib/matchbook/domain";

/**
 * Start a reconciliation: two files, one declaration, then column mapping.
 *
 * The declaration of `full` versus `delta` is given the most visual weight on
 * this page, because misreading a delta as a full catalogue is the most
 * expensive mistake available here — it is what would have a customer
 * deactivate products they still sell. It defaults to `delta`, the assumption
 * that cannot cause that.
 */
export default function NewRunPage() {
  const router = useRouter();
  const { suppliers, isLoading, mutate } = useSuppliers();

  const [supplierId, setSupplierId] = React.useState<string>("");
  const [declaredType, setDeclaredType] =
    React.useState<DeclaredType>(DEFAULT_DECLARED_TYPE);
  const [effectiveDate, setEffectiveDate] = React.useState("");

  const [catalogue, setCatalogue] = React.useState<UploadPanelState | null>(null);
  const [supplierFile, setSupplierFile] =
    React.useState<UploadPanelState | null>(null);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const canContinue = Boolean(supplierId && catalogue && supplierFile);

  const isFutureDated =
    effectiveDate !== "" && new Date(`${effectiveDate}T00:00:00`) > new Date();

  async function createRun() {
    if (!catalogue || !supplierFile) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/app/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          catalogueUploadId: catalogue.upload.id,
          supplierUploadId: supplierFile.upload.id,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        toast.error(body.error ?? "Could not start this comparison.");
        return;
      }

      router.push(`/app/runs/${body.run.id}`);
    } catch {
      toast.error("Could not start this comparison.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          New reconciliation
        </h1>
        <p className="text-sm text-muted-foreground">
          Your catalogue export on one side, the supplier&apos;s new price file
          on the other.
        </p>
      </div>

      {/* Step 1 — supplier */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Which supplier?</CardTitle>
          <CardDescription>
            Everything you confirm gets saved against this supplier and reused
            next time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-72" />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="w-72">
                  <SelectValue
                    placeholder={
                      suppliers.length === 0
                        ? "No suppliers yet"
                        : "Choose a supplier"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                <PlusIcon className="size-4" />
                New supplier
              </Button>

              {selectedSupplier && selectedSupplier.savedMappingCount > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {selectedSupplier.savedMappingCount.toLocaleString()} saved SKU
                  mappings
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — the customer's own catalogue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2 · Your catalogue export</CardTitle>
          <CardDescription>
            The list of what you stock, exported from your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadPanel
            kind="catalogue"
            title="Drop your catalogue export here"
            description="or click to choose a file"
            state={catalogue}
            onChange={setCatalogue}
          />
        </CardContent>
      </Card>

      {/* Step 3 — the supplier's file, and the declaration that matters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3 · The supplier&apos;s price file
          </CardTitle>
          <CardDescription>
            Tell us what kind of list this is before we read it.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadioGroup
            value={declaredType}
            onValueChange={(value) => setDeclaredType(value as DeclaredType)}
            className="gap-3"
            disabled={Boolean(supplierFile)}
          >
            <Label
              htmlFor="declared-delta"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
            >
              <RadioGroupItem value="delta" id="declared-delta" />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Only the items they&apos;re changing
                  <Badge variant="secondary" className="ml-2 font-normal">
                    safer
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  A product missing from this file means nothing at all.
                </span>
              </span>
            </Label>

            <Label
              htmlFor="declared-full"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
            >
              <RadioGroupItem value="full" id="declared-full" />
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  Their complete current catalogue
                </span>
                <span className="text-xs text-muted-foreground">
                  Anything you stock that is missing will be flagged as possibly
                  discontinued.
                </span>
              </span>
            </Label>
          </RadioGroup>

          {declaredType === "full" && (
            <Alert>
              <InfoIcon className="size-4" />
              <AlertDescription>
                Only choose this if the file really is everything they sell. On a
                partial list it would flag products as discontinued that you
                still buy.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="effective-date" className="flex items-center gap-2">
              <CalendarIcon className="size-3.5" />
              Effective date (optional)
            </Label>
            <Input
              id="effective-date"
              type="date"
              className="w-48"
              value={effectiveDate}
              disabled={Boolean(supplierFile)}
              onChange={(event) => setEffectiveDate(event.target.value)}
            />
            {isFutureDated && (
              <p className="text-xs text-muted-foreground">
                This is a future date — the report and the export will both say
                so.
              </p>
            )}
          </div>

          <UploadPanel
            kind="supplier_price"
            title="Drop the supplier's price file here"
            description="or click to choose a file"
            disabled={!supplierId}
            disabledReason="Choose a supplier first"
            metadata={{
              supplierId,
              declaredType,
              effectiveDate: effectiveDate || null,
            }}
            state={supplierFile}
            onChange={setSupplierFile}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {canContinue
            ? "Both files read. Next you'll tell us which column is which — once per supplier."
            : "Choose a supplier and add both files to continue."}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/app">Cancel</Link>
          </Button>
          <Button onClick={createRun} disabled={!canContinue || isCreating}>
            {isCreating && <Loader2Icon className="size-4 animate-spin" />}
            Continue to column mapping
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSaved={async (id) => {
          await mutate();
          setSupplierId(id);
        }}
      />
    </div>
  );
}
