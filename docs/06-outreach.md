# 06 — Cold Outreach

Generates a **cold email** and a **cold DM** from the tailored resume + job description. Two-stage design: LLM fills a fixed values schema → deterministic template renders the final copy (no LLM-written prose layout, easy to edit/regenerate).

## Stage 1 — LLM values extraction (`lib/outreach-generator.ts`)

`generateOutreach(resume, jobDescription, provider, apiKey, modelId?)`:

- Builds a compact `resumeSummary` (name, email, LinkedIn/GitHub, roles at companies, skills, project names).
- `generateText` with `Output.object({ schema: outreachValuesSchema })` (zod) — structured output.
- Same model resolution as the rest of the app (`getModel`, defaults from `DEFAULT_BRAIN_MODEL`).
- Instructions contract:
  - Company name + role extracted **from the JD**.
  - Skills/projects/experience from the **actual resume**.
  - `specificThing` — something genuine about the company; `specificArea` — a technical area they work on.
  - `achievement` — most impressive resume bullet; `relevantSkills` — 2–3 JD-relevant skills.
  - DM `niche` = primary engineering domain; `projectAchievement` = most impressive project, concise.
  - Links from resume or `"N/A"`.

Schema (`lib/schemas/outreach.ts`):

```ts
coldEmail: { recipientName, companyName, specificThing, specificArea, role,
             relevantSkills: string[2..3], achievement, portfolioLink, githubLink,
             linkedinLink, senderName }
coldDM:   { recipientName, companyName, specificThing, niche,
            technologies: string[2..3], projectAchievement, role }
```

## Stage 2 — Rendering (`lib/template-renderer.ts`)

- `renderColdEmail(data)` → subject line `"Internship opportunity at <company>"` + a short body: hook (specificThing), interest (specificArea), role + skills, achievement, CTA ("open to a quick chat…"), portfolio/GitHub/LinkedIn links, sign-off.
- `renderColdDM(data)` → ~2 short paragraphs: hook on their work, niche + technologies, project, ask to connect.
- Both are plain strings with `\n` separators — copied via clipboard, editable by the user in the UI (the page keeps them as state, so editing is done by regenerating; there is no inline edit — the PRD's Edit/Regenerate actions are satisfied by "Back to Edit" which restarts the wizard).

## API route (`app/api/generate-outreach/route.ts`)

`POST { resume: Resume, jobDescription: string }` (session required):
1. 401 no session; 403 no `ai_settings` (`redirect: "/settings"`).
2. Decrypt key, lazy-migrate, resolve model.
3. `generateOutreach(...)` → `{ outreach: { coldEmail, coldDM } }`.
4. Errors → `describeLlmError` mapping (500).

## Frontend wiring

- Called from `app/generate/page.tsx` (`handleGenerate`) **only when a JD is provided**; failures are non-fatal (caught + logged, resume result still shows).
- `components/outreach-preview.tsx` renders two tabs (Cold Email | Cold DM) with copy buttons, shown under the resume preview on the results screen.

## Gotchas

- `relevantSkills`/`technologies` arrays are zod-min-2 — the LLM must produce at least 2 items or structured output fails.
- Template literals reference all fields; a missing `"N/A"` link still renders as text `N/A` — acceptable by design.
- Outreach is generated fresh on every generate run; no persistence.
- Reference copy templates live in `templates/cold-email.txt` and `templates/cold-dm.txt`.