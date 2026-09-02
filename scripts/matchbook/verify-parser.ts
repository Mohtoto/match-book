/**
 * Parser acceptance fixtures.
 *
 * Run with: pnpm run script scripts/matchbook/verify-parser.ts
 *
 * These are the parsing rows of the acceptance checklist in
 * `.claude/skills/match-book/reference/domain-logic.md`. They exist because
 * every one of them is a real failure mode from a real supplier file, and each
 * would otherwise produce a report that is quietly, confidently wrong.
 *
 * The matching, diff and export checklist items are not here yet — they arrive
 * with the code they test.
 */

import ExcelJS from "exceljs";
import {
  parseUploadBuffer,
  ParseError,
  normaliseIdentifier,
} from "../../src/lib/matchbook/parse";
import { parsePrice, inferDecimalSeparator } from "../../src/lib/matchbook/parse/price";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m  ${label}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function equal(label: string, actual: unknown, expected: unknown) {
  check(
    label,
    actual === expected,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

/**
 * Narrow a price result to its value, or a readable marker when it failed, so
 * an assertion reads as one call instead of `x.ok && x.value`.
 */
function priceOf(raw: string, separator?: "." | ","): string {
  const result = parsePrice(raw, separator);
  return result.ok ? result.value : `<${result.reason}>`;
}

/** Build an .xlsx in memory so the fixture is version-controlled as code. */
async function buildWorkbook(
  build: (sheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook) => void
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Price List");
  build(sheet, workbook);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function main() {
  console.log("\nIdentifier integrity\n");

  {
    // A CSV is the format where identifiers survive intact; prove we don't undo that.
    const csv = Buffer.from(
      [
        "Part Number,Description,Barcode,Price",
        "0012345,Widget A,5012345678901,12.50",
        "12345.0,Widget B,0000012345678,7.00",
      ].join("\n"),
      "utf-8"
    );
    const parsed = await parseUploadBuffer("supplier.csv", csv);

    equal("leading zeros survive in CSV", parsed.rows[0].cells[0], "0012345");
    equal(
      "13-digit barcode is not in scientific notation",
      parsed.rows[0].cells[2],
      "5012345678901"
    );
    equal(
      "barcode with leading zeros survives",
      parsed.rows[1].cells[2],
      "0000012345678"
    );
    equal("header row detected at row 1", parsed.headerRowIndex, 0);
    equal("row number is 1-indexed to the file", parsed.rows[0].rowNumber, 2);
  }

  {
    // The same identifiers, but stored the way Excel actually stores them: as
    // numbers, with a display format that re-adds the padding.
    const buffer = await buildWorkbook((sheet) => {
      sheet.addRow(["Part Number", "Description", "Barcode", "Price"]);
      const row = sheet.addRow([12345, "Widget A", 5012345678901, 12.5]);
      row.getCell(1).numFmt = "0000000";
      row.getCell(3).numFmt = "0";
      sheet.addRow(["ABC-123", "Widget B", "0000012345678", 7]);
    });
    const parsed = await parseUploadBuffer("supplier.xlsx", buffer);

    equal(
      "numeric SKU with padding format recovers leading zeros",
      parsed.rows[0].cells[0],
      "0012345"
    );
    equal(
      "numeric 13-digit barcode renders in full",
      parsed.rows[0].cells[2],
      "5012345678901"
    );
    equal(
      "integer price does not gain a trailing decimal",
      parsed.rows[1].cells[3],
      "7"
    );
    equal(
      "text-stored barcode is untouched",
      parsed.rows[1].cells[2],
      "0000012345678"
    );
  }

  console.log("\nMessy file structure\n");

  {
    // Logo row, title, date, blank — then the real header. Extremely common.
    const buffer = await buildWorkbook((sheet) => {
      sheet.addRow(["ACME ELECTRICAL SUPPLY"]);
      sheet.addRow(["Trade Price List"]);
      sheet.addRow(["Effective 1 October 2026"]);
      sheet.addRow([]);
      sheet.addRow(["Part Number", "Description", "UOM", "Pack Size", "Price"]);
      sheet.addRow(["0012345", "Widget A", "BOX", 100, 125]);
      sheet.addRow([]);
      sheet.addRow(["", "Subtotal", "", "", 125]);
      sheet.addRow(["0012346", "Widget B", "EA", 1, 3.25]);
    });
    const parsed = await parseUploadBuffer("supplier.xlsx", buffer);

    equal("header found below three junk rows", parsed.headerRowIndex, 4);
    equal("first column is named from the real header", parsed.columns[0], "Part Number");
    equal("blank rows are skipped", parsed.skippedBlankRows, 1);
    equal("data rows counted without blanks", parsed.totalDataRows, 3);
    check(
      "subtotal row is kept for the matching stage to drop",
      parsed.rows.some((r) => r.cells[1] === "Subtotal"),
      "subtotal rows can only be identified once the part-number column is mapped"
    );
  }

  {
    // Merged cells in the header region leave blanks on every non-master cell.
    const buffer = await buildWorkbook((sheet) => {
      sheet.addRow(["Acme Price List", "", "", ""]);
      sheet.mergeCells("A1:D1");
      sheet.addRow(["Part Number", "Description", "UOM", "Price"]);
      sheet.addRow(["A-1", "Widget", "EA", 1.5]);
    });
    const parsed = await parseUploadBuffer("supplier.xlsx", buffer);

    equal("merged title row is not chosen as the header", parsed.headerRowIndex, 1);
    equal("header names come from the unmerged row", parsed.columns[3], "Price");
  }

  {
    const buffer = await buildWorkbook((sheet, workbook) => {
      sheet.addRow(["Part Number", "Price"]);
      sheet.addRow(["A-1", 1]);
      const second = workbook.addWorksheet("Discontinued");
      second.addRow(["Part Number", "Price"]);
      second.addRow(["B-2", 2]);
    });

    const first = await parseUploadBuffer("supplier.xlsx", buffer);
    equal("multiple sheets are listed", first.sheets.length, 2);
    equal("first sheet is the default", first.sheetName, "Price List");

    const chosen = await parseUploadBuffer("supplier.xlsx", buffer, {
      sheetName: "Discontinued",
    });
    equal("a named sheet can be selected", chosen.rows[0].cells[0], "B-2");
  }

  {
    // Sparse rows: ExcelJS omits never-written cells, which would shift columns.
    const buffer = await buildWorkbook((sheet) => {
      sheet.addRow(["Part Number", "Description", "UOM", "Price"]);
      const row = sheet.getRow(2);
      row.getCell(1).value = "A-1";
      row.getCell(4).value = 9.99;
      row.commit();
    });
    const parsed = await parseUploadBuffer("supplier.xlsx", buffer);

    equal("sparse row keeps its column positions", parsed.rows[0].cells[3], "9.99");
    equal("gap in a sparse row reads as empty", parsed.rows[0].cells[1], "");
  }

  console.log("\nHeader override and bad input\n");

  {
    const csv = Buffer.from(
      ["junk", "Part Number,Price", "A-1,1.00"].join("\n"),
      "utf-8"
    );
    const overridden = await parseUploadBuffer("s.csv", csv, { headerRowIndex: 1 });
    equal("user override wins over detection", overridden.headerRowIndex, 1);
    equal("override is reported as not auto-detected", overridden.headerWasDetected, false);

    let rejected = false;
    try {
      await parseUploadBuffer("s.csv", csv, { headerRowIndex: 99 });
    } catch (error) {
      rejected = error instanceof ParseError;
    }
    check("out-of-range header row is rejected", rejected);
  }

  {
    let rejected = false;
    try {
      // OLE2 magic number: a genuine legacy .xls.
      await parseUploadBuffer(
        "old.xls",
        Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
      );
    } catch (error) {
      rejected = error instanceof ParseError && /Save As/.test(error.message);
    }
    check("legacy .xls is rejected with actionable advice", rejected);

    let unsupported = false;
    try {
      await parseUploadBuffer("notes.pdf", Buffer.from("%PDF-1.4"));
    } catch (error) {
      unsupported = error instanceof ParseError;
    }
    check("unsupported extension is rejected", unsupported);
  }

  {
    // Windows-1252: a degree sign or an accented name in a description.
    const bytes = Buffer.concat([
      Buffer.from("Part Number,Description,Price\nA-1,Caf", "latin1"),
      Buffer.from([0xe9]),
      Buffer.from(" 90", "latin1"),
      Buffer.from([0xb0]),
      Buffer.from(" Elbow,1.00", "latin1"),
    ]);
    const parsed = await parseUploadBuffer("s.csv", bytes);
    equal("windows-1252 is detected", parsed.encoding, "windows-1252");
    equal(
      "windows-1252 characters decode correctly",
      parsed.rows[0].cells[1],
      "Café 90° Elbow"
    );
  }

  console.log("\nPrice parsing\n");

  equal("plain decimal", priceOf("12.50"), "12.50");
  equal(
    "dollar sign and thousands separator",
    priceOf("$1,234.50"),
    "1234.50"
  );
  equal(
    "european format",
    priceOf("1.234,50"),
    "1234.50"
  );
  equal(
    "currency code suffix",
    priceOf("1234.50 AUD"),
    "1234.50"
  );
  equal(
    "accounting negative",
    priceOf("(12.34)"),
    "-12.34"
  );
  equal("zero is parsed, not swallowed", priceOf("0"), "0");
  equal(
    "repeated separator is thousands",
    priceOf("1.234.567"),
    "1234567"
  );

  check(
    "ambiguous 1,234 refuses to guess",
    inferDecimalSeparator("1,234") === null &&
      parsePrice("1,234").ok === false
  );
  equal(
    "ambiguity resolves once the locale is known",
    priceOf("1,234", ","),
    "1.234"
  );
  check("empty cell reports empty", parsePrice("").ok === false);
  check("text in a price column is unparseable", parsePrice("POA").ok === false);
  check("blank-ish text is unparseable", parsePrice("N/A").ok === false);

  console.log("\nIdentifier normalisation\n");

  equal("separators stripped", normaliseIdentifier("0012-345/A"), "0012345A");
  equal("spaces stripped and uppercased", normaliseIdentifier("0012345 a"), "0012345A");
  check(
    "leading zeros are never normalised away",
    normaliseIdentifier("0012345") === "0012345" &&
      normaliseIdentifier("0012345") !== "12345"
  );
  // Escapes, not literal characters: a literal non-breaking space in source is
  // invisible to the next person to read this file and is silently normalised
  // to a plain space by many editors, which would make this assertion vacuous.
  const NBSP = "\u00A0";
  const ZERO_WIDTH = "\u200B";

  equal(
    "non-breaking space inside an identifier is removed",
    normaliseIdentifier(`ABC${NBSP}123`),
    "ABC123"
  );
  equal(
    "zero-width space inside an identifier is removed",
    normaliseIdentifier(`ABC${ZERO_WIDTH}123`),
    "ABC123"
  );

  {
    // The whole path, not just the helper: invisible characters have to be gone
    // by the time a cell reaches the matching cascade.
    const csv = Buffer.from(
      `Part Number,Description,Price\n${NBSP}0012345${NBSP},Widget${NBSP}A,1.00\n`,
      "utf-8"
    );
    const parsed = await parseUploadBuffer("s.csv", csv);
    equal(
      "invisible characters are stripped during parse",
      parsed.rows[0].cells[0],
      "0012345"
    );
    equal(
      "invisible characters in a description collapse to a plain space",
      parsed.rows[0].cells[1],
      "Widget A"
    );
  }

  console.log(
    `\n${passed} passed, ${failed} failed\n`
  );
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
