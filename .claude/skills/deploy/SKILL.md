---
name: deploy
description: Push the current work to main and watch the GitHub Actions deploy to the VPS until it finishes; retry once with an empty commit if the server step fails. Use when the user says "push", "deploy", "ship it" or "put it live" in this project.
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
   - If there are uncommitted code changes, first run the two passes from CLAUDE.md ("Before every
     commit"): the `simplify` skill, then the `code-review` skill with args `high --fix`. Let them
     apply their fixes.
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

4. **Watch the deploy** in the background (`run_in_background: true`) so the user isn't blocked, and
   tell them it's running. The repo is public, so the API needs no login:

   ```bash
   sleep 20; sha=$(git rev-parse HEAD); for i in $(seq 1 55); do
     r=$(curl -s "https://api.github.com/repos/BatrinutSilviu/ActiveHikes/actions/runs?head_sha=$sha" \
       | python3 -c "import sys,json;w=json.load(sys.stdin)['workflow_runs'];print(w[0]['status'],w[0]['conclusion'],w[0]['html_url']) if w else print('none')" 2>/dev/null)
     case "$r" in completed*) echo "$r"; exit 0;; esac; sleep 30
   done; echo "still: $r"
   ```

5. **Report.**
   - `completed success`: tell the user it's live and to reload the page they were looking at.
   - `completed failure`: the failing step is almost always "Deploy over SSH" (on the server).
     The step's log needs a GitHub login, so you can't read it. Retry **once** without asking (the user
     already asked to deploy) by pushing an empty commit:
     `git commit --allow-empty -m "Redeploy (previous deploy failed on the server)"` (plus the
     attribution lines), push, and watch again.
   - Failed twice: stop. Give the user the run link and ask them to open the **Deploy over SSH**
     step and paste the red lines at the end of its log.

## Don't

- Don't run `tsc`, `npm run build`, the dev server or other checks as part of deploying: the user has
  asked for no verification steps in this project.
- Don't force-push, and never rewrite commits that are already on `origin/main`.
- Don't retry more than once on your own; a repeated failure needs someone to look at the server.
