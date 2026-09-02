import { AppConfigPublic } from "./types";

export const appConfig: AppConfigPublic = {
  projectName: "Matchbook",
  projectSlug: "matchbook",
  keywords: [
    "Matchbook",
    "supplier price list reconciliation",
    "supplier price increase",
    "price file comparison",
    "SKU matching",
    "distributor pricing",
    "wholesale price update",
    "ERP price import",
    "catalogue reconciliation",
  ],
  description:
    "Upload your product catalogue export and a supplier's new price file, and get back a change report plus an import-ready file for your system.",
  auth: {
    enablePasswordAuth: false, // Set to true to enable password-based authentication
  },
  legal: {
    address: {
      street: "Plot No 337, Workyard, Phase 2, Industrial Business &amp; Park",
      city: "Chandigarh",
      state: "Punjab",
      postalCode: "160002",
      country: "India",
    },
    email: "ssent.hq@gmail.com",
    phone: "+91 9876543210",
  },
  social: {
    twitter: "https://twitter.com/cjsingg",
    instagram: "https://instagram.com/-",
    linkedin: "https://linkedin.com/-",
    facebook: "https://facebook.com/-",
    youtube: "https://youtube.com/-",
  },
  email: {
    senderName: "Indie Kit",
    senderEmail: "ssent.hq@gmail.com",
  },
};
