/**
 * Australian-format CV generation via the Claude API (PRD 2.1, §8).
 * Server-side only.
 *
 * Hard rules baked into the prompt: no photo, no age, no marital
 * status; professional plain English; work rights + validity date;
 * references "available upon request"; Australian certs highlighted;
 * vocabulary adapted to the target sector.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  AUSTRALIAN_CERTS,
  TEMPLATE_LABELS,
  type ResumeTemplate,
} from "./resume-constants";

export {
  AUSTRALIAN_CERTS,
  TEMPLATE_LABELS,
  type ResumeTemplate,
} from "./resume-constants";

export const resumeContentSchema = z.object({
  full_name: z.string(),
  headline: z
    .string()
    .describe("Short professional headline, e.g. 'Reliable Farm Hand'"),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  work_rights: z
    .string()
    .describe(
      "One line stating the visa and its validity, e.g. 'Valid Working Holiday visa (subclass 417), full work rights until 9 February 2027'"
    ),
  professional_summary: z
    .string()
    .describe("3-4 sentence summary tailored to the target sector"),
  skills: z.array(z.string()).describe("6-10 concise, relevant skills"),
  certifications: z
    .array(z.string())
    .describe("Australian certifications held, exactly as provided"),
  languages: z
    .array(z.object({ language: z.string(), level: z.string() }))
    .describe("Languages and proficiency"),
  experience: z
    .array(
      z.object({
        role: z.string(),
        employer: z.string(),
        location: z.string().nullable(),
        dates: z.string().describe("e.g. 'Mar 2026 – Apr 2026'"),
        bullets: z
          .array(z.string())
          .describe("2-4 achievement-oriented bullet points"),
      })
    )
    .describe("Work history, most recent first"),
  availability: z.string().nullable(),
  references_note: z
    .string()
    .describe("Always 'References available upon request' or similar"),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export interface ResumeInput {
  template: ResumeTemplate;
  profile: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    location: string | null;
    visaLabel: string;
    visaExpiry: string | null;
    hasVehicle: boolean;
  };
  workHistory: Array<{
    employer: string;
    industry: string | null;
    location: string | null;
    dates: string;
    workType: string;
  }>;
  preAustraliaExperience: string;
  languages: string;
  certifications: string[];
  availability: string;
  targetJobAd?: string;
}

const SECTOR_GUIDANCE: Record<ResumeTemplate, string> = {
  farm: "Emphasise physical fitness, early starts, reliability, teamwork, ability to work outdoors in all conditions, and any machinery or harvest experience.",
  hospitality:
    "Emphasise customer service, RSA where held, fast-paced teamwork, cash handling, and cleanliness/food-safety awareness.",
  construction:
    "Emphasise White Card where held, safety awareness, manual handling, punctuality, and willingness to learn on site.",
};

export function isResumeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildProfileBlock(input: ResumeInput): string {
  return JSON.stringify(
    {
      name: [input.profile.firstName, input.profile.lastName]
        .filter(Boolean)
        .join(" "),
      email: input.profile.email,
      phone: input.profile.phone,
      nationality: input.profile.nationality,
      location: input.profile.location,
      visa: input.profile.visaLabel,
      visa_valid_until: input.profile.visaExpiry,
      has_vehicle: input.profile.hasVehicle,
      australian_work_history: input.workHistory,
      pre_australia_experience: input.preAustraliaExperience,
      languages: input.languages,
      australian_certifications: input.certifications,
      availability: input.availability,
    },
    null,
    2
  );
}

export async function generateResumeContent(
  input: ResumeInput
): Promise<ResumeContent> {
  const client = new Anthropic();

  const prompt = `Generate an Australian-format resume for a Working Holiday Maker, targeting ${TEMPLATE_LABELS[input.template]} jobs.

CANDIDATE DATA:
${buildProfileBlock(input)}

${input.targetJobAd ? `TARGET JOB AD (adapt wording and summary to match this):\n${input.targetJobAd}\n` : ""}

RULES (Australian conventions — strict):
- NO photo, NO age/date of birth, NO marital status, NO headshot reference.
- Plain professional English. Australian spelling.
- Include the work_rights line with the visa and its validity date exactly.
- references_note must be "References available upon request".
- certifications: list ONLY what the candidate actually provided.
- ${SECTOR_GUIDANCE[input.template]}
- Turn the Australian work history into proper experience entries with achievement bullets. If pre-Australia experience is given, add concise entries for it too.
- If a field is genuinely unknown, use null — do not invent employers, dates, or certifications.`;

  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_RESUME_MODEL ?? "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(resumeContentSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Resume generation returned no parseable output");
  }
  return response.parsed_output;
}

export async function generateCoverLetter(
  content: ResumeContent,
  template: ResumeTemplate,
  targetJobAd?: string
): Promise<string> {
  const client = new Anthropic();

  const prompt = `Write a short cover letter (max 150 words) for this candidate applying for ${TEMPLATE_LABELS[template]} work in Australia.

CANDIDATE: ${content.full_name} — ${content.headline}
SUMMARY: ${content.professional_summary}
WORK RIGHTS: ${content.work_rights}
${targetJobAd ? `JOB AD:\n${targetJobAd}` : ""}

Tone: direct, genuine, Australian — no hollow flattery, no "I am writing to express my interest". Open with what they offer, mention availability and work rights, close with a clear call to action. Return only the letter body (no address block, no "Dear Sir/Madam" if no name is known — use "Hi," or "Hello,").`;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_RESUME_MODEL ?? "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && "text" in text ? text.text.trim() : "";
}
