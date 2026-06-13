/**
 * Client-safe resume constants. Kept separate from resume.ts (which
 * imports the Anthropic SDK) so client components don't drag server-only
 * deps into the browser bundle.
 */

// Quick-pick chips. The CV adapts to ANY role the user types — these are
// just shortcuts for the most common backpacker jobs.
export const ROLE_PRESETS = [
  "Farm / Regional work",
  "Hospitality",
  "Construction / Labour",
  "Mining / FIFO",
  "Retail",
  "Warehouse",
  "Cleaning / Housekeeping",
  "Office / Admin",
  "Aged care & disability",
  "Driver / Delivery",
] as const;

export const AUSTRALIAN_CERTS = [
  "White Card",
  "Standard 11 / General Mine Induction",
  "Coal Board Medical",
  "Working at Heights",
  "Confined Space Entry",
  "RSA (Responsible Service of Alcohol)",
  "RSG (Responsible Service of Gambling)",
  "Forklift Licence",
  "First Aid / CPR",
  "Working with Children Check",
  "Australian Driver's Licence",
] as const;
