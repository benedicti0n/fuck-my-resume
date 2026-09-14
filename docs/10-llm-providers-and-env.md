# 10 — LLM Providers, Models & Environment

## AI SDK usage

Vercel AI SDK `ai` v7 is the only AI abstraction. Three capabilities used:

| Capability | Import | Used for |
| --- | --- | --- |
| `generateText` + `Output.object({ schema })` | `ai` | Resume parse/enhance (`lib/llm.ts`), outreach values (`lib/outreach-generator.ts`), interviewer chat (`chat/route.ts`), interview feedback (`complete/route.ts`) |
| `transcribe()` | `ai` | OpenAI STT (`transcribe/route.ts`) |
| `generateSpeech()` | `ai` | OpenAI TTS (`tts/route.ts`) |

Model factories: `createOpenAI({ apiKey })` / `createGoogleGenerativeAI({ apiKey })` from `@ai-sdk/openai` / `@ai-sdk/google`. Providers are constructed per-request from the decrypted BYOK key — never global singletons.

## Provider support matrix

| Provider | Resume/Outreach brain | Interviewer brain | Interviewer voice |
| --- | --- | --- | --- |
| **openai** | ✔ (default `gpt-5.4-mini`) | ✔ (`gpt-5.4-mini` default) | ✔ OpenAI STT/TTS **or** free browser |
| **google** | ✔ (default `gemini-3.5-flash`) | ✔ (`gemini-3.5-flash` default) | ✘ server voice — browser only (no Google STT in the SDK) |

`enginesForProvider("google")` returns `["browser"]` only; UI surfaces `INTERVIEW_NOT_SUPPORTED_BANNER`.

## Model catalogs (`lib/interview-models.ts`)

```ts
DEFAULT_BRAIN_MODEL = { openai: "gpt-5.4-mini", google: "gemini-3.5-flash" }

INTERVIEWER_BRAIN_MODELS.openai  = [gpt-5.4-mini, gpt-5.4, gpt-4o]
INTERVIEWER_BRAIN_MODELS.google  = [gemini-3.5-flash, gemini-3.6-flash, gemini-3.8-flash]

VOICE_ENGINES.openai:  stt: gpt-4o-mini-transcribe (def), gpt-4o-transcribe, whisper-1
                       tts: gpt-4o-mini-tts (def), tts-1, tts-1-hd
                       voices: alloy, ash, ballad, coral, echo, fable, marin (def), cedar, nova, onyx, sage, shimmer, verse
VOICE_ENGINES.browser: stt: whisper-tiny (def)  ·  tts: kokoro-82m (def)
                       voices: am_michael (def), am_liam, am_adam, am_onyx, am_fenrir, am_puck,
                                af_heart, af_nova, af_sarah, af_kore, af_alloy,
                                bf_emma, bm_george, bm_daniel
```

- `settings.model` is a free-text override for resume/outreach (not catalog-validated); interviewer settings are catalog-validated server-side.

## Prompts (single source in code)

| Prompt | Location | Output schema |
| --- | --- | --- |
| Resume parse + enhance + aiChanges annotation | `lib/llm.ts` `SYSTEM_PROMPT` | `parseResultSchema` |
| Outreach values | `lib/outreach-generator.ts` instructions | `outreachValuesSchema` |
| Interviewer persona/system | `buildInterviewerPrompt` in `app/api/interview/chat/route.ts` | free text |
| Feedback coach | `generateFeedback` in `complete/route.ts` | `feedbackSchema` |

Changing any prompt: update the paired zod schema + downstream consumers (highlights matching relies on verbatim bullet copies; bold `**…**` convention must stay consistent across LaTeX/PDF/preview).

## Environment variables (`.env`)

```env
DATABASE_URL=postgres://...              # Neon/Postgres (required)
GOOGLE_CLIENT_ID=...                     # Better Auth Google OAuth
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...                     # callback: /api/auth/callback/github
GITHUB_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...                   # session cookie secret (also legacy key-encryption secret)
AI_KEY_ENCRYPTION_KEY=...                # dedicated master key for BYOK encryption
                                         # generate: openssl rand -base64 32
```

All are read via `process.env` at request time (no runtime validation). Missing `AI_KEY_ENCRYPTION_KEY` degrades to legacy encryption — set it in prod.

## Development workflow

1. `npm install`
2. Create `.env` from the block above; point `DATABASE_URL` at a Neon (or local Postgres) instance.
3. `npm run db:migrate` to apply `drizzle/*.sql`.
4. `npm run dev`.
5. Before committing: `npm run lint` + `npm run typecheck` + `npm run build` (the repo treats a green typecheck/build as the bar for shipping — see `features.md`).

## Schema changes

1. Edit `lib/db/schema.ts`.
2. `npx drizzle-kit generate` → new SQL under `drizzle/`.
3. `npm run db:migrate` (or push) to apply.
4. Keep `features.md` todos updated.

## Notes for future work

- The AI SDK + provider SDKs are pinned to recent major versions (ai v7, @ai-sdk/openai@4, @ai-sdk/google@4). Upgrade with care — API shapes for `transcribe`/`generateSpeech`/`Output.object` changed across majors.
- `docs/gemini_models.md` and `docs/openai_models.md` contain provider model notes; `docs/work_todos.md` has scratch work tracking.
- Anthropic was removed from the provider set — re-adding means `Provider` type, `ai_settings` validation, catalogs, and `getModel` call sites (`lib/llm.ts`, `lib/outreach-generator.ts`, `chat/route.ts`, `complete/route.ts`).