export type ResumeTemplateId =
  | "jake-resume"
  | "asg-ats-resume"
  | "ats-friendly-template"

export interface ResumeTemplate {
  id: ResumeTemplateId
  name: string
  description: string
  previewImage: string
  pdfPath: string
}

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    id: "jake-resume",
    name: "Jake",
    description:
      "Clean two-column layout with a centered header and crisp typography — a classic favorite for tech roles.",
    previewImage: "/templates/jake-resume.png",
    pdfPath: "/templates/jake-resume.pdf",
  },
  {
    id: "asg-ats-resume",
    name: "ASG ATS",
    description:
      "Strictly single-column and minimalist, engineered to parse cleanly through applicant tracking systems.",
    previewImage: "/templates/asg-ats-resume.png",
    pdfPath: "/templates/asg-ats-resume.pdf",
  },
  {
    id: "ats-friendly-template",
    name: "ATS Friendly",
    description:
      "Professional blue-accented design with structured sections for summary, skills, experience, and projects.",
    previewImage: "/templates/ats-friendly-template.png",
    pdfPath: "/templates/ats-friendly-template.pdf",
  },
]