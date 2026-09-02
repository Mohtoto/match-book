"use client";

import React from "react";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SupplierListItem } from "@/app/api/app/suppliers/types";

type SupplierDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create. */
  supplier?: SupplierListItem | null;
  onSaved: (supplierId: string) => void;
};

export function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: SupplierDialogProps) {
  const isEdit = Boolean(supplier);
  const [name, setName] = React.useState("");
  const [defaultCurrency, setDefaultCurrency] = React.useState("AUD");
  const [notes, setNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset to the supplier being edited each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? "");
    setDefaultCurrency(supplier?.defaultCurrency ?? "AUD");
    setNotes(supplier?.notes ?? "");
    setError(null);
  }, [open, supplier]);

  async function save() {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        isEdit ? `/api/app/suppliers/${supplier!.id}` : "/api/app/suppliers",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            defaultCurrency: defaultCurrency.toUpperCase(),
            notes: notes.trim() === "" ? null : notes,
          }),
        }
      );
      const body = await response.json();

      if (!response.ok) {
        setError(
          body.error ??
            body.issues?.fieldErrors?.name?.[0] ??
            "Could not save this supplier."
        );
        return;
      }

      toast.success(isEdit ? "Supplier updated" : `Added ${body.supplier.name}`);
      onSaved(body.supplier.id);
      onOpenChange(false);
    } catch {
      setError("Something went wrong saving this supplier.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit supplier" : "Add a supplier"}</DialogTitle>
          <DialogDescription>
            Column and SKU mappings are saved against the supplier, so next
            month&apos;s price file from them is almost instant.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier-name">Supplier name</Label>
            <Input
              id="supplier-name"
              value={name}
              autoFocus
              placeholder="Acme Electrical Supply"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim() !== "") void save();
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier-currency">Currency</Label>
            <Input
              id="supplier-currency"
              value={defaultCurrency}
              maxLength={3}
              className="w-24 font-mono uppercase"
              onChange={(event) => setDefaultCurrency(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Three-letter code. Files are compared within one currency — there
              is no conversion.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier-notes">Notes (optional)</Label>
            <Textarea
              id="supplier-notes"
              value={notes}
              rows={3}
              placeholder="Sends a delta list by email around the 25th."
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || name.trim() === ""}>
            {isSaving && <Loader2Icon className="size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
