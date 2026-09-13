"use client"

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { Resume } from "@/lib/schemas/resume"
import { parseContactUrl } from "@/lib/contact-links"

// FontAwesome 5 glyphs used by the resume templates' contact headers. The
// LaTeX templates pull these from the `fontawesome5` package; here we embed
// the same glyphs directly so the downloaded PDF matches the generated .tex.
export const FA_ICONS = {
  mapMarker: { family: "FontAwesomeSolid", glyph: "\uF041" },
  phone: { family: "FontAwesomeSolid", glyph: "\uF095" },
  envelope: { family: "FontAwesomeSolid", glyph: "\uF0E0" },
  linkedin: { family: "FontAwesomeBrands", glyph: "\uF08C" },
  github: { family: "FontAwesomeBrands", glyph: "\uF09B" },
} as const

export type FaIconKey = keyof typeof FA_ICONS

Font.register({
  family: "FontAwesomeSolid",
  src: "/fonts/fa-solid-900.ttf",
})
Font.register({
  family: "FontAwesomeBrands",
  src: "/fonts/fa-brands-400.ttf",
})

const styles = StyleSheet.create({
  page: {
    padding: "36 40",
    fontSize: 10,
    lineHeight: 1.45,
    color: "#000000",
    fontFamily: "Times-Roman",
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    lineHeight: 1.3,
  },
  headerLine: {
    fontSize: 9,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  contactLine: {
    fontSize: 8,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  contactIcon: {
    fontSize: 8,
    marginRight: 2,
    marginTop: 1,
  },
  headerText: {
    fontSize: 9,
  },
  contactText: {
    fontSize: 8,
  },
  contactSep: {
    width: 6,
    fontSize: 8,
  },
  link: {
    color: "#000000",
    textDecoration: "none",
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#000000",
    paddingBottom: 2,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bold: {
    fontWeight: "bold",
  },
  italic: {
    fontFamily: "Times-Italic",
    fontSize: 9,
  },
  meta: {
    fontSize: 9,
  },
  bullets: {
    marginTop: 2,
  },
  bullet: {
    flexDirection: "row",
    marginTop: 1,
  },
  bulletDot: {
    width: 10,
    fontSize: 9,
  },
  bulletText: {
    flex: 1,
  },
  coursework: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  courseworkItem: {
    width: "25%",
    fontSize: 9,
  },
  skills: {
    fontSize: 9,
  },
  skillsRow: {
    marginTop: 1,
  },
  block: {
    marginBottom: 4,
  },
})

interface PdfResumeProps {
  resume: Resume
}

export function PdfResume({ resume }: PdfResumeProps) {
  const { contact, education, relevantCoursework, experience, projects, technicalSkills, leadership } = resume

  const parsedLinkedin = parseContactUrl(contact.linkedin || "", "linkedin")
  const parsedGithub = parseContactUrl(contact.github || "", "github")

  const contactParts: React.ReactNode[] = []
  if (contact.phone) {
    contactParts.push(
      <React.Fragment key="phone">
        <Text style={[styles.contactIcon, { fontFamily: FA_ICONS.phone.family }]}>
          {FA_ICONS.phone.glyph}
        </Text>
        <Text style={styles.contactText}>{" "}{contact.phone}</Text>
      </React.Fragment>
    )
  }
  if (contact.email) {
    contactParts.push(
      <React.Fragment key="email">
        <Text style={styles.contactSep}>{"   "}</Text>
        <Text style={[styles.contactIcon, { fontFamily: FA_ICONS.envelope.family }]}>
          {FA_ICONS.envelope.glyph}
        </Text>
        <Link src={`mailto:${contact.email}`} style={[styles.link, styles.contactText]}>
          {" "}{contact.email}
        </Link>
      </React.Fragment>
    )
  }
  if (parsedLinkedin.url && parsedLinkedin.display) {
    contactParts.push(
      <React.Fragment key="linkedin">
        <Text style={styles.contactSep}>{"   "}</Text>
        <Text style={[styles.contactIcon, { fontFamily: FA_ICONS.linkedin.family }]}>
          {FA_ICONS.linkedin.glyph}
        </Text>
        <Link src={parsedLinkedin.url} style={[styles.link, styles.contactText]}>
          {" "}{parsedLinkedin.display}
        </Link>
      </React.Fragment>
    )
  }
  if (parsedGithub.url && parsedGithub.display) {
    contactParts.push(
      <React.Fragment key="github">
        <Text style={styles.contactSep}>{"   "}</Text>
        <Text style={[styles.contactIcon, { fontFamily: FA_ICONS.github.family }]}>
          {FA_ICONS.github.glyph}
        </Text>
        <Link src={parsedGithub.url} style={[styles.link, styles.contactText]}>
          {" "}{parsedGithub.display}
        </Link>
      </React.Fragment>
    )
  }

  return (
    <Document title="resume.pdf">
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{contact.name}</Text>
          {contact.address && (
            <View style={styles.headerLine}>
              <Text style={[styles.contactIcon, { fontFamily: FA_ICONS.mapMarker.family }]}>
                {FA_ICONS.mapMarker.glyph}
              </Text>
              <Text style={styles.headerText}>{" "}{contact.address}</Text>
            </View>
          )}
          {contactParts.length > 0 && (
            <View style={styles.contactLine}>
              {contactParts}
            </View>
          )}
        </View>

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, i) => (
              <View key={i} style={styles.block}>
                <View style={styles.row}>
                  <Text style={styles.bold}>
                    <RichPdfText text={edu.institution} />
                  </Text>
                  <Text style={styles.meta}>{edu.dateRange}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italic}>
                    <RichPdfText text={edu.degree} />
                  </Text>
                  <Text style={styles.meta}>{edu.location}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Relevant Coursework */}
        {relevantCoursework.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relevant Coursework</Text>
            <View style={styles.coursework}>
              {relevantCoursework.map((course, i) => (
                <Text key={i} style={styles.courseworkItem}>
                  {course}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {experience.map((exp, i) => (
              <View key={i} style={styles.block}>
                <View style={styles.row}>
                  <Text style={styles.bold}>
                    <RichPdfText text={exp.company} />
                  </Text>
                  <Text style={styles.meta}>{exp.dateRange}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italic}>
                    <RichPdfText text={exp.position} />
                  </Text>
                  <Text style={styles.meta}>{exp.location}</Text>
                </View>
                <View style={styles.bullets}>
                  {exp.bulletPoints.map((bullet, j) => (
                    <Bullet key={j} text={bullet} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((project, i) => (
              <View key={i} style={styles.block}>
                <View style={styles.row}>
                  <Text style={styles.bold}>
                    <RichPdfText text={project.name} />
                    {project.technologies && (
                      <Text style={styles.italic}>{" | "}
                        <RichPdfText text={project.technologies} />
                      </Text>
                    )}
                  </Text>
                  <Text style={styles.meta}>{project.date}</Text>
                </View>
                <View style={styles.bullets}>
                  {project.bulletPoints.map((bullet, j) => (
                    <Bullet key={j} text={bullet} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Technical Skills */}
        {technicalSkills && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            <View style={styles.skills}>
              {technicalSkills.languages.length > 0 && (
                <Text style={styles.skillsRow}>
                  <Text style={styles.bold}>Languages: </Text>
                  {technicalSkills.languages.join(", ")}
                </Text>
              )}
              {technicalSkills.developerTools.length > 0 && (
                <Text style={styles.skillsRow}>
                  <Text style={styles.bold}>Developer Tools: </Text>
                  {technicalSkills.developerTools.join(", ")}
                </Text>
              )}
              {technicalSkills.technologiesFrameworks.length > 0 && (
                <Text style={styles.skillsRow}>
                  <Text style={styles.bold}>Technologies/Frameworks: </Text>
                  {technicalSkills.technologiesFrameworks.join(", ")}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Leadership */}
        {leadership.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leadership / Extracurricular</Text>
            {leadership.map((entry, i) => (
              <View key={i} style={styles.block}>
                <View style={styles.row}>
                  <Text style={styles.bold}>
                    <RichPdfText text={entry.organization} />
                  </Text>
                  <Text style={styles.meta}>{entry.dateRange}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.italic}>
                    <RichPdfText text={entry.position} />
                  </Text>
                  <Text style={styles.meta}>{entry.location}</Text>
                </View>
                <View style={styles.bullets}>
                  {entry.bulletPoints.map((bullet, j) => (
                    <Bullet key={j} text={bullet} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletDot}>{"\u2022"}</Text>
      <Text style={styles.bulletText}>
        <RichPdfText text={text} />
      </Text>
    </View>
  )
}

function RichPdfText({ text }: { text: string }) {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Text key={i} style={styles.bold}>{part}</Text> : part
      )}
    </>
  )
}