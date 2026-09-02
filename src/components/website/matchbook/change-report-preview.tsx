import { cn } from "@/lib/cn";

/**
 * A faithful render of the change report summary block.
 *
 * This is the hero visual, and it is the real output format from
 * `reference/outputs.md` rather than a decorative illustration — including the
 * ordering rule that matters most: attention items first, price movements
 * second. It is the screen a purchasing manager would screenshot and send to
 * their manager, so showing it is the clearest possible statement of what the
 * product does.
 */

function Line({
  count,
  label,
  detail,
  tone = "default",
}: {
  count: string;
  label: string;
  detail?: string;
  tone?: "default" | "attention" | "up" | "down";
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className={cn(
          "w-12 shrink-0 text-right font-mono tabular-nums",
          tone === "attention" && "text-amber-600 dark:text-amber-500",
          tone === "up" && "text-rose-600 dark:text-rose-400",
          tone === "down" && "text-emerald-600 dark:text-emerald-500"
        )}
      >
        {count}
      </span>
      <span className="text-foreground">{label}</span>
      {detail && (
        <span className="ml-auto hidden font-mono text-xs text-muted-foreground sm:inline">
          {detail}
        </span>
      )}
    </div>
  );
}

export function ChangeReportPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* File identity. The type and effective date are always on the face. */}
      <div className="flex flex-col gap-1 border-b bg-muted/40 px-5 py-4 text-xs">
        <div className="flex gap-3">
          <span className="w-28 shrink-0 text-muted-foreground">Supplier</span>
          <span className="font-medium">Acme Electrical Supply</span>
        </div>
        <div className="flex gap-3">
          <span className="w-28 shrink-0 text-muted-foreground">File</span>
          <span className="font-mono">
            acme-pricelist-sep26.xlsx
            <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 font-sans text-secondary-foreground">
              changed items only
            </span>
            <span className="ml-1.5 text-muted-foreground">
              effective 1 Oct 2026
            </span>
          </span>
        </div>
        <div className="flex gap-3">
          <span className="w-28 shrink-0 text-muted-foreground">Compared to</span>
          <span className="font-mono">catalogue-export-30sep26.csv</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 text-sm">
        {/* Attention first. This ordering is the product's whole argument. */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
            Needs your attention
          </p>
          <Line count="12" label="flagged as implausible" tone="attention" />
          <Line count="8" label="unmatched supplier lines" tone="attention" />
          <Line count="3" label="conflicts" tone="attention" />
          <Line count="2" label="unit of measure unresolved" tone="attention" />
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Price movements on stocked items
          </p>
          <Line
            count="184"
            label="increased"
            detail="avg +4.2%   largest +31.0%"
            tone="up"
          />
          <Line count="11" label="decreased" detail="avg −2.1%" tone="down" />
          <Line count="402" label="unchanged" />
        </div>

        <div className="flex flex-col gap-2 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Other
          </p>
          <Line count="47" label="on supplier list, not stocked" />
          <Line count="118" label="stocked, not in this update" />
        </div>
      </div>

      <div className="border-t bg-muted/40 px-5 py-3">
        <p className="font-mono text-xs text-muted-foreground">
          12.4× increase on 0012345 — check pack size
        </p>
      </div>
    </div>
  );
}
