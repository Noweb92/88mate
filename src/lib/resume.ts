/**
 * Australian-format CV generation via the Claude API (PRD 2.1, §8).
 * Server-side only.
 *
 * Three goals baked into the prompt:
 *  1. Australian conventions — no photo/age/marital status, AU spelling,
 *     work-rights line, standard sections, "references on request".
 *  2. ATS-readable — the content maps cleanly to standard headings; the
 *     PDF (resume-pdf.tsx) keeps a single column of real selectable text.
 *  3. Passes AI-content detectors — natural, specific, varied human
 *     writing; no buzzword slop, no uniform bullet cadence.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { AUSTRALIAN_CERTS, ROLE_PRESETS } from "./resume-constants";

export { AUSTRALIAN_CERTS, ROLE_PRESETS } from "./resume-constants";

export const resumeContentSchema = z.object({
  full_name: z.string(),
  headline: z
    .string()
    .describe(
      "Short, plain job-title headline matching the target role, e.g. 'Farm Hand' or 'Barista'. No adjectives, no buzzwords."
    ),
  location: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  work_rights: z
    .string()
    .describe(
      "One line stating the visa and its validity, e.g. 'Working Holiday visa (subclass 417) — full work rights until 9 February 2027'"
    ),
  professional_summary: z
    .string()
    .describe(
      "2-3 sentences, first person, written like a real person — specific, plain, no clichés"
    ),
  skills: z
    .array(z.string())
    .describe("6-9 concrete, role-relevant skills — plain nouns, no fluff"),
  certifications: z
    .array(z.string())
    .describe("Australian certifications/licences held, exactly as provided"),
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
          .describe(
            "2-4 plain, specific bullets describing what they actually did — vary the wording, avoid identical openings"
          ),
      })
    )
    .describe("Work history, most recent first"),
  education: z
    .array(
      z.object({
        qualification: z.string(),
        institution: z.string().nullable(),
        dates: z.string().nullable(),
      })
    )
    .describe("Education / training from the candidate data — empty if none"),
  availability: z.string().nullable(),
  references_note: z
    .string()
    .describe("Always 'References available upon request'"),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export interface ResumeInput {
  /** Free-text target role/industry — the CV adapts to whatever this is. */
  targetRole: string;
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

// Shared rules for both the CV and the cover letter — the anti-AI-slop
// guardrails are the load-bearing part here.
const HUMAN_WRITING_RULES = `WRITE LIKE A REAL PERSON (this is checked by AI detectors — generic, over-polished writing gets the CV rejected):
- Plain, direct Australian English. Short sentences are fine. Vary sentence length and rhythm — do not make every line the same shape.
- Be specific and concrete: name the crop, the tool, the shift pattern, the rough numbers. Specifics read as human; vague claims read as AI.
- Do NOT start bullets with the same word, and do not use a uniform "Verb + object + outcome" template on every line.
- BANNED words/phrases (never use): passionate, hard-working team player, results-driven, detail-oriented, proven track record, leverage, spearheaded, synergy, go-getter, dynamic, fast-paced environment, wide range of, thrive, dedicated professional, strong work ethic, "I am writing to".
- No empty superlatives. Don't claim skills the data doesn't support. It's fine to be plain and modest.
- Australian spelling (organise, labour, licence, programme).`;

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

  const prompt = `Write an Australian-style resume for a Working Holiday Maker applying for: ${input.targetRole}.

CANDIDATE DATA:
${buildProfileBlock(input)}

${input.targetJobAd ? `TARGET JOB AD — reorient the headline, summary and skills to match this, using the same key words the employer uses:\n${input.targetJobAd}\n` : ""}

AUSTRALIAN FORMAT (strict):
- NO photo, NO age/date of birth, NO marital status, NO nationality on the document itself, NO headshot.
- Standard sections only (the PDF renders: Professional Summary, Work Experience, Key Skills, Education, Certifications & Licences, Availability, References). Keep content mappable to those.
- work_rights line states the visa and validity date exactly as given.
- references_note is exactly "References available upon request".
- certifications: list ONLY what the candidate actually provided — do not invent any.
- Adapt all wording to "${input.targetRole}". Pull out the parts of their history most relevant to that role; for hands-on roles emphasise reliability, punctuality, physical work and any tickets/licences; for customer or office roles emphasise communication, accuracy and relevant tools.

CONTENT FROM DATA ONLY:
- Turn the Australian work history into experience entries with plain, specific bullets. Add concise entries from pre-Australia experience if given. Fill education ONLY from the data — empty array if none.
- If a field is genuinely unknown, use null/empty — never invent employers, dates, numbers or certifications.

${HUMAN_WRITING_RULES}`;

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
  targetRole: string,
  targetJobAd?: string
): Promise<string> {
  const client = new Anthropic();

  const prompt = `Write a short cover letter (110-150 words) for this candidate applying for ${targetRole} work in Australia.

CANDIDATE: ${content.full_name} — ${content.headline}
SUMMARY: ${content.professional_summary}
WORK RIGHTS: ${content.work_rights}
${targetJobAd ? `JOB AD:\n${targetJobAd}` : ""}

Open with what they offer, mention availability and work rights, close with a clear ask for a chat or trial shift. Use "Hi," or "Hello," (no name known). Return only the letter body — no address block, no signature beyond the first name.

${HUMAN_WRITING_RULES}`;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_RESUME_MODEL ?? "claude-opus-4-8",
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && "text" in text ? text.text.trim() : "";
}
