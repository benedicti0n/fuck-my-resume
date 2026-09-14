# 02 — Architecture

## High-level picture

```
Browser (user's machine)                     Server (Next.js / Vercel)
─────────────────────────                     ─────────────────────────
PDF upload ──► pdfjs text + link annotations
                     │
                     ▼
              POST /api/parse-resume ────────► decrypt BYOK key → LLM (user's key)
                     │                              ▲
                     ▼                              │   generateText + Output.object
              Structured Resume JSON + aiChanges    │
                     │                              │
                     ├─► highlights computed server-side
                     │
                     ▼
        generateLatex(resume, template)   ◄── client-side, pure function
                     │
                     ├─► Preview (ResumePreview, color-coded)
                     ├─► PDF download (react-pdf, in-browser)
                     └─► .tex download (Blob)

              POST /api/generate-outreach ───► LLM → outreach values → rendered email/DM

        Mock interview (turn-based, no WebSocket):
        record → /api/interview/transcribe (STT)  ─┐
        ────────────────────────────────────────────┤
        /api/interview/chat (LLM brain)             │ either OpenAI (server)
        ────────────────────────────────────────────┤ or in-browser (Whisper/Kokoro)
        /api/interview/tts (TTS) ───────────────────┘
        timer ends → /api/interview/session/[id]/complete → LLM feedback (score 1-10)
        → interview_sessions row + user counter → public /api/leaderboard
```

**Key architectural decisions**

1. **Server routes are thin wrappers.** All real AI logic lives in `lib/*` functions (`parseResumeWithLLM`, `generateOutreach`, route-local `generateFeedback`) so behavior is testable and shared.
2. **BYOK key decrypts at call time.** Every AI route: session check → look up `ai_settings` → `decrypt(apiKey)` → lazy-migrate legacy rows → call provider with the user's key. Missing settings → `403 { redirect: "/settings" }`.
3. **Resumes are stateless.** Nothing about resumes/outreach is persisted; regenerating requires re-upload. Only interview sessions, settings, feedback, and feature requests live in the DB.
4. **Deterministic resume rendering.** The LLM outputs *structured JSON*, never LaTeX. LaTeX/PDF are generated client-side from that JSON, so output is stable and safe (no LLM-injected TeX).
5. **Turn-based voice loop.** No WebSockets/streaming — each exchange is a full request cycle: `record → STT → chat → TTS`. Context is passed as the full message history in the request body and mirrored to `localStorage`.
6. **Seeded determinism.** Interview config (persona, focus areas, tone, question count) is derived from `(seed, jd, difficulty, duration)` via a hash + mulberry32 PRNG, so the same seed always reproduces the same "world".

## Directory map

