@AGENTS.md

# ActiveHikes

Group hike management app for a hiking community. Silviu is the sole admin/organizer.

## What the app does

- **Admin** creates hikes with: destination, date, entry fee, participant limit, starting point, duration, camping/accommodation info, cover photo, approximate GPX route, external photo album link
- **Users** sign up (email+password or Google OAuth — full name mandatory; password sign-ups must open an emailed confirmation link before they can log in), browse hikes, and click "Register"
- **Join flow**: user registers → status `pending` → user pays the entry fee to one of the bank accounts shown on the hike page → admin confirms the payment manually → status `confirmed`
- **Waitlist**: once the participant limit is hit, new registrations go to `waitlist` automatically; admin can promote them manually
- **After the hike**: admin uploads featured photos (shown in a gallery on the hike page), pastes a Google Photos link for the full album, uploads the actual GPX track, and marks the hike as `completed`
- **Users** see their registrations and status on their profile page
- **Gas costs** (admin, Cars page): the drivers' gas costs are split between everyone who went (default: confirmed participants, editable); passengers pay the share X to the organiser, each driver gets back their cost − X. Drivers default to those bringing a car and can be added/removed; saved in `Hike.gasCosts` (src/lib/gasCosts.ts)
- **Member events**: any signed-in member can create their own general event (a kind such as Running or Football) at `/events/new`, like the padel app's open matches: they say how many people they need, they're signed up themselves (and can only cancel, not leave), it's always free and goes live immediately (`Hike.byMember = true`), and sign-ups are confirmed straight away while there are spots (then waitlist; the waitlist moves up when someone drops out, and anyone else can drop out). At most 3 upcoming per member, up to 60 days ahead. The creator manages it at `/events/[id]/manage` (participants, details, cancel/reopen, chat as organiser — no emails/phones shown); admins keep full control
- No email notifications for hike activity (registrations, confirmations, etc.) — everything is checked manually through the app. The only transactional emails are the sign-up confirmation link and the password reset link.

## Push automatically

When a change is finished (and committed after the passes below), push it with the `deploy` skill and
say it's deploying, without asking: the user wants every finished change live. Don't watch
the deploy run unless the user says the site isn't live.

## Before every commit: clean up, then review

Every commit Claude makes in this repo goes through three passes over the uncommitted changes first,
in this order, without asking:

1. `/simplify`: reuse existing helpers, remove duplication and dead code, make it efficient (no
   extra queries or re-renders). It applies its own fixes.
2. `/code-review high --fix`: finds bugs (wrong logic, missing auth checks on server actions,
   broken edge cases like friends linked to a host, waitlists, one-way cars) and applies the fixes.
3. `/security-review`: looks for security holes in the changes (missing login or role checks, one
   user reading or changing another user's data, injection, secrets in code, unsafe uploads). Fix what
   it finds. Skip it only when the change is purely visual (styles, text, layout).

Then commit. In the final message, list what the three passes changed or found (one line each, plain
words). If a finding needs the user's decision, ask instead of guessing. Skip all three only for commits
with no code (an empty redeploy commit, docs or skill files only). These are code passes, not the
verification the user asked to skip: still no builds, dev server or test scripts of your own (a global hook already runs the type
check and lint before every commit).

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL** via **Prisma 5** ORM
- **NextAuth v4** — JWT sessions, Credentials provider + Google OAuth (optional)
- **File uploads** — saved to `public/uploads/{bucket}/` on disk (Docker volume in prod)
- **Server Actions** for mutations (`src/app/actions/`), API route for file uploads (`/api/upload`)
- **Resend** — sends sign-up confirmation and password reset emails (`RESEND_API_KEY`, `EMAIL_FROM` env vars)

## Running locally

```bash
# 1. Start PostgreSQL
docker run -d --name activehikes-db \
  -e POSTGRES_DB=activehikes -e POSTGRES_USER=activehikes \
  -e POSTGRES_PASSWORD=devpass -p 5432:5432 postgres:16-alpine

# 2. Run DB migrations
npx prisma migrate dev --name init

# 3. Start the dev server
npm run dev
```

App runs at http://localhost:3000

## Making yourself admin

After signing up, open Prisma Studio and change your `role` to `admin`:

```bash
npx prisma studio   # opens at http://localhost:5555
```

Or via SQL:
```bash
npx prisma db execute --stdin <<< \
  "UPDATE \"User\" SET role = 'admin' WHERE email = 'your@email.com';"
```

## Key files

```
prisma/schema.prisma          Database schema (User, Hike, HikeParticipant, HikePhoto, BankAccount)
src/lib/auth.ts               NextAuth config (providers, JWT callbacks)
src/lib/db.ts                 Prisma client singleton
src/middleware.ts             Route protection (admin + profile routes)
src/app/actions/              Server Actions — hikes.ts, participants.ts, photos.ts, bank-accounts.ts, memberEvents.ts (events members create)
src/app/api/upload/route.ts   File upload endpoint (saves to public/uploads/)
src/app/api/auth/register/    User signup endpoint (validates full name, hashes password)
src/app/api/auth/forgot-password/  Requests a password reset email
src/app/api/auth/reset-password/   Consumes a reset token and sets a new password
src/app/api/auth/verify-email/    Confirms an email from the sign-up link (resend-verification sends it again)
src/lib/mailer.ts              Resend email wrapper (sign-up confirmation, password reset)
src/lib/rateLimit.ts           Rate limits for auth endpoints, counted in Postgres (RateLimit table)
src/proxy.ts                   Locale redirects, route protection, per-request CSP nonce
.github/workflows/deploy.yml  Auto-deploy to VPS on push to main (see SETUP.md)
```

## Pages

```
/                     Home — upcoming events of every kind
/events               All events (hikes, via ferratas, general events), filtered by ?type= (hike, via_ferrata or a kind such as Running); /hikes and /via-ferrata redirect here
/hikes/[id]           Hike detail, join button, payment info, photos, GPX download (/via-ferrata/[id] and /events/[id] for the other kinds)
/events/new           Any member creates their own free event (live immediately)
/events/[id]/manage   The member who created an event manages it (admins can open it too)
/auth/login           Login (email or Google)
/auth/signup          Sign up
/auth/forgot-password Request a password reset email
/auth/reset-password  Set a new password from the emailed link
/profile              User's registrations and their status
/admin                Dashboard — stats, drafts, upcoming and past events of every kind
/admin/events/new     Create any event: basic info for all, plus the hike / via ferrata sections when that type is picked
/admin/hikes/[id]     Manage participants (confirm/reject/waitlist), upload photos, edit hike
/admin/bank-accounts  Manage IBANs shown to users for payment
/admin/participants   All registrations across all hikes
```

## VPS deployment

See `SETUP.md` for full Docker deployment instructions.

Short version:
```bash
# On VPS — create .env with POSTGRES_PASSWORD, NEXTAUTH_URL, NEXTAUTH_SECRET
docker compose up -d --build
```

Two containers: `postgres` + `app` (Next.js). No reverse proxy of its own — it joins an
existing Traefik instance on the VPS via a shared Docker network and routing labels.
Uploads and DB data persist via Docker volumes.
