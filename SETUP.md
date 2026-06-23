# ActiveHikes — Setup Guide

## Local development

### 1. Start a local PostgreSQL with Docker (one command)

```bash
docker run -d --name activehikes-db \
  -e POSTGRES_DB=activehikes \
  -e POSTGRES_USER=activehikes \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Configure environment

Edit `.env.local` — it already has the right values for the command above. Just generate a real NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

Paste the output as `NEXTAUTH_SECRET` in `.env.local`.

### 3. Run migrations and start

```bash
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Make yourself admin

After signing up:
```bash
npx prisma studio
```
Open [http://localhost:5555](http://localhost:5555) → User table → find your row → change `role` from `user` to `admin` → Save.

---

## VPS deployment (Docker)

### 1. On your VPS, create an environment file

```bash
# /home/youruser/activehikes/.env
POSTGRES_PASSWORD=choose-a-strong-password-here
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=run-openssl-rand-base64-32-and-paste-here
GOOGLE_CLIENT_ID=          # optional
GOOGLE_CLIENT_SECRET=      # optional
```

### 2. Copy the project to your VPS

```bash
rsync -avz --exclude node_modules --exclude .next . youruser@yourserver:/home/youruser/activehikes/
```

### 3. Build and start

```bash
cd /home/youruser/activehikes
docker compose up -d --build
```

The app will:
1. Build the Next.js image
2. Start PostgreSQL
3. Run `prisma migrate deploy` automatically
4. Start the app on port 3000 behind nginx on port 80

### 4. Make yourself admin on VPS

```bash
docker compose exec app npx prisma db execute --stdin <<< \
  "UPDATE \"User\" SET role = 'admin' WHERE email = 'your@email.com';"
```

### 5. SSL with Let's Encrypt (optional)

```bash
# On VPS
apt install certbot
certbot certonly --standalone -d yourdomain.com

# Copy certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/

# Uncomment the HTTPS block in nginx/nginx.conf and comment the HTTP block
# Then restart nginx
docker compose restart nginx
```

### 6. Google OAuth (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add `https://yourdomain.com/api/auth/callback/google` to Authorized redirect URIs
4. Copy Client ID and Secret to your `.env` on VPS
5. `docker compose up -d app` to restart with new env

---

## App structure

```
/                       Home page with upcoming hikes
/hikes                  All hikes (upcoming + history)
/hikes/[id]            Hike detail + join + payment info + photos
/auth/login            Login (email or Google)
/auth/signup           Sign up (full name required)
/profile               Your registrations and status
/admin                 Admin dashboard
/admin/hikes/new       Create a new hike
/admin/hikes/[id]      Manage participants, upload photos, edit hike
/admin/bank-accounts   Manage IBANs shown to users
/admin/participants    All registrations across all hikes
```

## Participant flow

1. User clicks **Register** → status `pending`
2. User transfers entry fee to the bank account shown on the hike page
3. Admin goes to `/admin/hikes/[id]` → sees pending list → clicks **Confirm**
4. If hike is full: user joins **waitlist** automatically → admin promotes manually

## After the hike

1. Go to `/admin/hikes/[id]`
2. Upload featured photos (appear in the gallery)
3. Paste your Google Photos link in "External photo album URL"
4. Upload the actual GPX track
5. Change status to **Completed**

## Backups

```bash
# Backup database
docker compose exec postgres pg_dump -U activehikes activehikes > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20260601.sql | docker compose exec -T postgres psql -U activehikes activehikes
```