```
app/
  page.tsx                    # Landing (redirects signed-in users to /generate)
  generate/page.tsx           # 4-step wizard: auth → template → upload → JD → results
  settings/page.tsx           # BYOK provider + interviewer voice config
  interview/page.tsx          # Interview setup (auth-gated)
  interview/session/[id]/page.tsx  # Live interview + results
  leaderboard/page.tsx        # Hall of Fame
  feedback/page.tsx           # Star ratings wall
  feature-request/page.tsx    # Feature requests
  sign-in|sign-up/[...]/page.tsx  # Better Auth UI
  api/
    auth/[...all]/route.ts    # Better Auth handler
    parse-resume/route.ts     # POST resume text → { resume, aiChanges, highlights }
    generate-outreach/route.ts
    settings/ai-provider/route.ts   # GET/POST/DELETE
    interview/session/route.ts      # POST create session
    interview/session/[id]/route.ts # GET session
    interview/session/[id]/complete/route.ts # POST complete + score
    interview/chat/route.ts          # POST interviewer reply
    interview/transcribe/route.ts    # POST OpenAI STT
    interview/tts/route.ts           # POST OpenAI TTS
    leaderboard/route.ts             # GET top 50
    feedback/route.ts                # GET public / POST signed-in
    feature-request/route.ts         # POST (email fired client-side via FormSubmit)
components/
  navbar.tsx, theme-provider.tsx
  steps/            # auth-step, template-select-step, resume-upload-step, jd-input-step
  resume-preview.tsx  # HTML preview w/ AI-change highlights
  pdf-resume.tsx      # react-pdf document (used for download)
  latex-preview.tsx   # Result card: tabs (Preview | LaTeX), Download PDF/.tex, copy
  outreach-preview.tsx
  interview/interview-setup.tsx
  settings/ai-provider-form.tsx
  ai-elements/persona.tsx   # Rive-animated interviewer avatar
  reui/stepper.tsx          # Wizard stepper
  ui/                       # ~70 shadcn-style primitives (incl. custom Hugeicons)
lib/
  db/{index,schema}.ts      # Drizzle client + schema
  auth.ts, auth-client.ts   # Better Auth server/client
  encryption.ts             # AES-256-GCM key encryption + lazy migration
  key-validation.ts         # Live key check before save
  llm.ts                    # parseResumeWithLLM (resume parsing brain)
  llm-errors.ts             # describeLlmError → user-friendly messages
  outreach-generator.ts     # cold email/DM values via LLM
  template-renderer.ts      # values → final email/DM text
  pdf-parser.ts             # pdfjs text + link-annotation extraction
  latex-renderer.ts         # Resume JSON → LaTeX (3 templates)
  resume-templates.ts       # template metadata
  contact-links.ts          # normalize messy LinkedIn/GitHub handles
  highlights.ts             # build/empty/has highlight indexes
  interview-config.ts       # seeded PRNG + config generation + markdown builder
  interview-models.ts       # provider/voice/difficulty catalogs + defaults
  interview-browser-voice.ts# Whisper + Kokoro in-browser engine
  audio.ts                  # PCM/WAV/base64 + playback + recorder helpers
  schemas/{resume,outreach}.ts  # zod schemas shared client/server
drizzle/                    # SQL migrations + meta snapshots (drizzle-kit)
templates/resumes/*.tex     # Reference LaTeX templates
public/fonts/               # FontAwesome TTF (embedded in react-pdf)
proxy.ts                    # Next proxy: redirects unsigned users away from /settings, /interview
```

## Route protection

- `proxy.ts` redirects to `/` when the session cookie is missing for `/settings`, `/interview`, `/interview/*` (client components additionally `router.push("/sign-in")`).
- All API routes independently verify the session via `auth.api.getSession({ headers })` — the proxy matcher only covers page routes.

## Data flow: generate flow (user journey)

1. `/generate` wizard: sign in → pick template → upload PDF → paste JD (optional) → Generate.
2. Client extracts text + link annotations from the PDF (pdfjs, `lib/pdf-parser.ts`).
3. `POST /api/parse-resume` → LLM parses + enhances resume, returns `{ resume, aiChanges, highlights }`.
4. Client merges real PDF hyperlink targets into `resume.contact` (annotation URLs win over LLM-parsed text).
5. `generateLatex(resume, templateId)` builds `.tex`; preview tab shows `ResumePreview` with highlight legend.
6. If JD present: `POST /api/generate-outreach` → email/DM rendered client-side (`renderColdEmail`/`renderColdDM`).
7. Download PDF via `pdf(<PdfResume resume />).toBlob()`; "Give AI Mock interview for this role" stashes the JD in `sessionStorage["fmr:pending-jd"]` and routes to `/interview`.

## State / storage summary

| Storage | What | Key format |
| --- | --- | --- |
| `localStorage` | Live interview transcript (messages array) | `fmr:interview:<sessionId>` |
| `localStorage` | Call-guide dismissed flag | `fmr:interview:guide-dismissed` |
| `sessionStorage` | JD handed from /generate to /interview | `fmr:pending-jd` |
| Postgres | settings, sessions, feedback, feature requests, auth tables | — |

## Security posture

- API keys encrypted AES-256-GCM with a dedicated `AI_KEY_ENCRYPTION_KEY` (fallback: `BETTER_AUTH_SECRET`), prefix `v2:` marks current format; legacy rows lazily re-encrypted on first use (`lib/encryption.ts`).
- Keys never returned by API — only masked (`sk-****abcd` style, `maskApiKey`).
- New keys are validated against the provider before persisting (`lib/key-validation.ts`), but transient provider outages never block saving.
- Owner checks (`interview.userId !== session.user.id`) on every interview-session route.
- Feedback/feature-request POSTs require sign-in; GETs are public (leaderboard, feedback list).