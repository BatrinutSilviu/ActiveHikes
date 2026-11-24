---
name: vps
description: Run commands on the ActiveHikes production VPS over SSH — look at app or deploy logs, check containers, disk space, the production database, restart the app. Use when something has to be checked or done on the live server (a failed deploy, an error only production shows, a data fix in production).
---

# Working on the ActiveHikes VPS

The server is reached through the SSH alias **`activehikes-vps`**, defined in the user's own
`~/.ssh/config` (host, user and key live there only: this repo is public, so never write the server's
address, user names, keys or any `.env` values into the repo, a commit or a skill file).

If `ssh activehikes-vps` fails with "Could not resolve hostname activehikes-vps", the alias isn't set up
on this machine: ask the user for the server address and which key to use, and add to `~/.ssh/config`:

```
Host activehikes-vps
  HostName <server IP or hostname>
  User root
  IdentityFile ~/.ssh/<personal key>
  IdentitiesOnly yes
```

Don't use the `activehikes_deploy` / GitHub Actions keys: they're restricted to running the deploy
script and nothing else.

## Running commands

Always non-interactive, one command per call, with a timeout:

```bash
ssh -o BatchMode=yes -o ConnectTimeout=10 activehikes-vps '<command>'
```

- No interactive programs (`psql` without `-c`, `vim`, `top`, `docker exec -it`): use `-c '…'`, `cat`,
  `tail`, `docker exec` without `-it`.
- The project lives in `~/Projects/ActiveHikes` (the deploy script `/root/deploy-activehikes.sh` `cd`s
  there). Run `docker compose` from it: `cd ~/Projects/ActiveHikes && docker compose …`. Containers:
  `activehikes-app-1` and `activehikes-postgres-1`.
- **The same server runs the user's other apps** (padel, management, kidokinetiq) and a shared Traefik.
  Only touch ActiveHikes containers, files and databases; never restart Traefik, Docker itself or the
  server, and never run `docker system prune` or anything server-wide without asking.

### How the deploy works on the server

`/root/deploy-activehikes.sh` takes a lock (so two deploys wait for each other instead of clashing),
backs up the database with `active-backup pre-deploy hikes` (a failed backup stops the deploy),
`git pull --ff-only`, `docker compose up -d --build`, then waits up to 3 minutes for
`activehikes-app-1` to be healthy (migrations run as the app starts) and prints its last logs if not.
So a failed GitHub deploy is usually one of: the backup failed, `git pull --ff-only` refused (a change
made by hand on the server), the build failed, or the app never became healthy (a failing migration
or a crash on start): check those in that order.

Useful read-only commands:

| What | Command |
|---|---|
| Containers and health | `cd ~/Projects/ActiveHikes && docker compose ps` |
| App logs (recent) | `cd ~/Projects/ActiveHikes && docker compose logs --tail=200 app` |
| Database logs | `cd ~/Projects/ActiveHikes && docker compose logs --tail=100 postgres` |
| What's deployed | `cd ~/Projects/ActiveHikes && git log --oneline -5 && git status -sb` |
| Run the deploy by hand (see its output) | `/root/deploy-activehikes.sh` (changes the server: ask first) |
| Disk space | `df -h / && docker system df` |
| A database query | `cd ~/Projects/ActiveHikes && docker compose exec -T postgres psql -U activehikes -d activehikes -c 'SELECT …'` |

When a GitHub deploy failed and its log can't be read, find out why here (see "How the deploy works"):
`ls -lt /var/backups/active/` and `df -h` for the backup, `git status -sb` in the project for the pull,
`docker compose ps` and the app logs for the build and the start.

## Ask the user before anything that changes the server

Reading (logs, `ps`, `SELECT`, `git log`, `df`) is fine without asking. Ask first, saying exactly what
will happen, before:

- restarting, stopping or rebuilding containers, or running the deploy script
- any database write (`UPDATE`, `DELETE`, `INSERT`, `ALTER`) — and take a backup first with the
  server's own backup tool: `/usr/local/bin/active-backup pre-deploy hikes` (checked pg_dump archive in
  `/var/backups/active/`, last 10 kept; restorable with `pg_restore`). A daily backup of every app runs
  from cron too.
- editing files on the server (`.env`, compose files, the deploy script), `git` changes there
- deleting anything, `docker system prune`, installing or upgrading packages

Never, even if asked casually (confirm twice, explaining the consequence):
`docker compose down -v`, `docker volume rm`, `DROP`/`TRUNCATE`, deleting `public/uploads` or the
Postgres volume — that's the production data and the uploaded photos.

## Privacy

- Don't print `.env` or secrets into the conversation. To check a variable is set, use
  `grep -c '^NAME=' .env` or show only the name, not the value.
- Production data is real members' data: query only the columns needed, and don't copy personal data
  (emails, phones) into commits, files in the repo or messages outside this conversation.
