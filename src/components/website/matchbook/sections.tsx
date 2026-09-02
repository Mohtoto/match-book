import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  LockIcon,
  RepeatIcon,
  ShieldAlertIcon,
  SlidersHorizontalIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeReportPreview } from "./change-report-preview";

/**
 * Landing page sections.
 *
 * Written for one reader: the purchasing manager or pricing admin at a
 * wholesale distributor who currently does this in Excel with XLOOKUP. The copy
 * therefore names the specific pain rather than talking about "automation", and
 * the security section is prominent because cost prices are the most
 * commercially sensitive data these companies hold and the objection is real.
 */

export function Hero() {
  return (
    <section className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
      <div className="flex flex-col items-start gap-6">
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          For wholesale distributors and trade suppliers
        </span>

        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Your supplier sent a new price list. Find out what actually changed.
        </h1>

        <p className="text-lg text-muted-foreground text-pretty">
          Upload your catalogue export and the supplier&apos;s price file. Get
          back a change report you can trust and an import file your ERP will
          accept — without another afternoon of XLOOKUP.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/join-waitlist">
              Try it with a real price file
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" asChild>
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Upload and download only. No ERP integration, no API credentials, no
          IT project.
        </p>
      </div>

      <ChangeReportPreview />
    </section>
  );
}

const painPoints = [
  "Their part numbers don't match yours, and never have",
  "Leading zeros vanish, barcodes turn into 5.01E+12",
  "They price a box of 100; you sell each",
  "Three junk rows above the header, every single month",
  "You can't tell a discontinued line from one they just didn't mention",
  "One decimal in the wrong place and you're selling below cost",
];

