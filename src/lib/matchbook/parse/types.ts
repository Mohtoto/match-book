/** A data row, carrying the row number the user would see in Excel. */
export type ParsedRow = {
  /** 1-indexed position in the original file, for "go and look at it". */
  rowNumber: number;
  cells: string[];
};

export type SheetRef = {
  name: string;
  rowCount: number;
};

export type ParsedFile = {
  /** Every sheet in the workbook, so the user can pick. Single entry for CSV. */
  sheets: SheetRef[];
  /** The sheet actually read. */
  sheetName: string;
  /** 0-indexed, detected unless the user overrode it. */
  headerRowIndex: number;
  headerWasDetected: boolean;

  columns: string[];
  rows: ParsedRow[];

  /** Data rows found before any preview truncation. */
  totalDataRows: number;
  truncated: boolean;
  /** Fully empty rows dropped between the header and the end of the file. */
  skippedBlankRows: number;

  /** Only set for CSV, where we have to decide how to decode the bytes. */
  encoding?: string;
};

export type ParseOptions = {
  /** Override the detected header row (0-indexed). */
  headerRowIndex?: number;
  /** Which sheet to read. Defaults to the first. */
  sheetName?: string;
  /** Cap rows for on-screen previews. Omit to read the whole file. */
  maxRows?: number;
};

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
