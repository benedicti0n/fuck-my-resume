# Feature Plan — Calendar / Call Booking Agent

> Connects multiple booking providers (cal.com, Calendly, Google Calendar / Google Meet, Zoom).
> Interconnected with the Email Agent: it can book a call with someone **and** email them on the user's behalf.
> Runs on BYOK key for AI decision-making; writes to the user's connected accounts via their tokens (encrypted).

---

## Status: In Progress

---

## 1. Connections (multi-provider)

- [ ] Generalize the email agent's `connections` table (from `docs/features/email-agent.md`) into provider-agnostic rows: `provider` ∈ `{'gmail','cal.com','calendly','gcal','zoom'}`, plus provider-specific config JSONB (`calComUsername`, `calendlyUri`, `gcalCalendarId`, `zoomAccountId`)
- [ ] OAuth/API-key connect flows per provider:
  - [ ] cal.com — API key (team/user) stored encrypted; no OAuth needed
  - [ ] Calendly — OAuth: client id/secret tokens + user URI
  - [ ] Google Calendar + Meet — OAuth scopes `calendar.calendars.readonly` / `calendar.events` / `calendar.events` (define scope list explicitly)
  - [ ] Zoom — OAuth (or server-to-server app): create meetings + `meeting.invite_links` for emails (later)
- [ ] `lib/booking/tokens.ts` — encrypt/decrypt + refresh provider tokens (reuse `lib/encryption.ts`); one refresh shim per OAuth provider
- [ ] `GET /api/booking/connections` — list connected providers + status
- [ ] `POST /api/booking/connect` — start OAuth (or save cal.com API key)
- [ ] `DELETE /api/booking/connections/[provider]` — disconnect + revoke

## 2. Provider adapter layer

- [ ] `lib/booking/provider.ts` — shared `BookingProvider` interface:
  - `getAvailability(from, to)` → slots
  - `getBusyBlocks(from, to)` → user's busy time (from the provider)
  - `createEvent(slot, attendeeEmail, title)` → event/booking/metting
  - `getEvent(id)` / `cancelEvent(id)`
- [ ] Adapters:
  - [ ] `lib/booking/calcom.ts` — `GET /v1/availability` + `GET /v1/slots` + `POST /v1/bookings` (nickname: "call with <person> – saved by FMR")
  - [ ] `lib/booking/calendly.ts` — user event-types → open slots → `POST /scheduled_events` (uses OAuth token)
  - [ ] `lib/booking/gcal.ts` — `freeBusy` for busy blocks, `events.insert` with `conferenceData` for Meet
  - [ ] `lib/booking/zoom.ts` — `POST /v2/users/me/meetings` → join URL (v2: use invite links so the email contains the link)
- [ ] `lib/booking/slots.ts` — merge busy blocks with provider open slots → unified, conflict-free suggested times in user's timezone

## 3. Booking request parsing (AI)

- [ ] `lib/booking/prompt.ts` — LLM intent parser (BYOK, `Output.object`) over context: "Book a call with X on Friday afternoon" or a forwarded email thread → structured `BookingRequest { attendeeEmail?, attendeeName?, suggestedDates[], durationMin, providerPref, topic, timezone }`
- [ ] `POST /api/booking/parse` — turn an email thread (from Email Agent) or free text into a `BookingRequest`
- [ ] Missing fields → typed follow-up question back to the user (never guess an email address)

## 4. Human-in-the-loop booking flow

- [ ] `lib/booking/plan.ts` — take a parsed request, query provider availability, propose 3 concrete slots (first-available, pref morning/afternoon)
- [ ] `POST /api/booking/propose` — user picks a slot → BUILD the event (real API call) → returns event details + confirm copy
- [ ] `POST /api/booking/confirm` — **explicit user confirmation before ANY create-side-effect** (no auto-booking without it)
- [ ] `POST /api/booking/cancel` — cancel an event created by the flow (list recent user-created bookings)

## 5. Interconnect with Email Agent

- [ ] `POST /api/booking/send-invite` — after `confirm`, compose + send the invitation via Gmail (uses the Email Agent's send path) with the Meet/Zoom/cal link, localized to the meeting time in the attendee's timezone
- [ ] If the request originated from an email thread: mark that thread handled in `emailThreads` / close the follow-up
- [ ] `lib/email/draft.ts` — calendar-conflict / follow-up drafts when a booking request is declined or conflicts

## 6. UI

- [ ] `components/booking/` — provider connect cards (status badges), booking composer
- [ ] `/booking` page:
  - [ ] Provider connections row
  - [ ] "Book a call" composer: paste email/thread or type request → AI parses → slot picker (3 proposed) → summary card (who, when, provider, link) → **Confirm & send**
  - [ ] My bookings list (provider-merged, cancel button; show Meet/Zoom/cal link + sent-invite status)
- [ ] Interop: "Book" button surfaced inside `/email` follow-up threads where relevant ("already replied?" nudge → opens composer with that thread preloaded)
- [ ] Error states: provider not connected (point to connect card), calendar link not available (show no-link notice)

## 7. Verify

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Manual happy path: connect cal.com (+ Gmail) → type "book call with x@y.com Tuesday 3pm" → confirm → call created on cal.com **and** invite email sent via Gmail
- [ ] Manual guardrail check: booking is NOT created and no email sent before the user confirms (confirm step is atomic)

---

## Out of scope for v1

- [ ] Free-busy conflict resolution across multiple providers in one schedule, rescheduling/dynamic rebooking, attendee-side booking pages, Zoom/webex invite templates, team availability, calendar import of back-history.