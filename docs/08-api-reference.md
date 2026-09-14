# 08 — API Reference

All routes under `app/api/`. Every route that touches user data verifies the session via `auth.api.getSession({ headers })` → 401 `{ error: "Unauthorized" }` when absent. BYOK routes return 403 `{ error: "AI provider not configured" | "No BYOK key configured", redirect: "/settings" }` when `ai_settings` is missing.

## Auth

### `POST/GET /api/auth/[...all]` — Better Auth handler
Mounts `auth.handler`. Handles OAuth (Google/GitHub), session cookie issuance/refresh, sign-out. Callback paths: `/api/auth/callback/google`, `/api/auth/callback/github`.

## Settings

### `GET /api/settings/ai-provider`
- **Auth:** required.
- **Response:** `{ settings: null }` or
  ```json
  { "settings": { "id", "provider", "model", "apiKeyMasked", "voiceEngine",
                  "interviewerModel", "sttModel", "ttsModel", "ttsVoice",
                  "createdAt", "updatedAt" } }
  ```
  `apiKeyMasked` is `sk-••••abcd` style — the raw key never leaves the server.

### `POST /api/settings/ai-provider`
- **Auth:** required.
- **Body:** `{ provider?, apiKey?, model?, voiceEngine?, interviewerModel?, sttModel?, ttsModel?, ttsVoice? }` (all optional when updating; provider+key required on first save).
- **Behavior:** new key validated live against provider; voice engine/model/voice values validated against the engine catalog; key encrypted AES-256-GCM before upsert.
- **Errors:** 400 with `{ error }` (bad provider, bad key, invalid voice engine/model).
- **Response:** `{ success: true, voiceEngine }`.

### `DELETE /api/settings/ai-provider`
- **Auth:** required. Deletes the user's settings row. → `{ success: true }`.

## Resume

### `POST /api/parse-resume`
- **Auth:** required (401). BYOK missing → 403 `{ error, redirect: "/settings", hint }`.
- **Body:** `{ resumeText: string (required), jobDescription?: string }`.
- **Response:** `{ resume: Resume, aiChanges: AiChanges, highlights: Highlights }` (see `lib/schemas/resume.ts`, `lib/highlights.ts`).
- **Errors:** 400 `{ error: "resumeText is required" }`; 500 `{ error, code, redirect? }` via `describeLlmError`.

## Outreach

### `POST /api/generate-outreach`
- **Auth:** required. BYOK missing → 403 redirect.
- **Body:** `{ resume: Resume, jobDescription: string }` (both required → 400).
- **Response:** `{ outreach: { coldEmail: {...}, coldDM: {...} } }` (shape per `lib/schemas/outreach.ts`).
- **Errors:** 500 via `describeLlmError`.

## Interview

### `POST /api/interview/session`
- **Auth:** required. BYOK missing → 403 `{ error: "No BYOK key configured", redirect: "/settings" }`.
- **Body:** `{ jobDescription: string (≥20 chars), difficulty?: "peaceful"|"easy"|"normal"|"hard" (default "normal"), durationMinutes?: int 5–60 (default 10), seed?: string, voiceEngine?: "openai"|"browser", interviewerModel?: string }`.
- **Errors:** 400 zod issues (`{ error: firstIssueMessage }`); 400 if voice engine not available for provider.
- **Response:** `{ sessionId, config, seed, voiceEngine, model, durationMinutes, difficulty, jobTitle, company }`.

### `GET /api/interview/session/[id]`
- **Auth:** required. Owner check → 404 `{ error: "Interview session not found" }`.
- **Response:** `{ session: { id, jobTitle, company, difficulty, durationMinutes, seed, config, voiceEngine, model, status, transcriptMarkdown, feedback, createdAt, updatedAt } }`.

### `POST /api/interview/session/[id]/complete`
- **Auth:** required. Owner check → 404.
- **Body:** `{ transcriptMarkdown?: string }`.
- **Behavior:** LLM feedback (score 1–10 + summary/strengths/weaknesses/suggestions) via structured output when settings exist; session → `completed`; increments `user.mock_interviews_completed` once (idempotent).
- **Response:** `{ feedback: { score, summary, strengths[], weaknesses[], suggestions[] } | null }`.
- **Errors:** 500 with `describeLlmError` info if feedback LLM fails (session still completes).

### `POST /api/interview/chat`
- **Auth:** required. BYOK missing → 403 redirect. Owner check → 404. Non-active session → 409 `{ error: "Interview already ended" }`.
- **Body:** `{ sessionId, messages: { role: "user"|"assistant", content: string }[] }` (zod-validated; content min 1).
- **Response:** `{ text }` (interviewer reply continuation).

### `POST /api/interview/transcribe` (OpenAI engine only)
- **Auth:** required. BYOK missing → 403 redirect. Owner check → 404. Session voiceEngine ≠ `openai` → 400. Provider ≠ openai → 400 (suggest switching provider in Settings).
- **Body:** `{ sessionId, audioBase64: string, model?: string }`.
- **Gotcha:** audioBase64 must be plain base64 — any `data:...;base64,` prefix is stripped defensively.
- **Response:** `{ text, language: string|null }`.

### `POST /api/interview/tts` (OpenAI engine only)
- **Auth:** required. Same guards as transcribe.
- **Body:** `{ sessionId, text: string (1–4000), model?, voice? }`.
- **Response:** `{ audioBase64, mediaType: "audio/mpeg" }`.

## Public

### `GET /api/leaderboard`
- **Auth:** none (viewerId included when signed in).
- **Response:** `{ entries: [{ rank, userId, name, image, avgScore, interviews }], viewerId, generatedAt }`.
- **Query:** completed sessions with non-null score, grouped by user, `round(avg(score)::numeric, 1)` desc then count desc, top 50.

### `GET /api/feedback`
- **Auth:** none.
- **Response:** `{ items: [{ id, userId, name, image, stars, comment, createdAt(ISO) }], viewerId }` — newest first, limit 200.

### `POST /api/feedback`
- **Auth:** required (so attribution is known).
- **Body:** `{ stars: int 1–5, comment: string (1–2000) }`.
- **Errors:** 400 with specific messages.
- **Response:** `{ success: true, item }`.

### `POST /api/feature-request`
- **Auth:** optional (persists row only when signed in; email fired client-side via FormSubmit to avoid datacenter-IP blocking).
- **Body:** `{ title: string (1–120), description: string (1–4000) }`.
- **Response:** `{ success: true, email, name }`.

## Error conventions

| Status | Meaning |
| --- | --- |
| 401 | Not signed in |
| 403 | BYOK not configured (`redirect: "/settings"`) or unsupported feature for provider |
| 400 | Validation / bad input / stale values |
| 404 | Session not found or not owned by caller |
| 409 | Session already ended (chat) |
| 500 | LLM/provider failure — body carries `{ error, code, redirect? }` (`describeLlmError`) |