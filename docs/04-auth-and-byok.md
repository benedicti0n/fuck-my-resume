# 04 — Authentication & BYOK

## Better Auth setup

Server instance: `lib/auth.ts`

```ts
betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  socialProviders: { google, github },   // env: GOOGLE_CLIENT_ID/SECRET, GITHUB_CLIENT_ID/SECRET
  session: {
    expiresIn: 7 days,
    updateAge: 1 day,                    // refresh sliding window
    cookieCache: { enabled: true, maxAge: 5 min },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
  },
  plugins: [nextCookies()],              // better-auth/next-js
})
```

- **Route:** `app/api/auth/[...all]/route.ts` mounts `auth.handler` (all auth endpoints under `/api/auth/*`).
- **Client:** `lib/auth-client.ts` → `createAuthClient()`; used via `authClient.useSession()`, `authClient.signOut()`.
- **Session verification server-side:** `auth.api.getSession({ headers: request.headers })` in every API route.
- **Page protection:** `proxy.ts` checks the session cookie via `getSessionCookie` and redirects to `/` for `/settings`, `/interview`, `/interview/:path*`. Client pages also redirect (`router.push("/sign-in")`) when `useSession` resolves null.

## BYOK key encryption (`lib/encryption.ts`)

- Algorithm: **AES-256-GCM**, 16-byte random IV per encryption.
- Key derivation: `sha256(secret)` of the master secret.
- **Two key versions:**
  - `v2` — encrypted with dedicated `AI_KEY_ENCRYPTION_KEY` (recommended; format prefix `v2:`).
  - `legacy` — encrypted with `BETTER_AUTH_SECRET`, no prefix.
- Ciphertext format: `[v2:]<ivHex>:<tagHex>:<ciphertextHex>`. Tag (GCM auth) is stored inline for tamper detection.
- `encrypt()` picks v2 automatically when `AI_KEY_ENCRYPTION_KEY` is set, else falls back to legacy.
- `decrypt()` detects version from the `v2:` prefix and derives the matching key.
- **Lazy migration:** `migrateApiKeyIfLegacy(row)` returns a `v2:` re-encryption when the row is legacy and the master key is configured, else `null`. Every AI route calls it and persists the migrated value:
  ```ts
  const migrated = migrateApiKeyIfLegacy(settings.apiKey);
  if (migrated) await db.update(aiSettings).set({ apiKey: migrated, updatedAt: new Date() })...
  ```
- `maskApiKey(key)` → `sk-••••abcd` for the GET settings response (never the raw key).

## Settings API (`app/api/settings/ai-provider/route.ts`)

**GET** — returns `{ settings: {...} | null }` with `apiKeyMasked`, provider, model, voiceEngine, interviewerModel, stt/tts models + voice, timestamps.

**POST** — create or update:
1. Provider must be `'openai' | 'google'`.
2. Key resolution: new key wins if provided (trimmed); otherwise the existing stored key is reused ("leave blank to keep current").
3. If a **new** key was entered, `validateProviderKey(provider, key)` is called first (see below); a definitive rejection → 400, never persisted.
4. Voice engine is validated against `enginesForProvider(provider)` (google → only `browser`; openai → `openai` or `browser`).
5. STT/TTS model + voice values are validated against the effective engine's catalog; stale values (e.g. kokoro ids after switching to OpenAI) are replaced with engine defaults.
6. Encrypts key with `encrypt()`, upserts row (insert with `randomUUID()` or update).
7. Responds `{ success: true, voiceEngine }`.

**DELETE** — removes the row entirely (user must re-add a key to use AI features again).

### Key validation (`lib/key-validation.ts`)

- **OpenAI:** `GET https://api.openai.com/v1/models` with Bearer. 401 → invalid.
- **Google:** `GET https://generativelanguage.googleapis.com/v1beta/models?key=...`. 400 + `API_KEY_INVALID` reason → invalid; 403 → permission error.
- Timeout 10s (`AbortSignal.timeout`). **Network/provider errors never block saving** — only definitive auth failures do, so users aren't locked out during outages.

## LLM error mapping (`lib/llm-errors.ts`)

`describeLlmError(error)` maps AI SDK / provider errors to user-facing messages + a `toSettings` flag:

| Code | Trigger | toSettings |
| --- | --- | --- |
| `invalid_api_key` | 401 or message matches invalid key patterns | true |
| `rate_limit` | 429 / quota / too many requests | false |
| `permission` | 403 / forbidden | true |
| `model_not_found` | 404 / "model not found" | true |
| `provider` | 5xx | false |
| `unknown` | anything else | false |

Routes responding with `redirect: "/settings"` when `toSettings` — the frontend surfaces a "Open Settings" action in an alert dialog.

## Security notes

- No server-side AI keys anywhere — every AI call uses the user's decrypted key.
- Keys are only sent to the provider's API (OpenAI/Google), never returned to the client beyond a masked preview.
- Session ownership checks on session-scoped routes (e.g. `interview.userId !== session.user.id` → 404).
- The encryption key should be generated with `openssl rand -base64 32` and kept out of the repo.