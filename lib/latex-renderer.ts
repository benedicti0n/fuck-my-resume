import type { Resume } from "@/lib/schemas/resume";
import { parseContactUrl } from "@/lib/contact-links";
import type { ResumeTemplateId } from "@/lib/resume-templates";

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/\*\*([^*]+)\*\*/g, "\\textbf{$1}");
}

interface ContactDetail {
  url: string;
  display: string;
}

function getContactDetail(
  contact: Resume["contact"],
  kind: "linkedin" | "github"
): ContactDetail | null {
  const parsed = parseContactUrl(contact[kind] || "", kind);
  if (!parsed.url) return null;
  return { url: parsed.url, display: parsed.display };
}

// ---------------------------------------------------------------------------
// JAKE TEMPLATE
// ---------------------------------------------------------------------------

function renderJakeContactSection(contact: Resume["contact"]): string {
  const lines: string[] = [];

  lines.push("\\begin{center}");
  lines.push(
    "    {\\Huge \\scshape " + escapeLatex(contact.name) + "} \\\\ \\vspace{1pt}"
  );

  if (contact.address) {
    lines.push(
      "    " + escapeLatex(contact.address) + " \\\\ \\vspace{1pt}"
    );
  }

  const contactParts: string[] = [];
  if (contact.phone) {
    contactParts.push(
      "\\small \\raisebox{-0.1\\height}\\Telefon\\ " + escapeLatex(contact.phone)
    );
  }
  if (contact.email) {
    contactParts.push(
      "\\href{mailto:" + contact.email + "}{\\raisebox{-0.2\\height}\\Letter\\  \\uline{" + escapeLatex(contact.email) + "}}"
    );
  }

  const linkedin = getContactDetail(contact, "linkedin");
  if (linkedin) {
    contactParts.push(
      "\\href{" + linkedin.url + "}{\\uline{" + escapeLatex(linkedin.display) + "}}"
    );
  }

  const github = getContactDetail(contact, "github");
  if (github) {
    contactParts.push(
      "\\href{" + github.url + "}{\\uline{" + escapeLatex(github.display) + "}}"
    );
  }

  if (contactParts.length > 0) {
    lines.push("    " + contactParts.join(" ~ "));
  }

  lines.push("    \\vspace{-8pt}");
  lines.push("\\end{center}");

  return lines.join("\n");
}

function renderJakeEducationSection(education: Resume["education"]): string {
  const lines: string[] = [];

  lines.push("%-----------EDUCATION-----------");
  lines.push("\\section{Education}");
  lines.push("  \\resumeSubHeadingListStart");

  for (const edu of education) {
    lines.push("    \\resumeSubheading");
    lines.push(
      "      {" + escapeLatex(edu.institution) + "}{" + escapeLatex(edu.dateRange) + "}"
    );
    lines.push(
      "      {" + escapeLatex(edu.degree) + "}{" + (edu.location ? escapeLatex(edu.location) : "") + "}"
    );
  }

  lines.push("  \\resumeSubHeadingListEnd");

  return lines.join("\n");
}

function renderJakeCourseworkSection(
  coursework: string[] | undefined
): string {
  if (!coursework || coursework.length === 0) return "";

  const lines: string[] = [];

  lines.push("%------RELEVANT COURSEWORK-------");
  lines.push("\\section{Relevant Coursework}");
  lines.push("        \\begin{multicols}{4}");
  lines.push("            \\begin{itemize}[itemsep=-5pt, parsep=3pt]");

  for (const course of coursework) {
    lines.push("                \\item\\small " + escapeLatex(course));
  }

  lines.push("            \\end{itemize}");
  lines.push("        \\end{multicols}");
  lines.push("        \\vspace*{2.0\\multicolsep}");

  return lines.join("\n");
}

