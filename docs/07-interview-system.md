# 07 — AI Mock Interview System

A Minecraft-style "interview world": deterministic seeded config, live voice loop (STT → LLM → TTS), timed scoring, persistence, leaderboard.

## Concepts

- **World:** created on `/interview` with JD + difficulty + duration + optional seed + voice engine.
- **Seed:** a 6-char alphanumeric string (random by default). The same `(seed, jd, difficulty, durationMinutes)` deterministically produces the same config (persona, title, focus areas, tone, question count) — like a Minecraft world seed.
- **Difficulty presets** (`lib/interview-config.ts:DIFFICULTY_PRESETS`):
  | id | tone | pace | followUpDepth | minutesPerQuestion |
  | --- | --- | --- | --- | --- |
  | peaceful | warm, supportive | slow | 1 | 3 |
  | easy | friendly, clear | slow | 1 | 2.5 |
  | normal | professional, balanced | medium | 2 | 2 |
  | hard | sharp, demanding | medium→fast | 3 | 1.5 |
- **Question count:** `clamp(2, round(durationMinutes / minutesPerQuestion), 12)`.

## Seeded PRNG (`lib/interview-config.ts`)

- `hashString(input)` — FNV-1a 32-bit.
- `mulberry32(seed)` — fast seeded PRNG returning [0,1).
- `generateInterviewConfig({ seed, jd, difficulty, durationMinutes })`:
  `rand = mulberry32(hashString(`${seed}\u0000${difficulty}\u0000${durationMinutes}\u0000${jd.trim().toLowerCase()}`))`
  then picks title (12 candidates), persona (7 engineering personas like "Alex Rivera — Senior Engineering Manager"), tone/pace/depth from preset, and 4 focus areas (from 8) via `pickN` (unique).
- `generateSeed()` — crypto-random 6 chars from `[a-z0-9]`.
- `buildInterviewMarkdown(messages)` — turns the message array into `### Q{n}\n\n**Interviewer**|**Candidate**: …` markdown (stored as `transcript_markdown`).

## InterviewConfig shape

```ts
{ title, interviewerPersona, tone, focusAreas: string[4], questionCount,
  pace: "slow"|"medium"|"fast", followUpDepth: 1|2|3 }
```
Stored as JSONB on the session row; used to build the interviewer system prompt and the results page.

## Voice engines (`lib/interview-models.ts`)

| Engine | STT | TTS | Cost | Requires |
| --- | --- | --- | --- | --- |
| `openai` | `gpt-4o-mini-transcribe` (default), `gpt-4o-transcribe`, `whisper-1` | `gpt-4o-mini-tts` (default), `tts-1`, `tts-1-hd` | billed to BYOK key | provider must be **openai** |
| `browser` | `whisper-tiny` (transformers.js, ~40MB) | `kokoro-82m` (Kokoro, ~80MB) | free | any provider; brain still uses BYOK key |

- **Google voice is excluded** — `@ai-sdk/google` exposes no STT, so `enginesForProvider("google") = ["browser"]` only. UI shows `INTERVIEW_NOT_SUPPORTED_BANNER`.
- `resolveTtsVoice(engine, stored)` clamps a stored voice id to the engine's catalog (prevents `alloy` leaking into Kokoro which only accepts `af_*/am_*/bf_*/bm_*` ids).
- Model catalogs: `INTERVIEWER_BRAIN_MODELS[provider]` (openai: `gpt-5.4-mini` default, `gpt-5.4`, `gpt-4o`; google: `gemini-3.5-flash` default, `gemini-3.6-flash`, `gemini-3.8-flash`). Durations: `[5, 10, 15, 30]`.

## Session lifecycle

### Create — `POST /api/interview/session`
Body (zod): `jobDescription` (min 20 chars), `difficulty` enum default `normal`, `durationMinutes` int 5–60 default 10, `seed?`, `voiceEngine?`, `interviewerModel?`.

1. Requires session + `ai_settings` (else 403 redirect).
2. Resolves voice engine: body → settings → provider default; rejected if not in `enginesForProvider(provider)`.
3. Resolves brain model: body → settings.interviewerModel → provider default.
4. Seed: provided or `generateSeed()`.
5. `extractRoleInfo(jd)` regexes `role|position|job title|title: value` and `company|organization|employer: value` lines (fallback: first non-empty line as job title), sanitized and truncated to 120 chars.
6. Inserts `interview_sessions` row with generated config JSONB, status `active`.
7. Returns `{ sessionId, config, seed, voiceEngine, model, durationMinutes, difficulty, jobTitle, company }`.

### Load — `GET /api/interview/session/[id]`
Owner-checked (404 otherwise). Returns the full session incl. `config`, `transcriptMarkdown`, `feedback`, timestamps.

### Chat — `POST /api/interview/chat`
Body: `{ sessionId, messages: {role:"user"|"assistant", content}[] }`. Owner + status checks (409 if not active). Decrypts key (403 redirect if missing), builds interviewer system prompt from stored config + JD, sends full conversation with trailing `"Interviewer:"` continuation. Returns `{ text }`.

