# 05 — Resume Pipeline

End-to-end: uploaded PDF → structured Resume JSON → highlighted preview → LaTeX → PDF/`.tex` download.

## Stage 1 — PDF text extraction (client, `lib/pdf-parser.ts`)

- `extractTextFromPDF(file)` — loads `pdfjs-dist`, iterates pages, concatenates `item.str` per page joined by `" "`, pages joined by `"\n"`.
- Worker: `pdfjsLib.GlobalWorkerOptions.workerSrc = cdnjs pdf.worker.min.mjs` (CDN, version-matched).
- `extractContactLinksFromPDF(file)` — reads **link annotations** (`page.getAnnotations()` → `annotation.url`) and captures the first `linkedin.com/in/` and `github.com/` URLs. Rationale: displayed PDF text can differ from the true link target, so annotation URLs are authoritative.
- After parsing, `/generate` page overlays annotation URLs onto `resume.contact` (`app/generate/page.tsx:114-121`) — annotation wins, else LLM-parsed value kept.

## Stage 2 — LLM parse + enhance (`lib/llm.ts` + `app/api/parse-resume/route.ts`)

`parseResumeWithLLM(resumeText, jobDescription?, provider, apiKey, modelId?)`:

- Uses `generateText` with `Output.object({ schema: parseResultSchema })` → structured output.
- Model resolved via `getModel(provider, apiKey, modelId)` → `createGoogleGenerativeAI` or `createOpenAI`, default model from `DEFAULT_BRAIN_MODEL[provider]` (`gpt-5.4-mini` / `gemini-3.5-flash`).
- **System prompt** (`SYSTEM_PROMPT` in `lib/llm.ts`) is a hard contract. Critical rules:
  1. NEVER fabricate companies/jobs/projects/skills; JD is only for keyword tailoring.
  2. Contact links: strip domain/in duplication — `"github.com/subhraneel2005/nini"` → `"subhraneel2005/nini"`, `"https://www.linkedin.com/in/subhraneel"` → `"subhraneel"`; empty string if missing.
  3. Preserve per-bullet repo URLs verbatim (distinct from contact-section links).
  4. Contact fields must be bare (phone digits only, address location only, email bare).
  5. Enhancement: 5–6 bullets per experience, 4–5 per project, 1.5–2 lines each, action-verb starters, plausible metrics, JD keyword weaving, all technologies into skills, 6–8 coursework items.
  6. **Bolding:** wrap 1–3 impactful words/phrases in `**…**` (metrics, technologies, outcomes) — this survives into LaTeX (`\textbf`) and PDF.
  7. **aiChanges annotation:** output verbatim text of every added bullet / rewritten (tailored) bullet, plus addedSkills and addedCoursework labels — used for the highlight audit.

**API response:** `{ resume, aiChanges, highlights }` — highlights computed server-side by `buildHighlights`.

## Stage 3 — AI-change highlights (`lib/highlights.ts`)

- `AiChanges` (from LLM) contains string buckets per section: `addedBullets`, `tailoredBullets`, `addedSkills`, `addedCoursework`.
- `resolveBullets` matches bullet strings **exactly** against the final resume to compute `entry*1000 + bulletIndex` codes — no reliance on counts or order.
- `tokenizeJd(jd)` builds 1–3 token n-grams (stopwords + generic-terms filtered), longest first; each resume bullet is then matched for JD phrases (case-insensitive substring) → `jd: Record<bulletIndex, string[]>`.
- Output `Highlights`:
  ```ts
  { experience: EntryHighlights[], projects: EntryHighlights[], leadership: EntryHighlights[],
    addedSkills: string[], addedCoursework: string[] }
  // EntryHighlights = { added: number[], tailored: number[], jd: Record<number, string[]> }
  ```
- Added skills/coursework are only kept when absent from the original resume text AND not part of the JD terms (avoids noise).
- `emptyHighlights()`/`hasHighlights()` used by the preview to decide legend rendering.

## Stage 4 — Resume JSON contract (`lib/schemas/resume.ts`)

