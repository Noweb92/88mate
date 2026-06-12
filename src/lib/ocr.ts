/**
 * Payslip OCR via the Claude API (server-side only — never import from
 * client components).
 *
 * Uses structured outputs (messages.parse + zodOutputFormat) so the
 * response is guaranteed to match the schema from PRD §8.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const payslipDataSchema = z.object({
  employer_name: z
    .string()
    .nullable()
    .describe("Legal or trading name of the employer, null if not visible"),
  abn: z
    .string()
    .nullable()
    .describe("Australian Business Number (11 digits), digits only, null if absent"),
  period_start: z
    .string()
    .nullable()
    .describe("Pay period start date, ISO format YYYY-MM-DD, null if absent"),
  period_end: z
    .string()
    .nullable()
    .describe("Pay period end date, ISO format YYYY-MM-DD, null if absent"),
  gross_pay: z
    .number()
    .nullable()
    .describe("Gross pay for the period in AUD, null if absent"),
  hours: z
    .number()
    .nullable()
    .describe("Total hours worked in the period, null if absent"),
  hourly_rate: z
    .number()
    .nullable()
    .describe("Base hourly rate in AUD, null if absent or piece-rate only"),
  confidence: z
    .number()
    .describe(
      "Overall extraction confidence between 0 and 1 — below 0.8 means the user should verify manually"
    ),
});

export type PayslipData = z.infer<typeof payslipDataSchema>;

/** Threshold under which the UI asks the user to double-check (PRD §8). */
export const OCR_CONFIDENCE_THRESHOLD = 0.8;

export const OCR_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const OCR_ACCEPTED_TYPES = [...OCR_IMAGE_TYPES, "application/pdf"];

const EXTRACTION_PROMPT = `This is a document uploaded by a Working Holiday Maker in Australia — most likely a payslip, possibly a contract or bank statement.

Extract the payslip fields. Rules:
- Dates in ISO format (YYYY-MM-DD). Australian documents usually write DD/MM/YYYY — convert carefully.
- abn: digits only, no spaces.
- gross_pay is the gross for THIS pay period (not year-to-date).
- Use null for anything absent or illegible — never guess.
- confidence: your overall confidence in the extraction (0 to 1). If the image is blurry, partially cropped, or not actually a payslip, use a low value.`;

export function isOcrConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function extractPayslip(opts: {
  base64Data: string;
  mediaType: string;
}): Promise<PayslipData> {
  const client = new Anthropic();

  const fileBlock =
    opts.mediaType === "application/pdf"
      ? ({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: opts.base64Data,
          },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: opts.mediaType as (typeof OCR_IMAGE_TYPES)[number],
            data: opts.base64Data,
          },
        } as const);

  const response = await client.messages.parse({
    // Override with ANTHROPIC_OCR_MODEL (e.g. claude-haiku-4-5) if cost
    // becomes a concern at volume.
    model: process.env.ANTHROPIC_OCR_MODEL ?? "claude-opus-4-8",
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    messages: [
      {
        role: "user",
        content: [fileBlock, { type: "text", text: EXTRACTION_PROMPT }],
      },
    ],
    output_config: { format: zodOutputFormat(payslipDataSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("OCR returned no parseable output");
  }
  return response.parsed_output;
}