### Transcribe — `POST /api/interview/transcribe` (OpenAI engine only)
Body: `{ sessionId, audioBase64, model? }`. 400 if session voiceEngine isn't `openai` or provider isn't OpenAI. Uses `transcribe()` from `ai` with `openai.transcription(sttModel)`. **Gotcha:** this SDK version expects a *plain* base64 string — a `data:...;base64,` prefix makes its decoder throw `InvalidCharacterError`, so the route defensively strips any prefix (`route.ts:43-45`). Returns `{ text, language }`.

### TTS — `POST /api/interview/tts` (OpenAI engine only)
Body: `{ sessionId, text (≤4000), model?, voice? }`. Same engine/provider guards; validates model+voice against the OpenAI catalog (body → settings → defaults). `generateSpeech` → returns `{ audioBase64, mediaType: "audio/mpeg" }`.

### Complete — `POST /api/interview/session/[id]/complete`
Body: `{ transcriptMarkdown? }`.

1. Owner check; loads settings.
2. If settings exist: `generateFeedback()` — LLM (`Output.object` on `feedbackSchema`):
   ```ts
   { score: int 1..10, summary, strengths: string[], weaknesses: string[], suggestions: string[] }
   ```
   Prompt: senior technical hiring coach; calibrates so "good but imperfect" lands 6–8; strengths/weaknesses/suggestions 3–6 items each, tied to actual answers.
3. Updates session → status `completed`, transcript, feedback, score.
4. If not already completed (`wasCompleted` guard): increments `user.mock_interviews_completed` (idempotent).
5. Returns `{ feedback }` (LLM errors surfaced via `describeLlmError`, 500, but the session still completes).

## Frontend live loop (`app/interview/session/[id]/page.tsx`)

Status machine: `loading → ready → starting → assistant → listening ⇄ recording → processing → assistant … → completed`, plus `waiting-gesture`.

1. On mount: hydrate messages from `localStorage["fmr:interview:<id>"]` (resume support), fetch session + settings in parallel. Completed sessions render `InterviewResults` directly.
2. **Auto-start:** fresh session → `startInterview()` — fetches the greeting from `/chat` with empty history AND (browser engine) kicks off Kokoro+Whisper model downloads in parallel. Clock starts only after both the greeting and model downloads finish (`startTimeRef`).
3. **Turn:** user holds mic button (or Space — keyboard listener with repeat-guard) → `createRecorder()` (MediaRecorder, webm/opus) → release → stop → `decodeToPCM16k` → browser engine: `transcribeWithWhisper(pcm)`; openai engine: `encodeWav(pcm, 16000)` → base64 → `/transcribe`.
4. Empty transcripts are dropped (stays listening).
5. User message appended + persisted, `/chat` called with full history → assistant message appended + persisted.
6. `speakText()`: browser → `speakWithKokoro(text, voice)`; openai → `/tts` → `playBase64Audio`.
7. **Autoplay guard:** if playback throws `NotAllowedError`/AbortError (or message matches autoplay/user-gesture), status → `waiting-gesture` with a "Tap to hear" button (`resumeSpeech` retries the pending text). `playFloat32Audio` in `lib/audio.ts` also closes a suspended AudioContext and rejects, feeding this same path.
8. Timer runs from `startTimeRef`, 500ms interval, mm:ss + progress bar; ≤30s turns red. On 0 → `completeInterview()`.
9. `completeInterview()` builds markdown, POSTs `/complete`, shows `InterviewResults` (score badge color: ≥8 green, 5–7 yellow, <5 red; strengths/weaknesses/next steps; transcript; leaderboard link).
10. "End Interview" button (disabled while assistant is speaking) → confirm dialog → same complete path.

Persona animation (`components/ai-elements/persona.tsx`, Rive): state mapped from status (`speaking`/`thinking`/`listening`/`idle`).

## Browser voice engine (`lib/interview-browser-voice.ts`)

- Module-level singleton promises → models load once per page, lazy on first use.
- Whisper: `pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny")` with `env.allowLocalModels = false`, english + transcribe task.
- Kokoro: `KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "wasm" })`.
- Progress callbacks drive the download bars on the session page.
- `lib/audio.ts` also exports `playFloat32Audio`, `playBase64Audio`, `encodeWav`, `blobToBase64`, `createRecorder`, `stopRecorder`, `decodeToPCM16k` (mono downmix + linear resample to 16kHz).

## Setup page (`components/interview/interview-setup.tsx`)

- Loads settings; if none → "Before your first mock interview" card → link to /settings.
- JD textarea, difficulty + duration + voice engine pill buttons, seed input + 🎲 randomize.
- **Live preview:** as the user types the JD, `generateInterviewConfig` runs client-side and shows the generated world (title, persona, tone, pace, questions, focus areas).
- Start → `POST /api/interview/session` → redirect to `/interview/session/<id>`.
- Picks up `sessionStorage["fmr:pending-jd"]` (set by the /generate "Give AI Mock interview for this role" button).

## Gotchas

- All four interview APIs require sign-in + BYOK settings; chat/transcribe/tts additionally 403-redirect to `/settings` when missing.
- The `transcribe` base64 pitfall (plain base64, no data-URL prefix).
- TTS returns MP3; `playBase64Audio` uses `audio/mpeg`.
- Stale voice ids (engine switch) are clamped via `resolveTtsVoice` + server-side catalog validation — never trust stored values.
- Timer counts only while status is active; model downloads happen before `startTimeRef` is set.
- Space key handling is disabled while the call guide dialog is open.