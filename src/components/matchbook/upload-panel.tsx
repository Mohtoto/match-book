"use client";

import React from "react";
import { toast } from "sonner";
import {
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/cn";
import { PreviewTable } from "./preview-table";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  type UploadKind,
} from "@/lib/matchbook/domain";
import type { UploadRecord } from "@/app/api/app/uploads/types";
import type { ParsedFile } from "@/lib/matchbook/parse/types";

export type UploadPanelState = {
  upload: UploadRecord;
  preview: ParsedFile;
};

type UploadPanelProps = {
  title: string;
  description: string;
  kind: UploadKind;
  /** Extra form fields sent with the file. */
  metadata?: Record<string, string | null | undefined>;
  disabled?: boolean;
  disabledReason?: string;
  state: UploadPanelState | null;
  onChange: (state: UploadPanelState | null) => void;
};

/**
 * One file: choose it, see it parsed, correct the sheet or header row.
 *
 * The correction controls sit directly above the preview because getting the
 * header row wrong is both common and completely recoverable — the raw file is
 * stored immutably, so re-previewing costs nothing and never touches the
 * original bytes.
 */
export function UploadPanel({
  title,
  description,
  kind,
  metadata,
  disabled,
  disabledReason,
  state,
  onChange,
}: UploadPanelProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRepreviewing, setIsRepreviewing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      for (const [key, value] of Object.entries(metadata ?? {})) {
        if (value !== null && value !== undefined && value !== "") {
          form.append(key, value);
        }
      }

      const response = await fetch("/api/app/uploads", {
        method: "POST",
        body: form,
      });
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "We couldn't read that file.");
        return;
      }

      onChange({ upload: body.upload, preview: body.preview });
      toast.success(
        `Read ${body.preview.totalDataRows.toLocaleString()} rows from ${file.name}`
      );
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /** Re-parse the stored file with a different sheet or header row. */
  async function repreview(next: { sheetName?: string; headerRowIndex?: number }) {
    if (!state) return;

    setIsRepreviewing(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (next.sheetName) query.set("sheetName", next.sheetName);
      if (next.headerRowIndex !== undefined) {
        query.set("headerRowIndex", String(next.headerRowIndex));
      }

      const response = await fetch(
        `/api/app/uploads/${state.upload.id}/preview?${query.toString()}`
      );
      const body = await response.json();

      if (!response.ok) {
        setError(body.error ?? "We couldn't re-read that file.");
        return;
      }

      onChange({ upload: body.upload, preview: body.preview });
    } catch {
      setError("Re-reading the file failed.");
    } finally {
      setIsRepreviewing(false);
    }
  }

  if (state) {
    const { preview } = state;

    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileSpreadsheetIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">
              {state.upload.originalFilename}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
          >
            <XIcon className="size-4" />
            Replace
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-md border bg-muted/30 p-3">
          {preview.sheets.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Sheet</Label>
              <Select
                value={preview.sheetName}
                onValueChange={(sheetName) => repreview({ sheetName })}
              >
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {preview.sheets.map((sheet) => (
                    <SelectItem key={sheet.name} value={sheet.name}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`header-${state.upload.id}`} className="text-xs">
              Header row
            </Label>
            <Input
              id={`header-${state.upload.id}`}
              type="number"
              min={1}
              className="h-8 w-24 text-xs"
              // Shown 1-indexed to match the row gutter the user sees in Excel.
              defaultValue={preview.headerRowIndex + 1}
              key={preview.headerRowIndex}
              onBlur={(event) => {
                const oneIndexed = Number(event.target.value);
                if (!Number.isFinite(oneIndexed) || oneIndexed < 1) return;
                if (oneIndexed - 1 === preview.headerRowIndex) return;
                repreview({ headerRowIndex: oneIndexed - 1 });
              }}
            />
          </div>

          <p className="flex-1 text-xs text-muted-foreground">
            {preview.headerWasDetected
              ? "We found the header automatically. If the columns below look wrong, change the row number."
              : "Header row set by you."}
          </p>

          {isRepreviewing && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangleIcon className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <PreviewTable preview={preview} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={`file-${kind}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {isUploading ? (
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        ) : (
          <UploadIcon className="size-6 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isUploading ? "Reading your file…" : title}
          </p>
          <p className="text-xs text-muted-foreground">
            {disabled ? disabledReason : description}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {ACCEPTED_UPLOAD_EXTENSIONS.join("  ·  ")}
        </p>
        <Input
          ref={inputRef}
          id={`file-${kind}`}
          type="file"
          className="hidden"
          disabled={disabled || isUploading}
          accept={ACCEPTED_UPLOAD_EXTENSIONS.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </label>

      {error && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
