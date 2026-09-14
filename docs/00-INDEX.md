# Project Documentation Index

Reference docs for the **Fuck My Resume** codebase. These are written to be the
single source of truth for the architecture — read the relevant doc before
changing code.

| Doc | Covers |
| --- | --- |
| [01-project-overview.md](01-project-overview.md) | What the product is, feature set, stack, PRD alignment |
| [02-architecture.md](02-architecture.md) | High-level architecture, data flows, directory map |
| [03-database-schema.md](03-database-schema.md) | All DB tables, columns, relations, migrations |
| [04-auth-and-byok.md](04-auth-and-byok.md) | Better Auth setup, session config, BYOK key encryption/rotation/validation |
| [05-resume-pipeline.md](05-resume-pipeline.md) | PDF text extraction → LLM parse → highlights → templates → LaTeX → PDF |
| [06-outreach.md](06-outreach.md) | Cold email + cold DM generation and rendering |
| [07-interview-system.md](07-interview-system.md) | Interview world config (seeded PRNG), voice loop, session lifecycle |
| [08-api-reference.md](08-api-reference.md) | Every API route: auth, request/response shapes, error codes |
| [09-frontend.md](09-frontend.md) | Pages, key components, UX flows, localStorage keys |
| [10-llm-providers-and-env.md](10-llm-providers-and-env.md) | AI SDK usage, model catalogs, prompts, env vars, scripts |

## Quick reference

- **Stack:** Next.js 16 (App Router, React 19, TS strict), Tailwind v4 + shadcn/ui, Better Auth, Drizzle ORM on Neon Postgres, Vercel AI SDK v7.
- **Provider support:** OpenAI + Google Gemini for the LLM "brain"; OpenAI or free in-browser (Whisper tiny + Kokoro) for interviewer voice. Google voice unsupported (no STT in `@ai-sdk/google`).
- **BYOK:** users' API keys are AES-256-GCM encrypted at rest; every AI route decrypts at call time and 403-redirects to `/settings` if missing.
- **No server-side secrets for AI:** every AI call is billed to the user's own key.
- **Persistence:** `interview_sessions`, `feedback`, `feature_requests`, `ai_settings` are user-scoped. Resumes/outreach are NOT persisted — generated client-side each session.