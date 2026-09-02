import type { Supplier } from "@/db/schema/suppliers";

export type SupplierListItem = Pick<
  Supplier,
  "id" | "name" | "defaultCurrency" | "notes"
> & {
  createdAt: string | Date | null;
  /**
   * Confirmed SKU mappings for this supplier. The number that tells the user
   * next month's upload will be quick.
   */
  savedMappingCount: number;
};

export type SuppliersResponse = { suppliers: SupplierListItem[] };
export type SupplierResponse = { supplier: Supplier };
