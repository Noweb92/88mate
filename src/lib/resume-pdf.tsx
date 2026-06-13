/**
 * Resume + cover letter PDF (PRD 2.1) — @react-pdf/renderer.
 * Clean, ATS-friendly Australian layout. Server-side only.
 */
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ResumeContent } from "./resume";

const ACCENT = "#ea580c";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 44,
    paddingHorizontal: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.4,
  },
  name: { fontSize: 24, fontFamily: "Helvetica-Bold" },
  headline: { fontSize: 12, color: ACCENT, marginTop: 2 },
  contact: { fontSize: 9, color: MUTED, marginTop: 6 },
  workRights: {
    fontSize: 9,
    marginTop: 6,
    padding: 6,
    backgroundColor: "#fff7ed",
    color: "#9a3412",
  },
  section: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 6, color: ACCENT },
  expRole: { fontFamily: "Helvetica-Bold" },
  expMeta: { fontSize: 9, color: MUTED, marginBottom: 2 },
  bullet: { flexDirection: "row", marginBottom: 1 },
  bulletDot: { width: 10 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: {
    fontSize: 9,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 2 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 48,
    right: 48,
    fontSize: 7,
    color: MUTED,
    textAlign: "center",
  },
  letterMeta: { fontSize: 9, color: MUTED, marginBottom: 16 },
  letterBody: { fontSize: 11, lineHeight: 1.6 },
});

function contactLine(c: ResumeContent): string {
  return [c.location, c.phone, c.email].filter(Boolean).join("  ·  ");
}

export function buildResumeDocument(
  content: ResumeContent,
  opts: { coverLetter?: string; generatedOn: string }
) {
  return (
    <Document title={`${content.full_name} — Resume`} author="88Mate">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{content.full_name}</Text>
        <Text style={styles.headline}>{content.headline}</Text>
        {contactLine(content) ? (
          <Text style={styles.contact}>{contactLine(content)}</Text>
        ) : null}
        <Text style={styles.workRights}>{content.work_rights}</Text>

        <Text style={styles.section}>Professional Summary</Text>
        <Text>{content.professional_summary}</Text>

        {content.experience.length > 0 && (
          <>
            <Text style={styles.section}>Work Experience</Text>
            {content.experience.map((exp, i) => (
              <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={styles.expRole}>
                  {exp.role}
                  {exp.employer ? ` — ${exp.employer}` : ""}
                </Text>
                <Text style={styles.expMeta}>
                  {[exp.location, exp.dates].filter(Boolean).join("  ·  ")}
                </Text>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={{ flex: 1 }}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}

        {content.skills.length > 0 && (
          <>
            <Text style={styles.section}>Key Skills</Text>
            {/* Plain comma-separated text — ATS parsers read this cleanly,
                unlike bordered "pill" graphics. */}
            <Text>{content.skills.join(", ")}</Text>
          </>
        )}

        {content.education.length > 0 && (
          <>
            <Text style={styles.section}>Education</Text>
            {content.education.map((e, i) => (
              <View key={i} style={{ marginBottom: 3 }}>
                <Text style={styles.expRole}>{e.qualification}</Text>
                <Text style={styles.expMeta}>
                  {[e.institution, e.dates].filter(Boolean).join("  ·  ")}
                </Text>
              </View>
            ))}
          </>
        )}

        {content.certifications.length > 0 && (
          <>
            <Text style={styles.section}>Certifications &amp; Licences</Text>
            {content.certifications.map((c, i) => (
              <Text key={i}>• {c}</Text>
            ))}
          </>
        )}

        {content.languages.length > 0 && (
          <>
            <Text style={styles.section}>Languages</Text>
            <Text>
              {content.languages
                .map((l) => `${l.language} (${l.level})`)
                .join(", ")}
            </Text>
          </>
        )}

        {content.availability ? (
          <>
            <Text style={styles.section}>Availability</Text>
            <Text>{content.availability}</Text>
          </>
        ) : null}

        <Text style={styles.section}>References</Text>
        <Text>{content.references_note}</Text>

        <Text style={styles.footer} fixed>
          Generated with 88Mate · {opts.generatedOn}
        </Text>
      </Page>

      {opts.coverLetter ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.name}>{content.full_name}</Text>
          <Text style={styles.letterMeta}>
            {[content.location, content.phone, content.email]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.letterBody, { marginTop: 16 }]}>
            {opts.coverLetter}
          </Text>
          <Text style={styles.footer} fixed>
            Generated with 88Mate · {opts.generatedOn}
          </Text>
        </Page>
      ) : null}
    </Document>
  );
}