Zod schemas: `contact` (name, address, phone, email, linkedin, github), `education[]`, `relevantCoursework[]`, `experience[]` (company, dateRange, position, location, bulletPoints), `projects[]` (name, technologies, date, bulletPoints), `technicalSkills` (languages, developerTools, technologiesFrameworks), `leadership[]`. `parseResultSchema = { resume, aiChanges }`. All strings; optional content represented as empty strings/arrays (LLM prompt enforces this).

## Stage 5 — Templates (`lib/resume-templates.ts`, `lib/latex-renderer.ts`)

Three templates (metadata has preview PNG + sample PDF under `public/templates/`):

| id | Name | Style |
| --- | --- | --- |
| `jake-resume` | Jake | Classic two-column-ish, centered header, serif, `\scshape` name |
| `asg-ats-resume` | ASG ATS | Minimal single-column, icon contact bar (fontawesome5), accent teal |
| `ats-friendly-template` | ATS Friendly | Blue-accented, uppercase section titles, fontawesome icons |

- `generateLatex(resume, templateId)` selects a pure renderer per template. Sections assembled in fixed order (contact → education → coursework → experience → projects → skills → leadership; ASG/ATS order differs slightly).
- `escapeLatex` handles `\ & % $ # _ { } ~ ^` and converts `**bold**` → `\textbf{}`.
- Contact links use `parseContactUrl` (`lib/contact-links.ts`) — cleans doubled domains/schemes/`/in/` and builds `https://linkedin.com/in/<handle>` / `https://github.com/<handle>` + display text. Renders as `\href`.
- Templates are string-built (no LaTeX compiler server-side); users can compile the `.tex` themselves (Overleaf etc.). Reference files: `templates/resumes/*.tex`.

## Stage 6 — Preview & PDF (client)

- **Preview:** `components/resume-preview.tsx` renders an 8.5×11in ATS-style HTML resume. Color coding:
  - Added bullet → amber bg + left border (`#d97706`)
  - Tailored bullet → light blue bg (`#3b82f6` @10%)
  - JD keyword matches → inline yellow `<mark>` (`#fde047`), longest-phrase-wins with merged overlapping spans
  - Added skills/coursework → amber underline chips
  - Legend shown only when `hasHighlights()`.
- **PDF:** `components/pdf-resume.tsx` — `@react-pdf/renderer` `Document/Page/Text/View/Link`. Letter size, Times-Roman. Embeds FontAwesome glyphs from `public/fonts/fa-solid-900.ttf` + `fa-brands-400.ttf` for contact icons (matching the LaTeX `fontawesome5` look). `RichPdfText` splits on `**…**` for bold. `Link` components carry real mailto/LinkedIn/GitHub URLs.
- **Download:** `latex-preview.tsx` → `pdf(<PdfResume resume={resumeData} />).toBlob()` then programmatic `<a download="resume.pdf">` click. `.tex` downloaded as a Blob too (`resume.tex`).

## API route (`app/api/parse-resume/route.ts`)

`POST { resumeText: string, jobDescription?: string }` (session required):
1. 401 if no session; 403 `{ error: "AI provider not configured", redirect: "/settings", hint }` if no `ai_settings`.
2. Decrypts key, lazy-migrates, resolves model.
3. Calls `parseResumeWithLLM` → `buildHighlights`.
4. Returns `{ resume, aiChanges, highlights }`.
5. Errors → `describeLlmError` → `{ error, code, redirect? }` with 500.

## Gotchas

- LLM bolding (`**`) is the shared "rich text" convention across preview, LaTeX, and PDF — keep it in sync in all three renderers.
- Bullet matching for highlights is exact-string — the LLM prompt demands verbatim copying of changed bullet text into `aiChanges`; if the LLM drifts, highlights silently degrade (drop), never mis-highlight.
- pdfjs worker is loaded from CDN — offline/local-only dev may need a local worker copy.
- Link annotation extraction only works for PDFs with real link annotations (most generated resumes); text-only PDFs fall back to LLM-parsed links.