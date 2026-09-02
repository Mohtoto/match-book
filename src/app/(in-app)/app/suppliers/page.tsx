"use client";

import React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, TrashIcon, TruckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SupplierDialog } from "@/components/matchbook/supplier-dialog";
import { useSuppliers } from "@/lib/matchbook/hooks";
import type { SupplierListItem } from "@/app/api/app/suppliers/types";

export default function SuppliersPage() {
  const { suppliers, isLoading, mutate } = useSuppliers();
  const [editing, setEditing] = React.useState<SupplierListItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] =
    React.useState<SupplierListItem | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;

    const response = await fetch(`/api/app/suppliers/${pendingDelete.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      toast.success(`Removed ${pendingDelete.name}`);
      await mutate();
    } else {
      toast.error("Could not remove that supplier.");
    }

    setPendingDelete(null);
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Column and SKU mappings build up per supplier. The more you confirm,
            the faster each month gets.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setIsDialogOpen(true);
          }}
        >
          <PlusIcon className="size-4" />
          Add supplier
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <TruckIcon className="size-6 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No suppliers yet</p>
            <p className="text-sm text-muted-foreground">
              Add the first supplier whose price file you want to reconcile.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setEditing(null);
              setIsDialogOpen(true);
            }}
          >
            Add your first supplier
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Saved SKU mappings</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {supplier.defaultCurrency}
                  </TableCell>
                  <TableCell className="text-right">
                    {supplier.savedMappingCount > 0 ? (
                      <Badge variant="secondary" className="font-mono font-normal">
                        {supplier.savedMappingCount.toLocaleString()}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">none yet</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                    {supplier.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/app/runs/new`}>Reconcile</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(supplier);
                          setIsDialogOpen(true);
                        }}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(supplier)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        supplier={editing}
        onSaved={() => mutate()}
      />

      {/*
        Deleting a supplier throws away every mapping ever confirmed for them,
        which is the accumulated value of the account. Say so, in numbers.
      */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.savedMappingCount > 0 ? (
                <>
                  This also deletes{" "}
                  <strong>
                    {pendingDelete.savedMappingCount.toLocaleString()} confirmed
                    SKU mappings
                  </strong>{" "}
                  and their saved column layout. Next time you upload a file from
                  them, you would start from scratch. Your run history stays.
                </>
              ) : (
                <>
                  Their saved column layout goes too. Your run history stays.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep supplier</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Remove anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
