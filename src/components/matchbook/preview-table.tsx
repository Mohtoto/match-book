"use client";

import type { ParsedFile } from "@/lib/matchbook/parse/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/**
 * The parsed file, as read.
 *
 * Rendered in a monospace font on purpose: the user's whole question at this
 * stage is "did it keep my part numbers intact", and `0012345` versus `12345`
 * has to be obvious at a glance. The row numbers are the file's own, so a user
 * can open the file and look at the same line.
 */
export function PreviewTable({ preview }: { preview: ParsedFile }) {
  if (preview.rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No data rows were found below the header. Try a different header row.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-96 overflow-auto rounded-md border">
        <Table className="text-xs">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              <TableHead className="w-12 text-right font-mono text-muted-foreground">
                #
              </TableHead>
              {preview.columns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap font-medium">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.rows.map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {row.rowNumber}
                </TableCell>
                {preview.columns.map((column, index) => (
                  <TableCell
                    key={column}
                    className="whitespace-nowrap font-mono"
                  >
                    {row.cells[index] === "" ? (
                      <span className="text-muted-foreground/40">—</span>
                    ) : (
                      row.cells[index]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">
            {preview.totalDataRows.toLocaleString()}
          </span>{" "}
          data rows
        </span>
        <span>{preview.columns.length} columns</span>
        {preview.truncated && (
          <span>showing the first {preview.rows.length}</span>
        )}
        {preview.skippedBlankRows > 0 && (
          <span>{preview.skippedBlankRows} blank rows skipped</span>
        )}
        {preview.encoding && preview.encoding !== "utf-8" && (
          <Badge variant="outline" className="font-normal">
            read as {preview.encoding}
          </Badge>
        )}
        {/* Reassurance, and a statement of the one rule that matters most here. */}
        <span className="ml-auto">
          Every column read as text — leading zeros and long barcodes preserved
        </span>
      </div>
    </div>
  );
}
