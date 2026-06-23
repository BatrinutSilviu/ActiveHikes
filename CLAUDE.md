@AGENTS.md

# ActiveHikes

Group hike management app for a hiking community. Silviu is the sole admin/organizer.

## What the app does

- **Admin** creates hikes with: destination, date, entry fee, participant limit, starting point, duration, camping/accommodation info, cover photo, approximate GPX route, external photo album link
- **Users** sign up (email+password or Google OAuth — full name mandatory), browse hikes, and click "Register"
- **Join flow**: user registers → status `pending` → user pays the entry fee to one of the bank accounts shown on the hike page → admin confirms the payment manually → status `confirmed`
- **Waitlist**: once the participant limit is hit, new registrations go to `waitlist` automatically; admin can promote them manually
- **After the hike**: admin uploads featured photos (shown in a gallery on the hike page), pastes a Google Photos link for the full album, uploads the actual GPX track, and marks the hike as `completed`
- **Users** see their registrations and status on their profile page
- No email notifications — everything is checked manually through the app

## Tech stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **PostgreSQL** via **Prisma 5** ORM
- **NextAuth v4** — JWT sessions, Credentials provider + Google OAuth (optional)
- **File uploads** — saved to `public/uploads/{bucket}/` on disk (Docker volume in prod)
- **Server Actions** for mutations (`src/app/actions/`), API route for file uploads (`/api/upload`)

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
src/app/actions/              Server Actions — hikes.ts, participants.ts, photos.ts, bank-accounts.ts
src/app/api/upload/route.ts   File upload endpoint (saves to public/uploads/)
src/app/api/auth/register/    User signup endpoint (validates full name, hashes password)
```

## Pages

```
/                     Home — upcoming hikes
/hikes                All hikes (upcoming + history)
/hikes/[id]           Hike detail, join button, payment info, photos, GPX download
/auth/login           Login (email or Google)
/auth/signup          Sign up
/profile              User's registrations and their status
/admin                Dashboard — stats, upcoming hikes list
/admin/hikes/new      Create a hike
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

Three containers: `postgres` + `app` (Next.js) + `nginx` (reverse proxy on port 80/443).
Uploads and DB data persist via Docker volumes.
