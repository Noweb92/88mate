/**
 * Client-safe resume constants and types. Kept separate from resume.ts
 * (which imports the Anthropic SDK) so client components can use these
 * without dragging server-only deps into the browser bundle.
 */
export type ResumeTemplate = "farm" | "hospitality" | "construction";

export const TEMPLATE_LABELS: Record<ResumeTemplate, string> = {
  farm: "Farm / Regional work",
  hospitality: "Hospitality",
  construction: "Construction / Labour",
};

export const AUSTRALIAN_CERTS = [
  "White Card",
  "RSA (Responsible Service of Alcohol)",
  "RSG (Responsible Service of Gambling)",
  "Forklift Licence",
  "First Aid / CPR",
  "Working with Children Check",
] as const;
