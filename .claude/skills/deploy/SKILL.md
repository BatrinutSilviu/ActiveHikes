---
name: deploy
description: Push the current work to main and let the GitHub Actions deploy put it on the VPS (Claude doesn't watch it). Only if the user says it isn't live: check the run, and retry once with an empty commit if the server step fails. Use when the user says "push", "deploy", "ship it" or "put it live" in this project.
---

# Deploy ActiveHikes

Every push to `main` deploys automatically: `.github/workflows/deploy.yml` SSHes into the VPS and runs
`/root/deploy-activehikes.sh` (`git pull && docker compose up -d --build`). Database migrations run on
their own when the new container starts (`prisma migrate deploy` in the Dockerfile's CMD), so there is
nothing to run on the server by hand.

The user is the sole admin and isn't a developer: report in plain words (is it live or not, and what
to do), not in CI jargon.

## Steps

1. **Commit.** `git fetch -q`, then `git status -sb`.
   - If there are uncommitted code changes, first run the passes from CLAUDE.md ("Before every
     commit"): the `simplify` skill, the `code-review` skill with args `high --fix`, then the
     `security-review` skill (skipped for purely visual changes). Let them apply their fixes. A hook
     runs the tests / type check / lint on `git commit` and blocks it if they fail: fix and commit again.
   - Then stage the changes and commit with a message that says what changed for
     the people using the app (the style of `git log`: one long sentence, no prefix), ending with the
     attribution lines from the system reminder.
   - Never commit `.env` or other secrets.

2. **Catch up with origin.** If the branch is behind `origin/main`, `git rebase origin/main`.
   - On a conflict, read both sides and re-apply the local change on top of the new upstream code
     (upstream may have reworked the same component). Don't drop either side.
   - If a new migration folder sorts *before* one already on `origin/main`, that's fine for the VPS
     (`migrate deploy` applies whatever hasn't run), but don't rename migrations that were already pushed.

3. **Push.** `timeout 90 git push`. If it hangs or says "make sure you have the correct access rights",
   fetch again and check `git status -sb`: usually the push was rejected because origin moved; go back
   to step 2.

4. **Tell the user it's deploying, and stop.** Say it'll be live in a few
   minutes and to reload the page then. Don't watch the GitHub Actions run or poll its API, not even in
   the background: the user asked not to (it was slow, noisy and hit GitHub's rate limit).

## Only if the user says it isn't live (or asks how the deploy went)

Look at the run once (the repo is public, so the API needs no login):

```bash
curl -s "https://api.github.com/repos/BatrinutSilviu/ActiveHikes/actions/runs?head_sha=$(git rev-parse HEAD)" \
  | python3 -c "import sys,json;w=json.load(sys.stdin)['workflow_runs'];print(w[0]['status'],w[0]['conclusion'],w[0]['id'],w[0]['html_url']) if w else print('none')"
```

Which step failed: `curl -s https://api.github.com/repos/BatrinutSilviu/ActiveHikes/actions/runs/<id>/jobs | python3 -c "import sys,json;[print(s['name'],s['conclusion']) for j in json.load(sys.stdin)['jobs'] for s in j['steps']]"`

- `completed failure`: the failing step is almost always "Deploy over SSH" (on the server).
  The step's log needs a GitHub login, so you can't read it. Retry **once** without asking (the user
  already asked to deploy) by pushing an empty commit:
  `git commit --allow-empty -m "Redeploy (previous deploy failed on the server)"` (plus the
  attribution lines), push, and tell the user it's deploying again.
- Failed twice: stop. Give the user the run link and ask them to open the **Deploy over SSH**
  step and paste the red lines at the end of its log.

## Don't

- Don't run `npm run build`, the dev server or other checks yourself as part of deploying: the user has
  asked for no verification steps in this project (the commit hook's type check and lint are the exception).
- Don't force-push, and never rewrite commits that are already on `origin/main`.
- Don't retry more than once on your own; a repeated failure needs someone to look at the server.