function renderJakeExperienceSection(
  experience: Resume["experience"]
): string {
  if (!experience || experience.length === 0) return "";

  const lines: string[] = [];

  lines.push("%-----------EXPERIENCE-----------");
  lines.push("\\section{Experience}");
  lines.push("  \\resumeSubHeadingListStart");

  for (const exp of experience) {
    lines.push("    \\resumeSubheading");
    lines.push(
      "      {" + escapeLatex(exp.company) + "}{" + escapeLatex(exp.dateRange) + "}"
    );
    lines.push(
      "      {" + escapeLatex(exp.position) + "}{" + (exp.location ? escapeLatex(exp.location) : "") + "}"
    );
    lines.push("      \\resumeItemListStart");

    for (const bullet of exp.bulletPoints) {
      lines.push("        \\resumeItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("    \\resumeItemListEnd");
  }

  lines.push("  \\resumeSubHeadingListEnd");
  lines.push("\\vspace{-6pt}");

  return lines.join("\n");
}

function renderJakeProjectsSection(projects: Resume["projects"]): string {
  if (!projects || projects.length === 0) return "";

  const lines: string[] = [];

  lines.push("%-----------PROJECTS-----------");
  lines.push("\\section{Projects}");
  lines.push("    \\vspace{-5pt}");
  lines.push("    \\resumeSubHeadingListStart");

  for (const project of projects) {
    const techPart = project.technologies
      ? " $|$ \\emph{" + escapeLatex(project.technologies) + "}"
      : "";
    const datePart = project.date
      ? "{" + escapeLatex(project.date) + "}"
      : "{}";

    lines.push("      \\resumeProjectHeading");
    lines.push(
      "          {\\textbf{" + escapeLatex(project.name) + "}" + techPart + "}" + datePart
    );
    lines.push("          \\resumeItemListStart");

    for (const bullet of project.bulletPoints) {
      lines.push("            \\resumeItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("          \\resumeItemListEnd");
    lines.push("          \\vspace{-7pt}");
  }

  lines.push("    \\resumeSubHeadingListEnd");
  lines.push("\\vspace{3pt}");

  return lines.join("\n");
}

function renderJakeSkillsSection(
  skills: Resume["technicalSkills"]
): string {
  if (!skills) return "";

  const lines: string[] = [];

  lines.push("%-----------PROGRAMMING SKILLS-----------");
  lines.push("\\section{Technical Skills}");
  lines.push(" \\begin{itemize}[leftmargin=0.15in, label={}]");
  lines.push("    \\small{\\item{");

  if (skills.languages && skills.languages.length > 0) {
    lines.push(
      "     \\textbf{Languages}{: " + escapeLatex(skills.languages.join(", ")) + "} \\\\"
    );
  }
  if (skills.developerTools && skills.developerTools.length > 0) {
    lines.push(
      "     \\textbf{Developer Tools}{: " + escapeLatex(skills.developerTools.join(", ")) + "} \\\\"
    );
  }
  if (
    skills.technologiesFrameworks &&
    skills.technologiesFrameworks.length > 0
  ) {
    lines.push(
      "     \\textbf{Technologies/Frameworks}{: " + escapeLatex(skills.technologiesFrameworks.join(", ")) + "} \\\\"
    );
  }

  lines.push("    }}");
  lines.push(" \\end{itemize}");
  lines.push(" \\vspace{-16pt}");

  return lines.join("\n");
}

function renderJakeLeadershipSection(
  leadership: Resume["leadership"]
): string {
  if (!leadership || leadership.length === 0) return "";

  const lines: string[] = [];

  lines.push("%-----------INVOLVEMENT---------------");
  lines.push("\\section{Leadership / Extracurricular}");
  lines.push("    \\resumeSubHeadingListStart");

  for (const entry of leadership) {
    lines.push(
      "        \\resumeSubheading{" + escapeLatex(entry.organization) + "}{" + escapeLatex(entry.dateRange) + "}{" + escapeLatex(entry.position) + "}{" + (entry.location ? escapeLatex(entry.location) : "") + "}"
    );
    lines.push("            \\resumeItemListStart");

    for (const bullet of entry.bulletPoints) {
      lines.push("                \\resumeItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("            \\resumeItemListEnd");
  }

  lines.push("    \\resumeSubHeadingListEnd");

  return lines.join("\n");
}

const JAKE_PREAMBLE = [
  "%-------------------------",
  "% Resume in Latex",
  "% Author : Generated by Fuck My Resume",
  "% License : MIT",
  "%------------------------",
  "",
  "\\documentclass[letterpaper,11pt]{article}",
  "",
  "\\usepackage{latexsym}",
  "\\usepackage[empty]{fullpage}",
  "\\usepackage{titlesec}",
  "\\usepackage{marvosym}",
  "\\usepackage[usenames,dvipsnames]{color}",
  "\\usepackage{verbatim}",
  "\\usepackage{enumitem}",
  "\\usepackage[hidelinks]{hyperref}",
  "\\usepackage{fancyhdr}",
  "\\usepackage[english]{babel}",
  "\\usepackage{tabularx}",
  "\\usepackage[normalem]{ulem}",
  "\\usepackage{iftex}",
  "\\usepackage{multicol}",
  "\\setlength{\\multicolsep}{-3.0pt}",
  "\\setlength{\\columnsep}{-1pt}",
  "\\ifPDFTeX",
  "  \\input{glyphtounicode}",
  "  \\pdfgentounicode=1",
  "\\fi",
  "",
  "\\pagestyle{fancy}",
  "\\fancyhf{} % clear all header and footer fields",
  "\\fancyfoot{}",
  "\\renewcommand{\\headrulewidth}{0pt}",
  "\\renewcommand{\\footrulewidth}{0pt}",
  "",
  "% Adjust margins",
  "\\addtolength{\\oddsidemargin}{-0.6in}",
  "\\addtolength{\\evensidemargin}{-0.5in}",
  "\\addtolength{\\textwidth}{1.19in}",
  "\\addtolength{\\topmargin}{-.7in}",
  "\\addtolength{\\textheight}{1.4in}",
  "",
  "\\urlstyle{same}",
  "",
  "\\raggedbottom",
  "\\raggedright",
  "\\setlength{\\tabcolsep}{0in}",
  "",
  "% Sections formatting",
  "\\titleformat{\\section}{",
  "  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries",
  "}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]",
  "",
  "%-------------------------",
  "% Custom commands",
  "\\newcommand{\\resumeItem}[1]{",
  "  \\item\\small{",
  "    {#1 \\vspace{-2pt}}",
  "  }",
  "}",
  "",
  "\\newcommand{\\classesList}[4]{",
  "    \\item\\small{",
  "        {#1 #2 #3 #4 \\vspace{-2pt}}",
  "  }",
  "}",
  "",
  "\\newcommand{\\resumeSubheading}[4]{",
  "  \\vspace{-2pt}\\item",
  "    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}",
  "      \\textbf{#1} & \\textbf{\\small #2} \\\\",
  "      \\textit{\\small#3} & \\textit{\\small #4} \\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeSubSubheading}[2]{",
  "    \\item",
  "    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}",
  "      \\textit{\\small#1} & \\textit{\\small #2} \\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeProjectHeading}[2]{",
  "    \\item",
  "    \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}",
  "      \\small#1 & \\textbf{\\small #2}\\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}",
  "",
  "\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "",
  "\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}",
  "\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}",
  "\\newcommand{\\resumeItemListStart}{\\begin{itemize}}",
  "\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}",
  "",
  "%-------------------------------------------",
  "%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%",
  "",
  "",
  "\\begin{document}",
].join("\n");

function renderJakeLatex(resume: Resume): string {
  const sections: string[] = [];

  sections.push(JAKE_PREAMBLE);
  sections.push(renderJakeContactSection(resume.contact));
  sections.push(renderJakeEducationSection(resume.education));
  sections.push(renderJakeCourseworkSection(resume.relevantCoursework));
  sections.push(renderJakeExperienceSection(resume.experience));
  sections.push(renderJakeProjectsSection(resume.projects));
  sections.push(renderJakeSkillsSection(resume.technicalSkills));
  sections.push(renderJakeLeadershipSection(resume.leadership));
  sections.push("\\end{document}");

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// ASG ATS TEMPLATE
// ---------------------------------------------------------------------------

const ASG_ATS_PREAMBLE = [
  "\\documentclass[10pt]{article}",
  "\\usepackage[margin=0.58in]{geometry}",
  "\\usepackage[T1]{fontenc}",
  "\\usepackage{lmodern}",
  "\\usepackage[hidelinks]{hyperref}",
  "\\usepackage{enumitem}",
  "\\usepackage{xcolor}",
  "\\usepackage{titlesec}",
  "\\usepackage{fontawesome5}",
  "\\pagestyle{empty}",
  "\\setlength{\\parindent}{0pt}",
  "\\definecolor{ink}{HTML}{1E293B}",
  "\\definecolor{accent}{HTML}{0F766E}",
  "\\setlist[itemize]{leftmargin=1.2em,itemsep=1pt,topsep=2pt}",
  "\\titleformat{\\section}{\\large\\bfseries\\color{accent}}{}{0pt}{}[\\color{accent}\\titlerule]",
  "\\titlespacing*{\\section}{0pt}{8pt}{4pt}",
  "\\newcommand{\\entry}[4]{\\textbf{#1}\\hfill #2\\\\\\textit{#3}\\hfill #4\\\\}",
  "\\begin{document}",
].join("\n");

function renderAsgAtsContactSection(contact: Resume["contact"]): string {
  const parts: string[] = [];

  if (contact.address) {
    parts.push(
      "\\faMapMarker\\ " + escapeLatex(contact.address)
    );
  }
  if (contact.phone) {
    parts.push("\\faPhone\\ " + escapeLatex(contact.phone));
  }
  if (contact.email) {
    parts.push(
      "\\href{mailto:" + contact.email + "}{\\faEnvelope\\ " + escapeLatex(contact.email) + "}"
    );
  }
  const linkedin = getContactDetail(contact, "linkedin");
  if (linkedin) {
    parts.push(
      "\\href{" + linkedin.url + "}{\\faLinkedin\\ " + escapeLatex(linkedin.display) + "}"
    );
  }
  const github = getContactDetail(contact, "github");
  if (github) {
    parts.push(
      "\\href{" + github.url + "}{\\faGithub\\ " + escapeLatex(github.display) + "}"
    );
  }

  return [
    "\\begin{center}",
    "  {\\LARGE\\bfseries\\color{ink} " + escapeLatex(contact.name) + "}\\\\[3pt]",
    "  " + parts.join(" \\enspace|\\enspace "),
    "\\end{center}",
    "\\small",
  ].join("\n");
}

function renderAsgAtsExperienceSection(
  experience: Resume["experience"]
): string {
  if (!experience || experience.length === 0) return "";

  const lines: string[] = [];
  lines.push("\\section*{Experience}");

  for (const exp of experience) {
    lines.push("\\entry{" + escapeLatex(exp.company) + "}{" + escapeLatex(exp.dateRange) + "}{" + escapeLatex(exp.position) + "}{" + (exp.location ? escapeLatex(exp.location) : "") + "}");
    if (exp.bulletPoints && exp.bulletPoints.length > 0) {
      lines.push("\\begin{itemize}");
      for (const bullet of exp.bulletPoints) {
        lines.push("  \\item " + escapeLatex(bullet));
      }
      lines.push("\\end{itemize}");
    }
  }

  return lines.join("\n");
}

function renderAsgAtsProjectsSection(projects: Resume["projects"]): string {
  if (!projects || projects.length === 0) return "";

  const lines: string[] = [];
  lines.push("\\section*{Selected work}");

  for (const project of projects) {
    lines.push("\\entry{" + escapeLatex(project.name) + "}{" + escapeLatex(project.date || "") + "}{" + (project.technologies ? escapeLatex(project.technologies) : "") + "}{}");
    if (project.bulletPoints && project.bulletPoints.length > 0) {
      lines.push("\\begin{itemize}");
      for (const bullet of project.bulletPoints) {
        lines.push("  \\item " + escapeLatex(bullet));
      }
      lines.push("\\end{itemize}");
    }
  }

  return lines.join("\n");
}

function renderAsgAtsSkillsSection(
  skills: Resume["technicalSkills"]
): string {
  if (!skills) return "";

  const lines: string[] = [];
  lines.push("\\section*{Technical skills}");

  if (skills.languages && skills.languages.length > 0) {
    lines.push("\\textbf{Languages:} " + escapeLatex(skills.languages.join(", ")) + "\\\\");
  }
  if (skills.developerTools && skills.developerTools.length > 0) {
    lines.push("\\textbf{Developer tools:} " + escapeLatex(skills.developerTools.join(", ")) + "\\\\");
  }
  if (
    skills.technologiesFrameworks &&
    skills.technologiesFrameworks.length > 0
  ) {
    lines.push("\\textbf{Technologies \\& frameworks:} " + escapeLatex(skills.technologiesFrameworks.join(", ")) + "\\\\");
  }

  return lines.join("\n");
}

function renderAsgAtsEducationSection(
  education: Resume["education"]
): string {
  if (!education || education.length === 0) return "";

  const lines: string[] = [];
  lines.push("\\section*{Education}");

  for (const edu of education) {
    lines.push("\\entry{" + escapeLatex(edu.institution) + "}{" + escapeLatex(edu.dateRange) + "}{" + escapeLatex(edu.degree) + "}{" + (edu.location ? escapeLatex(edu.location) : "") + "}");
  }

  return lines.join("\n");
}

function renderAsgAtsLeadershipSection(
  leadership: Resume["leadership"]
): string {
  if (!leadership || leadership.length === 0) return "";

  const lines: string[] = [];
  lines.push("\\section*{Leadership}");

  for (const entry of leadership) {
    lines.push("\\entry{" + escapeLatex(entry.organization) + "}{" + escapeLatex(entry.dateRange) + "}{" + escapeLatex(entry.position) + "}{" + (entry.location ? escapeLatex(entry.location) : "") + "}");
    if (entry.bulletPoints && entry.bulletPoints.length > 0) {
      lines.push("\\begin{itemize}");
      for (const bullet of entry.bulletPoints) {
        lines.push("  \\item " + escapeLatex(bullet));
      }
      lines.push("\\end{itemize}");
    }
  }

  return lines.join("\n");
}

function renderAsgAtsLatex(resume: Resume): string {
  const sections: string[] = [];

  sections.push(ASG_ATS_PREAMBLE);
  sections.push(renderAsgAtsContactSection(resume.contact));
  sections.push(renderAsgAtsExperienceSection(resume.experience));
  sections.push(renderAsgAtsProjectsSection(resume.projects));
  sections.push(renderAsgAtsSkillsSection(resume.technicalSkills));
  sections.push(renderAsgAtsEducationSection(resume.education));
  sections.push(renderAsgAtsLeadershipSection(resume.leadership));
  sections.push("\\end{document}");

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// ATS-FRIENDLY TEMPLATE
// ---------------------------------------------------------------------------

function renderAtsFriendlyContactSection(
  contact: Resume["contact"]
): string {
  const lines: string[] = [];

  lines.push("\\begin{center}");
  lines.push(
    "    {\\Huge \\scshape \\color{ACCENT_COLOR} " + escapeLatex(contact.name) + "} \\\\ \\vspace{1pt}"
  );

  const detailParts: string[] = [];
  if (contact.address) {
    detailParts.push(
      "\\raisebox{-0.1\\height}\\faMapMarker\\ " + escapeLatex(contact.address)
    );
  }
  if (contact.phone) {
    detailParts.push(
      "\\small \\raisebox{-0.1\\height}\\faPhone\\ " + escapeLatex(contact.phone)
    );
  }
  if (contact.email) {
    detailParts.push(
      "\\href{mailto:" + contact.email + "}{\\raisebox{-0.1\\height}\\faEnvelope\\  \\underline{" + escapeLatex(contact.email) + "}}"
    );
  }

  if (detailParts.length > 0) {
    lines.push("    " + detailParts.join(" ~~ "));
    lines.push("    \\\\ \\vspace{2pt}");
  }

  const linkParts: string[] = [];
  const linkedin = getContactDetail(contact, "linkedin");
  if (linkedin) {
    linkParts.push(
      "\\href{" + linkedin.url + "}{\\raisebox{-0.1\\height}\\faLinkedin\\ \\underline{" + escapeLatex(linkedin.display) + "}}"
    );
  }
  const github = getContactDetail(contact, "github");
  if (github) {
    linkParts.push(
      "\\href{" + github.url + "}{\\raisebox{-0.1\\height}\\faGithub\\ \\underline{" + escapeLatex(github.display) + "}}"
    );
  }

  if (linkParts.length > 0) {
    lines.push("    " + linkParts.join(" ~~ "));
  }

  lines.push("    \\vspace{-8pt}");
  lines.push("\\end{center}");

  return lines.join("\n");
}

function renderAtsFriendlySkillsSection(
  skills: Resume["technicalSkills"]
): string {
  if (!skills) return "";

  const lines: string[] = [];

  lines.push("\\section{TECHNICAL SKILLS}");
  lines.push("\\begin{itemize}[noitemsep, left=0pt]");

  if (skills.languages && skills.languages.length > 0) {
    lines.push(
      "    \\item \\textbf{Languages:} " + escapeLatex(skills.languages.join(", "))
    );
  }
  if (
    skills.technologiesFrameworks &&
    skills.technologiesFrameworks.length > 0
  ) {
    lines.push(
      "    \\item \\textbf{Frameworks \\& Libraries:} " + escapeLatex(skills.technologiesFrameworks.join(", "))
    );
  }
  if (skills.developerTools && skills.developerTools.length > 0) {
    lines.push(
      "    \\item \\textbf{Tools \\& Technologies:} " + escapeLatex(skills.developerTools.join(", "))
    );
  }

  lines.push("\\end{itemize}");
  lines.push("\\vspace{-13pt}");

  return lines.join("\n");
}

function renderAtsFriendlyExperienceSection(
  experience: Resume["experience"]
): string {
  if (!experience || experience.length === 0) return "";

  const lines: string[] = [];

  lines.push("\\section{PROFESSIONAL EXPERIENCE}");
  lines.push("  \\customSubHeadingContentStart");

  for (const exp of experience) {
    lines.push("    \\customSubHeading");
    lines.push(
      "      {" + escapeLatex(exp.company) + "}{" + escapeLatex(exp.dateRange) + "}"
    );
    lines.push(
      "      {" + escapeLatex(exp.position) + "}{" + (exp.location ? escapeLatex(exp.location) : "") + "}"
    );
    lines.push("      \\customItemListStart");

    for (const bullet of exp.bulletPoints) {
      lines.push("        \\customItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("    \\customItemListEnd");
  }

  lines.push("  \\customSubHeadingContentEnd");
  lines.push("\\vspace{-10pt}");

  return lines.join("\n");
}

function renderAtsFriendlyProjectsSection(
  projects: Resume["projects"]
): string {
  if (!projects || projects.length === 0) return "";

  const lines: string[] = [];

  lines.push("\\section{KEY PROJECTS}");
  lines.push("    \\vspace{-5pt}");
  lines.push("    \\customSubHeadingContentStart");

  for (const project of projects) {
    const techPart = project.technologies
      ? " $|$ \\emph{" + escapeLatex(project.technologies) + "}"
      : "";
    const datePart = project.date
      ? "{" + escapeLatex(project.date) + "}"
      : "{}";

    lines.push("      \\customProject");
    lines.push(
      "          {\\textbf{" + escapeLatex(project.name) + "}" + techPart + "}" + datePart
    );
    lines.push("          \\customItemListStart");

    for (const bullet of project.bulletPoints) {
      lines.push("            \\customItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("          \\customItemListEnd");
    lines.push("          \\vspace{-13pt}");
  }

  lines.push("    \\customSubHeadingContentEnd");
  lines.push("\\vspace{3pt}");

  return lines.join("\n");
}

function renderAtsFriendlyEducationSection(
  education: Resume["education"]
): string {
  if (!education || education.length === 0) return "";

  const lines: string[] = [];

  lines.push("\\section{EDUCATION}");
  lines.push("  \\customSubHeadingContentStart");

  for (const edu of education) {
    lines.push(" \\customSubHeading");
    lines.push(
      "      {" + escapeLatex(edu.institution) + "}{" + escapeLatex(edu.dateRange) + "}"
    );
    lines.push(
      "      {" + escapeLatex(edu.degree) + "}{" + (edu.location ? escapeLatex(edu.location) : "") + "}"
    );
  }

  lines.push("  \\customSubHeadingContentEnd");
  lines.push("\\vspace{-8pt}");

  return lines.join("\n");
}

function renderAtsFriendlyLeadershipSection(
  leadership: Resume["leadership"]
): string {
  if (!leadership || leadership.length === 0) return "";

  const lines: string[] = [];

  lines.push("\\section{LEADERSHIP \\& ACTIVITIES}");
  lines.push("    \\customSubHeadingContentStart");

  for (const entry of leadership) {
    lines.push(
      "        \\customSubHeading{" + escapeLatex(entry.organization) + "}{" + escapeLatex(entry.dateRange) + "}{" + escapeLatex(entry.position) + "}{" + (entry.location ? escapeLatex(entry.location) : "") + "}"
    );
    lines.push("            \\customItemListStart");

    for (const bullet of entry.bulletPoints) {
      lines.push("                \\customItem{" + escapeLatex(bullet) + "}");
    }

    lines.push("            \\customItemListEnd");
  }

  lines.push("    \\customSubHeadingContentEnd");
  lines.push("\\vspace{-10pt}");

  return lines.join("\n");
}

const ATS_FRIENDLY_PREAMBLE = [
  "%-------------------------",
  "% Modern ATS-Friendly CV in LaTeX",
  "% Generated by Fuck My Resume",
  "%------------------------",
  "",
  "\\documentclass[letterpaper,11pt]{article}",
  "\\usepackage{latexsym}",
  "\\usepackage[empty]{fullpage}",
  "\\usepackage{titlesec}",
  "\\usepackage{marvosym}",
  "\\usepackage[usenames,dvipsnames]{color}",
  "\\usepackage{verbatim}",
  "\\usepackage{enumitem}",
  "\\usepackage[hidelinks]{hyperref}",
  "\\usepackage{fancyhdr}",
  "\\usepackage[english]{babel}",
  "\\usepackage{tabularx}",
  "\\usepackage{fontawesome5}",
  "\\usepackage{multicol}",
  "\\setlength{\\multicolsep}{-3.0pt}",
  "\\setlength{\\columnsep}{-1pt}",
  "\\ifPDFTeX",
  "\\input{glyphtounicode}",
  "\\fi",
  "\\usepackage{graphicx}",
  "\\usepackage{hyperref}",
  "",
  "\\pagestyle{fancy}",
  "\\fancyhf{}",
  "\\fancyfoot{}",
  "\\renewcommand{\\headrulewidth}{0pt}",
  "\\renewcommand{\\footrulewidth}{0pt}",
  "",
  "\\addtolength{\\oddsidemargin}{-0.6in}",
  "\\addtolength{\\evensidemargin}{-0.5in}",
  "\\addtolength{\\textwidth}{1.19in}",
  "\\addtolength{\\topmargin}{-.7in}",
  "\\addtolength{\\textheight}{1.4in}",
  "",
  "\\urlstyle{same}",
  "",
  "\\raggedbottom",
  "\\raggedright",
  "\\setlength{\\tabcolsep}{0in}",
  "",
  "% Define accent color - Professional Blue",
  "\\usepackage{xcolor}",
  "\\definecolor{ACCENT_COLOR}{RGB}{0, 102, 204}",
  "",
  "% Sections formatting",
  "\\titleformat{\\section}{",
  "\\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries\\color{ACCENT_COLOR}",
  "}{}{0em}{}[\\color{ACCENT_COLOR}\\titlerule \\vspace{-5pt}]",
  "",
  "% Ensure that generated pdf is machine readable/ATS parsable",
  "\\ifPDFTeX",
  "\\pdfgentounicode=1",
  "\\fi",
  "",
  "% Custom commands",
  "\\newcommand{\\customItem}[1]{",
  "  \\item\\small{",
  "    {#1 \\vspace{-2pt}}",
  "  }",
  "}",
  "",
  "\\newcommand{\\customSubHeading}[4]{",
  "  \\vspace{-2pt}\\item",
  "    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}",
  "      \\textbf{#1} & \\textbf{\\small #2} \\\\",
  "      \\textit{\\small#3} & \\textit{\\small #4} \\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\newcommand{\\customProject}[2]{",
  "    \\item",
  "    \\begin{tabular*}{1.001\\textwidth}{l@{\\extracolsep{\\fill}}r}",
  "      \\small#1 & \\textbf{\\small #2}\\\\",
  "    \\end{tabular*}\\vspace{-7pt}",
  "}",
  "",
  "\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}",
  "",
  "\\newcommand{\\customSubHeadingContentStart}{\\begin{itemize}[leftmargin=0.0in, label={}]}",
  "\\newcommand{\\customSubHeadingContentEnd}{\\end{itemize}}",
  "\\newcommand{\\customItemListStart}{\\begin{itemize}}",
  "\\newcommand{\\customItemListEnd}{\\end{itemize}\\vspace{-5pt}}",
  "",
  "\\begin{document}",
].join("\n");

function renderAtsFriendlyLatex(resume: Resume): string {
  const sections: string[] = [];

  sections.push(ATS_FRIENDLY_PREAMBLE);
  sections.push(renderAtsFriendlyContactSection(resume.contact));
  sections.push(renderAtsFriendlySkillsSection(resume.technicalSkills));
  sections.push(renderAtsFriendlyExperienceSection(resume.experience));
  sections.push(renderAtsFriendlyProjectsSection(resume.projects));
  sections.push(renderAtsFriendlyEducationSection(resume.education));
  sections.push(renderAtsFriendlyLeadershipSection(resume.leadership));
  sections.push("\\end{document}");

  return sections.join("\n\n");
}

const TEMPLATE_RENDERERS: Record<ResumeTemplateId, (resume: Resume) => string> = {
  "jake-resume": renderJakeLatex,
  "asg-ats-resume": renderAsgAtsLatex,
  "ats-friendly-template": renderAtsFriendlyLatex,
};

export function generateLatex(
  resume: Resume,
  templateId: ResumeTemplateId = "jake-resume"
): string {
  return TEMPLATE_RENDERERS[templateId](resume);
}