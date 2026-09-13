# Feature Plan — AI Email Agent

> Per-user Gmail connection → pull inbox + sent → structured store → AI triage that answers:
> **who do I follow up with, and which email needs my attention NOW.**
> Runs on the user's BYOK key (same as `lib/llm.ts`). Tokens are encrypted like API keys (`lib/encryption.ts`).

---

## Status: In Progress

---

## 1. Gmail Connection (OAuth)

- [ ] Add `gmail.readonly` + `gmail.modify` + `gmail.send` scopes to the Google OAuth config in `lib/auth.ts` (keep consent screen scoped: `email profile gmail.readonly gmail.modify gmail.send` are the minimum; verify which are non-negotiable for the audit)
- [ ] DB `connections` table in `lib/db/schema.ts`: `id`, `userId` → user, `provider` (`'gmail'`), `accountEmail`, `accessToken` (encrypted), `refreshToken` (encrypted), `tokenExpiresAt`, `scope`, `status` (`'active'|'revoked'|'error'`), timestamps
- [ ] Drizzle migration for `connections` (+ relations on `userRelations`)
- [ ] Verify Better Auth's OAuth account row store (`account` table already has `access_token`/`refresh_token`/`scope`) — decide: store tokens in `connections` or reuse `account`; prefer a dedicated table so Gmail tokens never mix with sign-in tokens
- [ ] `lib/email/tokens.ts` — encrypt/decrypt Gmail tokens (reuse `lib/encryption.ts`), 401 handling → refresh flow (Google refresh token endpoint) → persist new access token
- [ ] `POST /api/email/connect` — server action/route that starts Google OAuth with the Gmail scopes; after returning, validate the token and save the connection
- [ ] `GET /api/email/connection` — status (connected / which account / last sync)
- [ ] `DELETE /api/email/connection` — disconnect (revoke + clear tokens)

## 2. Email Sync (pull inbox + sent)

- [ ] `lib/email/gmail.ts` — thin Gmail API client using the user's access token:
  - `listMessages(user, query?, maxResults)` → `messages.list` (labels INBOX + SENT, cap ~200 recent each)
  - `getMessage(id)` → `messages.get` with `format: metadata` + `payload` body extraction
- [ ] `lib/email/parse.ts` — normalize a Gmail message into our schema:
  - from/to/cc, subject, snippet, body (text, decode base64url; prefer plain text over HTML), internalDate, threadId, labels, `direction: 'inbound' | 'outbound'` (match against sent-label / from == user email)
  - strip reply-quotes and signatures for the AI classifier (best-effort)
- [ ] DB `emails` table: `id` (gmail msg id, PK per user), `userId`, `threadId`, `direction`, `fromName`, `fromEmail`, `toEmails` (jsonb), `subject`, `bodyText` (capped, e.g. 20k chars), `gmailDate`, `labels` (jsonb), `isRead`, `sentByMe`, `importedAt`
- [ ] DB `emailThreads` table: `userId`, `gmailThreadId`, `lastEventAt`, `lastMessageAt`, `inboundCount`, `outboundCount`, `awaitingReply` (bool), `status` (jsonb: results of triage), timestamps
- [ ] `POST /api/email/sync` — pulls inbox + sent, upserts messages/threads, marks deleted/replaced (idempotent; store `historyId` and use `threads.list` incremental sync later)
- [ ] Room for a cron/later: incremental sync via Gmail `historyId` so syncs stop being full pulls

## 3. AI Triage (structural analysis)

- [ ] `lib/email/prompt.ts` — system prompt for triage with BYOK tooling contract:
  - per thread: `needsReply`, `replyDeadline` (now/today/skip), `waitingOnMe` (I sent last), `staleFollowUp` (I sent last & > 2 days no reply), `actionable` (asks me for a decision/answer/document), `important` (offer/HR/util/bill/deadline), `cold` (newsletter/marketing/no action)
  - output as zero-shot JSON per thread (structured `Output.object`, model from user's `aiSettings`)
- [ ] `lib/email/classify.ts` — batch classify N threads in one LLM call (threads joined with trimmed bodies + last sent/received dates) → `{ threadId, needsReply, priority, reason, suggestedFollowUp? }`
- [ ] `POST /api/email/triage` — run classifier over un-triaged threads after a sync; persist `emailThreads.status` + attach a `emailFollowUp` row when `staleFollowUp` or `needsReply` with priority
- [ ] DB `emailFollowUps` table: `id`, `userId`, `threadId`, `kind` (`'reply-needed' | 'stale-follow-up' | 'value-round-up'`), `priority`, `reason`, `aiDraft` (text, nullable), `dueAt`, `status` (`'open'|'done'|'dismissed'`), timestamps

## 4. Follow-up + Reply Drafts

- [ ] `lib/email/draft.ts` — `draftFollowUp(thread, resumeContext?)` → short, human follow-up email in the user's voice (sample 5–10 of their sent emails in prompt as style reference), BYOK key
- [ ] `lib/email/draft.ts` — `draftReply(thread)` → reply that answers the actual asks in the thread (grounded, no fabrication)
- [ ] `POST /api/email/followups/[id]/draft` — generate draft for one follow-up, store in `emailFollowUps.aiDraft`
- [ ] `POST /api/email/drafts/[id]/regenerate` — regenerate (same inputs)
- [ ] `POST /api/email/send` — **explicit user action** (never auto-send): send the confirmed draft via Gmail `messages.send`, mark thread/follow-up done. Include a confirmation step in UI ("this will actually send from your account")
- [ ] Sanitize: strip `**bold**` markers AI adds, hard-limit draft length, no attachments in v1

## 5. UI — Email Inbox Copilot

- [ ] `components/email/` client components: connect card, sync button (last-synced time), triage result list
- [ ] `/email` page with three sections:
  - **Needs your attention now** (high priority `needsReply` / deadlines)
  - **Follow up** (stale — you sent last, no reply, with one-click "Draft follow-up" → edit → Send)
  - **Everything else** (searchable list, filterable by thread/star/date)
- [ ] Thread view: latest message + AI summary line ("Waiting on recruiter — reply due today"), reason surfaced with the draft
- [ ] Draft modal: AI draft → editable textarea → "Send" (with explicit confirmation) / "Regenerate"
- [ ] Navbar link + route; gate on `GET /api/email/connection` (no connection → connect CTA)
- [ ] Empty/error states: connection expired (re-auth CTA), Gmail permission revoked

## 6. Verify

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual: connect → sync → triage → follow-up draft → send (on a test Gmail, one thread only)
- [ ] Confirm: no auto-send anywhere in v1 (send is always user-confirmed)

---

## Out of scope for v1 (note max — this is the $2/mo send-mail plan)

- [ ] Scheduled/digest emails, full-history backfill beyond last ~400, multi-mailbox, attachments, labels/archive automation, mobile push.