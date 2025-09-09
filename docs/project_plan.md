# Foonder, v1 Product Plan

## Objectives

- Help small groups decide where to eat with near-zero friction.
- Feel fast, intuitive, bold, and unique, without feeling hokey.
- Collect high-quality, consented aggregate data to enable future monetization.

## Design Principles

- Mobile first, one primary action per screen.
- Fewer choices, faster decisions. Reduce fields and states.
- Obvious progress. Always show “what happens next.”
- Real time when it improves momentum, silent when it distracts.
- Delight in micro, never in gimmicks. Brief motion, subtle haptics.
- Accessibility by default. Large tap targets, strong contrast, readable type.

## Core User Stories

- Host creates a session for a ZIP code, copies a link, and shares it.
- Participant opens link, enters name only if the host required it, then swipes yes or no on restaurants.
- Everyone sees live session status, how many invited, and how many have submitted.
- When a match happens, anyone with the session open sees it instantly. The host can also get an email or SMS.
- The group can tap through to the restaurant details or map.

## Strong Recommendations

- Places data: Google Places + Places Photos for MVP. Reliable, familiar, good coverage, solid photos, consistent IDs.
- Stack: Next.js App Router, React Server Components, Supabase (Postgres, Auth disabled for participants, Realtime, Edge Functions), Vercel (via GitHub).
- Gestures and motion: Framer Motion + @use-gesture/react.
- Email/SMS: Resend for email, Twilio for SMS. Host provides contact only if they want notifications.
- (Alternatives like Yelp Fusion, Foursquare Places, or Mapbox Search can be evaluated later. Start with Google to ship.)

## Architecture Overview

- Next.js serves the host setup, participant session, and match screen.
- Supabase Postgres stores sessions, participants, candidates, and swipes.
- Supabase Realtime broadcasts session updates and match events.
- Supabase Edge Functions encapsulate server logic, API calls to Places, and rate limiting.
- Static asset optimization for images through Next Image. Cache photo URLs signed and short-lived.

## Data Model (Supabase)

### Tables and key fields:

#### sessions
- id (uuid, pk)
- zip_code (text)
- place_search_center (geometry or lat/lng)
- radius_m (int, default 8000)
- require_names (boolean, default false)
- invite_count_hint (int, nullable)
- status (enum: active, matched, closed)
- created_at (timestamptz)
- host_notify_email (text, nullable)
- host_notify_phone (text, nullable)
- match_place_id (text, nullable)
- match_reason (text, nullable)

#### participants
- id (uuid, pk)
- session_id (uuid, fk)
- display_name (text, nullable)
- is_host (boolean)
- joined_at (timestamptz)
- submitted_at (timestamptz, nullable)
- client_fingerprint (text, nullable)

#### candidates
- id (uuid, pk)
- session_id (uuid, fk)
- place_id (text) // Google Place ID
- name (text)
- photo_ref (text, nullable)
- price_level (int, nullable)
- rating (numeric, nullable)
- user_ratings_total (int, nullable)
- cuisines (text[], nullable)
- lat (numeric), lng (numeric)
- url (text, nullable)
- created_at (timestamptz)

#### swipes
- id (uuid, pk)
- session_id (uuid, fk)
- participant_id (uuid, fk)
- candidate_id (uuid, fk)
- vote (smallint) // 1 yes, 0 no
- created_at (timestamptz)

#### analytics_global
- id (bigserial, pk)
- event (text) // session_created, swipe_yes, swipe_no, matched
- zip_code (text, nullable)
- place_id (text, nullable)
- meta (jsonb)
- created_at (timestamptz)

### Indexes:
- candidates(session_id, place_id) unique.
- swipes(session_id, participant_id, candidate_id) unique.
- analytics_global(event, created_at).

## Session and Identity Strategy

- No login for participants.
- Host creates a session and shares /{sessionId}?t={shareToken}.
- Each participant gets a short-lived participantToken stored in localStorage and cookie for dedupe.
- Optional name entry if host requires it. Anonymous otherwise.
- Gentle abuse controls: per-IP rate limit on edge functions, signed action tokens, single submission lock.

## Restaurant Sourcing Flow

- Host enters ZIP code. Edge Function geocodes to lat/lng, stores center.
- Fetch candidates from Google Places (Text Search or Nearby Search) with cuisine filters kept simple for MVP.
- Deduplicate by Place ID, persist a snapshot to candidates.
- For each card, request a single photo via Places Photos API. Store only a signed CDN URL or a cached proxy URL, not the image itself.
- Preload next image for smooth swipes.

## Swipe and Match Logic

- Default rule: unanimous yes across all participants who submitted.
- Variant rule for future: consensus threshold (for example, 60 percent yes).
- On every new yes, compute intersection of “yes sets” across participants. If intersection returns a candidate that everyone has liked, write sessions.match_place_id and broadcast a matched event.
- If no match after N candidates, show “Top Overlap” fallback: highest combined score by yes count, rating, and distance. Keep it simple in v1, but deterministic.

## Real Time and Notifications

- Realtime channels on session:{id} for:
  - participant join and submit
  - swipe progress counts
  - match event
- In-page toasts for live updates.

**Optional host notifications:**
- Email via Resend on match or timeout.
- SMS via Twilio if phone provided.
- Silent push is out of scope for v1.

## Screens and States

- **Host Setup:** ZIP, optional name requirement toggle, optional email or phone for notifications. Create session, get share link, “copy” button, success toast.
- **Lobby/Status Sheet:** Invited count hint, joined count, submitted count, simple progress meter. No avatars.
- **Swipe:** Full-bleed image, name and tags, two gestures, and two buttons as backup. Single affordance dominates.
- **Empty/Exhausted:** “You are done” state with status sheet. If waiting on others, show gentle nudge copy.
- **Match:** Animated banner, short confetti, CTA buttons: Open in Maps, View details, Share.

## Performance and UX Guarantees

- Keep Time to Interactive under 2 seconds on typical 4G.
- Preload the next card image. Use will-change: transform.
- Dynamic import for maps and confetti.
- Cache geocode and search responses in Supabase with short TTL to reduce API calls.
- Offline is out of scope. Handle network loss with a simple retry state.

## Privacy, Compliance, and Trust

- No accounts. Minimal data. Names are optional per host setting.
- Explain data use in a single, readable paragraph on setup and first join.
- Hash IPs in analytics if stored at all. Avoid precise location in analytics rows.
- Provide a “Delete session” control to the host link that hard-deletes rows.

## Instrumentation and Metrics

- Client events batched to an Edge Function then to analytics_global.

### KPIs:
- Session creation to first join conversion rate.
- Time from first swipe to match.
- Percent sessions that end in match.
- Median number of candidates viewed.
- API cost per session.
- Image load failure rate.
- Ship a lightweight internal dashboard route for v1.

## Error Handling

- Places API fail: show graceful fallback, retry with smaller radius, or widen cuisine filter.
- Image fail: placeholder gradient with initials and a “View Map” CTA.
- Realtime fail: poll every 10 seconds as backup.
- Duplicate swipes: unique index prevents duplicates. Show idempotent success toast.

## Security and Abuse

- Edge Function verification on all writes with signed session token and participant token.
- Per IP and per session rate limits.
- Honeypot field on host setup to catch bots.
- Cap candidates per session to a sensible maximum.