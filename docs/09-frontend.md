# 09 — Frontend Guide

## Pages

### `/` — Landing (`app/page.tsx`)
- Client component; signed-in users are `router.replace("/generate")`d.
- Logo, "built with ❤️ by me" badge, Product Hunt embed, demo YouTube video (`react-player`, lazy-loaded with `ssr: false`), 3 feature cards, country visitor stats (`lib/country-stats.ts` — hardcoded `COUNTRIES` + `formatVisitors`).
- CTAs: "Get started — it's free" → `/generate`.

### `/generate` — Resume wizard (`app/generate/page.tsx`)
- 4-step `Stepper` (from `components/reui/stepper.tsx`): Auth → Template → Upload → JD.
- Step 1 (AuthStep) is skipped when signed in (`effectiveStep = max(currentStep, 2)`).
- Next disabled until template selected; Generate disabled until file selected.
- `handleGenerate` pipeline (see `05-resume-pipeline.md`): extract text+links client-side → POST parse-resume → overlay PDF annotation links → `generateLatex` → optional POST generate-outreach → results view.
- Results view (`latexCode && resumeData`): `LaTeXPreview` + `OutreachPreview` + "Back to Edit" (clears result state) + "Download .tex".
- Error state → AlertDialog with optional "Open Settings" link.

### `/settings` — BYOK settings (`app/settings/page.tsx` + `components/settings/ai-provider-form.tsx`)
- Two cards:
  1. **AI Provider:** provider select (OpenAI/Google), masked current key, API key password input ("leave blank to keep current"), optional model override, Rotate Key (confirm dialog then focus key input), Remove (confirm + DELETE), validating/success/invalid AlertDialogs during key check.
  2. **Mock Interviewer Voice:** voice engine select (filtered by provider), interviewer brain model select, STT/TTS model selects (hidden for browser engine), voice select; values clamped to the active engine's catalog on engine change.
- Everything posts to `/api/settings/ai-provider`.

### `/interview` — Setup (`app/interview/page.tsx` + `components/interview/interview-setup.tsx`)
- Auth-gated (proxy + client redirect). See `07-interview-system.md` for the flow.

### `/interview/session/[id]` — Live interview (897 lines)
- See `07-interview-system.md`. Key UI: Meet-style grid (user avatar left, Rive persona right), top bar (End Interview, world title + role + engine + difficulty, timer + progress), hold-to-talk mic, download progress bars, "Tap to hear" fallback, results cards (score badge, strengths/weaknesses/next steps, transcript, leaderboard link), call-guide dialog.

### `/leaderboard` — Hall of Fame (`app/leaderboard/page.tsx`)
- Polls `/api/leaderboard` every 30s (`POLL_INTERVAL`), manual Refresh button, skeleton while loading, top-3 badge images (`/first-badge.png` etc.), highlights viewer row ("You" pill + ring), rank 1 row tinted.

### `/feedback` — Feedback wall (`app/feedback/page.tsx`)
- Public list (newest first, 200 max) + signed-in submit form: 5-star `StarRating` (radio semantics), comment textarea, initials-avatar fallback. Shows inline submit errors/success.

### `/feature-request` — Feature requests (`app/feature-request/page.tsx`)
- Title + description form; POSTs to `/api/feature-request`; fires a FormSubmit AJAX email from the browser (FormSubmit blocks server IPs) with the signed-in user's email as Reply-To.

### `/sign-in`, `/sign-up` — Better Auth UI pages
- Thin wrappers rendering Better Auth's client components.

## Key components

| Component | Purpose |
| --- | --- |
| `components/navbar.tsx` | Fixed top nav: logo, GitHub star button, nav items (Leaderboard, Feedback, Request a feature, Generate), Mock Interview + AI Settings + Sign Out (signed in), theme toggle; `Drawer` menu on <lg screens with user card |
| `components/theme-provider.tsx` | next-themes provider |
| `components/reui/stepper.tsx` | Wizard stepper primitives |
| `components/resume-preview.tsx` | ATS-style HTML preview w/ highlight legend, `<mark>` JD keyword highlighting, rich-text `**bold**` support |
| `components/pdf-resume.tsx` | react-pdf document; FA icons embedded from `public/fonts/`; `RichPdfText` bold parsing |
| `components/latex-preview.tsx` | Result card: Preview/LaTeX tabs, Copy LaTeX, Download PDF (react-pdf blob), "Give AI Mock interview for this role" (stashes JD to `sessionStorage["fmr:pending-jd"]`) |
| `components/outreach-preview.tsx` | Cold Email / Cold DM tabs with copy buttons |
| `components/interview/interview-setup.tsx` | World creation form + live deterministic config preview |
| `components/settings/ai-provider-form.tsx` | BYOK + interviewer voice config (two cards) |
| `components/ai-elements/persona.tsx` | Rive-animated interviewer persona (states: idle/thinking/listening/speaking) |
| `components/steps/*` | Wizard step panels (auth, template select w/ previews, upload, JD input) |
| `components/ui/*` | ~70 shadcn-style primitives + custom Hugeicons (arrow-left-02, cloud-download, robot-01, …) |

## State conventions

- Server data → `fetch()` + `useState`/`useCallback` (no react-query/SWR anywhere).
- Auth → `authClient.useSession()`.
- Interview session page mirrors `messages` into refs (`messagesRef`, `statusRef`) to avoid stale closures in the hold-to-talk handlers.

## Storage keys

| Key | Type | Used by |
| --- | --- | --- |
| `fmr:interview:<sessionId>` | localStorage (JSON array of `{role, content}`) | Live transcript persistence + resume on refresh |
| `fmr:interview:guide-dismissed` | localStorage (`"1"`) | Skip call-guide dialog |
| `fmr:pending-jd` | sessionStorage | JD handoff from /generate → /interview |

## UX/behavior notes

- Space bar = push-to-talk on the session page (keydown/keyup listeners, `e.repeat` guard, disabled while call guide open).
- Autoplay-policy safe: TTS failures that smell like autoplay enter `waiting-gesture`; `playFloat32Audio` rejects `NotAllowedError` from a suspended AudioContext instead of hanging.
- Landing/video & social proof: Product Hunt badge + YouTube demo; countries grid is static data.
- Mobile: nav collapses into a right-side Drawer.