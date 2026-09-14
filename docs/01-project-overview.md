# 01 — Project Overview

## What this is

**Fuck My Resume** is a job-application copilot. Given a user's base resume PDF
and a job description, it produces:

1. A **tailored, ATS-friendly resume** (downloadable PDF, LaTeX `.tex`, or copyable code)
2. A **cold email** + **cold DM** for outreach
3. A **live AI mock interview** (voice) that scores the user 1–10
4. A **public leaderboard** ("Hall of Fame") ranking completed interviews

The product runs **100% on the user's own API keys** (Bring Your Own Key, BYOK):
no server-side provider secrets, no inference costs to the product owner.

- Live: https://fuck-my-resume.vercel.app
- Repo: https://github.com/subhraneel2005/fuck-my-resume
- Landing copy: "Your resume is shit. We fix that." 💩

## Feature set

| Feature | Description | Where |
| --- | --- | --- |
| Resume parsing | Upload PDF → client-side text extraction (pdfjs) → LLM structured parse + enhancement | `lib/pdf-parser.ts`, `lib/llm.ts`, `app/api/parse-resume/route.ts` |
| AI-change highlighting | Color-coded audit of what the AI added / rewrote / JD keywords matched | `lib/highlights.ts`, `components/resume-preview.tsx` |
| Resume templates | 3 LaTeX templates (Jake, ASG ATS, ATS Friendly) rendered deterministically from structured JSON | `lib/latex-renderer.ts`, `lib/resume-templates.ts` |
| PDF download | Browser-side PDF via `@react-pdf/renderer` (no server toolchain) | `components/pdf-resume.tsx` |
| Cold outreach | LLM fills a template-verified values object → rendered email/DM | `lib/outreach-generator.ts`, `lib/template-renderer.ts` |
| Mock interview | Seeded "interview world", hold-to-talk voice loop, scored feedback | `lib/interview-config.ts`, `app/api/interview/*` |
| Voice engines | OpenAI (server STT/TTS) or free in-browser (Whisper tiny + Kokoro, transformers.js) | `lib/interview-browser-voice.ts`, `lib/audio.ts` |
| Leaderboard | Public top-50 by avg score, then interview count; top-3 badges | `app/api/leaderboard/route.ts`, `app/leaderboard/page.tsx` |
| Feedback / feature requests | Public social-proof pages + DB persistence | `app/feedback/page.tsx`, `app/feature-request/page.tsx` |
| BYOK settings | Provider (OpenAI/Google), model, interviewer voice config, key rotate/delete | `app/api/settings/ai-provider/route.ts`, `components/settings/ai-provider-form.tsx` |

## Tech stack (exact versions)

- **Framework:** Next.js `16.2.6` (App Router, React `19.2.4`, TypeScript strict)
- **UI:** Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui (`@shadcn/react` v0.3), custom "Hugeicons" SVG icon components in `components/ui/*`
- **Auth:** Better Auth `1.7.3` (Google + GitHub OAuth, cookie sessions, Drizzle adapter)
- **DB:** Drizzle ORM `0.45.2` + `@neondatabase/serverless` (Postgres via Neon), drizzle-kit for migrations
- **AI:** Vercel AI SDK `ai` v7 (`generateText`, `transcribe`, `generateSpeech`, `Output.object`) with `@ai-sdk/openai` v4 and `@ai-sdk/google` v4
- **PDF:** `pdfjs-dist` 4.x (parse), `@react-pdf/renderer` 4.x (generate)
- **Browser ML:** `@huggingface/transformers` 4.x (Whisper tiny), `kokoro-js` 1.x (TTS, ONNX WASM)
- **Other notable:** `motion` (animations), `@rive-app/react-webgl2` (AI persona animation), `recharts`, `react-player` (landing video), `html2canvas-pro` + `jspdf` (legacy PDF path, see note), `streamdown`/`shiki` (markdown/code tooling)

> Note: `html2canvas-pro` and `jspdf` are installed but the active PDF download path
> is `@react-pdf/renderer` (`components/latex-preview.tsx:51`). Templates folder
> (`templates/resumes/*.tex`) holds the reference `.tex` files for each template.

## Scripts (`package.json`)

| Script | Command |
| --- | --- |
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |
| `format` | `prettier --write "**/*.{ts,tsx}"` |
| `typecheck` | `tsc --noEmit` |
| `db:migrate` | `drizzle-kit migrate` |

## PRD alignment (see `PRD.md`)

Original PRD envisioned: OpenAI/Anthropic/Gemini, base-resume persistence, an
"Application Workspace" per job, and application history. The shipped product
diverges:

- **Anthropic dropped** — only OpenAI + Google providers.
- **No persisted base resume / applications** — resume + outreach generated per visit, kept in memory (component state) only.
- **Added (not in PRD):** mock interviewer, leaderboard, feedback/feature-request pages.
- **Kept from PRD:** structured resume JSON → deterministic LaTeX template → PDF (no LLM-generated LaTeX), BYOK with encrypted-at-rest keys, Vercel AI SDK as the single AI abstraction, cold email + cold DM outputs.

`features.md` tracks completed/in-progress feature work.