export function Problem() {
  return (
    <section className="border-t py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            The spreadsheet works right up until it doesn&apos;t
          </h2>
          <p className="text-muted-foreground text-pretty">
            A price list update is nominally a lookup. In practice it is a
            morning of reconciling two files that were never designed to agree,
            and the mistakes are expensive in both directions — margin lost on
            an increase you missed, or a customer quoted below cost.
          </p>
          <p className="text-muted-foreground text-pretty">
            Matchbook does the reconciliation and shows you its reasoning, so
            you are checking a short list of exceptions instead of scanning
            4,000 rows.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {painPoints.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm">
              <XIcon className="mt-0.5 size-4 shrink-0 text-rose-500" />
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const steps = [
  {
    icon: FileSpreadsheetIcon,
    title: "Upload two files",
    body: "Your catalogue export and their price file. CSV or Excel, however messy. We find the header row, keep every identifier as text, and read prices in whatever format they arrived in.",
  },
  {
    icon: SlidersHorizontalIcon,
    title: "Confirm what we couldn't match",
    body: "Saved mappings and exact matches happen silently. Anything uncertain is a suggestion you confirm — never applied on your behalf. Set a pack-size factor once and it sticks.",
  },
  {
    icon: DownloadIcon,
    title: "Read the report, take the file",
    body: "Flagged lines first, largest movers next. Download the change report as CSV, and the import file shaped for your ERP with the suspicious lines left out.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t py-16 lg:py-24">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight">
          Three steps, about two minutes
        </h2>
        <p className="max-w-2xl text-muted-foreground text-pretty">
          The first time takes a little longer, because you tell us which column
          is which. That answer is saved.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex flex-col gap-3 rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-muted p-2">
                <step.icon className="size-4" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                0{index + 1}
              </span>
            </div>
            <h3 className="font-medium">{step.title}</h3>
            <p className="text-sm text-muted-foreground text-pretty">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MonthTwo() {
  return (
    <section className="border-t py-16 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RepeatIcon className="size-4" />
            The part that compounds
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            Month one saves you a morning. Month six is a different product.
          </h2>
          <p className="text-muted-foreground text-pretty">
            Every column you map and every match you confirm is saved against
            that supplier. The second file from them needs no mapping at all,
            and the tenth needs almost no confirmations.
          </p>
          <p className="text-muted-foreground text-pretty">
            That accumulated knowledge is the thing you actually own here — and
            it stays yours even if you delete every file you ever uploaded.
          </p>
        </div>

        {/* Concrete, not a chart: the same supplier, twice. */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">First upload</span>
              <span className="font-mono text-sm text-muted-foreground">
                ~10 min
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Map 6 columns · confirm 34 uncertain matches · set 4 pack factors
            </p>
          </div>

          <div className="rounded-lg border-2 border-primary bg-primary/5 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">Next month, same supplier</span>
              <span className="font-mono text-sm font-medium">under 2 min</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Columns already known · 3 new products to confirm · nothing else
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const catches = [
  {
    title: "A 12× jump that's really a pack change",
    body: "Same part number, price doubled, because they quietly moved from a box of 50 to a box of 100. Flagged loudly rather than exported.",
  },
  {
    title: "Order-of-magnitude errors",
    body: "A decimal in the wrong column. Almost never a genuine price move, and the one mistake that costs real money.",
  },
  {
    title: "Zero and negative prices",
    body: "Hard blocked from export. No configuration, no override.",
  },
  {
    title: "A column mapped to the wrong thing",
    body: "If more than 40% of the file won't match, we say so before showing you a report you shouldn't trust.",
  },
  {
    title: "Units that don't line up",
    body: "If they price per metre and you stock per each, we refuse to compute a difference until you tell us the factor. A gap beats a wrong number.",
  },
  {
    title: "\"Discontinued\" that isn't",
    body: "A product missing from a partial list means nothing. We only ever raise discontinuation when you've told us the file is their full catalogue.",
  },
];

export function WhatItCatches() {
  return (
    <section className="border-t py-16 lg:py-24">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldAlertIcon className="size-4" />
          Built around the thing you're afraid of
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          The worry isn&apos;t the work. It&apos;s importing something wrong.
        </h2>
        <p className="max-w-2xl text-muted-foreground text-pretty">
          So every implausible change is flagged before you can export it, and
          the flagged lines sit at the top of the report — not buried in it.
        </p>
      </div>

      <div className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2">
        {catches.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                {item.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const securityPoints = [
  {
    icon: LockIcon,
    title: "Encrypted, isolated, never public",
    body: "Uploads are encrypted at rest in private storage. Every query is scoped to your account.",
  },
  {
    icon: TrashIcon,
    title: "Delete the files, keep the knowledge",
    body: "Purge every raw upload whenever you like. Your mappings and run history survive — they hold no prices.",
  },
  {
    icon: ShieldAlertIcon,
    title: "No AI is shown your cost prices",
    body: "Matching is deterministic string logic. Your buying terms are not sent to any third-party model.",
  },
];

export function Security() {
  return (
    <section className="border-t py-16 lg:py-24">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          Your cost prices are the most sensitive data you have
        </h2>
        <p className="max-w-2xl text-muted-foreground text-pretty">
          We treat them that way. Nothing about a file&apos;s contents is ever
          written to a log — only row counts and errors.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {securityPoints.map((point) => (
          <div key={point.title} className="flex flex-col gap-3 rounded-lg border p-6">
            <point.icon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{point.title}</h3>
            <p className="text-sm text-muted-foreground text-pretty">
              {point.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Does it connect to my ERP?",
    a: "No, deliberately. You upload a file and download a file. That means no API credentials, no vendor approval and no IT project — you can try it this afternoon. The export is shaped to match what your system expects on import.",
  },
  {
    q: "What if the supplier sends a PDF?",
    a: "Not supported yet. If PDF price letters are how your suppliers work, tell us — it's the next thing we'd build, and we're waiting on evidence of how common it really is.",
  },
  {
    q: "Our part numbers are nothing like theirs.",
    a: "That's the normal case and the reason this exists. Matching tries saved mappings, then exact, then normalised, then manufacturer part number and barcode. Whatever's left you confirm once by hand, and it's remembered forever.",
  },
  {
    q: "Will it guess at a match it isn't sure about?",
    a: "Never. Uncertain matches are shown as suggestions with both descriptions side by side. Nothing is applied to your data without you confirming it.",
  },
  {
    q: "What about quantity price breaks?",
    a: "We use the base price for the comparison and flag the other tiers as unhandled, so you can see they exist. Full price-break handling is on the list, not in the first version.",
  },
  {
    q: "Does it suggest what I should sell things for?",
    a: "No. That's a different product for a different buyer. Matchbook tells you what your supplier changed; what you do about it is your call.",
  },
];

export function Faq() {
  return (
    <section className="border-t py-16 lg:py-24">
      <h2 className="text-3xl font-semibold tracking-tight">
        Reasonable questions
      </h2>

      <div className="mt-10 grid gap-x-12 gap-y-8 md:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.q} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{faq.q}</h3>
            <p className="text-sm text-muted-foreground text-pretty">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="border-t py-16 lg:py-24">
      <div className="flex flex-col items-center gap-6 rounded-xl border bg-muted/30 px-6 py-14 text-center">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">
          Bring us your worst supplier file
        </h2>
        <p className="max-w-xl text-muted-foreground text-pretty">
          We&apos;re working with a small number of distributors to get this
          right. If you have a price list that ruins a morning every month,
          that&apos;s exactly the file we want to see.
        </p>
        <Button size="lg" asChild>
          <Link href="/join-waitlist">
            Get early access
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
