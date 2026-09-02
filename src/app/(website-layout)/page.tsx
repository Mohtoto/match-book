import type { Metadata } from "next";
import {
  Faq,
  FinalCta,
  Hero,
  HowItWorks,
  MonthTwo,
  Problem,
  Security,
  WhatItCatches,
} from "@/components/website/matchbook/sections";

export const metadata: Metadata = {
  // The layout's template appends the project name, so this stays short.
  title: "Supplier price list reconciliation",
  description:
    "Upload your catalogue export and a supplier's new price file. Get back a change report you can trust and an import-ready file for your ERP.",
};

/**
 * Sections are ordered as the objection actually arrives: what is this, do you
 * understand my problem, how does it work, why does it keep getting better,
 * what stops it hurting me, is my pricing safe, and the loose ends.
 *
 * There is no pricing section and no testimonials. Both would be fiction right
 * now — the goal of this page is to get a real distributor to run a real file,
 * and the honest call to action for that is early access.
 */
export default function WebsiteHomepage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <MonthTwo />
      <WhatItCatches />
      <Security />
      <Faq />
      <FinalCta />
    </>
  );
}
