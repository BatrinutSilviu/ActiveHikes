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

This app has no reverse proxy of its own — it expects an existing **Traefik** instance on the
VPS to route to it and terminate TLS. If your VPS doesn't already run Traefik for another
project, see "First time setting up Traefik on this VPS" below before step 1.

### 1. Share the Traefik network

ActiveHikes' `app` container needs to sit on the same Docker network as your existing Traefik
container so Traefik can reach it. Create a network for this (once, VPS-wide):

```bash
docker network create traefik-shared
```

Then attach your existing Traefik service to it. In its compose file (e.g.
`~/Projects/active-padel-backend/docker-compose.prod.yml`), add to the `traefik` service:

```yaml
  traefik:
    ...
    networks:
      - default
      - traefik-shared
```

and at the bottom of the file:

```yaml
networks:
  traefik-shared:
    external: true
```

Apply with (only recreates the `traefik` container, no impact on other services):

```bash
docker compose -f docker-compose.prod.yml up -d traefik
```

### 2. Clone the project to your VPS

```bash
git clone https://github.com/BatrinutSilviu/ActiveHikes.git ~/Projects/ActiveHikes
cd ~/Projects/ActiveHikes
```

### 3. Create an environment file

```bash
# ~/Projects/ActiveHikes/.env
POSTGRES_PASSWORD=choose-a-strong-password-here
DOMAIN=hikes.yourdomain.com
NEXTAUTH_URL=https://hikes.yourdomain.com
NEXTAUTH_SECRET=run-openssl-rand-base64-32-and-paste-here
GOOGLE_CLIENT_ID=          # optional
GOOGLE_CLIENT_SECRET=      # optional
```

`DOMAIN` must be a hostname pointing at this VPS (a DNS A/AAAA record) — it's used in the
Traefik routing label in `docker-compose.yml`. It can be a subdomain distinct from any other
project already running behind the same Traefik.

### 4. Build and start

```bash
docker compose up -d --build
```

The app will:
1. Build the Next.js image
2. Start PostgreSQL (internal only, not exposed to the host)
3. Run `prisma migrate deploy` automatically
4. Join `traefik-shared` — Traefik picks it up via its container labels, routes
   `https://$DOMAIN` to it on port 3000, and handles the Let's Encrypt cert automatically

### 5. Make yourself admin on VPS

```bash
docker compose exec app npx prisma db execute --stdin <<< \
  "UPDATE \"User\" SET role = 'admin' WHERE email = 'your@email.com';"
```

### 6. Google OAuth (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add `https://yourdomain.com/api/auth/callback/google` to Authorized redirect URIs
4. Copy Client ID and Secret to your `.env` on VPS
5. `docker compose up -d app` to restart with new env

---

## Continuous deployment (GitHub Actions)

Every push to `main` auto-deploys to the VPS via `.github/workflows/deploy.yml`. It SSHes in
and runs `/root/deploy-activehikes.sh`, which does `git pull && docker compose up -d --build`
in the project directory (migrations run automatically on container start — see step 4 above).

### How it's secured

The workflow authenticates with a dedicated ed25519 keypair (`github-actions-deploy-<project>`),
not your personal SSH key. Its public half is in the VPS's `~/.ssh/authorized_keys` with a
forced command restriction:

```
command="/root/deploy-activehikes.sh",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAA... github-actions-deploy-activehikes
```

That restriction means this key can *only* ever run that one script on the VPS — even if the
private key leaked out of GitHub, it couldn't be used to run arbitrary commands as root.

### Secrets

The workflow's `deploy` job is scoped to a GitHub **Environment** named `ACTIVEHikes`
(Settings → Environments → `ACTIVEHikes`), which holds:

| Secret | Value |
|---|---|
| `VPS_HOST` | the VPS IP/hostname |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | the private half of the deploy keypair (`~/.ssh/activehikes_deploy` on the machine that generated it — never stored on the VPS itself) |

Because these are Environment secrets rather than plain repository secrets, the job must
declare `environment: ACTIVEHikes` to see them — that's already set in the workflow file.
If secrets ever need re-adding (e.g. rotating the key), do it at
`https://github.com/BatrinutSilviu/ActiveHikes/settings/environments`, not the plain
repo-secrets page.

### Setting this up again (e.g. new VPS, or a second project on the same pattern)

1. Generate a dedicated keypair: `ssh-keygen -t ed25519 -f ~/.ssh/<project>_deploy -N ""`
2. On the VPS, create a deploy script (e.g. `/root/deploy-<project>.sh`) that `cd`s into the
   project directory and runs `git pull && docker compose up -d --build`, then `chmod +x` it
3. Append the public key to `/root/.ssh/authorized_keys` with the `command="..."` restriction
   shown above, pointing at that script
4. Add the three secrets to a GitHub Environment (or repo secrets, if you skip the
   `environment:` scoping) and reference them in a `deploy.yml` workflow like this repo's

### Troubleshooting

- **"missing server host" in the Actions log** — the job can't see the secrets. Usually means
  they're Environment-scoped but the job doesn't declare `environment: <name>`, or they were
  added to the wrong tab (Codespaces/Dependabot secrets instead of Actions/Environment secrets).
- **Deploy ran but nothing changed on the VPS** — check the container actually restarted:
  `docker compose ps` should show a recent "Up X seconds" for the `app` service right after a
  run finishes.

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
