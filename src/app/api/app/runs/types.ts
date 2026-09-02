import type { RunSummary } from "@/db/schema/reconciliation-runs";
import type { DeclaredType, RunStatus } from "@/lib/matchbook/domain";

export type RunListItem = {
  id: string;
  status: RunStatus;
  summaryJson: RunSummary | null;
  createdAt: string;
  completedAt: string | null;
  exportedAt: string | null;
  exportedLineCount: number | null;

  supplierId: string;
  supplierName: string;

  supplierFilename: string;
  /** Stated on the face of every report — misreading a delta is expensive. */
  declaredType: DeclaredType | null;
  effectiveDate: string | null;
  supplierRowCount: number | null;

  catalogueFilename: string;
  catalogueRowCount: number | null;
};

export type RunsResponse = { runs: RunListItem[] };

export type CreateRunResponse = {
  run: { id: string; status: RunStatus };
};
